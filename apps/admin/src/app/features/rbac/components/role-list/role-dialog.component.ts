import { Component, EventEmitter, Input, Output, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ButtonModule } from 'primeng/button';

import { Role, CreateRoleRequest, UpdateRoleRequest } from '../../types/rbac.types';

@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    ToggleSwitchModule,
    ButtonModule
  ],
  template: `
    <p-dialog
      [(visible)]="visible"
      [header]="dialogTitle"
      [modal]="true"
      [style]="{width: '500px'}"
      [closable]="true"
      (onHide)="onCancel()">
      
      <form #roleForm="ngForm" (ngSubmit)="onSubmit(roleForm)" class="space-y-6">
        <!-- Role Name (only for create) -->
        <div *ngIf="mode === 'create'">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Role Name <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            pInputText
            [(ngModel)]="formData.name"
            name="name"
            required
            minlength="2"
            maxlength="50"
            pattern="^[a-zA-Z0-9_-]+$"
            placeholder="e.g., manager, doctor, nurse"
            class="w-full">
          <small class="text-gray-500">
            Lowercase letters, numbers, underscores, and hyphens only
          </small>
        </div>

        <!-- Display Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Display Name <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            pInputText
            [(ngModel)]="formData.display_name"
            name="display_name"
            required
            minlength="2"
            maxlength="100"
            placeholder="e.g., Manager, Doctor, Nurse"
            class="w-full">
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            pInputText
            [(ngModel)]="formData.description"
            name="description"
            rows="3"
            maxlength="500"
            placeholder="Optional description of this role..."
            class="w-full resize-none">
          </textarea>
        </div>

        <!-- Active Status -->
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label class="text-sm font-medium text-gray-700">Active Status</label>
            <p class="text-xs text-gray-500">
              Inactive roles cannot be assigned to users
            </p>
          </div>
          <p-toggleswitch
            [(ngModel)]="formData.is_active"
            name="is_active">
          </p-toggleswitch>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end space-x-2">
          <button
            type="button"
            (click)="onCancel()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            (click)="onSubmit(roleForm)"
            [disabled]="!roleForm.form.valid || loading"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <i class="pi pi-spinner pi-spin mr-2" *ngIf="loading"></i>
            {{ mode === 'create' ? 'Create Role' : 'Update Role' }}
          </button>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep {
      .p-dialog .p-dialog-content {
        @apply p-6;
      }
      
      .p-inputtext {
        @apply w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500;
      }
      
      textarea.p-inputtext {
        @apply min-h-[80px];
      }
    }
  `]
})
export class RoleDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() role: Role | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() loading = false;
  
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<CreateRoleRequest | UpdateRoleRequest>();
  @Output() cancel = new EventEmitter<void>();

  formData: any = this.getInitialFormData();

  get dialogTitle(): string {
    return this.mode === 'create' ? 'Create New Role' : 'Edit Role';
  }

  ngOnChanges() {
    if (this.visible) {
      this.resetForm();
    }
  }

  private getInitialFormData() {
    return {
      name: '',
      display_name: '',
      description: '',
      is_active: true
    };
  }

  private resetForm() {
    if (this.mode === 'create') {
      this.formData = this.getInitialFormData();
    } else if (this.role) {
      this.formData = {
        name: this.role.name,
        display_name: this.role.display_name,
        description: this.role.description || '',
        is_active: this.role.is_active
      };
    }
  }

  onSubmit(form: NgForm) {
    if (!form.valid) return;

    const data = this.mode === 'create' 
      ? {
          name: this.formData.name,
          display_name: this.formData.display_name,
          description: this.formData.description || undefined,
          is_active: this.formData.is_active
        } as CreateRoleRequest
      : {
          display_name: this.formData.display_name,
          description: this.formData.description || undefined,
          is_active: this.formData.is_active
        } as UpdateRoleRequest;

    this.save.emit(data);
  }

  onCancel() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.cancel.emit();
  }
}