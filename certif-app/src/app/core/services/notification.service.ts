import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

const AUTO_DISMISS_MS: Record<NotificationType, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 5000
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  warning(message: string): void {
    this.push('warning', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this._notifications.update(list => list.filter(n => n.id !== id));
  }

  private push(type: NotificationType, message: string): void {
    const notification: Notification = { id: this.nextId++, type, message };
    this._notifications.update(list => [...list, notification]);
    setTimeout(() => this.dismiss(notification.id), AUTO_DISMISS_MS[type]);
  }
}
