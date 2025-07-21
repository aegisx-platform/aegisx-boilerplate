import { Component, OnInit, OnDestroy, inject, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConfirmationService, MessageService, TreeNode } from 'primeng/api';

// PrimeNG imports
import { TreeModule } from 'primeng/tree';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ContextMenuModule } from 'primeng/contextmenu';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';

import { StorageService } from '../../services/storage.service';

export interface StorageFolder {
  id: number;
  name: string;
  path: string;
  parentId?: number | null;
  fileCount: number;
  subfolderCount: number;
  totalSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: number;
  description?: string;
}

@Component({
  selector: 'app-folder-tree',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TreeModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    ContextMenuModule,
    ProgressSpinnerModule,
    CardModule
  ],
  providers: [ConfirmationService],
  template: `
    <div  class="pt-2 pr-3 pl-3 flex items-center justify-between border-b-1 border-gray-200">
        <span>
          <i class="pi pi-folder text-xl"></i>
          <span class="font-semibold"> Folders</span>
        </span>
        <span>
        <p-button variant="text"  icon="pi pi-plus" size="small" (click)="showCreateDialog()"></p-button>
        <p-button
          variant="text"
          icon="pi pi-refresh"
          size="small"
          class="ml-2"
          (click)="loadFolders()"
          [loading]="loading"
          [styleClass]="'p-button-text p-button-rounded p-button-secondary'"
        ></p-button>
         </span>
    </div>

      <div class="folder-tree-content p-3">
        <!-- Loading State -->
        <div *ngIf="loading" class="text-center py-4">
          <p-progressSpinner styleClass="w-2rem h-2rem"></p-progressSpinner>
        </div>

        <!-- Folder Tree -->
        <p-tree
          *ngIf="!loading"
          [value]="folderTree"
          selectionMode="single"
          [(selection)]="selectedFolder"
          (onNodeSelect)="onFolderSelect($event)"
          (onNodeUnselect)="onFolderUnselect($event)"
          (onNodeExpand)="onNodeExpand($event)"
          [contextMenu]="cm"
          class="!p-0"
        >
          <ng-template let-node pTemplate="default">
            <div class="flex align-items-center gap-2 py-1 w-full">
              <i [class]="node.expanded ? 'pi pi-folder-open' : 'pi pi-folder'"
                 class="text-primary text-lg"></i>
              <span class="font-medium flex-1">{{ node.label }}</span>
              <span class="text-xs text-gray-500" *ngIf="node.data?.fileCount > 0">
                ({{ node.data.fileCount }})
              </span>
            </div>
          </ng-template>
        </p-tree>

        <!-- Empty State -->
        <div *ngIf="!loading && folderTree.length === 0" class="text-center py-8">
          <i class="pi pi-folder-open text-6xl text-gray-300"></i>
          <div class="text-lg text-gray-500 mt-3">No folders</div>
          <div class="text-gray-400 mt-1">Create your first folder to organize files</div>
          <p-button
            label="Create Folder"
            icon="pi pi-plus"
            size="small"
            [outlined]="true"
            class="mt-3"
            (click)="showCreateDialog()"
          ></p-button>
        </div>
      </div>


    <!-- Context Menu -->
    <p-contextMenu #cm [model]="contextMenuItems"></p-contextMenu>

    <!-- Create/Edit Folder Dialog -->
    <p-dialog
      [(visible)]="showDialog"
      [header]="dialogMode === 'create' ? 'Create Folder' : 'Edit Folder'"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      styleClass="p-fluid folder-dialog"
      [style]="{ width: '500px' }"
    >
      <div class="p-4">
        <div class="field mb-4">
          <label for="folderName" class="block text-sm font-medium text-gray-700 mb-2">Folder Name *</label>
          <input
            id="folderName"
            type="text"
            pInputText
            [(ngModel)]="folderForm.name"
            placeholder="Enter folder name"
            [class.p-invalid]="!folderForm.name"
            maxlength="255"
            class="w-full"
          />
          <small class="p-error block mt-1" *ngIf="!folderForm.name">Folder name is required</small>
        </div>

        <div class="field mb-4" *ngIf="dialogMode === 'create'">
          <label for="parentFolder" class="block text-sm font-medium text-gray-700 mb-2">Parent Folder</label>
          <div class="border border-gray-200 rounded-md p-3 bg-gray-50">
            <p-tree
              [value]="folderTreeForDialog"
              selectionMode="single"
              [(selection)]="selectedParentFolder"
              class="parent-folder-tree"
              [style]="{ height: '150px', overflow: 'auto' }"
            >
              <ng-template let-node pTemplate="default">
                <div class="flex align-items-center gap-2 py-1">
                  <i class="pi pi-folder text-primary"></i>
                  <span>{{ node.label }}</span>
                </div>
              </ng-template>
            </p-tree>
          </div>
          <small class="text-gray-500 mt-1 block">Leave empty to create in root directory</small>
        </div>

        <div class="field mb-4">
          <label for="folderDescription" class="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
          <textarea
            id="folderDescription"
            pInputTextarea
            [(ngModel)]="folderForm.description"
            rows="3"
            placeholder="Enter folder description"
            maxlength="1000"
            class="w-full"
          ></textarea>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-content-end gap-2 p-4 pt-0">
          <p-button
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            [outlined]="true"
            (click)="hideDialog()"
          ></p-button>
          <p-button
            [label]="dialogMode === 'create' ? 'Create Folder' : 'Update Folder'"
            icon="pi pi-check"
            (click)="saveFolder()"
            [disabled]="!folderForm.name"
            [loading]="saving"
          ></p-button>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Confirm Dialog -->
    <p-confirmDialog></p-confirmDialog>

    <!-- Toast Messages -->
    <p-toast></p-toast>
  `,
  styles: [`


    :host ::ng-deep .p-tree .p-tree-container .p-treenode .p-treenode-content {
      padding: 0.5rem;
      border-radius: 4px;
      margin-bottom: 2px;
    }

    :host ::ng-deep .p-tree .p-tree-container .p-treenode .p-treenode-content:hover {
      background: var(--surface-hover);
    }

    :host ::ng-deep .p-tree .p-tree-container .p-treenode .p-treenode-content.p-highlight {
      background: var(--primary-50);
      color: var(--primary-700);
    }

    .parent-folder-tree {
      border: 1px solid var(--surface-border);
      border-radius: 4px;
      padding: 0.5rem;
    }

    :host ::ng-deep .p-card .p-card-body {
      padding: 0;
    }

    :host ::ng-deep .p-card .p-card-content {
      padding: 1rem;
    }

    /* Create folder button styling */
    .create-folder-btn {
      transition: all 0.2s ease;
    }

    :host ::ng-deep .create-folder-btn.p-button {
      background: transparent !important;
      border: 1px solid var(--surface-border) !important;
      color: var(--text-color-secondary) !important;
      width: 2rem !important;
      height: 2rem !important;
    }

    :host ::ng-deep .create-folder-btn.p-button:hover {
      background: var(--surface-hover) !important;
      border-color: var(--primary-color) !important;
      color: var(--primary-color) !important;
      transform: scale(1.05);
    }

    :host ::ng-deep .create-folder-btn.p-button:focus {
      box-shadow: 0 0 0 0.2rem var(--primary-50) !important;
    }

    /* Folder dialog styles */
    :host ::ng-deep .folder-dialog .p-dialog-content {
      padding: 0;
    }

    :host ::ng-deep .folder-dialog .parent-folder-tree .p-tree {
      background: transparent;
      border: none;
    }

    :host ::ng-deep .folder-dialog .parent-folder-tree .p-tree .p-tree-container {
      background: transparent;
    }

    :host ::ng-deep .folder-dialog .parent-folder-tree .p-treenode-content {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    :host ::ng-deep .folder-dialog .parent-folder-tree .p-treenode-content:hover {
      background-color: var(--primary-50);
    }

    :host ::ng-deep .folder-dialog .parent-folder-tree .p-treenode-content.p-highlight {
      background-color: var(--primary-100);
      color: var(--primary-700);
    }

    /* Context menu warning styles */
    :host ::ng-deep .p-contextmenu .p-menuitem-text {
      font-size: 0.875rem;
    }

    :host ::ng-deep .p-contextmenu .p-menuitem.text-orange-500 .p-menuitem-text {
      color: #f59e0b !important;
      font-weight: 500;
    }

    :host ::ng-deep .p-contextmenu .p-menuitem.text-red-600 .p-menuitem-text {
      color: #dc2626 !important;
      font-weight: 600;
    }

    :host ::ng-deep .p-contextmenu .p-menuitem.text-red-500 .p-menuitem-text {
      color: #ef4444 !important;
    }

    /* Add warning icon for content folders */
    :host ::ng-deep .p-contextmenu .p-menuitem.text-orange-500 .p-menuitem-icon::after {
      content: '⚠️';
      margin-left: 0.25rem;
      font-size: 0.75rem;
    }
  `]
})
export class FolderTreeComponent implements OnInit, OnDestroy {
  @Input() height = '400px';
  @Output() folderSelected = new EventEmitter<StorageFolder | null>();
  @Output() folderCreated = new EventEmitter<StorageFolder>();
  @Output() folderUpdated = new EventEmitter<StorageFolder>();
  @Output() folderDeleted = new EventEmitter<number>();

