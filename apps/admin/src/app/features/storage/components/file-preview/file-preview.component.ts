import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

// PrimeNG imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { SliderModule } from 'primeng/slider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { ImageModule } from 'primeng/image';
import { MessageService } from 'primeng/api';

import { StorageService, FileInfo, ImageProcessingOptions } from '../../services/storage.service';

interface SimpleImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  resize?: 'fit' | 'fill' | 'crop';
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
    sharpen?: boolean;
    grayscale?: boolean;
    sepia?: boolean;
  };
  watermark?: {
    text?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
    size?: number;
  };
}

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TabsModule,
    CardModule,
    TagModule,
    ToastModule,
    ProgressBarModule,
    SliderModule,
    SelectButtonModule,
    InputTextModule,
    ImageModule
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>

    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [resizable]="true"
      [maximizable]="true"
      [dismissableMask]="true"
      [closeOnEscape]="true"
      styleClass="file-preview-dialog"
      [style]="{ width: '90vw', height: '90vh' }"
      (onHide)="onClose()"
      (visibleChange)="onVisibilityChange($event)"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-3">
          <i [class]="getFileIcon(getEffectiveMimeType())" class="text-2xl"></i>
          <div>
            <h3 class="text-lg font-semibold">{{ file?.filename }}</h3>
            <p class="text-sm text-gray-600">
              {{ formatFileSize(file?.size || 0) }} • {{ getEffectiveMimeType() }}
            </p>
          </div>
        </div>
      </ng-template>

      <div class="file-preview-content h-full">
        <p-tabs value="preview">
          <p-tablist>
            <p-tab value="preview">Preview</p-tab>
            <p-tab *ngIf="isImage(getEffectiveMimeType())" value="image-editor">Image Editor</p-tab>
            <p-tab value="details">Details</p-tab>
            <p-tab value="versions">Versions</p-tab>
          </p-tablist>

          <p-tabpanels>
            <!-- Preview Tab -->
            <p-tabpanel value="preview">
              <div class="preview-container">
                <!-- Image Preview -->
                <div *ngIf="isImage(getEffectiveMimeType())" class="image-preview">
                  <!-- Loading state -->
                  <div *ngIf="imageLoading" class="flex items-center justify-center h-96">
                    <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
                  </div>

                  <!-- Error state -->
                  <div *ngIf="imageError" class="flex items-center justify-center h-96 bg-gray-100 rounded">
                    <div class="text-center">
                      <i class="pi pi-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                      <p class="text-gray-600 mb-4">Failed to load image</p>
                      <p-button
                        label="Download File"
                        icon="pi pi-download"
                        (onClick)="downloadOriginal()">
                      </p-button>
                    </div>
                  </div>

                  <!-- Image display with Preview -->
                  <div *ngIf="!imageLoading && !imageError && imageObjectUrl" class="flex justify-center">
                    <p-image
                      [src]="imageObjectUrl"
                      [alt]="file?.filename"
                      [preview]="true"
                      [imageStyle]="{ 'max-width': '100%', 'max-height': '384px', 'object-fit': 'contain' }"
                      styleClass="rounded cursor-pointer border border-gray-200 p-2"
                      (onImageLoad)="onImageLoad()"
                      (onImageError)="onImageError($event)">
                    </p-image>
                  </div>

                  <!-- Image Actions -->
                  <div class="flex justify-center gap-2 mt-4">
                    <p-button
                      label="Download Original"
                      icon="pi pi-download"
                      styleClass="p-button-outlined"
                      (onClick)="downloadOriginal()">
                    </p-button>
                    <p-button
                      *ngIf="file?.thumbnails?.length"
                      label="View Thumbnails"
                      icon="pi pi-images"
                      styleClass="p-button-outlined"
                      (onClick)="showThumbnails = !showThumbnails">
                    </p-button>
                  </div>

                  <!-- Thumbnails -->
                  <div *ngIf="showThumbnails && file?.thumbnails?.length" class="thumbnails-grid mt-4">
                    <div class="grid grid-cols-3 gap-4">
                      <div *ngFor="let thumbnail of getThumbnailArray(file!)" class="thumbnail-item">
                        <img
                          [src]="getThumbnailUrl(file!.id, thumbnail)"
                          [alt]="'Thumbnail ' + thumbnail"
                          class="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                          (click)="viewThumbnail(file!.id, thumbnail)">
                        <p class="text-xs text-center mt-1">{{ thumbnail }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- PDF Preview -->
                <div *ngIf="isPdf(getEffectiveMimeType())" class="pdf-preview">
                  <!-- PDF Loading state -->
                  <div *ngIf="pdfLoading" class="flex items-center justify-center h-96 bg-gray-100 rounded">
                    <div class="text-center">
                      <i class="pi pi-spin pi-spinner text-2xl text-gray-400 mb-4"></i>
                      <p class="text-gray-600">Loading PDF...</p>
                    </div>
                  </div>

                  <!-- PDF Error state -->
                  <div *ngIf="pdfError" class="flex items-center justify-center h-96 bg-gray-100 rounded">
                    <div class="text-center">
                      <i class="pi pi-file-pdf text-4xl text-red-400 mb-4"></i>
                      <p class="text-gray-600 mb-4">Failed to load PDF preview</p>
                      <p-button
                        label="Download PDF"
                        icon="pi pi-download"
                        (onClick)="downloadOriginal()">
                      </p-button>
                    </div>
                  </div>

                  <!-- PDF iframe -->
                  <div *ngIf="!pdfLoading && !pdfError">
                    <iframe
                      [src]="getPdfUrl(file?.id || '')"
                      class="w-full h-96 border rounded"
                      (load)="onPdfLoad()"
                      (error)="onPdfError()">
                    </iframe>
                  </div>

                  <div class="flex justify-center mt-4">
                    <p-button
                      label="Download PDF"
                      icon="pi pi-download"
                      (onClick)="downloadOriginal()">
                    </p-button>
                  </div>
                </div>

                <!-- Video Preview -->
                <div *ngIf="isVideo(getEffectiveMimeType())" class="video-preview">
                  <video
                    [src]="getFileUrl(file?.id || '')"
                    controls
                    class="max-w-full max-h-96 mx-auto rounded">
                  </video>
                  <div class="flex justify-center mt-4">
                    <p-button
                      label="Download Video"
                      icon="pi pi-download"
                      (onClick)="downloadOriginal()">
                    </p-button>
                  </div>
                </div>

                <!-- Audio Preview -->
                <div *ngIf="isAudio(getEffectiveMimeType())" class="audio-preview">
                  <div class="flex items-center justify-center h-48 bg-gray-100 rounded">
                    <div class="text-center">
                      <i class="pi pi-volume-up text-6xl text-gray-400 mb-4"></i>
                      <audio
                        [src]="getFileUrl(file?.id || '')"
                        controls
                        class="w-full max-w-md">
                      </audio>
                    </div>
                  </div>
                </div>

                <!-- Other Files -->
                <div *ngIf="!isPreviewable(getEffectiveMimeType())" class="other-preview">
                  <div class="flex items-center justify-center h-48 bg-gray-100 rounded">
                    <div class="text-center">
                      <i [class]="getFileIcon(getEffectiveMimeType())" class="text-6xl text-gray-400 mb-4"></i>
                      <p class="text-gray-600 mb-4">Preview not available for this file type</p>
                      <p-button
                        label="Download File"
                        icon="pi pi-download"
                        (onClick)="downloadOriginal()">
                      </p-button>
                    </div>
                  </div>
                </div>
              </div>
            </p-tabpanel>

            <!-- Image Editor Tab -->
            <p-tabpanel *ngIf="isImage(getEffectiveMimeType())" value="image-editor">
              <div class="image-editor">
                <div class="grid grid-cols-1 xl:grid-cols-4 gap-4">
                  <!-- Preview Area -->
                  <div class="xl:col-span-3">
                    <div class="preview-area border border-gray-200 rounded p-4 bg-white">
                      <div class="flex justify-center">
                        <p-image
                          [src]="processedImageUrl || imageObjectUrl || ''"
                          [alt]="file?.filename"
                          [preview]="true"
                          [imageStyle]="{ 'max-width': '100%', 'max-height': '320px', 'object-fit': 'contain' }"
                          styleClass="rounded cursor-pointer"
                          (onImageLoad)="onProcessedImageLoad($event)">
                        </p-image>
                      </div>

                      <div *ngIf="isProcessing" class="flex items-center justify-center mt-4">
                        <p-progressBar
                          mode="indeterminate"
                          styleClass="w-48">
                        </p-progressBar>
                        <span class="ml-2 text-sm text-gray-600">Processing...</span>
                      </div>
                    </div>
                  </div>

                  <!-- Controls -->
                  <div class="controls-panel space-y-3">
                    <!-- Resize Controls -->
                    <div class="border border-gray-200 rounded p-3 bg-white">
                      <h3 class="text-xs font-semibold text-gray-900 mb-3">Resize</h3>
                      <div class="space-y-3">
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Width (px)</label>
                          <input
                            pInputText
                            type="number"
                            [(ngModel)]="processingOptions.width"
                            placeholder="Auto"
                            class="w-full text-sm">
                        </div>
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Height (px)</label>
                          <input
                            pInputText
                            type="number"
                            [(ngModel)]="processingOptions.height"
                            placeholder="Auto"
                            class="w-full text-sm">
                        </div>
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Resize Mode</label>
                          <p-selectButton
                            [options]="resizeModeOptions"
                            [(ngModel)]="processingOptions.resize"
                            optionLabel="label"
                            optionValue="value"
                            styleClass="w-full text-xs">
                          </p-selectButton>
                        </div>
                      </div>
                    </div>

                    <!-- Format & Quality -->
                    <div class="border border-gray-200 rounded p-3 bg-white">
                      <h3 class="text-xs font-semibold text-gray-900 mb-3">Format & Quality</h3>
                      <div class="space-y-3">
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Format</label>
                          <p-selectButton
                            [options]="formatOptions"
                            [(ngModel)]="processingOptions.format"
                            optionLabel="label"
                            optionValue="value"
                            styleClass="w-full text-xs">
                          </p-selectButton>
                        </div>
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Quality: {{ processingOptions.quality }}%</label>
                          <p-slider
                            [(ngModel)]="processingOptions.quality"
                            [min]="10"
                            [max]="100"
                            [step]="10"
                            class="w-full">
                          </p-slider>
                        </div>
                      </div>
                    </div>

                    <!-- Filters -->
                    <div class="border border-gray-200 rounded p-3 bg-white">
                      <h3 class="text-xs font-semibold text-gray-900 mb-3">Filters</h3>
                      <div class="space-y-3">
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Brightness: {{ processingOptions.filters?.brightness || 100 }}%</label>
                          <p-slider
                            [(ngModel)]="processingOptions.filters!.brightness"
                            [min]="0"
                            [max]="200"
                            [step]="10"
                            class="w-full">
                          </p-slider>
                        </div>
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Contrast: {{ processingOptions.filters?.contrast || 100 }}%</label>
                          <p-slider
                            [(ngModel)]="processingOptions.filters!.contrast"
                            [min]="0"
                            [max]="200"
                            [step]="10"
                            class="w-full">
                          </p-slider>
                        </div>
                        <div class="flex gap-3">
                          <label class="flex items-center text-xs text-gray-700">
                            <input
                              type="checkbox"
                              [(ngModel)]="processingOptions.filters!.grayscale"
                              class="mr-1">
                            Grayscale
                          </label>
                          <label class="flex items-center text-xs text-gray-700">
                            <input
                              type="checkbox"
                              [(ngModel)]="processingOptions.filters!.sepia"
                              class="mr-1">
                            Sepia
                          </label>
                        </div>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="border border-gray-200 rounded p-3 bg-white">
                      <div class="flex flex-col gap-2">
                        <p-button
                          label="Apply Changes"
                          icon="pi pi-check"
                          [loading]="isProcessing"
                          (onClick)="applyImageProcessing()"
                          styleClass="w-full p-button-sm">
                        </p-button>
                        <p-button
                          label="Reset"
                          icon="pi pi-refresh"
                          styleClass="p-button-outlined w-full p-button-sm"
                          (onClick)="resetProcessing()">
                        </p-button>
                        <p-button
                          *ngIf="processedImageUrl"
                          label="Download"
                          icon="pi pi-download"
                          styleClass="p-button-success w-full p-button-sm"
                          (onClick)="downloadProcessed()">
                        </p-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </p-tabpanel>

            <!-- Details Tab -->
            <p-tabpanel value="details">
              <div class="file-details p-4">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <!-- Basic File Information -->
                  <div class="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 class="text-base font-semibold mb-3 flex items-center">
                      <i class="pi pi-file mr-2 text-blue-600"></i>
                      File Information
                    </h4>
                    <div class="space-y-2">
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">Filename:</span>
                        <span class="col-span-2 text-gray-900 break-all">{{ file?.filename }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">Original Name:</span>
                        <span class="col-span-2 text-gray-900 break-all">{{ file?.original_filename || file?.filename }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">File Size:</span>
                        <span class="col-span-2 text-gray-900">{{ formatFileSize(file?.size || 0) }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">MIME Type:</span>
                        <span class="col-span-2 text-gray-900 font-mono text-xs">{{ file?.mime_type }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">Classification:</span>
                        <div class="col-span-2">
                          <p-tag
                            *ngIf="file?.dataClassification"
                            [value]="file!.dataClassification"
                            [severity]="getClassificationSeverity(file!.dataClassification || 'internal')"
                            styleClass="text-xs">
                          </p-tag>
                          <span *ngIf="!file?.dataClassification" class="text-gray-500 text-xs">Not classified</span>
                        </div>
                      </div>
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">Encrypted:</span>
                        <span class="col-span-2">
                          <i [class]="file?.is_encrypted ? 'pi pi-lock text-green-600' : 'pi pi-unlock text-gray-400'" class="text-sm"></i>
                          <span class="ml-2">{{ file?.is_encrypted ? 'Yes' : 'No' }}</span>
                        </span>
                      </div>
                      <div *ngIf="file?.tags?.length" class="grid grid-cols-3 gap-2 py-1.5 text-sm">
                        <span class="font-medium text-gray-700">Tags:</span>
                        <div class="col-span-2 flex flex-wrap gap-1">
                          <p-tag
                            *ngFor="let tag of file!.tags"
                            [value]="tag"
                            severity="info"
                            styleClass="text-xs">
                          </p-tag>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Storage & Technical Information -->
                  <div class="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 class="text-base font-semibold mb-3 flex items-center">
                      <i class="pi pi-database mr-2 text-green-600"></i>
                      Storage Information
                    </h4>
                    <div class="space-y-2">
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">File ID:</span>
                        <span class="col-span-2 text-gray-900 font-mono text-xs break-all">{{ file?.id }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">Provider:</span>
                        <span class="col-span-2 text-gray-900">{{ file?.provider || 'Local' }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">Storage Path:</span>
                        <span class="col-span-2 text-gray-600 text-xs font-mono break-all">{{ file?.path || 'Not available' }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">Uploaded By:</span>
                        <span class="col-span-2 text-gray-900">{{ file?.uploaded_by || 'Unknown' }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">Created:</span>
                        <span class="col-span-2 text-gray-900">{{ formatDate(file?.created_at || '') }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                        <span class="font-medium text-gray-700">Last Modified:</span>
                        <span class="col-span-2 text-gray-900">{{ formatDate(file?.updated_at || file?.created_at || '') }}</span>
                      </div>
                      <div *ngIf="file?.thumbnails?.length" class="grid grid-cols-3 gap-2 py-1.5 text-sm">
                        <span class="font-medium text-gray-700">Thumbnails:</span>
                        <span class="col-span-2 text-gray-900">{{ file!.thumbnails!.length }} available</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Custom Metadata Section -->
                <div *ngIf="file?.customMetadata && hasCustomMetadata()" class="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                  <h4 class="text-base font-semibold mb-3 flex items-center">
                    <i class="pi pi-info-circle mr-2 text-purple-600"></i>
                    Custom Metadata
                  </h4>
                  <div class="space-y-2">
                    <div *ngFor="let item of getCustomMetadataEntries()" class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                      <span class="font-medium text-gray-700 capitalize">{{ item.key }}:</span>
                      <span class="col-span-2 text-gray-900 break-all">{{ item.value }}</span>
                    </div>
                  </div>
                </div>

                <!-- Share Information -->
                <div *ngIf="file?.shareUrl" class="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                  <h4 class="text-base font-semibold mb-3 flex items-center">
                    <i class="pi pi-share-alt mr-2 text-orange-600"></i>
                    Sharing Information
                  </h4>
                  <div class="space-y-2">
                    <div class="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100 text-sm">
                      <span class="font-medium text-gray-700">Share URL:</span>
                      <div class="col-span-2 flex items-center gap-2">
                        <span class="text-gray-900 text-xs font-mono break-all">{{ file!.shareUrl }}</span>
                        <p-button
                          icon="pi pi-copy"
                          styleClass="p-button-text p-button-sm"
                          (onClick)="copyShareUrl()"
                          pTooltip="Copy to clipboard">
                        </p-button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions Section -->
                <div class="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 class="text-base font-semibold mb-3 flex items-center">
                    <i class="pi pi-cog mr-2 text-gray-600"></i>
                    File Actions
                  </h4>
                  <div class="flex flex-wrap gap-2">
                    <p-button
                      label="Download"
                      icon="pi pi-download"
                      styleClass="p-button-outlined p-button-sm"
                      (onClick)="downloadOriginal()">
                    </p-button>
                    <p-button
                      *ngIf="file?.thumbnails?.length"
                      label="Thumbnails"
                      icon="pi pi-images"
                      styleClass="p-button-outlined p-button-sm"
                      (onClick)="showThumbnails = !showThumbnails">
                    </p-button>
                    <p-button
                      label="Share"
                      icon="pi pi-share-alt"
                      styleClass="p-button-outlined p-button-sm"
                      (onClick)="openShareDialog()">
                    </p-button>
                    <p-button
                      label="Copy URL"
                      icon="pi pi-link"
                      styleClass="p-button-outlined p-button-sm"
                      (onClick)="copyFileUrl()">
                    </p-button>
                    <p-button
                      *ngIf="isImage(getEffectiveMimeType())"
                      label="Metadata"
                      icon="pi pi-info"
                      styleClass="p-button-outlined p-button-sm"
                      (onClick)="getImageMetadata()">
                    </p-button>
                  </div>
                </div>
              </div>
            </p-tabpanel>

            <!-- Versions Tab -->
            <p-tabpanel value="versions">
              <div class="file-versions">
                <div class="text-center py-12">
                  <i class="pi pi-history text-4xl text-gray-300 mb-4"></i>
                  <h3 class="text-lg font-medium text-gray-900 mb-2">File Versions</h3>
                  <p class="text-gray-600">Version history will be available soon</p>
                </div>
              </div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </div>
    </p-dialog>
  `,
  styles: [`
    ::ng-deep .file-preview-dialog .p-dialog-content {
      padding: 0;
      height: calc(100% - 60px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .file-preview-content {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    ::ng-deep .file-preview-content .p-tabs {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    ::ng-deep .file-preview-content .p-tabs .p-tabpanels {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }

    ::ng-deep .file-preview-content .p-tabs .p-tabpanel {
      height: 100%;
      overflow-y: auto;
    }

    .preview-container {
      padding: 2rem;
    }

    .image-editor {
      padding: 1rem;
      height: 100%;
      background: #f8fafc;
      overflow-y: auto;
    }

    .thumbnails-grid {
      max-height: 300px;
      overflow-y: auto;
    }

    .controls-panel {
      max-height: calc(100vh - 300px);
      overflow-y: auto;
      padding-right: 0.5rem;
    }

    /* Responsive adjustments for Image Editor */
    @media (max-width: 1024px) {
      .image-editor .grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .controls-panel {
        max-height: none;
        overflow-y: visible;
      }
    }

    ::ng-deep .p-selectbutton .p-button {
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
    }

    ::ng-deep .p-slider {
      background: #e2e8f0;
    }

    ::ng-deep .p-slider .p-slider-range {
      background: #3b82f6;
    }

    ::ng-deep .p-slider .p-slider-handle {
      background: #3b82f6;
      border: 2px solid #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    /* PrimeNG Image Preview Styles */
    ::ng-deep .p-image-preview-container {
      z-index: 9999 !important;
    }

    ::ng-deep .p-image-preview-indicator {
      opacity: 0;
      transition: opacity 0.3s ease;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    ::ng-deep .p-image:hover .p-image-preview-indicator {
      opacity: 1;
    }

    ::ng-deep .p-image-preview-indicator:before {
      content: "🔍";
      font-size: 20px;
    }

    ::ng-deep .p-image-mask {
      background: rgba(0, 0, 0, 0.9) !important;
    }

    ::ng-deep .p-image-toolbar {
      background: rgba(255, 255, 255, 0.1) !important;
      border-radius: 8px !important;
      backdrop-filter: blur(10px);
    }

    ::ng-deep .p-image-toolbar .p-link {
      color: white !important;
      width: 48px !important;
      height: 48px !important;
      border-radius: 8px !important;
      background: rgba(255, 255, 255, 0.1) !important;
      transition: all 0.3s ease;
    }

    ::ng-deep .p-image-toolbar .p-link:hover {
      background: rgba(255, 255, 255, 0.2) !important;
      transform: scale(1.1);
    }

    ::ng-deep .p-image-action.p-link {
      color: white !important;
    }

    /* Details Tab Specific Styling */
    .file-details {
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    /* Custom scrollbar for Details */
    .file-details::-webkit-scrollbar {
      width: 8px;
    }

    .file-details::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }

    .file-details::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .file-details::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    /* Custom scrollbar for Controls Panel */
    .controls-panel::-webkit-scrollbar {
      width: 6px;
    }

    .controls-panel::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 3px;
    }

    .controls-panel::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .controls-panel::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    /* Responsive grid adjustments */
    @media (max-width: 1024px) {
      .file-details .grid {
        grid-template-columns: 1fr;
      }
    }

    /* Compact select buttons for Image Editor */
    ::ng-deep .controls-panel .p-selectbutton .p-button {
      font-size: 0.75rem !important;
      padding: 0.25rem 0.5rem !important;
      border-radius: 4px !important;
    }

    /* Compact inputs for Image Editor */
    ::ng-deep .controls-panel .p-inputtext {
      font-size: 0.875rem !important;
      padding: 0.375rem 0.5rem !important;
    }
  `]
})
export class FilePreviewComponent implements OnInit, OnChanges, OnDestroy {
  private storageService = inject(StorageService);
  private messageService = inject(MessageService);
  private sanitizer = inject(DomSanitizer);

  @Input() visible = false;
  @Input() file: FileInfo | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();

  showThumbnails = false;
  isProcessing = false;
  processedImageUrl: string | null = null;
  imageLoading = false;
  imageError = false;
  pdfLoading = false;
  pdfError = false;
  imageObjectUrl: string | null = null;

  processingOptions: SimpleImageProcessingOptions = {
    quality: 80,
    format: 'jpeg',
    resize: 'fit',
    filters: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0
    }
  };

  resizeModeOptions = [
    { label: 'Fit', value: 'fit' },
    { label: 'Fill', value: 'fill' },
    { label: 'Crop', value: 'crop' }
  ];

  formatOptions = [
    { label: 'JPEG', value: 'jpeg' },
    { label: 'PNG', value: 'png' },
    { label: 'WebP', value: 'webp' }
  ];

  private subscriptions: Subscription[] = [];

  ngOnInit() {
    console.log('FilePreview ngOnInit called, file:', this.file);
    this.resetProcessing();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('FilePreview ngOnChanges called, changes:', changes);
    if (changes['file'] && changes['file'].currentValue) {
      console.log('File input changed to:', changes['file'].currentValue);
      this.initializePreview();
    }
  }

  initializePreview() {
    console.log('FilePreview initializePreview called');
    if (this.file) {
      console.log('FilePreview initializePreview - file:', this.file);
      console.log('FilePreview initializePreview - mime_type:', this.file.mime_type);
      console.log('FilePreview initializePreview - filename:', this.file.filename);

      // ตรวจสอบ mime_type หรือใช้ filename เป็น fallback
      const mimeType = this.file.mime_type || this.getMimeTypeFromFilename(this.file.filename);
      console.log('FilePreview determined mime_type:', mimeType);

      // Reset previous state
      this.imageError = false;
      this.pdfError = false;
      if (this.imageObjectUrl) {
        URL.revokeObjectURL(this.imageObjectUrl);
        this.imageObjectUrl = null;
      }

      if (this.isImage(mimeType)) {
        console.log('File is image, starting blob load...');
        this.imageLoading = true;
        this.loadImageAsBlob();
      } else {
        console.log('File is not image, mime type:', mimeType);
        this.imageLoading = false;
      }

      this.pdfLoading = this.isPdf(mimeType);

      console.log('FilePreview isImage result:', this.isImage(mimeType));
      console.log('FilePreview isPdf result:', this.isPdf(mimeType));
      console.log('FilePreview isPreviewable result:', this.isPreviewable(mimeType));
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.processedImageUrl) {
      URL.revokeObjectURL(this.processedImageUrl);
    }
    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl);
    }
  }

  async loadImageAsBlob() {
    if (!this.file) {
      console.error('loadImageAsBlob: No file provided');
      return;
    }

    console.log('Loading image as blob for file. Full file object:', this.file);
    console.log('File ID check - id:', this.file.id, 'fileId:', (this.file as any).fileId);

    try {
      console.log('Calling storageService.downloadFile...');

      // Use fileId fallback if id is not available
      const fileId = this.file.id || (this.file as any).fileId;
      console.log('Using file ID:', fileId);

      if (!fileId) {
        throw new Error('No file ID available');
      }

      const blob = await this.storageService.downloadFile(fileId).toPromise();
      console.log('Download response received, blob:', blob);

      if (blob) {
        this.imageObjectUrl = URL.createObjectURL(blob);
        console.log('Image blob URL created:', this.imageObjectUrl);
        this.imageLoading = false;
        this.imageError = false;
      } else {
        console.error('No blob received from download');
        this.imageLoading = false;
        this.imageError = true;
      }
    } catch (error) {
      console.error('Failed to load image blob:', error);
      this.imageLoading = false;
      this.imageError = true;
    }
  }

  onClose() {
    console.log('FilePreview onClose called');
    this.visible = false;
    this.visibleChange.emit(false);
    this.close.emit();
    this.resetProcessing();
  }

  onVisibilityChange(isVisible: boolean) {
    console.log('FilePreview onVisibilityChange:', isVisible);
    if (!isVisible) {
      this.onClose();
    } else if (isVisible && this.file) {
      this.initializePreview();
    }
  }

  onImageLoad() {
    this.imageLoading = false;
    this.imageError = false;
  }

  onImageError(event: Event) {
    console.error('Image load error:', event);
    this.imageLoading = false;
    this.imageError = true;
  }

  onPdfLoad() {
    this.pdfLoading = false;
    this.pdfError = false;
  }

  onPdfError() {
    console.error('PDF load error');
    this.pdfLoading = false;
    this.pdfError = true;
  }

  // File type checking
  getMimeTypeFromFilename(filename: string): string {
    if (!filename) return '';

    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',

      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',

      // Videos
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',

      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'flac': 'audio/flac',

      // Archives
      'zip': 'application/zip',
      'rar': 'application/vnd.rar',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip'
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  isImage(mimeType: string): boolean {
    return this.storageService.isImage(mimeType);
  }

  isPdf(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  isPreviewable(mimeType: string): boolean {
    return this.isImage(mimeType) || this.isPdf(mimeType) ||
      this.isVideo(mimeType) || this.isAudio(mimeType);
  }

  // URL generation (for video/audio files)
  getFileUrl(fileId: string): string {
    const url = this.storageService.getDownloadUrl(fileId);
    return url;
  }

  getPdfUrl(fileId: string): SafeResourceUrl {
    const url = this.storageService.getDownloadUrl(fileId);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getThumbnailUrl(fileId: string, thumbnail: string | any): string {
    if (typeof thumbnail === 'string') {
      return this.storageService.getThumbnailUrl(fileId, thumbnail);
    } else if (thumbnail && typeof thumbnail === 'object' && 'url' in thumbnail) {
      // For API responses with thumbnail objects, construct the full URL
      return `http://localhost:3000${thumbnail.url}`;
    }
    return '';
  }

  getThumbnailArray(file: FileInfo): string[] {
    if (!file.thumbnails) return [];
    return file.thumbnails.map(thumb => {
      if (typeof thumb === 'string') return thumb;
      if (thumb && typeof thumb === 'object' && 'url' in thumb) return thumb.url;
      return '';
    }).filter(url => url !== '');
  }

  // Actions
  async downloadOriginal() {
    if (!this.file) return;

    // Use fileId fallback if id is not available
    const fileId = this.file.id || (this.file as any).fileId;
    console.log('downloadOriginal - Using file ID:', fileId);

    if (!fileId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Download Failed',
        detail: 'File ID not available'
      });
      return;
    }

    try {
      const blob = await this.storageService.downloadFile(fileId).toPromise();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Download Started',
          detail: `Downloading ${this.file.filename}`
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

  viewThumbnail(fileId: string, thumbnail: string | any) {
    const url = this.getThumbnailUrl(fileId, thumbnail);
    if (url) {
      window.open(url, '_blank');
    }
  }

  // Image processing
  async applyImageProcessing() {
    if (!this.file || !this.isImage(this.file.mime_type)) return;

    this.isProcessing = true;

    try {
      // Convert simple options to service format
      const serviceOptions: any = {
        operations: {
          resize: this.processingOptions.width || this.processingOptions.height ? {
            width: this.processingOptions.width,
            height: this.processingOptions.height,
            fit: this.processingOptions.resize === 'fit' ? 'contain' : 'cover'
          } : undefined,
          format: this.processingOptions.format,
          quality: this.processingOptions.quality,
          modulate: this.processingOptions.filters ? {
            brightness: this.processingOptions.filters.brightness ? this.processingOptions.filters.brightness / 100 : undefined,
            saturation: this.processingOptions.filters.contrast ? this.processingOptions.filters.contrast / 100 : undefined
          } : undefined,
          grayscale: this.processingOptions.filters?.grayscale,
          blur: this.processingOptions.filters?.blur
        }
      };

      // Use fileId fallback if id is not available
      const fileId = this.file.id || (this.file as any).fileId;
      if (!fileId) {
        throw new Error('File ID not available for image processing');
      }

      const response = await this.storageService.processImage(fileId, serviceOptions).toPromise();

      if (response?.success && response.data.processedFile) {
        // Create blob URL for processed image
        const blob = new Blob([response.data.processedFile], { type: this.processingOptions.format });

        if (this.processedImageUrl) {
          URL.revokeObjectURL(this.processedImageUrl);
        }

        this.processedImageUrl = URL.createObjectURL(blob);

        this.messageService.add({
          severity: 'success',
          summary: 'Processing Complete',
          detail: 'Image processing applied successfully'
        });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Processing Failed',
        detail: 'Failed to process image'
      });
    } finally {
      this.isProcessing = false;
    }
  }

  resetProcessing() {
    this.processingOptions = {
      quality: 80,
      format: 'jpeg',
      resize: 'fit',
      filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0
      }
    };

    if (this.processedImageUrl) {
      URL.revokeObjectURL(this.processedImageUrl);
      this.processedImageUrl = null;
    }
  }

  // New methods for enhanced Details tab
  hasCustomMetadata(): boolean {
    return this.file?.customMetadata && Object.keys(this.file.customMetadata).length > 0;
  }

  getCustomMetadataEntries(): Array<{ key: string, value: any }> {
    if (!this.file?.customMetadata) return [];
    return Object.entries(this.file.customMetadata).map(([key, value]) => ({
      key: key.replace(/([A-Z])/g, ' $1').trim(), // Add spaces before capital letters
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
  }

  async copyShareUrl() {
    if (!this.file?.shareUrl) return;

    try {
      await navigator.clipboard.writeText(this.file.shareUrl);
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Share URL copied to clipboard'
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = this.file.shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Share URL copied to clipboard'
      });
    }
  }

  async copyFileUrl() {
    if (!this.file) return;

    const fileId = this.file.id || (this.file as any).fileId;
    if (!fileId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'File ID not available'
      });
      return;
    }

    const url = this.storageService.getDownloadUrl(fileId);

    try {
      await navigator.clipboard.writeText(url);
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'File URL copied to clipboard'
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'File URL copied to clipboard'
      });
    }
  }

  openShareDialog() {
    // TODO: Implement share dialog
    this.messageService.add({
      severity: 'info',
      summary: 'Feature Coming Soon',
      detail: 'File sharing dialog will be implemented soon'
    });
  }

  async getImageMetadata() {
    if (!this.file || !this.isImage(this.file.mime_type)) return;

    const fileId = this.file.id || (this.file as any).fileId;
    if (!fileId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'File ID not available'
      });
      return;
    }

    try {
      const metadata = await this.storageService.getImageMetadata(fileId).toPromise();

      // Add metadata to custom metadata for display
      if (metadata && this.file) {
        this.file.customMetadata = {
          ...this.file.customMetadata,
          imageMetadata: metadata
        };
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Metadata Retrieved',
        detail: 'Image metadata has been loaded'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Failed',
        detail: 'Failed to retrieve image metadata'
      });
    }
  }

  async downloadProcessed() {
    if (!this.processedImageUrl || !this.file) return;

    try {
      const response = await fetch(this.processedImageUrl);
      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${this.file.filename}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.messageService.add({
        severity: 'success',
        summary: 'Download Started',
        detail: 'Downloading processed image'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Download Failed',
        detail: 'Failed to download processed image'
      });
    }
  }

  // Utility methods
  getEffectiveMimeType(): string {
    if (!this.file) return '';
    return this.file.mime_type || this.getMimeTypeFromFilename(this.file.filename);
  }

  formatFileSize(bytes: number): string {
    return this.storageService.formatFileSize(bytes);
  }

  getFileIcon(mimeType: string): string {
    return this.storageService.getFileIcon(mimeType);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getClassificationSeverity(classification: string): 'success' | 'info' | 'warning' | 'danger' {
    const severities: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      'public': 'success',
      'internal': 'info',
      'confidential': 'warning',
      'restricted': 'danger'
    };
    return severities[classification] || 'info';
  }

  onProcessedImageLoad(event: Event) {
    // Image loaded successfully
  }
}
