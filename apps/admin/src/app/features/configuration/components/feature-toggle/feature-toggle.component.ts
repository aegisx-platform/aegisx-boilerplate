import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { DataViewModule } from 'primeng/dataview';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';

import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfigurationService, SystemConfiguration } from '../../services/configuration.service';
import { FeatureToggleService } from '../../services/feature-toggle.service';

interface FeatureToggle {
  name: string;
  enabled: boolean;
  description?: string;
  category: string;
  environment: string;
  config?: SystemConfiguration;
}

interface FeatureToggleStats {
  total: number;
  enabled: number;
  disabled: number;
  environment: string;
  features: { name: string; enabled: boolean; }[];
  generatedAt: string;
}

@Component({
  selector: 'app-feature-toggle',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ToggleButtonModule,
    SelectModule,
    InputTextModule,
    ToastModule,
    MessageModule,
    ConfirmDialogModule,
    TagModule,
    DataViewModule,
    SkeletonModule,
    DialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Feature Toggles</h1>
          <p class="mt-1 text-sm text-gray-500">Manage feature flags across environments</p>
        </div>
        
        <div class="flex gap-2">
          <button pButton 
                  label="Add Feature" 
                  icon="pi pi-plus"
                  class="p-button-primary"
                  (click)="showAddFeatureDialog()">
          </button>
          
          <button pButton 
                  label="Refresh" 
                  icon="pi pi-refresh"
                  class="p-button-secondary"
                  [loading]="loading"
                  (click)="loadFeatureToggles()">
          </button>
        </div>
      </div>

      <!-- Environment and Stats Card -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <p-card header="Environment & Controls" styleClass="h-full border border-gray-200">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <p-select [options]="categories"
                          [(ngModel)]="selectedCategory"
                          (onChange)="onCategoryChange()"
                          placeholder="Select Category"
                          [showClear]="true"
                          styleClass="w-full">
                </p-select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                <p-select [options]="environments"
                          [(ngModel)]="selectedEnvironment"
                          (onChange)="onEnvironmentChange()"
                          placeholder="Select Environment"
                          [showClear]="true"
                          styleClass="w-full">
                </p-select>
              </div>
              
              <div class="md:col-span-2 mt-2">
                <div class="flex items-center gap-2">
                  <button pButton 
                          label="Bulk Enable All" 
                          icon="pi pi-check-circle"
                          class="p-button-success"
                          [disabled]="loading || featureToggles.length === 0"
                          (click)="bulkToggleAll(true)">
                  </button>
                  
                  <button pButton 
                          label="Bulk Disable All" 
                          icon="pi pi-times-circle"
                          class="p-button-danger"
                          [disabled]="loading || featureToggles.length === 0"
                          (click)="bulkToggleAll(false)">
                  </button>
                </div>
              </div>
            </div>
          </p-card>
        </div>
        
        <!-- Statistics Card -->
        <div>
          <p-card header="Statistics" styleClass="h-full border border-gray-200">
            <div *ngIf="stats" class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Total Features:</span>
                <p-tag [value]="stats.total.toString()" severity="info"></p-tag>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Enabled:</span>
                <p-tag [value]="stats.enabled.toString()" severity="success"></p-tag>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Disabled:</span>
                <p-tag [value]="stats.disabled.toString()" severity="danger"></p-tag>
              </div>
            </div>
            <div *ngIf="!stats && !loading" class="text-center text-gray-500">
              No statistics available
            </div>
            <div *ngIf="loading" class="space-y-2">
              <p-skeleton height="1.5rem"></p-skeleton>
              <p-skeleton height="1.5rem"></p-skeleton>
              <p-skeleton height="1.5rem"></p-skeleton>
            </div>
          </p-card>
        </div>
      </div>

      <!-- Feature Toggles List -->
      <p-card header="Feature Toggles" styleClass="border border-gray-200">
        <div *ngIf="loading" class="space-y-4">
          <div *ngFor="let i of [1,2,3,4,5]" class="flex items-center justify-between p-4 border rounded">
            <div class="flex-1 space-y-2">
              <p-skeleton height="1.25rem" width="60%"></p-skeleton>
              <p-skeleton height="1rem" width="80%"></p-skeleton>
            </div>
            <p-skeleton height="2rem" width="4rem"></p-skeleton>
          </div>
        </div>

        <div *ngIf="!loading && featureToggles.length === 0" class="text-center py-12">
          <i class="pi pi-flag text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No feature toggles</h3>
          <p class="text-gray-500 mb-4">Get started by creating your first feature toggle</p>
          <button pButton 
                  label="Add Feature Toggle" 
                  icon="pi pi-plus"
                  class="p-button-primary"
                  (click)="showAddFeatureDialog()">
          </button>
        </div>

        <div *ngIf="!loading && featureToggles.length > 0" class="space-y-4">
          <div *ngFor="let feature of featureToggles; trackBy: trackByFeatureName"
               class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="font-medium text-gray-900">{{ feature.name }}</h3>
                <p-tag [value]="selectedEnvironment" 
                       [severity]="getEnvironmentSeverity(selectedEnvironment)"
                       styleClass="text-xs">
                </p-tag>
              </div>
              
              <p *ngIf="feature.description" class="text-sm text-gray-600 mb-2">
                {{ feature.description }}
              </p>
              
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <span>Category: {{ feature.category }}</span>
                <span>•</span>
                <span>Status: {{ feature.enabled ? 'Enabled' : 'Disabled' }}</span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <p-toggleButton [(ngModel)]="feature.enabled"
                             onLabel="Enabled"
                             offLabel="Disabled"
                             onIcon="pi pi-check"
                             offIcon="pi pi-times"
                             [disabled]="updatingFeatures.has(feature.name)"
                             (onChange)="toggleFeature(feature)"
                             styleClass="p-button-sm">
              </p-toggleButton>
              
              <button pButton 
                      icon="pi pi-trash"
                      class="p-button-danger p-button-text p-button-sm"
                      [loading]="deletingFeatures.has(feature.name)"
                      (click)="deleteFeature(feature)"
                      pTooltip="Delete feature toggle">
              </button>
            </div>
          </div>
        </div>
      </p-card>
    </div>

    <!-- Add Feature Dialog -->
    <p-dialog header="Add Feature Toggle" 
              [(visible)]="showAddDialog" 
              [modal]="true" 
              [closable]="true"
              [style]="{ width: '500px' }">
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Feature Name <span class="text-red-500">*</span>
          </label>
          <input type="text" 
                 pInputText 
                 [(ngModel)]="newFeature.name"
                 placeholder="e.g., user_dashboard_v2"
                 class="w-full"
                 [class.ng-invalid]="!newFeature.name">
          <small class="text-gray-500">Use lowercase letters, numbers, and underscores only</small>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea pInputTextarea 
                    [(ngModel)]="newFeature.description"
                    placeholder="Brief description of this feature"
                    rows="3"
                    class="w-full">
          </textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <p-select [options]="categoriesForCreate"
                    [(ngModel)]="newFeature.category"
                    placeholder="Select Category"
                    class="w-full">
          </p-select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Environment</label>
          <p-select [options]="environments"
                    [(ngModel)]="newFeature.environment"
                    placeholder="Select Environment"
                    class="w-full">
          </p-select>
        </div>

        <div class="flex items-center gap-2">
          <p-toggleButton [(ngModel)]="newFeature.enabled"
                         onLabel="Enabled"
                         offLabel="Disabled"
                         onIcon="pi pi-check"
                         offIcon="pi pi-times">
          </p-toggleButton>
          <span class="text-sm text-gray-600">Initial State</span>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <button pButton 
                  label="Cancel" 
                  class="p-button-secondary"
                  (click)="showAddDialog = false">
          </button>
          <button pButton 
                  label="Create Feature" 
                  class="p-button-primary"
                  [loading]="creatingFeature"
                  [disabled]="!newFeature.name || creatingFeature"
                  (click)="createFeature()">
          </button>
        </div>
      </ng-template>
    </p-dialog>

    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    :host ::ng-deep .p-card {
      border: 1px solid #e5e7eb;
      box-shadow: none !important;
    }
    
    :host ::ng-deep .p-togglebutton.p-button {
      min-width: 80px;
    }
    
    :host ::ng-deep .p-dataview .p-dataview-header {
      border: none;
      background: transparent;
      padding: 0;
    }
  `]
})
export class FeatureToggleComponent implements OnInit {
  private configService = inject(ConfigurationService);
  private featureToggleService = inject(FeatureToggleService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // Data
  featureToggles: FeatureToggle[] = [];
  stats: FeatureToggleStats | null = null;
  
  // UI State
  loading = false;
  selectedEnvironment = 'development';
  selectedCategory: string | null = null;
  
  environments = [
    { label: 'Development', value: 'development' },
    { label: 'Staging', value: 'staging' },
    { label: 'Production', value: 'production' },
    { label: 'Test', value: 'test' }
  ];

  categories = [
    { label: 'All Categories', value: null },
    { label: 'UI Features', value: 'feature_toggles:ui' },
    { label: 'API Features', value: 'feature_toggles:api' },
    { label: 'Mobile Features', value: 'feature_toggles:mobile' },
    { label: 'Security Features', value: 'feature_toggles:security' },
    { label: 'Analytics', value: 'feature_toggles:analytics' },
    { label: 'Experimental', value: 'feature_toggles:experimental' },
    { label: 'System Features', value: 'feature_toggles:system' }
  ];

  // Categories for create dialog (without "All Categories")
  get categoriesForCreate() {
    return this.categories.filter(c => c.value !== null);
  }

  // Loading states for individual features
  updatingFeatures = new Set<string>();
  deletingFeatures = new Set<string>();

  // Add feature dialog
  showAddDialog = false;
  creatingFeature = false;
  newFeature = {
    name: '',
    description: '',
    category: 'feature_toggles:ui',
    environment: 'development',
    enabled: false
  };

  ngOnInit() {
    this.loadFeatureToggles();
  }

  async loadFeatureToggles() {
    this.loading = true;
    try {
      // For now, use mock data since API endpoints may not be fully ready
      // TODO: Replace with real API calls when ready
      await this.loadMockData();
      
      // Uncomment when API is ready:
      /*
      const featureToggles = await this.featureToggleService.getAllFeatureToggles(this.selectedEnvironment).toPromise();
      
      if (featureToggles) {
        this.featureToggles = Object.entries(featureToggles).map(([name, enabled]) => ({
          name,
          enabled,
          category: 'feature_toggles',
          environment: this.selectedEnvironment,
          description: `Feature toggle for ${name.replace(/_/g, ' ')}`
        }));

        // Update stats based on loaded data
        this.stats = {
          total: this.featureToggles.length,
          enabled: this.featureToggles.filter(f => f.enabled).length,
          disabled: this.featureToggles.filter(f => !f.enabled).length,
          environment: this.selectedEnvironment,
          features: this.featureToggles.map(f => ({ name: f.name, enabled: f.enabled })),
          generatedAt: new Date().toISOString()
        };
      }
      */
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Feature toggles loaded successfully'
      });
    } catch (error) {
      console.error('Failed to load feature toggles:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load feature toggles'
      });
      
      // Fallback to mock data
      await this.loadMockData();
    } finally {
      this.loading = false;
    }
  }

  private async loadMockData() {
    // Mock data until API is implemented
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock data based on selected category
    const mockData: Record<string, FeatureToggle[]> = {
      'feature_toggles:ui': [
        {
          name: 'new_dashboard',
          enabled: true,
          description: 'New user dashboard with improved UI',
          category: 'feature_toggles:ui',
          environment: this.selectedEnvironment
        },
        {
          name: 'dark_mode',
          enabled: false,
          description: 'Dark mode theme support',
          category: 'feature_toggles:ui',
          environment: this.selectedEnvironment
        },
        {
          name: 'advanced_search_ui',
          enabled: true,
          description: 'Advanced search interface',
          category: 'feature_toggles:ui',
          environment: this.selectedEnvironment
        }
      ],
      'feature_toggles:api': [
        {
          name: 'api_v2_endpoints',
          enabled: false,
          description: 'New API v2 endpoints',
          category: 'feature_toggles:api',
          environment: this.selectedEnvironment
        },
        {
          name: 'rate_limiting',
          enabled: true,
          description: 'API rate limiting',
          category: 'feature_toggles:api',
          environment: this.selectedEnvironment
        }
      ],
      'feature_toggles:mobile': [
        {
          name: 'mobile_app_integration',
          enabled: true,
          description: 'Mobile app specific features',
          category: 'feature_toggles:mobile',
          environment: this.selectedEnvironment
        },
        {
          name: 'push_notifications',
          enabled: false,
          description: 'Mobile push notifications',
          category: 'feature_toggles:mobile',
          environment: this.selectedEnvironment
        }
      ],
      'feature_toggles:security': [
        {
          name: 'two_factor_auth',
          enabled: true,
          description: 'Two-factor authentication',
          category: 'feature_toggles:security',
          environment: this.selectedEnvironment
        },
        {
          name: 'session_timeout',
          enabled: false,
          description: 'Enhanced session timeout',
          category: 'feature_toggles:security',
          environment: this.selectedEnvironment
        }
      ],
      'feature_toggles:analytics': [
        {
          name: 'user_tracking',
          enabled: true,
          description: 'Enhanced user behavior tracking',
          category: 'feature_toggles:analytics',
          environment: this.selectedEnvironment
        },
        {
          name: 'performance_metrics',
          enabled: false,
          description: 'Performance monitoring',
          category: 'feature_toggles:analytics',
          environment: this.selectedEnvironment
        }
      ],
      'feature_toggles:experimental': [
        {
          name: 'beta_features',
          enabled: false,
          description: 'Experimental beta features',
          category: 'feature_toggles:experimental',
          environment: this.selectedEnvironment
        }
      ],
      'feature_toggles:system': [
        {
          name: 'maintenance_mode',
          enabled: false,
          description: 'System maintenance mode',
          category: 'feature_toggles:system',
          environment: this.selectedEnvironment
        }
      ]
    };
    
    // If no category selected, show all feature toggles
    if (!this.selectedCategory) {
      this.featureToggles = Object.values(mockData).flat();
    } else {
      this.featureToggles = mockData[this.selectedCategory] || [];
    }

    this.stats = {
      total: this.featureToggles.length,
      enabled: this.featureToggles.filter(f => f.enabled).length,
      disabled: this.featureToggles.filter(f => !f.enabled).length,
      environment: this.selectedEnvironment,
      features: this.featureToggles.map(f => ({ name: f.name, enabled: f.enabled })),
      generatedAt: new Date().toISOString()
    };
  }

  onEnvironmentChange() {
    this.loadFeatureToggles();
  }

  async toggleFeature(feature: FeatureToggle) {
    this.updatingFeatures.add(feature.name);
    
    try {
      const result = await this.featureToggleService.setFeatureToggle(
        feature.name,
        feature.enabled,
        this.selectedEnvironment,
        `Feature '${feature.name}' ${feature.enabled ? 'enabled' : 'disabled'} via UI`
      ).toPromise();
      
      if (result?.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Feature '${feature.name}' ${feature.enabled ? 'enabled' : 'disabled'}`
        });
        
        // Update stats
        if (this.stats) {
          this.stats.enabled = this.featureToggles.filter(f => f.enabled).length;
          this.stats.disabled = this.featureToggles.filter(f => !f.enabled).length;
        }
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('Failed to toggle feature:', error);
      feature.enabled = !feature.enabled; // Revert the change
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to update feature '${feature.name}'`
      });
    } finally {
      this.updatingFeatures.delete(feature.name);
    }
  }

  deleteFeature(feature: FeatureToggle) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the feature toggle '${feature.name}'? This action cannot be undone.`,
      header: 'Delete Feature Toggle',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        this.deletingFeatures.add(feature.name);
        
        try {
          // TODO: Call API to delete feature toggle
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Remove from local array
          this.featureToggles = this.featureToggles.filter(f => f.name !== feature.name);
          
          // Update stats
          if (this.stats) {
            this.stats.total = this.featureToggles.length;
            this.stats.enabled = this.featureToggles.filter(f => f.enabled).length;
            this.stats.disabled = this.featureToggles.filter(f => !f.enabled).length;
          }
          
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Feature toggle '${feature.name}' deleted successfully`
          });
          
        } catch (error) {
          console.error('Failed to delete feature:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to delete feature '${feature.name}'`
          });
        } finally {
          this.deletingFeatures.delete(feature.name);
        }
      }
    });
  }

  bulkToggleAll(enabled: boolean) {
    const action = enabled ? 'enable' : 'disable';
    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} all feature toggles in ${this.selectedEnvironment} environment?`,
      header: `Bulk ${action.charAt(0).toUpperCase() + action.slice(1)} Features`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: enabled ? 'p-button-success' : 'p-button-danger',
      accept: async () => {
        this.loading = true;
        
        try {
          // TODO: Call API for bulk update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Update all features
          this.featureToggles.forEach(feature => {
            feature.enabled = enabled;
          });
          
          // Update stats
          if (this.stats) {
            this.stats.enabled = enabled ? this.featureToggles.length : 0;
            this.stats.disabled = enabled ? 0 : this.featureToggles.length;
          }
          
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `All features ${enabled ? 'enabled' : 'disabled'} successfully`
          });
          
        } catch (error) {
          console.error('Failed to bulk update features:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update feature toggles'
          });
        } finally {
          this.loading = false;
        }
      }
    });
  }

  onCategoryChange() {
    this.loadFeatureToggles();
  }

  showAddFeatureDialog() {
    this.newFeature = {
      name: '',
      description: '',
      category: this.selectedCategory || 'feature_toggles:ui',
      environment: this.selectedEnvironment,
      enabled: false
    };
    this.showAddDialog = true;
  }

  async createFeature() {
    if (!this.newFeature.name) return;
    
    this.creatingFeature = true;
    
    try {
      // Add to local array (mock functionality)
      const newFeature: FeatureToggle = {
        name: this.newFeature.name,
        enabled: this.newFeature.enabled,
        description: this.newFeature.description || `Feature toggle for ${this.newFeature.name.replace(/_/g, ' ')}`,
        category: this.newFeature.category,
        environment: this.newFeature.environment
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (this.newFeature.environment === this.selectedEnvironment && 
          this.newFeature.category === this.selectedCategory) {
        this.featureToggles.push(newFeature);
        
        // Update stats
        this.stats = {
          total: this.featureToggles.length,
          enabled: this.featureToggles.filter(f => f.enabled).length,
          disabled: this.featureToggles.filter(f => !f.enabled).length,
          environment: this.selectedEnvironment,
          features: this.featureToggles.map(f => ({ name: f.name, enabled: f.enabled })),
          generatedAt: new Date().toISOString()
        };
      }
      
      this.showAddDialog = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Feature toggle '${this.newFeature.name}' created successfully`
      });
      
      // TODO: Uncomment when API is ready
      /*
      const result = await this.featureToggleService.setFeatureToggle(
        this.newFeature.name,
        this.newFeature.enabled,
        this.newFeature.environment,
        `Feature '${this.newFeature.name}' created via UI`
      ).toPromise();
      
      if (result?.success) {
        // Reload feature toggles
        await this.loadFeatureToggles();
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
      */
      
    } catch (error) {
      console.error('Failed to create feature:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create feature toggle'
      });
    } finally {
      this.creatingFeature = false;
    }
  }

  trackByFeatureName(index: number, feature: FeatureToggle): string {
    return feature.name;
  }

  getEnvironmentSeverity(environment: string): 'success' | 'info' | 'warning' | 'danger' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      'development': 'info',
      'staging': 'warning',
      'production': 'danger',
      'test': 'success'
    };
    return severityMap[environment] || 'info';
  }
}