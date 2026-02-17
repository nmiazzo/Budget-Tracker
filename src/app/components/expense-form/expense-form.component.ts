import { Component, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-form.component.html',
  styleUrl: './expense-form.component.scss',
})
export class ExpenseFormComponent implements OnInit {
  readonly initialAmount = input(0);
  readonly initialDescription = input('');
  readonly initialCategory = input('');
  readonly close = output<boolean>();

  amount = 0;
  description = '';
  categoryId = '';
  date = '';
  isInstallment = false;
  numInstallments = 3;
  installmentProviderId = 'none';
  firstPaymentDate = '';

  constructor(readonly budget: BudgetService) {}

  ngOnInit(): void {
    this.amount = this.initialAmount();
    this.description = this.initialDescription();
    this.categoryId = this.initialCategory() || this.budget.categories[0].id;
    const today = new Date();
    this.date = this.formatDateInput(today);
    this.firstPaymentDate = this.date;
  }

  formatDateInput(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  get installmentPreview(): { number: number; amount: number; date: string }[] {
    if (!this.isInstallment || this.amount <= 0 || this.numInstallments < 2) return [];
    const base = Math.floor((this.amount / this.numInstallments) * 100) / 100;
    const first = Math.round((this.amount - base * (this.numInstallments - 1)) * 100) / 100;
    const items = [];
    for (let i = 0; i < this.numInstallments; i++) {
      const d = new Date(this.firstPaymentDate);
      d.setDate(d.getDate() + i * 30);
      items.push({
        number: i + 1,
        amount: i === 0 ? first : base,
        date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      });
    }
    return items;
  }

  getProviderIcon(id: string): string {
    return this.budget.getProviderById(id)?.icon ?? '';
  }

  save(): void {
    if (this.amount <= 0 || !this.description.trim()) return;

    if (this.isInstallment && this.numInstallments >= 2) {
      this.budget.addInstallmentExpenses(
        this.amount,
        this.categoryId,
        this.description.trim(),
        this.numInstallments,
        new Date(this.firstPaymentDate).toISOString(),
        this.installmentProviderId
      );
    } else {
      this.budget.addExpense({
        amount: this.amount,
        categoryId: this.categoryId,
        description: this.description.trim(),
        date: new Date(this.date).toISOString(),
        isInstallment: false,
      });
    }

    this.close.emit(true);
  }

  cancel(): void {
    this.close.emit(false);
  }
}
