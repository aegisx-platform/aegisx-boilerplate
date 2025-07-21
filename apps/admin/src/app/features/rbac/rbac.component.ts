import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { RoleListComponent } from './components/role-list/role-list.component';
import { UserRolesComponent } from './components/user-roles/user-roles.component';
import { PermissionBrowserComponent } from './components/permission-browser/permission-browser.component';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { RbacService } from './services/rbac.service';
import { RoleStats } from './types/rbac.types';

@Component({
  selector: 'app-rbac',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    RoleListComponent,
    UserRolesComponent,
    PermissionBrowserComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="min-h-screen bg-slate-50">
      <div class="p-6 space-y-6">
        <!-- Page Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <i class="pi pi-shield text-indigo-600"></i>
              Role & Permission Management
            </h1>
            <p class="mt-1 text-sm text-gray-600">Manage roles, permissions, and user access control</p>
          </div>
          <div class="flex items-center space-x-3">
            <button
              (click)="refreshData()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm">
              <i class="pi pi-refresh mr-2"></i>
              Refresh
            </button>
            <button
              (click)="invalidateCache()"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">
              <i class="pi pi-sync mr-2"></i>
              Clear Cache
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i class="pi pi-sitemap text-xl text-indigo-600"></i>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Total Roles</p>
                <p class="text-2xl font-bold text-gray-800">{{ stats?.total_roles || 0 }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i class="pi pi-check-circle text-xl text-green-600"></i>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Active Roles</p>
                <p class="text-2xl font-bold text-gray-800">{{ stats?.active_roles || 0 }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i class="pi pi-users text-xl text-blue-600"></i>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Total Users</p>
                <p class="text-2xl font-bold text-gray-800">{{ stats?.total_users || 0 }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i class="pi pi-key text-xl text-purple-600"></i>
                </div>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Permissions</p>
                <p class="text-2xl font-bold text-gray-800">{{ stats?.total_permissions || 0 }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Custom Tab Navigation -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
          <!-- Tab Headers -->
          <div class="border-b border-gray-200">
            <nav class="flex space-x-8 px-6" aria-label="Tabs">
              <button
                *ngFor="let tab of tabs; let i = index"
                (click)="activeTabIndex = i"
                [class]="getTabClasses(i)"
                class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
                <i [class]="tab.icon + ' mr-2'"></i>
                {{ tab.label }}
              </button>
            </nav>
          </div>
          
          <!-- Tab Content -->
          <div class="p-6">
            <div [ngSwitch]="activeTabIndex">
              <div *ngSwitchCase="0">
                <app-role-list></app-role-list>
              </div>
              <div *ngSwitchCase="1">
                <app-user-roles></app-user-roles>
              </div>
              <div *ngSwitchCase="2">
                <app-permission-browser></app-permission-browser>
              </div>
            </div>
          </div>
        </div>

        <!-- Toast Messages -->
        <p-toast></p-toast>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep {
      /* Custom tab styles handled by Tailwind classes */
    }
  `]
})
export class RbacComponent implements OnInit {
  rbacService = inject(RbacService);
  messageService = inject(MessageService);
  
  activeTabIndex = 0;
  stats: RoleStats | null = null;
  
  tabs = [
    { label: 'Roles', icon: 'pi pi-sitemap' },
    { label: 'User Assignments', icon: 'pi pi-users' },
    { label: 'Permissions', icon: 'pi pi-key' }
  ];

  ngOnInit() {
    this.loadData();
  }

  getTabClasses(index: number): string {
    return index === this.activeTabIndex
      ? 'border-indigo-500 text-indigo-600'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
  }

  loadData() {
    // Load initial data
    this.rbacService.getRoles().subscribe();
    this.rbacService.getPermissions().subscribe();
    
    // Get stats
    this.rbacService.getRoleStats().subscribe(stats => {
      this.stats = stats;
    });
  }

  refreshData() {
    this.loadData();
    this.messageService.add({
      severity: 'success',
      summary: 'Data Refreshed',
      detail: 'All data has been refreshed successfully'
    });
  }

  invalidateCache() {
    this.rbacService.invalidateAllCache().subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Cache Cleared',
          detail: 'RBAC cache has been cleared successfully'
        });
        this.loadData();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to clear cache'
        });
      }
    });
  }
}