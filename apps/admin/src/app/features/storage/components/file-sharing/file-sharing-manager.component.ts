import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ClipboardModule } from '@angular/cdk/clipboard';

import { StorageService, SharedFile } from '../../services/storage.service';

interface ShareInfo {
  shareId: string;
  fileId: string;
  filename: string;
  sharedBy: string;
  sharedWith: string;
  permission: 'read' | 'write';
  sharedAt: string;
  expiresAt?: string;
  isActive: boolean;
  accessCount: number;
  shareUrl: string;
}

interface ShareDialogData {
  file: any;
  recipientEmail: string;
  permission: 'read' | 'write';
  expiresAt?: Date;
  requiresPassword: boolean;
  password?: string;
  maxDownloads?: number;
  message?: string;
}

@Component({
  selector: 'app-file-sharing-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule,
    DialogModule,
    DatePickerModule,
    CheckboxModule,
    TabsModule,
    InputGroupModule,
    InputGroupAddonModule,
    ClipboardModule
  ],
  providers: [ConfirmationService],
  template: `
    <div class="file-sharing-manager">
      <!-- Header -->
      <div class="flex align-items-center justify-content-between mb-4">
        <h2 class="text-2xl font-semibold m-0">File Sharing</h2>
        <p-button
          icon="pi pi-refresh"
          [text]="true"
          (click)="loadShares()"
          [loading]="loading"
          pTooltip="Refresh"
          tooltipPosition="top"
        ></p-button>
      </div>

      <!-- Tabs -->
      <p-tabs [(value)]="activeTabValue">
        <p-tablist>
          <p-tab value="shared">Shared Files</p-tab>
          <p-tab value="received">Received Files</p-tab>
        </p-tablist>
        
        <p-tabpanels>
          <p-tabpanel value="shared">
          <div class="shared-files-tab">
            <!-- Shared Files Table -->
            <p-table
              [value]="sharedFiles"
              [loading]="loading"
              [paginator]="true"
              [rows]="20"
              [totalRecords]="totalSharedFiles"
              [sortMode]="'single'"
              dataKey="shareId"
              class="shares-table"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="filename" style="width: 25%">
                    File Name
                    <p-sortIcon field="filename"></p-sortIcon>
                  </th>
                  <th style="width: 20%">Shared With</th>
                  <th style="width: 15%">Permission</th>
                  <th pSortableColumn="sharedAt" style="width: 15%">
                    Shared Date
                    <p-sortIcon field="sharedAt"></p-sortIcon>
                  </th>
                  <th style="width: 15%">Expires</th>
                  <th style="width: 10%">Actions</th>
                </tr>
              </ng-template>

              <ng-template pTemplate="body" let-share>
                <tr>
                  <td>
                    <div class="flex align-items-center gap-2">
                      <i [class]="getFileIcon(share.mime_type)" class="text-primary"></i>
                      <div>
                        <div class="font-medium">{{ share.filename }}</div>
                        <div class="text-sm text-gray-500">{{ formatFileSize(share.size) }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{{ share.sharedWith }}</div>
                  </td>
                  <td>
                    <p-tag 
                      [value]="share.permission"
                      [severity]="share.permission === 'read' ? 'info' : 'warning'"
                    ></p-tag>
                  </td>
                  <td>
                    <div class="text-sm">{{ formatDate(share.sharedAt) }}</div>
                  </td>
                  <td>
                    <div *ngIf="share.expiresAt" class="text-sm">
                      {{ formatDate(share.expiresAt) }}
                    </div>
                    <span *ngIf="!share.expiresAt" class="text-gray-500">Never</span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <p-button
                        icon="pi pi-copy"
                        size="small"
                        [text]="true"
                        (click)="copyShareUrl(share)"
                        pTooltip="Copy Link"
                        tooltipPosition="top"
                      ></p-button>
                      <p-button
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        [text]="true"
                        (click)="revokeShare(share)"
                        pTooltip="Revoke Share"
                        tooltipPosition="top"
                      ></p-button>
                    </div>
                  </td>
                </tr>
              </ng-template>

              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="6" class="text-center py-8">
                    <div class="flex flex-column align-items-center gap-3">
                      <i class="pi pi-share-alt text-6xl text-gray-300"></i>
                      <div class="text-xl text-gray-500">No shared files</div>
                      <div class="text-gray-400">Files you share with others will appear here</div>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
          </p-tabpanel>

          <p-tabpanel value="received">
          <div class="received-files-tab">
            <!-- Received Files Table -->
            <p-table
              [value]="receivedFiles"
              [loading]="loading"
              [paginator]="true"
              [rows]="20"
              [totalRecords]="totalReceivedFiles"
              [sortMode]="'single'"
              dataKey="shareId"
              class="shares-table"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th pSortableColumn="filename" style="width: 25%">
                    File Name
                    <p-sortIcon field="filename"></p-sortIcon>
                  </th>
                  <th style="width: 20%">Shared By</th>
                  <th style="width: 15%">Permission</th>
                  <th pSortableColumn="sharedAt" style="width: 15%">
                    Received Date
                    <p-sortIcon field="sharedAt"></p-sortIcon>
                  </th>
                  <th style="width: 15%">Expires</th>
                  <th style="width: 10%">Actions</th>
                </tr>
              </ng-template>

              <ng-template pTemplate="body" let-share>
                <tr>
                  <td>
                    <div class="flex align-items-center gap-2">
                      <i [class]="getFileIcon(share.mime_type)" class="text-primary"></i>
                      <div>
                        <div class="font-medium">{{ share.filename }}</div>
                        <div class="text-sm text-gray-500">{{ formatFileSize(share.size) }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{{ share.sharedBy }}</div>
                  </td>
                  <td>
                    <p-tag 
                      [value]="share.permission"
                      [severity]="share.permission === 'read' ? 'info' : 'warning'"
                    ></p-tag>
                  </td>
                  <td>
                    <div class="text-sm">{{ formatDate(share.sharedAt) }}</div>
                  </td>
                  <td>
                    <div *ngIf="share.expiresAt" class="text-sm">
                      {{ formatDate(share.expiresAt) }}
                    </div>
                    <span *ngIf="!share.expiresAt" class="text-gray-500">Never</span>
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <p-button
                        icon="pi pi-eye"
                        size="small"
                        [text]="true"
                        (click)="previewFile(share)"
                        pTooltip="Preview"
                        tooltipPosition="top"
                      ></p-button>
                      <p-button
                        icon="pi pi-download"
                        size="small"
                        [text]="true"
                        (click)="downloadFile(share)"
                        pTooltip="Download"
                        tooltipPosition="top"
                      ></p-button>
                    </div>
                  </td>
                </tr>
              </ng-template>

              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="6" class="text-center py-8">
                    <div class="flex flex-column align-items-center gap-3">
                      <i class="pi pi-inbox text-6xl text-gray-300"></i>
                      <div class="text-xl text-gray-500">No received files</div>
                      <div class="text-gray-400">Files shared with you will appear here</div>
                    </div>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <!-- Share File Dialog -->
      <p-dialog
        [(visible)]="showShareDialog"
        header="Share File"
        [modal]="true"
        [closable]="true"
        [draggable]="false"
        [resizable]="false"
        styleClass="p-fluid"
        [style]="{ width: '500px' }"
      >
        <div class="field">
          <label for="recipientEmail">Recipient Email</label>
          <input
            id="recipientEmail"
            type="email"
            pInputText
            [(ngModel)]="shareForm.recipientEmail"
            placeholder="Enter email address"
            [class.p-invalid]="!shareForm.recipientEmail"
          />
          <small class="p-error" *ngIf="!shareForm.recipientEmail">Email is required</small>
        </div>

        <div class="field">
          <label for="permission">Permission</label>
          <p-select
            id="permission"
            [(ngModel)]="shareForm.permission"
            [options]="permissionOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select permission level"
          ></p-select>
        </div>

        <div class="field">
          <label for="expiresAt">Expires At (Optional)</label>
          <p-datePicker
            id="expiresAt"
            [(ngModel)]="shareForm.expiresAt"
            [showTime]="true"
            [showIcon]="true"
            placeholder="Select expiration date"
            [minDate]="minDate"
          ></p-datePicker>
        </div>

        <div class="field-checkbox">
          <p-checkbox
            id="requiresPassword"
            [(ngModel)]="shareForm.requiresPassword"
            [binary]="true"
          ></p-checkbox>
          <label for="requiresPassword">Require password for access</label>
        </div>

        <div class="field" *ngIf="shareForm.requiresPassword">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            pInputText
            [(ngModel)]="shareForm.password"
            placeholder="Enter password"
          />
        </div>

        <div class="field">
          <label for="maxDownloads">Max Downloads (Optional)</label>
          <input
            id="maxDownloads"
            type="number"
            pInputText
            [(ngModel)]="shareForm.maxDownloads"
            placeholder="Unlimited"
            min="1"
          />
        </div>

        <div class="field">
          <label for="message">Message (Optional)</label>
          <textarea
            id="message"
            pInputTextarea
            [(ngModel)]="shareForm.message"
            rows="3"
            placeholder="Add a message for the recipient"
            maxlength="500"
          ></textarea>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex justify-content-end gap-2">
            <p-button
              label="Cancel"
              icon="pi pi-times"
              [text]="true"
              (click)="hideShareDialog()"
            ></p-button>
            <p-button
              label="Share"
              icon="pi pi-share-alt"
              (click)="shareFile()"
              [disabled]="!shareForm.recipientEmail"
              [loading]="sharing"
            ></p-button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- Share URL Dialog -->
      <p-dialog
        [(visible)]="showShareUrlDialog"
        header="Share Link"
        [modal]="true"
        [closable]="true"
        [draggable]="false"
        [resizable]="false"
        [style]="{ width: '500px' }"
      >
        <div class="field">
          <label>Share URL</label>
          <p-inputGroup>
            <input
              type="text"
              pInputText
              [value]="generatedShareUrl"
              readonly
              class="share-url-input"
            />
            <p-inputGroupAddon>
              <p-button
                icon="pi pi-copy"
                [text]="true"
                (click)="copyToClipboard(generatedShareUrl)"
                pTooltip="Copy to clipboard"
                tooltipPosition="top"
              ></p-button>
            </p-inputGroupAddon>
          </p-inputGroup>
        </div>

        <div class="mt-3 p-3 bg-blue-50 border-round">
          <div class="flex align-items-center gap-2 text-blue-700">
            <i class="pi pi-info-circle"></i>
            <span class="font-semibold">Share Information</span>
          </div>
          <div class="mt-2 text-sm text-blue-600">
            This link will allow the recipient to access the file according to the permissions you've set.
            <div class="mt-1" *ngIf="currentShare?.expiresAt">
              <strong>Expires:</strong> {{ formatDate(currentShare!.expiresAt!) }}
            </div>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex justify-content-end">
            <p-button
              label="Close"
              icon="pi pi-times"
              (click)="hideShareUrlDialog()"
            ></p-button>
          </div>
        </ng-template>
      </p-dialog>

      <!-- Confirm Dialog -->
      <p-confirmDialog></p-confirmDialog>

      <!-- Toast Messages -->
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .file-sharing-manager {
      padding: 1rem;
    }

    .shares-table {
      min-height: 400px;
    }

    .share-url-input {
      font-family: monospace;
      font-size: 0.9rem;
    }

    /* Card styling - flat design with borders only */
    :host ::ng-deep .p-card {
      border-radius: 12px !important;
      border: 1px solid #e5e7eb !important;
      box-shadow: none !important;
      transition: border-color 0.2s ease;
    }

    :host ::ng-deep .p-card:hover {
      border-color: var(--primary-color);
    }

    :host ::ng-deep .p-card .p-card-header {
      padding: 0;
      border-bottom: 1px solid var(--surface-border);
      border-radius: 12px 12px 0 0;
    }

    :host ::ng-deep .p-card .p-card-body {
      padding: 1rem;
    }

    :host ::ng-deep .p-table .p-table-tbody > tr > td {
      padding: 1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    :host ::ng-deep .p-table .p-table-thead > tr > th {
      padding: 1rem;
      font-weight: 600;
      background: var(--surface-section);
      border-bottom: 1px solid var(--surface-border);
    }

    :host ::ng-deep .p-tabs .p-tabs-panels {
      padding: 1rem 0;
    }
  `]
})
export class FileSharingManagerComponent implements OnInit, OnDestroy {
  private storageService = inject(StorageService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private subscriptions = new Subscription();

  // Table data
  sharedFiles: SharedFile[] = [];
  receivedFiles: SharedFile[] = [];
  totalSharedFiles = 0;
  totalReceivedFiles = 0;
  loading = false;

  // Tabs
  activeTabValue = 'shared';

  // Share dialog
  showShareDialog = false;
  showShareUrlDialog = false;
  sharing = false;
  generatedShareUrl = '';
  currentShare: ShareInfo | null = null;

  shareForm: ShareDialogData = {
    file: null,
    recipientEmail: '',
    permission: 'read',
    requiresPassword: false
  };

  permissionOptions = [
    { label: 'Read Only', value: 'read' },
    { label: 'Read & Write', value: 'write' }
  ];

  minDate = new Date();

  ngOnInit() {
    this.loadShares();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadShares() {
    this.loading = true;

    // Load shared files (files I've shared)
    this.storageService.getMyShares().subscribe({
      next: (response) => {
        this.sharedFiles = response.shares || [];
        this.totalSharedFiles = this.sharedFiles.length;
      },
      error: (error) => {
        console.error('Error loading shared files:', error);
      }
    });

    // Load received files (files shared with me)
    this.storageService.getSharedFiles().subscribe({
      next: (response) => {
        this.receivedFiles = response.sharedFiles || [];
        this.totalReceivedFiles = this.receivedFiles.length;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading received files:', error);
        this.loading = false;
      }
    });
  }

  onTabChange(value: string) {
    this.activeTabValue = value;
  }

  // Share actions
  showCreateShareDialog(file: any) {
    this.shareForm = {
      file,
      recipientEmail: '',
      permission: 'read',
      requiresPassword: false
    };
    this.showShareDialog = true;
  }

  shareFile() {
    if (!this.shareForm.recipientEmail) return;

    this.sharing = true;

    const shareRequest = {
      fileId: this.shareForm.file.id,
      recipientEmail: this.shareForm.recipientEmail,
      permission: this.shareForm.permission,
      expiresAt: this.shareForm.expiresAt?.toISOString(),
      message: this.shareForm.message
    };

    this.storageService.shareFile(shareRequest).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'File shared successfully'
        });
        
        this.generatedShareUrl = response.shareUrl;
        this.hideShareDialog();
        this.showShareUrlDialog = true;
        this.loadShares();
      },
      error: (error) => {
        console.error('Error sharing file:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to share file'
        });
      }
    }).add(() => {
      this.sharing = false;
    });
  }

  revokeShare(share: SharedFile) {
    this.confirmationService.confirm({
      message: `Are you sure you want to revoke access to "${share.filename}"?`,
      header: 'Confirm Revoke',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.storageService.revokeShare(share.shareId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Share revoked successfully'
            });
            this.loadShares();
          },
          error: (error) => {
            console.error('Error revoking share:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to revoke share'
            });
          }
        });
      }
    });
  }

  copyShareUrl(share: SharedFile) {
    // Generate share URL (this would typically come from the API)
    const shareUrl = `${window.location.origin}/shared/${share.shareId}`;
    this.copyToClipboard(shareUrl);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Link copied to clipboard'
      });
    }).catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy link'
      });
    });
  }

  // File actions
  previewFile(share: SharedFile) {
    // Implement file preview
    console.log('Preview file:', share);
  }

  downloadFile(share: SharedFile) {
    this.storageService.downloadFile(share.id, share.filename).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = share.filename;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: 'Failed to download file'
        });
      }
    });
  }

  // Dialog methods
  hideShareDialog() {
    this.showShareDialog = false;
    this.shareForm = {
      file: null,
      recipientEmail: '',
      permission: 'read',
      requiresPassword: false
    };
  }

  hideShareUrlDialog() {
    this.showShareUrlDialog = false;
    this.generatedShareUrl = '';
    this.currentShare = null;
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    return this.storageService.formatFileSize(bytes);
  }

  getFileIcon(mimeType: string): string {
    return this.storageService.getFileIcon(mimeType);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}