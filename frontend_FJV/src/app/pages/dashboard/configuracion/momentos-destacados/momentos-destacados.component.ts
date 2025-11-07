import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { MomentosDestacadosService } from '../../../../services/momentos-destacados.service';
import { MomentosDestacadosConfig, MomentoDestacadoImage, MomentosDestacadosForm } from '../../../../models/momentos-destacados.model';

@Component({
  selector: 'app-momentos-destacados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './momentos-destacados.component.html',
  styleUrls: ['./momentos-destacados.component.css']
})
export class MomentosDestacadosComponent implements OnInit, OnDestroy {
  momentosForm!: FormGroup;

  // Estados del componente
  isLoading = true;
  isSaving = false;
  isDragOver = false;

  // Imágenes y archivos
  currentImages: MomentoDestacadoImage[] = [];
  selectedFiles: File[] = [];

  // Cache para URLs de preview
  private filePreviewCache = new Map<File, string>();

  // Drag & Drop
  draggedIndex: number | null = null;

  // Mensajes
  successMessage = '';
  errorMessage = '';
  validationErrors: string[] = [];

  // Subscripciones
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private location: Location,
    private momentosDestacadosService: MomentosDestacadosService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadCurrentConfig();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearFilePreviewCache();
  }

  /**
   * Inicializa el formulario reactivo
   */
  private initForm(): void {
    this.momentosForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(100)]],
      subTitulo: ['', [Validators.required, Validators.maxLength(300)]],
      activo: [true]
    });
  }

  /**
   * Carga la configuración actual de momentos destacados
   */
  private loadCurrentConfig(): void {
    this.isLoading = true;
    this.momentosDestacadosService.getMomentosDestacadosConfig().subscribe({
      next: (response) => {
        console.log('✅ Dashboard: Respuesta recibida:', response);
        if (response && response.data) {
          const config = response.data;
          this.currentImages = config.imagenes || [];
          this.momentosForm.patchValue({
            titulo: config.titulo || '',
            subTitulo: config.subTitulo || '',
            activo: config.activo !== undefined ? config.activo : true
          });
        } else {
          console.warn('⚠️ Dashboard: No hay data en la respuesta');
          this.currentImages = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Dashboard: Error cargando configuración:', error);
        this.errorMessage = 'Error al cargar la configuración actual';
        this.isLoading = false;
      }
    });
  }

  /**
   * Maneja el evento de drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Maneja el evento de drag leave
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Maneja el evento de drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files) {
      this.processFiles(files);
    }
  }

  /**
   * Maneja la selección de archivos
   */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(input.files);
    }
  }

  /**
   * Procesa los archivos seleccionados
   */
  private processFiles(files: FileList): void {
    // Convertir FileList a Array
    const filesArray = Array.from(files);

    // Validar archivos
    const validationError = this.momentosDestacadosService.validateImages(filesArray);

    if (validationError) {
      this.validationErrors = [validationError];
      return;
    }

    this.validationErrors = [];

    // Agregar archivos válidos
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!this.selectedFiles.some(f => f.name === file.name)) {
        this.selectedFiles.push(file);
      }
    }
  }

  /**
   * Obtiene preview de archivo
   */
  getFilePreview(file: File): string {
    if (this.filePreviewCache.has(file)) {
      return this.filePreviewCache.get(file)!;
    }

    const url = URL.createObjectURL(file);
    this.filePreviewCache.set(file, url);
    return url;
  }

  /**
   * Elimina un archivo seleccionado
   */
  removeSelectedFile(index: number): void {
    const file = this.selectedFiles[index];

    // Limpiar del cache
    if (this.filePreviewCache.has(file)) {
      URL.revokeObjectURL(this.filePreviewCache.get(file)!);
      this.filePreviewCache.delete(file);
    }

    this.selectedFiles.splice(index, 1);
  }

  /**
   * Limpia archivos seleccionados
   */
  private clearSelectedFiles(): void {
    this.clearFilePreviewCache();
    this.selectedFiles = [];
  }

  /**
   * Limpia cache de previews
   */
  private clearFilePreviewCache(): void {
    this.filePreviewCache.forEach(url => URL.revokeObjectURL(url));
    this.filePreviewCache.clear();
  }

  /**
   * Elimina una imagen actual
   */
  removeImage(index: number): void {
    const imageToRemove = this.currentImages[index];

    // Si la imagen tiene un ID (existe en el backend), eliminarla del servidor
    if (imageToRemove.idImagen) {
      this.isSaving = true;
      this.errorMessage = '';

      const sub = this.momentosDestacadosService.removeMomentoDestacadoImage(imageToRemove.idImagen).subscribe({
        next: (response) => {
          console.log('✅ Imagen eliminada del backend:', response);
          // Recargar la configuración completa
          this.loadCurrentConfig();
          this.successMessage = 'Imagen eliminada exitosamente';
          this.isSaving = false;

          // Limpiar mensaje después de 3 segundos
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Error eliminando imagen:', error);
          this.errorMessage = error?.message || 'Error al eliminar la imagen';
          this.isSaving = false;

          // Limpiar mensaje después de 5 segundos
          setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      });

      this.subscriptions.add(sub);
    } else {
      // Si es una imagen local (no guardada aún), solo removerla del array
      this.currentImages.splice(index, 1);

      // Actualizar orden de las imágenes restantes
      this.currentImages.forEach((img, idx) => {
        img.orden = idx + 1;
      });
    }
  }

  /**
   * Obtiene imágenes para preview
   */
  getPreviewImages(): MomentoDestacadoImage[] {
    if (this.selectedFiles.length > 0) {
      // Mostrar preview de nuevas imágenes seleccionadas
      return this.selectedFiles.map((file, index) => ({
        idImagen: 0,
        url: this.getFilePreview(file),
        alt: `Momento destacado ${index + 1}`,
        titulo: `Momento destacado ${index + 1}`,
        orden: index + 1,
        activo: true,
        fechaCreacion: new Date()
      }));
    }

    // Mostrar solo imágenes actuales reales, sin imagen por defecto
    return this.currentImages.length > 0 ? this.currentImages : [];
  }

  /**
   * Drag & Drop para reordenar imágenes actuales
   */
  onImageDragStart(event: DragEvent, index: number): void {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onImageDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();

    if (this.draggedIndex !== null && this.draggedIndex !== dropIndex) {
      // Reordenar imágenes
      const draggedImage = this.currentImages[this.draggedIndex];
      this.currentImages.splice(this.draggedIndex, 1);
      this.currentImages.splice(dropIndex, 0, draggedImage);

      // Actualizar orden
      this.currentImages.forEach((img, index) => {
        img.orden = index + 1;
      });

      // Guardar nuevo orden en el backend
      this.saveImageOrder();
    }

    this.draggedIndex = null;
  }

  /**
   * Guarda el orden de las imágenes
   */
  private saveImageOrder(): void {
    const orderData = this.currentImages.map((img, index) => ({
      idImagen: img.idImagen,
      orden: index + 1
    }));

    const sub = this.momentosDestacadosService.reorderImages(orderData).subscribe({
      next: () => {
        this.successMessage = 'Orden actualizado exitosamente';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error reordenando imágenes:', error);
        this.errorMessage = 'Error al actualizar el orden';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });

    this.subscriptions.add(sub);
  }

  /**
   * Envía el formulario
   */
  onSubmit(): void {
    if (this.momentosForm.invalid) {
      this.errorMessage = 'Por favor, completa todos los campos correctamente';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData: MomentosDestacadosForm = {
      titulo: this.momentosForm.get('titulo')?.value,
      subTitulo: this.momentosForm.get('subTitulo')?.value,
      imagenes: this.selectedFiles,
      imagenesActuales: this.currentImages,
      metadataImagenes: this.selectedFiles.map((file, index) => ({
        titulo: `Momento destacado ${index + 1}`,
        alt: `Momento destacado ${index + 1}`,
        descripcion: ''
      }))
    };

    const sub = this.momentosDestacadosService.updateMomentosDestacadosConfig(formData).subscribe({
      next: (response: any) => {
        this.handleSuccessResponse(response, 'Momentos destacados guardados exitosamente');
      },
      error: (error) => {
        this.handleErrorResponse(error);
      }
    });

    this.subscriptions.add(sub);
  }

  /**
   * Maneja respuesta exitosa
   */
  private handleSuccessResponse(response: any, message: string): void {
    this.successMessage = message;

    // Verificar que la respuesta tenga la estructura correcta
    if (response && response.data && response.data.imagenes) {
      this.currentImages = [...response.data.imagenes];
    } else {
      // Si no hay data, recargar la configuración
      this.loadCurrentConfig();
      return;
    }

    // Limpiar archivos seleccionados y cache
    this.clearSelectedFiles();

    this.isSaving = false;

    // Opcional: redirigir después de un delay
    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 2000);
  }

  /**
   * Maneja respuesta de error
   */
  private handleErrorResponse(error: any): void {
    console.error('Error:', error);
    this.errorMessage = error?.message || 'Error al guardar la configuración';
    this.isSaving = false;
  }

  /**
   * Vuelve al dashboard
   */
  goBack(): void {
    this.location.back();
  }
}
