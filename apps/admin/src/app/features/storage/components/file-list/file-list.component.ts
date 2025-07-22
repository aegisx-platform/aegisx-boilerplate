import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import mime from 'mime';

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
import { MultiSelectModule } from 'primeng/multiselect';
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
    TooltipModule,
    MultiSelectModule
  ],
  providers: [ConfirmationService],
  template: `
    <div class="file-list-container">
      <!-- Header with Search and Filters -->
      <div class="file-list-header pl-4 pr-4  mb-3 border-bottom-1 border-gray-200">
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

            <!-- Column Visibility Selector -->
            <p-multiSelect
              [(ngModel)]="selectedColumns"
              [options]="columnOptions"
              optionLabel="label"
              optionValue="field"
              placeholder="Columns"
              (onChange)="onColumnVisibilityChange()"
              [style]="{ minWidth: '10rem' }"
              [showHeader]="false"
              [showToggleAll]="true"
              [filter]="false"
              appendTo="body"
            >
              <ng-template pTemplate="selectedItems" let-value>
                <div class="flex align-items-center gap-2">
                  <i class="pi pi-table"></i>
                  <span>Columns</span>
                </div>
              </ng-template>
            </p-multiSelect>
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
              <th pSortableColumn="filename" [style.width]="getColumnWidth('filename')">
                File Name
                <p-sortIcon field="filename"></p-sortIcon>
              </th>
              <th *ngIf="isColumnVisible('type')" [style.width]="getColumnWidth('type')">Type</th>
              <th *ngIf="isColumnVisible('size')" pSortableColumn="size" [style.width]="getColumnWidth('size')">
                Size
                <p-sortIcon field="size"></p-sortIcon>
              </th>
              <th *ngIf="isColumnVisible('classification')" [style.width]="getColumnWidth('classification')">Classification</th>
              <th *ngIf="isColumnVisible('tags')" [style.width]="getColumnWidth('tags')">Tags</th>
              <th *ngIf="isColumnVisible('created')" pSortableColumn="created_at" [style.width]="getColumnWidth('created')">
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
                  <div class="file-name-container">
                    <div class="font-medium text-primary cursor-pointer file-name-text"
                         (click)="onFilePreview(file)"
                         [pTooltip]="file.original_filename"
                         tooltipPosition="top"
                         [showDelay]="500">
                      {{ file.original_filename }}
                    </div>
                  </div>
                </div>
              </td>

              <td *ngIf="isColumnVisible('type')">
                <span class="text-sm bg-gray-100 px-2 py-1 border-round">
                  {{ getFileTypeDisplay(file.mime_type) }}
                </span>
              </td>

              <td *ngIf="isColumnVisible('size')">
                <span class="font-mono text-sm">
                  {{ formatFileSize(file.size) }}
                </span>
              </td>

              <td *ngIf="isColumnVisible('classification')">
                <p-tag
                  [value]="file.dataClassification || 'internal'"
                  [severity]="getClassificationSeverity(file.dataClassification)"
                  [rounded]="true"
                ></p-tag>
              </td>

              <td *ngIf="isColumnVisible('tags')">
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
                <span *ngIf="!file.tags || file.tags.length === 0" class="text-xs text-gray-400">
                  No tags
                </span>
              </td>

              <td *ngIf="isColumnVisible('created')">
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
              <td [attr.colspan]="getVisibleColumnCount()" class="text-center py-8">
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

    .file-name-container {
      flex: 1;
      min-width: 0; /* Important for text truncation */
      max-width: 100%;
    }

    .file-name-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
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

  // Column visibility
  columnOptions = [
    { label: 'Type', field: 'type' },
    { label: 'Size', field: 'size' },
    { label: 'Classification', field: 'classification' },
    { label: 'Tags', field: 'tags' },
    { label: 'Created', field: 'created' }
  ];

  // Default visible columns (all except tags)
  selectedColumns: string[] = ['size', 'created'];

  // Column widths
  columnWidths: Record<string, string> = {
    filename: '35%',
    type: '10%',
    size: '10%',
    classification: '12%',
    tags: '15%',
    created: '15%'
  };

  ngOnInit() {
    this.loadColumnsFromStorage();
    this.loadFiles();
    this.updateColumnWidths();
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

    // Common document types
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word';
    if (mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'Excel';
    if (mimeType === 'application/vnd.ms-powerpoint' || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'PowerPoint';

    // Image types
    if (mimeType.startsWith('image/jpeg') || mimeType.startsWith('image/jpg')) return 'JPEG';
    if (mimeType.startsWith('image/png')) return 'PNG';
    if (mimeType.startsWith('image/gif')) return 'GIF';
    if (mimeType.startsWith('image/svg')) return 'SVG';
    if (mimeType.startsWith('image/webp')) return 'WebP';
    if (mimeType.startsWith('image/')) return 'Image';

    // Video types
    if (mimeType.startsWith('video/mp4')) return 'MP4';
    if (mimeType.startsWith('video/avi')) return 'AVI';
    if (mimeType.startsWith('video/mov') || mimeType.startsWith('video/quicktime')) return 'MOV';
    if (mimeType.startsWith('video/')) return 'Video';

    // Audio types
    if (mimeType.startsWith('audio/mpeg') || mimeType.startsWith('audio/mp3')) return 'MP3';
    if (mimeType.startsWith('audio/wav')) return 'WAV';
    if (mimeType.startsWith('audio/')) return 'Audio';

    // Archive types
    if (mimeType.includes('zip')) return 'ZIP';
    if (mimeType.includes('rar')) return 'RAR';
    if (mimeType.includes('tar')) return 'TAR';
    if (mimeType.includes('7z')) return '7Z';

    // Text types
    if (mimeType === 'text/plain') return 'Text';
    if (mimeType === 'text/html') return 'HTML';
    if (mimeType === 'text/css') return 'CSS';
    if (mimeType === 'text/javascript' || mimeType === 'application/javascript') return 'JavaScript';
    if (mimeType === 'application/json') return 'JSON';
    if (mimeType === 'text/xml' || mimeType === 'application/xml') return 'XML';

    // Other common types
    if (mimeType === 'application/octet-stream') return 'Binary';

    // Try to get extension from mime library
    const extension = mime.getExtension(mimeType);
    if (extension) {
      // Return uppercase extension for known types
      return extension.toUpperCase();
    }

    // Final fallback
    return 'File';
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

  // Column visibility methods
  isColumnVisible(column: string): boolean {
    return this.selectedColumns.includes(column);
  }

  onColumnVisibilityChange() {
    // Save to localStorage
    this.saveColumnsToStorage();
    // Recalculate column widths when visibility changes
    this.updateColumnWidths();
  }

  getColumnWidth(column: string): string {
    return this.columnWidths[column] || 'auto';
  }

  getVisibleColumnCount(): number {
    let count = 1; // filename is always visible
    count += this.selectedColumns.length; // add visible optional columns

    if (this.options.allowMultiSelect) count++;
    if (this.options.showActions) count++;

    return count;
  }

  updateColumnWidths() {
    // Dynamically adjust column widths based on visible columns
    const baseWidth = 100;
    const fixedWidths = {
      select: 3,  // checkbox column
      actions: 15 // actions column
    };

    let availableWidth = baseWidth;
    if (this.options.allowMultiSelect) availableWidth -= fixedWidths.select;
    if (this.options.showActions) availableWidth -= fixedWidths.actions;

    // Calculate proportional widths for visible columns
    const visibleCount = this.selectedColumns.length + 1; // +1 for filename

    // Filename gets more space
    this.columnWidths['filename'] = `${Math.floor(availableWidth * 0.4)}%`;

    // Distribute remaining width among other visible columns
    const remainingWidth = availableWidth - Math.floor(availableWidth * 0.4);
    const widthPerColumn = Math.floor(remainingWidth / this.selectedColumns.length);

    this.selectedColumns.forEach(col => {
      this.columnWidths[col] = `${widthPerColumn}%`;
    });
  }

  // LocalStorage methods
  private readonly STORAGE_KEY = 'aegisx_file_list_columns';

  private saveColumnsToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.selectedColumns));
    } catch (error) {
      console.error('Failed to save column preferences to localStorage:', error);
    }
  }

  private loadColumnsFromStorage() {
    try {
      const savedColumns = localStorage.getItem(this.STORAGE_KEY);
      if (savedColumns) {
        const columns = JSON.parse(savedColumns);
        // Validate that saved columns are still valid options
        this.selectedColumns = columns.filter((col: string) =>
          this.columnOptions.some(option => option.field === col)
        );

        // If no valid columns were loaded, use defaults
        if (this.selectedColumns.length === 0) {
          this.selectedColumns = ['type', 'size', 'classification', 'created'];
        }
      }
    } catch (error) {
      console.error('Failed to load column preferences from localStorage:', error);
      // Use default columns on error
      this.selectedColumns = ['type', 'size', 'classification', 'created'];
    }
  }
}
