import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let notification of notifications; trackBy: trackByFn"
        class="toast toast-{{notification.type}}"
        (click)="handleToastClick(notification)">

        <div class="toast-header">
          <div class="toast-icon">
            <i class="icon-{{notification.type}}"></i>
          </div>
          <div class="toast-title">{{ notification.title }}</div>
          <button
            type="button"
            class="toast-close"
            (click)="removeNotification(notification.id); $event.stopPropagation()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="toast-body">
          {{ notification.message }}
        </div>

        <div *ngIf="notification.action" class="toast-actions">
          <button
            class="btn btn-action"
            (click)="executeAction(notification); $event.stopPropagation()">
            {{ notification.action.label }}
          </button>
        </div>

        <!-- Progress bar for auto-dismiss -->
        <div *ngIf="notification.duration" class="toast-progress">
          <div class="toast-progress-bar"
               [style.animation-duration.ms]="notification.duration"></div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./notification-toast.component.css']
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription?: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.getNotifications().subscribe(
      notifications => {
        this.notifications = notifications;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }

  executeAction(notification: Notification): void {
    if (notification.action) {
      notification.action.callback();
      this.removeNotification(notification.id);
    }
  }

  handleToastClick(notification: Notification): void {
    // Si hay acción, ejecutarla al hacer click
    if (notification.action) {
      this.executeAction(notification);
    }
  }

  trackByFn(index: number, item: Notification): string {
    return item.id;
  }
}
