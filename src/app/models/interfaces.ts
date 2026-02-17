export interface Category {
  id: string;
  name: string;
  icon?: string;
  weeklyBudget: number;
  monthlyBudget: number;
  color: string;
}

export interface InstallmentProvider {
  id: string;
  name: string;
  icon?: string;
}

export interface SubscriptionTemplate {
  id: string;
  name: string;
  icon?: string;
  defaultAmount?: number;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  description: string;
  date: string; // ISO date string
  createdAt: string;
  isInstallment: boolean;
  installmentGroupId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  installmentProviderId?: string;
  subscriptionId?: string;
}

export interface Income {
  id: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  templateId: string;
  amount: number;
  startDate: string;
  intervalDays: number;
  active: boolean;
}

export interface AppData {
  expenses: Expense[];
  incomes: Income[];
  subscriptions: Subscription[];
}

export interface QuickAddSuggestion {
  description: string;
  amount: number;
  categoryId: string;
  count: number;
}
