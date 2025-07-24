import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChartModule } from 'primeng/chart';
import { DataViewModule } from 'primeng/dataview';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';

import { MessageService, ConfirmationService } from 'primeng/api';

import {
  ConfigurationService,
  HotReloadStats,
  ReloadRequest
} from '../../services/configuration.service';

interface ServiceStats {
  name: string;
  successCount: number;
  errorCount: number;
  categories: string[];
  environments: string[];
  priority: number;
  lastError?: string;
  lastReloadDuration?: number;
  reliability: number;
  status: 'healthy' | 'warning' | 'error';
}

@Component({
  selector: 'app-hot-reload-stats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ProgressBarModule,
    ChartModule,
    DataViewModule,
    DividerModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    TableModule,
    SelectModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="hot-reload-stats">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Hot Reload Statistics</h3>
          <p class="text-sm text-gray-600 mt-1">Monitor configuration hot reload performance and service health</p>
        </div>

        <div class="flex gap-2 items-center">
          <p-button
            icon="pi pi-refresh"
            [loading]="loading"
            (onClick)="loadStats()"
            pTooltip="Refresh statistics"
            tooltipPosition="top"
            severity="secondary"
            size="small">
          </p-button>

          <p-button
            icon="pi pi-trash"
            label="Reset Stats"
            (onClick)="confirmResetStats()"
            pTooltip="Reset all statistics"
            tooltipPosition="top"
            severity="danger"
            size="small"
            [disabled]="loading">
          </p-button>
        </div>
      </div>

      <!-- Overall Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <!-- Total Reloads -->
        <p-card styleClass="text-center">
          <ng-template pTemplate="content">
            <div class="stat-card">
              <i class="pi pi-refresh text-3xl text-blue-500 mb-2"></i>
              <div class="text-2xl font-bold text-gray-800">{{ totalReloads }}</div>
              <div class="text-sm text-gray-600">Total Reloads</div>
            </div>
          </ng-template>
        </p-card>

        <!-- Success Rate -->
        <p-card styleClass="text-center">
          <ng-template pTemplate="content">
            <div class="stat-card">
              <i class="pi pi-check-circle text-3xl text-green-500 mb-2"></i>
              <div class="text-2xl font-bold text-gray-800">{{ successRate }}%</div>
              <div class="text-sm text-gray-600">Success Rate</div>
            </div>
          </ng-template>
        </p-card>

        <!-- Active Services -->
        <p-card styleClass="text-center">
          <ng-template pTemplate="content">
            <div class="stat-card">
              <i class="pi pi-server text-3xl text-purple-500 mb-2"></i>
              <div class="text-2xl font-bold text-gray-800">{{ activeServices }}</div>
              <div class="text-sm text-gray-600">Active Services</div>
            </div>
          </ng-template>
        </p-card>

        <!-- Last Update -->
        <p-card styleClass="text-center">
          <ng-template pTemplate="content">
            <div class="stat-card">
              <i class="pi pi-clock text-3xl text-orange-500 mb-2"></i>
              <div class="text-lg font-bold text-gray-800">{{ formatTimestamp(reloadStats?.timestamp) }}</div>
              <div class="text-sm text-gray-600">Last Update</div>
            </div>
          </ng-template>
        </p-card>
      </div>

      <!-- Services Performance -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Services Health Chart -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex justify-between items-center p-4 pb-0">
              <h4 class="font-semibold text-gray-800">Services Health</h4>
              <p-tag [value]="getOverallHealthStatus()" [severity]="getOverallHealthSeverity()"></p-tag>
            </div>
          </ng-template>

          <ng-template pTemplate="content">
            <p-chart
              type="doughnut"
              [data]="healthChartData"
              [options]="chartOptions"
              [style]="{ height: '300px' }">
            </p-chart>
          </ng-template>
        </p-card>

        <!-- Reload Performance Chart -->
        <p-card>
          <ng-template pTemplate="header">
            <div class="p-4 pb-0">
              <h4 class="font-semibold text-gray-800">Reload Performance</h4>
            </div>
          </ng-template>

          <ng-template pTemplate="content">
            <p-chart
              type="bar"
              [data]="performanceChartData"
              [options]="barChartOptions"
              [style]="{ height: '300px' }">
            </p-chart>
          </ng-template>
        </p-card>
      </div>

      <!-- Services Detail Table -->
      <p-card>
        <ng-template pTemplate="header">
          <div class="flex justify-between items-center p-4 pb-0">
            <h4 class="font-semibold text-gray-800">Services Details</h4>
            <div class="flex gap-2">
              <p-button
                icon="pi pi-play"
                label="Test Reload"
                (onClick)="showTestReloadDialog()"
                severity="info"
                size="small">
              </p-button>
            </div>
          </div>
        </ng-template>

        <ng-template pTemplate="content">
          <p-table
            [value]="servicesList"
            [paginator]="false"
            styleClass="p-datatable-sm">

            <ng-template pTemplate="header">
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Success</th>
                <th>Errors</th>
                <th>Reliability</th>
                <th>Categories</th>
                <th>Last Duration</th>
                <th>Actions</th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-service>
              <tr>
                <!-- Service Name -->
                <td>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-server text-primary"></i>
                    <span class="font-semibold">{{ service.name }}</span>
                  </div>
                </td>

                <!-- Status -->
                <td>
                  <p-tag
                    [value]="service.status"
                    [severity]="getStatusSeverity(service.status)"
                    class="text-xs">
                  </p-tag>
                </td>

                <!-- Success Count -->
                <td>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-check text-green-500"></i>
                    <span>{{ service.successCount }}</span>
                  </div>
                </td>

                <!-- Error Count -->
                <td>
                  <div class="flex items-center gap-2">
                    <i class="pi pi-times text-red-500"></i>
                    <span>{{ service.errorCount }}</span>
                  </div>
                </td>

                <!-- Reliability -->
                <td>
                  <div class="flex items-center gap-2">
                    <p-progressbar
                      [value]="service.reliability"
                      [style]="{ width: '60px', height: '8px' }">
                    </p-progressbar>
                    <span class="text-sm">{{ service.reliability }}%</span>
                  </div>
                </td>

                <!-- Categories -->
                <td>
                  <div class="flex flex-wrap gap-1">
                    <p-tag
                      *ngFor="let category of service.categories.slice(0, 2)"
                      [value]="category"
                      severity="secondary"
                      class="text-xs">
                    </p-tag>
                    <p-tag
                      *ngIf="service.categories.length > 2"
                      [value]="'+' + (service.categories.length - 2)"
                      severity="secondary"
                      class="text-xs">
                    </p-tag>
                  </div>
                </td>

                <!-- Last Duration -->
                <td>
                  <span class="text-sm font-mono">
                    {{ service.lastReloadDuration ? service.lastReloadDuration + 'ms' : '-' }}
                  </span>
                </td>

                <!-- Actions -->
                <td>
                  <div class="flex gap-1">
                    <p-button
                      icon="pi pi-info-circle"
                      (onClick)="showServiceDetails(service)"
                      pTooltip="View details"
                      tooltipPosition="top"
                      severity="info"
                      size="small"
                      [text]="true">
                    </p-button>

                    <p-button
                      *ngIf="service.lastError"
                      icon="pi pi-exclamation-triangle"
                      (onClick)="showError(service)"
                      pTooltip="View last error"
                      tooltipPosition="top"
                      severity="secondary"
                      size="small"
                      [text]="true">
                    </p-button>
                  </div>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="8" class="text-center py-8">
                  <div class="text-gray-500">
                    <i class="pi pi-info-circle text-2xl mb-2 block"></i>
                    <div>No services registered for hot reload</div>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </ng-template>
      </p-card>
    </div>

    <!-- Test Reload Dialog -->
    <p-dialog
      [(visible)]="showTestDialog"
      [modal]="true"
      header="Test Configuration Reload"
      [style]="{ width: '500px' }"
      [closable]="true">

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <input
            pInputText
            [(ngModel)]="testReloadRequest.category"
            placeholder="e.g., smtp, database"
            class="w-full">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Environment</label>
          <p-select
            [(ngModel)]="testReloadRequest.environment"
            [options]="environmentOptions"
            placeholder="Select environment"
            class="w-full">
          </p-select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Reason (Optional)</label>
          <input
            pInputText
            [(ngModel)]="testReloadRequest.changeReason"
            placeholder="Test reload from dashboard"
            class="w-full">
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancel"
            (onClick)="closeTestDialog()"
            severity="secondary">
          </p-button>
          <p-button
            label="Test Reload"
            (onClick)="executeTestReload()"
            [loading]="testing"
            [disabled]="!testReloadRequest.category || !testReloadRequest.environment">
          </p-button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Service Details Dialog -->
    <p-dialog
      [(visible)]="showDetailsDialog"
      [modal]="true"
      [header]="selectedServiceDetails?.name + ' Details'"
      [style]="{ width: '600px' }"
      [closable]="true">

      <div *ngIf="selectedServiceDetails" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <strong>Success Count:</strong> {{ selectedServiceDetails.successCount }}
          </div>
          <div>
            <strong>Error Count:</strong> {{ selectedServiceDetails.errorCount }}
          </div>
          <div>
            <strong>Priority:</strong> {{ selectedServiceDetails.priority }}
          </div>
          <div>
            <strong>Reliability:</strong> {{ selectedServiceDetails.reliability }}%
          </div>
        </div>

        <div>
          <strong>Supported Categories:</strong>
          <div class="flex flex-wrap gap-1 mt-1">
            <p-tag
              *ngFor="let category of selectedServiceDetails.categories"
              [value]="category"
              severity="info"
              class="text-xs">
            </p-tag>
          </div>
        </div>

        <div>
          <strong>Supported Environments:</strong>
          <div class="flex flex-wrap gap-1 mt-1">
            <p-tag
              *ngFor="let env of selectedServiceDetails.environments"
              [value]="env"
              severity="secondary"
              class="text-xs">
            </p-tag>
          </div>
        </div>

        <div *ngIf="selectedServiceDetails.lastError">
          <strong>Last Error:</strong>
          <div class="bg-red-50 p-3 rounded border border-red-200 mt-2">
            <code class="text-sm text-red-800">{{ selectedServiceDetails.lastError }}</code>
          </div>
        </div>
      </div>
    </p-dialog>

    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .hot-reload-stats {
      padding: 1rem;
    }

    .stat-card {
      padding: 1rem;
      text-align: center;
    }

    :host ::ng-deep .p-card {
      border: 1px solid #e5e7eb!important;
      box-shadow: none !important;
    }

    :host ::ng-deep .p-card .p-card-content {
      padding: 1rem;
    }

    :host ::ng-deep .p-card .p-card-header {
      padding: 0;
    }

    :host ::ng-deep .p-progressbar {
      height: 8px;
    }

    :host ::ng-deep .p-chart {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `]
})
export class HotReloadStatsComponent implements OnInit, OnDestroy {
  private configService = inject(ConfigurationService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private subscriptions: Subscription[] = [];

  // Data
  reloadStats: HotReloadStats | null = null;
  servicesList: ServiceStats[] = [];
  loading = false;

  // Computed stats
  totalReloads = 0;
  successRate = 0;
  activeServices = 0;

  // Charts
  healthChartData: any;
  performanceChartData: any;
  chartOptions: any;
  barChartOptions: any;

  // Test Dialog
  showTestDialog = false;
  testing = false;
  testReloadRequest: ReloadRequest = {
    category: '',
    environment: '',
    changeReason: ''
  };

  environmentOptions = [
    { label: 'Development', value: 'development' },
    { label: 'Staging', value: 'staging' },
    { label: 'Production', value: 'production' },
    { label: 'Test', value: 'test' }
  ];

  // Details Dialog
  showDetailsDialog = false;
  selectedServiceDetails: ServiceStats | null = null;

  ngOnInit(): void {
    this.loadStats();
    this.setupAutoRefresh();
    this.initializeChartOptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupAutoRefresh(): void {
    // Auto-refresh every 30 seconds
    const refreshSub = interval(30000).subscribe(() => {
      if (!this.loading) {
        this.loadStats();
      }
    });
    this.subscriptions.push(refreshSub);
  }

  loadStats(): void {
    this.loading = true;

    this.configService.getReloadStats().subscribe({
      next: (stats) => {
        this.reloadStats = stats;
        this.processStats(stats);
        this.updateCharts();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load reload stats:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load hot reload statistics'
        });
        this.loading = false;
      }
    });
  }

  private processStats(stats: HotReloadStats): void {
    const services = Object.entries(stats.services);

    this.servicesList = services.map(([name, serviceData]) => {
      const totalOperations = serviceData.successCount + serviceData.errorCount;
      const reliability = totalOperations > 0
        ? Math.round((serviceData.successCount / totalOperations) * 100)
        : 100;

      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      if (reliability < 50) status = 'error';
      else if (reliability < 80) status = 'warning';

      return {
        name,
        successCount: serviceData.successCount,
        errorCount: serviceData.errorCount,
        categories: serviceData.categories,
        environments: serviceData.environments,
        priority: serviceData.priority,
        lastError: serviceData.lastError,
        lastReloadDuration: serviceData.lastReloadDuration,
        reliability,
        status
      };
    });

    // Calculate overall stats
    this.totalReloads = this.servicesList.reduce((sum, service) =>
      sum + service.successCount + service.errorCount, 0);

    const totalSuccess = this.servicesList.reduce((sum, service) =>
      sum + service.successCount, 0);

    this.successRate = this.totalReloads > 0
      ? Math.round((totalSuccess / this.totalReloads) * 100)
      : 100;

    this.activeServices = this.servicesList.length;
  }

  private updateCharts(): void {
    this.updateHealthChart();
    this.updatePerformanceChart();
  }

  private updateHealthChart(): void {
    const healthCounts = this.servicesList.reduce((acc, service) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    this.healthChartData = {
      labels: ['Healthy', 'Warning', 'Error'],
      datasets: [{
        data: [
          healthCounts['healthy'] || 0,
          healthCounts['warning'] || 0,
          healthCounts['error'] || 0
        ],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        hoverBackgroundColor: ['#059669', '#D97706', '#DC2626']
      }]
    };
  }

  private updatePerformanceChart(): void {
    const sortedServices = [...this.servicesList]
      .sort((a, b) => b.successCount - a.successCount)
      .slice(0, 8);

    this.performanceChartData = {
      labels: sortedServices.map(s => s.name),
      datasets: [
        {
          label: 'Success',
          data: sortedServices.map(s => s.successCount),
          backgroundColor: '#10B981'
        },
        {
          label: 'Errors',
          data: sortedServices.map(s => s.errorCount),
          backgroundColor: '#EF4444'
        }
      ]
    };
  }

  private initializeChartOptions(): void {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    };

    this.barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };
  }

  getOverallHealthStatus(): string {
    const healthyCounts = this.servicesList.filter(s => s.status === 'healthy').length;
    const totalServices = this.servicesList.length;

    if (totalServices === 0) return 'No Data';
    if (healthyCounts === totalServices) return 'All Healthy';
    if (healthyCounts / totalServices >= 0.8) return 'Mostly Healthy';
    if (healthyCounts / totalServices >= 0.5) return 'Some Issues';
    return 'Critical Issues';
  }

  getOverallHealthSeverity(): 'success' | 'info' | 'warning' | 'danger' {
    const healthyCounts = this.servicesList.filter(s => s.status === 'healthy').length;
    const totalServices = this.servicesList.length;

    if (totalServices === 0) return 'info';
    if (healthyCounts === totalServices) return 'success';
    if (healthyCounts / totalServices >= 0.8) return 'info';
    if (healthyCounts / totalServices >= 0.5) return 'warning';
    return 'danger';
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      'healthy': 'success',
      'warning': 'warning',
      'error': 'danger'
    };
    return severityMap[status] || 'info';
  }

  getReliabilitySeverity(reliability: number): 'success' | 'info' | 'warning' | 'danger' {
    if (reliability >= 95) return 'success';
    if (reliability >= 80) return 'info';
    if (reliability >= 50) return 'warning';
    return 'danger';
  }

  formatTimestamp(timestamp?: string): string {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  }

  showTestReloadDialog(): void {
    this.testReloadRequest = {
      category: '',
      environment: 'development',
      changeReason: 'Test reload from dashboard'
    };
    this.showTestDialog = true;
  }

  closeTestDialog(): void {
    this.showTestDialog = false;
  }

  executeTestReload(): void {
    if (!this.testReloadRequest.category || !this.testReloadRequest.environment) return;

    this.testing = true;

    this.configService.forceReload(this.testReloadRequest).subscribe({
      next: (result) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Reload Successful',
          detail: `Configuration reload completed for ${result.category}:${result.environment}`
        });
        this.closeTestDialog();
        this.testing = false;
        // Refresh stats after test
        setTimeout(() => this.loadStats(), 1000);
      },
      error: (error) => {
        console.error('Test reload failed:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Reload Failed',
          detail: error.error?.message || 'Failed to execute test reload'
        });
        this.testing = false;
      }
    });
  }

  showServiceDetails(service: ServiceStats): void {
    this.selectedServiceDetails = service;
    this.showDetailsDialog = true;
  }

  showError(service: ServiceStats): void {
    this.messageService.add({
      severity: 'error',
      summary: `${service.name} Error`,
      detail: service.lastError,
      life: 10000
    });
  }

  confirmResetStats(): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to reset all hot reload statistics? This action cannot be undone.',
      header: 'Confirm Reset',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.resetStats();
      }
    });
  }

  private resetStats(): void {
    this.configService.resetReloadStats().subscribe({
      next: (result) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Stats Reset',
          detail: 'Hot reload statistics have been reset successfully'
        });
        this.loadStats();
      },
      error: (error) => {
        console.error('Failed to reset stats:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Reset Failed',
          detail: 'Failed to reset statistics'
        });
      }
    });
  }
}
