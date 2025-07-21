import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ContextMenuModule } from 'primeng/contextmenu';
import { ProgressBarModule } from 'primeng/progressbar';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CheckboxModule } from 'primeng/checkbox';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { Table } from 'primeng/table';

import { StorageService, FileInfo } from '../../services/storage.service';

export interface FileListOptions {
  allowMultiSelect?: boolean;
  showActions?: boolean;
  showUploader?: boolean;
  compactView?: boolean;
  folder?: string;
}

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule,
    ContextMenuModule,
    ProgressBarModule,
    IconFieldModule,
    InputIconModule,
    CheckboxModule,
    MenuModule,
    TooltipModule
  ],
  providers: [ConfirmationService],
  template: `
    <div class="file-list-container">
      <!-- Header with Search and Filters -->
      <div class="file-list-header pl-4 pr-4 border-bottom-1 border-gray-200">
        <div class="flex flex-wrap align-items-center justify-content-between gap-3">

          <!-- Search -->
          <div class="flex-1 min-w-20rem">
            <p-iconField iconPosition="left">
              <p-inputIcon styleClass="pi pi-search"></p-inputIcon>
              <input
                pInputText
                [(ngModel)]="searchTerm"
                (input)="onSearch()"
                placeholder="Search files..."
                class="w-full"
              />
            </p-iconField>
          </div>

          <!-- Filters -->
          <div class="flex gap-2">
            <p-select
              [(ngModel)]="selectedMimeType"
              [options]="mimeTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="File Type"
              [showClear]="true"
              (onChange)="onFilterChange()"
              class="w-10rem"
            ></p-select>

            <p-select
              [(ngModel)]="selectedClassification"
              [options]="classificationOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Classification"
              [showClear]="true"
              (onChange)="onFilterChange()"
              class="w-10rem"
            ></p-select>
          </div>

          <!-- Upload Button & Actions -->
          <div class="flex gap-2">
            <p-button
              icon="pi pi-upload"
              label="Upload Files"
              severity="primary"
              (click)="requestUpload()"
              pTooltip="Upload files"
              tooltipPosition="top"
            ></p-button>

            <p-button
              *ngIf="selectedFiles.length > 0"
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              (click)="bulkDelete()"
              [pTooltip]="'Delete ' + selectedFiles.length + ' files'"
              tooltipPosition="top"
            ></p-button>

            <p-button
              *ngIf="selectedFiles.length > 0"
              icon="pi pi-download"
              severity="secondary"
              [text]="true"
              (click)="bulkDownload()"
              [pTooltip]="'Download ' + selectedFiles.length + ' files'"
              tooltipPosition="top"
            ></p-button>

            <p-button
              icon="pi pi-refresh"
              [text]="true"
              (click)="refreshFileList()"
              pTooltip="Refresh"
              tooltipPosition="top"
            ></p-button>
          </div>
        </div>
      </div>

      <!-- File Table -->
      <div class="file-table-container">
        <p-table
          #fileTable
          [value]="files"
          [rows]="pageSize"
          [totalRecords]="totalFiles"
          [lazy]="true"
          [loading]="loading"
          [paginator]="true"
          [rowsPerPageOptions]="[10, 30, 50, 100, 200, 300,500]"

          [sortMode]="'single'"
          [selection]="selectedFiles"
          [(selection)]="selectedFiles"
          [contextMenu]="contextMenu"
          [globalFilterFields]="['filename', 'original_filename', 'mime_type']"
          [scrollable]="true"
          [scrollHeight]="'500px'"
          [virtualScroll]="true"
          [virtualScrollItemSize]="60"
          (onLazyLoad)="loadFiles($event)"
          (onSort)="onSort($event)"
          (onPage)="onPageChange($event)"
          dataKey="id"
          class="file-table"
        >
          <!-- Table Header -->
          <ng-template pTemplate="header">
            <tr>
              <th *ngIf="options.allowMultiSelect" style="width: 3rem">
                <p-checkbox
                  [(ngModel)]="selectAll"
                  (onChange)="toggleSelectAll()"
                  [binary]="true"
                ></p-checkbox>
              </th>
              <th pSortableColumn="filename" style="width: 20%">
                File Name
                <p-sortIcon field="filename"></p-sortIcon>
              </th>
              <th style="width: 10%">Type</th>
              <th pSortableColumn="size" style="width: 10%">
                Size
                <p-sortIcon field="size"></p-sortIcon>
              </th>
              <th style="width: 12%">Classification</th>
              <th style="width: 15%">Tags</th>
              <th pSortableColumn="created_at" style="width: 15%">
                Created
                <p-sortIcon field="created_at"></p-sortIcon>
              </th>
              <th *ngIf="options.showActions" style="width: 15%">Actions</th>
            </tr>
          </ng-template>

          <!-- Table Body -->
          <ng-template pTemplate="body" let-file let-rowIndex="rowIndex">
            <tr
              [pContextMenuRow]="file"
              class="file-row"
              [class.selected-row]="isFileSelected(file)"
            >
              <td *ngIf="options.allowMultiSelect">
                <p-checkbox
                  [(ngModel)]="file.selected"
                  (onChange)="onFileSelect(file)"
                  [binary]="true"
                ></p-checkbox>
              </td>

              <td class="file-name-cell">
                <div class="flex align-items-center gap-2">
                  <i [class]="getFileIcon(file.mime_type)" class="file-icon"></i>
                  <div>
                    <div class="font-medium text-primary cursor-pointer"
                         (click)="onFilePreview(file)">
                      {{ file.original_filename }}
                    </div>
                    <!-- <div *ngIf="file.original_filename !== file.filename"
                         class="text-sm text-gray-500">
                      {{ file.original_filename }}
                    </div> -->
                  </div>
                </div>
              </td>

              <td>
                <span class="text-sm bg-gray-100 px-2 py-1 border-round">
                  {{ getFileTypeDisplay(file.mime_type) }}
                </span>
              </td>

              <td>
                <span class="font-mono text-sm">
                  {{ formatFileSize(file.size) }}
                </span>
              </td>

              <td>
                <p-tag
                  [value]="file.dataClassification || 'internal'"
                  [severity]="getClassificationSeverity(file.dataClassification)"
                  [rounded]="true"
                ></p-tag>
              </td>

              <td>
                <div class="flex flex-wrap gap-1" *ngIf="file.tags && file.tags.length > 0">
                  <p-tag
                    *ngFor="let tag of file.tags.slice(0, 3)"
                    [value]="tag"
                    severity="info"
                    [rounded]="true"
                  ></p-tag>
                  <span *ngIf="file.tags.length > 3" class="text-xs text-gray-500">
                    +{{ file.tags.length - 3 }} more
                  </span>
                </div>
              </td>

              <td>
                <div class="text-sm">
                  {{ formatDate(file.created_at) }}
                </div>
              </td>

              <td *ngIf="options.showActions">
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-eye"
                    size="small"
                    [text]="true"
                    (click)="onFilePreview(file)"
                    pTooltip="Preview"
                    tooltipPosition="top"
                  ></p-button>

                  <p-button
                    icon="pi pi-download"
                    size="small"
                    [text]="true"
                    (click)="onFileDownload(file)"
                    pTooltip="Download"
                    tooltipPosition="top"
                  ></p-button>

                  <p-button
                    icon="pi pi-share-alt"
                    size="small"
                    [text]="true"
                    (click)="onFileShare(file)"
                    pTooltip="Share"
                    tooltipPosition="top"
                  ></p-button>

                  <p-button
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    [text]="true"
                    (click)="onFileDelete(file)"
                    pTooltip="Delete"
                    tooltipPosition="top"
                  ></p-button>
                </div>
              </td>
            </tr>
          </ng-template>

          <!-- Empty State -->
          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="getColumnCount()" class="text-center py-8">
                <div class="flex flex-column align-items-center gap-3">
                  <i class="pi pi-inbox text-6xl text-gray-300"></i>
                  <div class="text-xl text-gray-500">No files found</div>
                  <div class="text-gray-400">
                    {{ searchTerm ? 'Try adjusting your search criteria' : 'Upload your first file to get started' }}
                  </div>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Context Menu -->
      <p-contextMenu #contextMenu [model]="contextMenuItems"></p-contextMenu>

      <!-- Confirm Dialog -->
      <p-confirmDialog></p-confirmDialog>

      <!-- Toast Messages -->
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .file-list-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .file-table-container {
      flex: 1;
      overflow: hidden;
    }

    .file-table {
      width: 100%;
    }

    .file-row:hover {
      background-color: var(--surface-hover);
    }

    .selected-row {
      background-color: var(--primary-50);
    }

    .file-name-cell {
      max-width: 300px;
    }

    .file-icon {
      font-size: 1.5rem;
      color: var(--primary-color);
    }

    .file-list-header {
      background: var(--surface-section);
    }

    :host ::ng-deep .p-table .p-table-tbody > tr > td {
      padding: 1rem 1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    :host ::ng-deep .p-table .p-table-thead > tr > th {
      padding: 1rem 1rem;
      font-weight: 600;
      background: var(--surface-section);
      border-bottom: 1px solid var(--surface-border);
    }
  `]
})
export class FileListComponent implements OnInit, OnDestroy, OnChanges {
  @Input() options: FileListOptions = {
    allowMultiSelect: true,
    showActions: true,
    showUploader: false,
    compactView: false
  };

