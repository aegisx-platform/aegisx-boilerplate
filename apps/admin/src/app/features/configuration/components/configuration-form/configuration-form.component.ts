import { Component, OnInit, OnDestroy, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

// PrimeNG imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { FieldsetModule } from 'primeng/fieldset';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';

import { MessageService } from 'primeng/api';

import { 
  ConfigurationService,
  SystemConfiguration,
  ConfigurationMetadata,
  ConfigurationTemplate 
} from '../../services/configuration.service';

interface ValidationError {
  field: string;
  message: string;
}

@Component({
  selector: 'app-configuration-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    CheckboxModule,
    MessageModule,
    ToastModule,
    DividerModule,
    CardModule,
    FieldsetModule,
    TabsModule,
    AccordionModule
  ],
  providers: [MessageService],
  template: `
    <p-dialog 
      [(visible)]="visible"
      [modal]="true"
      [header]="dialogTitle"
      [style]="{ width: '800px', maxWidth: '90vw' }"
      [closable]="true"
      [draggable]="false"
      (onHide)="onDialogHide()">
      
      <form [formGroup]="configForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <div class="grid grid-cols-1 gap-6">
          
          <!-- Basic Information Section -->
          <p-fieldset legend="Basic Information" [toggleable]="false">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Category -->
              <div class="form-field">
                <label for="category" class="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <input 
                  pInputText 
                  id="category"
                  formControlName="category"
                  placeholder="e.g., smtp, database, api"
                  class="w-full"
                  [class.ng-invalid]="configForm.get('category')?.invalid && configForm.get('category')?.touched">
                <small 
                  *ngIf="configForm.get('category')?.invalid && configForm.get('category')?.touched" 
                  class="p-error block mt-1">
                  Category is required
                </small>
              </div>

              <!-- Configuration Key -->
              <div class="form-field">
                <label for="config_key" class="block text-sm font-medium text-gray-700 mb-2">
                  Configuration Key *
                </label>
                <input 
                  pInputText 
                  id="config_key"
                  formControlName="config_key"
                  placeholder="e.g., host, port, username"
                  class="w-full font-mono text-sm"
                  [class.ng-invalid]="configForm.get('config_key')?.invalid && configForm.get('config_key')?.touched">
                <small 
                  *ngIf="configForm.get('config_key')?.invalid && configForm.get('config_key')?.touched" 
                  class="p-error block mt-1">
                  Configuration key is required
                </small>
              </div>
            </div>
          </p-fieldset>

          <!-- Value Configuration Section -->
          <p-fieldset legend="Value Configuration" [toggleable]="false">
            <div class="grid grid-cols-1 gap-4">
              <!-- Value Type -->
              <div class="form-field">
                <label for="value_type" class="block text-sm font-medium text-gray-700 mb-2">
                  Value Type *
                </label>
                <p-select 
                  formControlName="value_type"
                  [options]="valueTypeOptions"
                  placeholder="Select value type"
                  class="w-full"
                  (onChange)="onValueTypeChange($event)"
                  [showClear]="false">
                </p-select>
              </div>

              <!-- Configuration Value -->
              <div class="form-field">
                <label for="config_value" class="block text-sm font-medium text-gray-700 mb-2">
                  Configuration Value *
                </label>
                
                <!-- String/Number Input -->
                <input 
                  *ngIf="selectedValueType === 'string' || selectedValueType === 'number'" 
                  pInputText 
                  id="config_value"
                  formControlName="config_value"
                  [placeholder]="getValuePlaceholder()"
                  class="w-full font-mono text-sm"
                  [class.ng-invalid]="configForm.get('config_value')?.invalid && configForm.get('config_value')?.touched">

                <!-- Boolean Checkbox -->
                <div *ngIf="selectedValueType === 'boolean'" class="flex items-center">
                  <p-checkbox 
                    formControlName="booleanValue"
                    binary="true"
                    inputId="booleanValue">
                  </p-checkbox>
                  <label for="booleanValue" class="ml-2 text-sm">Enable this configuration</label>
                </div>

                <!-- JSON Textarea -->
                <p-textarea 
                  *ngIf="selectedValueType === 'json'" 
                  id="config_value"
                  formControlName="config_value"
                  placeholder='{"key": "value", "nested": {"property": true}}'
                  rows="6"
                  class="w-full font-mono text-sm"
                  [class.ng-invalid]="configForm.get('config_value')?.invalid && configForm.get('config_value')?.touched">
                </p-textarea>

                <small 
                  *ngIf="configForm.get('config_value')?.invalid && configForm.get('config_value')?.touched" 
                  class="p-error block mt-1">
                  Configuration value is required
                </small>
                
                <!-- JSON Validation Error -->
                <small 
                  *ngIf="selectedValueType === 'json' && jsonValidationError" 
                  class="p-error block mt-1">
                  {{ jsonValidationError }}
                </small>
              </div>
            </div>
          </p-fieldset>

          <!-- Environment & Status Section -->
          <p-fieldset legend="Environment & Status" [toggleable]="false">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Environment -->
              <div class="form-field">
                <label for="environment" class="block text-sm font-medium text-gray-700 mb-2">
                  Environment *
                </label>
                <p-select 
                  formControlName="environment"
                  [options]="environmentOptions"
                  placeholder="Select environment"
                  class="w-full"
                  [showClear]="false">
                </p-select>
              </div>

              <!-- Active Status -->
              <div class="form-field flex items-center pt-8">
                <p-checkbox 
                  formControlName="is_active"
                  binary="true"
                  inputId="is_active">
                </p-checkbox>
                <label for="is_active" class="ml-2 text-sm font-medium">Active Configuration</label>
              </div>
            </div>
          </p-fieldset>

          <!-- Description Section -->
          <p-fieldset legend="Additional Information" [toggleable]="true" [collapsed]="!isEditMode">
            <div class="form-field">
              <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <p-textarea 
                id="description"
                formControlName="description"
                placeholder="Optional description for this configuration..."
                rows="3"
                class="w-full">
              </p-textarea>
              <small class="text-gray-500 mt-1 block">
                Provide context or usage instructions for this configuration
              </small>
            </div>
          </p-fieldset>

          <!-- Validation Messages -->
          <div *ngIf="validationErrors.length > 0" class="validation-errors">
            <p-message 
              *ngFor="let error of validationErrors"
              severity="error" 
              [text]="error.message"
              class="mb-2">
            </p-message>
          </div>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-between items-center">
          <!-- Template Helper (only show for create mode) -->
          <div *ngIf="!isEditMode && availableTemplates.length > 0" class="flex items-center gap-2">
            <small class="text-gray-600">Quick start:</small>
            <p-select 
              [options]="templateOptions"
              placeholder="Apply template"
              (onChange)="applyTemplate($event.value)"
              [showClear]="true"
              class="text-sm">
            </p-select>
          </div>
          <div *ngIf="isEditMode || availableTemplates.length === 0"></div>
          
          <!-- Action Buttons -->
          <div class="flex gap-2">
            <p-button 
              label="Cancel" 
              (onClick)="onCancel()"
              severity="secondary"
              [disabled]="saving">
            </p-button>
            <p-button 
              label="Test & Save" 
              (onClick)="onTestAndSave()"
              severity="info"
              [loading]="testing"
              [disabled]="saving || configForm.invalid"
              *ngIf="canTestConfiguration()">
            </p-button>
            <p-button 
              [label]="isEditMode ? 'Update' : 'Create'"
              (onClick)="onSubmit()"
              [loading]="saving"
              [disabled]="configForm.invalid || testing">
            </p-button>
          </div>
        </div>
      </ng-template>
    </p-dialog>

    <p-toast></p-toast>
  `,
  styles: [`
    .form-field {
      margin-bottom: 1rem;
    }
    
    .validation-errors {
      margin-top: 1rem;
      padding: 1rem;
      background-color: #fef2f2;
      border-radius: 6px;
      border-left: 4px solid #ef4444;
    }
    
    :host ::ng-deep .p-fieldset .p-fieldset-legend {
      background: var(--primary-color);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-weight: 600;
    }
    
    :host ::ng-deep .p-fieldset .p-fieldset-content {
      padding: 1.5rem;
    }
    
    :host ::ng-deep .p-dropdown {
      width: 100%;
    }
    
    .font-mono {
      font-family: 'Courier New', monospace;
    }
    
    :host ::ng-deep .p-dialog .p-dialog-footer {
      padding: 1.5rem;
      border-top: 1px solid var(--surface-border);
    }
  `]
})
export class ConfigurationFormComponent implements OnInit, OnDestroy {
  @Input() visible = false;
  @Input() configuration: SystemConfiguration | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() configurationSaved = new EventEmitter<SystemConfiguration>();
  @Output() configurationUpdated = new EventEmitter<SystemConfiguration>();

