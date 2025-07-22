import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-templates',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4">
      <h3>Notification Templates</h3>
      <p>Template management component - Coming soon...</p>
    </div>
  `
})
export class NotificationTemplatesComponent {
  @Output() templateSelected = new EventEmitter<any>();
  @Output() refreshRequested = new EventEmitter<void>();
}