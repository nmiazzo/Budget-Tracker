import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss',
})
export class SubscriptionsComponent {
  showForm = signal(false);
  selectedTemplateId = '';
  amount = 0;
  startDate = new Date().toISOString().split('T')[0];
  intervalDays = 30;

  constructor(readonly budget: BudgetService) {}

  selectTemplate(id: string): void {
    this.selectedTemplateId = id;
    const t = this.budget.getTemplateById(id);
    if (t?.defaultAmount) {
      this.amount = t.defaultAmount;
    }
    this.showForm.set(true);
  }

  getTemplateIcon(templateId: string): string {
    return this.budget.getTemplateById(templateId)?.icon ?? '';
  }

  getTemplateName(templateId: string): string {
    return this.budget.getTemplateById(templateId)?.name ?? templateId;
  }

  save(): void {
    if (!this.selectedTemplateId || this.amount <= 0) return;
    this.budget.addSubscription({
      templateId: this.selectedTemplateId,
      amount: this.amount,
      startDate: new Date(this.startDate).toISOString(),
      intervalDays: this.intervalDays,
      active: true,
    });
    this.budget.generateSubscriptionExpenses();
    this.resetForm();
  }

  resetForm(): void {
    this.showForm.set(false);
    this.selectedTemplateId = '';
    this.amount = 0;
    this.startDate = new Date().toISOString().split('T')[0];
    this.intervalDays = 30;
  }

  formatCurrency(amount: number): string {
    return '\u20AC ' + amount.toFixed(2);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
