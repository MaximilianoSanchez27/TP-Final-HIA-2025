import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

import { HeroConfig, HeroImage, HeroConfigForm } from '../models/hero-config.model';

interface BackendResponse<T> {
  status: string;
  msg: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class HeroConfigService {
  private apiUrl = `${environment.apiUrl}/hero-config`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la configuración actual del hero
   */
  getHeroConfig(): Observable<HeroConfig> {
    return this.http.get<BackendResponse<HeroConfig>>(this.apiUrl).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error obteniendo configuración del hero:', error);
        // Devolver configuración por defecto
        return of({
          eslogan: 'Pasión por el Voleibol',
          subTexto: 'Promoviendo el voleibol en la provincia de Jujuy desde sus bases',
          imagenes: [{
            idImagen: 0,
            url: 'assets/images/volleyball-hero.png',
            alt: 'Voleibol en acción',
            orden: 1,
            activo: true,
            fechaCreacion: new Date().toISOString()
          }],
          activo: true,
          idConfig: 0,
          fechaCreacion: new Date().toISOString(),
          fechaActualizacion: new Date().toISOString()
        });
      })
    );
  }

  /**
   * Sube múltiples imágenes a ImgBB a través del backend
   */
  private uploadImagesToImgBB(images: File[]): Observable<HeroImage[]> {
    if (images.length === 0) return of([]);

    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append('images', image);
    });

    return this.http.post<BackendResponse<HeroImage[]>>(`${this.apiUrl}/upload`, formData)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error uploading images via backend:', error);
          throw error;
        })
      );
  }

  /**
   * Actualiza solo el eslogan y subtexto (sin tocar las imágenes)
   */
  updateHeroConfig(eslogan: string, subTexto: string): Observable<HeroConfig> {
    const configData = {
      eslogan,
      subTexto
    };

    return this.http.put<BackendResponse<HeroConfig>>(this.apiUrl, configData).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error actualizando configuración del hero:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Agrega nuevas imágenes al carousel sin reemplazar las existentes
   */
  addImages(images: File[]): Observable<HeroConfig> {
    if (images.length === 0) {
      return throwError(() => new Error('No hay imágenes para agregar'));
    }

    // Subir imágenes a ImgBB a través del backend
    return this.uploadImagesToImgBB(images).pipe(
      switchMap(imagenesSubidas => {
        // Agregar las nuevas imágenes usando el endpoint específico
        return this.http.post<BackendResponse<HeroConfig>>(`${this.apiUrl}/add-images`, {
          imagenes: imagenesSubidas
        });
      }),
      map(response => response.data),
      catchError(error => {
        console.error('Error agregando imágenes:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina una imagen específica
   */
  removeHeroImage(imageId: number): Observable<any> {
    return this.http.delete<BackendResponse<any>>(`${this.apiUrl}/images/${imageId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error eliminando imagen:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Reordena las imágenes del carousel
   */
  reorderImages(imageIds: number[]): Observable<any> {
    return this.http.put<BackendResponse<any>>(`${this.apiUrl}/reorder`, { imageIds }).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error reordenando imágenes:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Valida archivos de imagen antes de subir
   */
  validateImages(files: FileList): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxFiles = 5;
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    // Validar cantidad de archivos
    if (files.length > maxFiles) {
      errors.push(`Máximo ${maxFiles} imágenes permitidas`);
    }

    // Validar cada archivo
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validar tipo
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Formato no válido. Use JPG, PNG o WebP`);
      }

      // Validar tamaño
      if (file.size > maxSize) {
        errors.push(`${file.name}: Archivo demasiado grande (máx 5MB)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
