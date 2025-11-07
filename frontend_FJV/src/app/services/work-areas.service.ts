import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

import { WorkAreasConfig, WorkArea } from '../models/work-areas.model';

interface BackendResponse<T> {
  status: string;
  msg: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class WorkAreasService {
  private apiUrl = `${environment.apiUrl}/work-areas`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la configuración actual de las áreas de trabajo
   */
  getWorkAreasConfig(): Observable<WorkAreasConfig> {
    return this.http.get<BackendResponse<WorkAreasConfig>>(this.apiUrl).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error obteniendo configuración de áreas de trabajo:', error);
        // Devolver configuración por defecto
        return of({
          tituloSeccion: 'Áreas de trabajo',
          areas: [
            {
              idArea: 1,
              titulo: 'Torneos Provinciales',
              descripcion: 'Organizamos torneos en todas las categorías, promoviendo la competencia a nivel provincial y regional.',
              icono: 'fas fa-trophy',
              orden: 1,
              activo: true,
              fechaCreacion: new Date().toISOString()
            },
            {
              idArea: 2,
              titulo: 'Selecciones Provinciales',
              descripcion: 'Formamos y preparamos las selecciones de Jujuy para representar a nuestra provincia en torneos nacionales.',
              icono: 'fas fa-users',
              orden: 2,
              activo: true,
              fechaCreacion: new Date().toISOString()
            },
            {
              idArea: 3,
              titulo: 'Capacitación Deportiva',
              descripcion: 'Ofrecemos cursos para jugadores, entrenadores y árbitros para mantener el alto nivel del voley jujeño.',
              icono: 'fas fa-graduation-cap',
              orden: 3,
              activo: true,
              fechaCreacion: new Date().toISOString()
            }
          ],
          activo: true,
          idConfig: 1,
          fechaCreacion: new Date().toISOString(),
          fechaActualizacion: new Date().toISOString()
        });
      })
    );
  }

  /**
   * Actualiza la configuración de las áreas de trabajo
   */
  updateWorkAreasConfig(config: WorkAreasConfig): Observable<WorkAreasConfig> {
    return this.http.put<BackendResponse<WorkAreasConfig>>(this.apiUrl, config).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error actualizando configuración de áreas de trabajo:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina un área de trabajo específica
   */
  deleteWorkArea(areaId: number): Observable<WorkAreasConfig> {
    return this.http.delete<BackendResponse<WorkAreasConfig>>(`${this.apiUrl}/areas/${areaId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error eliminando área de trabajo:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Reordena las áreas de trabajo
   */
  reorderWorkAreas(areaIds: number[]): Observable<WorkAreasConfig> {
    return this.http.put<BackendResponse<WorkAreasConfig>>(`${this.apiUrl}/reorder`, { areaIds }).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error reordenando áreas de trabajo:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Opciones de iconos disponibles
   */
  getAvailableIcons(): { icon: string; label: string }[] {
    return [
      { icon: 'fas fa-trophy', label: 'Trofeo' },
      { icon: 'fas fa-users', label: 'Usuarios' },
      { icon: 'fas fa-graduation-cap', label: 'Graduación' },
      { icon: 'fas fa-volleyball', label: 'Voleibol' },
      { icon: 'fas fa-medal', label: 'Medalla' },
      { icon: 'fas fa-star', label: 'Estrella' },
      { icon: 'fas fa-heart', label: 'Corazón' },
      { icon: 'fas fa-flag', label: 'Bandera' },
      { icon: 'fas fa-calendar', label: 'Calendario' },
      { icon: 'fas fa-chart-line', label: 'Gráfico' },
      { icon: 'fas fa-handshake', label: 'Apretón de manos' },
      { icon: 'fas fa-bullhorn', label: 'Megáfono' },
      { icon: 'fas fa-clipboard-list', label: 'Lista' },
      { icon: 'fas fa-certificate', label: 'Certificado' },
      { icon: 'fas fa-map-marker-alt', label: 'Ubicación' },
      { icon: 'fas fa-phone', label: 'Teléfono' },
      { icon: 'fas fa-envelope', label: 'Sobre' },
      { icon: 'fas fa-globe', label: 'Globo' },
      { icon: 'fas fa-lightbulb', label: 'Bombilla' },
      { icon: 'fas fa-cogs', label: 'Engranajes' }
    ];
  }

  /**
   * Valida una configuración de áreas de trabajo
   */
  validateWorkAreasConfig(config: WorkAreasConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar título de sección
    if (!config.tituloSeccion || config.tituloSeccion.trim().length === 0) {
      errors.push('El título de la sección es requerido');
    }

    if (config.tituloSeccion && config.tituloSeccion.length > 100) {
      errors.push('El título de la sección no puede exceder 100 caracteres');
    }

    // Validar áreas
    if (!config.areas || config.areas.length === 0) {
      errors.push('Debe haber al menos un área de trabajo');
    }

    if (config.areas && config.areas.length > 6) {
      errors.push('Máximo 6 áreas de trabajo permitidas');
    }

    // Validar cada área
    config.areas?.forEach((area, index) => {
      if (!area.titulo || area.titulo.trim().length === 0) {
        errors.push(`Área ${index + 1}: El título es requerido`);
      }

      if (area.titulo && area.titulo.length > 100) {
        errors.push(`Área ${index + 1}: El título no puede exceder 100 caracteres`);
      }

      if (!area.descripcion || area.descripcion.trim().length === 0) {
        errors.push(`Área ${index + 1}: La descripción es requerida`);
      }

      if (area.descripcion && area.descripcion.length > 300) {
        errors.push(`Área ${index + 1}: La descripción no puede exceder 300 caracteres`);
      }

      if (!area.icono || area.icono.trim().length === 0) {
        errors.push(`Área ${index + 1}: El ícono es requerido`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
