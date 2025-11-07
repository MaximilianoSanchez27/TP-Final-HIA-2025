import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UploadService } from '../../../services/upload.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.css']
})
export class ImageUploadComponent {
  @Input() currentImageUrl: string = '';
  @Output() imageUploaded = new EventEmitter<string>();
  @Output() imageRemoved = new EventEmitter<void>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isUploading = false;
  uploadProgress = 0;
  errorMessage: string = '';
  selectedFile: File | null = null;
  imagePreviewUrl: string = '';

  constructor(private uploadService: UploadService) {}

  ngOnChanges(): void {
    // Si recibimos una URL de imagen, actualizar la vista previa
    if (this.currentImageUrl && this.uploadService.isValidUrl(this.currentImageUrl)) {
      this.imagePreviewUrl = this.currentImageUrl;
    } else {
      this.imagePreviewUrl = '';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'El archivo seleccionado debe ser una imagen.';
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'La imagen no debe exceder los 5MB.';
        return;
      }

      this.selectedFile = file;
      this.errorMessage = '';

      // Mostrar vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      // Iniciar la carga automáticamente
      this.uploadImage();
    }
  }

  // Método para abrir el selector de archivos
  openFileSelector(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  uploadImage(): void {
    if (!this.selectedFile) {
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';

    // Mostrar progreso simulado
    this.simulateProgress();

    this.uploadService.uploadImage(this.selectedFile).subscribe({
      next: (response) => {
        this.isUploading = false;
        this.uploadProgress = 100;

        // Si tenemos URL en la respuesta, emitirla
        if (response && response.url) {
          this.imageUploaded.emit(response.url);
          this.selectedFile = null;
        } else {
          this.errorMessage = 'No se pudo obtener la URL de la imagen';
          console.error('Respuesta sin URL:', response);
        }
      },
      error: (error) => {
        this.isUploading = false;
        this.uploadProgress = 0;
        this.errorMessage = error.message || 'Error al subir la imagen';
        console.error('Error en la subida de imagen:', error);
      }
    });
  }

  // Simular progreso de carga para mejor UX
  private simulateProgress(): void {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      if (progress <= 90) {
        this.uploadProgress = progress;
      }

      if (progress >= 100 || !this.isUploading) {
        clearInterval(interval);
      }
    }, 100);
  }

  removeImage(): void {
    // Limpiar la imagen actual
    this.currentImageUrl = '';
    this.imagePreviewUrl = '';
    this.selectedFile = null;
    this.imageRemoved.emit();
  }

  cancelUpload(): void {
    // Solo para mostrar un mensaje - en realidad no podemos cancelar la carga una vez iniciada
    if (this.isUploading) {
      this.errorMessage = 'La carga ya está en progreso y no se puede cancelar';
    }
  }
}
