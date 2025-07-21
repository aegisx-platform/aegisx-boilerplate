import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { MeterGroupModule } from 'primeng/metergroup';

import { StorageService, StorageStats } from '../../services/storage.service';

interface AnalyticsCard {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon: string;
  color: string;
}

@Component({
  selector: 'app-storage-analytics',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ChartModule,
    ProgressBarModule,
    TagModule,
    DividerModule,
    SkeletonModule,
    ButtonModule,
    MeterGroupModule
  ],
  template: `
    <div class="storage-analytics">
      <!-- Header -->
      <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 mb-4">
        <h2 class="text-xl sm:text-2xl font-semibold m-0">Storage Analytics</h2>
        <p-button
          icon="pi pi-refresh"
          [text]="true"
          (click)="loadAnalytics()"
          [loading]="loading"
          pTooltip="Refresh Data"
          tooltipPosition="top"
          size="small"
        ></p-button>
      </div>

      <!-- Analytics Cards -->
      <div class="analytics-cards-container">
        <div class="analytics-card-wrapper" *ngFor="let card of analyticsCards">
          <p-card class="analytics-card h-full">
            <div class="flex align-items-center justify-content-between">
              <div class="flex-1 min-w-0">
                <div class="text-xs sm:text-sm text-gray-500 mb-1">{{ card.title }}</div>
                <div class="text-lg sm:text-xl lg:text-2xl font-semibold mb-2 truncate">
                  <ng-container *ngIf="!loading">{{ card.value }}</ng-container>
                  <p-skeleton *ngIf="loading" width="3rem" height="1.5rem"></p-skeleton>
                </div>
                <div *ngIf="card.change && !loading" class="text-xs sm:text-sm">
                  <span [class]="getChangeClass(card.changeType!)">
                    <i [class]="getChangeIcon(card.changeType!)"></i>
                    {{ card.change }}%
                  </span>
                  <span class="text-gray-500 ml-1 hidden sm:inline">from last month</span>
                </div>
              </div>
              <div class="analytics-icon flex-shrink-0">
                <i [class]="card.icon"></i>
              </div>
            </div>
          </p-card>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-container mt-3 sm:mt-4">
        <!-- Storage Usage Chart -->
        <div class="chart-main">
          <p-card class="h-full">
            <ng-template pTemplate="header">
              <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-2 p-3">
                <span class="font-semibold text-sm sm:text-base">Storage Usage by Type</span>
                <p-tag value="Last 30 Days" severity="info" class="text-xs"></p-tag>
              </div>
            </ng-template>

            <div *ngIf="!loading" class="chart-container">
              <p-chart
                type="doughnut"
                [data]="fileTypeChartData"
                [options]="chartOptions"
                [style]="{ height: chartHeight }"
              ></p-chart>
            </div>

            <div *ngIf="loading" class="text-center py-6 sm:py-8">
              <p-skeleton [width]="skeletonSize" [height]="skeletonSize" shape="circle" class="mx-auto"></p-skeleton>
            </div>
          </p-card>
        </div>

        <!-- Storage Quota -->
        <div class="chart-sidebar">
          <p-card class="h-full">
            <ng-template pTemplate="header">
              <div class="p-3">
                <span class="font-semibold text-sm sm:text-base">Storage Quota</span>
              </div>
            </ng-template>

            <div *ngIf="!loading && stats?.quotaInfo" class="storage-quota">
              <!-- Quota Progress -->
              <div class="text-center mb-3 sm:mb-4">
                <div class="text-2xl sm:text-3xl font-bold mb-2" [style.color]="getQuotaColor()">
                  {{ getQuotaValue(stats, 'percentageUsed').toFixed(1) }}%
                </div>
                <div class="text-gray-500 text-sm">Used</div>
              </div>

              <p-progressBar
                [value]="getQuotaValue(stats, 'percentageUsed')"
                [style]="{ height: '8px' }"
                [color]="getQuotaColor()"
              ></p-progressBar>

              <div class="flex justify-content-between text-xs sm:text-sm text-gray-600 mt-2">
                <span>{{ formatFileSize(getQuotaValue(stats, 'usedStorage')) }}</span>
                <span>{{ formatFileSize(getQuotaValue(stats, 'maxStorage')) }}</span>
              </div>

              <p-divider></p-divider>

              <!-- Quota Details -->
              <div class="quota-details">
                <div class="flex justify-content-between align-items-center py-2">
                  <span class="text-sm">Files Used:</span>
                  <span class="font-semibold text-sm">
                    {{ getQuotaValue(stats, 'usedFiles') }} / {{ getQuotaValue(stats, 'maxFiles') }}
                  </span>
                </div>
                <div class="flex justify-content-between align-items-center py-2">
                  <span class="text-sm">Available Space:</span>
                  <span class="font-semibold text-green-600 text-sm">
                    {{ formatFileSize(getQuotaValue(stats, 'maxStorage') - getQuotaValue(stats, 'usedStorage')) }}
                  </span>
                </div>
              </div>
            </div>

            <div *ngIf="loading" class="text-center py-4">
              <p-skeleton width="100%" height="2rem" class="mb-3"></p-skeleton>
              <p-skeleton width="100%" height="1rem" class="mb-2"></p-skeleton>
              <p-skeleton width="100%" height="1rem" class="mb-2"></p-skeleton>
              <p-skeleton width="100%" height="1rem"></p-skeleton>
            </div>

            <div *ngIf="!loading && !stats?.quotaInfo" class="text-center py-4">
              <i class="pi pi-info-circle text-3xl sm:text-4xl text-gray-400"></i>
              <div class="text-gray-500 mt-2 text-sm">No quota information available</div>
            </div>
          </p-card>
        </div>
      </div>

      <!-- Bottom Charts Row -->
      <div class="bottom-charts-container mt-3 sm:mt-4">
        <!-- Data Classification Chart -->
        <div class="bottom-chart">
          <p-card class="h-full">
            <ng-template pTemplate="header">
              <div class="p-3">
                <span class="font-semibold text-sm sm:text-base">Files by Classification</span>
              </div>
            </ng-template>

            <div *ngIf="!loading" class="chart-container">
              <p-chart
                type="bar"
                [data]="classificationChartData"
                [options]="barChartOptions"
                [style]="{ height: chartHeight }"
              ></p-chart>
            </div>

            <div *ngIf="loading" class="text-center py-6 sm:py-8">
              <p-skeleton width="100%" height="200px"></p-skeleton>
            </div>
          </p-card>
        </div>

        <!-- Recent Activity -->
        <div class="bottom-chart">
          <p-card class="h-full">
            <ng-template pTemplate="header">
              <div class="p-3">
                <span class="font-semibold text-sm sm:text-base">Recent Activity</span>
              </div>
            </ng-template>

            <div *ngIf="!loading" class="activity-summary">
              <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-2 p-3 border-round bg-green-50 mb-3">
                <div class="flex align-items-center gap-2 sm:gap-3">
                  <i class="pi pi-upload text-green-600 text-lg sm:text-xl"></i>
                  <div>
                    <div class="font-semibold text-sm sm:text-base">Uploads Today</div>
                    <div class="text-xs sm:text-sm text-gray-600 hidden sm:block">Files uploaded in the last 24 hours</div>
                  </div>
                </div>
                <div class="text-xl sm:text-2xl font-bold text-green-600">
                  {{ stats?.recentActivity?.uploads || 0 }}
                </div>
              </div>

              <div class="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-2 p-3 border-round bg-blue-50 mb-3">
                <div class="flex align-items-center gap-2 sm:gap-3">
                  <i class="pi pi-download text-blue-600 text-lg sm:text-xl"></i>
                  <div>
                    <div class="font-semibold text-sm sm:text-base">Downloads Today</div>
                    <div class="text-xs sm:text-sm text-gray-600 hidden sm:block">Files downloaded in the last 24 hours</div>
                  </div>
                </div>
                <div class="text-xl sm:text-2xl font-bold text-blue-600">
                  {{ stats?.recentActivity?.downloads || 0 }}
                </div>
              </div>

              <!-- Activity Meter -->
              <div class="mt-3 sm:mt-4" *ngIf="activityMeterData.length > 0">
                <p-meterGroup 
                  [value]="activityMeterData" 
                  labelPosition="end"
                ></p-meterGroup>
              </div>
            </div>

            <div *ngIf="loading">
              <p-skeleton width="100%" height="3rem" class="mb-3"></p-skeleton>
              <p-skeleton width="100%" height="3rem" class="mb-3"></p-skeleton>
              <p-skeleton width="100%" height="2rem"></p-skeleton>
            </div>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .storage-analytics {
      padding: 0.75rem;
      height: 100%;
      overflow-y: auto !important;
      box-sizing: border-box;
      max-height: calc(100vh - 160px);
    }

    @media (min-width: 768px) {
      .storage-analytics {
        padding: 1rem;
      }
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

    /* Charts Layout */
    .charts-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    @media (min-width: 992px) {
      .charts-container {
        grid-template-columns: 2fr 1fr;
      }
    }

    .chart-main,
    .chart-sidebar {
      width: 100%;
    }

    /* Bottom Charts Layout */
    .bottom-charts-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    @media (min-width: 992px) {
      .bottom-charts-container {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .bottom-chart {
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

    .storage-quota {
      text-align: center;
    }

    .quota-details {
      text-align: left;
    }

    .activity-summary .p-metergroup {
      margin-top: 1rem;
    }

    .chart-container {
      position: relative;
      width: 100%;
      overflow: hidden;
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

    /* Chart responsiveness */
    :host ::ng-deep .p-chart {
      position: relative;
    }

    :host ::ng-deep .p-chart canvas {
      max-width: 100% !important;
      height: auto !important;
    }

    /* Progress bar styling */
    :host ::ng-deep .p-progressbar {
      border-radius: 6px;
      overflow: hidden;
    }

    :host ::ng-deep .p-progressbar .p-progressbar-value {
      border-radius: 6px;
      transition: width 0.3s ease;
    }

    /* Skeleton loading improvements */
    :host ::ng-deep .p-skeleton {
      border-radius: 6px;
    }

    /* Mobile optimizations */
    @media (max-width: 576px) {
      .storage-analytics {
        padding: 0.5rem;
      }

      :host ::ng-deep .p-card .p-card-body {
        padding: 0.75rem;
      }

      .analytics-icon {
        width: 2rem;
        height: 2rem;
        font-size: 1rem;
      }
    }

    /* Tablet and up optimizations */
    @media (min-width: 1200px) {
      .chart-container {
        min-height: 300px;
      }
    }

    /* Hide scrollbars but keep functionality */
    .storage-analytics::-webkit-scrollbar {
      width: 0px;
      background: transparent;
    }
  `]
})
export class StorageAnalyticsComponent implements OnInit, OnDestroy {
  private storageService = inject(StorageService);
  private subscriptions = new Subscription();

