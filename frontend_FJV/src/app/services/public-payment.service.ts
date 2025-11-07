import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Cobro } from './cobro.service';
import { map } from 'rxjs/operators';

export interface PublicPaymentLink {
  id: string;
  cobroId: number;
  slug: string; // URL amigable basada en el concepto
  isActive: boolean;
  expirationDate?: Date;
  createdAt: Date;
  accessCount: number;
}

export interface PublicPaymentData {
  cobro: Cobro;
  paymentLink: PublicPaymentLink;
  publicUrl: string;
}

// Interfaces para las respuestas del backend
interface BackendResponse<T> {
  status: string;
  msg: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class PublicPaymentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Generar enlace de pago público para un cobro
   */
  generatePublicPaymentLink(cobroId: number): Observable<PublicPaymentData> {
    return this.http.post<BackendResponse<PublicPaymentData>>(`${this.apiUrl}/public-payment/generate`, {
      cobroId
    }).pipe(
      map(response => response.data)
    );
  }

  /**
   * Obtener información de pago público por slug
   */
  getPublicPaymentBySlug(slug: string): Observable<PublicPaymentData> {
    return this.http.get<BackendResponse<PublicPaymentData>>(`${this.apiUrl}/public-payment/cobro/${slug}`)
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Activar/desactivar enlace público
   */
  togglePublicPaymentLink(linkId: string, isActive: boolean): Observable<{status: string, message: string}> {
    return this.http.patch<BackendResponse<any>>(`${this.apiUrl}/public-payment/link/${linkId}/toggle`, {
      isActive
    }).pipe(
      map(response => ({ status: response.status, message: response.msg }))
    );
  }

  /**
   * Obtener todos los enlaces públicos de un cobro
   */
  getPublicPaymentLinksForCobro(cobroId: number): Observable<PublicPaymentLink[]> {
    return this.http.get<BackendResponse<PublicPaymentLink[]>>(`${this.apiUrl}/public-payment/cobro/${cobroId}/links`)
      .pipe(
        map(response => response.data || []) // Asegurar que retorne un array
      );
  }

  /**
   * Eliminar enlace público
   */
  deletePublicPaymentLink(linkId: string): Observable<{status: string, message: string}> {
    return this.http.delete<BackendResponse<any>>(`${this.apiUrl}/public-payment/link/${linkId}`)
      .pipe(
        map(response => ({ status: response.status, message: response.msg }))
      );
  }

  /**
   * Registrar acceso a enlace público (analytics)
   */
  registerAccess(slug: string, userAgent?: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/public-payment/cobro/${slug}/access`, {
      userAgent: userAgent || navigator.userAgent,
      timestamp: new Date()
    });
  }

  /**
   * Generar slug amigable basado en el concepto
   */
  generateSlugFromConcept(concepto: string, cobroId: number): string {
    // Limpiar y convertir el concepto a una URL amigable
    let slug = concepto
      .toLowerCase()
      .normalize('NFD') // Descomponer caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '-') // Reemplazar espacios con guiones
      .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
      .replace(/^-|-$/g, ''); // Remover guiones al inicio y final

    // Añadir ID del cobro para unicidad
    return `${slug}-${cobroId}`;
  }

  /**
   * Construir URL completa del punto de pago
   */
  buildPublicPaymentUrl(slug: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/pagar/${slug}`;
  }

  /**
   * Validar si un slug está disponible
   */
  validateSlugAvailability(slug: string): Observable<{available: boolean, suggestion?: string}> {
    return this.http.get<{available: boolean, suggestion?: string}>(`${this.apiUrl}/public-payment/validate-slug/${slug}`);
  }
}
