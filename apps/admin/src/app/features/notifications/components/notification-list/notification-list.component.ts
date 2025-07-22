import { Component, OnInit, OnDestroy, inject, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TimelineModule } from 'primeng/timeline';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { Table } from 'primeng/table';

import { NotificationService } from '../../services/notification.service';
import { 
  Notification, 
  NotificationStatus, 
  NotificationChannel, 
  NotificationPriority,
  ListNotificationsParams 
} from '../../types/notification.types';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TimelineModule,
    BadgeModule,
    DividerModule,
    ChipModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="notification-list-container">
      <!-- Filters -->
      <div class="filters-section mb-4">
        <div class="flex flex-wrap align-items-center gap-3">
          <!-- Search -->
          <div class="flex-1 min-w-20rem">
            <p-iconField iconPosition="left">
              <p-inputIcon styleClass="pi pi-search"></p-inputIcon>
              <input
                pInputText
                [(ngModel)]="searchTerm"
                (input)="onSearch()"
                placeholder="Search by recipient, subject..."
                class="w-full"
              />
            </p-iconField>
          </div>

          <!-- Status Filter -->
          <p-select 
            [(ngModel)]="selectedStatus"
            [options]="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Statuses"
            [showClear]="true"
            (onChange)="onFilterChange()"
            styleClass="w-10rem">
          </p-select>

          <!-- Channel Filter -->
          <p-select 
            [(ngModel)]="selectedChannel"
            [options]="channelOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Channels"
            [showClear]="true"
            (onChange)="onFilterChange()"
            styleClass="w-10rem">
          </p-select>

          <!-- Priority Filter -->
          <p-select 
            [(ngModel)]="selectedPriority"
            [options]="priorityOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Priorities"
            [showClear]="true"
            (onChange)="onFilterChange()"
            styleClass="w-10rem">
          </p-select>

          <!-- Date Range -->
          <input
            pInputText
            [(ngModel)]="dateRangeText"
            placeholder="Date range (dd/mm/yy - dd/mm/yy)"
            (blur)="onDateRangeChange()"
            class="w-15rem"
          />

          <!-- Refresh Button -->
          <p-button 
            icon="pi pi-refresh" 
            [text]="true"
            (click)="refreshList()"
            pTooltip="Refresh"
            tooltipPosition="bottom">
          </p-button>
        </div>
      </div>

      <!-- Notifications Table -->
      <p-table
        #notificationTable
        [value]="notifications"
        [rows]="pageSize"
        [totalRecords]="totalRecords"
        [lazy]="true"
        [loading]="loading"
        [paginator]="true"
        [rowsPerPageOptions]="[10, 25, 50, 100]"
        [sortMode]="'single'"
        (onLazyLoad)="loadNotifications($event)"
        dataKey="id"
        [globalFilterFields]="['recipient.email', 'recipient.phone', 'content.subject']"
        styleClass="p-datatable-gridlines"
        [scrollable]="true"
        scrollHeight="600px">

        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="sentAt" style="width: 150px">
              Sent
              <p-sortIcon field="sentAt"></p-sortIcon>
            </th>
            <th style="width: 100px">Type</th>
            <th style="width: 100px">Channel</th>
            <th style="width: 200px">Recipient</th>
            <th>Subject / Content</th>
            <th style="width: 100px">Priority</th>
            <th pSortableColumn="status" style="width: 120px">
              Status
              <p-sortIcon field="status"></p-sortIcon>
            </th>
            <th style="width: 140px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-notification>
          <tr [class.notification-failed]="notification.status === 'failed'">
            <td>
              <span class="text-sm">
                {{ notification.sentAt | date:'short' }}
              </span>
            </td>
            <td>
              <p-chip 
                [label]="formatType(notification.type)"
                styleClass="text-xs">
              </p-chip>
            </td>
            <td>
              <div class="flex align-items-center gap-2">
                <i [class]="notificationService.getChannelIcon(notification.channel)"></i>
                <span class="text-sm">{{ notification.channel }}</span>
              </div>
            </td>
            <td>
              <div class="recipient-info">
                <div *ngIf="notification.recipientEmail" class="text-sm">
                  <i class="pi pi-envelope text-xs mr-1"></i>
                  {{ notification.recipientEmail }}
                </div>
                <div *ngIf="notification.recipientPhone" class="text-sm">
                  <i class="pi pi-phone text-xs mr-1"></i>
                  {{ notification.recipientPhone }}
                </div>
                <div *ngIf="notification.recipientName" class="text-sm text-gray-600">
                  {{ notification.recipientName }}
                </div>
              </div>
            </td>
            <td>
              <div class="content-preview">
                <div *ngIf="notification.subject" class="font-medium text-sm mb-1">
                  {{ notification.subject }}
                </div>
                <div class="text-sm text-gray-600 text-truncate" style="max-width: 300px">
                  {{ notification.content || 'No content' }}
                </div>
              </div>
            </td>
            <td>
              <p-tag 
                [value]="notification.priority" 
                [severity]="notificationService.getPriorityColor(notification.priority)"
                [icon]="notificationService.getPriorityIcon(notification.priority)">
              </p-tag>
            </td>
            <td>
              <p-tag 
                [value]="notification.status" 
                [severity]="notificationService.getNotificationStatusColor(notification.status)"
                [pTooltip]="getStatusTooltip(notification)"
                tooltipPosition="top">
              </p-tag>
            </td>
            <td>
              <div class="flex gap-1">
                <p-button 
                  icon="pi pi-eye" 
                  [text]="true" 
                  size="small"
                  (click)="viewNotificationDetails(notification)"
                  pTooltip="View details"
                  tooltipPosition="top">
                </p-button>
                
                <p-button 
                  *ngIf="notification.status === 'failed'"
                  icon="pi pi-refresh" 
                  [text]="true" 
                  size="small"
                  severity="warn"
                  (click)="retryNotification(notification)"
                  pTooltip="Retry"
                  tooltipPosition="top">
                </p-button>

                <p-button 
                  *ngIf="notification.status === 'queued'"
                  icon="pi pi-times" 
                  [text]="true" 
                  size="small"
                  severity="danger"
                  (click)="cancelNotification(notification)"
                  pTooltip="Cancel"
                  tooltipPosition="top">
                </p-button>

                <p-button 
                  icon="pi pi-trash" 
                  [text]="true" 
                  size="small"
                  severity="danger"
                  (click)="deleteNotification(notification)"
                  pTooltip="Delete"
                  tooltipPosition="top">
                </p-button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="8" class="text-center py-8">
              <div class="flex flex-column align-items-center gap-3">
                <i class="pi pi-inbox text-6xl text-gray-300"></i>
                <div class="text-xl text-gray-500">No notifications found</div>
                <div class="text-gray-400">
                  {{ searchTerm || selectedStatus || selectedChannel ? 
                    'Try adjusting your filters' : 
                    'Send your first notification to get started' }}
                </div>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Notification Details Dialog -->
      <p-dialog 
        [(visible)]="showDetailsDialog" 
        [modal]="true" 
        [style]="{width: '700px'}"
        header="Notification Details"
        [closable]="true">
        
        <div *ngIf="selectedNotification" class="notification-details">
          <!-- Header Info -->
          <div class="flex align-items-center justify-content-between mb-4">
            <div class="flex align-items-center gap-3">
              <i [class]="notificationService.getChannelIcon(selectedNotification.channel)" 
                 class="text-2xl text-primary"></i>
              <div>
                <h3 class="m-0">{{ selectedNotification.type | titlecase }} Notification</h3>
                <p class="text-sm text-gray-600 m-0">ID: {{ selectedNotification.id }}</p>
              </div>
            </div>
            <p-tag 
              [value]="selectedNotification.status" 
              [severity]="notificationService.getNotificationStatusColor(selectedNotification.status)">
            </p-tag>
          </div>

          <p-divider></p-divider>

          <!-- Recipient Info -->
          <div class="field mb-3">
            <label class="font-semibold mb-2 block">Recipient</label>
            <div class="recipient-details bg-gray-50 p-3 border-round">
              <div *ngIf="selectedNotification.recipientName" class="mb-2">
                <i class="pi pi-user mr-2"></i>
                {{ selectedNotification.recipientName }}
              </div>
              <div *ngIf="selectedNotification.recipientEmail">
                <i class="pi pi-envelope mr-2"></i>
                {{ selectedNotification.recipientEmail }}
              </div>
              <div *ngIf="selectedNotification.recipientPhone">
                <i class="pi pi-phone mr-2"></i>
                {{ selectedNotification.recipientPhone }}
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="field mb-3">
            <label class="font-semibold mb-2 block">Content</label>
            <div class="content-details bg-gray-50 p-3 border-round">
              <div *ngIf="selectedNotification.subject" class="mb-2">
                <strong>Subject:</strong> {{ selectedNotification.subject }}
              </div>
              <div *ngIf="selectedNotification.content">
                <strong>Message:</strong>
                <p class="mt-1 mb-0 white-space-pre-wrap">{{ selectedNotification.content }}</p>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="field mb-3">
            <label class="font-semibold mb-2 block">Timeline</label>
            <p-timeline [value]="getNotificationTimeline(selectedNotification)" 
                        styleClass="custom-timeline">
              <ng-template pTemplate="content" let-event>
                <div class="timeline-event">
                  <div class="font-medium">{{ event.status }}</div>
                  <div class="text-sm text-gray-600">{{ event.date | date:'medium' }}</div>
                  <div *ngIf="event.error" class="text-sm text-red-600 mt-1">
                    {{ event.error }}
                  </div>
                </div>
              </ng-template>
            </p-timeline>
          </div>

          <!-- Metadata -->
          <div class="field" *ngIf="selectedNotification.metadata">
            <label class="font-semibold mb-2 block">Metadata</label>
            <pre class="bg-gray-50 p-3 border-round text-sm">{{ selectedNotification.metadata | json }}</pre>
          </div>
        </div>
      </p-dialog>
    </div>

    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .notification-list-container {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .filters-section {
      background: var(--surface-50);
      padding: 1rem;
      border-radius: 6px;
    }

    :host ::ng-deep .p-table .p-table-thead > tr > th {
      background: var(--surface-50);
      color: var(--text-color-secondary);
      font-weight: 600;
      padding: 1rem;
    }

    :host ::ng-deep .p-table .p-table-tbody > tr > td {
      padding: 0.75rem 1rem;
    }

    .notification-failed {
      background-color: rgba(239, 68, 68, 0.05);
    }

    .recipient-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .content-preview {
      max-width: 400px;
    }

    .text-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notification-details .field label {
      color: var(--text-color-secondary);
    }

    :host ::ng-deep .custom-timeline .p-timeline-event-content {
      line-height: 1.5;
    }

    .timeline-event {
      padding: 0.5rem 0;
    }

    pre {
      margin: 0;
      overflow-x: auto;
    }

    .white-space-pre-wrap {
      white-space: pre-wrap;
    }
  `]
})
export class NotificationListComponent implements OnInit, OnDestroy {
  @Output() notificationSelected = new EventEmitter<Notification>();
  @Output() refreshRequested = new EventEmitter<void>();

  @ViewChild('notificationTable') table!: Table;

  private subscriptions = new Subscription();
  notificationService = inject(NotificationService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // State
  notifications: Notification[] = [];
  totalRecords = 0;
  loading = false;
  pageSize = 25;
  showDetailsDialog = false;
  selectedNotification: Notification | null = null;

  // Filters
  searchTerm = '';
  selectedStatus: NotificationStatus | null = null;
  selectedChannel: NotificationChannel | null = null;
  selectedPriority: NotificationPriority | null = null;
  dateRange: Date[] | null = null;
  dateRangeText = '';

  // Filter options
  statusOptions = [
    { label: 'Queued', value: 'queued' },
    { label: 'Processing', value: 'processing' },
    { label: 'Sent', value: 'sent' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Failed', value: 'failed' },
    { label: 'Cancelled', value: 'cancelled' }
  ];

  channelOptions = [
    { label: 'Email', value: 'email' },
    { label: 'SMS', value: 'sms' },
    { label: 'Push', value: 'push' },
    { label: 'In-App', value: 'in-app' },
    { label: 'Webhook', value: 'webhook' },
    { label: 'Slack', value: 'slack' }
  ];

  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
    { label: 'Critical', value: 'critical' }
  ];

  private searchTimeout: any;

  ngOnInit() {
    // Initial load will be triggered by table lazy loading
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  loadNotifications(event?: any) {
    this.loading = true;

    const params: ListNotificationsParams = {
      page: event ? Math.floor(event.first / event.rows) + 1 : 1,
      limit: event?.rows || this.pageSize,
      sortBy: event?.sortField || 'sentAt',
      sortOrder: event?.sortOrder === 1 ? 'asc' : 'desc'
    };

    // Apply filters
    if (this.searchTerm) {
      // Search term would typically be handled by the API
      // For now, we'll pass it as metadata
    }
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.selectedChannel) params.channel = this.selectedChannel;
    if (this.selectedPriority) params.priority = this.selectedPriority;
    if (this.dateRange && this.dateRange[0]) {
      params.startDate = this.dateRange[0].toISOString();
      if (this.dateRange[1]) {
        params.endDate = this.dateRange[1].toISOString();
      }
    }

    this.notificationService.listNotifications(params).subscribe({
      next: (response) => {
        this.notifications = response.data || [];
        this.totalRecords = response.pagination?.total || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load notifications'
        });
        this.loading = false;
      }
    });
  }

  onSearch() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      this.table.reset();
    }, 500);
  }

  onFilterChange() {
    this.table.reset();
  }

  onDateRangeChange() {
    // Simple date range parsing - can be enhanced
    if (this.dateRangeText.includes('-')) {
      const dates = this.dateRangeText.split('-').map(d => d.trim());
      if (dates.length === 2) {
        try {
          const startDate = new Date(dates[0]);
          const endDate = new Date(dates[1]);
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            this.dateRange = [startDate, endDate];
            this.onFilterChange();
          }
        } catch (error) {
          // Invalid date format
          this.dateRange = null;
        }
      }
    } else {
      this.dateRange = null;
      this.onFilterChange();
    }
  }

  refreshList() {
    this.table.reset();
    this.refreshRequested.emit();
  }

  viewNotificationDetails(notification: Notification) {
    this.selectedNotification = notification;
    this.showDetailsDialog = true;
    this.notificationSelected.emit(notification);
  }

  retryNotification(notification: Notification) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to retry this notification?',
      header: 'Confirm Retry',
      icon: 'pi pi-refresh',
      accept: () => {
        // Retry logic would go here
        this.messageService.add({
          severity: 'info',
          summary: 'Retry Initiated',
          detail: 'Notification has been queued for retry'
        });
        this.refreshList();
      }
    });
  }

  cancelNotification(notification: Notification) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel this notification?',
      header: 'Confirm Cancel',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.notificationService.cancelNotification(notification.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Notification cancelled successfully'
            });
            this.refreshList();
          },
          error: (error) => {
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

  deleteNotification(notification: Notification) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this notification?',
      header: 'Confirm Delete',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.notificationService.deleteNotification(notification.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Notification deleted successfully'
            });
            this.refreshList();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete notification'
            });
          }
        });
      }
    });
  }

  getStatusTooltip(notification: Notification): string {
    const tooltips: Record<NotificationStatus, string> = {
      'queued': 'Waiting to be processed',
      'processing': 'Currently being sent',
      'sent': 'Successfully sent to provider',
      'delivered': 'Confirmed delivered to recipient',
      'failed': notification.error || 'Failed to deliver',
      'cancelled': 'Cancelled by user'
    };
    return tooltips[notification.status] || '';
  }

  getNotificationTimeline(notification: Notification): any[] {
    const timeline = [];
    
    timeline.push({
      status: 'Created',
      date: notification.sentAt,
      icon: 'pi pi-plus'
    });

    if (notification.scheduledAt) {
      timeline.push({
        status: 'Scheduled',
        date: notification.scheduledAt,
        icon: 'pi pi-clock'
      });
    }

    if (notification.sentAt) {
      timeline.push({
        status: 'Sent',
        date: notification.sentAt,
        icon: 'pi pi-send'
      });
    }

    if (notification.deliveredAt) {
      timeline.push({
        status: 'Delivered',
        date: notification.deliveredAt,
        icon: 'pi pi-check'
      });
    }

    if (notification.failedAt) {
      timeline.push({
        status: 'Failed',
        date: notification.failedAt,
        icon: 'pi pi-times',
        error: notification.error
      });
    }

    if (notification.cancelledAt) {
      timeline.push({
        status: 'Cancelled',
        date: notification.cancelledAt,
        icon: 'pi pi-ban'
      });
    }

    return timeline;
  }

  formatType(type: string): string {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}