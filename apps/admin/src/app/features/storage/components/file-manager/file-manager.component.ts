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
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { TooltipModule } from 'primeng/tooltip';

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
    BreadcrumbModule,
    TooltipModule,
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
            <p-splitter layout="horizontal" [panelSizes]="[20, 80]" styleClass="h-full" [style]="{ height: 'calc(100vh - 120px)' }">
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
                <!-- Breadcrumb -->
                <div class="custom-breadcrumb">
                  <!-- Top Row: Path + Stats -->
                  <div class="breadcrumb-top-row">
                    <div class="breadcrumb-path">
                      <span class="breadcrumb-item" (click)="navigateToFolder(null)"
                            [class.cursor-pointer]="selectedFolder">
                        <i class="pi pi-folder"></i>
                      </span>
                      <span *ngFor="let item of breadcrumbItems; let last = last" class="breadcrumb-segment">
                        <span class="breadcrumb-separator">/</span>
                        <span class="breadcrumb-item"
                              (click)="navigateToFolder(item.data)"
                              [class.cursor-pointer]="!last">
                          {{ item.label }}
                        </span>
                      </span>
                    </div>

                    <!-- Quick Stats -->
                    <div class="breadcrumb-stats" *ngIf="folderStats && !folderStatsLoading">
                      <div class="flex align-items-center gap-3 text-sm">
                        <div class="flex align-items-center gap-2">
                          <i class="pi pi-file text-blue-500"></i>
                          <span class="font-semibold text-gray-700">
                            {{ folderStats.totalFiles }} files
                          </span>
                        </div>
                        <div class="flex align-items-center gap-2">
                          <i class="pi pi-database text-green-500"></i>
                          <span class="text-gray-600">
                            {{ formatFileSize(folderStats.totalSize) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Bottom Row: File Type Distribution -->
                  <div *ngIf="folderStats && !folderStatsLoading && getFileTypeMeterData().length > 0" class="breadcrumb-meter-row">
                    <p-meterGroup
                      [value]="getFileTypeMeterData()"
                      labelPosition="end"
                      pTooltip="Click to see file type breakdown"
                      tooltipPosition="top">
                    </p-meterGroup>
                  </div>
                </div>

                <div class="file-panel p-3"
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




    /* Custom Breadcrumb Styling */
    .custom-breadcrumb {
      display: flex;
      flex-direction: column;
      background: #f8f8f8;
      border-top-right-radius: 6px;
      border-bottom: 1px solid #e5e7eb;
      padding: 0.75rem 1rem;
      margin-bottom: 0;
      font-size: 0.875rem;
      color: #a0a0a0;
      gap: 0.10rem;
    }

    .breadcrumb-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 2rem;
    }

    .breadcrumb-path {
      display: flex;
      align-items: center;
      overflow-x: auto;
      white-space: nowrap;
      flex: 1;
      margin-right: 1rem;
    }

    .breadcrumb-stats {
      flex-shrink: 0;
      border-left: 1px solid #e5e7eb;
      padding-left: 1rem;
    }

    .breadcrumb-meter-row {
      width: 100%;
    }

    /* Override meter group styling inside breadcrumb */
    :host ::ng-deep .breadcrumb-meter-row .p-metergroup {
      margin: 0;
      gap: 0.1rem;
    }

    :host ::ng-deep .breadcrumb-meter-row .p-metergroup-label-list {
      margin-top: 0.25rem;
      font-size: 0.75rem;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-weight: 400;
      color: #5f6368;
      transition: color 0.15s ease-in-out;
      text-decoration: none;
    }

    .breadcrumb-item.cursor-pointer {
      cursor: pointer;
    }

    .breadcrumb-item.cursor-pointer:hover {
      color: #1a73e8;
      text-decoration: none;
    }

    .breadcrumb-item i {
      font-size: 0.875rem;
      color: #5f6368;
    }

    .breadcrumb-segment {
      display: flex;
      align-items: center;
    }

    .breadcrumb-separator {
      margin: 0 0.375rem;
      color: #9aa0a6;
      font-weight: 400;
      font-size: 0.875rem;
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
      display: flex;
      flex-direction: column;
    }

    :host ::ng-deep .p-metergroup-label-list {
      display: flex;
      flex-wrap: wrap;
      margin: 0;
      padding: 0;
      list-style-type: none;
      font-size: 12px;
      color: gray;
    }

    /* Ensure table wrapper doesn't overflow */
    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section .file-table-container .p-table-wrapper {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Force fixed height for scrollable table in tabs */
    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section .p-table-scrollable-wrapper {
      height: 420px !important;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section .p-table-scrollable-body {
      height: 360px !important;
      overflow-y: auto !important;
    }

    :host ::ng-deep .main-tabs .p-tabs-panel .file-list-section .p-paginator {
      position: sticky;
      bottom: 0;
      z-index: 10;
      background: var(--surface-ground);
      border-top: 1px solid var(--surface-border);
      padding: 0.75rem 1rem;
      box-shadow: 0 -2px 4px rgba(0,0,0,0.05);
      margin-top: auto;
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

    /* Responsive pagination fixes */
    :host ::ng-deep .p-paginator {
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.75rem !important;
    }

    :host ::ng-deep .p-paginator .p-paginator-page,
    :host ::ng-deep .p-paginator .p-paginator-next,
    :host ::ng-deep .p-paginator .p-paginator-prev,
    :host ::ng-deep .p-paginator .p-paginator-first,
    :host ::ng-deep .p-paginator .p-paginator-last {
      min-width: 2.5rem;
      height: 2.5rem;
    }

    /* Hide some pagination elements on smaller screens */
    @media (max-width: 768px) {
      :host ::ng-deep .p-paginator .p-paginator-page-options,
      :host ::ng-deep .p-paginator .p-paginator-rpp-dropdown {
        display: none;
      }
    }

    /* Ensure pagination doesn't overflow container */
    :host ::ng-deep .file-list-section {
      max-width: 100%;
      overflow-x: auto;
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
  folderStats: StorageStats | null = null;
  folderStatsLoading = false;

  // Breadcrumb navigation
  breadcrumbItems: any[] = [];
  homeBreadcrumb = {
    icon: 'pi pi-home',
    command: () => this.navigateToFolder(null),
    tooltip: 'Go to root folder'
  };

  // Dialog states
  showUploadDialog = false;
  showPreview = false;
  showShareDialog = false;
  fileToShare: FileInfo | null = null;
  isDragOver = false;
  draggedFiles: File[] = [];

  ngOnInit() {
    this.loadFiles();
    this.loadFolderStats(); // Load initial folder stats (root folder)
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
    this.buildBreadcrumb(folder);
    this.loadFiles();
    this.loadFolderStats();
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

  // Breadcrumb navigation
  buildBreadcrumb(folder: StorageFolder | null) {
    this.breadcrumbItems = [];

    if (!folder) {
      return; // Root level - only home icon will show
    }

    // Build path segments from the folder path
    const pathSegments = folder.path.split('/').filter(segment => segment.length > 0);
    let currentPath = '';

    pathSegments.forEach((segment, index) => {
      currentPath += (index === 0 ? '' : '/') + segment;
      const isLast = index === pathSegments.length - 1;

      this.breadcrumbItems.push({
        label: segment,
        icon: 'pi pi-folder',
        data: isLast ? folder : { path: currentPath }, // For intermediate folders, we only have path
        command: isLast ? undefined : () => this.navigateToPath(currentPath),
        tooltip: `Navigate to ${segment} folder`
      });
    });
  }

  navigateToFolder(folder: StorageFolder | null) {
    this.selectedFolder = folder;
    this.buildBreadcrumb(folder);
    this.loadFiles();
    this.loadFolderStats();
  }

  navigateToPath(path: string) {
    // Create a minimal folder object for navigation
    const folder = { path, name: path.split('/').pop() || path, id: 0 } as StorageFolder;
    this.navigateToFolder(folder);
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
        this.loadFolderStats(); // Refresh folder stats after delete
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
      this.loadFolderStats(); // Refresh folder stats after upload
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

  private loadFolderStats() {
    this.folderStatsLoading = true;

    const folderId = this.selectedFolder?.id;

    this.storageService.getStorageStats(folderId).subscribe({
      next: (stats) => {
        console.log('Folder stats loaded:', stats);
        this.folderStats = stats;
        this.folderStatsLoading = false;
      },
      error: (error) => {
        console.error('Error loading folder stats:', error);
        this.folderStatsLoading = false;
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

  // MeterGroup data formatting
  getFileTypeMeterData(): any[] {
    if (!this.folderStats?.filesByMimeType) return [];

    const mimeTypes = Object.entries(this.folderStats.filesByMimeType);
    const totalFiles = this.folderStats.totalFiles;

    if (totalFiles === 0) return [];

    // Group by file type categories first
    const groupedTypes: Record<string, { count: number, color: string }> = {};

    mimeTypes.forEach(([mimeType, count]) => {
      const label = this.getFileTypeLabel(mimeType);
      const color = this.getFileTypeColor(mimeType);

      if (groupedTypes[label]) {
        groupedTypes[label].count += count;
      } else {
        groupedTypes[label] = { count, color };
      }
    });

    return Object.entries(groupedTypes).map(([label, { count, color }]) => ({
      label: `${label} (${count})`,
      value: Math.round((count / totalFiles) * 100),
      color,
      count
    })).filter(item => item.value > 0);
  }

  getClassificationMeterData(): any[] {
    if (!this.folderStats?.filesByClassification) return [];

    const classifications = Object.entries(this.folderStats.filesByClassification);
    const totalFiles = this.folderStats.totalFiles;

    if (totalFiles === 0) return [];

    return classifications.map(([classification, count]) => ({
      label: classification.charAt(0).toUpperCase() + classification.slice(1),
      value: Math.round((count / totalFiles) * 100),
      color: this.getClassificationColor(classification),
      count: count
    })).filter(item => item.value > 0);
  }

  private getFileTypeLabel(mimeType: string): string {
    // More specific matching to avoid overlaps
    if (mimeType.startsWith('image/')) return 'Images';
    if (mimeType.startsWith('video/')) return 'Videos';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType === 'application/pdf') return 'PDFs';

    // Document types
    if (mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('powerpoint') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation') ||
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.ms-powerpoint' ||
      mimeType.includes('opendocument') ||
      mimeType === 'application/rtf') {
      return 'Documents';
    }

    // Text files
    if (mimeType.startsWith('text/')) return 'Text Files';

    // Other application types as Documents
    if (mimeType.startsWith('application/')) return 'Documents';

    return 'Other';
  }

  private getFileTypeColor(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '#3b82f6'; // bright blue
    if (mimeType.startsWith('video/')) return '#ef4444'; // bright red
    if (mimeType.startsWith('audio/')) return '#8b5cf6'; // bright purple
    if (mimeType === 'application/pdf') return '#f59e0b'; // bright orange
    if (mimeType.startsWith('application/')) return '#10b981'; // bright green
    if (mimeType.startsWith('text/')) return '#06b6d4'; // bright cyan
    return '#64748b'; // modern gray
  }

  private getClassificationColor(classification: string): string {
    switch (classification) {
      case 'public': return '#10b981'; // green
      case 'internal': return '#3b82f6'; // blue
      case 'confidential': return '#f59e0b'; // yellow
      case 'restricted': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  }

  formatFileSize(bytes: number): string {
    return this.storageService.formatFileSize(bytes);
  }
}
