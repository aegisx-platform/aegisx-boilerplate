import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';

import { RbacService } from '../../services/rbac.service';
import { Permission, PermissionGroup } from '../../types/rbac.types';

@Component({
  selector: 'app-permission-browser',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    TagModule,
    CardModule,
    ChipModule,
    TooltipModule
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-800">Permission Browser</h2>
          <p class="text-sm text-gray-600">Browse all available permissions in the system</p>
        </div>
        <div class="text-sm text-gray-500">
          Total: {{ (permissions$ | async)?.length || 0 }} permissions
        </div>
      </div>

      <!-- Search -->
      <div class="relative">
        <i class="pi pi-search absolute left-3 top-3 text-gray-500"></i>
        <input
          type="text"
          pInputText
          [(ngModel)]="searchTerm"
          (input)="filterPermissions()"
          placeholder="Search permissions..."
          class="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
      </div>

      <!-- Permission Groups -->
      <div *ngIf="filteredGroups.length > 0; else noResults" class="space-y-4">
        <div *ngFor="let group of filteredGroups; trackBy: trackByResource" 
             class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          
          <!-- Group Header -->
          <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <i [class]="getResourceIcon(group.resource)" class="text-indigo-600"></i>
                <span class="font-medium text-gray-800 capitalize">{{ group.resource }}</span>
                <p-tag
                  [value]="group.permissions.length.toString()"
                  severity="secondary"
                  styleClass="text-xs">
                </p-tag>
              </div>
            </div>
          </div>

          <!-- Group Content -->
          <div class="p-6">
            <div class="space-y-3">
              <div
                *ngFor="let permission of group.permissions; trackBy: trackByPermission"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                
                <div class="flex items-center space-x-3">
                  <i [class]="'pi ' + rbacService.getPermissionIcon(permission.action)"
                     [style.color]="getActionColor(permission.action)"></i>
                  
                  <div>
                    <div class="flex items-center space-x-2">
                      <span class="font-medium text-gray-800">{{ permission.display_name }}</span>
                      <p-chip
                        [label]="permission.action"
                        [style]="{ 'background-color': getActionColor(permission.action), 'color': 'white' }"
                        styleClass="text-xs">
                      </p-chip>
                      <p-chip
                        [label]="permission.scope"
                        styleClass="text-xs">
                      </p-chip>
                    </div>
                    <p class="text-sm text-gray-500 mt-1" *ngIf="permission.description">
                      {{ permission.description }}
                    </p>
                  </div>
                </div>
                
                <div class="text-right">
                  <code class="text-xs bg-gray-200 px-2 py-1 rounded font-mono">
                    {{ rbacService.formatPermission(permission) }}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <ng-template #noResults>
        <div class="text-center py-12">
          <i class="pi pi-search text-4xl text-gray-300"></i>
          <h3 class="mt-4 text-lg font-medium text-gray-800">No permissions found</h3>
          <p class="mt-2 text-gray-500">
            {{ searchTerm ? 'Try adjusting your search terms' : 'Loading permissions...' }}
          </p>
        </div>
      </ng-template>

      <!-- Permission Summary -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Permission Summary</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ getActionCount('read') }}</div>
            <div class="text-sm text-gray-500">Read Permissions</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ getActionCount('create') }}</div>
            <div class="text-sm text-gray-500">Create Permissions</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">{{ getActionCount('update') }}</div>
            <div class="text-sm text-gray-500">Update Permissions</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600">{{ getActionCount('delete') }}</div>
            <div class="text-sm text-gray-500">Delete Permissions</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep {
      .p-chip {
        @apply text-xs;
      }
    }
  `]
})
export class PermissionBrowserComponent implements OnInit {
  rbacService = inject(RbacService);
  
  permissions$ = this.rbacService.permissions$;
  permissionGroups: PermissionGroup[] = [];
  filteredGroups: PermissionGroup[] = [];
  searchTerm = '';

  ngOnInit() {
    this.loadPermissions();
  }

  loadPermissions() {
    this.rbacService.getPermissions().subscribe();
    
    this.rbacService.getGroupedPermissions().subscribe(groups => {
      this.permissionGroups = groups;
      this.filterPermissions();
    });
  }

  filterPermissions() {
    if (!this.searchTerm.trim()) {
      this.filteredGroups = [...this.permissionGroups];
      return;
    }

    const search = this.searchTerm.toLowerCase();
    this.filteredGroups = this.permissionGroups
      .map(group => ({
        ...group,
        permissions: group.permissions.filter(permission =>
          permission.display_name.toLowerCase().includes(search) ||
          permission.resource.toLowerCase().includes(search) ||
          permission.action.toLowerCase().includes(search) ||
          permission.scope.toLowerCase().includes(search) ||
          (permission.description && permission.description.toLowerCase().includes(search))
        )
      }))
      .filter(group => group.permissions.length > 0);
  }

  getGroupHeader(group: PermissionGroup): string {
    return `${group.resource} (${group.permissions.length})`;
  }

  getResourceIcon(resource: string): string {
    const icons: Record<string, string> = {
      'users': 'pi-users',
      'roles': 'pi-sitemap',
      'permissions': 'pi-key',
      'patients': 'pi-heart',
      'appointments': 'pi-calendar',
      'medical-records': 'pi-file-medical',
      'billing': 'pi-credit-card',
      'inventory': 'pi-box',
      'audit': 'pi-history',
      'notifications': 'pi-bell',
      'storage': 'pi-cloud',
      'reports': 'pi-chart-bar'
    };
    return `pi ${icons[resource] || 'pi-circle'}`;
  }

  getActionColor(action: string): string {
    const colors: Record<string, string> = {
      'read': '#3b82f6',     // blue
      'create': '#10b981',   // green
      'update': '#f59e0b',   // orange
      'delete': '#ef4444',   // red
      'assign': '#8b5cf6'    // purple
    };
    return colors[action] || '#6b7280'; // gray
  }

  getScopeSeverity(scope: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    const severities: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      'own': 'info',
      'department': 'warning',
      'all': 'danger'
    };
    return severities[scope];
  }

  getActionCount(action: string): number {
    return this.permissionGroups
      .flatMap(group => group.permissions)
      .filter(permission => permission.action === action)
      .length;
  }

  trackByResource(index: number, group: PermissionGroup): string {
    return group.resource;
  }

  trackByPermission(index: number, permission: Permission): string {
    return permission.id;
  }
}