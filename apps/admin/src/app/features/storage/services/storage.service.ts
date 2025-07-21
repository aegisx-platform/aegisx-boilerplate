import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import { Observable, map, catchError, throwError, BehaviorSubject } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

// Storage Types
export interface FileInfo {
  id: string;
  filename: string;
  original_filename?: string;
  mime_type: string;
  size: number;
  path?: string;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  tags?: string[];
  customMetadata?: any;
  uploaded_by?: string;
  is_encrypted?: boolean;
  created_at: string;
  updated_at?: string;
  thumbnails?: string[] | Array<{ url: string, width: number, height: number, size: number, format: string }>;
  shareUrl?: string;
  provider?: string;
  selected?: boolean;
}

export interface UploadResponse {
  success: boolean;
  fileId?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  checksum?: string;
  metadata?: any;
  thumbnails?: any[];
  file?: FileInfo;
  message?: string;
}

// Backend response format
export interface BackendFileInfo {
  fileId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  dataClassification: string;
  encrypted: boolean;
  tags?: string[];
  customMetadata?: any;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  accessCount: number;
  status: string;
  path?: string;
  thumbnails?: any;
  shareUrl?: string;
  provider?: string;
}

export interface BackendListFilesResponse {
  files: BackendFileInfo[];
  total: number;
  hasMore: boolean;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface ListFilesResponse {
  success: boolean;
  files: FileInfo[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  filesByProvider: Record<string, number>;
  filesByMimeType: Record<string, number>;
  filesByClassification: Record<string, number>;
  averageFileSize: number;
  largestFile: number;
  recentActivity: {
    uploads: number;
    downloads: number;
  };
  quotaInfo: {
    maxStorage: number;
    usedStorage: number;
    maxFiles: number;
    usedFiles: number;
    percentageUsed: number;
  };
}

export interface ShareRequest {
  fileId: string;
  recipientEmail: string;
  permission: 'read' | 'write';
  expiresAt?: string;
  message?: string;
}

export interface ShareResponse {
  success: boolean;
  shareId: string;
  shareUrl: string;
  expiresAt: string;
}

export interface SharedFile extends FileInfo {
  shareId: string;
  sharedBy: string;
  sharedAt: string;
  permission: 'read' | 'write';
  expiresAt?: string;
}

export interface ImageProcessingOptions {
  operations: {
    resize?: {
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      withoutEnlargement?: boolean;
    };
    crop?: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    rotate?: {
      angle: number;
      background?: string;
    };
    flip?: boolean;
    flop?: boolean;
    format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff' | 'gif';
    quality?: number;
    progressive?: boolean;
    blur?: number | boolean;
    sharpen?: boolean | object;
    grayscale?: boolean;
    modulate?: {
      brightness?: number;
      saturation?: number;
      hue?: number;
    };
    watermark?: {
      text: string;
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
      opacity: number;
    };
  };
  saveAsNew?: boolean;
  filename?: string;
}

export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  loaded: number;
  total: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private baseUrl = '/api/v1/storage';

  // Upload progress tracking
  private uploadProgressSubject = new BehaviorSubject<UploadProgress[]>([]);
  public uploadProgress$ = this.uploadProgressSubject.asObservable();

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Upload file with progress tracking and metadata
   */
  uploadFile(
    file: File,
    options: {
      path?: string;
      folderId?: number;
      folder?: string;
      dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
      tags?: string[];
      customMetadata?: any;
      encrypt?: boolean;
      overwrite?: boolean;
      generateThumbnail?: boolean;
      thumbnailSizes?: Array<{ width: number, height: number, fit?: string }>;
    } = {}
  ): Observable<UploadResponse | UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);

    if (options.folderId) formData.append('folderId', options.folderId.toString());
    if (options.path) formData.append('path', options.path);
    if (options.folder) formData.append('folder', options.folder);
    if (options.dataClassification) formData.append('dataClassification', options.dataClassification);
    if (options.tags) formData.append('tags', JSON.stringify(options.tags));
    if (options.customMetadata) formData.append('customMetadata', JSON.stringify(options.customMetadata));
    if (options.encrypt !== undefined) formData.append('encrypt', options.encrypt.toString());
    if (options.overwrite !== undefined) formData.append('overwrite', options.overwrite.toString());
    if (options.generateThumbnail !== undefined) formData.append('generateThumbnail', options.generateThumbnail.toString());
    if (options.thumbnailSizes) formData.append('thumbnailSizes', JSON.stringify(options.thumbnailSizes));

    const request = new HttpRequest('POST', `${this.baseUrl}/upload`, formData, {
      headers: this.getHeaders(),
      reportProgress: true
    });

    const fileId = crypto.randomUUID();

