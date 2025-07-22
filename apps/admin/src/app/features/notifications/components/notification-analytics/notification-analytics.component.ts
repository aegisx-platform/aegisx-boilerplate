import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationStats } from '../../types/notification.types';

@Component({
  selector: 'app-notification-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4">
      <h3>Notification Analytics</h3>
      <p>Analytics and reporting component - Coming soon...</p>
      <div *ngIf="stats" class="mt-4">
        <p>Total notifications: {{ stats.totalCount }}</p>
        <p>Success rate: {{ stats.successRate }}%</p>
      </div>
    </div>
  `
})
export class NotificationAnalyticsComponent {
  @Input() stats: NotificationStats | null = null;
  @Output() refreshRequested = new EventEmitter<void>();
}