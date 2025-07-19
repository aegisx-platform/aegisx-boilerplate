import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

import { UserManagementClient } from '@aegisx-boilerplate/api-client';
import { User } from '@aegisx-boilerplate/types';
import { RbacService } from '../../services/rbac.service';
import { Role, UserRole, AssignRoleRequest } from '../../types/rbac.types';

@Component({
  selector: 'app-user-roles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    AutoCompleteModule,
    DatePickerModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-800">User Role Assignments</h2>
          <p class="text-sm text-gray-600">Manage role assignments for users</p>
        </div>
      </div>

      <!-- User Search -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Search User</h3>
        <div class="flex items-center space-x-4">
          <div class="flex-1">
            <p-autoComplete
              [(ngModel)]="selectedUser"
              [suggestions]="userSuggestions"
              (completeMethod)="searchUsers($event)"
              field="name"
              placeholder="Type to search users..."
              [dropdown]="true"
              [showClear]="true"
              styleClass="w-full">
              
              <ng-template let-user pTemplate="item">
                <div class="flex items-center space-x-3 p-2">
                  <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span class="text-sm font-medium text-indigo-600">
                      {{ getUserInitials(user) }}
                    </span>
                  </div>
                  <div>
                    <div class="font-medium">{{ user.name }}</div>
                    <div class="text-sm text-gray-500">{{ user.email }}</div>
                  </div>
                </div>
              </ng-template>
            </p-autoComplete>
          </div>
          <button
            (click)="loadUserRoles()"
            [disabled]="!selectedUser"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <i class="pi pi-search mr-2"></i>
            Load Roles
          </button>
        </div>
      </div>

      <!-- User Roles Table -->
      <div *ngIf="selectedUser" class="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <span class="text-sm font-medium text-indigo-600">
                  {{ getUserInitials(selectedUser) }}
                </span>
              </div>
              <div>
                <h3 class="text-lg font-medium text-gray-800">{{ selectedUser.name }}</h3>
                <p class="text-sm text-gray-500">{{ selectedUser.email }}</p>
              </div>
            </div>
            <button
              (click)="showAssignRoleDialog()"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
              <i class="pi pi-plus mr-2"></i>
              Assign Role
            </button>
          </div>
        </div>

        <p-table
          [value]="userRoles"
          [loading]="loading"
          responsiveLayout="scroll">
          
          <ng-template pTemplate="header">
            <tr>
              <th>Role</th>
              <th>Assigned By</th>
              <th>Assigned Date</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="body" let-userRole>
            <tr>
              <td>
                <div class="flex items-center space-x-2">
                  <i class="pi pi-shield text-indigo-600"></i>
                  <div>
                    <div class="font-medium">{{ userRole.role?.display_name }}</div>
                    <div class="text-sm text-gray-500">{{ userRole.role?.name }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="text-sm text-gray-600">
                  {{ userRole.assigned_by || 'System' }}
                </span>
              </td>
              <td>
                <span class="text-sm text-gray-600">
                  {{ userRole.created_at | date:'MMM d, y' }}
                </span>
              </td>
              <td>
                <p-tag
                  *ngIf="userRole.expires_at; else never"
                  [value]="(userRole.expires_at | date:'MMM d, y') || ''"
                  [severity]="getExpirationSeverity(userRole.expires_at)"
                  styleClass="text-xs">
                </p-tag>
                <ng-template #never>
                  <span class="text-sm text-gray-500">Never</span>
                </ng-template>
              </td>
              <td>
                <p-tag
                  [value]="userRole.is_active ? 'Active' : 'Inactive'"
                  [severity]="userRole.is_active ? 'success' : 'danger'"
                  styleClass="text-xs">
                </p-tag>
              </td>
              <td>
                <button
                  (click)="removeRole(userRole)"
                  [disabled]="userRole.role?.is_system"
                  pTooltip="Remove Role"
                  class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <i class="pi pi-trash"></i>
                </button>
              </td>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center py-8">
                <i class="pi pi-users text-4xl text-gray-300"></i>
                <p class="mt-2 text-gray-500">No roles assigned to this user</p>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Assign Role Dialog -->
      <p-dialog
        [(visible)]="assignDialogVisible"
        header="Assign Role"
        [modal]="true"
        [style]="{width: '500px'}">
        
        <form #assignForm="ngForm" (ngSubmit)="assignRole()" class="space-y-4">
          <!-- Role Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Select Role <span class="text-red-500">*</span>
            </label>
            <p-autoComplete
              [(ngModel)]="assignData.selectedRole"
              name="role"
              required
              [suggestions]="availableRoles"
              (completeMethod)="filterRoles($event)"
              field="display_name"
              placeholder="Select a role..."
              [dropdown]="true"
              styleClass="w-full">
              
              <ng-template let-role pTemplate="item">
                <div class="flex items-center space-x-2 p-2">
                  <i class="pi pi-shield text-indigo-600"></i>
                  <div>
                    <div class="font-medium">{{ role.display_name }}</div>
                    <div class="text-sm text-gray-500">{{ role.name }}</div>
                  </div>
                </div>
              </ng-template>
            </p-autoComplete>
          </div>

          <!-- Expiration Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Expiration Date (Optional)
            </label>
            <p-datePicker
              [(ngModel)]="assignData.expirationDate"
              name="expiration"
              [showIcon]="true"
              [minDate]="tomorrow"
              placeholder="Select expiration date..."
              styleClass="w-full">
            </p-datePicker>
            <small class="text-gray-500">
              Leave empty for permanent assignment
            </small>
          </div>
        </form>

        <ng-template pTemplate="footer">
          <div class="flex justify-end space-x-2">
            <button
              type="button"
              (click)="assignDialogVisible = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              (click)="assignRole()"
              [disabled]="!assignForm?.form?.valid || assigning"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <i class="pi pi-spinner pi-spin mr-2" *ngIf="assigning"></i>
              Assign Role
            </button>
          </div>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    :host ::ng-deep {
      .p-autocomplete {
        width: 100%;
        
        .p-autocomplete-input {
          width: 100%;
        }
      }
      
      .p-datepicker {
        width: 100%;
        
        .p-inputtext {
          width: 100%;
        }
      }
    }
  `]
})
export class UserRolesComponent implements OnInit {
  userClient = inject(UserManagementClient);
  rbacService = inject(RbacService);
  messageService = inject(MessageService);
  confirmationService = inject(ConfirmationService);

  selectedUser: User | null = null;
  userSuggestions: User[] = [];
  userRoles: UserRole[] = [];
  loading = false;

  assignDialogVisible = false;
  assigning = false;
  availableRoles: Role[] = [];
  assignData = {
    selectedRole: null as Role | null,
    expirationDate: null as Date | null
  };

  get tomorrow(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    this.rbacService.getRoles().subscribe(roles => {
      this.availableRoles = roles.filter(role => role.is_active);
    });
  }

  async searchUsers(event: any) {
    const query = event.query;
    if (query.length >= 2) {
      try {
        const response = await this.userClient.getUsers({ 
          search: query, 
          limit: 10 
        });
        this.userSuggestions = response.users;
      } catch (error) {
        console.error('Error searching users:', error);
        this.userSuggestions = [];
      }
    }
  }

  getUserInitials(user: User): string {
    if (!user) return '';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return user.name[0] || '';
  }

  loadUserRoles() {
    if (!this.selectedUser) return;

    this.loading = true;
    this.rbacService.getUserRoles(this.selectedUser.id).subscribe({
      next: (roles) => {
        this.userRoles = roles;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load user roles'
        });
      }
    });
  }

  showAssignRoleDialog() {
    this.assignData = {
      selectedRole: null,
      expirationDate: null
    };
    this.assignDialogVisible = true;
  }

  filterRoles(event: any) {
    const query = event.query.toLowerCase();
    this.availableRoles = this.availableRoles.filter(role =>
      role.display_name.toLowerCase().includes(query) ||
      role.name.toLowerCase().includes(query)
    );
  }

  assignRole() {
    if (!this.selectedUser || !this.assignData.selectedRole) return;

    const request: AssignRoleRequest = {
      role_id: this.assignData.selectedRole.id,
      expires_at: this.assignData.expirationDate?.toISOString()
    };

    this.assigning = true;
    this.rbacService.assignRoleToUser(this.selectedUser.id, request).subscribe({
      next: () => {
        this.assigning = false;
        this.assignDialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Role Assigned',
          detail: `Role "${this.assignData.selectedRole?.display_name}" has been assigned successfully`
        });
        this.loadUserRoles();
      },
      error: (error) => {
        this.assigning = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Assignment Failed',
          detail: error.error?.message || 'Failed to assign role'
        });
      }
    });
  }

  removeRole(userRole: UserRole) {
    if (!this.selectedUser || userRole.role?.is_system) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to remove the role "${userRole.role?.display_name}" from this user?`,
      header: 'Remove Role',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.rbacService.removeRoleFromUser(this.selectedUser!.id, userRole.role_id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Role Removed',
              detail: `Role "${userRole.role?.display_name}" has been removed successfully`
            });
            this.loadUserRoles();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Removal Failed',
              detail: error.error?.message || 'Failed to remove role'
            });
          }
        });
      }
    });
  }

  getExpirationSeverity(expirationDate: string): 'success' | 'warning' | 'danger' {
    const expiry = new Date(expirationDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry > 30) return 'success';
    if (daysUntilExpiry > 7) return 'warning';
    return 'danger';
  }
}