  // Data
  stats: StorageStats | null = null;
  loading = false;

  // Analytics cards data
  analyticsCards: AnalyticsCard[] = [];

  // Chart data
  fileTypeChartData: any = {};
  classificationChartData: any = {};
  activityMeterData: any[] = [];

  // Responsive properties
  chartHeight = '300px';
  skeletonSize = '200px';

  // Chart options
  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      }
    }
  };

  barChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  ngOnInit() {
    this.updateResponsiveSettings();
    this.loadAnalytics();
    
    // Listen for window resize
    window.addEventListener('resize', () => {
      this.updateResponsiveSettings();
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    // Remove resize listener
    window.removeEventListener('resize', this.updateResponsiveSettings);
  }

  private updateResponsiveSettings() {
    const width = window.innerWidth;
    
    if (width < 576) {
      // Mobile
      this.chartHeight = '250px';
      this.skeletonSize = '150px';
    } else if (width < 768) {
      // Small tablet
      this.chartHeight = '280px';
      this.skeletonSize = '180px';
    } else if (width < 992) {
      // Medium tablet
      this.chartHeight = '300px';
      this.skeletonSize = '200px';
    } else if (width < 1200) {
      // Large tablet/small desktop
      this.chartHeight = '320px';
      this.skeletonSize = '210px';
    } else {
      // Large desktop
      this.chartHeight = '350px';
      this.skeletonSize = '220px';
    }

    // Update chart options for better mobile experience
    if (width < 768) {
      this.chartOptions = {
        ...this.chartOptions,
        plugins: {
          ...this.chartOptions.plugins,
          legend: {
            position: 'bottom' as const,
            labels: {
              usePointStyle: true,
              padding: 10,
              font: {
                size: 10
              }
            }
          }
        }
      };

      this.barChartOptions = {
        ...this.barChartOptions,
        plugins: {
          ...this.barChartOptions.plugins,
          legend: {
            display: false
          }
        },
        scales: {
          ...this.barChartOptions.scales,
          x: {
            ticks: {
              font: {
                size: 10
              }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: {
                size: 10
              }
            }
          }
        }
      };
    }
  }

  loadAnalytics() {
    this.loading = true;
    
    this.storageService.getStorageStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.updateAnalyticsCards();
        this.updateChartData();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.loading = false;
      }
    });
  }

  private updateAnalyticsCards() {
    if (!this.stats) return;

    this.analyticsCards = [
      {
        title: 'Total Files',
        value: this.stats.totalFiles.toLocaleString(),
        change: 12.5,
        changeType: 'increase',
        icon: 'pi pi-file',
        color: '#3b82f6'
      },
      {
        title: 'Total Size',
        value: this.formatFileSize(this.stats.totalSize),
        change: 8.2,
        changeType: 'increase',
        icon: 'pi pi-database',
        color: '#10b981'
      },
      {
        title: 'Average File Size',
        value: this.formatFileSize(this.stats.averageFileSize),
        change: -3.1,
        changeType: 'decrease',
        icon: 'pi pi-chart-bar',
        color: '#f59e0b'
      },
      {
        title: 'Largest File',
        value: this.formatFileSize(this.stats.largestFile),
        change: 5.7,
        changeType: 'increase',
        icon: 'pi pi-star',
        color: '#ef4444'
      }
    ];
  }

  private updateChartData() {
    if (!this.stats) return;

    // File type chart
    const mimeTypes = Object.entries(this.stats.filesByMimeType);
    this.fileTypeChartData = {
      labels: mimeTypes.map(([type]) => this.getFileTypeLabel(type)),
      datasets: [{
        data: mimeTypes.map(([, count]) => count),
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#06b6d4',
          '#f97316'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };

    // Classification chart
    const classifications = Object.entries(this.stats.filesByClassification);
    this.classificationChartData = {
      labels: classifications.map(([classification]) => 
        classification.charAt(0).toUpperCase() + classification.slice(1)
      ),
      datasets: [{
        label: 'Files',
        data: classifications.map(([, count]) => count),
        backgroundColor: [
          '#10b981', // public - green
          '#3b82f6', // internal - blue
          '#f59e0b', // confidential - yellow
          '#ef4444'  // restricted - red
        ],
        borderRadius: 4
      }]
    };

    // Activity meter
    const totalActivity = (this.stats.recentActivity?.uploads || 0) + (this.stats.recentActivity?.downloads || 0);
    if (totalActivity > 0) {
      this.activityMeterData = [
        { 
          label: 'Uploads', 
          value: ((this.stats.recentActivity?.uploads || 0) / totalActivity) * 100,
          color: '#10b981'
        },
        { 
          label: 'Downloads', 
          value: ((this.stats.recentActivity?.downloads || 0) / totalActivity) * 100,
          color: '#3b82f6'
        }
      ];
    } else {
      this.activityMeterData = [];
    }
  }

  private getFileTypeLabel(mimeType: string): string {
    const typeLabels: Record<string, string> = {
      'image/': 'Images',
      'video/': 'Videos',
      'audio/': 'Audio',
      'application/pdf': 'PDFs',
      'application/': 'Documents',
      'text/': 'Text Files'
    };

    for (const [prefix, label] of Object.entries(typeLabels)) {
      if (mimeType.startsWith(prefix)) {
        return label;
      }
    }

    return 'Other';
  }

  formatFileSize(bytes: number): string {
    return this.storageService.formatFileSize(bytes);
  }

  getQuotaColor(): string {
    if (!this.stats?.quotaInfo) return '#3b82f6';
    
    const percentage = this.stats.quotaInfo.percentageUsed;
    if (percentage >= 90) return '#ef4444'; // red
    if (percentage >= 75) return '#f59e0b'; // yellow
    return '#10b981'; // green
  }

  getChangeClass(changeType: 'increase' | 'decrease'): string {
    return changeType === 'increase' ? 'text-green-600' : 'text-red-600';
  }

  getChangeIcon(changeType: 'increase' | 'decrease'): string {
    return changeType === 'increase' ? 'pi pi-arrow-up' : 'pi pi-arrow-down';
  }

  getQuotaValue(stats: StorageStats | null, key: string): number {
    if (!stats?.quotaInfo) return 0;
    return (stats.quotaInfo as any)[key] || 0;
  }
}