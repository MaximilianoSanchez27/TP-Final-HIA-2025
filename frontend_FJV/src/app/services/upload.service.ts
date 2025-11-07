import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  status: string;
  url: string;
  thumb?: string;
  medium?: string;
  delete_url?: string;
  title?: string;
  width?: number;
  height?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = `${environment.apiUrl}/noticias`;

  constructor(private http: HttpClient) { }

  /**
   * Sube una imagen al servidor y este la enviará a ImgBB
   * @param image - El archivo de imagen a subir
   * @returns Un observable con la respuesta que incluye las URLs de la imagen
   */
  uploadImage(image: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('imagen', image);

    return this.http.post<any>(`${this.apiUrl}/upload-image`, formData)
      .pipe(
        map(response => {
          console.log('Respuesta del servidor de carga de imágenes:', response);

          // Estructura esperada: { status: '1', msg: 'Imagen subida exitosamente', imagen: { url: '...' } }
          if (response && response.status === '1' && response.imagen && response.imagen.url) {
            return {
              status: 'success',
              url: response.imagen.url
            };
          }
          // Estructura alternativa: { status: 'success', data: { url: '...' } }
          else if (response && response.status === 'success' && response.data && response.data.url) {
            return response.data;
          }
          // Estructura directa: { url: '...' }
          else if (response && response.url) {
            return response;
          }

          throw new Error('No se pudo determinar la URL de la imagen en la respuesta');
        }),
        catchError(error => {
          console.error('Error al subir imagen:', error);
          return throwError(() => new Error('Error al subir la imagen: no se pudo obtener la URL'));
        })
      );
  }

  /**
   * Elimina una imagen de ImgBB usando su delete_url
   * @param deleteUrl - URL de eliminación proporcionada por ImgBB
   */
  deleteImage(deleteUrl: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/delete-image`, { deleteUrl })
      .pipe(
        catchError(error => {
          console.error('Error al eliminar imagen:', error);
          return throwError(() => new Error(error.error?.msg || 'Error al eliminar la imagen'));
        })
      );
  }

  /**
   * Comprueba si una URL es válida
   * @param url - La URL a validar
   */
  isValidUrl(url: string): boolean {
    if (!url) return false;

    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }
}
