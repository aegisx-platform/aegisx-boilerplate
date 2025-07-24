import { Component, OnInit, OnDestroy, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { FieldsetModule } from 'primeng/fieldset';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { DataViewModule } from 'primeng/dataview';

import { MessageService } from 'primeng/api';

import { 
  ConfigurationService,
  ConfigurationTemplate,
  TemplateApplyRequest,
  SystemConfiguration 
} from '../../services/configuration.service';

interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'email';
  required: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
}

@Component({
  selector: 'app-configuration-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    TooltipModule,
    DialogModule,
    FieldsetModule,
    DividerModule,
    ToastModule,
    CheckboxModule,
    DataViewModule
  ],
  providers: [MessageService],
  template: `
    <div class="configuration-templates">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Configuration Templates</h3>
          <p class="text-sm text-gray-600 mt-1">Quick setup templates for common configurations</p>
        </div>
        
        <div class="flex gap-2 items-center">
          <!-- Category Filter -->
          <p-select 
            [(ngModel)]="selectedCategory"
            [options]="categoryOptions"
            placeholder="All Categories"
            (onChange)="filterTemplates()"
            [showClear]="true"
            class="w-40">
          </p-select>
          
          <p-button 
            icon="pi pi-refresh" 
            [loading]="loading"
            (onClick)="loadTemplates()"
            pTooltip="Refresh templates"
            tooltipPosition="top"
            severity="secondary"
            size="small">
          </p-button>
        </div>
      </div>

      <!-- Templates Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" *ngIf="!loading">
        <div 
          *ngFor="let template of filteredTemplates" 
          class="template-card">
          
          <p-card [style]="{ height: '100%' }">
            <ng-template pTemplate="header">
              <div class="template-header">
                <div class="flex items-center justify-between p-4 pb-2">
                  <div class="flex items-center gap-2">
                    <i [class]="getTemplateIcon(template.category)" class="text-lg text-primary"></i>
                    <h4 class="font-semibold text-gray-800">{{ template.display_name }}</h4>
                  </div>
                  <p-tag 
                    [value]="template.category" 
                    severity="info"
                    class="text-xs">
                  </p-tag>
                </div>
              </div>
            </ng-template>

            <ng-template pTemplate="content">
              <div class="template-content space-y-4">
                <!-- Description -->
                <p class="text-sm text-gray-600 line-clamp-3">
                  {{ template.description || 'No description available' }}
                </p>

                <!-- Template Info -->
                <div class="template-info space-y-2">
                  <div class="flex items-center gap-2 text-sm">
                    <i class="pi pi-cog text-gray-400"></i>
                    <span class="text-gray-600">{{ getConfigurationCount(template) }} configurations</span>
                  </div>
                  
                  <div class="flex items-center gap-2 text-sm">
                    <i class="pi pi-key text-gray-400"></i>
                    <span class="text-gray-600">{{ getVariableCount(template) }} variables</span>
                  </div>
                </div>

                <!-- Preview Variables -->
                <div *ngIf="getPreviewVariables(template).length > 0" class="variables-preview">
                  <small class="text-gray-500 font-medium">Required variables:</small>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <p-tag 
                      *ngFor="let variable of getPreviewVariables(template)" 
                      [value]="variable"
                      severity="secondary"
                      class="text-xs">
                    </p-tag>
                  </div>
                </div>
              </div>
            </ng-template>

            <ng-template pTemplate="footer">
              <div class="flex justify-between items-center">
                <small class="text-gray-500">
                  {{ template.sort_order || 0 }} priority
                </small>
                
                <div class="flex gap-2">
                  <p-button 
                    icon="pi pi-eye" 
                    (onClick)="previewTemplate(template)"
                    pTooltip="Preview template"
                    tooltipPosition="top"
                    severity="secondary"
                    size="small"
                    [text]="true">
                  </p-button>
                  
                  <p-button 
                    icon="pi pi-plus" 
                    label="Apply"
                    (onClick)="applyTemplate(template)"
                    severity="primary"
                    size="small"
                    [disabled]="!template.is_active">
                  </p-button>
                </div>
              </div>
            </ng-template>
          </p-card>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && filteredTemplates.length === 0" class="empty-state text-center py-12">
        <i class="pi pi-file-o text-4xl text-gray-400 mb-4"></i>
        <h4 class="text-lg font-semibold text-gray-600 mb-2">No Templates Found</h4>
        <p class="text-gray-500">
          {{ selectedCategory ? 'No templates available for the selected category' : 'No configuration templates available' }}
        </p>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state flex justify-center items-center py-12">
        <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
        <span class="ml-2 text-gray-600">Loading templates...</span>
      </div>
    </div>

    <!-- Template Apply Dialog -->
    <p-dialog 
      [(visible)]="showApplyDialog"
      [modal]="true"
      [header]="'Apply ' + (selectedTemplate?.display_name || 'Template')"
      [style]="{ width: '600px', maxWidth: '90vw' }"
      [closable]="true"
      [draggable]="false">
      
      <div *ngIf="selectedTemplate" class="apply-template-form space-y-6">
        <!-- Template Info -->
        <div class="template-info bg-blue-50 p-4 rounded-lg">
          <div class="flex items-start gap-3">
            <i [class]="getTemplateIcon(selectedTemplate.category)" class="text-blue-600 mt-1"></i>
            <div>
              <h4 class="font-semibold text-blue-900">{{ selectedTemplate.display_name }}</h4>
              <p class="text-sm text-blue-700 mt-1">{{ selectedTemplate.description }}</p>
            </div>
          </div>
        </div>

        <!-- Environment Selection -->
        <p-fieldset legend="Deployment Settings" [toggleable]="false">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Target Environment *
              </label>
              <p-select 
                [(ngModel)]="applyRequest.environment"
                [options]="environmentOptions"
                placeholder="Select environment"
                class="w-full">
              </p-select>
            </div>

            <div class="flex items-center pt-6">
              <p-checkbox 
                [(ngModel)]="applyRequest.overwriteExisting"
                binary="true"
                inputId="overwrite">
              </p-checkbox>
              <label for="overwrite" class="ml-2 text-sm">Overwrite existing configurations</label>
            </div>
          </div>
        </p-fieldset>

        <!-- Variables Form -->
        <p-fieldset 
          *ngIf="templateVariables.length > 0" 
          legend="Configuration Variables" 
          [toggleable]="false">
          
          <div class="grid grid-cols-1 gap-4">
            <div *ngFor="let variable of templateVariables" class="variable-field">
              <label [for]="variable.key" class="block text-sm font-medium text-gray-700 mb-2">
                {{ variable.label }}
                <span *ngIf="variable.required" class="text-red-500">*</span>
              </label>
              
              <!-- Text/Email Input -->
              <input 
                *ngIf="variable.type === 'text' || variable.type === 'email'"
                pInputText 
                [id]="variable.key"
                [(ngModel)]="variable.value"
                [placeholder]="variable.placeholder || ''"
                [type]="variable.type === 'email' ? 'email' : 'text'"
                class="w-full">

              <!-- Password Input -->
              <input 
                *ngIf="variable.type === 'password'"
                pInputText 
                [id]="variable.key"
                [(ngModel)]="variable.value"
                [placeholder]="variable.placeholder || ''"
                type="password"
                class="w-full">

              <!-- Number Input -->
              <input 
                *ngIf="variable.type === 'number'"
                pInputText 
                [id]="variable.key"
                [(ngModel)]="variable.value"
                [placeholder]="variable.placeholder || ''"
                type="number"
                class="w-full">

              <small *ngIf="variable.description" class="text-gray-500 mt-1 block">
                {{ variable.description }}
              </small>
            </div>
          </div>
        </p-fieldset>

        <!-- Preview Results -->
        <div *ngIf="previewResults.length > 0" class="preview-results bg-gray-50 p-4 rounded-lg">
          <h5 class="font-medium text-gray-800 mb-3">Configurations to be created:</h5>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            <div 
              *ngFor="let config of previewResults" 
              class="flex items-center justify-between text-sm bg-white p-2 rounded border">
              <div class="font-mono">{{ config.config_key }}</div>
              <div class="text-gray-600">{{ config.value_type }}</div>
            </div>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-between items-center">
          <p-button 
            label="Preview Changes" 
            (onClick)="previewApply()"
            severity="info"
            [loading]="previewing"
            [disabled]="applying"
            icon="pi pi-eye">
          </p-button>
          
          <div class="flex gap-2">
            <p-button 
              label="Cancel" 
              (onClick)="closeApplyDialog()"
              severity="secondary"
              [disabled]="applying">
            </p-button>
            <p-button 
              label="Apply Template" 
              (onClick)="confirmApply()"
              [loading]="applying"
              [disabled]="!isApplyFormValid()">
            </p-button>
          </div>
        </div>
      </ng-template>
    </p-dialog>

    <p-toast></p-toast>
  `,
  styles: [`
    .configuration-templates {
      padding: 1rem;
    }
    
    .template-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .template-card:hover {
      transform: translateY(-2px);
      border-color: #e5e7eb;
    }
    
    .template-content {
      min-height: 120px;
    }
    
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .variable-field {
      margin-bottom: 1rem;
    }
    
    :host ::ng-deep .p-card {
      border: 1px solid #e5e7eb;
      box-shadow: none;
    }
    
    :host ::ng-deep .p-card .p-card-header {
      padding: 0;
    }
    
    :host ::ng-deep .p-card .p-card-content {
      padding: 1rem;
    }
    
    :host ::ng-deep .p-card .p-card-footer {
      padding: 1rem;
      border-top: 1px solid var(--surface-border);
    }
    
    :host ::ng-deep .p-fieldset .p-fieldset-legend {
      background: var(--primary-color);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-weight: 600;
    }
  `]
})
export class ConfigurationTemplatesComponent implements OnInit, OnDestroy {
  @Input() selectedCategory?: string;
  @Output() templateApplied = new EventEmitter<{
    template: ConfigurationTemplate;
    results: { created: SystemConfiguration[]; updated: SystemConfiguration[]; skipped: string[] };
  }>();

