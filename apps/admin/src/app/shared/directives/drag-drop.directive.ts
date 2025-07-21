import { Directive, EventEmitter, HostListener, Output, Input, ElementRef } from '@angular/core';

@Directive({
  selector: '[appDragDrop]',
  standalone: true
})
export class DragDropDirective {
  @Output() filesDropped = new EventEmitter<FileList>();
  @Output() dragEnter = new EventEmitter<DragEvent>();
  @Output() dragLeave = new EventEmitter<DragEvent>();
  @Output() dragOver = new EventEmitter<DragEvent>();

  @Input() allowedTypes: string[] = []; // e.g., ['image/*', 'application/pdf']
  @Input() maxFileSize: number = 100 * 1024 * 1024; // 100MB default
  @Input() maxFiles: number = 10; // Maximum number of files

  constructor(private el: ElementRef) {}

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragEnter.emit(event);
    this.addDragClass();
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.emit(event);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    // Only remove class if leaving the main element, not child elements
    const rect = this.el.nativeElement.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX >= rect.right ||
      event.clientY < rect.top ||
      event.clientY >= rect.bottom
    ) {
      this.dragLeave.emit(event);
      this.removeDragClass();
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.removeDragClass();

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const validFiles = this.validateFiles(files);
      if (validFiles.length > 0) {
        const fileList = this.createFileList(validFiles);
        this.filesDropped.emit(fileList);
      }
    }
  }

  private validateFiles(files: FileList): File[] {
    const validFiles: File[] = [];

    for (let i = 0; i < files.length && validFiles.length < this.maxFiles; i++) {
      const file = files[i];
      
      // Check file size
      if (file.size > this.maxFileSize) {
        console.warn(`File ${file.name} exceeds maximum size of ${this.formatFileSize(this.maxFileSize)}`);
        continue;
      }

      // Check file type if restrictions are set
      if (this.allowedTypes.length > 0) {
        const isAllowed = this.allowedTypes.some(type => {
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.slice(0, -1));
          }
          return file.type === type;
        });

        if (!isAllowed) {
          console.warn(`File ${file.name} type ${file.type} is not allowed`);
          continue;
        }
      }

      validFiles.push(file);
    }

    return validFiles;
  }

  private createFileList(files: File[]): FileList {
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));
    return dt.files;
  }

  private addDragClass() {
    this.el.nativeElement.classList.add('drag-over');
  }

  private removeDragClass() {
    this.el.nativeElement.classList.remove('drag-over');
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}