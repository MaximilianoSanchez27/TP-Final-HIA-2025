import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);

  constructor() { }

  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  showSuccess(title: string, message: string, duration: number = 5000): string {
    return this.addNotification({
      type: 'success',
      title,
      message,
      duration
    });
  }

  showError(title: string, message: string, duration: number = 7000): string {
    return this.addNotification({
      type: 'error',
      title,
      message,
      duration
    });
  }

  showWarning(title: string, message: string, duration: number = 6000): string {
    return this.addNotification({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  showInfo(title: string, message: string, duration: number = 5000): string {
    return this.addNotification({
      type: 'info',
      title,
      message,
      duration
    });
  }

  showPaymentSuccess(cobroId: number, amount: number): string {
    return this.addNotification({
      type: 'success',
      title: '💰 ¡Pago Recibido!',
      message: `El cobro #${cobroId} por $${amount.toLocaleString('es-AR')} ha sido pagado exitosamente`,
      duration: 8000,
      action: {
        label: 'Ver Detalle',
        callback: () => {
          // Navegar al detalle del cobro
          window.location.href = `/dashboard/cobros/detalle/${cobroId}`;
        }
      }
    });
  }

  private addNotification(notification: Omit<Notification, 'id'>): string {
    const id = this.generateId();
    const newNotification: Notification = {
      ...notification,
      id
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([...currentNotifications, newNotification]);

    // Auto-remove notification after duration
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, notification.duration);
    }

    return id;
  }

  removeNotification(id: string): void {
    const currentNotifications = this.notifications$.value;
    const updatedNotifications = currentNotifications.filter(n => n.id !== id);
    this.notifications$.next(updatedNotifications);
  }

  clearAll(): void {
    this.notifications$.next([]);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
