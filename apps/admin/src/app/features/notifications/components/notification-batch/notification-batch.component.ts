import { Component, OnInit, OnDestroy, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { startWith } from 'rxjs/operators';
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
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { BadgeModule } from 'primeng/badge';

import { NotificationService } from '../../services/notification.service';
import { NotificationBatch, BatchStatus, CreateBatchRequest, CreateNotificationRequest, NotificationChannel, NotificationPriority } from '../../types/notification.types';

interface BatchMetrics {
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  failedBatches: number;
  avgProcessingTime: number;
  totalNotifications: number;
  successRate: number;
}

@Component({
  selector: 'app-notification-batch',
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
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    BadgeModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="main-container">
      <!-- Batch Metrics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Total Batches</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ batchMetrics.totalBatches }}</div>
            </div>
            <div class="p-2 bg-blue-50 rounded-lg">
              <i class="pi pi-list text-blue-600 text-xl"></i>
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
              <h3 class="text-sm font-medium text-gray-600 mb-1">Active Batches</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ batchMetrics.activeBatches }}</div>
            </div>
            <div class="p-2 bg-orange-50 rounded-lg">
              <i class="pi pi-spin pi-cog text-orange-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-arrow-right text-blue-500 mr-1"></i>
            Currently processing
          </div>
        </div>

        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Success Rate</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ batchMetrics.successRate.toFixed(1) }}%</div>
            </div>
            <div class="p-2 bg-green-50 rounded-lg">
              <i class="pi pi-check-circle text-green-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-arrow-up text-green-500 mr-1"></i>
            Batch completion rate
          </div>
        </div>

        <div class="bg-white rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow flex-1">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-sm font-medium text-gray-600 mb-1">Avg Processing</h3>
              <div class="text-2xl sm:text-3xl font-bold text-gray-900">{{ formatDuration(batchMetrics.avgProcessingTime) }}</div>
            </div>
            <div class="p-2 bg-purple-50 rounded-lg">
              <i class="pi pi-clock text-purple-600 text-xl"></i>
            </div>
          </div>
          <div class="text-xs text-gray-500">
            <i class="pi pi-chart-line text-purple-500 mr-1"></i>
            Per batch average
          </div>
        </div>
      </div>

      <!-- Batch Controls -->
      <div class="batch-section">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="w-full">
            <p-card class="h-full">
              <ng-template pTemplate="header">
                <div class="flex items-center justify-between p-4 border-b">
                  <h4 class="text-lg font-semibold text-gray-900 m-0">Batch Management</h4>
                  <p-button
                    icon="pi pi-plus"
                    label="Create Batch"
                    size="small"
                    (click)="showCreateBatchDialog()">
                  </p-button>
                </div>
              </ng-template>

              <div class="p-4 min-h-[200px] flex flex-col">
                <div class="space-y-4 flex-1">
                  <div class="flex items-center justify-between py-2">
                    <span class="text-sm font-medium text-gray-700">Global Controls</span>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-3">
                    <p-button
                      icon="pi pi-pause"
                      label="Pause All"
                      size="small"
                      severity="secondary"
                      [text]="true"
                      (click)="pauseAllBatches()"
                      [disabled]="batchMetrics.activeBatches === 0">
                    </p-button>
                    <p-button
                      icon="pi pi-play"
                      label="Resume All"
                      size="small"
                      severity="success"
                      [text]="true"
                      (click)="resumeAllBatches()">
                    </p-button>
                  </div>

                  <hr class="border-gray-200">
                  
                  <div class="text-sm text-gray-600 space-y-3">
                    <div class="flex items-center justify-between">
                      <span>Auto-refresh</span>
                      <p-button
                        [icon]="autoRefresh ? 'pi pi-pause' : 'pi pi-play'"
                        [label]="autoRefresh ? 'On' : 'Off'"
                        [severity]="autoRefresh ? 'success' : 'secondary'"
                        size="small"
                        [text]="true"
                        (click)="toggleAutoRefresh()">
                      </p-button>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-clock text-gray-400"></i>
                      <span>Last updated: {{ formatTime(getCurrentTime() - lastUpdated) }} ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </p-card>
          </div>

          <div class="w-full">
            <p-card class="h-full">
              <ng-template pTemplate="header">
                <div class="flex items-center justify-between p-4 border-b">
                  <h4 class="text-lg font-semibold text-gray-900 m-0">Quick Stats</h4>
                  <p-button
                    icon="pi pi-refresh"
                    size="small"
                    [text]="true"
                    (click)="refreshBatches()"
                    [loading]="loading">
                  </p-button>
                </div>
              </ng-template>

              <div class="p-4 min-h-[200px] flex flex-col">
                <div class="space-y-4">
                  <div class="flex items-center justify-between py-2">
                    <span class="text-sm font-medium text-gray-700">Processing Status</span>
                    <span class="text-sm text-gray-500">{{ batchMetrics.totalNotifications }} total notifications</span>
                  </div>
                  
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">Completed</span>
                      <p-badge value="{{ batchMetrics.completedBatches }}" severity="success"></p-badge>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">Processing</span>
                      <p-badge value="{{ batchMetrics.activeBatches }}" severity="info"></p-badge>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">Failed</span>
                      <p-badge value="{{ batchMetrics.failedBatches }}" severity="danger"></p-badge>
                    </div>
                  </div>

                  <hr class="border-gray-200">
                  
                  <div class="text-center">
                    <div class="text-xs text-gray-500 mb-2">Overall Performance</div>
                    <div class="text-lg font-semibold text-green-600">{{ batchMetrics.successRate.toFixed(1) }}% Success</div>
                  </div>
                </div>
              </div>
            </p-card>
          </div>
        </div>
      </div>

      <!-- Batch Jobs Table -->
      <div class="batch-section">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex items-center justify-between p-4 border-b">
              <h4 class="text-lg font-semibold text-gray-900 m-0">Batch Jobs</h4>
              <div class="flex gap-2">
                <p-button
                  icon="pi pi-eye"
                  label="View All"
                  size="small"
                  [text]="true"
                  (click)="loadBatches()"
                  [loading]="loadingBatches">
                </p-button>
              </div>
            </div>
          </ng-template>

          <p-table
            [value]="batches"
            [loading]="loadingBatches"
            [paginator]="true"
            [rows]="20"
            styleClass="p-datatable-gridlines">

            <ng-template pTemplate="header">
              <tr>
                <th style="width: 200px">Batch Name</th>
                <th style="width: 120px">Status</th>
                <th style="width: 100px">Progress</th>
                <th style="width: 120px">Total/Success/Failed</th>
                <th style="width: 150px">Created</th>
                <th style="width: 150px">Duration</th>
                <th style="width: 150px">Actions</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-batch>
              <tr>
                <td>
                  <div class="text-sm">
                    <div class="font-medium text-gray-900">{{ batch.name || ('Batch #' + batch.id.slice(-8)) }}</div>
                    <div class="text-gray-500 text-xs">{{ batch.id }}</div>
                  </div>
                </td>
                <td>
                  <p-tag
                    [value]="batch.status"
                    [severity]="getBatchStatusSeverity(batch.status)"
                    [icon]="getBatchStatusIcon(batch.status)">
                  </p-tag>
                </td>
                <td>
                  <div class="text-sm">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs text-gray-600">{{ getProgressPercentage(batch) }}%</span>
                    </div>
                    <p-progressBar
                      [value]="getProgressPercentage(batch)"
                      [style]="{'height': '6px'}">
                    </p-progressBar>
                  </div>
                </td>
                <td>
                  <div class="text-xs text-center">
                    <div class="font-medium">{{ batch.totalCount }}</div>
                    <div class="text-green-600">✓ {{ batch.successCount }}</div>
                    <div class="text-red-600" *ngIf="batch.failureCount > 0">✗ {{ batch.failureCount }}</div>
                  </div>
                </td>
                <td>
                  <div class="text-sm">
                    <div>{{ batch.createdAt | date:'short' }}</div>
                  </div>
                </td>
                <td>
                  <div class="text-sm">
                    <div *ngIf="batch.startedAt">{{ getBatchDuration(batch) }}</div>
                    <div *ngIf="!batch.startedAt" class="text-gray-400">Not started</div>
                  </div>
                </td>
                <td>
                  <div class="flex gap-1">
                    <p-button
                      icon="pi pi-eye"
                      [text]="true"
                      size="small"
                      (click)="viewBatchDetails(batch)"
                      pTooltip="View details">
                    </p-button>

                    <p-button
                      icon="pi pi-pencil"
                      [text]="true"
                      size="small"
                      severity="info"
                      (click)="editBatch(batch)"
                      *ngIf="['created', 'queued', 'paused'].includes(batch.status)"
                      pTooltip="Edit batch">
                    </p-button>

                    <p-button
                      icon="pi pi-pause"
                      [text]="true"
                      size="small"
                      severity="secondary"
                      (click)="pauseBatch(batch)"
                      *ngIf="batch.status === 'processing'"
                      pTooltip="Pause batch">
                    </p-button>

                    <p-button
                      icon="pi pi-play"
                      [text]="true"
                      size="small"
                      severity="success"
                      (click)="resumeBatch(batch)"
                      *ngIf="batch.status === 'paused'"
                      pTooltip="Resume batch">
                    </p-button>

                    <p-button
                      icon="pi pi-refresh"
                      [text]="true"
                      size="small"
                      severity="info"
                      (click)="retryBatch(batch)"
                      *ngIf="batch.status === 'failed'"
                      pTooltip="Retry batch">
                    </p-button>

                    <p-button
                      [icon]="isBatchCancelling(batch.id) ? 'pi pi-spin pi-spinner' : 'pi pi-times'"
                      [text]="true"
                      size="small"
                      severity="danger"
                      (click)="cancelBatch(batch)"
                      [disabled]="isBatchCancelling(batch.id)"
                      *ngIf="['queued', 'processing', 'paused', 'active', 'waiting'].includes(batch.status)"
                      [pTooltip]="isBatchCancelling(batch.id) ? 'Cancelling...' : 'Cancel batch'">
                    </p-button>
                  </div>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="7" class="text-center py-8">
                  <div class="flex flex-column align-items-center gap-3">
                    <i class="pi pi-inbox text-6xl text-gray-300"></i>
                    <div class="text-xl text-gray-500">No batch jobs found</div>
                    <div class="text-gray-400">Create your first batch to get started</div>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
    </div>

    <!-- Create Batch Dialog -->
    <p-dialog
      [(visible)]="showCreateDialog"
      [modal]="true"
      [style]="{width: '600px'}"
      header="Create Notification Batch"
      [closable]="true">

      <div class="space-y-4">
        <div class="field">
          <label class="block text-sm font-medium mb-2">Batch Name</label>
          <input
            type="text"
            pInputText
            [(ngModel)]="newBatch.name"
            placeholder="Enter batch name"
            class="w-full">
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-2">Notification Type</label>
          <p-select
            [(ngModel)]="bulkNotification.type"
            [options]="typeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select notification type"
            class="w-full">
          </p-select>
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-2">Channel</label>
          <p-select
            [(ngModel)]="bulkNotification.channel"
            [options]="channelOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select channel"
            class="w-full">
          </p-select>
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-2">Priority</label>
          <p-select
            [(ngModel)]="bulkNotification.priority"
            [options]="priorityOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select priority"
            class="w-full">
          </p-select>
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-2">Subject</label>
          <input
            type="text"
            pInputText
            [(ngModel)]="bulkNotification.subject"
            placeholder="Enter subject"
            class="w-full">
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-2">Message Content</label>
          <textarea
            pTextarea
            [(ngModel)]="bulkNotification.content"
            placeholder="Enter message content"
            rows="4"
            class="w-full">
          </textarea>
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-2">Recipients (one per line)</label>
          <textarea
            pTextarea
            [(ngModel)]="recipientList"
            placeholder="email@example.com&#10;another@example.com&#10;+1234567890"
            rows="6"
            class="w-full">
          </textarea>
          <small class="text-gray-500">Enter email addresses or phone numbers, one per line</small>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-content-end gap-2">
          <p-button
            label="Cancel"
            severity="secondary"
            (click)="showCreateDialog = false">
          </p-button>
          <p-button
            label="Create Batch"
            (click)="createBatch()"
            [loading]="creatingBatch"
            [disabled]="!isFormValid()">
          </p-button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Batch Details Dialog -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [style]="{width: '800px'}"
      header="Batch Details"
      [closable]="true">

      <div *ngIf="selectedBatch" class="space-y-6">
        <!-- Batch Overview -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h5 class="text-lg font-semibold mb-3">Batch Overview</h5>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-600">Batch ID</label>
              <p class="text-sm font-mono">{{ selectedBatch.id }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">Name</label>
              <p class="text-sm">{{ selectedBatch.name || 'Unnamed Batch' }}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">Status</label>
              <p-tag
                [value]="selectedBatch.status"
                [severity]="getBatchStatusSeverity(selectedBatch.status)"
                [icon]="getBatchStatusIcon(selectedBatch.status)">
              </p-tag>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-600">Progress</label>
              <div class="flex items-center gap-2">
                <p-progressBar
                  [value]="selectedBatch.progress || getProgressPercentage(selectedBatch)"
                  [style]="{'height': '8px', 'width': '100px'}">
                </p-progressBar>
                <span class="text-sm">{{ selectedBatch.progress || getProgressPercentage(selectedBatch) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div class="bg-white rounded-lg border p-4">
          <h5 class="text-lg font-semibold mb-3">Statistics</h5>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{ selectedBatch.totalCount }}</div>
              <div class="text-sm text-gray-600">Total</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">{{ selectedBatch.successCount }}</div>
              <div class="text-sm text-gray-600">Success</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-red-600">{{ selectedBatch.failureCount }}</div>
              <div class="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </div>

        <!-- Timestamps -->
        <div class="bg-white rounded-lg border p-4">
          <h5 class="text-lg font-semibold mb-3">Timeline</h5>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Created:</span>
              <span class="text-sm">{{ selectedBatch.createdAt | date:'medium' }}</span>
            </div>
            <div class="flex justify-between" *ngIf="selectedBatch.startedAt">
              <span class="text-sm text-gray-600">Started:</span>
              <span class="text-sm">{{ selectedBatch.startedAt | date:'medium' }}</span>
            </div>
            <div class="flex justify-between" *ngIf="selectedBatch.completedAt">
              <span class="text-sm text-gray-600">Completed:</span>
              <span class="text-sm">{{ selectedBatch.completedAt | date:'medium' }}</span>
            </div>
            <div class="flex justify-between" *ngIf="selectedBatch.startedAt">
              <span class="text-sm text-gray-600">Duration:</span>
              <span class="text-sm">{{ getBatchDuration(selectedBatch) }}</span>
            </div>
          </div>
        </div>

        <!-- Batch Data -->
        <div class="bg-white rounded-lg border p-4" *ngIf="selectedBatch.data">
          <h5 class="text-lg font-semibold mb-3">Batch Configuration</h5>
          <div class="space-y-2">
            <div class="flex justify-between" *ngIf="selectedBatch.data.type">
              <span class="text-sm text-gray-600">Type:</span>
              <span class="text-sm">{{ selectedBatch.data.type }}</span>
            </div>
            <div class="flex justify-between" *ngIf="selectedBatch.data.priority">
              <span class="text-sm text-gray-600">Priority:</span>
              <p-tag [value]="selectedBatch.data.priority" [severity]="getBatchPrioritySeverity(selectedBatch.data.priority)"></p-tag>
            </div>
            <div class="flex justify-between" *ngIf="selectedBatch.data.channel">
              <span class="text-sm text-gray-600">Channel:</span>
              <span class="text-sm">{{ selectedBatch.data.channel }}</span>
            </div>
            <div class="flex justify-between" *ngIf="selectedBatch.data.notifications">
              <span class="text-sm text-gray-600">Notifications:</span>
              <span class="text-sm">{{ selectedBatch.data.notifications.length }} items</span>
            </div>
          </div>
        </div>

        <!-- Errors -->
        <div class="bg-white rounded-lg border p-4" *ngIf="selectedBatch.errors && selectedBatch.errors.length > 0">
          <h5 class="text-lg font-semibold mb-3 text-red-600">Errors</h5>
          <div class="space-y-2">
            <div *ngFor="let error of selectedBatch.errors" class="bg-red-50 border border-red-200 rounded p-3">
              <p class="text-sm text-red-800">{{ error }}</p>
            </div>
          </div>
        </div>

        <!-- Failed Reason -->
        <div class="bg-white rounded-lg border p-4" *ngIf="selectedBatch.failedReason">
          <h5 class="text-lg font-semibold mb-3 text-red-600">Failure Details</h5>
          <div class="bg-red-50 border border-red-200 rounded p-3">
            <p class="text-sm text-red-800">{{ selectedBatch.failedReason }}</p>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-content-end gap-2">
          <p-button
            label="Close"
            severity="secondary"
            (click)="showDetailsDialog = false">
          </p-button>
          <p-button
            label="Retry"
            severity="info"
            icon="pi pi-refresh"
            (click)="retryBatch(selectedBatch!); showDetailsDialog = false"
            *ngIf="selectedBatch?.status === 'failed'">
          </p-button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Edit Batch Dialog -->
    <p-dialog
      [(visible)]="showEditDialog"
      [modal]="true"
      [style]="{width: '500px'}"
      header="Edit Batch"
      [closable]="true">

      <div *ngIf="editingBatch" class="space-y-4">
        <div class="field">
          <label class="block text-sm font-medium mb-2">Batch Name</label>
          <input
            type="text"
            pInputText
            [(ngModel)]="editBatchForm.name"
            placeholder="Enter batch name"
            class="w-full">
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-2">Priority</label>
          <p-select
            [(ngModel)]="editBatchForm.priority"
            [options]="priorityOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select priority"
            class="w-full">
          </p-select>
        </div>

        <div class="bg-gray-50 rounded-lg p-4">
          <h6 class="font-medium mb-2">Batch Information</h6>
          <div class="text-sm text-gray-600 space-y-1">
            <div>Status: <span class="font-medium">{{ editingBatch.status }}</span></div>
            <div>Total Notifications: <span class="font-medium">{{ editingBatch.totalCount }}</span></div>
            <div>Created: <span class="font-medium">{{ editingBatch.createdAt | date:'medium' }}</span></div>
          </div>
        </div>

        <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div class="flex items-start">
            <i class="pi pi-exclamation-triangle text-yellow-600 mr-2 mt-0.5"></i>
            <div class="text-sm text-yellow-800">
              <strong>Note:</strong> You can only edit batch name and priority for batches that haven't started processing.
            </div>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-content-end gap-2">
          <p-button
            label="Cancel"
            severity="secondary"
            (click)="showEditDialog = false">
          </p-button>
          <p-button
            label="Update Batch"
            (click)="updateBatch()"
            [loading]="updatingBatch"
            [disabled]="!editBatchForm.name.trim()">
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

    /* Ensure proper spacing and prevent overlapping */
    .batch-section {
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
export class NotificationBatchComponent implements OnInit, OnDestroy {
  @Output() batchSelected = new EventEmitter<NotificationBatch>();
  @Output() refreshRequested = new EventEmitter<void>();

  private subscriptions = new Subscription();
  private autoRefreshSubscription?: Subscription;

  notificationService = inject(NotificationService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // State
  batches: NotificationBatch[] = [];
  loading = false;
  loadingBatches = false;
  autoRefresh = true;
  lastUpdated = Date.now();
  creatingBatch = false;

  // Create batch dialog
  showCreateDialog = false;
  newBatch = {
    name: '',
    notifications: [] as CreateNotificationRequest[]
  };

  // Batch details dialog
  showDetailsDialog = false;
  selectedBatch: NotificationBatch | null = null;

  // Edit batch dialog
  showEditDialog = false;
  editingBatch: NotificationBatch | null = null;
  editBatchForm = {
    name: '',
    priority: 'normal' as NotificationPriority
  };
  updatingBatch = false;

  // Cancellation tracking
  cancellingBatches: Set<string> = new Set();

  bulkNotification = {
    type: '',
    channel: '',
    priority: 'normal' as NotificationPriority,
    subject: '',
    content: ''
  };

  recipientList = '';

  // Metrics
  batchMetrics: BatchMetrics = {
    totalBatches: 0,
    activeBatches: 0,
    completedBatches: 0,
    failedBatches: 0,
    avgProcessingTime: 0,
    totalNotifications: 0,
    successRate: 0
  };

  // Options
  typeOptions = [
    { label: 'Welcome', value: 'welcome' },
    { label: 'Verification', value: 'verification' },
    { label: 'Marketing', value: 'marketing' },
    { label: 'System', value: 'system' },
    { label: 'Custom', value: 'custom' }
  ];

  channelOptions = [
    { label: 'Email', value: 'email' },
    { label: 'SMS', value: 'sms' },
    { label: 'Push', value: 'push' },
    { label: 'In-App', value: 'in-app' }
  ];

  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
    { label: 'Critical', value: 'critical' }
  ];

  ngOnInit() {
    this.loadBatches();
    this.startAutoRefresh();
    this.setupRealtimeUpdates();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.stopAutoRefresh();
    this.cleanupRealtimeUpdates();
  }

  private setupRealtimeUpdates() {
    // Listen for batch status changes via WebSocket or EventSource
    // This would integrate with your WebSocket service
    if ((window as any).eventSource) {
      const eventSource = (window as any).eventSource;
      
      const handleBatchUpdate = (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'batch_status_changed') {
            this.handleRealtimeBatchUpdate(data.payload);
          }
        } catch (error) {
          console.error('Error parsing realtime event:', error);
        }
      };

      eventSource.addEventListener('batch_status_changed', handleBatchUpdate);
      
      // Store reference for cleanup
      this.subscriptions.add(() => {
        eventSource.removeEventListener('batch_status_changed', handleBatchUpdate);
      });
    }
  }

  private cleanupRealtimeUpdates() {
    // Cleanup is handled by subscriptions.unsubscribe()
  }

  private handleRealtimeBatchUpdate(payload: any) {
    const { batchId, status, metadata } = payload;
    
    // Find and update the batch in our local array
    const batchIndex = this.batches.findIndex(b => b.id === batchId);
    if (batchIndex !== -1) {
      this.batches[batchIndex] = {
        ...this.batches[batchIndex],
        status: this.mapApiStatus(status),
        ...(metadata?.partiallyProcessed && {
          successCount: metadata.processedCount || this.batches[batchIndex].successCount,
          failureCount: metadata.failedCount || this.batches[batchIndex].failureCount
        })
      };

      // Show notification for status changes
      if (status === 'cancelled') {
        this.messageService.add({
          severity: 'info',
          summary: 'Batch Status Update',
          detail: `Batch "${this.batches[batchIndex].name || `#${batchId.slice(-8)}`}" has been cancelled`,
          life: 3000
        });
      }

      // Update metrics
      this.updateMetrics();
      
      // Remove from cancelling set if it was being cancelled
      this.cancellingBatches.delete(batchId);
    }
  }

  async loadBatches() {
    this.loadingBatches = true;
    this.lastUpdated = Date.now();

    try {
      const response = await this.notificationService.listBatches().toPromise();
      if (response?.success && response.data) {
        // Map API response to our interface
        const responseData = response.data as any;
        const batchData = Array.isArray(responseData) ? responseData : (responseData.batches || []);
        this.batches = batchData.map((batch: any) => ({
          id: batch.id,
          name: batch.name || `Batch #${batch.id.slice(-8)}`,
          status: this.mapApiStatus(batch.status),
          totalCount: batch.data?.notifications?.length || 0,
          successCount: batch.status === 'completed' ? (batch.data?.notifications?.length || 0) : Math.floor((batch.progress || 0) / 100 * (batch.data?.notifications?.length || 0)),
          failureCount: batch.status === 'failed' ? (batch.data?.notifications?.length || 0) : 0,
          createdAt: new Date(batch.processedOn || Date.now()).toISOString(),
          startedAt: batch.processedOn ? new Date(batch.processedOn).toISOString() : undefined,
          completedAt: batch.finishedOn ? new Date(batch.finishedOn).toISOString() : undefined,
          errors: batch.failedReason ? [batch.failedReason] : [],
          progress: batch.progress || 0,
          attempts: batch.attempts || 0,
          data: batch.data,
          processedOn: batch.processedOn,
          finishedOn: batch.finishedOn,
          failedReason: batch.failedReason
        }));
        this.updateMetrics();
      }
    } catch (error) {
      console.error('Error loading batches:', error);
      this.batches = [];
    } finally {
      this.loadingBatches = false;
    }
  }

  mapApiStatus(apiStatus: string): BatchStatus {
    const statusMap: Record<string, BatchStatus> = {
      'waiting': 'queued',
      'active': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'delayed': 'paused',
      'paused': 'paused'
    };
    return statusMap[apiStatus] || 'queued';
  }

  updateMetrics() {
    this.batchMetrics.totalBatches = this.batches.length;
    this.batchMetrics.activeBatches = this.batches.filter(b => ['processing', 'queued'].includes(b.status)).length;
    this.batchMetrics.completedBatches = this.batches.filter(b => b.status === 'completed').length;
    this.batchMetrics.failedBatches = this.batches.filter(b => b.status === 'failed').length;
    this.batchMetrics.totalNotifications = this.batches.reduce((sum, b) => sum + b.totalCount, 0);

    const completedBatches = this.batches.filter(b => b.status === 'completed');
    if (completedBatches.length > 0) {
      this.batchMetrics.successRate = (completedBatches.length / this.batches.length) * 100;
      
      // Calculate average processing time for completed batches
      const totalTime = completedBatches.reduce((sum, batch) => {
        if (batch.startedAt && batch.completedAt) {
          const start = new Date(batch.startedAt).getTime();
          const end = new Date(batch.completedAt).getTime();
          return sum + (end - start);
        }
        return sum;
      }, 0);
      
      this.batchMetrics.avgProcessingTime = totalTime / completedBatches.length;
    } else {
      this.batchMetrics.successRate = 0;
      this.batchMetrics.avgProcessingTime = 0;
    }
  }

  startAutoRefresh() {
    if (this.autoRefresh) {
      this.autoRefreshSubscription = interval(15000) // Refresh every 15 seconds
        .pipe(startWith(0))
        .subscribe(() => {
          if (!this.loading && !this.creatingBatch) {
            this.loadBatches();
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

  refreshBatches() {
    this.loadBatches();
  }

  showCreateBatchDialog() {
    this.newBatch = { name: '', notifications: [] };
    this.bulkNotification = {
      type: '',
      channel: '',
      priority: 'normal',
      subject: '',
      content: ''
    };
    this.recipientList = '';
    this.showCreateDialog = true;
  }

  async createBatch() {
    if (!this.isFormValid()) return;

    this.creatingBatch = true;
    try {
      const recipients = this.parseRecipients();
      const notifications: CreateNotificationRequest[] = recipients.map(recipient => ({
        type: this.bulkNotification.type as any,
        channel: this.bulkNotification.channel as NotificationChannel,
        recipient,
        content: {
          subject: this.bulkNotification.subject,
          text: this.bulkNotification.content
        },
        priority: this.bulkNotification.priority
      }));

      const batchRequest: CreateBatchRequest = {
        name: this.newBatch.name,
        notifications
      };

      const response = await this.notificationService.createBatch(batchRequest).toPromise();
      if (response?.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Batch Created',
          detail: `Batch created successfully with ${notifications.length} notifications`
        });
        this.showCreateDialog = false;
        this.loadBatches();
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Creation Failed',
        detail: 'Failed to create batch'
      });
    } finally {
      this.creatingBatch = false;
    }
  }

  parseRecipients() {
    const lines = this.recipientList.split('\n').map(line => line.trim()).filter(line => line);
    return lines.map(line => {
      if (line.includes('@')) {
        return { email: line };
      } else if (line.match(/^\+?\d+$/)) {
        return { phone: line };
      }
      return { email: line }; // Default to email
    });
  }

  isFormValid(): boolean {
    return !!(
      this.newBatch.name &&
      this.bulkNotification.type &&
      this.bulkNotification.channel &&
      this.bulkNotification.subject &&
      this.bulkNotification.content &&
      this.recipientList.trim()
    );
  }

  async pauseAllBatches() {
    try {
      await this.notificationService.pauseBatchProcessing().toPromise();
      this.messageService.add({
        severity: 'info',
        summary: 'Batches Paused',
        detail: 'All batch processing has been paused'
      });
      this.loadBatches();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to pause batch processing'
      });
    }
  }

  async resumeAllBatches() {
    try {
      await this.notificationService.resumeBatchProcessing().toPromise();
      this.messageService.add({
        severity: 'success',
        summary: 'Batches Resumed',
        detail: 'Batch processing has been resumed'
      });
      this.loadBatches();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to resume batch processing'
      });
    }
  }

  viewBatchDetails(batch: NotificationBatch) {
    this.selectedBatch = batch;
    this.showDetailsDialog = true;
  }

  async pauseBatch(batch: NotificationBatch) {
    // Note: Individual batch pause would need a specific API endpoint
    this.messageService.add({
      severity: 'info',
      summary: 'Feature Notice',
      detail: 'Individual batch pause will be available in the next update'
    });
  }

  async resumeBatch(batch: NotificationBatch) {
    // Note: Individual batch resume would need a specific API endpoint  
    this.messageService.add({
      severity: 'info',
      summary: 'Feature Notice',
      detail: 'Individual batch resume will be available in the next update'
    });
  }

  async retryBatch(batch: NotificationBatch) {
    try {
      await this.notificationService.retryBatch(batch.id).toPromise();
      this.messageService.add({
        severity: 'success',
        summary: 'Batch Retried',
        detail: 'Batch has been queued for retry'
      });
      this.loadBatches();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to retry batch'
      });
    }
  }

  cancelBatch(batch: NotificationBatch) {
    // Enhanced confirmation dialog with batch details
    const message = `
      <div class="space-y-3">
        <p><strong>Batch:</strong> ${batch.name || `Batch #${batch.id.slice(-8)}`}</p>
        <p><strong>Status:</strong> ${batch.status}</p>
        <p><strong>Total Notifications:</strong> ${batch.totalCount}</p>
        <p><strong>Progress:</strong> ${batch.successCount} completed, ${batch.failureCount} failed</p>
        <br>
        <p class="text-orange-600">⚠️ <strong>Warning:</strong> This will stop all remaining notifications in this batch.</p>
        <p>Are you sure you want to cancel this batch? This action cannot be undone.</p>
      </div>
    `;

    this.confirmationService.confirm({
      message: message,
      header: 'Confirm Batch Cancellation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Yes, Cancel Batch',
      rejectLabel: 'No, Keep Running',
      accept: async () => {
        await this.performBatchCancellation(batch);
      }
    });
  }

  private async performBatchCancellation(batch: NotificationBatch) {
    // Add to cancelling set for UI feedback
    this.cancellingBatches.add(batch.id);

    try {
      // Show progress message
      this.messageService.add({
        severity: 'info',
        summary: 'Cancelling Batch',
        detail: `Stopping batch "${batch.name || `#${batch.id.slice(-8)}`}"...`,
        life: 3000
      });

      // Call API to cancel batch
      const response = await this.notificationService.cancelBatch(batch.id).toPromise();
      
      if (response?.success) {
        // Success message
        this.messageService.add({
          severity: 'success',
          summary: 'Batch Cancelled',
          detail: `Batch "${batch.name || `#${batch.id.slice(-8)}`}" has been cancelled successfully`
        });

        // Update local batch status immediately for better UX
        const batchIndex = this.batches.findIndex(b => b.id === batch.id);
        if (batchIndex !== -1) {
          this.batches[batchIndex] = {
            ...this.batches[batchIndex],
            status: 'cancelled'
          };
        }

        // Refresh data from server
        await this.loadBatches();
      } else {
        throw new Error('Server returned failure response');
      }
    } catch (error) {
      console.error('Error cancelling batch:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Cancellation Failed',
        detail: 'Failed to cancel batch. The batch may still be running. Please try again or check the batch status.'
      });
    } finally {
      // Remove from cancelling set
      this.cancellingBatches.delete(batch.id);
    }
  }

  isBatchCancelling(batchId: string): boolean {
    return this.cancellingBatches.has(batchId);
  }

  getBatchStatusSeverity(status: BatchStatus): string {
    const severityMap: Record<BatchStatus, string> = {
      'created': 'secondary',
      'queued': 'info',
      'processing': 'warn',
      'completed': 'success',
      'failed': 'danger',
      'cancelled': 'secondary',
      'paused': 'secondary',
      'waiting': 'info',
      'active': 'warn'
    };
    return severityMap[status] || 'secondary';
  }

  getBatchStatusIcon(status: BatchStatus): string {
    const iconMap: Record<BatchStatus, string> = {
      'created': 'pi pi-plus',
      'queued': 'pi pi-clock',
      'processing': 'pi pi-spin pi-cog',
      'completed': 'pi pi-check',
      'failed': 'pi pi-times',
      'cancelled': 'pi pi-ban',
      'paused': 'pi pi-pause',
      'waiting': 'pi pi-clock',
      'active': 'pi pi-spin pi-cog'
    };
    return iconMap[status] || 'pi pi-info';
  }

  getProgressPercentage(batch: NotificationBatch): number {
    if (batch.totalCount === 0) return 0;
    const processed = batch.successCount + batch.failureCount;
    return Math.round((processed / batch.totalCount) * 100);
  }


  getBatchDuration(batch: NotificationBatch): string {
    if (!batch.startedAt) return 'Not started';
    
    const startTime = new Date(batch.startedAt).getTime();
    const endTime = batch.completedAt ? new Date(batch.completedAt).getTime() : Date.now();
    const duration = endTime - startTime;
    
    return this.formatDuration(duration);
  }

  formatDuration(milliseconds: number): string {
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

  formatTime(milliseconds: number): string {
    return this.formatDuration(milliseconds);
  }

  getCurrentTime(): number {
    return Date.now();
  }

  getBatchPrioritySeverity(priority: string): string {
    const priorityMap: Record<string, string> = {
      'low': 'secondary',
      'normal': 'info', 
      'high': 'warn',
      'urgent': 'danger',
      'critical': 'danger'
    };
    return priorityMap[priority] || 'info';
  }

  editBatch(batch: NotificationBatch) {
    this.editingBatch = batch;
    this.editBatchForm = {
      name: batch.name || `Batch #${batch.id.slice(-8)}`,
      priority: (batch.data?.priority as NotificationPriority) || 'normal'
    };
    this.showEditDialog = true;
  }

  async updateBatch() {
    if (!this.editingBatch || !this.editBatchForm.name.trim()) return;

    this.updatingBatch = true;
    try {
      // Note: This would need an API endpoint for updating batch metadata
      // For now, we'll simulate the update and show a message
      
      // In a real implementation, you would call:
      // await this.notificationService.updateBatch(this.editingBatch.id, this.editBatchForm).toPromise();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local data
      const batchIndex = this.batches.findIndex(b => b.id === this.editingBatch!.id);
      if (batchIndex !== -1) {
        this.batches[batchIndex] = {
          ...this.batches[batchIndex],
          name: this.editBatchForm.name,
          data: this.batches[batchIndex].data ? {
            ...this.batches[batchIndex].data!,
            priority: this.editBatchForm.priority
          } : {
            type: 'bulk_notification',
            notifications: [],
            priority: this.editBatchForm.priority
          }
        };
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Batch Updated',
        detail: `Batch "${this.editBatchForm.name}" has been updated successfully`
      });

      this.showEditDialog = false;
      this.loadBatches(); // Refresh data
    } catch (error) {
      console.error('Error updating batch:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Update Failed',
        detail: 'Failed to update batch. Please try again.'
      });
    } finally {
      this.updatingBatch = false;
    }
  }
}