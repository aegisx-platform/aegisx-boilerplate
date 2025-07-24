import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

// PrimeNG imports
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';

import { MessageService, ConfirmationService } from 'primeng/api';

import {
  ConfigurationService,
  SystemConfiguration,
  ConfigurationTemplate
} from '../../services/configuration.service';

// Import child components
import { ConfigurationListComponent } from '../configuration-list/configuration-list.component';
import { ConfigurationFormComponent } from '../configuration-form/configuration-form.component';
import { ConfigurationTemplatesComponent } from '../configuration-templates/configuration-templates.component';
import { HotReloadStatsComponent } from '../hot-reload-stats/hot-reload-stats.component';

@Component({
  selector: 'app-configuration-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    CardModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    BreadcrumbModule,
    DividerModule,
    TagModule,
    ConfigurationListComponent,
    ConfigurationFormComponent,
    ConfigurationTemplatesComponent,
    HotReloadStatsComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="configuration-manager">
      <!-- Header Breadcrumb -->
      <!-- <div class="breadcrumb-container mb-6">
        <p-breadcrumb [model]="breadcrumbItems" [home]="homeBreadcrumb"></p-breadcrumb>
      </div> -->

      <!-- Main Content Tabs -->
      <p-tabs [(value)]="activeTabValue" class="configuration-tabs">
        <p-tablist>
          <p-tab value="configurations">
            <div class="flex items-center gap-2">
              <i class="pi pi-list"></i>
              <span>Configurations</span>
              <p-tag
                *ngIf="totalConfigurations > 0"
                [value]="totalConfigurations.toString()"
                severity="info"
                class="text-xs ml-1">
              </p-tag>
            </div>
          </p-tab>

          <p-tab value="templates">
            <div class="flex items-center gap-2">
              <i class="pi pi-clone"></i>
              <span>Templates</span>
              <p-tag
                *ngIf="totalTemplates > 0"
                [value]="totalTemplates.toString()"
                severity="secondary"
                class="text-xs ml-1">
              </p-tag>
            </div>
          </p-tab>

          <p-tab value="monitoring">
            <div class="flex items-center gap-2">
              <i class="pi pi-chart-line"></i>
              <span>Hot Reload Stats</span>
              <p-tag
                *ngIf="reloadSuccessRate !== null"
                [value]="reloadSuccessRate + '%'"
                [severity]="getSuccessRateSeverity()"
                class="text-xs ml-1">
              </p-tag>
            </div>
          </p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- Configurations Tab -->
          <p-tabpanel value="configurations">
            <div class="configurations-tab">

              <!-- Configuration List -->
              <app-configuration-list
                [selectedCategory]="selectedCategory"
                [selectedEnvironment]="selectedEnvironment"
                (configurationSelected)="onConfigurationSelected($event)"
                (configurationUpdated)="onConfigurationUpdated($event)">
              </app-configuration-list>
            </div>
          </p-tabpanel>

          <!-- Templates Tab -->
          <p-tabpanel value="templates">
            <div class="templates-tab">

              <!-- Templates Component -->
              <app-configuration-templates
                [selectedCategory]="selectedCategory"
                (templateApplied)="onTemplateApplied($event)">
              </app-configuration-templates>
            </div>
          </p-tabpanel>

          <!-- Monitoring Tab -->
          <p-tabpanel value="monitoring">
            <div class="monitoring-tab">

              <!-- Hot Reload Stats Component -->
              <app-hot-reload-stats></app-hot-reload-stats>
            </div>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <!-- Configuration Form Dialog -->
      <app-configuration-form
        [(visible)]="showConfigForm"
        [configuration]="selectedConfiguration"
        [mode]="formMode"
        (configurationSaved)="onConfigurationSaved($event)"
        (configurationUpdated)="onConfigurationFormUpdated($event)">
      </app-configuration-form>

      <!-- History Dialog -->
      <p-dialog
        [(visible)]="showHistoryDialog"
        [modal]="true"
        [header]="'Configuration History: ' + (selectedConfiguration?.configKey || '')"
        [style]="{ width: '800px', maxWidth: '90vw' }"
        [closable]="true">

        <div *ngIf="selectedConfiguration" class="history-content">
          <p class="text-sm text-gray-600 mb-4">
            Configuration history for <strong>{{ selectedConfiguration.category }}:{{ selectedConfiguration.configKey }}</strong>
          </p>

          <!-- History implementation would go here -->
          <div class="text-center py-8 text-gray-500">
            <i class="pi pi-history text-3xl mb-2 block"></i>
            <p>Configuration history feature</p>
            <p class="text-sm">Coming soon...</p>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <p-button
            label="Close"
            (onClick)="closeHistoryDialog()"
            severity="secondary">
          </p-button>
        </ng-template>
      </p-dialog>
    </div>

    <!-- Toast Messages -->
    <p-toast></p-toast>

    <!-- Confirmation Dialog -->
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .configuration-manager {
      padding: 1rem;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .breadcrumb-container {
      flex-shrink: 0;
    }

    .configuration-tabs {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    :host ::ng-deep .configuration-tabs .p-tabs-panels {
      flex: 1;
      overflow: hidden;
    }

    :host ::ng-deep .configuration-tabs .p-tabs-panel {
      height: 100%;
      overflow-y: auto;
      padding: 1rem 0;
    }

    .configurations-tab,
    .templates-tab,
    .monitoring-tab {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .configurations-tab app-configuration-list,
    .templates-tab app-configuration-templates,
    .monitoring-tab app-hot-reload-stats {
      flex: 1;
      min-height: 0;
    }

    :host ::ng-deep .p-breadcrumb {
      background: transparent;
      border: none;
      padding: 0;
    }

    :host ::ng-deep .p-breadcrumb .p-breadcrumb-list {
      background: var(--surface-ground);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      border: 1px solid var(--surface-border);
    }

    /* Tab styling */
    :host ::ng-deep .p-tabs .p-tablist .p-tab {
      margin-right: 0.25rem;
    }

    :host ::ng-deep .p-tabs .p-tablist .p-tab .p-tab-header-content {
      padding: 0.75rem 1rem;
    }

    /* History dialog */
    .history-content {
      min-height: 300px;
    }

    /* Ensure proper scrolling in nested components */
    :host ::ng-deep app-configuration-list,
    :host ::ng-deep app-configuration-templates,
    :host ::ng-deep app-hot-reload-stats {
      height: 100%;
      overflow-y: auto;
    }

    /* Remove card shadows and use borders */
    :host ::ng-deep .p-card {
      border: 1px solid #e5e7eb;
      box-shadow: none;
    }
  `]
})
export class ConfigurationManagerComponent implements OnInit, OnDestroy {
  private configService = inject(ConfigurationService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private subscriptions: Subscription[] = [];

  // Navigation
  activeTabValue = 'configurations';
  breadcrumbItems = [
    { label: 'Admin', routerLink: '/admin' },
    { label: 'Configuration Management' }
  ];
  homeBreadcrumb = { icon: 'pi pi-home', routerLink: '/admin' };

  // State
  selectedCategory?: string;
  selectedEnvironment?: string;
  totalConfigurations = 0;
  totalTemplates = 0;
  reloadSuccessRate: number | null = null;

  // Form state
  showConfigForm = false;
  formMode: 'create' | 'edit' = 'create';
  selectedConfiguration: SystemConfiguration | null = null;

  // History dialog
  showHistoryDialog = false;

  ngOnInit(): void {
    this.loadInitialData();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadInitialData(): void {
    // Load basic statistics for tabs
    this.loadConfigurationCount();
    this.loadTemplateCount();
    this.loadReloadStats();
  }

  private setupSubscriptions(): void {
    // Listen for configuration updates
    const configUpdateSub = this.configService.configurationUpdated$.subscribe(update => {
      if (update) {
        this.loadConfigurationCount();
        // Optionally refresh other data based on the update
      }
    });
    this.subscriptions.push(configUpdateSub);
  }

  private loadConfigurationCount(): void {
    // Load total configuration count for tab badge
    this.configService.searchConfigurations({ page: 1, limit: 1 }).subscribe({
      next: (result) => {
        this.totalConfigurations = result.total;
      },
      error: (error) => {
        console.error('Failed to load configuration count:', error);
      }
    });
  }

  private loadTemplateCount(): void {
    this.configService.getTemplates().subscribe({
      next: (templates) => {
        this.totalTemplates = templates.length;
      },
      error: (error) => {
        console.error('Failed to load template count:', error);
      }
    });
  }

  private loadReloadStats(): void {
    this.configService.getReloadStats().subscribe({
      next: (stats) => {
        // Calculate overall success rate
        const services = Object.values(stats.services);
        const totalSuccess = services.reduce((sum, service) => sum + service.successCount, 0);
        const totalOperations = services.reduce((sum, service) =>
          sum + service.successCount + service.errorCount, 0);

        this.reloadSuccessRate = totalOperations > 0
          ? Math.round((totalSuccess / totalOperations) * 100)
          : null;
      },
      error: (error) => {
        console.error('Failed to load reload stats:', error);
        this.reloadSuccessRate = null;
      }
    });
  }

  getSuccessRateSeverity(): 'success' | 'info' | 'warning' | 'danger' {
    if (this.reloadSuccessRate === null) return 'info';
    if (this.reloadSuccessRate >= 95) return 'success';
    if (this.reloadSuccessRate >= 80) return 'info';
    if (this.reloadSuccessRate >= 50) return 'warning';
    return 'danger';
  }

  onTabChange(value: string): void {
    this.activeTabValue = value;
  }

  // Configuration Form Methods
  showCreateForm(): void {
    this.selectedConfiguration = null;
    this.formMode = 'create';
    this.showConfigForm = true;
  }

  showEditForm(configuration: SystemConfiguration): void {
    this.selectedConfiguration = configuration;
    this.formMode = 'edit';
    this.showConfigForm = true;
  }

  onConfigurationSaved(configuration: SystemConfiguration): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Configuration created successfully'
    });
    this.loadConfigurationCount();
  }

  onConfigurationFormUpdated(configuration: SystemConfiguration): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Configuration updated successfully'
    });
    this.loadConfigurationCount();
  }

  // Configuration List Event Handlers
  onConfigurationSelected(configuration: SystemConfiguration): void {
    // Handle configuration selection (e.g., show history)
    this.selectedConfiguration = configuration;
    this.showHistoryDialog = true;
  }

  onConfigurationUpdated(event: void): void {
    // Refresh data when configurations are updated
    this.loadConfigurationCount();
  }

  // Template Event Handlers
  onTemplateApplied(event: {
    template: ConfigurationTemplate;
    results: { created: SystemConfiguration[]; updated: SystemConfiguration[]; skipped: string[] };
  }): void {
    const { template, results } = event;

    this.messageService.add({
      severity: 'success',
      summary: 'Template Applied',
      detail: `${template.display_name}: Created ${results.created.length}, Updated ${results.updated.length}, Skipped ${results.skipped.length}`
    });

    // Refresh configuration count and switch to configurations tab
    this.loadConfigurationCount();
    this.activeTabValue = 'configurations';
  }

  // History Dialog Methods
  closeHistoryDialog(): void {
    this.showHistoryDialog = false;
    this.selectedConfiguration = null;
  }

  // Filter Methods (for future use)
  setCategoryFilter(category: string): void {
    this.selectedCategory = category;
  }

  setEnvironmentFilter(environment: string): void {
    this.selectedEnvironment = environment;
  }

  clearFilters(): void {
    this.selectedCategory = undefined;
    this.selectedEnvironment = undefined;
  }
}
