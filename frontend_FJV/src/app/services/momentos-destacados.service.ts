import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  MomentosDestacadosConfig,
  MomentosDestacadosForm,
  MomentoDestacadoImage,
  MomentoDestacadoImageUpload
} from '../models/momentos-destacados.model';
import { environment } from '../../environments/environment';

interface BackendResponse<T> {
  status: string;
  msg: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class MomentosDestacadosService {
  private apiUrl = `${environment.apiUrl}/momentos-destacados`;
  private readonly MAX_IMAGES = 6;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la configuración actual de momentos destacados
   */
  getMomentosDestacadosConfig(): Observable<BackendResponse<MomentosDestacadosConfig>> {
    return this.http.get<BackendResponse<MomentosDestacadosConfig>>(this.apiUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Actualiza la configuración de momentos destacados
   */
  updateMomentosDestacadosConfig(config: MomentosDestacadosForm): Observable<BackendResponse<MomentosDestacadosConfig>> {
    // Validar imágenes antes de enviar
    const validationError = this.validateImages(config.imagenes);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    // Preparar FormData para envío
    const formData = new FormData();
    formData.append('titulo', config.titulo);
    formData.append('subTitulo', config.subTitulo);

    // Agregar nuevas imágenes
    config.imagenes.forEach((file, index) => {
      formData.append('imagenes', file);
    });

    // Agregar metadata de imágenes
    if (config.metadataImagenes) {
      formData.append('metadataImagenes', JSON.stringify(config.metadataImagenes));
    }

    // Agregar imágenes para borrar
    if (config.imagenesParaBorrar && config.imagenesParaBorrar.length > 0) {
      formData.append('imagenesParaBorrar', JSON.stringify(config.imagenesParaBorrar));
    }

    return this.http.put<BackendResponse<MomentosDestacadosConfig>>(this.apiUrl, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Elimina una imagen específica
   */
  removeMomentoDestacadoImage(imageId: number): Observable<BackendResponse<any>> {
    return this.http.delete<BackendResponse<any>>(`${this.apiUrl}/images/${imageId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Reordena las imágenes
   */
  reorderImages(imageOrders: { idImagen: number; orden: number }[]): Observable<BackendResponse<any>> {
    return this.http.put<BackendResponse<any>>(`${this.apiUrl}/reorder`, { imageOrders })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Valida las imágenes antes de subirlas
   */
  validateImages(images: File[]): string | null {
    if (!images || images.length === 0) {
      return null; // No hay imágenes, no es error
    }

    if (images.length > this.MAX_IMAGES) {
      return `Solo se permiten máximo ${this.MAX_IMAGES} imágenes para momentos destacados`;
    }

    for (const file of images) {
      if (file.size > this.MAX_FILE_SIZE) {
        return `La imagen "${file.name}" excede el tamaño máximo de 5MB`;
      }

      if (!this.ALLOWED_TYPES.includes(file.type)) {
        return `La imagen "${file.name}" no tiene un formato válido. Solo se permiten JPG, PNG y WebP`;
      }
    }

    return null;
  }

  /**
   * Obtiene información sobre límites y validaciones
   */
  getImageLimits() {
    return {
      maxImages: this.MAX_IMAGES,
      maxFileSize: this.MAX_FILE_SIZE,
      maxFileSizeMB: this.MAX_FILE_SIZE / (1024 * 1024),
      allowedTypes: this.ALLOWED_TYPES,
      allowedExtensions: ['jpg', 'jpeg', 'png', 'webp']
    };
  }

  /**
   * Formatea el tamaño de archivo para mostrar
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Manejo de errores
   */
  private handleError(error: any): Observable<never> {
    console.error('Error en MomentosDestacadosService:', error);
    let errorMessage = 'Error desconocido';

    if (error.error?.msg) {
      errorMessage = error.error.msg;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}
