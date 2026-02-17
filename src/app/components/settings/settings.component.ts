import { Component, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetService } from '../../services/budget.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  message = signal('');
  messageType = signal<'success' | 'error'>('success');
  showDeleteConfirm = signal(false);

  constructor(private budget: BudgetService) {}

  exportData(): void {
    const data = this.budget.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showMessage('Backup downloaded successfully', 'success');
  }

  triggerImport(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = this.budget.importData(reader.result as string);
      if (result) {
        this.showMessage('Data restored successfully', 'success');
      } else {
        this.showMessage('Invalid backup file', 'error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message.set(msg);
    this.messageType.set(type);
    setTimeout(() => this.message.set(''), 3000);
  }

  confirmDeleteAll(): void {
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  deleteAllData(): void {
    this.budget.clearAllData();
    this.showDeleteConfirm.set(false);
    this.showMessage('All data has been deleted', 'success');
  }
}
