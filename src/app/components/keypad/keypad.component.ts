import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-keypad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keypad.component.html',
  styleUrl: './keypad.component.scss',
})
export class KeypadComponent {
  readonly submit = output<number>();
  readonly rawDigits = signal('');

  readonly displayValue = () => {
    const raw = this.rawDigits();
    if (!raw) return '0.00';
    const cents = parseInt(raw, 10);
    return (cents / 100).toFixed(2);
  };

  onDigit(digit: string): void {
    const current = this.rawDigits();
    if (current.length >= 8) return; // max 999999.99
    this.rawDigits.set(current + digit);
  }

  onBackspace(): void {
    const current = this.rawDigits();
    this.rawDigits.set(current.slice(0, -1));
  }

  onClear(): void {
    this.rawDigits.set('');
  }

  onSubmit(): void {
    const raw = this.rawDigits();
    if (!raw || parseInt(raw, 10) === 0) return;
    this.submit.emit(parseInt(raw, 10));
    this.rawDigits.set('');
  }
}
