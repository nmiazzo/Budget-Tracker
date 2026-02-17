import { Injectable, signal, computed } from '@angular/core';
import { AppData, Expense, Income, Subscription, QuickAddSuggestion, CategoryBudgetOverride } from '../models/interfaces';
import categoriesData from '../data/categories.json';
import providersData from '../data/providers.json';
import subscriptionsData from '../data/subscriptions.json';
import { Category, InstallmentProvider, SubscriptionTemplate } from '../models/interfaces';

const STORAGE_KEY = 'budget-tracker-data';
const CATEGORIES_STORAGE_KEY = 'budget-tracker-categories';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly _budgetOverrides = signal<CategoryBudgetOverride[]>(this.loadBudgetOverrides());

  readonly categories = computed<Category[]>(() => {
    const overrides = this._budgetOverrides();
    return (categoriesData as Category[]).map(cat => {
      const override = overrides.find(o => o.categoryId === cat.id);
      const monthlyBudget = override ? override.monthlyBudget : cat.monthlyBudget;
      return {
        ...cat,
        monthlyBudget,
        weeklyBudget: this.computeWeeklyBudget(monthlyBudget),
      };
    });
  });

  readonly providers: InstallmentProvider[] = providersData;
  readonly subscriptionTemplates: SubscriptionTemplate[] = subscriptionsData;

  private readonly _data = signal<AppData>(this.loadData());

  readonly expenses = computed(() => this._data().expenses);
  readonly incomes = computed(() => this._data().incomes);
  readonly subscriptions = computed(() => this._data().subscriptions);

  readonly currentMonthExpenses = computed(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return this._data().expenses.filter(e => e.date >= startOfMonth && e.date <= endOfMonth);
  });

  readonly currentMonthIncomes = computed(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return this._data().incomes.filter(i => i.date >= startOfMonth && i.date <= endOfMonth);
  });

  readonly totalMonthExpenses = computed(() =>
    this.currentMonthExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  readonly totalMonthIncome = computed(() =>
    this.currentMonthIncomes().reduce((sum, i) => sum + i.amount, 0)
  );

  readonly totalBalance = computed(() => {
    const totalIncome = this._data().incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = this._data().expenses
      .filter(e => e.date <= new Date().toISOString())
      .reduce((sum, e) => sum + e.amount, 0);
    return totalIncome - totalExpenses;
  });

  readonly currentWeekExpenses = computed(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return this._data().expenses.filter(e => {
      const d = new Date(e.date);
      return d >= startOfWeek && d <= endOfWeek;
    });
  });

  readonly quickAddSuggestions = computed<QuickAddSuggestion[]>(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentExpenses = this._data().expenses.filter(
      e => new Date(e.createdAt) >= thirtyDaysAgo && !e.isInstallment && !e.subscriptionId
    );
    const grouped = new Map<string, { amount: number; categoryId: string; count: number }>();
    for (const exp of recentExpenses) {
      const key = `${exp.description.toLowerCase()}|${exp.amount}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.count++;
      } else {
        grouped.set(key, { amount: exp.amount, categoryId: exp.categoryId, count: 1 });
      }
    }
    return Array.from(grouped.entries())
      .filter(([, v]) => v.count >= 2)
      .map(([key, v]) => ({
        description: key.split('|')[0],
        amount: v.amount,
        categoryId: v.categoryId,
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count);
  });

  readonly activeSubscriptions = computed(() =>
    this._data().subscriptions.filter(s => s.active)
  );

  computeWeeklyBudget(monthlyBudget: number): number {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const weekly = (monthlyBudget / daysInMonth) * 7;
    return Math.ceil(weekly / 5) * 5;
  }

  updateCategoryBudget(categoryId: string, monthlyBudget: number): void {
    this._budgetOverrides.update(overrides => {
      const filtered = overrides.filter(o => o.categoryId !== categoryId);
      return [...filtered, { categoryId, monthlyBudget }];
    });
    this.saveCategories();
  }

  private loadBudgetOverrides(): CategoryBudgetOverride[] {
    try {
      const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  }

  private saveCategories(): void {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(this._budgetOverrides()));
  }

  private loadData(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { expenses: [], incomes: [], subscriptions: [] };
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data()));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const newExpense: Expense = {
      ...expense,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };
    this._data.update(d => ({ ...d, expenses: [...d.expenses, newExpense] }));
    this.save();
    return newExpense;
  }

  addInstallmentExpenses(
    totalAmount: number,
    categoryId: string,
    description: string,
    numInstallments: number,
    firstPaymentDate: string,
    providerId: string
  ): Expense[] {
    const groupId = this.generateId();
    const baseAmount = Math.floor((totalAmount / numInstallments) * 100) / 100;
    const firstAmount = totalAmount - baseAmount * (numInstallments - 1);
    const installments: Expense[] = [];

    for (let i = 0; i < numInstallments; i++) {
      const paymentDate = new Date(firstPaymentDate);
      paymentDate.setDate(paymentDate.getDate() + i * 30);
      const amount = i === 0 ? Math.round(firstAmount * 100) / 100 : baseAmount;

      installments.push({
        id: this.generateId(),
        amount,
        categoryId,
        description: `${description} (${i + 1}/${numInstallments})`,
        date: paymentDate.toISOString(),
        createdAt: new Date().toISOString(),
        isInstallment: true,
        installmentGroupId: groupId,
        installmentNumber: i + 1,
        totalInstallments: numInstallments,
        installmentProviderId: providerId,
      });
    }

    this._data.update(d => ({ ...d, expenses: [...d.expenses, ...installments] }));
    this.save();
    return installments;
  }

  addIncome(income: Omit<Income, 'id' | 'createdAt'>): Income {
    const newIncome: Income = {
      ...income,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    };
    this._data.update(d => ({ ...d, incomes: [...d.incomes, newIncome] }));
    this.save();
    return newIncome;
  }

  addSubscription(sub: Omit<Subscription, 'id'>): Subscription {
    const newSub: Subscription = { ...sub, id: this.generateId() };
    this._data.update(d => ({ ...d, subscriptions: [...d.subscriptions, newSub] }));
    this.save();
    return newSub;
  }

  removeSubscription(id: string): void {
    this._data.update(d => ({
      ...d,
      subscriptions: d.subscriptions.filter(s => s.id !== id),
    }));
    this.save();
  }

  toggleSubscription(id: string): void {
    this._data.update(d => ({
      ...d,
      subscriptions: d.subscriptions.map(s =>
        s.id === id ? { ...s, active: !s.active } : s
      ),
    }));
    this.save();
  }

  deleteExpense(id: string): void {
    this._data.update(d => ({
      ...d,
      expenses: d.expenses.filter(e => e.id !== id),
    }));
    this.save();
  }

  deleteIncome(id: string): void {
    this._data.update(d => ({
      ...d,
      incomes: d.incomes.filter(i => i.id !== id),
    }));
    this.save();
  }

  generateSubscriptionExpenses(): void {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const activeSubs = this._data().subscriptions.filter(s => s.active);
    const existingSubExpenses = this._data().expenses.filter(e => e.subscriptionId);
    const newExpenses: Expense[] = [];

    for (const sub of activeSubs) {
      const start = new Date(sub.startDate);
      let current = new Date(start);

      while (current <= today) {
        const dateStr = current.toISOString().split('T')[0];
        const exists = existingSubExpenses.some(
          e => e.subscriptionId === sub.id && e.date.startsWith(dateStr)
        );
        if (!exists) {
          const template = this.subscriptionTemplates.find(t => t.id === sub.templateId);
          newExpenses.push({
            id: this.generateId(),
            amount: sub.amount,
            categoryId: 'bills',
            description: template?.name ?? 'Subscription',
            date: current.toISOString(),
            createdAt: new Date().toISOString(),
            isInstallment: false,
            subscriptionId: sub.id,
          });
        }
        current = new Date(current.getTime());
        current.setDate(current.getDate() + sub.intervalDays);
      }
    }

    if (newExpenses.length > 0) {
      this._data.update(d => ({ ...d, expenses: [...d.expenses, ...newExpenses] }));
      this.save();
    }
  }

  getWeeklySpentByCategory(categoryId: string): number {
    return this.currentWeekExpenses()
      .filter(e => e.categoryId === categoryId)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  getMonthlySpentByCategory(categoryId: string): number {
    return this.currentMonthExpenses()
      .filter(e => e.categoryId === categoryId)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  exportData(): string {
    return JSON.stringify(this._data(), null, 2);
  }

  importData(json: string): boolean {
    try {
      const data: AppData = JSON.parse(json);
      if (data.expenses && data.incomes && data.subscriptions) {
        this._data.set(data);
        this.save();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getCategoryById(id: string): Category | undefined {
    return this.categories().find(c => c.id === id);
  }

  getProviderById(id: string): InstallmentProvider | undefined {
    return this.providers.find(p => p.id === id);
  }

  getTemplateById(id: string): SubscriptionTemplate | undefined {
    return this.subscriptionTemplates.find(t => t.id === id);
  }

  /** Returns true if icon is a Font Awesome class (starts with "fa-"), false if it's an image path */
  isIconClass(icon: string | undefined): boolean {
    return !!icon && icon.startsWith('fa-');
  }

  getUpcomingExpenses(): Expense[] {
    const now = new Date().toISOString();
    return this._data().expenses
      .filter(e => e.date > now)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
