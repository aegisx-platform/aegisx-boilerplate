import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-batch',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4">
      <h3>Batch Jobs</h3>
      <p>Batch processing component - Coming soon...</p>
    </div>
  `
})
export class NotificationBatchComponent {
  @Output() batchSelected = new EventEmitter<any>();
  @Output() refreshRequested = new EventEmitter<void>();
}