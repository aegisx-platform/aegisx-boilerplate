import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';

import { RbacService } from '../../services/rbac.service';
import { Role, CreateRoleRequest, UpdateRoleRequest } from '../../types/rbac.types';
import { RoleDialogComponent } from './role-dialog.component';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    DialogModule,
    ToggleSwitchModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
    RoleDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="relative">
            <i class="pi pi-search absolute left-3 top-3 text-gray-500"></i>
            <input
              type="text"
              pInputText
              [(ngModel)]="searchTerm"
              (input)="onSearch($event, dt)"
              placeholder="Search roles..."
              class="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
          </div>
        </div>
        <button
          (click)="showCreateDialog()"
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">
          <i class="pi pi-plus mr-2"></i>
          New Role
        </button>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
        <p-table
          #dt
          [value]="(roles$ | async) || []"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          [globalFilterFields]="['name', 'display_name', 'description']"
          [loading]="loading"
          responsiveLayout="scroll"
          styleClass="custom-table">
          
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 20%">Role Name</th>
              <th style="width: 25%">Display Name</th>
              <th style="width: 15%">Users</th>
              <th style="width: 15%">Permissions</th>
              <th style="width: 10%">Status</th>
              <th style="width: 15%">Actions</th>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="body" let-role>
            <tr>
              <td>
                <div class="flex items-center space-x-2">
                  <i class="pi pi-shield text-indigo-600"></i>
                  <span class="font-medium">{{ role.name }}</span>
                  <p-tag
                    *ngIf="role.is_system"
                    value="System"
                    severity="secondary"
                    styleClass="text-xs">
                  </p-tag>
                </div>
              </td>
              <td>
                <div>
                  <p class="font-medium text-gray-800">{{ role.display_name }}</p>
                  <p class="text-sm text-gray-500" *ngIf="role.description">{{ role.description }}</p>
                </div>
              </td>
              <td>
                <div class="flex items-center space-x-2">
                  <i class="pi pi-users text-gray-500"></i>
                  <span>{{ role.user_count || 0 }}</span>
                </div>
              </td>
              <td>
                <div class="flex items-center space-x-2">
                  <i class="pi pi-key text-gray-500"></i>
                  <span>{{ role.permissions?.length || 0 }}</span>
                </div>
              </td>
              <td>
                <p-toggleswitch
                  [(ngModel)]="role.is_active"
                  (onChange)="toggleRoleStatus(role)"
                  [disabled]="role.is_system"
                  pTooltip="System roles cannot be disabled">
                </p-toggleswitch>
              </td>
              <td>
                <div class="flex items-center space-x-2">
                  <button
                    (click)="viewPermissions(role)"
                    pTooltip="Manage Permissions"
                    class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <i class="pi pi-key"></i>
                  </button>
                  <button
                    (click)="editRole(role)"
                    pTooltip="Edit Role"
                    class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button
                    (click)="deleteRole(role)"
                    [disabled]="role.is_system"
                    pTooltip="Delete Role"
                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center py-8">
                <i class="pi pi-inbox text-4xl text-gray-300"></i>
                <p class="mt-2 text-gray-500">No roles found</p>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Create/Edit Dialog -->
      <app-role-dialog
        [(visible)]="dialogVisible"
        [role]="selectedRole"
        [mode]="dialogMode"
        (save)="onSaveRole($event)"
        (cancel)="dialogVisible = false">
      </app-role-dialog>

      <!-- Permissions Dialog -->
      <p-dialog
        [(visible)]="permissionsDialogVisible"
        [header]="'Manage Permissions: ' + selectedRole?.display_name"
        [modal]="true"
        [style]="{width: '800px'}"
        [maximizable]="true">
        
        <div *ngIf="selectedRole" class="space-y-4">
          <!-- Coming soon: Permission assignment UI -->
          <p class="text-gray-600">Permission assignment interface will be implemented here.</p>
          <p class="text-sm text-gray-500">
            Current permissions: {{ selectedRole.permissions?.length || 0 }}
          </p>
        </div>
        
        <ng-template pTemplate="footer">
          <button
            (click)="permissionsDialogVisible = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Close
          </button>
        </ng-template>
      </p-dialog>

      <!-- Confirmation Dialog -->
      <p-confirmDialog></p-confirmDialog>
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    :host ::ng-deep {
      .custom-table {
        .p-datatable-header {
          @apply bg-gray-50 border-b border-gray-200;
        }
        
        .p-datatable-thead > tr > th {
          @apply bg-gray-50 text-gray-700 font-medium text-sm border-b border-gray-200;
        }
        
        .p-datatable-tbody > tr {
          @apply hover:bg-gray-50 transition-colors;
          
          > td {
            @apply border-b border-gray-100;
          }
        }
        
        .p-paginator {
          @apply border-t border-gray-200 px-4 py-3;
        }
      }
    }
  `]
})
export class RoleListComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  
  rbacService = inject(RbacService);
  messageService = inject(MessageService);
  confirmationService = inject(ConfirmationService);
  
  roles$ = this.rbacService.roles$;
  loading = false;
  searchTerm = '';
  
  dialogVisible = false;
  dialogMode: 'create' | 'edit' = 'create';
  selectedRole: Role | null = null;
  
  permissionsDialogVisible = false;

  ngOnInit() {
    this.loadRoles();
  }

  onSearch(event: Event, table: Table) {
    const target = event.target as HTMLInputElement;
    table.filterGlobal(target.value || '', 'contains');
  }

  loadRoles() {
    this.loading = true;
    this.rbacService.getRoles().subscribe({
      next: () => {
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load roles'
        });
      }
    });
  }

  showCreateDialog() {
    this.dialogMode = 'create';
    this.selectedRole = null;
    this.dialogVisible = true;
  }

  editRole(role: Role) {
    this.dialogMode = 'edit';
    this.selectedRole = role;
    this.dialogVisible = true;
  }

  deleteRole(role: Role) {
    if (role.is_system) return;
    
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the role "${role.display_name}"? This action cannot be undone.`,
      header: 'Delete Role',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg',
      rejectButtonStyleClass: 'bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg border border-gray-200',
      accept: () => {
        this.rbacService.deleteRole(role.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Role Deleted',
              detail: `Role "${role.display_name}" has been deleted successfully`
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Delete Failed',
              detail: error.error?.message || 'Failed to delete role'
            });
          }
        });
      }
    });
  }

  toggleRoleStatus(role: Role) {
    const data: UpdateRoleRequest = {
      is_active: role.is_active
    };
    
    this.rbacService.updateRole(role.id, data).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Status Updated',
          detail: `Role "${role.display_name}" has been ${role.is_active ? 'activated' : 'deactivated'}`
        });
      },
      error: (error) => {
        // Revert the change
        role.is_active = !role.is_active;
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: error.error?.message || 'Failed to update role status'
        });
      }
    });
  }

  viewPermissions(role: Role) {
    this.selectedRole = role;
    this.permissionsDialogVisible = true;
  }

  onSaveRole(data: CreateRoleRequest | UpdateRoleRequest) {
    if (this.dialogMode === 'create') {
      this.createRole(data as CreateRoleRequest);
    } else {
      this.updateRole(data as UpdateRoleRequest);
    }
  }

  private createRole(data: CreateRoleRequest) {
    this.rbacService.createRole(data).subscribe({
      next: (role) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Role Created',
          detail: `Role "${role.display_name}" has been created successfully`
        });
        this.dialogVisible = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Create Failed',
          detail: error.error?.message || 'Failed to create role'
        });
      }
    });
  }

  private updateRole(data: UpdateRoleRequest) {
    if (!this.selectedRole) return;
    
    this.rbacService.updateRole(this.selectedRole.id, data).subscribe({
      next: (role) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Role Updated',
          detail: `Role "${role.display_name}" has been updated successfully`
        });
        this.dialogVisible = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: error.error?.message || 'Failed to update role'
        });
      }
    });
  }
}