    return this.http.request<UploadResponse>(request).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress: UploadProgress = {
            fileId,
            filename: file.name,
            progress: Math.round(100 * event.loaded / (event.total || 1)),
            loaded: event.loaded,
            total: event.total || 0,
            status: 'uploading'
          };
          this.updateUploadProgress(progress);
          return progress;
        } else if (event.type === HttpEventType.Response) {
          const response = event.body as UploadResponse;
          const completedProgress: UploadProgress = {
            fileId: response.fileId || response.file?.id || fileId,
            filename: file.name,
            progress: 100,
            loaded: file.size,
            total: file.size,
            status: 'completed'
          };
          this.updateUploadProgress(completedProgress);
          return response;
        }
        return {
          fileId,
          filename: file.name,
          progress: 0,
          loaded: 0,
          total: 0,
          status: 'uploading'
        } as UploadProgress;
      }),
      catchError(error => {
        const errorProgress: UploadProgress = {
          fileId,
          filename: file.name,
          progress: 0,
          loaded: 0,
          total: 0,
          status: 'error',
          error: error.message
        };
        this.updateUploadProgress(errorProgress);
        return throwError(() => error);
      })
    );
  }

  private updateUploadProgress(progress: UploadProgress) {
    const currentProgress = this.uploadProgressSubject.value;
    const index = currentProgress.findIndex(p => p.fileId === progress.fileId);

    if (index >= 0) {
      currentProgress[index] = progress;
    } else {
      currentProgress.push(progress);
    }

    this.uploadProgressSubject.next([...currentProgress]);

    // Clean up completed/error uploads after delay
    if (progress.status === 'completed' || progress.status === 'error') {
      setTimeout(() => {
        const updatedProgress = this.uploadProgressSubject.value.filter(p => p.fileId !== progress.fileId);
        this.uploadProgressSubject.next(updatedProgress);
      }, 5000); // เพิ่มเวลาเป็น 5 วินาที
    }
  }

  /**
   * Clear all upload progress
   */
  clearUploadProgress() {
    this.uploadProgressSubject.next([]);
  }

  /**
   * Remove single upload progress by fileId
   */
  removeSingleProgress(fileId: string) {
    const currentProgress = this.uploadProgressSubject.value;
    const updatedProgress = currentProgress.filter(p => p.fileId !== fileId);
    this.uploadProgressSubject.next(updatedProgress);
  }

  /**
   * List files with filtering and pagination
   */
  listFiles(params: {
    page?: number;
    limit?: number;
    path?: string;
    folderId?: number;
    mimeType?: string;
    tags?: string[];
    dataClassification?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
  } = {}): Observable<ListFilesResponse> {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && !Number.isNaN(value)) {
        if (Array.isArray(value)) {
          httpParams = httpParams.set(key, JSON.stringify(value));
        } else {
          const stringValue = value.toString();
          if (stringValue && stringValue !== 'NaN' && stringValue !== 'undefined') {
            httpParams = httpParams.set(key, stringValue);
          }
        }
      }
    });

    console.log('Final HTTP params:', httpParams.toString());

    return this.http.get<BackendListFilesResponse>(`${this.baseUrl}/files`, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      map(response => {
        console.log('Raw API response:', response);
        return {
          success: true,
          files: response.files.map(file => ({
            // Map backend response to frontend FileInfo interface
            id: file.fileId,
            filename: file.filename,
            original_filename: file.originalName,
            mime_type: file.mimeType,
            size: file.size,
            path: file.path,
            dataClassification: file.dataClassification,
            tags: file.tags,
            customMetadata: file.customMetadata,
            uploaded_by: file.createdBy,
            is_encrypted: file.encrypted,
            created_at: file.createdAt,
            updated_at: file.updatedAt,
            thumbnails: file.thumbnails,
            shareUrl: file.shareUrl,
            provider: file.provider,
            selected: false
          } as FileInfo)),
          pagination: {
            page: Math.floor((response.pagination.offset || 0) / (response.pagination.limit || 50)) + 1,
            limit: response.pagination.limit || 50,
            totalCount: response.total,
            totalPages: Math.ceil(response.total / (response.pagination.limit || 50))
          }
        };
      }),
      catchError(error => {
        console.error('API Error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get file information
   */
  getFileInfo(fileId: string): Observable<{ success: boolean; file: FileInfo }> {
    return this.http.get<{ success: boolean; file: FileInfo }>(`${this.baseUrl}/files/${fileId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Download file
   */
  downloadFile(fileId: string, filename?: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/download/${fileId}`, {
      headers: this.getHeaders(),
      responseType: 'blob',
      observe: 'body'
    });
  }

  /**
   * Get file download URL
   */
  getDownloadUrl(fileId: string): string {
    const token = this.authService.getToken();
    return `${this.baseUrl}/download/${fileId}?token=${token}`;
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(fileId: string, filename: string): string {
    const token = this.authService.getToken();
    return `${this.baseUrl}/thumbnails/${fileId}/${filename}?token=${token}`;
  }

  /**
   * Delete file
   */
  deleteFile(fileId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/files/${fileId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Share file with another user
   */
  shareFile(shareRequest: ShareRequest): Observable<ShareResponse> {
    return this.http.post<ShareResponse>(`${this.baseUrl}/share`, shareRequest, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get files shared with current user
   */
  getSharedFiles(): Observable<{ success: boolean; sharedFiles: SharedFile[] }> {
    return this.http.get<{ success: boolean; sharedFiles: SharedFile[] }>(`${this.baseUrl}/shared-files`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get files that current user has shared
   */
  getMyShares(): Observable<{ success: boolean; shares: any[] }> {
    return this.http.get<{ success: boolean; shares: any[] }>(`${this.baseUrl}/my-shares`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Revoke file share
   */
  revokeShare(shareId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/shares/${shareId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get storage statistics
   */
  getStorageStats(folderId?: number): Observable<StorageStats> {
    let params = new HttpParams();
    if (folderId !== undefined) {
      params = params.set('folderId', folderId.toString());
    }

    return this.http.get<StorageStats>(`${this.baseUrl}/stats`, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Generate presigned URL for direct upload/download
   */
  generatePresignedUrl(
    operation: 'upload' | 'download',
    filename: string,
    expiresIn?: number
  ): Observable<{ success: boolean; url: string; expiresAt: string }> {
    return this.http.post<{ success: boolean; url: string; expiresAt: string }>(`${this.baseUrl}/presigned-url`, {
      operation,
      filename,
      expiresIn
    }, {
      headers: this.getHeaders()
    });
  }

  // Image Processing Methods

  /**
   * Process image with various operations
   */
  processImage(fileId: string, options: ImageProcessingOptions): Observable<any> {
    return this.http.post(`${this.baseUrl}/images/process/${fileId}`, options, {
      headers: this.getHeaders()
    });
  }

  /**
   * Convert image format
   */
  convertImageFormat(
    fileId: string,
    format: 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff',
    options: {
      quality?: number;
      lossless?: boolean;
      progressive?: boolean;
      saveAsNew?: boolean;
      filename?: string;
    } = {}
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/images/convert/${fileId}`, {
      format,
      ...options
    }, {
      headers: this.getHeaders()
    });
  }

  /**
   * Optimize image for web
   */
  optimizeImage(
    fileId: string,
    options: {
      quality?: number;
      progressive?: boolean;
      stripMetadata?: boolean;
      saveAsNew?: boolean;
      filename?: string;
    } = {}
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/images/optimize/${fileId}`, options, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get image metadata
   */
  getImageMetadata(fileId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/images/metadata/${fileId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Get supported image formats
   */
  getSupportedFormats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/images/formats`);
  }

  // Utility Methods

  /**
   * Format file size to human readable
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon
   */
  getFileIcon(mimeType: string): string {
    if (!mimeType) return 'pi pi-file';
    if (mimeType.startsWith('image/')) return 'pi pi-image';
    if (mimeType.startsWith('video/')) return 'pi pi-video';
    if (mimeType.startsWith('audio/')) return 'pi pi-volume-up';
    if (mimeType.includes('pdf')) return 'pi pi-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'pi pi-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'pi pi-file-excel';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'pi pi-file';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'pi pi-file-archive';
    return 'pi pi-file';
  }

  /**
   * Check if file is image
   */
  isImage(mimeType: string): boolean {
    return !!(mimeType && mimeType.startsWith('image/'));
  }

  /**
   * Check if file is video
   */
  isVideo(mimeType: string): boolean {
    return !!(mimeType && mimeType.startsWith('video/'));
  }

  /**
   * Get data classification color
   */
  getClassificationColor(classification: string): string {
    const colors = {
      'public': 'text-green-600',
      'internal': 'text-blue-600',
      'confidential': 'text-orange-600',
      'restricted': 'text-red-600'
    };
    return colors[classification as keyof typeof colors] || 'text-gray-600';
  }

  // Folder Management Methods
  /**
   * Get folders list
   */
  getFolders(): Observable<any> {
    return this.http.get(`${this.baseUrl}/folders`).pipe(
      catchError((error) => {
        console.error('Error getting folders:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create new folder
   */
  createFolder(folderData: { name: string; parentId?: number; description?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/folders`, folderData).pipe(
      catchError((error) => {
        console.error('Error creating folder:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update folder
   */
  updateFolder(folderId: number, folderData: { name: string; description?: string }): Observable<any> {
    return this.http.patch(`${this.baseUrl}/folders/${folderId}`, folderData).pipe(
      catchError((error) => {
        console.error('Error updating folder:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get folder deletion information
   */
  getFolderDeletionInfo(folderId: number): Observable<{
    success: boolean
    canDelete: boolean
    reason?: string
    folderInfo: {
      name: string
      path: string
      fileCount: number
      subfolderCount: number
      totalSize: number
      hasSubfolders: boolean
    }
  }> {
    return this.http.get<{
      success: boolean
      canDelete: boolean
      reason?: string
      folderInfo: {
        name: string
        path: string
        fileCount: number
        subfolderCount: number
        totalSize: number
        hasSubfolders: boolean
      }
    }>(`${this.baseUrl}/folders/${folderId}/deletion-info`).pipe(
      catchError((error) => {
        console.error('Error getting folder deletion info:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete folder
   */
  deleteFolder(folderId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/folders/${folderId}`).pipe(
      catchError((error) => {
        console.error('Error deleting folder:', error);
        return throwError(() => error);
      })
    );
  }
}
