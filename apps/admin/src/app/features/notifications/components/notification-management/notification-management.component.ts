import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { DatePickerModule } from 'primeng/datepicker';
import { Table } from 'primeng/table';

import {
  NotificationService
} from '../../services/notification.service';
import {
  Notification,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  ListNotificationsParams,
  CreateNotificationRequest,
  NotificationStats
} from '../../types/notification.types';

// Import child components
import { NotificationListComponent } from '../notification-list/notification-list.component';
import { NotificationTemplatesComponent } from '../notification-templates/notification-templates.component';
import { NotificationQueueComponent } from '../notification-queue/notification-queue.component';
import { NotificationBatchComponent } from '../notification-batch/notification-batch.component';

@Component({
  selector: 'app-notification-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TabsModule,
    TableModule,
    TagModule,
    SelectModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    ChartModule,
    ProgressBarModule,
    TimelineModule,
    TooltipModule,
    CheckboxModule,
    IconFieldModule,
    InputIconModule,
    BadgeModule,
    DividerModule,
    DatePickerModule,
    NotificationListComponent,
    NotificationTemplatesComponent,
    NotificationQueueComponent,
    NotificationBatchComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="file-manager-container h-full flex flex-column">
      <!-- Main Navigation Tabs -->
      <p-tabs [(value)]="activeTabValue" class="main-tabs flex-1 flex flex-column">
        <p-tablist>
          <p-tab value="analytics">Analytics</p-tab>
          <p-tab value="notifications">Notifications</p-tab>
          <p-tab value="templates">Templates</p-tab>
          <p-tab value="queue">Queue</p-tab>
          <p-tab value="batch">Batch Jobs</p-tab>
        </p-tablist>

        <p-tabpanels class="flex-1 overflow-hidden">
          <!-- Analytics Tab -->
          <p-tabpanel value="analytics" class="h-full">
            <div class="notification-analytics-container h-full overflow-y-auto p-4">
              <div class="analytics-header flex align-items-center justify-content-between mb-4">
                <div>
                  <h2 class="text-2xl font-bold m-0 text-gray-800">Notification Analytics</h2>
                  <p class="text-gray-600 mt-1 mb-0">Monitor notification delivery performance and trends</p>
                </div>
                <div class="flex align-items-center gap-2 ml-auto">
                  <p-button
                    icon="pi pi-refresh"
                    [text]="true"
                    severity="secondary"
                    (click)="refreshData()"
                    pTooltip="Refresh data">
                  </p-button>
                  <p-button
                    icon="pi pi-send"
                    label="Send Notification"
                    severity="primary"
                    (click)="showCreateDialog()">
                  </p-button>
                </div>
              </div>

              <!-- Analytics Cards -->
              <div class="analytics-cards-container mb-4">
                <div class="analytics-card-wrapper">
                  <p-card class="analytics-card h-full">
                    <div class="flex align-items-center justify-content-between">
                      <div class="flex-1 min-w-0">
                        <div class="text-xs sm:text-sm text-gray-500 mb-1">Total Sent</div>
                        <div class="text-lg sm:text-xl lg:text-2xl font-semibold mb-2 truncate">
                          {{ (stats?.deliveryMetrics?.totalSent || 0) | number }}
                        </div>
                        <div class="text-xs sm:text-sm">
                          <span class="text-green-600">
                            <i class="pi pi-arrow-up"></i>
                            12.5%
                          </span>
                          <span class="text-gray-500 ml-1 hidden sm:inline">from last month</span>
                        </div>
                      </div>
                      <div class="analytics-icon flex-shrink-0">
                        <i class="pi pi-send"></i>
                      </div>
                    </div>
                  </p-card>
                </div>

                <div class="analytics-card-wrapper">
                  <p-card class="analytics-card h-full hover:shadow-md">
                    <div class="flex align-items-center justify-content-between">
                      <div class="flex-1 min-w-0">
                        <div class="text-xs sm:text-sm text-gray-500 mb-1">Delivered</div>
                        <div class="text-lg sm:text-xl lg:text-2xl font-semibold mb-2 truncate">
                          {{ (stats?.deliveryMetrics?.totalDelivered || 0) | number }}
                        </div>
                        <div class="text-xs sm:text-sm" *ngIf="stats?.deliveryMetrics?.successRate !== undefined">
                          <span class="text-green-600">
                            <i class="pi pi-arrow-up"></i>
                            {{ stats?.deliveryMetrics?.successRate | number:'1.1-1' }}%
                          </span>
                          <span class="text-gray-500 ml-1 hidden sm:inline">success rate</span>
                        </div>
                      </div>
                      <div class="analytics-icon flex-shrink-0">
                        <i class="pi pi-check-circle"></i>
                      </div>
                    </div>
                  </p-card>
                </div>

                <div class="analytics-card-wrapper">
                  <p-card class="analytics-card h-full">
                    <div class="flex align-items-center justify-content-between">
                      <div class="flex-1 min-w-0">
                        <div class="text-xs sm:text-sm text-gray-500 mb-1">Failed</div>
                        <div class="text-lg sm:text-xl lg:text-2xl font-semibold mb-2 truncate">
                          {{ (stats?.deliveryMetrics?.totalFailed || 0) | number }}
                        </div>
                        <div class="text-xs sm:text-sm" *ngIf="stats?.deliveryMetrics?.totalFailed">
                          <span class="text-red-600">
                            <i class="pi pi-arrow-down"></i>
                            3.1%
                          </span>
                          <span class="text-gray-500 ml-1 hidden sm:inline">from last month</span>
                        </div>
                      </div>
                      <div class="analytics-icon flex-shrink-0">
                        <i class="pi pi-times-circle"></i>
                      </div>
                    </div>
                  </p-card>
                </div>

                <div class="analytics-card-wrapper">
                  <p-card class="analytics-card h-full">
                    <div class="flex align-items-center justify-content-between">
                      <div class="flex-1 min-w-0">
                        <div class="text-xs sm:text-sm text-gray-500 mb-1">Avg. Delivery Time</div>
                        <div class="text-lg sm:text-xl lg:text-2xl font-semibold mb-2 truncate">
                          {{ formatDeliveryTime(stats?.deliveryMetrics?.averageDeliveryTime) }}
                        </div>
                        <div class="text-xs sm:text-sm">
                          <span class="text-green-600">
                            <i class="pi pi-arrow-up"></i>
                            5.7%
                          </span>
                          <span class="text-gray-500 ml-1 hidden sm:inline">faster</span>
                        </div>
                      </div>
                      <div class="analytics-icon flex-shrink-0">
                        <i class="pi pi-clock"></i>
                      </div>
                    </div>
                  </p-card>
                </div>
              </div>

              <!-- Channel Distribution and Priority Breakdown -->
              <div class="grid">
                <div class="col-12 md:col-6">
                  <div class="analytics-section bg-white p-4 border-round border-1 border-gray-200">
                    <h3 class="section-title">Delivery by Channel</h3>
                    <div class="channel-stats" *ngIf="stats?.channelStats?.length">
                      <div *ngFor="let channel of stats?.channelStats" class="channel-item flex align-items-center justify-content-between py-2">
                        <div class="flex align-items-center gap-2">
                          <i [class]="notificationService.getChannelIcon(channel.channel)" class="text-primary"></i>
                          <span class="channel-name">{{ channel.channel | titlecase }}</span>
                        </div>
                        <div class="flex align-items-center gap-3">
                          <span class="channel-count font-semibold">{{ channel.sent }}</span>
                          <div class="channel-rate text-sm">
                            {{ channel.successRate | number:'1.1-1' }}% success
                          </div>
                        </div>
                      </div>
                    </div>
                    <div *ngIf="!stats?.channelStats?.length" class="text-center py-4 text-gray-500">
                      No channel data available
                    </div>
                  </div>
                </div>

                <div class="col-12 md:col-6">
                  <div class="analytics-section bg-white p-4 border-round border-1 border-gray-200">
                    <h3 class="section-title">Priority Distribution</h3>
                    <div class="priority-stats" *ngIf="stats?.priorityBreakdown?.length">
                      <div *ngFor="let priority of stats?.priorityBreakdown" class="priority-item flex align-items-center justify-content-between py-2">
                        <div class="flex align-items-center gap-2">
                          <i [class]="notificationService.getPriorityIcon(priority.priority)"
                             [style.color]="getPriorityDisplayColor(priority.priority)"></i>
                          <span class="priority-name">{{ priority.priority | titlecase }}</span>
                        </div>
                        <span class="priority-count font-semibold">{{ priority.count }}</span>
                      </div>
                    </div>
                    <div *ngIf="!stats?.priorityBreakdown?.length" class="text-center py-4 text-gray-500">
                      No priority data available
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </p-tabpanel>
          <!-- Notifications Tab -->
          <p-tabpanel value="notifications" class="h-full">
            <div class="notification-tab-container">
              <div class="mb-4">
                <div class="flex align-items-center justify-content-between">
                  <div>
                    <h2 class="text-2xl font-bold m-0 text-gray-800">Notifications</h2>
                    <p class="text-gray-600 mt-1 mb-0">Manage and monitor all notifications</p>
                  </div>
                  <div class="ml-auto">
                    <p-button
                      icon="pi pi-plus"
                      label="Add"
                      severity="primary"
                      (click)="showCreateDialog()">
                    </p-button>
                  </div>
                </div>
              </div>
              <app-notification-list
                (notificationSelected)="onNotificationSelected($event)"
                (refreshRequested)="refreshData()">
              </app-notification-list>
            </div>
          </p-tabpanel>

          <!-- Templates Tab -->
          <p-tabpanel value="templates" class="h-full">
            <div class="notification-tab-container">
              <app-notification-templates
                (templateSelected)="onTemplateSelected($event)"
                (refreshRequested)="refreshData()">
              </app-notification-templates>
            </div>
          </p-tabpanel>

          <!-- Queue Status Tab -->
          <p-tabpanel value="queue" class="h-full">
            <div class="notification-tab-container">
              <app-notification-queue
                (refreshRequested)="refreshData()">
              </app-notification-queue>
            </div>
          </p-tabpanel>

          <!-- Batch Jobs Tab -->
          <p-tabpanel value="batch" class="h-full">
            <div class="notification-tab-container">
              <app-notification-batch
                (batchSelected)="onBatchSelected($event)"
                (refreshRequested)="refreshData()">
              </app-notification-batch>
            </div>
          </p-tabpanel>

        </p-tabpanels>
      </p-tabs>

      <!-- Create Notification Dialog -->
      <p-dialog
        [(visible)]="showCreateNotificationDialog"
        [modal]="true"
        [style]="{width: '700px', maxWidth: '90vw'}"
        header="Send New Notification"
        [closable]="true"
        [draggable]="false"
        [resizable]="false">

        <form [formGroup]="notificationForm" (ngSubmit)="createNotification()" class="notification-form space-y-4">
          <!-- Type & Channel Row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Type <span class="text-red-500">*</span>
              </label>
              <p-select
                formControlName="type"
                [options]="notificationTypes"
                optionLabel="label"
                optionValue="value"
                placeholder="Select notification type"
                styleClass="w-full"
                [showClear]="true">
              </p-select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Channel <span class="text-red-500">*</span>
              </label>
              <p-select
                formControlName="channel"
                [options]="channels"
                optionLabel="label"
                optionValue="value"
                placeholder="Select delivery channel"
                styleClass="w-full"
                [showClear]="true">
              </p-select>
            </div>
          </div>

          <!-- Recipient Section -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              <i class="pi pi-user mr-2"></i>
              Recipient Information <span class="text-red-500">*</span>
            </label>
            <div formGroupName="recipient" class="grid grid-cols-2 gap-4">
              <input
                type="text"
                pInputText
                formControlName="email"
                placeholder="Email address (required for email notifications)"
                class="w-full">
              <input
                type="text"
                pInputText
                formControlName="phone"
                placeholder="Phone number (required for SMS)"
                class="w-full">
            </div>
          </div>

          <!-- Message Content -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="pi pi-envelope mr-2"></i>
                Message Content
              </label>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                pInputText
                formControlName="subject"
                placeholder="Enter subject line (optional for some channels)"
                class="w-full">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Message <span class="text-red-500">*</span>
              </label>
              <textarea
                formControlName="content"
                rows="4"
                placeholder="Enter your notification message here..."
                class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              </textarea>
              <small class="text-gray-500">Keep your message clear and concise for better delivery rates</small>
            </div>
          </div>

          <!-- Settings Row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <p-select
                formControlName="priority"
                [options]="priorities"
                optionLabel="label"
                optionValue="value"
                placeholder="Normal"
                styleClass="w-full">
                <ng-template pTemplate="selectedItem" let-option>
                  <div class="flex align-items-center gap-2" *ngIf="option">
                    <i [class]="notificationService.getPriorityIcon(option.value)"
                       [style.color]="getPriorityDisplayColor(option.value)"></i>
                    <span>{{ option.label }}</span>
                  </div>
                </ng-template>
                <ng-template pTemplate="item" let-option>
                  <div class="flex align-items-center gap-2">
                    <i [class]="notificationService.getPriorityIcon(option.value)"
                       [style.color]="getPriorityDisplayColor(option.value)"></i>
                    <span>{{ option.label }}</span>
                  </div>
                </ng-template>
              </p-select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Schedule At
              </label>
              <p-datepicker
                formControlName="scheduledAt"
                placeholder="Send immediately"
                [showTime]="true"
                [showIcon]="true"
                iconDisplay="input"
                [minDate]="minDate"
                hourFormat="24"
                dateFormat="yy-mm-dd"
                styleClass="w-full">
              </p-datepicker>
              <small class="text-gray-500">Select date and time to schedule, or leave empty to send now</small>
            </div>
          </div>
        </form>

        <ng-template pTemplate="footer">
          <div class="dialog-footer flex justify-content-end gap-2">
            <p-button
              label="Cancel"
              severity="secondary"
              [text]="true"
              (click)="showCreateNotificationDialog = false">
            </p-button>
            <p-button
              label="Send Notification"
              severity="primary"
              icon="pi pi-send"
              [loading]="loading"
              (click)="createNotification()"
              [disabled]="notificationForm.invalid">
            </p-button>
          </div>
        </ng-template>
      </p-dialog>
    </div>

    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .file-manager-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .main-tabs {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }

    :host ::ng-deep .main-tabs {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    :host ::ng-deep .main-tabs .p-tabs-panels {
      flex: 1;
      overflow: hidden;
      padding: 0;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel {
      height: 100%;
      padding: 0;
      overflow: hidden;
    }

    :host ::ng-deep .main-tabs .p-tabs-panelcontent {
      height: 100%;
      padding: 0;
      overflow: hidden;
    }

    /* Analytics Tab Styles - matching storage */
    .notification-analytics-container {
      height: 100%;
      overflow-y: auto;
    }

    /* Content Containers for each tab to enable scrolling */
    .notification-tab-container {
      height: 100%;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .analytics-header h2 {
      color: var(--text-color);
      font-size: 2rem;
      font-weight: 700;
    }

    /* Analytics Cards Container */
    .analytics-cards-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    @media (min-width: 576px) {
      .analytics-cards-container {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 992px) {
      .analytics-cards-container {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .analytics-card-wrapper {
      width: 100%;
    }

    .analytics-card {
      border: 1px solid var(--surface-border);
      transition: border-color 0.2s ease;
    }

    .analytics-card:hover {
      border-color: var(--primary-color);
    }

    .analytics-icon {
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    @media (min-width: 768px) {
      .analytics-icon {
        width: 2.75rem;
        height: 2.75rem;
        font-size: 1.3rem;
      }
    }

    @media (min-width: 992px) {
      .analytics-icon {
        width: 3rem;
        height: 3rem;
        font-size: 1.5rem;
      }
    }

    /* Card styling - flat design with borders only */
    :host ::ng-deep .p-card {
      border-radius: 12px !important;
      box-shadow: none !important;
      border: 1px solid #e5e7eb !important;
    }

    :host ::ng-deep .p-card .p-card-header {
      padding: 0;
      border-bottom: 1px solid var(--surface-border);
      border-radius: 12px 12px 0 0;
    }

    :host ::ng-deep .p-card .p-card-body {
      padding: 0.75rem;
    }

    @media (min-width: 768px) {
      :host ::ng-deep .p-card .p-card-body {
        padding: 1rem;
      }
    }

    /* Mobile optimizations */
    @media (max-width: 576px) {
      :host ::ng-deep .p-card .p-card-body {
        padding: 0.75rem;
      }

      .analytics-icon {
        width: 2rem;
        height: 2rem;
        font-size: 1rem;
      }
    }

    .analytics-title {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
      font-weight: 500;
    }

    .analytics-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-color);
      margin: 0.5rem 0;
      line-height: 1;
    }

    .analytics-change {
      font-size: 0.75rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .analytics-change.positive {
      color: #10b981;
    }

    .analytics-change.negative {
      color: #ef4444;
    }

    /* Analytics Sections */
    .analytics-section {
      height: 300px;
      overflow-y: auto;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-color);
      margin: 0 0 1rem 0;
    }

    .channel-item,
    .priority-item {
      border-bottom: 1px solid #f3f4f6;
    }

    .channel-item:last-child,
    .priority-item:last-child {
      border-bottom: none;
    }

    .channel-name,
    .priority-name {
      font-weight: 500;
      color: var(--text-color);
    }

    .channel-count,
    .priority-count {
      color: var(--primary-color);
    }

    .channel-rate {
      color: #6b7280;
    }

    /* Tailwind-based form styling */

    .dialog-footer {
      padding-top: 1rem;
    }

    :host ::ng-deep .p-dialog .p-dialog-content {
      padding: 1.5rem;
    }

    :host ::ng-deep .p-dialog .p-dialog-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--surface-border);
    }

    /* Form field improvements - consistent height */
    :host ::ng-deep .notification-form input[pInputText],
    :host ::ng-deep .notification-form .p-datepicker input {
      width: 100% !important;
      height: 2.75rem !important;
      padding: 0.75rem !important;
      border: 1px solid #d1d5db !important;
      border-radius: 0.375rem !important;
      font-size: 0.875rem !important;
      transition: all 0.2s ease !important;
      background-color: white !important;
      box-sizing: border-box !important;
      line-height: 1.25rem !important;
    }

    :host ::ng-deep .notification-form input[pInputText]:focus,
    :host ::ng-deep .notification-form .p-datepicker input:focus {
      outline: none !important;
      border-color: #6366f1 !important;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1) !important;
    }

    /* Fix select double border issue */
    :host ::ng-deep .notification-form .p-select {
      height: 2.75rem !important;
    }

    :host ::ng-deep .notification-form .p-select .p-select-label {
      height: 2.75rem !important;
      padding: 0.75rem !important;
      border: none !important;
      font-size: 0.875rem !important;
      line-height: 1.25rem !important;
      display: flex !important;
      align-items: center !important;
    }

    :host ::ng-deep .notification-form textarea {
      width: 100% !important;
      padding: 0.75rem !important;
      border: 1px solid #d1d5db !important;
      border-radius: 0.375rem !important;
      font-size: 0.875rem !important;
      transition: all 0.2s ease !important;
      background-color: white !important;
      box-sizing: border-box !important;
      line-height: 1.25rem !important;
      resize: vertical !important;
    }

    :host ::ng-deep .notification-form textarea:focus {
      outline: none !important;
      border-color: #6366f1 !important;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1) !important;
    }

    /* Use default PrimeNG Select styling */

    :host ::ng-deep .notification-form .p-button {
      border-radius: 6px;
      font-weight: 600;
      padding: 0.75rem 1.5rem;
    }

    /* Tab Content */
    :host ::ng-deep .main-tabs .p-tabs-panel app-notification-list,
    :host ::ng-deep .main-tabs .p-tabs-panel app-notification-templates,
    :host ::ng-deep .main-tabs .p-tabs-panel app-notification-queue,
    :host ::ng-deep .main-tabs .p-tabs-panel app-notification-batch {
      display: block;
      height: 100%;
      overflow-y: auto;
      padding: 1.5rem;
    }
  `]
})
export class NotificationManagementComponent implements OnInit, OnDestroy {
  notificationService = inject(NotificationService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);
  private subscriptions = new Subscription();

  // State
  activeTabValue = 'analytics';
  loading = false;
  stats: NotificationStats | null = null;
  showCreateNotificationDialog = false;
  notificationForm!: FormGroup;
  minDate = new Date();

  // Options
  notificationTypes = [
    { label: 'Welcome', value: 'welcome' },
    { label: 'Verification', value: 'verification' },
    { label: 'Password Reset', value: 'password-reset' },
    { label: 'Security Alert', value: 'security-alert' },
    { label: 'Appointment Reminder', value: 'appointment-reminder' },
    { label: 'Lab Results', value: 'lab-results' },
    { label: 'Emergency', value: 'emergency' },
    { label: 'Medication Reminder', value: 'medication-reminder' },
    { label: 'Billing', value: 'billing' },
    { label: 'Marketing', value: 'marketing' },
    { label: 'System', value: 'system' },
    { label: 'Custom', value: 'custom' }
  ];

  channels = [
    { label: 'Email', value: 'email' },
    { label: 'SMS', value: 'sms' },
    { label: 'Push Notification', value: 'push' },
    { label: 'In-App', value: 'in-app' },
    { label: 'Webhook', value: 'webhook' },
    { label: 'Slack', value: 'slack' }
  ];

  priorities = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
    { label: 'Critical', value: 'critical' }
  ];

  ngOnInit() {
    this.initializeForm();
    this.loadStats();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  initializeForm() {
    this.notificationForm = this.fb.group({
      type: ['', Validators.required],
      channel: ['', Validators.required],
      recipient: this.fb.group({
        email: [''],
        phone: [''],
        name: ['']
      }),
      subject: [''],
      content: ['', Validators.required],
      priority: ['normal'],
      scheduledAt: [null]
    });
  }

  loadStats() {
    this.loading = true;
    this.notificationService.getNotificationStats().subscribe({
      next: (response) => {
        this.stats = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.loading = false;
      }
    });
  }

  refreshData() {
    this.loadStats();
  }

  showCreateDialog() {
    this.notificationForm.reset({
      priority: 'normal'
    });
    this.showCreateNotificationDialog = true;
  }

  createNotification() {
    if (this.notificationForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

    const formValue = this.notificationForm.value;
    const request: CreateNotificationRequest = {
      type: formValue.type,
      channel: formValue.channel,
      recipient: formValue.recipient,
      content: {
        subject: formValue.subject,
        text: formValue.content
      },
      priority: formValue.priority,
      scheduledAt: formValue.scheduledAt ? formValue.scheduledAt.toISOString() : undefined
    };

    this.loading = true;
    this.notificationService.createNotification(request).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Notification created successfully'
        });
        this.showCreateNotificationDialog = false;
        this.refreshData();
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to create notification'
        });
        this.loading = false;
      }
    });
  }

  onNotificationSelected(notification: Notification) {
    // Handle notification selection
    console.log('Notification selected:', notification);
  }

  onTemplateSelected(template: any) {
    // Handle template selection
    console.log('Template selected:', template);
  }

  onBatchSelected(batch: any) {
    // Handle batch selection
    console.log('Batch selected:', batch);
  }

  formatDeliveryTime(milliseconds?: number): string {
    if (!milliseconds) return 'N/A';

    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      return `${(milliseconds / 60000).toFixed(1)}m`;
    }
  }

  getPriorityDisplayColor(priority: string): string {
    const colors: Record<string, string> = {
      'low': '#6b7280',
      'normal': '#3b82f6',
      'high': '#f59e0b',
      'urgent': '#ef4444',
      'critical': '#dc2626'
    };
    return colors[priority] || '#6b7280';
  }
}