  private configService = inject(ConfigurationService);
  private messageService = inject(MessageService);
  private subscriptions: Subscription[] = [];

  // Data
  templates: ConfigurationTemplate[] = [];
  filteredTemplates: ConfigurationTemplate[] = [];
  loading = false;

  // Filters
  categoryOptions: { label: string; value: string }[] = [];

  // Apply Template Dialog
  showApplyDialog = false;
  selectedTemplate: ConfigurationTemplate | null = null;
  templateVariables: TemplateVariable[] = [];
  applying = false;
  previewing = false;
  previewResults: any[] = [];

  applyRequest: TemplateApplyRequest = {
    templateName: '',
    category: '',
    environment: 'development',
    variables: {},
    overwriteExisting: false
  };

  environmentOptions = [
    { label: 'Development', value: 'development' },
    { label: 'Staging', value: 'staging' },
    { label: 'Production', value: 'production' },
    { label: 'Test', value: 'test' }
  ];

  ngOnInit(): void {
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadTemplates(): void {
    this.loading = true;
    
    const category = this.selectedCategory || undefined;
    
    this.configService.getTemplates(category).subscribe({
      next: (templates) => {
        this.templates = Array.isArray(templates) ? templates : [];
        this.filteredTemplates = Array.isArray(templates) ? templates : [];
        this.updateCategoryOptions();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load templates:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load configuration templates'
        });
        this.loading = false;
      }
    });
  }

  private updateCategoryOptions(): void {
    if (!Array.isArray(this.templates)) {
      this.categoryOptions = [];
      return;
    }
    
    const categories = [...new Set(this.templates.map(t => t.category))];
    this.categoryOptions = categories.map(cat => ({
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      value: cat
    }));
  }

  filterTemplates(): void {
    if (!Array.isArray(this.templates)) {
      this.filteredTemplates = [];
      return;
    }
    
    if (this.selectedCategory) {
      this.filteredTemplates = this.templates.filter(t => t.category === this.selectedCategory);
    } else {
      this.filteredTemplates = [...this.templates];
    }
  }

  getTemplateIcon(category: string): string {
    const iconMap: Record<string, string> = {
      'smtp': 'pi pi-send',
      'database': 'pi pi-database',
      'api': 'pi pi-cloud',
      'redis': 'pi pi-server',
      'storage': 'pi pi-folder',
      'notification': 'pi pi-bell'
    };
    return iconMap[category.toLowerCase()] || 'pi pi-cog';
  }

  getConfigurationCount(template: ConfigurationTemplate): number {
    try {
      const config = template.template_config as any;
      return Object.keys(config.configurations || {}).length;
    } catch {
      return 0;
    }
  }

  getVariableCount(template: ConfigurationTemplate): number {
    try {
      const config = template.template_config as any;
      return Object.keys(config.variables || {}).length;
    } catch {
      return 0;
    }
  }

  getPreviewVariables(template: ConfigurationTemplate): string[] {
    try {
      const config = template.template_config as any;
      const variables = config.variables || {};
      return Object.keys(variables).filter(key => variables[key].required).slice(0, 3);
    } catch {
      return [];
    }
  }

  previewTemplate(template: ConfigurationTemplate): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Template Preview',
      detail: `${template.display_name}: ${this.getConfigurationCount(template)} configurations, ${this.getVariableCount(template)} variables`
    });
  }

  applyTemplate(template: ConfigurationTemplate): void {
    this.selectedTemplate = template;
    this.initializeApplyRequest(template);
    this.parseTemplateVariables(template);
    this.showApplyDialog = true;
  }

  private initializeApplyRequest(template: ConfigurationTemplate): void {
    this.applyRequest = {
      templateName: template.template_name,
      category: template.category,
      environment: 'development',
      variables: {},
      overwriteExisting: false
    };
  }

  private parseTemplateVariables(template: ConfigurationTemplate): void {
    try {
      const config = template.template_config as any;
      const variables = config.variables || {};
      
      this.templateVariables = Object.entries(variables).map(([key, variable]: [string, any]) => ({
        key,
        label: variable.label || key,
        type: variable.type || 'text',
        required: variable.required || false,
        description: variable.description,
        placeholder: variable.placeholder,
        defaultValue: variable.defaultValue,
        value: variable.defaultValue || ''
      }));
    } catch (error) {
      console.error('Failed to parse template variables:', error);
      this.templateVariables = [];
    }
  }

  previewApply(): void {
    if (!this.selectedTemplate) return;

    this.previewing = true;
    
    // Collect variables
    const variables: Record<string, string> = {};
    this.templateVariables.forEach(variable => {
      if (variable.value) {
        variables[variable.key] = variable.value;
      }
    });

    // Create request for preview
    const request: TemplateApplyRequest = {
      ...this.applyRequest,
      variables
    };

    // Simulate preview (in real implementation, call preview endpoint)
    setTimeout(() => {
      try {
        const config = this.selectedTemplate!.template_config as any;
        const configurations = config.configurations || {};
        
        this.previewResults = Object.entries(configurations).map(([key, config]: [string, any]) => ({
          config_key: key,
          value_type: config.value_type || 'string',
          description: config.description || ''
        }));
        
        this.previewing = false;
        this.messageService.add({
          severity: 'info',
          summary: 'Preview Ready',
          detail: `${this.previewResults.length} configurations will be created`
        });
      } catch (error) {
        this.previewing = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Preview Error',
          detail: 'Failed to generate preview'
        });
      }
    }, 1000);
  }

  confirmApply(): void {
    if (!this.selectedTemplate || !this.isApplyFormValid()) return;

    this.applying = true;

    // Collect variables
    const variables: Record<string, string> = {};
    this.templateVariables.forEach(variable => {
      if (variable.value) {
        variables[variable.key] = variable.value;
      }
    });

    const request: TemplateApplyRequest = {
      ...this.applyRequest,
      variables
    };

    this.configService.applyTemplate(request).subscribe({
      next: (results) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Template Applied',
          detail: `Created ${results.created.length} configurations, updated ${results.updated.length}, skipped ${results.skipped.length}`
        });

        this.templateApplied.emit({
          template: this.selectedTemplate!,
          results
        });

        this.closeApplyDialog();
        this.applying = false;
      },
      error: (error) => {
        console.error('Failed to apply template:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Apply Failed',
          detail: error.error?.message || 'Failed to apply template'
        });
        this.applying = false;
      }
    });
  }

  isApplyFormValid(): boolean {
    if (!this.applyRequest.environment) return false;
    
    // Check required variables
    return this.templateVariables.every(variable => 
      !variable.required || (variable.value && variable.value.trim() !== '')
    );
  }

  closeApplyDialog(): void {
    this.showApplyDialog = false;
    this.selectedTemplate = null;
    this.templateVariables = [];
    this.previewResults = [];
    this.initializeApplyRequest({} as ConfigurationTemplate);
  }
}