import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { DataViewModule } from 'primeng/dataview';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { MenuModule } from 'primeng/menu';
import { SplitterModule } from 'primeng/splitter';
import { PanelModule } from 'primeng/panel';
import { MeterGroupModule } from 'primeng/metergroup';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { StorageService, FileInfo, UploadProgress, StorageStats } from '../../services/storage.service';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { FilePreviewComponent } from '../file-preview/file-preview.component';
import { FileShareComponent } from '../file-share/file-share.component';
import { FileListComponent } from '../file-list/file-list.component';
import { FolderTreeComponent, StorageFolder } from '../folder-tree/folder-tree.component';
import { StorageAnalyticsComponent } from '../storage-analytics/storage-analytics.component';
import { FileSharingManagerComponent } from '../file-sharing/file-sharing-manager.component';

interface FilterOptions {
  mimeType: string;
  dataClassification: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TabsModule,
    ToastModule,
    ProgressBarModule,
    DataViewModule,
    TagModule,
    DividerModule,
    MenuModule,
    SplitterModule,
    PanelModule,
    MeterGroupModule,
    IconFieldModule,
    InputIconModule,
    FileUploadComponent,
    FilePreviewComponent,
    FileShareComponent,
    FileListComponent,
    FolderTreeComponent,
    StorageAnalyticsComponent,
    FileSharingManagerComponent
  ],
  providers: [MessageService],
  template: `
    <div class="file-manager-container">
      <!-- Main Navigation Tabs -->
      <p-tabs [(value)]="activeTabValue" class="main-tabs">
        <p-tablist>
          <p-tab value="analytics">Analytics</p-tab>
          <p-tab value="explorer">File Explorer</p-tab>
          <p-tab value="sharing">Sharing</p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- Analytics Tab -->
          <p-tabpanel value="analytics">
            <app-storage-analytics></app-storage-analytics>
          </p-tabpanel>

          <p-tabpanel value="explorer">
          <div class="file-explorer-layout">
            <p-splitter layout="horizontal" [panelSizes]="[25, 75]" styleClass="h-full" [style]="{ height: 'calc(100vh - 120px)' }">
              <!-- Left Panel - Folder Tree -->
              <ng-template pTemplate="start">
              <app-folder-tree
                    (folderSelected)="onFolderSelected($event)"
                    (folderCreated)="onFolderCreated($event)"
                    (folderUpdated)="onFolderUpdated($event)"
                    (folderDeleted)="onFolderDeleted($event)"
                  ></app-folder-tree>
              </ng-template>

              <!-- Right Panel - File List -->
              <ng-template pTemplate="end">
                <div class="file-panel" 
                     (dragover)="onDragOver($event)"
                     (dragleave)="onDragLeave($event)"  
                     (drop)="onDrop($event)"
                     [class.drag-over]="isDragOver">
                  <!-- File List -->
                  <div class="file-list-section flex-1">
                    <app-file-list
                      [options]="{
                        allowMultiSelect: true,
                        showActions: true,
                        showUploader: false,
                        compactView: false
                      }"
                      [folder]="selectedFolder?.path"
                      [folderId]="selectedFolder?.id"
                      (fileSelected)="onFileSelected($event)"
                      (filesSelected)="onFilesSelected($event)"
                      (filePreview)="onFilePreview($event)"
                      (fileShare)="onFileShare($event)"
                      (fileDelete)="onFileDelete($event)"
                      (bulkDeleteRequested)="onBulkDelete($event)"
                      (uploadRequested)="showUploadModal()"
                    ></app-file-list>
                  </div>
                </div>
              </ng-template>
            </p-splitter>
          </div>
          </p-tabpanel>


          <!-- File Sharing Tab -->
          <p-tabpanel value="sharing">
            <app-file-sharing-manager></app-file-sharing-manager>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <!-- File Preview Modal -->
      <app-file-preview
        *ngIf="selectedFile"
        [file]="selectedFile"
        [(visible)]="showPreview"
        (close)="onFileUpdated()"
      ></app-file-preview>

      <!-- File Share Modal -->
      <app-file-share
        *ngIf="fileToShare"
        [file]="fileToShare"
        [(visible)]="showShareDialog"
        (shareCreated)="onShareCreated($event)"
      ></app-file-share>

      <!-- Upload Modal -->
      <app-file-upload
        *ngIf="showUploadDialog"
        [folder]="selectedFolder?.path"
        [folderId]="selectedFolder?.id"
        [isModal]="true"
        [visible]="showUploadDialog"
        [initialFiles]="draggedFiles"
        (visibleChange)="onUploadDialogClose($event)"
        (filesUploaded)="onFilesUploaded($event)"
        (uploadProgress)="onUploadProgress($event)"
        (uploadStarted)="onUploadStarted()"
      ></app-file-upload>
    </div>

    <p-toast></p-toast>
  `,
  styles: [`
    .file-manager-container {
      height: 100%;
      overflow: hidden;
    }

    .main-tabs {
      height: 100%;
    }

    :host ::ng-deep .main-tabs .p-tabs-panels {
      height: calc(100vh - 120px);
      padding: 0;
      overflow: hidden;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel {
      height: 100%;
      padding: 0;
      overflow-y: auto;
    }

    .file-explorer-layout {
      height: calc(100vh - 120px);
      min-height: 500px;
    }

    .folder-panel {
      height: 100%;
      overflow-y: auto;
      border-right: 1px solid var(--surface-border);
    }

    .file-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .drag-over {
      background-color: #eff6ff;
      border: 2px dashed #3b82f6;
    }

    .file-list-container {
      flex: 1;
      overflow-y: auto;
      height: calc(100vh - 300px);
    }

    .file-list-section {
      height: 100%;
      overflow-y: auto;
    }

    .analytics-tab,
    .sharing-tab {
      height: 100%;
      overflow-y: auto;
    }

    /* Fix Analytics tab scrolling */
    :host ::ng-deep .main-tabs .p-tabs-panel[data-pc-name="tabpanel"] {
      height: 100%;
      overflow-y: auto !important;
      padding: 0;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel app-storage-analytics {
      display: block;
      height: 100%;
      overflow-y: auto;
      box-sizing: border-box;
    }

    /* Ensure tab content can scroll */
    :host ::ng-deep .p-tabs .p-tabs-panels .p-tabs-panel {
      overflow-y: auto !important;
      height: 100% !important;
    }

    /* Fix File Explorer scroll in tabs */
    :host ::ng-deep .main-tabs .p-tabs-panel .file-explorer-layout {
      height: calc(100vh - 160px);
      overflow: hidden;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel .file-panel {
      height: 100%;
      display: flex;
      flex-direction: column;
    }


    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    /* File list container inside tabs */
    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section app-file-list {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section .file-list-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section .file-list-header {
      flex-shrink: 0;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section .file-table-container {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* Force fixed height for scrollable table in tabs */
    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section .p-table-scrollable-wrapper {
      height: 500px !important;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section .p-table-scrollable-body {
      height: 440px !important;
      overflow-y: auto !important;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section .p-paginator {
      position: relative;
      z-index: 10;
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

    :host ::ng-deep .p-splitter {
      height: 100% !important;
    }

    :host ::ng-deep .p-splitter-panel {
      overflow: hidden;
      height: 100%;
    }

    /* Ensure splitter takes full viewport height */
    :host ::ng-deep .main-tabs .p-tabs-panel .p-splitter {
      height: calc(100vh - 120px) !important;
    }
  `]
})
export class FileManagerComponent implements OnInit, OnDestroy {
  private storageService = inject(StorageService);
  private messageService = inject(MessageService);
  private subscriptions = new Subscription();

