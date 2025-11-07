import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { HeroConfigService } from '../../../../services/hero-config.service';
import { HeroConfig, HeroImage } from '../../../../models/hero-config.model';

@Component({
  selector: 'app-hero-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hero-config.component.html',
  styleUrls: ['./hero-config.component.css']
})
export class HeroConfigComponent implements OnInit, OnDestroy {
  heroForm!: FormGroup;

  // Estados del componente
  isLoading = true;
  isSaving = false;
  isDragOver = false;

  // Imágenes y archivos
  currentImages: HeroImage[] = [];
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
    private heroConfigService: HeroConfigService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadHeroConfig();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    // Limpiar todas las URLs del cache
    this.filePreviewCache.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.filePreviewCache.clear();
  }

  /**
   * Inicializa el formulario reactivo
   */
  private initForm(): void {
    this.heroForm = this.fb.group({
      eslogan: ['', [Validators.required, Validators.maxLength(100)]],
      subTexto: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  /**
   * Carga la configuración actual del hero
   */
  private loadHeroConfig(): void {
    this.isLoading = true;

    const sub = this.heroConfigService.getHeroConfig().subscribe({
      next: (config: HeroConfig) => {
        this.heroForm.patchValue({
          eslogan: config.eslogan,
          subTexto: config.subTexto
        });
        this.currentImages = [...config.imagenes];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando configuración:', error);
        this.errorMessage = 'Error al cargar la configuración actual';
        this.isLoading = false;
      }
    });

    this.subscriptions.add(sub);
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
    // Validar archivos
    const validation = this.heroConfigService.validateImages(files);

    if (!validation.valid) {
      this.validationErrors = validation.errors;
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
   * Elimina un archivo seleccionado
   */
  removeSelectedFile(index: number): void {
    const file = this.selectedFiles[index];

    // Limpiar URL del cache
    if (this.filePreviewCache.has(file)) {
      const url = this.filePreviewCache.get(file)!;
      URL.revokeObjectURL(url);
      this.filePreviewCache.delete(file);
    }

    this.selectedFiles.splice(index, 1);
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

      const sub = this.heroConfigService.removeHeroImage(imageToRemove.idImagen).subscribe({
        next: (updatedConfig: HeroConfig) => {
          // Actualizar las imágenes con la respuesta del backend
          this.currentImages = [...updatedConfig.imagenes];
          this.successMessage = 'Imagen eliminada exitosamente';
          this.isSaving = false;

          // Limpiar mensaje después de 3 segundos
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error eliminando imagen:', error);
          this.errorMessage = error?.error?.msg || 'Error al eliminar la imagen';
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
   * Genera preview de archivo
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
   * Formatea el tamaño del archivo
   */
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Obtiene imágenes para preview
   */
  getPreviewImages(): HeroImage[] {
    if (this.selectedFiles.length > 0) {
      // Mostrar preview de nuevas imágenes seleccionadas
      return this.selectedFiles.map((file, index) => ({
        url: this.getFilePreview(file),
        alt: `Imagen ${index + 1}`,
        orden: index + 1,
        activo: true
      }));
    }

    // Mostrar imágenes actuales si no hay nuevas seleccionadas
    return this.currentImages.length > 0 ? this.currentImages : [{
      url: 'assets/images/volleyball-hero.png',
      alt: 'Imagen por defecto',
      orden: 1,
      activo: true
    }];
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

  onImageDragEnd(event: DragEvent): void {
    this.draggedIndex = null;
  }

  onImageDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
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
    }

    this.draggedIndex = null;
  }

  /**
   * Envía el formulario
   */
  onSubmit(): void {
    if (this.heroForm.invalid) {
      this.errorMessage = 'Por favor, completa todos los campos correctamente';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const eslogan = this.heroForm.get('eslogan')?.value;
    const subTexto = this.heroForm.get('subTexto')?.value;

    // Siempre actualizar el eslogan y subtexto primero
    const updateText$ = this.heroConfigService.updateHeroConfig(eslogan, subTexto);

    // Si hay nuevas imágenes, agregarlas después
    if (this.selectedFiles.length > 0) {
      const sub = updateText$.pipe(
        switchMap(() => this.heroConfigService.addImages(this.selectedFiles))
      ).subscribe({
        next: (config: HeroConfig) => {
          this.handleSuccessResponse(config, 'Configuración e imágenes guardadas exitosamente');
        },
        error: (error) => {
          this.handleErrorResponse(error);
        }
      });
      this.subscriptions.add(sub);
    } else {
      // Solo actualizar texto
      const sub = updateText$.subscribe({
        next: (config: HeroConfig) => {
          this.handleSuccessResponse(config, 'Configuración guardada exitosamente');
        },
        error: (error) => {
          this.handleErrorResponse(error);
        }
      });
      this.subscriptions.add(sub);
    }
  }

  /**
   * Maneja respuesta exitosa
   */
  private handleSuccessResponse(config: HeroConfig, message: string): void {
    this.successMessage = message;
    this.currentImages = [...config.imagenes];

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
    this.errorMessage = error?.error?.msg || 'Error al guardar la configuración';
    this.isSaving = false;
  }

  /**
   * Limpia archivos seleccionados y cache
   */
  private clearSelectedFiles(): void {
    this.selectedFiles.forEach(file => {
      if (this.filePreviewCache.has(file)) {
        const url = this.filePreviewCache.get(file)!;
        URL.revokeObjectURL(url);
        this.filePreviewCache.delete(file);
      }
    });
    this.selectedFiles = [];
  }

  /**
   * Vuelve al dashboard
   */
  goBack(): void {
    this.location.back();
  }
}
