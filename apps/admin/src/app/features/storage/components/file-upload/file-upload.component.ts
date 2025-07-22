import { Component, Input, Output, EventEmitter, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Removed drag-drop directive - using built-in events instead

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { StorageService } from '../../services/storage.service';

interface FileUploadItem {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadedFileId?: string;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ProgressBarModule,
    ToastModule,
    CardModule,
    TagModule,
    DialogModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>

    <!-- Modal Dialog -->
    <p-dialog
      *ngIf="isModal"
      [(visible)]="visible"
      header="Upload Files"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      styleClass="upload-dialog"
      [style]="{ width: '800px', maxHeight: '85vh' }"
      (onHide)="onDialogHide()"
    >
      <div class="modal-upload-content p-4">
        <div
          class="file-upload-container"
          [class.drag-over]="isDragOver"
          (drop)="onDrop($event)"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
        >
      <!-- Drop Zone -->
      <div class="drop-zone" [class.active]="isDragOver">
        <div class="drop-zone-content">
          <i class="pi pi-cloud-upload text-6xl text-gray-400 mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">
            Drag & Drop files here
          </h3>
          <p class="text-gray-500 mb-4">
            or click to browse from your computer
          </p>

          <p-button
            label="Choose Files"
            icon="pi pi-folder-open"
            styleClass="p-button-outlined"
            (onClick)="triggerFileInput()">
          </p-button>

          <p class="text-sm text-gray-400 mt-4">
            Supported formats: Images, PDFs, Documents, Videos
            <br>
            Max file size: 100MB
          </p>
        </div>
      </div>

      <!-- File Upload Queue -->
      <div *ngIf="uploadQueue.length > 0" class="upload-queue mt-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-lg font-semibold">Upload Queue ({{ uploadQueue.length }} files)</h4>
          <div class="flex gap-2">
            <p-button
              *ngIf="!isUploading"
              label="Upload All"
              icon="pi pi-upload"
              styleClass="p-button-sm"
              (onClick)="uploadAll()">
            </p-button>
            <p-button
              label="Clear All"
              icon="pi pi-times"
              styleClass="p-button-sm p-button-text p-button-danger"
              (onClick)="clearQueue()">
            </p-button>
          </div>
        </div>

        <!-- File Items -->
        <div class="space-y-3">
          <div
            *ngFor="let item of uploadQueue; let i = index"
            class="upload-item bg-white border border-gray-200 rounded-lg p-4"
            [class.uploading]="item.status === 'uploading'"
            [class.completed]="item.status === 'completed'"
            [class.error]="item.status === 'error'"
          >
            <div class="flex items-start gap-3">
              <!-- File Icon/Preview -->
              <div class="file-icon flex-shrink-0">
                <div *ngIf="isImage(item.file.type); else fileIcon"
                     class="w-12 h-12 rounded overflow-hidden bg-gray-100">
                  <img
                    [src]="getFilePreview(item.file)"
                    [alt]="item.file.name"
                    class="w-full h-full object-cover"
                    (error)="onPreviewError($event)">
                </div>
                <ng-template #fileIcon>
                  <div class="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
                    <i [class]="getFileIcon(item.file.type)" class="text-2xl text-gray-600"></i>
                  </div>
                </ng-template>
              </div>

              <!-- File Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-sm font-medium text-gray-900 truncate" [title]="item.file.name">
                    {{ item.file.name }}
                  </p>
                  <p-button
                    *ngIf="item.status !== 'uploading'"
                    icon="pi pi-times"
                    styleClass="p-button-text p-button-sm p-button-rounded"
                    (onClick)="removeFromQueue(i)">
                  </p-button>
                </div>

                <div class="flex items-center gap-3 text-xs text-gray-500 mb-2">
                  <span>{{ formatFileSize(item.file.size) }}</span>
                  <span>•</span>
                  <span>{{ item.file.type || 'Unknown type' }}</span>
                </div>

                <!-- Progress Bar -->
                <div *ngIf="item.status === 'uploading' || item.status === 'completed'">
                  <p-progressBar
                    [value]="item.progress"
                    [showValue]="false"
                    [styleClass]="getProgressClass(item.status)">
                  </p-progressBar>
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-xs text-gray-600">{{ item.progress }}%</span>
                    <span class="text-xs" [class.text-green-600]="item.status === 'completed'">
                      {{ getStatusText(item.status) }}
                    </span>
                  </div>
                </div>

                <!-- Error Message -->
                <div *ngIf="item.error" class="text-red-600 text-sm mt-2">
                  <i class="pi pi-exclamation-circle mr-1"></i>
                  {{ item.error }}
                </div>

                <!-- Data Classification Selection (for pending files) -->
                <div *ngIf="item.status === 'pending'" class="mt-2">
                  <select
                    [(ngModel)]="dataClassifications[i]"
                    class="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="public">Public</option>
                    <option value="internal" selected>Internal</option>
                    <option value="confidential">Confidential</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- Hidden file input -->
        <input
          type="file"
          #fileInput
          multiple
          (change)="onFilesSelected($event)"
          style="display: none;">
        </div>
      </div>
    </p-dialog>

    <!-- Inline Upload (when not modal) -->
    <div
      *ngIf="!isModal"
      class="file-upload-container"
      [class.drag-over]="isDragOver"
      (drop)="onDrop($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
    >
      <!-- Drop Zone -->
      <div class="drop-zone" [class.active]="isDragOver">
        <div class="drop-zone-content">
          <i class="pi pi-cloud-upload text-6xl text-gray-400 mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">
            Drag & Drop files here
          </h3>
          <p class="text-gray-500 mb-4">
            or click to browse from your computer
          </p>

          <p-button
            label="Choose Files"
            icon="pi pi-folder-open"
            styleClass="p-button-outlined"
            (onClick)="triggerFileInput()">
          </p-button>

          <p class="text-sm text-gray-400 mt-4">
            Supported formats: Images, PDFs, Documents, Videos
            <br>
            Max file size: 100MB
          </p>
        </div>
      </div>

      <!-- File Upload Queue -->
      <div *ngIf="uploadQueue.length > 0" class="upload-queue mt-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-lg font-semibold">Upload Queue ({{ uploadQueue.length }} files)</h4>
          <div class="flex gap-2">
            <p-button
              *ngIf="!isUploading"
              label="Upload All"
              icon="pi pi-upload"
              styleClass="p-button-sm"
              (onClick)="uploadAll()">
            </p-button>
            <p-button
              label="Clear All"
              icon="pi pi-times"
              styleClass="p-button-sm p-button-text p-button-danger"
              (onClick)="clearQueue()">
            </p-button>
          </div>
        </div>

        <!-- File Items -->
        <div class="space-y-3">
          <div
            *ngFor="let item of uploadQueue; let i = index"
            class="upload-item bg-white border border-gray-200 rounded-lg p-4"
            [class.uploading]="item.status === 'uploading'"
            [class.completed]="item.status === 'completed'"
            [class.error]="item.status === 'error'"
          >
            <div class="flex items-start gap-3">
              <!-- File Icon/Preview -->
              <div class="file-icon flex-shrink-0">
                <div *ngIf="isImage(item.file.type); else fileIcon"
                     class="w-12 h-12 rounded overflow-hidden bg-gray-100">
                  <img
                    [src]="getFilePreview(item.file)"
                    [alt]="item.file.name"
                    class="w-full h-full object-cover"
                    (error)="onPreviewError($event)">
                </div>
                <ng-template #fileIcon>
                  <div class="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
                    <i [class]="getFileIcon(item.file.type)" class="text-2xl text-gray-600"></i>
                  </div>
                </ng-template>
              </div>

              <!-- File Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-sm font-medium text-gray-900 truncate" [title]="item.file.name">
                    {{ item.file.name }}
                  </p>
                  <p-button
                    *ngIf="item.status !== 'uploading'"
                    icon="pi pi-times"
                    styleClass="p-button-text p-button-sm p-button-rounded"
                    (onClick)="removeFromQueue(i)">
                  </p-button>
                </div>

                <div class="flex items-center gap-3 text-xs text-gray-500 mb-2">
                  <span>{{ formatFileSize(item.file.size) }}</span>
                  <span>•</span>
                  <span>{{ item.file.type || 'Unknown type' }}</span>
                </div>

                <!-- Progress Bar -->
                <div *ngIf="item.status === 'uploading' || item.status === 'completed'">
                  <p-progressBar
                    [value]="item.progress"
                    [showValue]="false"
                    [styleClass]="getProgressClass(item.status)">
                  </p-progressBar>
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-xs text-gray-600">{{ item.progress }}%</span>
                    <span class="text-xs" [class.text-green-600]="item.status === 'completed'">
                      {{ getStatusText(item.status) }}
                    </span>
                  </div>
                </div>

                <!-- Error Message -->
                <div *ngIf="item.error" class="text-red-600 text-sm mt-2">
                  <i class="pi pi-exclamation-circle mr-1"></i>
                  {{ item.error }}
                </div>

                <!-- Data Classification Selection (for pending files) -->
                <div *ngIf="item.status === 'pending'" class="mt-2">
                  <select
                    [(ngModel)]="dataClassifications[i]"
                    class="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="public">Public</option>
                    <option value="internal" selected>Internal</option>
                    <option value="confidential">Confidential</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hidden file input -->
      <input
        type="file"
        #fileInput
        multiple
        (change)="onFilesSelected($event)"
        style="display: none;">
    </div>
  `,
  styles: [`
    .file-upload-container {
      min-height: 200px;
    }

    .drop-zone {
      border: 2px dashed #d1d5db;
      border-radius: 0.5rem;
      padding: 1rem;
      text-align: center;
      transition: all 0.2s ease;
      background-color: #f9fafb;
    }

    .drop-zone:hover,
    .drop-zone.active {
      border-color: #3b82f6;
      background-color: #eff6ff;
    }

    .drag-over .drop-zone {
      border-color: #3b82f6;
      background-color: #eff6ff;
    }

    .upload-item {
      transition: all 0.3s ease;
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      box-shadow: none;
    }

    .upload-item:hover {
      border-color: var(--primary-color);
    }

    .upload-item.uploading {
      background-color: #f0f9ff;
      border-color: #3b82f6;
    }

    .upload-item.completed {
      background-color: #f0fdf4;
      border-color: #10b981;
    }

    .upload-item.error {
      background-color: #fef2f2;
      border-color: #ef4444;
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

    ::ng-deep .p-progressbar.progress-completed .p-progressbar-value {
      background-color: #10b981;
    }

    ::ng-deep .p-progressbar.progress-error .p-progressbar-value {
      background-color: #ef4444;
    }

    .file-icon img {
      object-fit: cover;
    }

    /* Modal-specific styles */
    .modal-upload-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    :host ::ng-deep .upload-dialog .p-dialog-content {
      padding: 0;
      overflow: hidden;
    }

    :host ::ng-deep .upload-dialog .file-upload-container {
      min-height: auto;
    }

    :host ::ng-deep .upload-dialog .drop-zone {
      margin-bottom: 1.5rem;
      padding: 2rem;
      min-height: 200px;
    }

    :host ::ng-deep .upload-dialog .upload-queue {
      margin-top: 0;
    }
  `]
})
export class FileUploadComponent implements OnInit {
  private storageService = inject(StorageService);
  private messageService = inject(MessageService);

  @Input() folder?: string;
  @Input() folderId?: number;
  @Input() isModal = false;
  @Input() visible = false;
  @Input() initialFiles?: File[];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() uploadComplete = new EventEmitter<any>();
  @Output() uploadProgress = new EventEmitter<any>();
  @Output() filesUploaded = new EventEmitter<string[]>();
  @Output() uploadStarted = new EventEmitter<void>();

  isDragOver = false;
  isUploading = false;
  uploadQueue: FileUploadItem[] = [];
  dataClassifications: string[] = [];

  ngOnInit() {
    // Add initial files if provided (for drag & drop from parent)
    if (this.initialFiles && this.initialFiles.length > 0) {
      this.addToQueue(this.initialFiles);
    }
  }

  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          this.addToQueue([file]);
          this.messageService.add({
            severity: 'info',
            summary: 'Image Pasted',
            detail: 'Image from clipboard added to upload queue'
          });
        }
      }
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.addToQueue(Array.from(files));
    }
  }

  triggerFileInput() {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input?.click();
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addToQueue(Array.from(input.files));
      input.value = ''; // Reset input
    }
  }

  addToQueue(files: File[]) {
    const maxSize = 100 * 1024 * 1024; // 100MB

    files.forEach(file => {
      // Validate file size
      if (file.size > maxSize) {
        this.messageService.add({
          severity: 'error',
          summary: 'File Too Large',
          detail: `${file.name} exceeds the 100MB limit`
        });
        return;
      }

      // Add to queue
      this.uploadQueue.push({
        file,
        progress: 0,
        status: 'pending'
      });

      // Set default classification
      this.dataClassifications.push('internal');
    });

    if (files.length > 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Files Added',
        detail: `${files.length} file(s) added to upload queue`
      });
    }
  }

  removeFromQueue(index: number) {
    this.uploadQueue.splice(index, 1);
    this.dataClassifications.splice(index, 1);
  }

  clearQueue() {
    this.uploadQueue = this.uploadQueue.filter(item => item.status === 'uploading');
    this.dataClassifications = [];

    if (this.uploadQueue.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Queue Cleared',
        detail: 'All files removed from upload queue'
      });
    }
  }

  async uploadAll() {
    const pendingFiles = this.uploadQueue.filter(item => item.status === 'pending');
    if (pendingFiles.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Files',
        detail: 'No pending files to upload'
      });
      return;
    }

    this.isUploading = true;
    this.uploadStarted.emit();
    const uploadedIds: string[] = [];

    for (let i = 0; i < this.uploadQueue.length; i++) {
      const item = this.uploadQueue[i];
      if (item.status !== 'pending') continue;

      try {
        item.status = 'uploading';

        const options = {
          dataClassification: (this.dataClassifications[i] || 'internal') as 'public' | 'internal' | 'confidential' | 'restricted',
          generateThumbnail: this.isImage(item.file.type),
          folderId: this.folderId,
          folder: this.folder
        };

        await new Promise<void>((resolve, reject) => {
          this.storageService.uploadFile(item.file, options).subscribe({
            next: (result) => {
              if ('progress' in result) {
                // Progress update
                item.progress = result.progress;
              } else if ('success' in result && result.success) {
                // Upload completed
                item.status = 'completed';
                item.progress = 100;
                const uploadedId = result.fileId || result.file?.id;
                if (uploadedId) {
                  item.uploadedFileId = uploadedId;
                  uploadedIds.push(uploadedId);
                }

                this.messageService.add({
                  severity: 'success',
                  summary: 'Upload Complete',
                  detail: `${item.file.name} uploaded successfully`
                });
                resolve();
              }
            },
            error: (error) => {
              item.status = 'error';
              item.error = error.message || 'Upload failed';

              this.messageService.add({
                severity: 'error',
                summary: 'Upload Failed',
                detail: `Failed to upload ${item.file.name}`
              });
              reject(error);
            }
          });
        });
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    this.isUploading = false;

    if (uploadedIds.length > 0) {
      this.filesUploaded.emit(uploadedIds);

      // Auto-close modal and clear completed uploads
      if (this.isModal) {
        setTimeout(() => {
          this.visible = false;
          this.visibleChange.emit(false);
          this.uploadQueue = [];
          this.dataClassifications = [];
        }, 2000);
      } else {
        // Auto-clear completed uploads after 3 seconds for inline mode
        setTimeout(() => {
          this.uploadQueue = this.uploadQueue.filter(item => item.status !== 'completed');
          this.dataClassifications = this.dataClassifications.filter((_, index) =>
            this.uploadQueue[index]?.status !== 'completed'
          );
        }, 3000);
      }
    }
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    return this.storageService.formatFileSize(bytes);
  }

  getFileIcon(mimeType: string): string {
    return this.storageService.getFileIcon(mimeType);
  }

  isImage(mimeType: string): boolean {
    return this.storageService.isImage(mimeType);
  }

  getFilePreview(file: File): string {
    return URL.createObjectURL(file);
  }

  onPreviewError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  getProgressClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'progress-completed';
      case 'error':
        return 'progress-error';
      default:
        return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Waiting';
      case 'uploading':
        return 'Uploading...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Failed';
      default:
        return '';
    }
  }

  // Modal dialog methods
  onDialogHide() {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
