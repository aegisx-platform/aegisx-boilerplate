import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval, startWith } from 'rxjs';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';

import { MessageService } from 'primeng/api';
import { NotificationService } from '../../services/notification.service';

interface ErrorLog {
  id: number;
  notificationId: string;
  channel: string;
  type: string;
  errorMessage: string;
  errorCode?: string;
  retryable: boolean;
  occurredAt: Date;
  subject?: string;
  recipientEmail?: string;
  priority: string;
  attempts: number;
}

interface ErrorStatistics {
  date?: string;
  channel?: string;
  type?: string;
  retryable?: boolean;
  errorCount: number;
}

@Component({
  selector: 'app-notification-error-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    DialogModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="main-container">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Error Logs</h2>
          <p class="text-gray-600 mt-1">Monitor and analyze notification delivery errors</p>
        </div>
        <div class="flex gap-2">
          <p-button
            label="Refresh"
            icon="pi pi-refresh"
            [outlined]="true"
            (onClick)="loadErrorLogs()"
            [loading]="loading"
          />
          <p-button
            label="Export CSV"
            icon="pi pi-download"
            severity="success"
            (onClick)="exportErrors('csv')"
          />
          <p-button
            label="Statistics"
            icon="pi pi-chart-line"
            (onClick)="showStatistics = true"
          />
        </div>
      </div>

      <!-- Statistics Dialog -->
      <p-dialog
        header="Error Statistics"
        [(visible)]="showStatistics"
        [modal]="true"
        [draggable]="false"
        [resizable]="false"
        styleClass="w-11/12 max-w-6xl"
      >
        <div class="p-4">
          <p class="text-center text-gray-500">Error statistics charts will be available in future updates.</p>
          <div class="flex justify-center mt-4">
            <p-button
              label="Close"
              (onClick)="showStatistics = false"
            />
          </div>
        </div>
      </p-dialog>

      <!-- Error Metrics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Total Errors</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ totalRecords }}</div>
            </div>
            <div class="p-2 bg-red-50 rounded-lg">
              <i class="pi pi-exclamation-triangle text-red-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-info-circle text-gray-400 mr-1"></i>
            All time
          </div>
        </div>

        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Recent Errors</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ errorLogs.length }}</div>
            </div>
            <div class="p-2 bg-orange-50 rounded-lg">
              <i class="pi pi-clock text-orange-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-calendar text-blue-500 mr-1"></i>
            {{ dateRange ? 'Last ' + dateRange + ' days' : 'All time' }}
          </div>
        </div>

        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Retryable</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ getRetryableCount() }}</div>
            </div>
            <div class="p-2 bg-green-50 rounded-lg">
              <i class="pi pi-refresh text-green-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-arrow-right text-green-500 mr-1"></i>
            Can be retried
          </div>
        </div>

        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Failed</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ getNonRetryableCount() }}</div>
            </div>
            <div class="p-2 bg-red-50 rounded-lg">
              <i class="pi pi-times-circle text-red-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-times text-red-500 mr-1"></i>
            Permanent failures
          </div>
        </div>
      </div>

      <!-- Filters -->
      <p-card styleClass="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search errors..."
              [(ngModel)]="searchTerm"
              (input)="onFilterChange()"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Show Recent</label>
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              [(ngModel)]="dateRange"
              (change)="onFilterChange()"
            >
              <option value="1">Last 24 Hours</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="">All Time</option>
            </select>
          </div>

          <div class="flex items-end">
            <p-button
              label="Clear Filters"
              icon="pi pi-filter-slash"
              [outlined]="true"
              (onClick)="clearFilters()"
              styleClass="w-full"
            />
          </div>
        </div>
      </p-card>

      <!-- Error Logs Table -->
      <p-card>
        <p-table
          [value]="errorLogs"
          [loading]="loading"
          [paginator]="true"
          [rows]="50"
          [totalRecords]="totalRecords"
          [lazy]="true"
          (onLazyLoad)="onLazyLoad($event)"
          [rowHover]="true"
          styleClass="p-datatable-sm"
          responsiveLayout="scroll"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="occurredAt">
                Occurred At
                <p-sortIcon field="occurredAt" />
              </th>
              <th pSortableColumn="channel">
                Channel
                <p-sortIcon field="channel" />
              </th>
              <th pSortableColumn="type">
                Type
                <p-sortIcon field="type" />
              </th>
              <th>Error Message</th>
              <th>Error Code</th>
              <th>Recipient</th>
              <th pSortableColumn="retryable">
                Retryable
                <p-sortIcon field="retryable" />
              </th>
              <th>Attempts</th>
              <th>Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-error>
            <tr>
              <td>
                <span class="text-sm">
                  {{ error.occurredAt | date:'medium' }}
                </span>
              </td>
              <td>
                <p-tag
                  [value]="error.channel"
                  [severity]="getChannelSeverity(error.channel)"
                />
              </td>
              <td>
                <span class="text-sm font-medium">{{ error.type }}</span>
              </td>
              <td>
                <span
                  class="text-sm cursor-pointer hover:text-blue-600"
                  [title]="error.errorMessage"
                  (click)="showErrorDetails(error)"
                >
                  {{ truncateText(error.errorMessage, 50) }}
                </span>
              </td>
              <td>
                <p-tag
                  *ngIf="error.errorCode"
                  [value]="error.errorCode"
                  severity="danger"
                />
                <span *ngIf="!error.errorCode" class="text-gray-400">-</span>
              </td>
              <td>
                <span class="text-sm">{{ error.recipientEmail || '-' }}</span>
              </td>
              <td>
                <i
                  class="pi"
                  [ngClass]="{
                    'pi-check-circle text-green-500': error.retryable,
                    'pi-times-circle text-red-500': !error.retryable
                  }"
                  [title]="error.retryable ? 'Retryable' : 'Non-retryable'"
                ></i>
              </td>
              <td>
                <span class="text-sm">{{ error.attempts }}</span>
              </td>
              <td>
                <div class="flex gap-2">
                  <p-button
                    icon="pi pi-eye"
                    [outlined]="true"
                    size="small"
                    (onClick)="showErrorDetails(error)"
                    pTooltip="View Details"
                  />
                  <p-button
                    icon="pi pi-external-link"
                    [outlined]="true"
                    size="small"
                    (onClick)="viewNotification(error.notificationId)"
                    pTooltip="View Notification"
                  />
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="9" class="text-center py-8">
                <div class="text-gray-500">
                  <i class="pi pi-info-circle text-3xl mb-2 block"></i>
                  <p class="text-lg">No error logs found</p>
                  <p class="text-sm">Try adjusting your filters or date range</p>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Error Details Dialog -->
      <p-dialog
        header="Error Details"
        [(visible)]="showErrorDetail"
        [modal]="true"
        [draggable]="false"
        [resizable]="false"
        styleClass="w-11/12 max-w-4xl"
      >
        <div *ngIf="selectedError" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Error ID</label>
              <p class="text-sm font-mono bg-gray-100 p-2 rounded">{{ selectedError.id }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notification ID</label>
              <p class="text-sm font-mono bg-gray-100 p-2 rounded">{{ selectedError.notificationId }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <p-tag [value]="selectedError.channel" [severity]="getChannelSeverity(selectedError.channel)" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <p class="text-sm">{{ selectedError.type }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Occurred At</label>
              <p class="text-sm">{{ selectedError.occurredAt | date:'full' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Retryable</label>
              <p-tag
                [value]="selectedError.retryable ? 'Yes' : 'No'"
                [severity]="selectedError.retryable ? 'success' : 'danger'"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Error Message</label>
            <div class="bg-red-50 border border-red-200 rounded p-3">
              <p class="text-sm text-red-800 whitespace-pre-wrap">{{ selectedError.errorMessage }}</p>
            </div>
          </div>

          <div *ngIf="selectedError.errorCode">
            <label class="block text-sm font-medium text-gray-700 mb-1">Error Code</label>
            <p-tag [value]="selectedError.errorCode" severity="danger" />
          </div>

          <div *ngIf="selectedError.recipientEmail">
            <label class="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
            <p class="text-sm">{{ selectedError.recipientEmail }}</p>
          </div>

          <div *ngIf="selectedError.subject">
            <label class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <p class="text-sm">{{ selectedError.subject }}</p>
          </div>

          <div class="flex gap-2 pt-4 border-t">
            <p-button
              label="View Notification"
              icon="pi pi-external-link"
              (onClick)="viewNotification(selectedError.notificationId)"
            />
            <p-button
              label="Close"
              [outlined]="true"
              (onClick)="showErrorDetail = false"
            />
          </div>
        </div>
      </p-dialog>

      <p-toast />
    </div>
  `
})
export class NotificationErrorLogsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  errorLogs: ErrorLog[] = [];
  totalRecords = 0;
  loading = false;

  // Filters
  searchTerm = '';
  dateRange = '7';

  // Pagination
  first = 0;
  rows = 50;

  // Dialogs
  showStatistics = false;
  showErrorDetail = false;
  selectedError: ErrorLog | null = null;

  constructor(
    private notificationService: NotificationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadErrorLogs();

    // Auto-refresh every 30 seconds
    interval(30000)
      .pipe(startWith(0), takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.loading) {
          this.loadErrorLogs();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadErrorLogs() {
    this.loading = true;

    const params: any = {
      limit: this.rows,
      offset: this.first
    };

    // Apply date range filter
    if (this.dateRange) {
      const days = parseInt(this.dateRange);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      params.dateFrom = dateFrom.toISOString();
    }

    this.notificationService.getErrorLogs(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.errorLogs = response.data.errors;
          this.totalRecords = response.data.count;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load error logs:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load error logs'
        });
        this.loading = false;
      }
    });
  }


  onFilterChange() {
    this.first = 0;
    this.loadErrorLogs();
  }

  onLazyLoad(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.loadErrorLogs();
  }

  clearFilters() {
    this.searchTerm = '';
    this.dateRange = '7';
    this.first = 0;
    this.loadErrorLogs();
  }

  showErrorDetails(error: ErrorLog) {
    this.selectedError = error;
    this.showErrorDetail = true;
  }

  viewNotification(notificationId: string) {
    // Navigate to notification details or open in new tab
    window.open(`/notifications?id=${notificationId}`, '_blank');
  }

  exportErrors(format: 'csv' | 'json') {
    const params: any = { format };

    // Apply current date range filter to export
    if (this.dateRange) {
      const days = parseInt(this.dateRange);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      params.dateFrom = dateFrom.toISOString();
    }

    this.notificationService.exportErrors(params).subscribe({
      next: (response) => {
        // Create download link
        const blob = new Blob([response], { 
          type: format === 'csv' ? 'text/csv' : 'application/json' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `notification_errors_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Error logs exported as ${format.toUpperCase()}`
        });
      },
      error: (error) => {
        console.error('Failed to export errors:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to export error logs'
        });
      }
    });
  }

  getChannelSeverity(channel: string): string {
    const severityMap: { [key: string]: string } = {
      'email': 'info',
      'sms': 'success',
      'push': 'warning',
      'slack': 'help',
      'webhook': 'secondary',
      'in-app': 'contrast'
    };
    return severityMap[channel] || 'info';
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  getRetryableCount(): number {
    return this.errorLogs.filter(error => error.retryable).length;
  }

  getNonRetryableCount(): number {
    return this.errorLogs.filter(error => !error.retryable).length;
  }

}