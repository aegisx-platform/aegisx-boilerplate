import { Component, OnInit, OnDestroy, inject, ViewChild, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { BadgeModule } from 'primeng/badge';
import { Table } from 'primeng/table';

import { NotificationService } from '../../services/notification.service';
import {
  NotificationTemplate,
  NotificationChannel,
  NotificationType,
  TemplateVariable,
  CreateTemplateRequest
} from '../../types/notification.types';

@Component({
  selector: 'app-notification-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    CheckboxModule,
    TextareaModule,
    ChipModule,
    DividerModule,
    BadgeModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="template-management-container">
      <div class="mb-4">
        <div class="flex align-items-center justify-content-between">
          <div>
            <h2 class="text-2xl font-bold m-0 text-gray-800">Notification Templates</h2>
            <p class="text-gray-600 mt-1 mb-0">Create and manage reusable notification templates</p>
          </div>
          <div class="ml-auto">
            <p-button
              icon="pi pi-plus"
              label="Add Template"
              severity="primary"
              (click)="showCreateDialog()">
            </p-button>
          </div>
        </div>
      </div>

      <!-- Templates Table -->
      <p-table
        #templatesTable
        [value]="templates"
        [loading]="loading"
        [paginator]="true"
        [rows]="25"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} templates"
        styleClass="p-datatable-gridlines"
        dataKey="id">

        <ng-template pTemplate="header">
          <tr>
            <th style="width: 200px">Name</th>
            <th style="width: 100px">Type</th>
            <th style="width: 150px">Channels</th>
            <th>Subject</th>
            <th style="width: 100px">Variables</th>
            <th style="width: 100px">Status</th>
            <th style="width: 180px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-template>
          <tr>
            <td>
              <div class="font-medium">{{ template.name }}</div>
              <div class="text-sm text-gray-600">{{ template.id }}</div>
            </td>
            <td>
              <p-chip [label]="formatType(template.type)" styleClass="text-xs"></p-chip>
            </td>
            <td>
              <div class="flex flex-wrap gap-1">
                <p-chip 
                  *ngFor="let channel of template.channels" 
                  [label]="channel"
                  styleClass="text-xs p-chip-sm">
                </p-chip>
              </div>
            </td>
            <td>
              <div class="text-sm" [title]="template.subject">
                {{ template.subject | slice:0:50 }}{{ template.subject.length > 50 ? '...' : '' }}
              </div>
            </td>
            <td class="text-center">
              <p-badge 
                [value]="template.variables?.length || 0"
                severity="info">
              </p-badge>
            </td>
            <td>
              <p-tag 
                [value]="template.active ? 'Active' : 'Inactive'"
                [severity]="template.active ? 'success' : 'secondary'">
              </p-tag>
            </td>
            <td>
              <div class="flex gap-1">
                <p-button 
                  icon="pi pi-eye" 
                  [text]="true" 
                  size="small"
                  (click)="viewTemplate(template)"
                  pTooltip="View details">
                </p-button>
                
                <p-button 
                  icon="pi pi-copy" 
                  [text]="true" 
                  size="small"
                  (click)="previewTemplate(template)"
                  pTooltip="Preview template">
                </p-button>
                
                <p-button 
                  icon="pi pi-pencil" 
                  [text]="true" 
                  size="small"
                  (click)="editTemplate(template)"
                  pTooltip="Edit template">
                </p-button>

                <p-button 
                  *ngIf="template.active"
                  icon="pi pi-pause" 
                  [text]="true" 
                  size="small"
                  severity="warn"
                  (click)="toggleTemplateStatus(template)"
                  pTooltip="Deactivate">
                </p-button>

                <p-button 
                  *ngIf="!template.active"
                  icon="pi pi-play" 
                  [text]="true" 
                  size="small"
                  severity="success"
                  (click)="toggleTemplateStatus(template)"
                  pTooltip="Activate">
                </p-button>
                
                <p-button 
                  icon="pi pi-trash" 
                  [text]="true" 
                  size="small"
                  severity="danger"
                  (click)="deleteTemplate(template)"
                  pTooltip="Delete template">
                </p-button>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7" class="text-center py-8">
              <div class="flex flex-column align-items-center gap-3">
                <i class="pi pi-file-o text-6xl text-gray-300"></i>
                <div class="text-xl text-gray-500">No templates found</div>
                <div class="text-gray-400">Create your first notification template to get started</div>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Create/Edit Template Dialog -->
      <p-dialog 
        [(visible)]="showTemplateDialog" 
        [modal]="true" 
        [style]="{width: '800px'}"
        [header]="isEditMode ? 'Edit Template' : 'Create New Template'"
        [closable]="true"
        (onHide)="resetTemplateForm()">
        
        <form [formGroup]="templateForm" (ngSubmit)="saveTemplate()" class="space-y-4">
          <!-- Basic Information -->
          <div class="grid grid-cols-2 gap-4">
            <div class="field">
              <label class="block text-sm font-medium mb-2">Template Name *</label>
              <input 
                pInputText 
                formControlName="name" 
                placeholder="Enter template name"
                class="w-full" />
              <small class="text-red-500" *ngIf="templateForm.get('name')?.invalid && templateForm.get('name')?.touched">
                Template name is required
              </small>
            </div>

            <div class="field">
              <label class="block text-sm font-medium mb-2">Type *</label>
              <p-select 
                formControlName="type"
                [options]="typeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select type"
                class="w-full">
              </p-select>
            </div>
          </div>

          <!-- Channels -->
          <div class="field">
            <label class="block text-sm font-medium mb-2">Supported Channels *</label>
            <div class="flex flex-wrap gap-2">
              <div *ngFor="let channel of channelOptions" class="flex align-items-center">
                <p-checkbox 
                  [value]="channel.value"
                  formControlName="channels"
                  [binary]="false"
                  [inputId]="'channel-' + channel.value">
                </p-checkbox>
                <label [for]="'channel-' + channel.value" class="ml-2 text-sm">
                  {{ channel.label }}
                </label>
              </div>
            </div>
          </div>

          <!-- Subject -->
          <div class="field">
            <label class="block text-sm font-medium mb-2">Subject *</label>
            <input 
              pInputText 
              formControlName="subject" 
              placeholder="Enter email subject or notification title"
              class="w-full" />
          </div>

          <!-- Content -->
          <div class="grid grid-cols-1 gap-4">
            <div class="field">
              <label class="block text-sm font-medium mb-2">Text Content *</label>
              <textarea 
                pTextarea 
                formControlName="textContent"
                placeholder="Enter plain text content"
                rows="4"
                class="w-full">
              </textarea>
            </div>

            <div class="field">
              <label class="block text-sm font-medium mb-2">HTML Content</label>
              <textarea 
                pTextarea 
                formControlName="htmlContent"
                placeholder="Enter HTML content (optional)"
                rows="4"
                class="w-full">
              </textarea>
            </div>
          </div>

          <!-- Variables -->
          <div class="field">
            <div class="flex align-items-center justify-content-between mb-2">
              <label class="block text-sm font-medium">Template Variables</label>
              <p-button 
                icon="pi pi-plus"
                label="Add Variable"
                size="small"
                [text]="true"
                (click)="addVariable()">
              </p-button>
            </div>
            
            <div formArrayName="variables" class="space-y-2">
              <div 
                *ngFor="let variable of variablesFormArray.controls; let i = index" 
                [formGroupName]="i"
                class="flex align-items-center gap-2 p-2 border border-gray-200 border-round">
                
                <input 
                  pInputText 
                  formControlName="name"
                  placeholder="Variable name"
                  class="flex-1" />
                
                <p-select 
                  formControlName="type"
                  [options]="variableTypeOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-24">
                </p-select>
                
                <p-checkbox 
                  formControlName="required"
                  [binary]="true"
                  inputId="required-{{ i }}">
                </p-checkbox>
                <label [for]="'required-' + i" class="text-sm">Required</label>
                
                <p-button 
                  icon="pi pi-trash"
                  size="small"
                  [text]="true"
                  severity="danger"
                  (click)="removeVariable(i)">
                </p-button>
              </div>
            </div>
          </div>

          <!-- Active Status -->
          <div class="field flex align-items-center gap-2">
            <p-checkbox 
              formControlName="active"
              [binary]="true"
              inputId="active">
            </p-checkbox>
            <label for="active" class="text-sm">Active template</label>
          </div>
        </form>

        <ng-template pTemplate="footer">
          <div class="flex justify-content-end gap-2">
            <p-button 
              label="Cancel" 
              severity="secondary"
              (click)="showTemplateDialog = false">
            </p-button>
            <p-button 
              label="{{ isEditMode ? 'Update' : 'Create' }} Template" 
              (click)="saveTemplate()"
              [loading]="saving">
            </p-button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- Template Preview Dialog -->
      <p-dialog 
        [(visible)]="showPreviewDialog" 
        [modal]="true" 
        [style]="{width: '700px'}"
        header="Template Preview"
        [closable]="true">
        
        <div *ngIf="selectedTemplate" class="template-preview">
          <div class="mb-4">
            <h4 class="text-lg font-semibold mb-2">{{ selectedTemplate.name }}</h4>
            <div class="flex gap-2 mb-3">
              <p-chip [label]="formatType(selectedTemplate.type)" styleClass="text-xs"></p-chip>
              <p-chip 
                *ngFor="let channel of selectedTemplate.channels" 
                [label]="channel"
                styleClass="text-xs">
              </p-chip>
            </div>
          </div>

          <!-- Email Preview Section -->
          <div class="preview-section mb-4">
            <h5 class="text-lg font-semibold mb-3 flex align-items-center gap-2">
              <i class="pi pi-envelope"></i>
              Email Preview
            </h5>
            <div class="mb-3">
              <strong>Subject:</strong>
              <div class="mt-1 p-2 bg-gray-50 border-round">{{ selectedTemplate.subject }}</div>
            </div>
            <div class="mb-3">
              <strong>Text Content:</strong>
              <div class="mt-1 p-2 bg-gray-50 border-round white-space-pre-wrap">{{ selectedTemplate.content.text }}</div>
            </div>
            <div *ngIf="selectedTemplate.content.html">
              <strong>HTML Preview:</strong>
              <div class="mt-1 p-2 border border-gray-200 border-round" [innerHTML]="selectedTemplate.content.html"></div>
            </div>
          </div>

          <p-divider></p-divider>

          <!-- Variables Section -->
          <div class="variables-section">
            <h5 class="text-lg font-semibold mb-3 flex align-items-center gap-2">
              <i class="pi pi-code"></i>
              Variables
            </h5>
            <div *ngIf="selectedTemplate.variables?.length; else noVariables">
              <div *ngFor="let variable of selectedTemplate.variables" class="variable-item flex align-items-center justify-content-between py-2 border-bottom border-gray-200">
                <div>
                  <span class="font-medium">{{ '{' + variable.name + '}' }}</span>
                  <span class="ml-2 text-sm text-gray-600">{{ variable.type }}</span>
                </div>
                <div class="flex align-items-center gap-2">
                  <p-tag 
                    [value]="variable.required ? 'Required' : 'Optional'"
                    [severity]="variable.required ? 'danger' : 'info'"
                    styleClass="text-xs">
                  </p-tag>
                </div>
              </div>
            </div>
            <ng-template #noVariables>
              <p class="text-gray-600">No variables defined for this template.</p>
            </ng-template>
          </div>
        </div>
      </p-dialog>

    </div>

    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .template-management-container {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .field {
      margin-bottom: 1rem;
    }

    .field label {
      color: var(--text-color-secondary);
    }

    .space-y-4 > * + * {
      margin-top: 1rem;
    }

    .space-y-2 > * + * {
      margin-top: 0.5rem;
    }

    .p-chip-sm {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }

    .preview-section {
      max-height: 400px;
      overflow-y: auto;
    }

    .variable-item:last-child {
      border-bottom: none;
    }

    .white-space-pre-wrap {
      white-space: pre-wrap;
    }

    :host ::ng-deep .p-table .p-table-thead > tr > th {
      background: var(--surface-50);
      color: var(--text-color-secondary);
      font-weight: 600;
      padding: 1rem;
    }

    :host ::ng-deep .p-table .p-table-tbody > tr > td {
      padding: 0.75rem 1rem;
    }
  `]
})
export class NotificationTemplatesComponent implements OnInit, OnDestroy {
  @Output() templateSelected = new EventEmitter<NotificationTemplate>();
  @Output() refreshRequested = new EventEmitter<void>();

  @ViewChild('templatesTable') table!: Table;

  private subscriptions = new Subscription();
  private notificationService = inject(NotificationService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);

  // State
  templates: NotificationTemplate[] = [];
  loading = false;
  saving = false;
  showTemplateDialog = false;
  showPreviewDialog = false;
  selectedTemplate: NotificationTemplate | null = null;
  isEditMode = false;

  // Form
  templateForm!: FormGroup;

  // Options
  typeOptions = [
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

  channelOptions = [
    { label: 'Email', value: 'email' },
    { label: 'SMS', value: 'sms' },
    { label: 'Push', value: 'push' },
    { label: 'Webhook', value: 'webhook' },
    { label: 'Slack', value: 'slack' },
    { label: 'In-App', value: 'in-app' }
  ];

  variableTypeOptions = [
    { label: 'String', value: 'string' },
    { label: 'Number', value: 'number' },
    { label: 'Date', value: 'date' },
    { label: 'Boolean', value: 'boolean' },
    { label: 'Email', value: 'email' },
    { label: 'URL', value: 'url' }
  ];

  ngOnInit() {
    this.initializeForm();
    this.loadTemplates();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  initializeForm() {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      channels: [[], Validators.required],
      subject: ['', Validators.required],
      textContent: ['', Validators.required],
      htmlContent: [''],
      variables: this.fb.array([]),
      active: [true]
    });
  }

  get variablesFormArray() {
    return this.templateForm.get('variables') as FormArray;
  }

  loadTemplates() {
    this.loading = true;
    this.notificationService.listTemplates().subscribe({
      next: (response) => {
        this.templates = response.data?.templates || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load templates'
        });
        this.loading = false;
      }
    });
  }

  showCreateDialog() {
    this.isEditMode = false;
    this.resetTemplateForm();
    this.showTemplateDialog = true;
  }

  editTemplate(template: NotificationTemplate) {
    this.isEditMode = true;
    this.selectedTemplate = template;
    this.populateForm(template);
    this.showTemplateDialog = true;
  }

  populateForm(template: NotificationTemplate) {
    // Clear existing variables
    while (this.variablesFormArray.length !== 0) {
      this.variablesFormArray.removeAt(0);
    }

    // Populate form
    this.templateForm.patchValue({
      name: template.name,
      type: template.type,
      channels: template.channels,
      subject: template.subject,
      textContent: template.content.text,
      htmlContent: template.content.html || '',
      active: template.active
    });

    // Add variables
    if (template.variables) {
      template.variables.forEach(variable => {
        this.variablesFormArray.push(this.fb.group({
          name: [variable.name, Validators.required],
          type: [variable.type],
          required: [variable.required],
          description: [variable.description]
        }));
      });
    }
  }

  resetTemplateForm() {
    this.templateForm.reset({
      active: true,
      channels: []
    });
    // Clear variables array
    while (this.variablesFormArray.length !== 0) {
      this.variablesFormArray.removeAt(0);
    }
    this.selectedTemplate = null;
  }

  addVariable() {
    this.variablesFormArray.push(this.fb.group({
      name: ['', Validators.required],
      type: ['string'],
      required: [false],
      description: ['']
    }));
  }

  removeVariable(index: number) {
    this.variablesFormArray.removeAt(index);
  }

  saveTemplate() {
    if (this.templateForm.valid) {
      this.saving = true;
      const formValue = this.templateForm.value;
      
      const templateData: CreateTemplateRequest = {
        name: formValue.name,
        type: formValue.type,
        channels: formValue.channels,
        subject: formValue.subject,
        content: {
          text: formValue.textContent,
          html: formValue.htmlContent || undefined
        },
        variables: formValue.variables.map((v: any) => ({
          name: v.name,
          type: v.type,
          required: v.required,
          description: v.description
        })),
        metadata: {
          active: formValue.active
        }
      };

      const request$ = this.isEditMode && this.selectedTemplate
        ? this.notificationService.updateTemplate(this.selectedTemplate.id, templateData)
        : this.notificationService.createTemplate(templateData);

      request$.subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Template ${this.isEditMode ? 'updated' : 'created'} successfully`
          });
          this.showTemplateDialog = false;
          this.loadTemplates();
          this.saving = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to ${this.isEditMode ? 'update' : 'create'} template`
          });
          this.saving = false;
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.templateForm.controls).forEach(key => {
        this.templateForm.get(key)?.markAsTouched();
      });
    }
  }

  viewTemplate(template: NotificationTemplate) {
    this.selectedTemplate = template;
    this.templateSelected.emit(template);
  }

  previewTemplate(template: NotificationTemplate) {
    this.selectedTemplate = template;
    this.showPreviewDialog = true;
  }

  toggleTemplateStatus(template: NotificationTemplate) {
    const action = template.active ? 'deactivate' : 'activate';
    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} this template?`,
      header: `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      icon: 'pi pi-question-circle',
      accept: () => {
        this.notificationService.updateTemplate(template.id, { 
          metadata: { active: !template.active }
        } as any).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `Template ${action}d successfully`
            });
            this.loadTemplates();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Failed to ${action} template`
            });
          }
        });
      }
    });
  }

  deleteTemplate(template: NotificationTemplate) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this template? This action cannot be undone.',
      header: 'Confirm Delete',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.notificationService.deleteTemplate(template.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Template deleted successfully'
            });
            this.loadTemplates();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete template'
            });
          }
        });
      }
    });
  }

  formatType(type: string): string {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}