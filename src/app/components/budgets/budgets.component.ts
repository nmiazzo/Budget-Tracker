import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.scss',
})
export class BudgetsComponent {
  constructor(readonly budget: BudgetService) {}

  editingCategoryId = signal<string | null>(null);
  editMonthlyValue = signal<number>(0);

  showHidden = signal(false);

  private readonly allBudgetData = computed(() => {
    return this.budget.categories().map(cat => {
      const weeklySpent = this.budget.getWeeklySpentByCategory(cat.id);
      const monthlySpent = this.budget.getMonthlySpentByCategory(cat.id);
      const weeklyRaw = cat.weeklyBudget > 0 ? (weeklySpent / cat.weeklyBudget) * 100 : 0;
      const monthlyRaw = cat.monthlyBudget > 0 ? (monthlySpent / cat.monthlyBudget) * 100 : 0;
      return {
        ...cat,
        weeklySpent,
        monthlySpent,
        weeklyPercent: Math.min(100, weeklyRaw),
        monthlyPercent: Math.min(100, monthlyRaw),
        weeklyRawPercent: weeklyRaw,
        monthlyRawPercent: monthlyRaw,
      };
    });
  });

  readonly budgetData = computed(() =>
    this.allBudgetData().filter(b => b.monthlyBudget > 0)
  );

  readonly hiddenCategories = computed(() =>
    this.allBudgetData().filter(b => b.monthlyBudget === 0)
  );

  readonly totalBudget = computed(() => {
    const data = this.budgetData();
    const weeklyBudget = data.reduce((s, c) => s + c.weeklyBudget, 0);
    const monthlyBudget = data.reduce((s, c) => s + c.monthlyBudget, 0);
    const weeklySpent = data.reduce((s, c) => s + c.weeklySpent, 0);
    const monthlySpent = data.reduce((s, c) => s + c.monthlySpent, 0);
    return {
      weeklyBudget,
      monthlyBudget,
      weeklySpent,
      monthlySpent,
      weeklyPercent: weeklyBudget > 0 ? Math.min(100, (weeklySpent / weeklyBudget) * 100) : 0,
      monthlyPercent: monthlyBudget > 0 ? Math.min(100, (monthlySpent / monthlyBudget) * 100) : 0,
      weeklyRawPercent: weeklyBudget > 0 ? (weeklySpent / weeklyBudget) * 100 : 0,
      monthlyRawPercent: monthlyBudget > 0 ? (monthlySpent / monthlyBudget) * 100 : 0,
    };
  });

  formatCurrency(amount: number): string {
    return '\u20AC ' + amount.toFixed(2);
  }

  startEdit(categoryId: string, currentMonthly: number): void {
    this.editingCategoryId.set(categoryId);
    this.editMonthlyValue.set(currentMonthly);
  }

  saveEdit(): void {
    const catId = this.editingCategoryId();
    if (catId) {
      this.budget.updateCategoryBudget(catId, this.editMonthlyValue());
    }
    this.editingCategoryId.set(null);
  }

  cancelEdit(): void {
    this.editingCategoryId.set(null);
  }

  onEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.saveEdit();
    } else if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }
}
