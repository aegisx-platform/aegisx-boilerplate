import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-queue',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4">
      <h3>Queue Status</h3>
      <p>Queue management component - Coming soon...</p>
    </div>
  `
})
export class NotificationQueueComponent {
  @Output() refreshRequested = new EventEmitter<void>();
}