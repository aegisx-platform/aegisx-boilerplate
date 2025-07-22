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
import { CheckboxModule } from 'primeng/checkbox';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService, ConfirmationService } from 'primeng/api';

import { RbacService } from '../../services/rbac.service';
import { Role, CreateRoleRequest, UpdateRoleRequest, Permission, PermissionGroupWithAssignment, AssignPermissionsRequest, PermissionWithAssignment } from '../../types/rbac.types';
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
    CheckboxModule,
    IconFieldModule,
    InputIconModule,
    RoleDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <p-iconfield class="w-80">
            <p-inputicon class="pi pi-search" />
            <input
              type="text"
              pInputText
              [(ngModel)]="searchTerm"
              (input)="onSearch($event, dt)"
              placeholder="Search roles..." />
          </p-iconfield>
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
                  <button
                    (click)="showPermissionDetails(role)"
                    class="text-indigo-600 hover:text-indigo-700 underline cursor-pointer text-sm">
                    View
                  </button>
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
        [style]="{width: '900px'}"
        [maximizable]="true">
        
        <div *ngIf="selectedRole" class="space-y-6">
          <!-- Permission Statistics -->
          <div class="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div>
              <h4 class="text-sm font-medium text-gray-800">Permission Summary</h4>
              <p class="text-xs text-gray-600">
                {{ getAssignedPermissionsCount() }} of {{ allPermissions.length }} permissions assigned
              </p>
            </div>
            <div class="flex space-x-2">
              <button
                (click)="selectAllPermissions()"
                class="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100">
                Select All
              </button>
              <button
                (click)="clearAllPermissions()"
                class="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200">
                Clear All
              </button>
            </div>
          </div>

          <!-- Search Permissions -->
          <div>
            <div class="relative">
              <i class="pi pi-search absolute left-3 top-3 text-gray-400"></i>
              <input
                type="text"
                [(ngModel)]="permissionSearchTerm"
                (input)="filterPermissions()"
                placeholder="Search permissions..."
                class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            </div>
          </div>

          <!-- Permission Groups -->
          <div *ngIf="!permissionSearchTerm; else searchResults" class="space-y-4 max-h-96 overflow-y-auto">
            <div *ngFor="let group of permissionGroups" class="border border-gray-200 rounded-lg overflow-hidden">
              <!-- Group Header -->
              <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <i [class]="getResourceIcon(group.resource)" class="text-indigo-600"></i>
                    <div>
                      <h5 class="font-medium text-gray-800 capitalize">{{ group.resource }}</h5>
                      <p class="text-xs text-gray-500">
                        {{ getGroupAssignedCount(group) }} of {{ group.permissions.length }} permissions assigned
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button
                      (click)="toggleGroupPermissions(group)"
                      class="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100">
                      {{ isGroupFullyAssigned(group) ? 'Unselect' : 'Select' }} All
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Group Permissions -->
              <div class="p-4 space-y-2">
                <div *ngFor="let permission of group.permissions" class="flex items-center justify-between py-2">
                  <div class="flex items-center space-x-3">
                    <p-checkbox
                      [(ngModel)]="permission.assigned"
                      [binary]="true"
                      (onChange)="onPermissionChange(permission)">
                    </p-checkbox>
                    <div>
                      <p class="text-sm font-medium text-gray-800">{{ permission.display_name }}</p>
                      <p class="text-xs text-gray-500">
                        {{ permission.resource }}:{{ permission.action }}:{{ permission.scope }}
                      </p>
                      <p *ngIf="permission.description" class="text-xs text-gray-400 mt-1">
                        {{ permission.description }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <p-tag
                      [value]="permission.action"
                      [severity]="getActionSeverity(permission.action)"
                      styleClass="text-xs">
                    </p-tag>
                    <p-tag
                      [value]="permission.scope"
                      severity="secondary"
                      styleClass="text-xs">
                    </p-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Search Results -->
          <ng-template #searchResults>
            <div class="max-h-96 overflow-y-auto">
              <div class="space-y-2">
                <div *ngFor="let permission of filteredPermissions" class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <p-checkbox
                      [(ngModel)]="permission.assigned"
                      [binary]="true"
                      (onChange)="onPermissionChange(permission)">
                    </p-checkbox>
                    <div>
                      <p class="text-sm font-medium text-gray-800">{{ permission.display_name }}</p>
                      <p class="text-xs text-gray-500">
                        {{ permission.resource }}:{{ permission.action }}:{{ permission.scope }}
                      </p>
                      <p *ngIf="permission.description" class="text-xs text-gray-400 mt-1">
                        {{ permission.description }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <p-tag
                      [value]="permission.action"
                      [severity]="getActionSeverity(permission.action)"
                      styleClass="text-xs">
                    </p-tag>
                    <p-tag
                      [value]="permission.scope"
                      severity="secondary"
                      styleClass="text-xs">
                    </p-tag>
                  </div>
                </div>
                
                <div *ngIf="filteredPermissions.length === 0" class="text-center py-8 text-gray-500">
                  <i class="pi pi-search text-2xl"></i>
                  <p class="mt-2">No permissions found matching "{{ permissionSearchTerm }}"</p>
                </div>
              </div>
            </div>
          </ng-template>
        </div>
        
        <ng-template pTemplate="footer">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600">
              {{ getAssignedPermissionsCount() }} permissions selected
            </div>
            <div class="flex space-x-2">
              <button
                (click)="permissionsDialogVisible = false"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                (click)="savePermissions()"
                [disabled]="savingPermissions"
                class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                <i class="pi pi-spinner pi-spin mr-2" *ngIf="savingPermissions"></i>
                Save Permissions
              </button>
            </div>
          </div>
        </ng-template>
      </p-dialog>

      <!-- Permission Details Dialog -->
      <p-dialog
        [(visible)]="permissionDetailsVisible"
        [header]="'Permissions for: ' + selectedRole?.display_name"
        [modal]="true"
        [style]="{width: '700px'}">
        
        <div *ngIf="selectedRole && selectedRole.permissions" class="space-y-4">
          <!-- Permission Summary -->
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-800">Total Permissions</h4>
              <span class="text-2xl font-bold text-indigo-600">{{ selectedRole.permissions.length }}</span>
            </div>
          </div>

          <!-- Grouped Permissions -->
          <div class="space-y-3">
            <div *ngFor="let group of getGroupedPermissions(selectedRole)" 
                 class="border border-gray-200 rounded-lg overflow-hidden">
              <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <div class="flex items-center space-x-2">
                  <i [class]="getResourceIcon(group.resource)" class="text-indigo-600"></i>
                  <h5 class="font-medium text-gray-800 capitalize">{{ group.resource }}</h5>
                  <span class="text-sm text-gray-500">({{ group.permissions.length }})</span>
                </div>
              </div>
              <div class="p-3">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div *ngFor="let perm of group.permissions" 
                       class="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <p-tag
                      [value]="perm.action"
                      [severity]="getActionSeverity(perm.action)"
                      styleClass="text-xs">
                    </p-tag>
                    <span class="text-sm text-gray-700">{{ perm.display_name }}</span>
                    <p-tag
                      [value]="perm.scope"
                      severity="secondary"
                      styleClass="text-xs">
                    </p-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <button
            (click)="permissionDetailsVisible = false"
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
  savingPermissions = false;
  permissionDetailsVisible = false;
  
  // Permission management
  allPermissions: PermissionWithAssignment[] = [];
  permissionGroups: PermissionGroupWithAssignment[] = [];
  filteredPermissions: PermissionWithAssignment[] = [];
  permissionSearchTerm = '';

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
    
    // Load full role details with permissions first
    this.loading = true;
    this.rbacService.getRoleById(role.id).subscribe({
      next: (fullRole: Role) => {
        this.selectedRole = fullRole;
        this.loading = false;
        this.loadPermissions();
        this.permissionsDialogVisible = true;
      },
      error: (error: any) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load role permissions'
        });
      }
    });
  }

  loadPermissions() {
    this.rbacService.getPermissions().subscribe(permissions => {
      // Add assigned property to track permission assignments
      this.allPermissions = permissions.map(permission => ({
        ...permission,
        assigned: this.selectedRole?.permissions?.some(p => p.id === permission.id) || false
      }));
      
      // Group permissions by resource
      this.groupPermissions();
    });
  }

  groupPermissions() {
    const groups = new Map<string, PermissionGroupWithAssignment>();
    
    this.allPermissions.forEach(permission => {
      if (!groups.has(permission.resource)) {
        groups.set(permission.resource, {
          resource: permission.resource,
          permissions: []
        });
      }
      groups.get(permission.resource)!.permissions.push(permission);
    });
    
    this.permissionGroups = Array.from(groups.values()).sort((a, b) => 
      a.resource.localeCompare(b.resource)
    );
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

  // Permission management methods
  getAssignedPermissionsCount(): number {
    return this.allPermissions.filter(p => p.assigned).length;
  }

  getGroupAssignedCount(group: PermissionGroupWithAssignment): number {
    return group.permissions.filter(p => p.assigned).length;
  }

  isGroupFullyAssigned(group: PermissionGroupWithAssignment): boolean {
    return group.permissions.length > 0 && group.permissions.every(p => p.assigned);
  }

  selectAllPermissions() {
    this.allPermissions.forEach(permission => {
      permission.assigned = true;
    });
    this.groupPermissions();
  }

  clearAllPermissions() {
    this.allPermissions.forEach(permission => {
      permission.assigned = false;
    });
    this.groupPermissions();
  }

  toggleGroupPermissions(group: PermissionGroupWithAssignment) {
    const allAssigned = this.isGroupFullyAssigned(group);
    group.permissions.forEach(permission => {
      permission.assigned = !allAssigned;
    });
  }

  onPermissionChange(permission: PermissionWithAssignment) {
    // Permission assignment is handled by ngModel binding
    // This method can be used for additional logic if needed
  }

  filterPermissions() {
    if (!this.permissionSearchTerm.trim()) {
      this.filteredPermissions = [];
      return;
    }

    const searchTerm = this.permissionSearchTerm.toLowerCase();
    this.filteredPermissions = this.allPermissions.filter(permission =>
      permission.display_name.toLowerCase().includes(searchTerm) ||
      permission.resource.toLowerCase().includes(searchTerm) ||
      permission.action.toLowerCase().includes(searchTerm) ||
      permission.scope.toLowerCase().includes(searchTerm) ||
      (permission.description && permission.description.toLowerCase().includes(searchTerm))
    );
  }

  getResourceIcon(resource: string): string {
    const iconMap: { [key: string]: string } = {
      'users': 'pi pi-users',
      'roles': 'pi pi-sitemap',
      'permissions': 'pi pi-key',
      'api_keys': 'pi pi-shield',
      'files': 'pi pi-file',
      'storage': 'pi pi-folder',
      'notifications': 'pi pi-bell',
      'audit': 'pi pi-eye',
      'reports': 'pi pi-chart-bar',
      'settings': 'pi pi-cog'
    };
    return iconMap[resource] || 'pi pi-circle';
  }

  getActionSeverity(action: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    const severityMap: { [key: string]: 'success' | 'info' | 'warning' | 'danger' | 'secondary' } = {
      'read': 'info',
      'create': 'success',
      'update': 'warning',
      'delete': 'danger',
      'assign': 'secondary'
    };
    return severityMap[action] || 'secondary';
  }

  savePermissions() {
    if (!this.selectedRole) return;

    const assignedPermissionIds = this.allPermissions
      .filter(p => p.assigned)
      .map(p => p.id);

    const request: AssignPermissionsRequest = {
      permission_ids: assignedPermissionIds
    };

    this.savingPermissions = true;
    this.rbacService.assignPermissionsToRole(this.selectedRole.id, request).subscribe({
      next: () => {
        this.savingPermissions = false;
        this.permissionsDialogVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Permissions Updated',
          detail: `Permissions for role "${this.selectedRole?.display_name}" have been updated successfully`
        });
        
        // Refresh roles to get updated permission counts
        this.loadRoles();
      },
      error: (error) => {
        this.savingPermissions = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: error.error?.message || 'Failed to update permissions'
        });
      }
    });
  }

  getPermissionTooltip(role: Role): string {
    if (!role.permissions || role.permissions.length === 0) {
      return 'No permissions assigned';
    }

    // Group permissions by resource
    const grouped = role.permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(`${perm.action}:${perm.scope}`);
      return acc;
    }, {} as Record<string, string[]>);

    // Format as readable text
    const lines = Object.entries(grouped).map(([resource, actions]) => {
      return `${resource}: ${actions.join(', ')}`;
    });

    return lines.join('\n');
  }

  showPermissionDetails(role: Role) {
    this.selectedRole = role;
    
    // Load full role details with permissions
    this.loading = true;
    this.rbacService.getRoleById(role.id).subscribe({
      next: (fullRole: Role) => {
        this.selectedRole = fullRole;
        this.loading = false;
        this.permissionDetailsVisible = true;
      },
      error: (error: any) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load role permissions'
        });
      }
    });
  }

  getGroupedPermissions(role: Role): { resource: string; permissions: Permission[] }[] {
    if (!role.permissions || role.permissions.length === 0) {
      return [];
    }

    const grouped = role.permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);

    return Object.entries(grouped)
      .map(([resource, permissions]) => ({
        resource,
        permissions: permissions.sort((a, b) => {
          const actionOrder = ['read', 'create', 'update', 'delete', 'assign'];
          const actionDiff = actionOrder.indexOf(a.action) - actionOrder.indexOf(b.action);
          if (actionDiff !== 0) return actionDiff;
          
          const scopeOrder = ['own', 'department', 'all'];
          return scopeOrder.indexOf(a.scope) - scopeOrder.indexOf(b.scope);
        })
      }))
      .sort((a, b) => a.resource.localeCompare(b.resource));
  }
}