  // State
  activeTabValue = 'analytics';
  loading = false;
  files: FileInfo[] = [];
  selectedFolder: StorageFolder | null = null;
  selectedFile: FileInfo | null = null;

  // Dialog states
  showUploadDialog = false;
  showPreview = false;
  showShareDialog = false;
  fileToShare: FileInfo | null = null;
  isDragOver = false;
  draggedFiles: File[] = [];

  ngOnInit() {
    this.loadFiles();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  // Tab operations
  onTabChange(value: string) {
    this.activeTabValue = value;
  }

  // Folder operations
  onFolderSelected(folder: StorageFolder | null) {
    console.log('Folder selected:', folder);
    this.selectedFolder = folder;
    this.loadFiles();
  }

  onFolderCreated(folder: StorageFolder) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Folder "${folder.name}" created successfully`
    });
  }

  onFolderUpdated(folder: StorageFolder) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Folder "${folder.name}" updated successfully`
    });
  }

  onFolderDeleted(folderId: number) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Folder deleted successfully'
    });
    this.loadFiles();
  }

  // File operations
  onFileSelected(file: FileInfo) {
    this.selectedFile = file;
  }

  onFilePreview(file: FileInfo) {
    this.selectedFile = file;
    this.showPreview = true;
  }

  onFileDownload(file: FileInfo) {
    this.storageService.downloadFile(file.id, file.filename).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.filename;
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

  onFileShare(file: FileInfo) {
    this.fileToShare = file;
    this.showShareDialog = true;
  }

  onFileDelete(file: FileInfo) {
    this.storageService.deleteFile(file.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'File deleted successfully'
        });
        this.loadFiles();
      },
      error: (error) => {
        console.error('Delete error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: 'Failed to delete file'
        });
      }
    });
  }

  onFilesSelected(files: FileInfo[]) {
    // Handle file selection
    console.log('Files selected:', files);
  }

  onBulkDelete(files: FileInfo[]) {
    // Handle bulk delete
    console.log('Bulk delete:', files);
  }

  // Upload operations
  onFilesUploaded(fileIds: string[]) {
    console.log('Files uploaded:', fileIds);
    this.messageService.add({
      severity: 'success',
      summary: 'Upload Complete',
      detail: `${fileIds.length} file(s) uploaded successfully`
    });
    // Add delay to ensure files are processed on server and avoid rate limiting
    setTimeout(() => {
      this.loadFiles();
    }, 2000);
  }

  onUploadProgress(progress: any) {
    // Handle upload progress updates
    console.log('Upload progress:', progress);
  }

  onShareComplete(shareInfo: any) {
    this.messageService.add({
      severity: 'success',
      summary: 'Share Complete',
      detail: 'File shared successfully'
    });
  }

  onShareCreated(shareInfo: any) {
    this.messageService.add({
      severity: 'success',
      summary: 'Share Created',
      detail: 'File share created successfully'
    });
  }

  // Data loading
  private loadFiles() {
    this.loading = true;

    const params: any = {
      page: 1,
      limit: 100,
      sortBy: 'created_at',
      sortOrder: 'desc'
    };

    // Only add folder params if a folder is selected
    if (this.selectedFolder) {
      params.folderId = this.selectedFolder.id;
      if (this.selectedFolder.path && this.selectedFolder.path !== '/') {
        params.path = this.selectedFolder.path;
      }
    }

    console.log('Loading files with params:', params);

    this.storageService.listFiles(params).subscribe({
      next: (response) => {
        console.log('Files loaded:', response);
        this.files = response.files || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading files:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load files'
        });
        this.loading = false;
      }
    });
  }

  onFileUpdated() {
    this.loadFiles();
    this.showPreview = false;
  }

  // Upload Modal Methods
  showUploadModal() {
    this.draggedFiles = []; // Clear any previous dragged files
    this.showUploadDialog = true;
  }

  onUploadDialogClose(visible: boolean) {
    this.showUploadDialog = visible;
    if (!visible) {
      this.draggedFiles = []; // Clear dragged files when modal closes
    }
  }

  onUploadStarted() {
    // Called when upload actually starts, can be used to close modal if needed
  }

  // Drag and Drop Methods
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
      this.draggedFiles = Array.from(files);
      this.showUploadDialog = true;
    }
  }
}
