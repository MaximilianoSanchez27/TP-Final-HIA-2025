import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pase, PaseFilter } from '../interfaces/pase.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaseService {
  private apiUrl = `${environment.apiUrl}/pases`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los pases
   */
  getPases(): Observable<Pase[]> {
    return this.http.get<Pase[]>(this.apiUrl);
  }

  /**
   * Obtener pases de una persona específica
   */
  getPasesByPersona(idPersona: number): Observable<Pase[]> {
    return this.http.get<Pase[]>(`${this.apiUrl}/persona/${idPersona}`);
  }

  /**
   * Obtener pases de un club específico
   */
  getPasesByClub(idClub: number, tipo: 'provenientes' | 'destino' | 'todos' = 'todos'): Observable<Pase[]> {
    const params = new HttpParams().set('tipo', tipo);
    return this.http.get<Pase[]>(`${this.apiUrl}/club/${idClub}`, { params });
  }

  /**
   * Crear un nuevo pase
   */
  createPase(pase: Pase): Observable<{ status: string; msg: string; pase: Pase }> {
    return this.http.post<{ status: string; msg: string; pase: Pase }>(this.apiUrl, pase);
  }

  /**
   * Actualizar estado de habilitación de un pase
   */
  updateHabilitacion(idPase: number, habilitacion: 'HABILITADO' | 'PENDIENTE' | 'RECHAZADO', observaciones?: string): Observable<{ status: string; msg: string; pase: Pase }> {
    const data = {
      habilitacion,
      observaciones
    };
    return this.http.put<{ status: string; msg: string; pase: Pase }>(`${this.apiUrl}/${idPase}/habilitacion`, data);
  }

  /**
   * Obtener pases con filtros
   */
  getPasesWithFilters(filters: PaseFilter): Observable<Pase[]> {
    let params = new HttpParams();

    if (filters.idPersona) {
      return this.getPasesByPersona(filters.idPersona);
    }

    if (filters.idClub) {
      return this.getPasesByClub(filters.idClub, filters.tipo);
    }

    return this.getPases();
  }

  /**
   * Obtener estadísticas de pases
   */
  getEstadisticasPases(): Observable<any> {
    // Esta función puede expandirse para obtener estadísticas específicas
    return this.http.get<any>(`${this.apiUrl}/estadisticas`);
  }
}
