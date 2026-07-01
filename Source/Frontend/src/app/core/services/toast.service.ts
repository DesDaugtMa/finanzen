import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'danger' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'danger');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private show(message: string, variant: ToastVariant): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, variant }]);
    setTimeout(() => this.dismiss(id), 5000);
  }
}