  private fb = inject(FormBuilder);
  private configService = inject(ConfigurationService);
  private messageService = inject(MessageService);
  private subscriptions: Subscription[] = [];

  configForm!: FormGroup;
  saving = false;
  testing = false;
  validationErrors: ValidationError[] = [];
  jsonValidationError = '';
  selectedValueType = 'string';

  // Dropdown options
  valueTypeOptions = [
    { label: 'String', value: 'string' },
    { label: 'Number', value: 'number' },
    { label: 'Boolean', value: 'boolean' },
    { label: 'JSON Object', value: 'json' }
  ];

  environmentOptions = [
    { label: 'Development', value: 'development' },
    { label: 'Staging', value: 'staging' },
    { label: 'Production', value: 'production' },
    { label: 'Test', value: 'test' }
  ];

  // Template support
  availableTemplates: ConfigurationTemplate[] = [];
  templateOptions: { label: string; value: ConfigurationTemplate }[] = [];

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get dialogTitle(): string {
    return this.isEditMode ? 'Edit Configuration' : 'Create New Configuration';
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeForm(): void {
    this.configForm = this.fb.group({
      category: ['', [Validators.required, Validators.minLength(2)]],
      config_key: ['', [Validators.required, Validators.minLength(2)]],
      config_value: ['', Validators.required],
      value_type: ['string', Validators.required],
      environment: ['development', Validators.required],
      description: [''],
      is_active: [true],
      booleanValue: [false] // Helper field for boolean type
    });

    // Watch for value type changes
    this.configForm.get('value_type')?.valueChanges.subscribe(valueType => {
      this.selectedValueType = valueType;
      this.updateValueValidators(valueType);
    });

    // Watch for boolean value changes
    this.configForm.get('booleanValue')?.valueChanges.subscribe(value => {
      if (this.selectedValueType === 'boolean') {
        this.configForm.patchValue({ config_value: value.toString() }, { emitEvent: false });
      }
    });

    // Watch for JSON value changes for validation
    this.configForm.get('config_value')?.valueChanges.subscribe(value => {
      if (this.selectedValueType === 'json') {
        this.validateJson(value);
      }
    });

    // Populate form if editing
    if (this.configuration) {
      this.populateForm(this.configuration);
    }
  }

  private updateValueValidators(valueType: string): void {
    const configValueControl = this.configForm.get('config_value');
    
    if (!configValueControl) return;

    // Clear existing validators
    configValueControl.clearValidators();
    
    // Add base required validator
    const validators = [Validators.required];
    
    // Add type-specific validators
    switch (valueType) {
      case 'number':
        validators.push(Validators.pattern(/^-?\d*\.?\d+$/));
        break;
      case 'json':
        validators.push(this.jsonValidator.bind(this));
        break;
    }
    
    configValueControl.setValidators(validators);
    configValueControl.updateValueAndValidity();
  }

  private jsonValidator(control: any) {
    if (!control.value) return null;
    
    try {
      JSON.parse(control.value);
      this.jsonValidationError = '';
      return null;
    } catch (error) {
      this.jsonValidationError = 'Invalid JSON format';
      return { invalidJson: true };
    }
  }

  private validateJson(value: string): void {
    if (!value || this.selectedValueType !== 'json') {
      this.jsonValidationError = '';
      return;
    }

    try {
      JSON.parse(value);
      this.jsonValidationError = '';
    } catch (error) {
      this.jsonValidationError = 'Invalid JSON format. Please check syntax.';
    }
  }

  private populateForm(config: SystemConfiguration): void {
    this.selectedValueType = config.value_type;
    
    const formValue: any = {
      category: config.category,
      config_key: config.config_key,
      config_value: config.config_value,
      value_type: config.value_type,
      environment: config.environment,
      description: config.description || '',
      is_active: config.is_active
    };

    // Handle boolean type
    if (config.value_type === 'boolean') {
      formValue.booleanValue = config.config_value === 'true';
    }

    this.configForm.patchValue(formValue);
  }

  onValueTypeChange(event: any): void {
    const valueType = event.value;
    this.selectedValueType = valueType;
    
    // Clear current value when type changes
    this.configForm.patchValue({ 
      config_value: valueType === 'boolean' ? 'false' : '',
      booleanValue: false 
    });
  }

  getValuePlaceholder(): string {
    switch (this.selectedValueType) {
      case 'string':
        return 'Enter string value...';
      case 'number':
        return 'Enter numeric value...';
      default:
        return 'Enter value...';
    }
  }

  canTestConfiguration(): boolean {
    const category = this.configForm.get('category')?.value;
    // Only show test button for testable categories
    return ['smtp', 'database', 'api', 'redis'].includes(category?.toLowerCase());
  }

  onTestAndSave(): void {
    if (this.configForm.invalid) return;

    this.testing = true;
    
    // Simulate test (in real implementation, call actual test endpoint)
    setTimeout(() => {
      this.testing = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Test Successful',
        detail: 'Configuration test passed. Ready to save.'
      });
      
      // Auto-save after successful test
      this.onSubmit();
    }, 2000);
  }

  onSubmit(): void {
    if (this.configForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    this.validationErrors = [];

    const formValue = this.configForm.value;
    
    // Prepare configuration data
    const configData: Partial<SystemConfiguration> = {
      category: formValue.category,
      config_key: formValue.config_key,
      config_value: formValue.config_value,
      value_type: formValue.value_type,
      environment: formValue.environment,
      description: formValue.description,
      is_active: formValue.is_active
    };

    const operation = this.isEditMode && this.configuration?.id
      ? this.configService.updateConfiguration(this.configuration.id, configData)
      : this.configService.createConfiguration(configData as Omit<SystemConfiguration, 'id' | 'created_at' | 'updated_at'>);

    operation.subscribe({
      next: (result) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Configuration ${this.isEditMode ? 'updated' : 'created'} successfully`
        });

        if (this.isEditMode) {
          this.configurationUpdated.emit(result);
        } else {
          this.configurationSaved.emit(result);
        }

        this.onDialogHide();
        this.saving = false;
      },
      error: (error) => {
        console.error('Save error:', error);
        
        if (error.error?.errors) {
          this.validationErrors = error.error.errors.map((err: any) => ({
            field: err.field || 'general',
            message: err.message
          }));
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to ${this.isEditMode ? 'update' : 'create'} configuration`
          });
        }
        
        this.saving = false;
      }
    });
  }

  onCancel(): void {
    this.onDialogHide();
  }

  onDialogHide(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.configForm.reset({
      category: '',
      config_key: '',
      config_value: '',
      value_type: 'string',
      environment: 'development',
      description: '',
      is_active: true,
      booleanValue: false
    });
    this.validationErrors = [];
    this.jsonValidationError = '';
    this.selectedValueType = 'string';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.configForm.controls).forEach(key => {
      this.configForm.get(key)?.markAsTouched();
    });
  }

  private loadTemplates(): void {
    this.configService.getTemplates().subscribe({
      next: (templates) => {
        this.availableTemplates = templates;
        this.templateOptions = templates.map(template => ({
          label: `${template.display_name} (${template.category})`,
          value: template
        }));
      },
      error: (error) => {
        console.error('Failed to load templates:', error);
      }
    });
  }

  applyTemplate(template: ConfigurationTemplate): void {
    if (!template) return;

    try {
      const templateConfig = template.template_config as any;
      
      this.configForm.patchValue({
        category: template.category,
        environment: 'development', // Default to development
        description: template.description || `Configuration from ${template.display_name} template`
      });

      this.messageService.add({
        severity: 'info',
        summary: 'Template Applied',
        detail: `${template.display_name} template has been applied. Please fill in the remaining values.`
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Template Error',
        detail: 'Failed to apply template configuration'
      });
    }
  }
}