import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetService } from '../../services/budget.service';
import { KeypadComponent } from '../keypad/keypad.component';
import { ExpenseFormComponent } from '../expense-form/expense-form.component';
import { IncomeFormComponent } from '../income-form/income-form.component';
import { BudgetsComponent } from '../budgets/budgets.component';
import { SubscriptionsComponent } from '../subscriptions/subscriptions.component';
import { SettingsComponent } from '../settings/settings.component';

type Tab = 'home' | 'budgets' | 'subscriptions' | 'history' | 'settings';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    KeypadComponent,
    ExpenseFormComponent,
    IncomeFormComponent,
    BudgetsComponent,
    SubscriptionsComponent,
    SettingsComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  activeTab = signal<Tab>('home');
  showExpenseForm = signal(false);
  showIncomeForm = signal(false);
  showToast = signal(false);
  quickAddAmount = signal(0);
  quickAddDescription = signal('');
  quickAddCategory = signal('');

  balance = computed(() => this.budget.totalBalance());
  monthIncome = computed(() => this.budget.totalMonthIncome());
  monthExpenses = computed(() => this.budget.totalMonthExpenses());
  suggestions = computed(() => this.budget.quickAddSuggestions());
  upcomingExpenses = computed(() => this.budget.getUpcomingExpenses().slice(0, 5));

  recentExpenses = computed(() => {
    const all = [...this.budget.expenses()];
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return all.slice(0, 30);
  });

  recentIncomes = computed(() => {
    const all = [...this.budget.incomes()];
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return all.slice(0, 30);
  });

  historyTab = signal<'expenses' | 'incomes'>('expenses');

  constructor(readonly budget: BudgetService) {}

  ngOnInit(): void {
    this.budget.generateSubscriptionExpenses();
  }

  onKeypadSubmit(amountCents: number): void {
    this.quickAddAmount.set(amountCents / 100);
    this.showExpenseForm.set(true);
  }

  onQuickAdd(suggestion: { description: string; amount: number; categoryId: string }): void {
    this.quickAddAmount.set(suggestion.amount);
    this.quickAddDescription.set(suggestion.description);
    this.quickAddCategory.set(suggestion.categoryId);
    this.showExpenseForm.set(true);
  }

  onExpenseFormClose(saved: boolean): void {
    this.showExpenseForm.set(false);
    this.quickAddAmount.set(0);
    this.quickAddDescription.set('');
    this.quickAddCategory.set('');
    if (saved) {
      this.showToast.set(true);
      setTimeout(() => this.showToast.set(false), 2500);
    }
  }

  onIncomeFormClose(): void {
    this.showIncomeForm.set(false);
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  formatCurrency(amount: number): string {
    return '\u20AC ' + amount.toFixed(2);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  }

  getCategoryName(id: string): string {
    return this.budget.getCategoryById(id)?.name ?? id;
  }

  getCategoryColor(id: string): string {
    return this.budget.getCategoryById(id)?.color ?? '#999';
  }

  getCategoryIcon(id: string): string {
    return this.budget.getCategoryById(id)?.icon ?? '';
  }

  deleteExpense(id: string): void {
    if (confirm('Are you sure you want to delete this expense?')) {
      this.budget.deleteExpense(id);
    }
  }

  deleteIncome(id: string): void {
    if (confirm('Are you sure you want to delete this income?')) {
      this.budget.deleteIncome(id);
    }
  }
}