  @Input() folder?: string;
  @Input() folderId?: number;

  @Output() fileSelected = new EventEmitter<FileInfo>();
  @Output() filesSelected = new EventEmitter<FileInfo[]>();
  @Output() filePreview = new EventEmitter<FileInfo>();
  @Output() fileShare = new EventEmitter<FileInfo>();
  @Output() fileDelete = new EventEmitter<FileInfo>();
  @Output() bulkDeleteRequested = new EventEmitter<FileInfo[]>();
  @Output() uploadRequested = new EventEmitter<void>();

  @ViewChild('fileTable') fileTable!: Table;

  private storageService = inject(StorageService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private subscriptions = new Subscription();

  // Table data
  files: FileInfo[] = [];
  selectedFiles: FileInfo[] = [];
  totalFiles = 0;
  loading = false;
  selectAll = false;

  // Filters and search
  searchTerm = '';
  selectedMimeType = '';
  selectedClassification = '';
  currentPage = 0;
  pageSize = 300;
  sortField = 'created_at';
  sortOrder = -1;

  // Options
  mimeTypeOptions = [
    { label: 'Images', value: 'image/' },
    { label: 'Documents', value: 'application/pdf' },
    { label: 'Videos', value: 'video/' },
    { label: 'Audio', value: 'audio/' },
    { label: 'Archives', value: 'archive' }
  ];

  classificationOptions = [
    { label: 'Public', value: 'public' },
    { label: 'Internal', value: 'internal' },
    { label: 'Confidential', value: 'confidential' },
    { label: 'Restricted', value: 'restricted' }
  ];

  contextMenuItems = [
    {
      label: 'Preview',
      icon: 'pi pi-eye',
      command: () => this.selectedContextFile && this.onFilePreview(this.selectedContextFile)
    },
    {
      label: 'Download',
      icon: 'pi pi-download',
      command: () => this.selectedContextFile && this.onFileDownload(this.selectedContextFile)
    },
    {
      label: 'Share',
      icon: 'pi pi-share-alt',
      command: () => this.selectedContextFile && this.onFileShare(this.selectedContextFile)
    },
    {
      separator: true
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => this.selectedContextFile && this.onFileDelete(this.selectedContextFile)
    }
  ];

  private selectedContextFile: FileInfo | null = null;

  ngOnInit() {
    this.loadFiles();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['folder'] && !changes['folder'].firstChange) {
      console.log('Folder changed:', this.folder);
      this.currentPage = 0;
      // Preserve current pageSize when folder changes
      this.loadFiles({
        first: 0,
        rows: this.pageSize,
        sortField: this.sortField,
        sortOrder: this.sortOrder
      });
    }
  }

