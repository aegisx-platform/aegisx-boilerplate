import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormsModule } from '@angular/forms';

import { UserManagementClient } from '@aegisx-boilerplate/api-client';
import {
  User,
  UserListParams,
  UserStatsResponse,
  UserStatus,
  CreateUserRequest,
  UpdateUserRequest,
  BulkActionRequest
} from '@aegisx-boilerplate/types';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    FormsModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="min-h-screen bg-slate-50">
      <div class="p-6 space-y-6">
        <!-- Page Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-800">User Management</h1>
            <p class="mt-1 text-sm text-gray-600">Manage users, roles and permissions</p>
          </div>
          <div class="flex items-center space-x-3">
            <button
              (click)="exportUsers()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm">
              <i class="pi pi-download mr-2"></i>
              Export
            </button>
            <button
              (click)="showCreateUserDialog()"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">
              <i class="pi pi-plus mr-2"></i>
              New User
            </button>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div *ngFor="let stat of userStats" class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <i [class]="stat.icon" class="text-2xl text-indigo-600"></i>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">{{ stat.label }}</p>
                <p class="text-2xl font-bold text-gray-800">{{ stat.value }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Users Table -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-800">Users</h3>
              <div class="flex items-center space-x-3">
                <!-- Search -->
                <div class="relative">
                  <i class="pi pi-search absolute left-3 top-3 text-gray-500"></i>
                  <input
                    type="text"
                    placeholder="Search users..."
                    [(ngModel)]="searchTerm"
                    (input)="onSearchChange()"
                    class="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm">
                </div>

              <!-- Status Filter -->
              <p-select
                [options]="statusOptions"
                [(ngModel)]="selectedStatus"
                (onChange)="onStatusChange()"
                placeholder="All Status"
                optionLabel="label"
                optionValue="value"
                class="w-32">
              </p-select>

              <!-- Bulk Actions -->
              <p-select
                [options]="bulkActionOptions"
                [(ngModel)]="selectedBulkAction"
                (onChange)="onBulkActionChange()"
                placeholder="Bulk Actions"
                optionLabel="label"
                optionValue="value"
                [disabled]="selectedUsers.length === 0"
                class="w-32">
              </p-select>
            </div>
          </div>
        </div>

        <p-table
          [value]="users"
          [loading]="loading()"
          [totalRecords]="totalUsers"
          [lazy]="true"
          [paginator]="true"
          [rows]="pageSize"
          [rowsPerPageOptions]="[10, 25, 50, 100]"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} users"
          (onLazyLoad)="loadUsers($event)"
          dataKey="id"
          [(selection)]="selectedUsers"
          responsiveLayout="scroll">

          <ng-template pTemplate="header">
            <tr>
              <th style="width: 3rem">
                <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
              </th>
              <th pSortableColumn="name">
                Name
                <p-sortIcon field="name"></p-sortIcon>
              </th>
              <th pSortableColumn="email">
                Email
                <p-sortIcon field="email"></p-sortIcon>
              </th>
              <th>Role</th>
              <th pSortableColumn="status">
                Status
                <p-sortIcon field="status"></p-sortIcon>
              </th>
              <th pSortableColumn="last_login_at">
                Last Login
                <p-sortIcon field="last_login_at"></p-sortIcon>
              </th>
              <th pSortableColumn="created_at">
                Created
                <p-sortIcon field="created_at"></p-sortIcon>
              </th>
              <th>Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-user>
            <tr>
              <td>
                <p-tableCheckbox [value]="user"></p-tableCheckbox>
              </td>
              <td>
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                    <i class="pi pi-user text-indigo-600 text-sm"></i>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ user.name }}</p>
                    <p class="text-sm text-gray-500">{{ user.username }}</p>
                  </div>
                </div>
              </td>
              <td>{{ user.email }}</td>
              <td>
                <span *ngFor="let role of user.roles; let last = last"
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                  {{ role.name }}
                </span>
              </td>
              <td>
                <p-tag
                  [value]="user.status"
                  [severity]="getStatusSeverity(user.status)">
                </p-tag>
              </td>
              <td>{{ user.last_login_at | date:'short' }}</td>
              <td>{{ user.created_at | date:'short' }}</td>
              <td>
                <div class="flex items-center space-x-2">
                  <button
                    type="button"
                    (click)="editUser(user); $event.stopPropagation()"
                    class="p-2 text-gray-500 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded transition-colors"
                    title="Edit User">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    (click)="viewUser(user); $event.stopPropagation()"
                    class="p-2 text-gray-500 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded transition-colors"
                    title="View Details">
                    <i class="pi pi-eye"></i>
                  </button>
                  <button
                    type="button"
                    (click)="deleteUser(user); $event.stopPropagation()"
                    class="p-2 text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded transition-colors"
                    title="Delete User">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="8" class="text-center py-8">
                <div class="flex flex-col items-center">
                  <i class="pi pi-users text-4xl text-gray-400 mb-4"></i>
                  <p class="text-gray-500 text-lg">No users found</p>
                  <p class="text-gray-400 text-sm">Try adjusting your search or filters</p>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <!-- Create/Edit User Dialog -->
    <p-dialog
      [(visible)]="showUserDialog"
      [modal]="true"
      [style]="{width: '600px'}"
      [header]="dialogMode === 'create' ? 'Create New User' : 'Edit User'"
      [closable]="true">

      <form (ngSubmit)="saveUser()" #userForm="ngForm">
        <!-- Personal Information Section -->
        <div class="mb-6">
          <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <i class="pi pi-user mr-2 text-indigo-600"></i>
            Personal Information
          </h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Full Name -->
            <div class="md:col-span-2">
              <label class="block">
                <span class="block text-sm font-medium text-gray-700 mb-2">
                  <span class="text-red-500">*</span> Full Name
                </span>
                <input
                  type="text"
                  [(ngModel)]="currentUser.name"
                  name="name"
                  required
                  placeholder="Enter full name"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
              </label>
            </div>

            <!-- Email -->
            <div>
              <label class="block">
                <span class="block text-sm font-medium text-gray-700 mb-2">
                  <span class="text-red-500">*</span> Email Address
                </span>
                <input
                  type="email"
                  [(ngModel)]="currentUser.email"
                  name="email"
                  required
                  placeholder="Enter email address"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
              </label>
            </div>

            <!-- Username -->
            <div>
              <label class="block">
                <span class="block text-sm font-medium text-gray-700 mb-2">Username</span>
                <input
                  type="text"
                  [(ngModel)]="currentUser.username"
                  name="username"
                  placeholder="Enter username (optional)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
              </label>
            </div>

            <!-- Phone -->
            <div>
              <label class="block">
                <span class="block text-sm font-medium text-gray-700 mb-2">Phone Number</span>
                <input
                  type="tel"
                  [(ngModel)]="currentUser.phone"
                  name="phone"
                  placeholder="Enter phone number (optional)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
              </label>
            </div>

            <!-- Status -->
            <div>
              <label class="block">
                <span class="block text-sm font-medium text-gray-700 mb-2">Account Status</span>
                <p-select
                  [(ngModel)]="currentUser.status"
                  name="status"
                  [options]="userStatusOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select account status"
                  class="w-full">
                </p-select>
              </label>
            </div>
          </div>
        </div>

        <!-- Security Section (for create mode only) -->
        <div *ngIf="dialogMode === 'create'" class="mb-6">
          <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <i class="pi pi-shield mr-2 text-indigo-600"></i>
            Security Settings
          </h4>

          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block">
                <span class="block text-sm font-medium text-gray-700 mb-2">
                  <span class="text-red-500">*</span> Password
                </span>
                <input
                  type="password"
                  [(ngModel)]="currentUser.password"
                  name="password"
                  required
                  placeholder="Enter secure password"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors">
              </label>
              <p class="text-xs text-gray-500 mt-1">Password should be at least 8 characters long</p>
            </div>
          </div>
        </div>

        <!-- Edit Mode Info -->
        <div *ngIf="dialogMode === 'edit'" class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-start">
            <i class="pi pi-info-circle text-blue-600 mr-2 mt-0.5"></i>
            <div class="text-sm text-blue-800">
              <p class="font-medium mb-1">Editing User Account</p>
              <p>You can update the user's information. Password changes require a separate action.</p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            (click)="cancelUserDialog()"
            class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-colors">
            <i class="pi pi-times mr-2"></i>
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="!userForm.valid || saving()"
            class="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <i class="pi" [ngClass]="saving() ? 'pi-spin pi-spinner' : (dialogMode === 'create' ? 'pi-plus' : 'pi-check')" class="mr-2"></i>
            {{ saving() ? 'Saving...' : (dialogMode === 'create' ? 'Create User' : 'Update User') }}
          </button>
        </div>
      </form>
    </p-dialog>

    <!-- User Detail View Dialog -->
    <p-dialog
      [(visible)]="showUserDetailDialog"
      [modal]="true"
      [style]="{width: '800px', maxWidth: '95vw'}"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      styleClass="user-detail-dialog"
      (onHide)="closeUserDetailDialog()">

      <!-- Custom Header -->
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full pr-4">
          <h2 class="text-xl font-semibold text-gray-800">User Details</h2>
        </div>
      </ng-template>

      <div *ngIf="selectedUserDetail" class="space-y-6">
        <!-- User Header - Simple Design -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div class="flex items-center space-x-4">
            <!-- Simple Avatar -->
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <i class="pi pi-user text-indigo-600 text-xl"></i>
            </div>

            <!-- User Info -->
            <div class="flex-1">
              <h3 class="text-xl font-semibold text-gray-800">{{ selectedUserDetail.name }}</h3>
              <p class="text-gray-600 mt-1">{{ selectedUserDetail.email }}</p>
              <div class="flex items-center mt-2 space-x-3">
                <span class="text-sm text-gray-500">{{ selectedUserDetail.username || 'No username' }}</span>
                <span *ngIf="selectedUserDetail.email_verified_at" class="text-sm text-green-600">
                  <i class="pi pi-verified mr-1"></i>Verified
                </span>
                <span *ngIf="!selectedUserDetail.email_verified_at" class="text-sm text-yellow-600">
                  <i class="pi pi-exclamation-triangle mr-1"></i>Unverified
                </span>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="text-right">
              <p-tag
                [value]="selectedUserDetail.status"
                [severity]="getStatusSeverity(selectedUserDetail.status)">
              </p-tag>
            </div>
          </div>
        </div>

        <!-- Information Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Personal Information -->
          <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 class="text-lg font-medium text-gray-800 mb-4">Personal Information</h4>
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-gray-600">Full Name</label>
                <p class="text-sm text-gray-800">{{ selectedUserDetail.name || 'Not provided' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Username</label>
                <p class="text-sm text-gray-800">{{ selectedUserDetail.username || 'Not set' }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Email Address</label>
                <p class="text-sm text-gray-800">{{ selectedUserDetail.email }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Phone Number</label>
                <p class="text-sm text-gray-800">{{ selectedUserDetail.phone || 'Not provided' }}</p>
              </div>
            </div>
          </div>

          <!-- Account Information -->
          <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 class="text-lg font-medium text-gray-800 mb-4">Account Information</h4>
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-gray-600">User ID</label>
                <p class="text-sm text-gray-800 font-mono bg-slate-50 px-2 py-1 rounded">{{ selectedUserDetail.id }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Account Status</label>
                <p class="text-sm text-gray-800 capitalize">{{ selectedUserDetail.status }}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Email Verification</label>
                <p class="text-sm" [ngClass]="selectedUserDetail.email_verified_at ? 'text-green-600' : 'text-red-600'">
                  {{ selectedUserDetail.email_verified_at ? 'Verified' : 'Not Verified' }}
                </p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Last Login</label>
                <p class="text-sm text-gray-800">
                  {{ selectedUserDetail.last_login_at ? (selectedUserDetail.last_login_at | date:'medium') : 'Never logged in' }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 class="text-lg font-medium text-gray-800 mb-4">Activity Timeline</h4>
          <div class="space-y-4">
            <!-- Account Created -->
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <i class="pi pi-user-plus text-indigo-600 text-sm"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-gray-800">Account Created</p>
                  <time class="text-xs text-gray-500">
                    {{ selectedUserDetail.created_at | date:'MMM d, y' }}
                  </time>
                </div>
                <p class="text-xs text-gray-600 mt-1">User account was successfully created</p>
              </div>
            </div>

            <!-- Email Verification -->
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center"
                   [ngClass]="selectedUserDetail.email_verified_at ? 'bg-green-100' : 'bg-yellow-100'">
                <i [class]="selectedUserDetail.email_verified_at ? 'pi pi-verified text-green-600 text-sm' : 'pi pi-exclamation-triangle text-yellow-600 text-sm'"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-gray-800">
                    {{ selectedUserDetail.email_verified_at ? 'Email Verified' : 'Email Verification Pending' }}
                  </p>
                  <time *ngIf="selectedUserDetail.email_verified_at" class="text-xs text-gray-500">
                    {{ selectedUserDetail.email_verified_at | date:'MMM d, y' }}
                  </time>
                </div>
                <p class="text-xs text-gray-600 mt-1">
                  {{ selectedUserDetail.email_verified_at ? 'Email address was successfully verified' : 'Email verification is still pending' }}
                </p>
              </div>
            </div>

            <!-- Last Login -->
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center"
                   [ngClass]="selectedUserDetail.last_login_at ? 'bg-indigo-100' : 'bg-gray-100'">
                <i [class]="selectedUserDetail.last_login_at ? 'pi pi-sign-in text-indigo-600 text-sm' : 'pi pi-minus text-gray-500 text-sm'"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-gray-800">
                    {{ selectedUserDetail.last_login_at ? 'Last Login' : 'Never Logged In' }}
                  </p>
                  <time *ngIf="selectedUserDetail.last_login_at" class="text-xs text-gray-500">
                    {{ selectedUserDetail.last_login_at | date:'MMM d, y' }}
                  </time>
                </div>
                <p class="text-xs text-gray-600 mt-1">
                  {{ selectedUserDetail.last_login_at ? 'Most recent login to the system' : 'User has not logged in yet' }}
                </p>
              </div>
            </div>

            <!-- Profile Updated -->
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <i class="pi pi-pencil text-indigo-600 text-sm"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-gray-800">Profile Updated</p>
                  <time class="text-xs text-gray-500">
                    {{ selectedUserDetail.updated_at | date:'MMM d, y' }}
                  </time>
                </div>
                <p class="text-xs text-gray-600 mt-1">Last modification to user profile</p>
              </div>
            </div>
          </div>

          <!-- Summary Stats -->
          <div class="mt-6 pt-6 border-t border-gray-200">
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <i class="pi pi-calendar text-indigo-600"></i>
                </div>
                <p class="text-xs text-gray-500 uppercase tracking-wider">Days Active</p>
                <p class="text-sm font-semibold text-gray-800">
                  {{ getDaysActive(selectedUserDetail.created_at) }}
                </p>
              </div>

              <div>
                <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <i class="pi pi-check-circle text-indigo-600"></i>
                </div>
                <p class="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                <p class="text-sm font-semibold capitalize"
                   [ngClass]="{
                     'text-green-600': selectedUserDetail.status === 'active',
                     'text-gray-600': selectedUserDetail.status === 'inactive',
                     'text-red-600': selectedUserDetail.status === 'suspended',
                     'text-yellow-600': selectedUserDetail.status === 'pending'
                   }">
                  {{ selectedUserDetail.status }}
                </p>
              </div>

              <div>
                <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <i class="pi pi-shield text-indigo-600"></i>
                </div>
                <p class="text-xs text-gray-500 uppercase tracking-wider">Security</p>
                <p class="text-sm font-semibold"
                   [ngClass]="selectedUserDetail.email_verified_at ? 'text-green-600' : 'text-yellow-600'">
                  {{ selectedUserDetail.email_verified_at ? 'Verified' : 'Pending' }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- User Roles (if available) -->
        <div *ngIf="selectedUserDetail.roles && selectedUserDetail.roles.length > 0" class="space-y-4">
          <h4 class="text-lg font-semibold text-gray-800 flex items-center">
            <i class="pi pi-users mr-2 text-indigo-600"></i>
            Assigned Roles
          </h4>

          <div class="flex flex-wrap gap-2">
            <span *ngFor="let role of selectedUserDetail.roles"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              <i class="pi pi-shield mr-1"></i>
              {{ role.name }}
            </span>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 class="text-lg font-medium text-gray-800 flex items-center mb-4">
            <i class="pi pi-bolt mr-2 text-indigo-600"></i>
            Quick Actions
          </h4>

          <div class="flex flex-wrap gap-3">
            <button
              (click)="editUser(selectedUserDetail); closeUserDetailDialog()"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm">
              <i class="pi pi-pencil mr-2"></i>
              Edit User
            </button>

            <button
              *ngIf="selectedUserDetail.status === 'active'"
              (click)="deactivateUser(selectedUserDetail); closeUserDetailDialog()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-colors shadow-sm">
              <i class="pi pi-pause mr-2"></i>
              Deactivate
            </button>

            <button
              *ngIf="selectedUserDetail.status === 'inactive'"
              (click)="activateUser(selectedUserDetail); closeUserDetailDialog()"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-colors shadow-sm">
              <i class="pi pi-play mr-2"></i>
              Activate
            </button>

            <button
              *ngIf="selectedUserDetail.status !== 'suspended'"
              (click)="suspendUser(selectedUserDetail); closeUserDetailDialog()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-colors shadow-sm">
              <i class="pi pi-ban mr-2"></i>
              Suspend
            </button>

            <button
              *ngIf="!selectedUserDetail.email_verified_at"
              (click)="verifyUserEmail(selectedUserDetail); closeUserDetailDialog()"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-colors shadow-sm">
              <i class="pi pi-check-circle mr-2"></i>
              Verify Email
            </button>

            <button
              (click)="deleteUser(selectedUserDetail); closeUserDetailDialog()"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 transition-colors shadow-sm">
              <i class="pi pi-trash mr-2"></i>
              Delete User
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="!selectedUserDetail" class="flex items-center justify-center py-8">
        <i class="pi pi-spin pi-spinner text-2xl text-indigo-600"></i>
        <span class="ml-2 text-gray-600">Loading user details...</span>
      </div>

      <!-- Dialog Footer -->
      <div class="flex justify-end pt-4 border-t border-gray-200 mt-6">
        <button
          (click)="closeUserDetailDialog()"
          class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-colors">
          <i class="pi pi-times mr-2"></i>
          Close
        </button>
      </div>
    </p-dialog>

    <!-- Toast Messages -->
    <p-toast></p-toast>

    <!-- Confirm Dialog -->
    <p-confirmDialog></p-confirmDialog>
  `
})
export class UserManagementComponent implements OnInit {
  // Inject services using Angular's inject function
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);

  // Initialize user client with auth token
  private readonly userClient = new UserManagementClient({
    getAuthToken: () => this.authService.accessToken()
  });

  // Data
  users: User[] = [];
  selectedUsers: User[] = [];
  totalUsers = 0;
  userStats: any[] = [];

  // UI State
  loading = signal(false);
  saving = signal(false);
  showUserDialog = false;
  showUserDetailDialog = false;
  dialogMode: 'create' | 'edit' = 'create';

  // Form Data
  currentUser: any = {};
  selectedUserDetail: User | null = null;

  // Filters
  searchTerm = '';
  selectedStatus: UserStatus | null = null;
  selectedBulkAction: string | null = null;

  // Pagination
  pageSize = 25;
  currentPage = 0;

  // Dropdown Options
  statusOptions = [
    { label: 'All Status', value: null },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Pending', value: 'pending' }
  ];

  userStatusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Pending', value: 'pending' }
  ];

  bulkActionOptions = [
    { label: 'Bulk Actions', value: null },
    { label: 'Activate', value: 'activate' },
    { label: 'Deactivate', value: 'deactivate' },
    { label: 'Suspend', value: 'suspend' },
    { label: 'Delete', value: 'delete' }
  ];

  ngOnInit() {
    this.loadUserStats();
    // Load initial users data
    this.loadUsers({ first: 0, rows: this.pageSize });
  }

  async loadUsers(event: any) {
    this.loading.set(true);

    try {
      const params: UserListParams = {
        limit: event.rows || this.pageSize,
        offset: event.first || 0,
        search: this.searchTerm || undefined,
        status: this.selectedStatus || undefined,
        sortBy: event.sortField || 'created_at',
        sortOrder: event.sortOrder === 1 ? 'asc' : 'desc'
      };

      const response = await this.userClient.getUsers(params);

      // Update to match actual API response structure
      this.users = response.users;
      this.totalUsers = response.pagination.total;
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to load users'
      });
    } finally {
      this.loading.set(false);
    }
  }

  async loadUserStats() {
    try {
      const stats = await this.userClient.getUserStats();

      // Update to match actual API response structure
      this.userStats = [
        {
          label: 'Total Users',
          value: stats.total_users.toLocaleString(),
          icon: 'pi pi-users'
        },
        {
          label: 'Active Users',
          value: stats.active_users.toLocaleString(),
          icon: 'pi pi-check-circle'
        },
        {
          label: 'Inactive Users',
          value: stats.inactive_users.toLocaleString(),
          icon: 'pi pi-times-circle'
        },
        {
          label: 'Suspended',
          value: stats.suspended_users.toLocaleString(),
          icon: 'pi pi-ban'
        },
        {
          label: 'Verified',
          value: stats.verified_users.toLocaleString(),
          icon: 'pi pi-verified'
        },
        {
          label: 'Unverified',
          value: stats.unverified_users.toLocaleString(),
          icon: 'pi pi-exclamation-triangle'
        }
      ];
    } catch (error: any) {
      console.error('Failed to load user stats:', error);
    }
  }

  onSearchChange() {
    this.loadUsers({ first: 0, rows: this.pageSize });
  }

  onStatusChange() {
    this.loadUsers({ first: 0, rows: this.pageSize });
  }

  onBulkActionChange() {
    if (this.selectedBulkAction && this.selectedUsers.length > 0) {
      this.executeBulkAction();
    }
  }

  showCreateUserDialog() {
    this.dialogMode = 'create';
    this.currentUser = {};
    this.showUserDialog = true;
  }


  editUser(user: User) {
    this.dialogMode = 'edit';
    this.currentUser = { ...user };
    this.showUserDialog = true;
  }

  async viewUser(user: User) {
    console.log('🔍 View User button clicked!', { userId: user.id, userName: user.name });

    try {
      this.loading.set(true);
      const userDetail = await this.userClient.getUserById(user.id);
      this.selectedUserDetail = (userDetail as any).data || userDetail;
      this.showUserDetailDialog = true;
    } catch (error: any) {
      console.error('❌ Error in viewUser:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to load user details'
      });
    } finally {
      this.loading.set(false);
    }
  }

  deleteUser(user: User) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete user "${user.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.userClient.deleteUser(user.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'User deleted successfully'
          });
          this.loadUsers({ first: 0, rows: this.pageSize });
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to delete user'
          });
        }
      }
    });
  }

  async saveUser() {
    this.saving.set(true);

    try {
      if (this.dialogMode === 'create') {
        await this.userClient.createUser(this.currentUser as CreateUserRequest);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User created successfully'
        });
      } else {
        await this.userClient.updateUser(this.currentUser.id, this.currentUser as UpdateUserRequest);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User updated successfully'
        });
      }

      this.showUserDialog = false;
      this.loadUsers({ first: 0, rows: this.pageSize });
      this.loadUserStats();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to save user'
      });
    } finally {
      this.saving.set(false);
    }
  }

  cancelUserDialog() {
    this.showUserDialog = false;
    this.currentUser = {};
  }

  closeUserDetailDialog() {
    this.showUserDetailDialog = false;
    this.selectedUserDetail = null;
  }

  async executeBulkAction() {
    if (!this.selectedBulkAction || this.selectedUsers.length === 0) return;

    const userIds = this.selectedUsers.map(user => user.id);
    const action = this.selectedBulkAction as any;

    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} ${userIds.length} user(s)?`,
      header: 'Confirm Bulk Action',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          const request: BulkActionRequest = {
            user_ids: userIds,
            action
          };

          await this.userClient.bulkAction(request);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Bulk action completed successfully`
          });

          this.selectedUsers = [];
          this.selectedBulkAction = null;
          this.loadUsers({ first: 0, rows: this.pageSize });
          this.loadUserStats();
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to execute bulk action'
          });
        }
      }
    });
  }

  exportUsers() {
    // TODO: Implement export functionality
    console.log('Export users');
  }

  getStatusSeverity(status: UserStatus | string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'suspended':
        return 'danger';
      case 'pending':
        return 'info';
      default:
        return 'info';
    }
  }

  // Quick action methods for detail view
  async activateUser(user: User) {
    try {
      await this.userClient.activateUser(user.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `User ${user.name} has been activated successfully`
      });
      this.loadUsers({ first: 0, rows: this.pageSize });
      this.loadUserStats();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to activate user'
      });
    }
  }

  async deactivateUser(user: User) {
    try {
      await this.userClient.deactivateUser(user.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `User ${user.name} has been deactivated successfully`
      });
      this.loadUsers({ first: 0, rows: this.pageSize });
      this.loadUserStats();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to deactivate user'
      });
    }
  }

  async suspendUser(user: User) {
    try {
      await this.userClient.suspendUser(user.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `User ${user.name} has been suspended successfully`
      });
      this.loadUsers({ first: 0, rows: this.pageSize });
      this.loadUserStats();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to suspend user'
      });
    }
  }

  async verifyUserEmail(user: User) {
    try {
      await this.userClient.verifyUserEmail(user.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Email for ${user.name} has been verified successfully`
      });
      this.loadUsers({ first: 0, rows: this.pageSize });
      this.loadUserStats();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Failed to verify user email'
      });
    }
  }

  // Helper method to calculate days since account creation
  getDaysActive(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}
