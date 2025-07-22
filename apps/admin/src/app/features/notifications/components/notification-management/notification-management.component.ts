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
import { NotificationAnalyticsComponent } from '../notification-analytics/notification-analytics.component';
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
    NotificationListComponent,
    NotificationTemplatesComponent,
    NotificationAnalyticsComponent,
    NotificationQueueComponent,
    NotificationBatchComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="notification-management-container">
      <!-- Header -->
      <div class="notification-header mb-4">
        <div class="flex align-items-center justify-content-between">
          <div>
            <h1 class="text-3xl font-bold m-0">Notification Management</h1>
            <p class="text-gray-600 mt-2">Manage system notifications, templates, and delivery settings</p>
          </div>
          <div class="flex gap-2">
            <p-button 
              icon="pi pi-refresh" 
              [text]="true" 
              severity="secondary"
              (click)="refreshData()"
              pTooltip="Refresh data"
              tooltipPosition="bottom">
            </p-button>
            <p-button 
              icon="pi pi-send" 
              label="Send Notification" 
              severity="primary"
              (click)="showCreateDialog()">
            </p-button>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats grid mb-4">
        <div class="col-12 md:col-6 lg:col-3">
          <p-card styleClass="stat-card">
            <div class="flex align-items-center justify-content-between">
              <div>
                <p class="text-sm text-gray-600 m-0">Total Sent</p>
                <h3 class="text-2xl font-semibold m-0 mt-2">{{ stats?.sentCount || 0 | number }}</h3>
              </div>
              <div class="stat-icon bg-blue-100">
                <i class="pi pi-send text-blue-600 text-2xl"></i>
              </div>
            </div>
          </p-card>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <p-card styleClass="stat-card">
            <div class="flex align-items-center justify-content-between">
              <div>
                <p class="text-sm text-gray-600 m-0">Delivered</p>
                <h3 class="text-2xl font-semibold m-0 mt-2">{{ stats?.deliveredCount || 0 | number }}</h3>
                <p class="text-sm text-green-600 m-0 mt-1">
                  {{ stats?.successRate || 0 | number:'1.1-1' }}% success
                </p>
              </div>
              <div class="stat-icon bg-green-100">
                <i class="pi pi-check-circle text-green-600 text-2xl"></i>
              </div>
            </div>
          </p-card>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <p-card styleClass="stat-card">
            <div class="flex align-items-center justify-content-between">
              <div>
                <p class="text-sm text-gray-600 m-0">Failed</p>
                <h3 class="text-2xl font-semibold m-0 mt-2">{{ stats?.failedCount || 0 | number }}</h3>
              </div>
              <div class="stat-icon bg-red-100">
                <i class="pi pi-times-circle text-red-600 text-2xl"></i>
              </div>
            </div>
          </p-card>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <p-card styleClass="stat-card">
            <div class="flex align-items-center justify-content-between">
              <div>
                <p class="text-sm text-gray-600 m-0">Avg. Delivery Time</p>
                <h3 class="text-2xl font-semibold m-0 mt-2">
                  {{ formatDeliveryTime(stats?.averageDeliveryTime) }}
                </h3>
              </div>
              <div class="stat-icon bg-purple-100">
                <i class="pi pi-clock text-purple-600 text-2xl"></i>
              </div>
            </div>
          </p-card>
        </div>
      </div>

      <!-- Main Content Tabs -->
      <p-tabs [(value)]="activeTab" class="notification-tabs">
        <p-tablist>
          <p-tab value="notifications">
            <span class="flex align-items-center gap-2">
              <i class="pi pi-bell"></i>
              Notifications
            </span>
          </p-tab>
          <p-tab value="templates">
            <span class="flex align-items-center gap-2">
              <i class="pi pi-file-edit"></i>
              Templates
            </span>
          </p-tab>
          <p-tab value="queue">
            <span class="flex align-items-center gap-2">
              <i class="pi pi-list"></i>
              Queue Status
            </span>
          </p-tab>
          <p-tab value="batch">
            <span class="flex align-items-center gap-2">
              <i class="pi pi-folder"></i>
              Batch Jobs
            </span>
          </p-tab>
          <p-tab value="analytics">
            <span class="flex align-items-center gap-2">
              <i class="pi pi-chart-bar"></i>
              Analytics
            </span>
          </p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- Notifications Tab -->
          <p-tabpanel value="notifications">
            <app-notification-list
              (notificationSelected)="onNotificationSelected($event)"
              (refreshRequested)="refreshData()">
            </app-notification-list>
          </p-tabpanel>

          <!-- Templates Tab -->
          <p-tabpanel value="templates">
            <app-notification-templates
              (templateSelected)="onTemplateSelected($event)"
              (refreshRequested)="refreshData()">
            </app-notification-templates>
          </p-tabpanel>

          <!-- Queue Status Tab -->
          <p-tabpanel value="queue">
            <app-notification-queue
              (refreshRequested)="refreshData()">
            </app-notification-queue>
          </p-tabpanel>

          <!-- Batch Jobs Tab -->
          <p-tabpanel value="batch">
            <app-notification-batch
              (batchSelected)="onBatchSelected($event)"
              (refreshRequested)="refreshData()">
            </app-notification-batch>
          </p-tabpanel>

          <!-- Analytics Tab -->
          <p-tabpanel value="analytics">
            <app-notification-analytics
              [stats]="stats"
              (refreshRequested)="refreshData()">
            </app-notification-analytics>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <!-- Create Notification Dialog -->
      <p-dialog 
        [(visible)]="showCreateNotificationDialog" 
        [modal]="true" 
        [style]="{width: '600px'}"
        header="Send New Notification"
        [closable]="true">
        
        <form [formGroup]="notificationForm" (ngSubmit)="createNotification()">
          <div class="formgrid grid">
            <!-- Type -->
            <div class="field col-12 md:col-6">
              <label for="type" class="block mb-2">Type *</label>
              <p-select 
                formControlName="type" 
                [options]="notificationTypes"
                optionLabel="label"
                optionValue="value"
                placeholder="Select type"
                styleClass="w-full"
                [showClear]="true">
              </p-select>
            </div>

            <!-- Channel -->
            <div class="field col-12 md:col-6">
              <label for="channel" class="block mb-2">Channel *</label>
              <p-select 
                formControlName="channel" 
                [options]="channels"
                optionLabel="label"
                optionValue="value"
                placeholder="Select channel"
                styleClass="w-full"
                [showClear]="true">
              </p-select>
            </div>

            <!-- Recipient Email/Phone -->
            <div class="field col-12">
              <label class="block mb-2">Recipient *</label>
              <div formGroupName="recipient">
                <div class="formgrid grid">
                  <div class="field col-12 md:col-6">
                    <input 
                      pInputText 
                      formControlName="email" 
                      placeholder="Email address"
                      class="w-full">
                  </div>
                  <div class="field col-12 md:col-6">
                    <input 
                      pInputText 
                      formControlName="phone" 
                      placeholder="Phone number"
                      class="w-full">
                  </div>
                </div>
              </div>
            </div>

            <!-- Subject -->
            <div class="field col-12">
              <label for="subject" class="block mb-2">Subject</label>
              <input 
                pInputText 
                formControlName="subject" 
                placeholder="Notification subject"
                class="w-full">
            </div>

            <!-- Content -->
            <div class="field col-12">
              <label for="content" class="block mb-2">Message *</label>
              <textarea 
                pInputTextarea 
                formControlName="content" 
                rows="4"
                placeholder="Notification message"
                class="w-full">
              </textarea>
            </div>

            <!-- Priority -->
            <div class="field col-12 md:col-6">
              <label for="priority" class="block mb-2">Priority</label>
              <p-select 
                formControlName="priority" 
                [options]="priorities"
                optionLabel="label"
                optionValue="value"
                placeholder="Select priority"
                styleClass="w-full">
              </p-select>
            </div>

            <!-- Schedule -->
            <div class="field col-12 md:col-6">
              <label for="scheduledAt" class="block mb-2">Schedule At</label>
              <input 
                pInputText
                formControlName="scheduledAt" 
                placeholder="Send immediately (YYYY-MM-DD HH:MM)"
                class="w-full">
            </div>
          </div>
        </form>

        <ng-template pTemplate="footer">
          <p-button 
            label="Cancel" 
            severity="secondary" 
            [text]="true"
            (click)="showCreateNotificationDialog = false">
          </p-button>
          <p-button 
            label="Send Notification" 
            severity="primary"
            [loading]="loading"
            (click)="createNotification()">
          </p-button>
        </ng-template>
      </p-dialog>
    </div>

    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .notification-management-container {
      padding: 1.5rem;
    }

    .notification-header h1 {
      color: var(--text-color);
    }

    .stat-card {
      border: 1px solid var(--surface-border);
      box-shadow: none;
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    :host ::ng-deep .stat-card .p-card-body {
      padding: 1.5rem;
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :host ::ng-deep .notification-tabs .p-tabs-panels {
      padding: 0;
      background: transparent;
    }

    :host ::ng-deep .notification-tabs .p-tabs-panel {
      padding: 1rem 0;
    }

    .field label {
      font-weight: 500;
      color: var(--text-color-secondary);
    }

    :host ::ng-deep .p-dialog .p-dialog-content {
      padding-bottom: 1rem;
    }
  `]
})
export class NotificationManagementComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);
  private subscriptions = new Subscription();

  // State
  activeTab = 'notifications';
  loading = false;
  stats: NotificationStats | null = null;
  showCreateNotificationDialog = false;
  notificationForm!: FormGroup;

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
}