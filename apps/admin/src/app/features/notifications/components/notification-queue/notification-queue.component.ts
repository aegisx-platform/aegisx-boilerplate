import { Component, OnInit, OnDestroy, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';

import { NotificationService } from '../../services/notification.service';
import { Notification, NotificationPriority } from '../../types/notification.types';

interface QueueMetrics {
  totalQueued: number;
  totalScheduled: number;
  processingRate: number;
  averageWaitTime: number;
  queuesByPriority: { priority: string; count: number }[];
}

@Component({
  selector: 'app-notification-queue',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressBarModule,
    SkeletonModule,
    SelectModule,
    InputNumberModule,
    DividerModule,
    BadgeModule,
    DialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="main-container">
      <!-- Queue Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Total Queued</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ queueMetrics.totalQueued }}</div>
            </div>
            <div class="p-2 bg-blue-50 rounded-lg">
              <i class="pi pi-clock text-blue-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-arrow-up text-green-500 mr-1"></i>
            Active monitoring
          </div>
        </div>

        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Scheduled</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ queueMetrics.totalScheduled }}</div>
            </div>
            <div class="p-2 bg-indigo-50 rounded-lg">
              <i class="pi pi-calendar text-indigo-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-arrow-up text-green-500 mr-1"></i>
            Future notifications
          </div>
        </div>

        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Processing Rate</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ queueMetrics.processingRate.toFixed(1) }}/min</div>
            </div>
            <div class="p-2 bg-green-50 rounded-lg">
              <i class="pi pi-chart-line text-green-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-arrow-up text-green-500 mr-1"></i>
            Real-time processing
          </div>
        </div>

        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Avg Wait Time</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ formatTime(queueMetrics.averageWaitTime) }}</div>
            </div>
            <div class="p-2 bg-orange-50 rounded-lg">
              <i class="pi pi-hourglass text-orange-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-arrow-down text-red-500 mr-1"></i>
            Current average
          </div>
        </div>
      </div>

      <!-- Priority Queue Breakdown -->
      <div class="queue-section">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="w-full">
          <p-card class="h-full">
            <ng-template pTemplate="header">
              <div class="flex items-center justify-between p-4 border-b">
                <h4 class="text-lg font-semibold text-gray-900 m-0">Queue by Priority</h4>
                <p-button
                  icon="pi pi-refresh"
                  size="small"
                  [text]="true"
                  (click)="refreshQueueStatus()"
                  [loading]="loading">
                </p-button>
              </div>
            </ng-template>

            <div class="p-4 min-h-[200px] flex flex-col">
              <div class="space-y-3 flex-1">
                <div *ngFor="let item of queueMetrics.queuesByPriority" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-3">
                    <i [class]="notificationService.getPriorityIcon(item.priority)" [ngClass]="'text-' + notificationService.getPriorityColor(item.priority) + '-600'"></i>
                    <span class="font-medium capitalize text-gray-700">{{ item.priority }}</span>
                  </div>
                  <p-badge
                    [value]="item.count"
                    [severity]="getBadgeSeverity(item.priority)">
                  </p-badge>
                </div>
                <div *ngIf="queueMetrics.queuesByPriority.length === 0" class="text-center py-8 text-gray-500 flex-1 flex flex-col justify-center">
                  <i class="pi pi-info-circle text-3xl mb-3 block text-gray-400"></i>
                  <span class="text-sm">No queued notifications by priority</span>
                </div>
              </div>
            </div>
          </p-card>
        </div>

        <div class="w-full">
          <p-card class="h-full">
            <ng-template pTemplate="header">
              <div class="flex items-center justify-between p-4 border-b">
                <h4 class="text-lg font-semibold text-gray-900 m-0">Queue Controls</h4>
                <div class="flex gap-2">
                  <p-button
                    icon="pi pi-play"
                    label="Process Queue"
                    size="small"
                    (click)="showProcessDialog()"
                    [disabled]="processing || queueMetrics.totalQueued === 0">
                  </p-button>
                </div>
              </div>
            </ng-template>

            <div class="p-4 min-h-[200px] flex flex-col">
              <div class="space-y-4 flex-1">
                <div class="flex items-center justify-between py-2">
                  <span class="text-sm font-medium text-gray-700">Auto-refresh</span>
                  <p-button
                    [icon]="autoRefresh ? 'pi pi-pause' : 'pi pi-play'"
                    [label]="autoRefresh ? 'Enabled' : 'Disabled'"
                    [severity]="autoRefresh ? 'success' : 'secondary'"
                    size="small"
                    [text]="true"
                    (click)="toggleAutoRefresh()">
                  </p-button>
                </div>

                <hr class="border-gray-200">

                <div class="text-sm text-gray-600 space-y-3 flex-1 flex flex-col justify-center">
                  <div class="flex items-center gap-2">
                    <i class="pi pi-clock text-gray-400"></i>
                    <span>Last updated: {{ formatTime(getCurrentTime() - lastUpdated) }} ago</span>
                  </div>
                  <div *ngIf="processing" class="flex items-center gap-2 text-blue-600">
                    <i class="pi pi-spin pi-spinner"></i>
                    <span>Processing queue...</span>
                  </div>
                  <div *ngIf="!processing && autoRefresh" class="flex items-center gap-2 text-green-600">
                    <i class="pi pi-check-circle text-green-500"></i>
                    <span>Auto-refresh active (every 30s)</span>
                  </div>
                </div>
              </div>
            </div>
          </p-card>
        </div>
        </div>
      </div>

      <!-- Queued Notifications Table -->
      <div class="queue-section">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex items-center justify-between p-4 border-b">
              <h4 class="text-lg font-semibold text-gray-900 m-0">Queued Notifications</h4>
              <div class="flex gap-2">
                <p-button
                  icon="pi pi-eye"
                  label="View All"
                  size="small"
                  [text]="true"
                  (click)="loadQueuedNotifications()"
                  [loading]="loadingQueued">
                </p-button>
              </div>
            </div>
          </ng-template>

        <p-table
          [value]="queuedNotifications"
          [loading]="loadingQueued"
          [paginator]="true"
          [rows]="25"
          styleClass="p-datatable-gridlines">

          <ng-template pTemplate="header">
            <tr>
              <th style="width: 100px">Priority</th>
              <th style="width: 100px">Channel</th>
              <th>Recipient</th>
              <th>Subject</th>
              <th style="width: 150px">Scheduled</th>
              <th style="width: 80px">Attempts</th>
              <th style="width: 120px">Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-notification>
            <tr>
              <td>
                <p-tag
                  [value]="notification.priority"
                  [severity]="notificationService.getPriorityColor(notification.priority)"
                  [icon]="notificationService.getPriorityIcon(notification.priority)">
                </p-tag>
              </td>
              <td>
                <i [class]="notificationService.getChannelIcon(notification.channel)" class="text-lg"></i>
              </td>
              <td>
                <div class="text-sm">
                  <div>{{ notification.recipientEmail || 'N/A' }}</div>
                  <div class="text-gray-500">{{ notification.recipientName || notification.recipientPhone || '' }}</div>
                </div>
              </td>
              <td>
                <div class="text-sm" [title]="notification.subject">
                  {{ (notification.subject || 'No subject') | slice:0:40 }}{{ (notification.subject || '').length > 40 ? '...' : '' }}
                </div>
              </td>
              <td>
                <div class="text-sm">
                  {{ notification.scheduledAt ? (notification.scheduledAt | date:'short') : 'Now' }}
                </div>
              </td>
              <td class="text-center">
                <div class="text-sm">{{ notification.attempts || 0 }}/{{ notification.maxRetries || 3 }}</div>
              </td>
              <td>
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    size="small"
                    (click)="viewNotification(notification)"
                    pTooltip="View details">
                  </p-button>

                  <p-button
                    icon="pi pi-times"
                    [text]="true"
                    size="small"
                    severity="danger"
                    (click)="cancelNotification(notification)"
                    pTooltip="Cancel">
                  </p-button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center py-8">
                <div class="flex flex-column align-items-center gap-3">
                  <i class="pi pi-check-circle text-6xl text-green-300"></i>
                  <div class="text-xl text-gray-500">Queue is empty</div>
                  <div class="text-gray-400">All notifications have been processed</div>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
        </p-card>
      </div>

      <!-- Scheduled Notifications -->
      <div *ngIf="scheduledNotifications.length > 0" class="queue-section">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex items-center justify-between p-4 border-b">
              <h4 class="text-lg font-semibold text-gray-900 m-0">Scheduled Notifications</h4>
              <p-button
                icon="pi pi-refresh"
                size="small"
                [text]="true"
                (click)="loadScheduledNotifications()"
                [loading]="loadingScheduled">
              </p-button>
            </div>
          </ng-template>

        <p-table
          [value]="scheduledNotifications"
          [loading]="loadingScheduled"
          [paginator]="true"
          [rows]="10"
          styleClass="p-datatable-gridlines">

          <ng-template pTemplate="header">
            <tr>
              <th>Recipient</th>
              <th>Subject</th>
              <th style="width: 150px">Scheduled For</th>
              <th style="width: 100px">Priority</th>
              <th style="width: 120px">Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-notification>
            <tr>
              <td>
                <div class="text-sm">{{ notification.recipientEmail || notification.recipientPhone || 'N/A' }}</div>
              </td>
              <td>
                <div class="text-sm">{{ notification.subject || 'No subject' }}</div>
              </td>
              <td>
                <div class="text-sm">{{ notification.scheduledAt | date:'medium' }}</div>
              </td>
              <td>
                <p-tag
                  [value]="notification.priority"
                  [severity]="notificationService.getPriorityColor(notification.priority)">
                </p-tag>
              </td>
              <td>
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    size="small"
                    (click)="viewNotification(notification)"
                    pTooltip="View details">
                  </p-button>

                  <p-button
                    icon="pi pi-times"
                    [text]="true"
                    size="small"
                    severity="danger"
                    (click)="cancelNotification(notification)"
                    pTooltip="Cancel">
                  </p-button>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
        </p-card>
      </div>
    </div>

    <!-- Processing Dialog -->
    <p-dialog
      [(visible)]="showProcessQueueDialog"
      [modal]="true"
      [style]="{width: '500px'}"
      header="Process Queue"
      [closable]="true">

      <div class="space-y-4">
        <div class="field">
          <label class="block text-sm font-medium mb-2">Priority Filter</label>
          <p-select
            [(ngModel)]="processOptions.priority"
            [options]="priorityOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All priorities"
            class="w-full">
          </p-select>
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-2">Batch Size</label>
          <p-inputNumber
            [(ngModel)]="processOptions.limit"
            [min]="1"
            [max]="50"
            class="w-full">
          </p-inputNumber>
        </div>

        <div class="text-sm text-gray-600">
          <p>This will process up to {{ processOptions.limit }} notifications{{ processOptions.priority ? ' with ' + processOptions.priority + ' priority' : '' }}.</p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-content-end gap-2">
          <p-button
            label="Cancel"
            severity="secondary"
            (click)="showProcessQueueDialog = false">
          </p-button>
          <p-button
            label="Process"
            (click)="processQueue()"
            [loading]="processing">
          </p-button>
        </div>
      </ng-template>
    </p-dialog>

    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .space-y-3 > * + * {
      margin-top: 0.75rem;
    }

    .space-y-4 > * + * {
      margin-top: 1rem;
    }

    /* Override PrimeNG card styles to prevent conflicts */
    :host ::ng-deep .p-card {
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }

    :host ::ng-deep .p-card .p-card-header {
      padding: 0;
      border: none;
      border-radius: 8px 8px 0 0;
    }

    :host ::ng-deep .p-card .p-card-body {
      padding: 0;
    }

    /* Table styling */
    :host ::ng-deep .p-table .p-table-thead > tr > th {
      background: #f9fafb;
      color: #6b7280;
      font-weight: 600;
      padding: 0.75rem;
    }

    :host ::ng-deep .p-table .p-table-tbody > tr > td {
      padding: 0.5rem 0.75rem;
    }

    .capitalize {
      text-transform: capitalize;
    }

    /* Ensure proper spacing and prevent overlapping */
    .queue-section {
      clear: both;
      margin-bottom: 2rem;
      position: relative;
      display: block;
      width: 100%;
    }
    
    /* Force proper flow */
    :host {
      display: block;
      position: relative;
    }
    
    /* Reset any floating or positioning issues */
    .main-container {
      position: relative;
      display: block;
      width: 100%;
    }
  `]
})
export class NotificationQueueComponent implements OnInit, OnDestroy {
  @Output() refreshRequested = new EventEmitter<void>();
  @Output() notificationSelected = new EventEmitter<Notification>();

  private subscriptions = new Subscription();
  private autoRefreshSubscription?: Subscription;

  notificationService = inject(NotificationService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // State
  queuedNotifications: Notification[] = [];
  scheduledNotifications: Notification[] = [];
  loading = false;
  loadingQueued = false;
  loadingScheduled = false;
  processing = false;
  autoRefresh = true;
  lastUpdated = Date.now();

  // Process dialog
  showProcessQueueDialog = false;
  processOptions = {
    priority: '',
    limit: 10
  };

  // Metrics
  queueMetrics: QueueMetrics = {
    totalQueued: 0,
    totalScheduled: 0,
    processingRate: 0,
    averageWaitTime: 0,
    queuesByPriority: []
  };

  // Options
  priorityOptions = [
    { label: 'All Priorities', value: '' },
    { label: 'Critical', value: 'critical' },
    { label: 'Urgent', value: 'urgent' },
    { label: 'High', value: 'high' },
    { label: 'Normal', value: 'normal' },
    { label: 'Low', value: 'low' }
  ];

  ngOnInit() {
    this.loadQueueStatus();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.stopAutoRefresh();
  }

  loadQueueStatus() {
    this.loading = true;
    this.lastUpdated = Date.now();

    // Load queued and scheduled notifications in parallel
    Promise.all([
      this.loadQueuedNotifications(),
      this.loadScheduledNotifications()
    ]).finally(() => {
      this.loading = false;
      this.updateMetrics();
    });
  }

  async loadQueuedNotifications() {
    this.loadingQueued = true;
    try {
      const response = await this.notificationService.getQueuedNotifications(undefined, 100).toPromise();
      console.log('Queue API response:', response);
      if (response?.success && response.data) {
        this.queuedNotifications = response.data.notifications || [];
      }
    } catch (error) {
      console.error('Error loading queued notifications:', error);
      this.queuedNotifications = [];
    } finally {
      this.loadingQueued = false;
    }
  }

  async loadScheduledNotifications() {
    this.loadingScheduled = true;
    try {
      const response = await this.notificationService.getScheduledNotifications().toPromise();
      console.log('Scheduled API response:', response);
      if (response?.success && response.data) {
        this.scheduledNotifications = response.data.notifications || [];
      }
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
      this.scheduledNotifications = [];
    } finally {
      this.loadingScheduled = false;
    }
  }

  updateMetrics() {
    // Calculate metrics from loaded data
    this.queueMetrics.totalQueued = this.queuedNotifications.length;
    this.queueMetrics.totalScheduled = this.scheduledNotifications.length;

    // Group by priority
    const priorityGroups = this.queuedNotifications.reduce((acc, notif) => {
      const priority = notif.priority || 'normal';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    this.queueMetrics.queuesByPriority = Object.entries(priorityGroups)
      .map(([priority, count]) => ({ priority, count }))
      .sort((a, b) => {
        const order = { critical: 5, urgent: 4, high: 3, normal: 2, low: 1 };
        return (order[b.priority as keyof typeof order] || 0) - (order[a.priority as keyof typeof order] || 0);
      });

    // Mock processing rate and wait time (in a real app, this would come from metrics)
    this.queueMetrics.processingRate = Math.random() * 10 + 5; // 5-15 per minute
    this.queueMetrics.averageWaitTime = Math.random() * 300000 + 60000; // 1-5 minutes in ms
  }

  refreshQueueStatus() {
    this.loadQueueStatus();
  }

  startAutoRefresh() {
    if (this.autoRefresh) {
      this.autoRefreshSubscription = interval(30000) // Refresh every 30 seconds
        .pipe(startWith(0))
        .subscribe(() => {
          if (!this.processing) {
            this.loadQueueStatus();
          }
        });
    }
  }

  stopAutoRefresh() {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
      this.autoRefreshSubscription = undefined;
    }
  }

  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;

    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  showProcessDialog() {
    this.processOptions = {
      priority: '',
      limit: 10
    };
    this.showProcessQueueDialog = true;
  }

  async processQueue() {
    if (this.processing) return;

    this.processing = true;
    try {
      const response = await this.notificationService.processQueuedNotifications(
        this.processOptions.priority || undefined,
        this.processOptions.limit
      ).toPromise();

      if (response?.success) {
        const data = response.data;
        this.messageService.add({
          severity: 'success',
          summary: 'Queue Processed',
          detail: `Processed ${data.processed} notifications. ${data.successful} successful, ${data.failed} failed.`
        });

        this.showProcessQueueDialog = false;
        this.loadQueueStatus(); // Refresh after processing
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Processing Failed',
        detail: 'Failed to process queue'
      });
    } finally {
      this.processing = false;
    }
  }

  viewNotification(notification: Notification) {
    this.notificationSelected.emit(notification);
  }

  cancelNotification(notification: Notification) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel this notification?',
      header: 'Confirm Cancellation',
      icon: 'pi pi-question-circle',
      accept: () => {
        this.notificationService.updateNotificationStatus(notification.id, 'cancelled').subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Notification cancelled successfully'
            });
            this.loadQueueStatus();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to cancel notification'
            });
          }
        });
      }
    });
  }

  formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getCurrentTime(): number {
    return Date.now();
  }

  getBadgeSeverity(priority: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" {
    const mapping: Record<string, "success" | "secondary" | "info" | "warn" | "danger" | "contrast"> = {
      'critical': 'danger',
      'urgent': 'warn',
      'high': 'info',
      'normal': 'secondary',
      'low': 'secondary'
    };
    return mapping[priority] || 'secondary';
  }

}