  loadFiles(event?: any) {
    this.loading = true;

    if (event) {
      this.currentPage = Math.floor(event.first / event.rows) || 0;
      this.pageSize = event.rows || 300;
      if (event.sortField) {
        this.sortField = event.sortField;
        this.sortOrder = event.sortOrder;
      }
    }

    // Ensure valid pagination values
    const page = Math.max(1, this.currentPage + 1);
    const limit = Math.max(1, this.pageSize);

    const params: any = {
      page: page,
      limit: limit,
      sortBy: this.sortField || 'created_at',
      sortOrder: (this.sortOrder === 1 ? 'asc' : 'desc') as 'asc' | 'desc'
    };

    // Only add optional parameters if they have values
    if (this.searchTerm && this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }
    if (this.selectedMimeType) {
      params.mimeType = this.selectedMimeType;
    }
    if (this.selectedClassification) {
      params.dataClassification = this.selectedClassification;
    }

    // Only add folder params if they exist and are valid
    if (this.folderId !== undefined && this.folderId !== null) {
      params.folderId = this.folderId;
    }
    if (this.folder && this.folder.trim() && this.folder !== '/') {
      params.path = this.folder.trim();
    }

    console.log('File list loading with params:', params);

    this.storageService.listFiles(params).subscribe({
      next: (response) => {
        console.log('File list response:', response);
        this.files = response.files || [];
        this.totalFiles = response.pagination?.totalCount || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading files:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to load files'
        });
        this.loading = false;
        this.files = [];
        this.totalFiles = 0;
      }
    });
  }

  private searchTimeout: any;

  onSearch() {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search to avoid too many API calls
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 0;
      // Preserve current pageSize when searching
      this.loadFiles({
        first: 0,
        rows: this.pageSize,
        sortField: this.sortField,
        sortOrder: this.sortOrder
      });
    }, 500);
  }

  onFilterChange() {
    this.currentPage = 0;
    // Preserve current pageSize when filtering
    this.loadFiles({
      first: 0,
      rows: this.pageSize,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    });
  }

  onSort(event: any) {
    this.loadFiles(event);
  }

  onPageChange(event: any) {
    this.loadFiles(event);
  }

  refreshFileList() {
    this.currentPage = 0;
    this.selectedFiles = [];
    this.selectAll = false;
    // Clear current files and show loading
    this.files = [];
    this.loading = true;
    this.loadFiles();
  }

  // Selection methods
  isFileSelected(file: FileInfo): boolean {
    return this.selectedFiles.some(f => f.id === file.id);
  }

  onFileSelect(file: FileInfo) {
    if (file.selected) {
      if (!this.isFileSelected(file)) {
        this.selectedFiles.push(file);
      }
    } else {
      this.selectedFiles = this.selectedFiles.filter(f => f.id !== file.id);
    }
    this.updateSelectAll();
    this.filesSelected.emit(this.selectedFiles);
  }

  toggleSelectAll() {
    if (this.selectAll) {
      this.selectedFiles = [...this.files];
      this.files.forEach(file => file.selected = true);
    } else {
      this.selectedFiles = [];
      this.files.forEach(file => file.selected = false);
    }
    this.filesSelected.emit(this.selectedFiles);
  }

  private updateSelectAll() {
    this.selectAll = this.files.length > 0 && this.files.every(file => this.isFileSelected(file));
  }

  // File actions
  onFilePreview(file: FileInfo) {
    this.filePreview.emit(file);
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
    this.fileShare.emit(file);
  }

  onFileDelete(file: FileInfo) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${file.filename}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.storageService.deleteFile(file.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'File deleted successfully'
            });
            this.refreshFileList();
          },
          error: (error) => {
            console.error('Delete error:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete file'
            });
          }
        });
      }
    });
  }

  // Bulk operations
  bulkDelete() {
    const count = this.selectedFiles.length;
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${count} selected files?`,
      header: 'Confirm Bulk Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.bulkDeleteRequested.emit(this.selectedFiles);
      }
    });
  }

  bulkDownload() {
    // Implement bulk download logic
    this.messageService.add({
      severity: 'info',
      summary: 'Download Started',
      detail: `Downloading ${this.selectedFiles.length} files...`
    });

    this.selectedFiles.forEach(file => {
      this.onFileDownload(file);
    });
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    return this.storageService.formatFileSize(bytes);
  }

  getFileIcon(mimeType: string): string {
    return this.storageService.getFileIcon(mimeType);
  }

  getFileTypeDisplay(mimeType: string): string {
    if (!mimeType) return 'Unknown';
    return mimeType.split('/')[1]?.toUpperCase() || 'File';
  }

  getClassificationSeverity(classification: string): string {
    const severities = {
      'public': 'success',
      'internal': 'info',
      'confidential': 'warning',
      'restricted': 'danger'
    };
    return severities[classification as keyof typeof severities] || 'info';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getColumnCount(): number {
    let count = 6; // base columns
    if (this.options.allowMultiSelect) count++;
    if (this.options.showActions) count++;
    return count;
  }

  // Upload request method
  requestUpload() {
    this.uploadRequested.emit();
  }
}
