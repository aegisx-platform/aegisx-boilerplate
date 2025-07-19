import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MenuModule } from 'primeng/menu';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { ApiKeyService, ApiKeyListItem, ApiKeyResponse } from '../../services/api-key.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ApiKeyCreateDialogComponent } from '../api-key-create-dialog/api-key-create-dialog.component';

@Component({
  selector: 'app-api-key-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    MenuModule,
    IconFieldModule,
    InputIconModule,
    ApiKeyCreateDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="card">
      <div class="card-header">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">API Keys</h1>
            <p class="text-gray-600 mt-1">Manage your API keys for programmatic access</p>
          </div>
          <button pButton 
                  type="button" 
                  label="Create New API Key" 
                  icon="pi pi-plus" 
                  class="p-button-primary"
                  (click)="showCreateDialog = true">
          </button>
        </div>
      </div>

      <div class="card-content">
        <!-- Search and Filters -->
        <div class="flex justify-between items-center mb-4">
          <p-iconfield class="w-80">
            <p-inputicon class="pi pi-search" />
            <input type="text" 
                   pInputText 
                   [(ngModel)]="searchTerm" 
                   (input)="onSearch($event, dt)" 
                   placeholder="Search API keys..." />
          </p-iconfield>

          <div class="flex gap-2">
            <button pButton 
                    type="button" 
                    icon="pi pi-refresh" 
                    class="p-button-outlined p-button-secondary"
                    (click)="loadApiKeys()"
                    [loading]="loading">
            </button>
          </div>
        </div>

        <!-- API Keys Table -->
        <p-table #dt 
                 [value]="apiKeys" 
                 [loading]="loading"
                 [globalFilterFields]="['name', 'description', 'prefix']"
                 [paginator]="true" 
                 [rows]="10"
                 [rowsPerPageOptions]="[10, 25, 50]"
                 [totalRecords]="apiKeys.length"
                 styleClass="p-datatable-gridlines">
          
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name" style="width: 20%">
                Name <p-sortIcon field="name"></p-sortIcon>
              </th>
              <th style="width: 15%">Key Prefix</th>
              <th style="width: 20%">Permissions</th>
              <th pSortableColumn="usageCount" style="width: 10%">
                Usage <p-sortIcon field="usageCount"></p-sortIcon>
              </th>
              <th pSortableColumn="lastUsedAt" style="width: 12%">
                Last Used <p-sortIcon field="lastUsedAt"></p-sortIcon>
              </th>
              <th pSortableColumn="expiresAt" style="width: 12%">
                Expires <p-sortIcon field="expiresAt"></p-sortIcon>
              </th>
              <th style="width: 8%">Status</th>
              <th style="width: 10%">Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-apiKey>
            <tr>
              <td>
                <div>
                  <div class="font-semibold">{{ apiKey.name }}</div>
                  <div class="text-sm text-gray-500" *ngIf="apiKey.description">
                    {{ apiKey.description }}
                  </div>
                </div>
              </td>
              
              <td>
                <span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {{ apiKey.prefix }}...
                </span>
              </td>
              
              <td>
                <div class="flex flex-wrap gap-1">
                  <span 
                    *ngFor="let resource of getPermissionResources(apiKey.permissions)" 
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ resource }}
                  </span>
                  <span *ngIf="getPermissionResources(apiKey.permissions).length === 0" 
                        class="text-gray-500 text-sm">All permissions</span>
                </div>
              </td>
              
              <td>
                <div class="text-center">
                  <div class="font-semibold">{{ apiKey.usageCount }}</div>
                  <div class="text-xs text-gray-500">requests</div>
                </div>
              </td>
              
              <td>
                <span *ngIf="apiKey.lastUsedAt; else neverUsed" 
                      class="text-sm"
                      [title]="formatDateTime(apiKey.lastUsedAt)">
                  {{ formatRelativeTime(apiKey.lastUsedAt) }}
                </span>
                <ng-template #neverUsed>
                  <span class="text-gray-500 text-sm">Never</span>
                </ng-template>
              </td>
              
              <td>
                <span *ngIf="apiKey.expiresAt; else noExpiry" 
                      class="text-sm"
                      [class]="getExpiryClass(apiKey.expiresAt)"
                      [title]="formatDateTime(apiKey.expiresAt)">
                  {{ formatRelativeTime(apiKey.expiresAt) }}
                </span>
                <ng-template #noExpiry>
                  <span class="text-gray-500 text-sm">Never</span>
                </ng-template>
              </td>
              
              <td>
                <p-tag [value]="apiKey.isActive ? 'Active' : 'Inactive'"
                       [severity]="apiKey.isActive ? 'success' : 'danger'">
                </p-tag>
              </td>
              
              <td>
                <div class="flex gap-1">
                  <button pButton 
                          type="button" 
                          icon="pi pi-eye" 
                          class="p-button-text p-button-sm"
                          (click)="viewApiKey(apiKey)"
                          pTooltip="View Details">
                  </button>
                  
                  <button pButton 
                          type="button" 
                          icon="pi pi-refresh" 
                          class="p-button-text p-button-sm p-button-warning"
                          (click)="regenerateApiKey(apiKey)"
                          pTooltip="Regenerate Key">
                  </button>
                  
                  <button pButton 
                          type="button" 
                          icon="pi pi-trash" 
                          class="p-button-text p-button-sm p-button-danger"
                          (click)="revokeApiKey(apiKey)"
                          pTooltip="Revoke Key">
                  </button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="8" class="text-center py-8">
                <div class="text-gray-500">
                  <i class="pi pi-key text-4xl mb-3 block"></i>
                  <p class="text-lg mb-2">No API keys found</p>
                  <p class="text-sm">Create your first API key to get started with programmatic access</p>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <!-- Create API Key Dialog -->
    <app-api-key-create-dialog 
      [(visible)]="showCreateDialog"
      (onApiKeyCreated)="onApiKeyCreated($event)">
    </app-api-key-create-dialog>

    <!-- View API Key Dialog -->
    <p-dialog header="API Key Details" 
              [(visible)]="showDetailsDialog" 
              [style]="{width: '600px'}"
              [modal]="true">
      <div *ngIf="selectedApiKey" class="space-y-4">
        <!-- Key Information -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedApiKey.name }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Prefix</label>
            <p class="mt-1 text-sm font-mono text-gray-900">{{ selectedApiKey.prefix }}...</p>
          </div>
        </div>

        <div *ngIf="selectedApiKey.description">
          <label class="block text-sm font-medium text-gray-700">Description</label>
          <p class="mt-1 text-sm text-gray-900">{{ selectedApiKey.description }}</p>
        </div>

        <!-- Usage Statistics -->
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ selectedApiKey.usageCount }}</div>
            <div class="text-sm text-gray-500">Total Requests</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">
              {{ selectedApiKey.lastUsedAt ? formatRelativeTime(selectedApiKey.lastUsedAt) : 'Never' }}
            </div>
            <div class="text-sm text-gray-500">Last Used</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold" [class]="getExpiryClass(selectedApiKey.expiresAt)">
              {{ selectedApiKey.expiresAt ? formatRelativeTime(selectedApiKey.expiresAt) : 'Never' }}
            </div>
            <div class="text-sm text-gray-500">Expires</div>
          </div>
        </div>

        <!-- Permissions -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
          <div class="flex flex-wrap gap-2" *ngIf="getPermissionResources(selectedApiKey.permissions).length > 0">
            <span 
              *ngFor="let resource of getPermissionResources(selectedApiKey.permissions)" 
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {{ resource }}
            </span>
          </div>
          <p class="text-sm text-gray-500" *ngIf="getPermissionResources(selectedApiKey.permissions).length === 0">
            Full access to all resources
          </p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button pButton 
                type="button" 
                label="Close" 
                class="p-button-secondary"
                (click)="showDetailsDialog = false">
        </button>
      </ng-template>
    </p-dialog>

    <!-- New API Key Display Dialog -->
    <p-dialog header="API Key Created Successfully" 
              [(visible)]="showNewKeyDialog" 
              [style]="{width: '600px'}"
              [modal]="true"
              [closable]="false">
      <div *ngIf="newApiKey" class="space-y-4">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="flex">
            <i class="pi pi-exclamation-triangle text-yellow-600 mr-2"></i>
            <div>
              <h3 class="text-sm font-medium text-yellow-800">Important Security Notice</h3>
              <p class="text-sm text-yellow-700 mt-1">
                This is the only time you'll be able to see the complete API key. 
                Please copy it and store it securely.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">API Key</label>
          <div class="flex gap-2">
            <input type="text" 
                   readonly 
                   [value]="newApiKey.key"
                   class="flex-1 p-3 font-mono text-sm border border-gray-300 rounded-md bg-gray-50"
                   #apiKeyInput>
            <button pButton 
                    type="button" 
                    icon="pi pi-copy" 
                    class="p-button-outlined p-button-sm px-3"
                    (click)="copyToClipboard(apiKeyInput.value)"
                    pTooltip="Copy to clipboard">
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Name</label>
            <p class="mt-1 text-sm text-gray-900">{{ newApiKey.name }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Prefix</label>
            <p class="mt-1 text-sm font-mono text-gray-900">{{ newApiKey.prefix }}...</p>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button pButton 
                type="button" 
                label="I've Saved the Key" 
                class="p-button-primary"
                (click)="closeNewKeyDialog()">
        </button>
      </ng-template>
    </p-dialog>

    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    .card {
      @apply bg-white rounded-lg shadow-sm border border-gray-200;
    }
    
    .card-header {
      @apply px-6 py-4 border-b border-gray-200;
    }
    
    .card-content {
      @apply p-6;
    }
    
    :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
      @apply py-3;
    }
    
    :host ::ng-deep .p-chip {
      @apply bg-blue-100 text-blue-800;
    }
  `]
})
export class ApiKeyListComponent implements OnInit {
  private apiKeyService = inject(ApiKeyService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  apiKeys: ApiKeyListItem[] = [];
  loading = false;
  searchTerm = '';
  
  showCreateDialog = false;
  showDetailsDialog = false;
  showNewKeyDialog = false;
  
  selectedApiKey: ApiKeyListItem | null = null;
  newApiKey: ApiKeyResponse | null = null;

  ngOnInit() {
    this.loadApiKeys();
  }

  loadApiKeys() {
    this.loading = true;
    this.apiKeyService.listApiKeys().subscribe({
      next: (apiKeys) => {
        this.apiKeys = apiKeys;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load API keys:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load API keys'
        });
        this.loading = false;
      }
    });
  }

  onSearch(event: any, table: any) {
    table.filterGlobal(event.target.value, 'contains');
  }

  viewApiKey(apiKey: ApiKeyListItem) {
    this.selectedApiKey = apiKey;
    this.showDetailsDialog = true;
  }

  regenerateApiKey(apiKey: ApiKeyListItem) {
    this.confirmationService.confirm({
      message: `Are you sure you want to regenerate the API key "${apiKey.name}"? The old key will be immediately invalidated.`,
      header: 'Regenerate API Key',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.apiKeyService.regenerateApiKey(apiKey.id).subscribe({
          next: (newKey) => {
            this.newApiKey = newKey;
            this.showNewKeyDialog = true;
            this.loadApiKeys();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'API key regenerated successfully'
            });
          },
          error: (error) => {
            console.error('Failed to regenerate API key:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to regenerate API key'
            });
          }
        });
      }
    });
  }

  revokeApiKey(apiKey: ApiKeyListItem) {
    this.confirmationService.confirm({
      message: `Are you sure you want to revoke the API key "${apiKey.name}"? This action cannot be undone.`,
      header: 'Revoke API Key',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.apiKeyService.revokeApiKey(apiKey.id, 'Revoked by user').subscribe({
          next: () => {
            this.loadApiKeys();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'API key revoked successfully'
            });
          },
          error: (error) => {
            console.error('Failed to revoke API key:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to revoke API key'
            });
          }
        });
      }
    });
  }

  onApiKeyCreated(apiKey: ApiKeyResponse) {
    this.newApiKey = apiKey;
    this.showCreateDialog = false;
    this.showNewKeyDialog = true;
    this.loadApiKeys();
  }

  closeNewKeyDialog() {
    this.showNewKeyDialog = false;
    this.newApiKey = null;
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'API key copied to clipboard'
      });
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy to clipboard'
      });
    });
  }

  getPermissionResources(permissions: any): string[] {
    return permissions?.resources || [];
  }

  formatDateTime(dateString?: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  }

  formatRelativeTime(dateString?: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  }

  getExpiryClass(expiresAt?: string): string {
    if (!expiresAt) return 'text-gray-500';
    
    const date = new Date(expiresAt);
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMs < 0) return 'text-red-600'; // Expired
    if (diffInDays < 7) return 'text-orange-600'; // Expires soon
    return 'text-green-600'; // Valid
  }
}