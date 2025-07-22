import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// PrimeNG imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
// PrimeNG 20 compatible imports only
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { StorageService, FileInfo, ShareRequest, ShareResponse, SharedFile } from '../../services/storage.service';

@Component({
  selector: 'app-file-share',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    TableModule,
    TagModule,
    CardModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast></p-toast>
    <p-confirmDialog></p-confirmDialog>
    
    <!-- Share File Dialog -->
    <p-dialog
      [visible]="visible"
      [modal]="true"
      [closable]="true"
      [resizable]="false"
      styleClass="file-share-dialog"
      [style]="{ width: '600px' }"
      (onHide)="onClose()"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-3">
          <i class="pi pi-share-alt text-2xl text-blue-600"></i>
          <div>
            <h3 class="text-lg font-semibold">Share File</h3>
            <p class="text-sm text-gray-600">{{ file?.filename }}</p>
          </div>
        </div>
      </ng-template>

      <div class="share-content">
        <!-- Share Form -->
        <form [formGroup]="shareForm" (ngSubmit)="onSubmitShare()" class="space-y-6">
          <!-- Recipient Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Recipient Email *
            </label>
            <input 
              pInputText
              formControlName="recipientEmail"
              placeholder="Enter email address"
              class="w-full"
              [class.ng-invalid]="shareForm.get('recipientEmail')?.touched && shareForm.get('recipientEmail')?.errors">
            <div *ngIf="shareForm.get('recipientEmail')?.touched && shareForm.get('recipientEmail')?.errors" class="text-red-600 text-sm mt-1">
              <span *ngIf="shareForm.get('recipientEmail')?.errors?.['required']">Email is required</span>
              <span *ngIf="shareForm.get('recipientEmail')?.errors?.['email']">Please enter a valid email</span>
            </div>
          </div>

          <!-- Permission Level -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Permission Level
            </label>
            <select 
              formControlName="permission"
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
              <option value="" disabled>Select permission</option>
              <option *ngFor="let option of permissionOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Expiration Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Expiration Date (Optional)
            </label>
            <input 
              type="date"
              formControlName="expiresAt"
              [min]="minDate.toISOString().split('T')[0]"
              class="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
          </div>

          <!-- Message -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Message (Optional)
            </label>
            <textarea
              pTextarea
              formControlName="message"
              placeholder="Add a personal message..."
              rows="3"
              class="w-full">
            </textarea>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 pt-4 border-t">
            <p-button
              label="Cancel"
              styleClass="p-button-outlined"
              (onClick)="onClose()">
            </p-button>
            <p-button
              label="Share File"
              icon="pi pi-share-alt"
              type="submit"
              [loading]="isSharing"
              [disabled]="shareForm.invalid">
            </p-button>
          </div>
        </form>

        <!-- Existing Shares -->
        <div *ngIf="existingShares.length > 0" class="mt-8">
          <h4 class="text-md font-semibold mb-4">Current Shares</h4>
          <p-table [value]="existingShares" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Recipient</th>
                <th>Permission</th>
                <th>Shared Date</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-share>
              <tr>
                <td>{{ share.recipientEmail }}</td>
                <td>
                  <p-tag
                    [value]="share.permission"
                    [severity]="getPermissionSeverity(share.permission)"
                    class="text-xs">
                  </p-tag>
                </td>
                <td>{{ formatDate(share.sharedAt) }}</td>
                <td>
                  <span *ngIf="share.expiresAt; else noExpiry">
                    {{ formatDate(share.expiresAt) }}
                  </span>
                  <ng-template #noExpiry>
                    <span class="text-gray-500">No expiry</span>
                  </ng-template>
                </td>
                <td>
                  <p-button
                    icon="pi pi-times"
                    styleClass="p-button-text p-button-sm p-button-danger"
                    (onClick)="revokeShare(share)"
                    pTooltip="Revoke access">
                  </p-button>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>
    </p-dialog>

    <!-- Shared Files Management Dialog -->
    <p-dialog
      [visible]="showSharedFilesDialog"
      [modal]="true"
      [closable]="true"
      [resizable]="true"
      [maximizable]="true"
      styleClass="shared-files-dialog"
      [style]="{ width: '90vw', height: '80vh' }"
      (onHide)="closeSharedFilesDialog()"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-3">
          <i class="pi pi-users text-2xl text-green-600"></i>
          <h3 class="text-lg font-semibold">Shared Files Management</h3>
        </div>
      </ng-template>

      <div class="shared-files-content h-full">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <!-- Files Shared with Me -->
          <p-card header="Files Shared with Me" class="h-full">
            <div class="shared-files-list h-96 overflow-y-auto">
              <div *ngIf="sharedWithMe.length === 0" class="text-center py-12">
                <i class="pi pi-inbox text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-600">No files have been shared with you</p>
              </div>
              
              <div *ngFor="let file of sharedWithMe" class="shared-file-item p-3 border border-gray-200 rounded-lg mb-3 hover:bg-gray-50">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 flex items-center justify-center bg-blue-100 rounded">
                    <i [class]="getFileIcon(file.mime_type)" class="text-blue-600"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h5 class="font-medium text-gray-900 truncate">{{ file.filename }}</h5>
                    <p class="text-sm text-gray-600">
                      Shared by {{ file.sharedBy }} • {{ formatDate(file.sharedAt) }}
                    </p>
                    <div class="flex items-center gap-2 mt-2">
                      <p-tag
                        [value]="file.permission"
                        [severity]="getPermissionSeverity(file.permission)"
                        class="text-xs">
                      </p-tag>
                      <span *ngIf="file.expiresAt" class="text-xs text-orange-600">
                        Expires: {{ formatDate(file.expiresAt) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <p-button
                      icon="pi pi-download"
                      styleClass="p-button-text p-button-sm"
                      (onClick)="downloadSharedFile(file)"
                      pTooltip="Download">
                    </p-button>
                    <p-button
                      icon="pi pi-eye"
                      styleClass="p-button-text p-button-sm"
                      (onClick)="previewSharedFile(file)"
                      pTooltip="Preview">
                    </p-button>
                  </div>
                </div>
              </div>
            </div>
          </p-card>

          <!-- Files I've Shared -->
          <p-card header="Files I've Shared" class="h-full">
            <div class="shared-files-list h-96 overflow-y-auto">
              <div *ngIf="myShares.length === 0" class="text-center py-12">
                <i class="pi pi-share-alt text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-600">You haven't shared any files yet</p>
              </div>
              
              <div *ngFor="let share of myShares" class="shared-file-item p-3 border border-gray-200 rounded-lg mb-3 hover:bg-gray-50">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 flex items-center justify-center bg-green-100 rounded">
                    <i [class]="getFileIcon(share.file.mime_type)" class="text-green-600"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h5 class="font-medium text-gray-900 truncate">{{ share.file.filename }}</h5>
                    <p class="text-sm text-gray-600">
                      Shared with {{ share.recipientEmail }} • {{ formatDate(share.sharedAt) }}
                    </p>
                    <div class="flex items-center gap-2 mt-2">
                      <p-tag
                        [value]="share.permission"
                        [severity]="getPermissionSeverity(share.permission)"
                        class="text-xs">
                      </p-tag>
                      <span *ngIf="share.expiresAt" class="text-xs text-orange-600">
                        Expires: {{ formatDate(share.expiresAt) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <p-button
                      icon="pi pi-link"
                      styleClass="p-button-text p-button-sm"
                      (onClick)="copyShareLink(share)"
                      pTooltip="Copy link">
                    </p-button>
                    <p-button
                      icon="pi pi-times"
                      styleClass="p-button-text p-button-sm p-button-danger"
                      (onClick)="revokeMyShare(share)"
                      pTooltip="Revoke">
                    </p-button>
                  </div>
                </div>
              </div>
            </div>
          </p-card>
        </div>
      </div>
    </p-dialog>
  `,
  styles: [`
    ::ng-deep .file-share-dialog .p-dialog-content {
      padding: 1.5rem;
    }

    ::ng-deep .shared-files-dialog .p-dialog-content {
      padding: 1rem;
      height: calc(100% - 60px);
      overflow: hidden;
    }

    .shared-files-content {
      height: 100%;
    }

    .shared-file-item {
      transition: background-color 0.2s ease;
    }

    .shared-file-item:hover {
      background-color: #f9fafb;
    }

    ::ng-deep .p-card .p-card-content {
      padding: 1rem;
      height: calc(100% - 60px);
    }

    .shared-files-list {
      height: calc(100% - 40px);
    }
  `]
})
export class FileShareComponent implements OnInit {
  private storageService = inject(StorageService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);

  @Input() visible = false;
  @Input() file: FileInfo | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();
  @Output() shareComplete = new EventEmitter<ShareResponse>();

  showSharedFilesDialog = false;
  isSharing = false;
  minDate = new Date();

  shareForm: FormGroup;
  existingShares: any[] = [];
  sharedWithMe: SharedFile[] = [];
  myShares: any[] = [];

  permissionOptions = [
    { label: 'View Only', value: 'read' },
    { label: 'View & Edit', value: 'write' }
  ];

  constructor() {
    this.shareForm = this.fb.group({
      recipientEmail: ['', [Validators.required, Validators.email]],
      permission: ['read', Validators.required],
      expiresAt: [null],
      message: ['']
    });
  }

  ngOnInit() {
    this.loadSharedFiles();
  }

  async onSubmitShare() {
    if (this.shareForm.invalid || !this.file) return;

    this.isSharing = true;
    
    try {
      const formValue = this.shareForm.value;
      const shareRequest: ShareRequest = {
        fileId: this.file.id,
        recipientEmail: formValue.recipientEmail,
        permission: formValue.permission,
        expiresAt: formValue.expiresAt ? formValue.expiresAt.toISOString() : undefined,
        message: formValue.message || undefined
      };

      const response = await this.storageService.shareFile(shareRequest).toPromise();
      
      if (response) {
        this.messageService.add({
          severity: 'success',
          summary: 'File Shared',
          detail: `File shared successfully with ${formValue.recipientEmail}`
        });
        
        this.shareComplete.emit(response);
        this.shareForm.reset({ permission: 'read' });
        this.loadExistingShares();
      }
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Share Failed',
        detail: error.message || 'Failed to share file'
      });
    } finally {
      this.isSharing = false;
    }
  }

  async loadExistingShares() {
    if (!this.file) return;
    
    try {
      // This would typically be a separate API call to get shares for a specific file
      // For now, we'll use the myShares endpoint and filter
      const response = await this.storageService.getMyShares().toPromise();
      this.existingShares = response?.shares?.filter(share => share.fileId === this.file?.id) || [];
    } catch (error) {
      console.error('Failed to load existing shares:', error);
    }
  }

  async loadSharedFiles() {
    try {
      const [sharedWithMeResponse, mySharesResponse] = await Promise.all([
        this.storageService.getSharedFiles().toPromise(),
        this.storageService.getMyShares().toPromise()
      ]);
      
      this.sharedWithMe = sharedWithMeResponse?.sharedFiles || [];
      this.myShares = mySharesResponse?.shares || [];
    } catch (error) {
      console.error('Failed to load shared files:', error);
    }
  }

  revokeShare(share: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to revoke access for ${share.recipientEmail}?`,
      header: 'Revoke Access',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.storageService.revokeShare(share.id).toPromise();
          
          this.messageService.add({
            severity: 'success',
            summary: 'Access Revoked',
            detail: `Access revoked for ${share.recipientEmail}`
          });
          
          this.loadExistingShares();
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Revoke Failed',
            detail: error.message || 'Failed to revoke access'
          });
        }
      }
    });
  }

  revokeMyShare(share: any) {
    this.confirmationService.confirm({
      message: `Are you sure you want to revoke access for ${share.recipientEmail}?`,
      header: 'Revoke Share',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.storageService.revokeShare(share.id).toPromise();
          
          this.messageService.add({
            severity: 'success',
            summary: 'Share Revoked',
            detail: `Share revoked for ${share.recipientEmail}`
          });
          
          this.loadSharedFiles();
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Revoke Failed',
            detail: error.message || 'Failed to revoke share'
          });
        }
      }
    });
  }

  async downloadSharedFile(file: SharedFile) {
    try {
      const blob = await this.storageService.downloadFile(file.id).toPromise();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Download Started',
          detail: `Downloading ${file.filename}`
        });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Download Failed',
        detail: 'Failed to download file'
      });
    }
  }

  previewSharedFile(file: SharedFile) {
    // This would open the file preview component
    this.messageService.add({
      severity: 'info',
      summary: 'Preview',
      detail: 'File preview functionality will be integrated'
    });
  }

  copyShareLink(share: any) {
    if (share.shareUrl) {
      navigator.clipboard.writeText(share.shareUrl).then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Link Copied',
          detail: 'Share link copied to clipboard'
        });
      }).catch(() => {
        this.messageService.add({
          severity: 'error',
          summary: 'Copy Failed',
          detail: 'Failed to copy link to clipboard'
        });
      });
    }
  }

  openSharedFilesDialog() {
    this.showSharedFilesDialog = true;
    this.loadSharedFiles();
  }

  closeSharedFilesDialog() {
    this.showSharedFilesDialog = false;
  }

  onClose() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.close.emit();
    this.shareForm.reset({ permission: 'read' });
  }

  // Utility methods
  getFileIcon(mimeType: string): string {
    return this.storageService.getFileIcon(mimeType);
  }

  getPermissionSeverity(permission: string): 'success' | 'info' | 'warning' | 'danger' {
    return permission === 'write' ? 'warning' : 'info';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}