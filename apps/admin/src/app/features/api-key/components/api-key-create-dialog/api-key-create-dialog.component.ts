import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ApiKeyService, CreateApiKeyRequest, ApiKeyResponse } from '../../services/api-key.service';
import { MessageService } from 'primeng/api';

interface PermissionOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-api-key-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  template: `
    <p-dialog header="Create New API Key" 
              [visible]="visible" 
              (onHide)="onHide()"
              [style]="{width: '600px'}"
              [modal]="true">
      
      <form [formGroup]="apiKeyForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Basic Information -->
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Name <span class="text-red-500">*</span>
            </label>
            <input type="text" 
                   pInputText 
                   formControlName="name"
                   placeholder="e.g., Production API, Mobile App"
                   class="w-full"
                   [class.ng-invalid]="isFieldInvalid('name')" />
            <small class="text-red-500" *ngIf="isFieldInvalid('name')">
              Name is required and must be between 2-100 characters
            </small>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea formControlName="description"
                      placeholder="Optional description for this API key"
                      rows="3"
                      class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            </textarea>
          </div>
        </div>

        <!-- Permissions -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Resource Access
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label *ngFor="let resource of resourceOptions" class="flex items-center">
                <input type="checkbox" 
                       [value]="resource.value"
                       (change)="onResourceChange($event)"
                       class="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                <span class="text-sm text-gray-700">{{ resource.label }}</span>
              </label>
            </div>
            <small class="text-gray-500">
              Leave empty to grant access to all resources
            </small>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Actions
            </label>
            <div class="grid grid-cols-3 gap-2">
              <label *ngFor="let action of actionOptions" class="flex items-center">
                <input type="checkbox" 
                       [value]="action.value"
                       (change)="onActionChange($event)"
                       class="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                <span class="text-sm text-gray-700">{{ action.label }}</span>
              </label>
            </div>
            <small class="text-gray-500">
              Leave empty to grant all action permissions
            </small>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Scope
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label *ngFor="let scope of scopeOptions" class="flex items-center">
                <input type="checkbox" 
                       [value]="scope.value"
                       (change)="onScopeChange($event)"
                       class="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                <span class="text-sm text-gray-700">{{ scope.label }}</span>
              </label>
            </div>
            <small class="text-gray-500">
              Leave empty to grant all scope permissions
            </small>
          </div>
        </div>

        <!-- Security Settings -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Rate Limit (requests/minute)
            </label>
            <input type="number" 
                   formControlName="rateLimit"
                   min="1"
                   max="10000"
                   placeholder="1000"
                   class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <small class="text-gray-500">
              Leave empty for default rate limit
            </small>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Expires At
            </label>
            <input type="datetime-local" 
                   formControlName="expiresAt"
                   class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <small class="text-gray-500">
              Leave empty for no expiration
            </small>
          </div>
        </div>

        <!-- IP Whitelist -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            IP Whitelist (comma-separated)
          </label>
          <input type="text" 
                 formControlName="ipWhitelist"
                 placeholder="192.168.1.1, 10.0.0.1"
                 class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
          <small class="text-gray-500">
            Leave empty to allow access from any IP address. Separate multiple IPs with commas.
          </small>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end gap-2 pt-4 border-t">
          <button type="button" 
                  pButton 
                  label="Cancel" 
                  class="p-button-secondary"
                  (click)="onHide()"
                  [disabled]="loading">
          </button>
          
          <button type="submit" 
                  pButton 
                  label="Create API Key" 
                  class="p-button-primary"
                  [loading]="loading"
                  [disabled]="apiKeyForm.invalid">
          </button>
        </div>
      </form>

      <p-toast></p-toast>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep .p-multiselect {
      width: 100%;
    }
    
    :host ::ng-deep .p-inputnumber {
      width: 100%;
    }
    
    :host ::ng-deep .p-calendar {
      width: 100%;
    }
    
    :host ::ng-deep .p-chips {
      width: 100%;
    }

    :host ::ng-deep .p-chips .p-chips-multiple-container {
      width: 100%;
    }
  `]
})
export class ApiKeyCreateDialogComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onApiKeyCreated = new EventEmitter<ApiKeyResponse>();

  private fb = inject(FormBuilder);
  private apiKeyService = inject(ApiKeyService);
  private messageService = inject(MessageService);

  apiKeyForm: FormGroup;
  loading = false;
  minDate = new Date();

  resourceOptions: PermissionOption[] = [
    { label: 'Users', value: 'users' },
    { label: 'Roles', value: 'roles' },
    { label: 'API Keys', value: 'api_keys' },
    { label: 'Files', value: 'files' },
    { label: 'Reports', value: 'reports' },
    { label: 'Notifications', value: 'notifications' },
    { label: 'Audit Logs', value: 'audit_logs' },
    { label: 'System', value: 'system' }
  ];

  actionOptions: PermissionOption[] = [
    { label: 'Create', value: 'create' },
    { label: 'Read', value: 'read' },
    { label: 'Update', value: 'update' },
    { label: 'Delete', value: 'delete' },
    { label: 'Execute', value: 'execute' },
    { label: 'Manage', value: 'manage' }
  ];

  scopeOptions: PermissionOption[] = [
    { label: 'Own', value: 'own' },
    { label: 'Department', value: 'department' },
    { label: 'Organization', value: 'organization' },
    { label: 'All', value: 'all' }
  ];

  selectedResources: string[] = [];
  selectedActions: string[] = [];
  selectedScopes: string[] = [];

  constructor() {
    this.apiKeyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      rateLimit: [null, [Validators.min(1), Validators.max(10000)]],
      expiresAt: [null],
      ipWhitelist: ['']
    });
  }

  onHide() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  onSubmit() {
    if (this.apiKeyForm.valid) {
      this.loading = true;
      const formValue = this.apiKeyForm.value;

      const request: CreateApiKeyRequest = {
        name: formValue.name,
        description: formValue.description || undefined,
        permissions: {
          resources: this.selectedResources.length > 0 ? this.selectedResources : undefined,
          actions: this.selectedActions.length > 0 ? this.selectedActions : undefined,
          scopes: this.selectedScopes.length > 0 ? this.selectedScopes : undefined,
          rateLimit: formValue.rateLimit || undefined
        },
        expiresAt: formValue.expiresAt ? new Date(formValue.expiresAt).toISOString() : undefined,
        rateLimit: formValue.rateLimit || undefined,
        ipWhitelist: formValue.ipWhitelist ? formValue.ipWhitelist.split(',').map((ip: string) => ip.trim()).filter((ip: string) => ip) : undefined
      };

      this.apiKeyService.createApiKey(request).subscribe({
        next: (response) => {
          this.loading = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'API key created successfully'
          });
          this.onApiKeyCreated.emit(response);
          this.resetForm();
        },
        error: (error) => {
          this.loading = false;
          console.error('Failed to create API key:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to create API key'
          });
        }
      });
    }
  }

  onResourceChange(event: any) {
    const value = event.target.value;
    if (event.target.checked) {
      if (!this.selectedResources.includes(value)) {
        this.selectedResources.push(value);
      }
    } else {
      this.selectedResources = this.selectedResources.filter(r => r !== value);
    }
  }

  onActionChange(event: any) {
    const value = event.target.value;
    if (event.target.checked) {
      if (!this.selectedActions.includes(value)) {
        this.selectedActions.push(value);
      }
    } else {
      this.selectedActions = this.selectedActions.filter(a => a !== value);
    }
  }

  onScopeChange(event: any) {
    const value = event.target.value;
    if (event.target.checked) {
      if (!this.selectedScopes.includes(value)) {
        this.selectedScopes.push(value);
      }
    } else {
      this.selectedScopes = this.selectedScopes.filter(s => s !== value);
    }
  }

  private resetForm() {
    this.apiKeyForm.reset();
    this.selectedResources = [];
    this.selectedActions = [];
    this.selectedScopes = [];
  }

  isFieldInvalid(field: string): boolean {
    const control = this.apiKeyForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}