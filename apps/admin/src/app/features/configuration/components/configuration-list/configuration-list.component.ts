import { Component, OnInit, OnDestroy, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { PanelModule } from 'primeng/panel';
import { AccordionModule } from 'primeng/accordion';

import { MessageService, ConfirmationService } from 'primeng/api';

import { 
  ConfigurationService, 
  SystemConfiguration, 
  ConfigurationMetadata,
  ConfigurationSearchParams 
} from '../../services/configuration.service';

interface FilterOptions {
  category: string;
  environment: string;
  valueType: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-configuration-list',
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
    MenuModule,
    ConfirmDialogModule,
    DialogModule,
    TextareaModule,
    CheckboxModule,
    ToastModule,
    ProgressSpinnerModule,
    CardModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    PanelModule,
    AccordionModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="configuration-list">
      <!-- Search and Filters -->
      <div class="mb-6">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold text-gray-800">Configuration Management</h3>
              <div class="flex gap-2">
                <p-button 
                  icon="pi pi-refresh" 
                  [loading]="loading"
                  (onClick)="loadConfigurations()"
                  pTooltip="Refresh configurations"
                  tooltipPosition="top"
                  severity="secondary"
                  size="small">
                </p-button>
                <p-button 
                  icon="pi pi-plus" 
                  label="Add Configuration"
                  (onClick)="showCreateDialog = true"
                  severity="primary"
                  size="small">
                </p-button>
              </div>
            </div>
          </ng-template>
          
          <ng-template pTemplate="content">
            <div class="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
              <!-- Search -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <p-iconfield iconPosition="left">
                  <p-inputicon>
                    <i class="pi pi-search"></i>
                  </p-inputicon>
                  <input 
                    pInputText 
                    [(ngModel)]="searchTerm"
                    placeholder="Search configurations..." 
                    (input)="onSearch()"
                    class="w-full">
                </p-iconfield>
              </div>

              <!-- Category Filter -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <p-select 
                  [(ngModel)]="filters.category"
                  [options]="categoryOptions"
                  placeholder="All Categories"
                  (onChange)="onFilterChange()"
                  [showClear]="true"
                  class="w-full">
                </p-select>
              </div>

              <!-- Environment Filter -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                <p-select 
                  [(ngModel)]="filters.environment"
                  [options]="environmentOptions"
                  placeholder="All Environments"
                  (onChange)="onFilterChange()"
                  [showClear]="true"
                  class="w-full">
                </p-select>
              </div>

              <!-- Value Type Filter -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <p-select 
                  [(ngModel)]="filters.valueType"
                  [options]="valueTypeOptions"
                  placeholder="All Types"
                  (onChange)="onFilterChange()"
                  [showClear]="true"
                  class="w-full">
                </p-select>
              </div>

              <!-- Sort -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <p-select 
                  [(ngModel)]="filters.sortBy"
                  [options]="sortOptions"
                  (onChange)="onFilterChange()"
                  class="w-full">
                </p-select>
              </div>
            </div>
          </ng-template>
        </p-card>
      </div>

      <!-- Configuration Table -->
      <div class="bg-white rounded-lg shadow">
        <p-table 
          [value]="configurations"
          [loading]="loading"
          [paginator]="true"
          [rows]="20"
          [totalRecords]="totalRecords"
          [lazy]="true"
          (onLazyLoad)="onLazyLoad($event)"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} configurations"
          [rowsPerPageOptions]="[10, 20, 50]"
          styleClass="p-datatable-sm"
          [scrollable]="true"
          scrollHeight="600px">
          
          <!-- Table Header -->
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="category" class="w-32">
                Category
                <p-sortIcon field="category"></p-sortIcon>
              </th>
              <th pSortableColumn="config_key" class="w-48">
                Key
                <p-sortIcon field="config_key"></p-sortIcon>
              </th>
              <th class="w-64">Value</th>
              <th pSortableColumn="value_type" class="w-24">
                Type
                <p-sortIcon field="value_type"></p-sortIcon>
              </th>
              <th pSortableColumn="environment" class="w-32">
                Environment
                <p-sortIcon field="environment"></p-sortIcon>
              </th>
              <th pSortableColumn="is_active" class="w-24">
                Status
                <p-sortIcon field="is_active"></p-sortIcon>
              </th>
              <th pSortableColumn="updated_at" class="w-40">
                Updated
                <p-sortIcon field="updated_at"></p-sortIcon>
              </th>
              <th class="w-32">Actions</th>
            </tr>
          </ng-template>

          <!-- Table Body -->
          <ng-template pTemplate="body" let-config>
            <tr>
              <!-- Category -->
              <td>
                <p-tag 
                  [value]="config.category" 
                  severity="info"
                  class="text-xs">
                </p-tag>
              </td>

              <!-- Config Key -->
              <td>
                <div class="font-mono text-sm">{{ config.config_key }}</div>
                <div class="text-xs text-gray-500" *ngIf="config.description">
                  {{ config.description }}
                </div>
              </td>

              <!-- Config Value -->
              <td>
                <div class="max-w-xs">
                  <div 
                    class="truncate text-sm font-mono"
                    [pTooltip]="getFormattedValue(config)"
                    tooltipPosition="top">
                    {{ getDisplayValue(config) }}
                  </div>
                </div>
              </td>

              <!-- Value Type -->
              <td>
                <p-tag 
                  [value]="config.value_type" 
                  [severity]="getValueTypeSeverity(config.value_type)"
                  class="text-xs">
                </p-tag>
              </td>

              <!-- Environment -->
              <td>
                <p-tag 
                  [value]="config.environment" 
                  [severity]="getEnvironmentSeverity(config.environment)"
                  class="text-xs">
                </p-tag>
              </td>

              <!-- Status -->
              <td>
                <p-tag 
                  [value]="config.is_active ? 'Active' : 'Inactive'" 
                  [severity]="config.is_active ? 'success' : 'danger'"
                  class="text-xs">
                </p-tag>
              </td>

              <!-- Updated At -->
              <td>
                <div class="text-sm">
                  {{ formatDate(config.updated_at) }}
                </div>
                <div class="text-xs text-gray-500" *ngIf="config.updated_by">
                  by {{ config.updated_by }}
                </div>
              </td>

              <!-- Actions -->
              <td>
                <div class="flex gap-1">
                  <p-button 
                    icon="pi pi-pencil" 
                    (onClick)="editConfiguration(config)"
                    pTooltip="Edit configuration"
                    tooltipPosition="top"
                    severity="secondary"
                    size="small"
                    [text]="true">
                  </p-button>
                  <p-button 
                    icon="pi pi-history" 
                    (onClick)="viewHistory(config)"
                    pTooltip="View history"
                    tooltipPosition="top"
                    severity="info"
                    size="small"
                    [text]="true">
                  </p-button>
                  <p-button 
                    icon="pi pi-trash" 
                    (onClick)="deleteConfiguration(config)"
                    pTooltip="Delete configuration"
                    tooltipPosition="top"
                    severity="danger"
                    size="small"
                    [text]="true">
                  </p-button>
                </div>
              </td>
            </tr>
          </ng-template>

          <!-- Empty State -->
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="8" class="text-center py-8">
                <div class="text-gray-500">
                  <i class="pi pi-search text-3xl mb-2 block"></i>
                  <div>No configurations found</div>
                  <div class="text-sm">Try adjusting your search criteria</div>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Create/Edit Dialog -->
      <p-dialog 
        [(visible)]="showCreateDialog"
        [modal]="true"
        header="Add Configuration"
        [style]="{ width: '600px' }"
        [closable]="true"
        [draggable]="false">
        
        <div class="grid grid-cols-1 gap-4">
          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <input 
              pInputText 
              [(ngModel)]="newConfig.category"
              placeholder="e.g., smtp, database"
              class="w-full">
          </div>

          <!-- Config Key -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Configuration Key *</label>
            <input 
              pInputText 
              [(ngModel)]="newConfig.config_key"
              placeholder="e.g., host, port, username"
              class="w-full">
          </div>

          <!-- Config Value -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Value *</label>
            <p-textarea 
              [(ngModel)]="newConfig.config_value"
              placeholder="Configuration value"
              rows="3"
              class="w-full">
            </p-textarea>
          </div>

          <!-- Value Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Value Type *</label>
            <p-select 
              [(ngModel)]="newConfig.value_type"
              [options]="valueTypeOptions"
              placeholder="Select type"
              class="w-full">
            </p-select>
          </div>

          <!-- Environment -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Environment *</label>
            <p-select 
              [(ngModel)]="newConfig.environment"
              [options]="environmentOptions"
              placeholder="Select environment"
              class="w-full">
            </p-select>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <p-textarea 
              [(ngModel)]="newConfig.description"
              placeholder="Optional description"
              rows="2"
              class="w-full">
            </p-textarea>
          </div>

          <!-- Active Status -->
          <div class="flex items-center">
            <p-checkbox 
              [(ngModel)]="newConfig.is_active"
              binary="true"
              inputId="active">
            </p-checkbox>
            <label for="active" class="ml-2 text-sm">Active</label>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex justify-end gap-2">
            <p-button 
              label="Cancel" 
              (onClick)="showCreateDialog = false"
              severity="secondary">
            </p-button>
            <p-button 
              label="Save" 
              (onClick)="saveConfiguration()"
              [loading]="saving">
            </p-button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- Toast Messages -->
      <p-toast></p-toast>

      <!-- Confirmation Dialog -->
      <p-confirmDialog></p-confirmDialog>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .configuration-list {
      padding: 1rem;
    }
    
    .p-datatable .p-datatable-tbody > tr > td {
      padding: 0.75rem 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .p-datatable .p-datatable-thead > tr > th {
      padding: 1rem 0.5rem;
      background-color: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
      font-weight: 600;
      color: #374151;
    }
    
    .p-tag {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }
    
    .font-mono {
      font-family: 'Courier New', monospace;
    }
  `]
})
export class ConfigurationListComponent implements OnInit, OnDestroy {
  @Input() selectedCategory?: string;
  @Input() selectedEnvironment?: string;
  @Output() configurationSelected = new EventEmitter<SystemConfiguration>();
  @Output() configurationUpdated = new EventEmitter<void>();

  private configService = inject(ConfigurationService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private subscriptions: Subscription[] = [];

  // Data
  configurations: SystemConfiguration[] = [];
  totalRecords = 0;
  loading = false;
  saving = false;

  // Filters and Search
  searchTerm = '';
  filters: FilterOptions = {
    category: '',
    environment: '',
    valueType: '',
    sortBy: 'updated_at',
    sortOrder: 'desc'
  };

  // Dropdown Options
  categoryOptions: { label: string; value: string }[] = [];
  environmentOptions: { label: string; value: string }[] = [];
  valueTypeOptions = [
    { label: 'String', value: 'string' },
    { label: 'Number', value: 'number' },
    { label: 'Boolean', value: 'boolean' },
    { label: 'JSON', value: 'json' }
  ];
  sortOptions = [
    { label: 'Recently Updated', value: 'updated_at' },
    { label: 'Category', value: 'category' },
    { label: 'Key', value: 'config_key' },
    { label: 'Environment', value: 'environment' }
  ];

  // Dialog States
  showCreateDialog = false;
  newConfig: Partial<SystemConfiguration> = {
    is_active: true,
    value_type: 'string',
    environment: 'development'
  };

  ngOnInit(): void {
    this.loadDropdownData();
    this.loadConfigurations();
    this.setupSubscriptions();
    
    // Apply input filters if provided
    if (this.selectedCategory) {
      this.filters.category = this.selectedCategory;
    }
    if (this.selectedEnvironment) {
      this.filters.environment = this.selectedEnvironment;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSubscriptions(): void {
    // Listen for configuration updates
    const updateSub = this.configService.configurationUpdated$.subscribe(update => {
      if (update) {
        this.loadConfigurations();
        this.configurationUpdated.emit();
      }
    });
    this.subscriptions.push(updateSub);
  }

  private loadDropdownData(): void {
    // Load categories
    this.configService.getCategories().subscribe({
      next: (categories) => {
        this.categoryOptions = categories.map(cat => ({
          label: cat.charAt(0).toUpperCase() + cat.slice(1),
          value: cat
        }));
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
      }
    });

    // Load environments
    this.configService.getEnvironments().subscribe({
      next: (environments) => {
        this.environmentOptions = environments.map(env => ({
          label: env.charAt(0).toUpperCase() + env.slice(1),
          value: env
        }));
      },
      error: (error) => {
        console.error('Failed to load environments:', error);
      }
    });
  }

  loadConfigurations(): void {
    this.loading = true;
    
    const searchParams: ConfigurationSearchParams = {
      search: this.searchTerm || undefined,
      category: this.filters.category || undefined,
      environment: this.filters.environment || undefined,
      sortBy: this.filters.sortBy,
      sortOrder: this.filters.sortOrder,
      page: 1,
      limit: 20
    };

    this.configService.searchConfigurations(searchParams).subscribe({
      next: (result) => {
        this.configurations = result.configurations;
        this.totalRecords = result.total;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load configurations:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load configurations'
        });
        this.loading = false;
      }
    });
  }

  onLazyLoad(event: any): void {
    this.loading = true;
    
    const searchParams: ConfigurationSearchParams = {
      search: this.searchTerm || undefined,
      category: this.filters.category || undefined,
      environment: this.filters.environment || undefined,
      sortBy: event.sortField || this.filters.sortBy,
      sortOrder: event.sortOrder === 1 ? 'asc' : 'desc',
      page: Math.floor(event.first / event.rows) + 1,
      limit: event.rows
    };

    this.configService.searchConfigurations(searchParams).subscribe({
      next: (result) => {
        this.configurations = result.configurations;
        this.totalRecords = result.total;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load configurations:', error);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    // Debounce search
    setTimeout(() => {
      this.loadConfigurations();
    }, 300);
  }

  onFilterChange(): void {
    this.loadConfigurations();
  }

  editConfiguration(config: SystemConfiguration): void {
    this.newConfig = { ...config };
    this.showCreateDialog = true;
  }

  deleteConfiguration(config: SystemConfiguration): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the configuration "${config.config_key}" in ${config.category}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.configService.deleteConfiguration(config.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Configuration deleted successfully'
            });
            this.loadConfigurations();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete configuration'
            });
          }
        });
      }
    });
  }

  viewHistory(config: SystemConfiguration): void {
    // Emit event to parent component to show history
    this.configurationSelected.emit(config);
  }

  saveConfiguration(): void {
    if (!this.newConfig.category || !this.newConfig.config_key || !this.newConfig.config_value) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }

    this.saving = true;

    const operation = this.newConfig.id 
      ? this.configService.updateConfiguration(this.newConfig.id, this.newConfig)
      : this.configService.createConfiguration(this.newConfig as Omit<SystemConfiguration, 'id' | 'created_at' | 'updated_at'>);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Configuration ${this.newConfig.id ? 'updated' : 'created'} successfully`
        });
        this.showCreateDialog = false;
        this.newConfig = {
          is_active: true,
          value_type: 'string',
          environment: 'development'
        };
        this.loadConfigurations();
        this.saving = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to ${this.newConfig.id ? 'update' : 'create'} configuration`
        });
        this.saving = false;
      }
    });
  }

  // Utility Methods
  getDisplayValue(config: SystemConfiguration): string {
    return this.configService.formatConfigValue(config.config_value, config.value_type);
  }

  getFormattedValue(config: SystemConfiguration): string {
    if (config.value_type === 'json') {
      try {
        return JSON.stringify(JSON.parse(config.config_value), null, 2);
      } catch {
        return config.config_value;
      }
    }
    return config.config_value;
  }

  getValueTypeSeverity(valueType: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      'string': 'info',
      'number': 'success',
      'boolean': 'warning',
      'json': 'secondary'
    };
    return severityMap[valueType] || 'info';
  }

  getEnvironmentSeverity(environment: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      'development': 'info',
      'staging': 'warning',
      'production': 'danger',
      'test': 'success'
    };
    return severityMap[environment] || 'secondary';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  }
}