  private storageService = inject(StorageService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private subscriptions = new Subscription();

  // Tree data
  folderTree: TreeNode[] = [];
  folderTreeForDialog: TreeNode[] = [];
  selectedFolder: TreeNode | null = null;
  selectedParentFolder: TreeNode | null = null;
  loading = false;

  // Dialog
  showDialog = false;
  dialogMode: 'create' | 'edit' = 'create';
  saving = false;
  folderForm: CreateFolderRequest = {
    name: '',
    description: ''
  };

  // Context menu
  contextMenuItems = [
    {
      label: 'Create Subfolder',
      icon: 'pi pi-plus',
      command: () => this.createSubfolder()
    },
    {
      label: 'Rename',
      icon: 'pi pi-pencil',
      command: () => this.renameFolder()
    },
    {
      separator: true
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => this.deleteFolder()
    }
  ];

  private selectedContextFolder: StorageFolder | null = null;
  
  // Folder content info cache
  private folderInfoCache = new Map<number, {
    fileCount: number
    subfolderCount: number
    hasContent: boolean
    lastChecked: number
  }>();

  ngOnInit() {
    this.loadFolders();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.folderInfoCache.clear();
  }

  loadFolders() {
    this.loading = true;

    this.storageService.getFolders().subscribe({
      next: (response) => {
        const folders = response.folders || response || [];
        this.folderTree = this.buildFolderTree(folders);
        this.folderTreeForDialog = [...this.folderTree];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading folders:', error);

        // Fallback to mock data if API fails
        const mockFolders = this.getMockFolders();
        this.folderTree = this.buildFolderTree(mockFolders);
        this.folderTreeForDialog = [...this.folderTree];

        this.messageService.add({
          severity: 'warn',
          summary: 'Using Demo Data',
          detail: 'Could not load folders from server, using demo data'
        });
        this.loading = false;
      }
    });
  }

  private getMockFolders(): StorageFolder[] {
    // Mock data for fallback
    return [
      {
        id: 1,
        name: 'Documents',
        path: '/Documents',
        parentId: null,
        fileCount: 15,
        subfolderCount: 3,
        totalSize: 1024000,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'Projects',
        path: '/Documents/Projects',
        parentId: 1,
        fileCount: 8,
        subfolderCount: 0,
        totalSize: 512000,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 3,
        name: 'Images',
        path: '/Images',
        parentId: null,
        fileCount: 25,
        subfolderCount: 2,
        totalSize: 2048000,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ];
  }

  private buildFolderTree(folders: StorageFolder[]): TreeNode[] {
    const folderMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create nodes
    folders.forEach(folder => {
      const node: TreeNode = {
        key: folder.id.toString(),
        label: folder.name,
        data: folder,
        children: [],
        expandedIcon: 'pi pi-folder-open',
        collapsedIcon: 'pi pi-folder',
        leaf: folder.subfolderCount === 0,
        expanded: false,
        selectable: true,
        type: 'folder'
      };
      folderMap.set(folder.id, node);
    });

    // Build tree structure
    folders.forEach(folder => {
      const node = folderMap.get(folder.id)!;

      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parentNode = folderMap.get(folder.parentId)!;
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(node);
        parentNode.leaf = false;
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  onFolderSelect(event: any) {
    const folder = event.node?.data as StorageFolder;
    this.selectedContextFolder = folder;
    this.folderSelected.emit(folder);
    console.log('Folder selected:', folder);
    
    // Preload folder info for context menu
    if (folder) {
      this.preloadFolderInfo(folder.id);
    }
  }

  onFolderUnselect(event: any) {
    this.selectedContextFolder = null;
    this.folderSelected.emit(null);
    console.log('Folder unselected');
  }

  onNodeExpand(event: any) {
    console.log('Node expanded:', event.node);
    // Handle lazy loading if needed
  }

  showCreateDialog(parentFolder?: StorageFolder) {
    this.dialogMode = 'create';
    this.folderForm = {
      name: '',
      description: '',
      parentId: parentFolder?.id
    };

    if (parentFolder) {
      // Find and select the parent folder in the dialog tree
      this.selectedParentFolder = this.findNodeByKey(
        this.folderTreeForDialog,
        parentFolder.id.toString()
      );
    } else {
      this.selectedParentFolder = null;
    }

    this.showDialog = true;
  }

  createSubfolder() {
    if (this.selectedContextFolder) {
      this.showCreateDialog(this.selectedContextFolder);
    }
  }

  renameFolder() {
    if (this.selectedContextFolder) {
      this.dialogMode = 'edit';
      this.folderForm = {
        name: this.selectedContextFolder.name,
        description: '',
        parentId: this.selectedContextFolder.parentId || undefined
      };
      this.showDialog = true;
    }
  }

  saveFolder() {
    if (!this.folderForm.name) {
      return;
    }

    this.saving = true;

    const folderData: CreateFolderRequest = {
      name: this.folderForm.name,
      description: this.folderForm.description,
      parentId: this.selectedParentFolder?.data?.id
    };

    if (this.dialogMode === 'create') {
      this.storageService.createFolder(folderData).subscribe({
        next: (response) => {
          const newFolder = response.folder || response;
          this.folderCreated.emit(newFolder);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Folder created successfully'
          });
          this.hideDialog();
          this.loadFolders();
          this.saving = false;
        },
        error: (error) => {
          console.error('Error creating folder:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create folder'
          });
          this.saving = false;
        }
      });
    } else {
      this.storageService.updateFolder(this.selectedContextFolder!.id, folderData).subscribe({
        next: (response) => {
          const updatedFolder = response.folder || response;
          this.folderUpdated.emit(updatedFolder);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Folder updated successfully'
          });
          this.hideDialog();
          this.loadFolders();
          this.saving = false;
        },
        error: (error) => {
          console.error('Error updating folder:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update folder'
          });
          this.saving = false;
        }
      });
    }
  }

  private async mockCreateFolder(folderData: CreateFolderRequest): Promise<StorageFolder> {
    // Mock implementation - replace with actual API call
    return {
      id: Date.now(),
      name: folderData.name,
      path: folderData.parentId ? `/parent/${folderData.name}` : `/${folderData.name}`,
      parentId: folderData.parentId || null,
      fileCount: 0,
      subfolderCount: 0,
      totalSize: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private async mockUpdateFolder(id: number, folderData: CreateFolderRequest): Promise<StorageFolder> {
    // Mock implementation - replace with actual API call
    return {
      id,
      name: folderData.name,
      path: `/${folderData.name}`,
      parentId: folderData.parentId || null,
      fileCount: 0,
      subfolderCount: 0,
      totalSize: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString()
    };
  }

  deleteFolder() {
    if (!this.selectedContextFolder) return;

    const folder = this.selectedContextFolder;
    
    // First, get detailed folder information
    this.storageService.getFolderDeletionInfo(folder.id).subscribe({
      next: (deletionInfo) => {
        if (!deletionInfo.canDelete) {
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot Delete',
            detail: deletionInfo.reason || 'This folder cannot be deleted'
          });
          return;
        }

        const folderInfo = deletionInfo.folderInfo;
        let message = `Are you sure you want to delete folder "${folderInfo.name}"?`;
        
        if (folderInfo.fileCount > 0 || folderInfo.subfolderCount > 0) {
          message += '\n\nThis action will permanently delete:';
          if (folderInfo.fileCount > 0) {
            message += `\n• ${folderInfo.fileCount} file(s)`;
          }
          if (folderInfo.subfolderCount > 0) {
            message += `\n• ${folderInfo.subfolderCount} subfolder(s)`;
          }
          if (folderInfo.totalSize > 0) {
            message += `\n• Total size: ${this.formatFileSize(folderInfo.totalSize)}`;
          }
          message += '\n\nThis action cannot be undone.';
        }

        // Show enhanced confirmation dialog
        this.confirmationService.confirm({
          message: message,
          header: `Delete ${folderInfo.hasSubfolders ? 'Folder and Contents' : 'Folder'}`,
          icon: 'pi pi-exclamation-triangle',
          acceptButtonStyleClass: 'p-button-danger',
          acceptLabel: folderInfo.fileCount > 10 || folderInfo.subfolderCount > 5 ? 'Yes, Delete All' : 'Delete',
          rejectLabel: 'Cancel',
          accept: () => {
            this.performDelete(folder.id, folderInfo.name);
          }
        });
      },
      error: (error) => {
        console.error('Error getting folder deletion info:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not check folder status'
        });
      }
    });
  }

  private performDelete(folderId: number, folderName: string) {
    this.storageService.deleteFolder(folderId).subscribe({
      next: (result) => {
        this.folderDeleted.emit(folderId);
        
        let successMessage = 'Folder deleted successfully';
        if (result.deletedFiles > 0 || result.deletedFolders > 1) {
          successMessage = `Successfully deleted ${result.deletedFolders} folder(s) and ${result.deletedFiles} file(s)`;
        }
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: successMessage
        });
        this.loadFolders();
      },
      error: (error) => {
        console.error('Error deleting folder:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to delete folder'
        });
      }
    });
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private preloadFolderInfo(folderId: number) {
    const cached = this.folderInfoCache.get(folderId);
    const now = Date.now();
    
    // Use cached data if it's less than 30 seconds old
    if (cached && now - cached.lastChecked < 30000) {
      this.updateContextMenu(folderId, cached);
      return;
    }

    // Load fresh data
    this.storageService.getFolderDeletionInfo(folderId).subscribe({
      next: (info) => {
        const folderInfo = {
          fileCount: info.folderInfo.fileCount,
          subfolderCount: info.folderInfo.subfolderCount,
          hasContent: info.folderInfo.fileCount > 0 || info.folderInfo.subfolderCount > 0,
          lastChecked: now
        };
        
        this.folderInfoCache.set(folderId, folderInfo);
        this.updateContextMenu(folderId, folderInfo);
      },
      error: (error) => {
        console.error('Error preloading folder info:', error);
      }
    });
  }

  private updateContextMenu(folderId: number, folderInfo: any) {
    const hasContent = folderInfo.hasContent;
    
    this.contextMenuItems = [
      {
        label: 'Create Subfolder',
        icon: 'pi pi-plus',
        command: () => this.createSubfolder()
      },
      {
        label: hasContent ? 'Rename (Has Content)' : 'Rename',
        icon: 'pi pi-pencil',
        command: () => hasContent ? this.showContentWarning('rename') : this.renameFolder()
      },
      {
        separator: true
      },
      {
        label: hasContent ? 
          `Delete (${folderInfo.fileCount} files, ${folderInfo.subfolderCount} subfolders)` : 
          'Delete',
        icon: 'pi pi-trash',
        command: () => this.deleteFolder()
      }
    ];
  }

  private showContentWarning(action: 'rename' | 'delete') {
    if (!this.selectedContextFolder) return;
    
    const folderInfo = this.folderInfoCache.get(this.selectedContextFolder.id);
    if (!folderInfo) return;

    const message = action === 'rename' 
      ? `This folder contains ${folderInfo.fileCount} files and ${folderInfo.subfolderCount} subfolders. Renaming it may affect file organization. Continue?`
      : `This folder contains content. Are you sure you want to ${action}?`;

    this.confirmationService.confirm({
      message: message,
      header: `${action === 'rename' ? 'Rename' : 'Delete'} Folder with Content`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: action === 'delete' ? 'p-button-danger' : 'p-button-warning',
      accept: () => {
        if (action === 'rename') {
          this.renameFolder();
        }
      }
    });
  }

  private async mockDeleteFolder(id: number): Promise<void> {
    // Mock implementation - replace with actual API call
    console.log('Deleting folder:', id);
  }

  hideDialog() {
    this.showDialog = false;
    this.folderForm = {
      name: '',
      description: ''
    };
    this.selectedParentFolder = null;
  }

  private findNodeByKey(nodes: TreeNode[], key: string): TreeNode | null {
    for (const node of nodes) {
      if (node.key === key) {
        return node;
      }
      if (node.children) {
        const found = this.findNodeByKey(node.children, key);
        if (found) return found;
      }
    }
    return null;
  }
}
