import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './income-form.component.html',
  styleUrl: './income-form.component.scss',
})
export class IncomeFormComponent {
  readonly close = output<void>();

  amount = '';
  description = '';
  date = new Date().toISOString().split('T')[0];

  constructor(private budget: BudgetService) {}

  get displayAmount(): string {
    if (!this.amount) return '0.00';
    const cents = parseInt(this.amount, 10);
    if (isNaN(cents)) return '0.00';
    return (cents / 100).toFixed(2);
  }

  get numericAmount(): number {
    if (!this.amount) return 0;
    const cents = parseInt(this.amount, 10);
    return isNaN(cents) ? 0 : cents / 100;
  }

  onDigit(d: string): void {
    if (this.amount.length >= 8) return;
    this.amount += d;
  }

  onBackspace(): void {
    this.amount = this.amount.slice(0, -1);
  }

  onClear(): void {
    this.amount = '';
  }

  save(): void {
    if (this.numericAmount <= 0 || !this.description.trim()) return;
    this.budget.addIncome({
      amount: this.numericAmount,
      description: this.description.trim(),
      date: new Date(this.date).toISOString(),
    });
    this.close.emit();
  }

  cancel(): void {
    this.close.emit();
  }
}
