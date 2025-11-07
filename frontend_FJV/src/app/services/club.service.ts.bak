import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Club } from '../interfaces/club.interface';

export interface ClubResponse {
  status: string;
  msg: string;
  club?: Club;
}

export interface ClubFilter {
  nombre?: string;
  cuit?: string;
  estadoAfiliacion?: string;
  fechaAfiliacionDesde?: string;
  fechaAfiliacionHasta?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClubService {
  private readonly API_URL = `${environment.apiUrl}/clubs`;

  constructor(private http: HttpClient) { }

  // Obtener todos los clubes
  getClubes(): Observable<Club[]> {
    return this.http.get<Club[]>(this.API_URL);
  }

  // Obtener un club por ID
  getClub(id: number): Observable<Club> {
    return this.http.get<Club>(`${this.API_URL}/${id}`);
  }

  // Crear un nuevo club
  createClub(club: Club): Observable<ClubResponse> {
    return this.http.post<ClubResponse>(this.API_URL, club);
  }

  // Crear un nuevo club con logo
  crearClubConLogo(club: Club, logoFile?: File): Observable<Club> {
    if (logoFile) {
      const formData = new FormData();

      // Agregar todos los campos del club al FormData
      Object.keys(club).forEach((key) => {
        if (club[key as keyof Club] !== null && club[key as keyof Club] !== undefined) {
          formData.append(key, club[key as keyof Club] as string);
        }
      });

      // Agregar el archivo de logo
      formData.append('logo', logoFile);

      return this.http.post<any>(this.API_URL, formData).pipe(
        map((response) => {
          return response.club || response.data || response;
        }),
        catchError((error) => {
          console.error('Error en crearClubConLogo:', error);
          throw error;
        })
      );
    } else {
      return this.createClub(club).pipe(
        map((response: ClubResponse) => response.club || response as any)
      );
    }
  }

  // Actualizar un club existente
  updateClub(id: number, club: Club): Observable<ClubResponse> {
    return this.http.put<ClubResponse>(`${this.API_URL}/${id}`, club);
  }

  // Actualizar un club existente con logo
  actualizarClubConLogo(idClub: number, club: Club, logoFile?: File): Observable<Club> {
    if (logoFile) {
      const formData = new FormData();

      // Agregar todos los campos del club al FormData
      Object.keys(club).forEach((key) => {
        if (club[key as keyof Club] !== null && club[key as keyof Club] !== undefined) {
          formData.append(key, club[key as keyof Club] as string);
        }
      });

      // Agregar el archivo de logo
      formData.append('logo', logoFile);

      return this.http.put<any>(`${this.API_URL}/${idClub}`, formData).pipe(
        map((response) => {
          return response.club || response.data || response;
        }),
        catchError((error) => {
          console.error('Error en actualizarClubConLogo:', error);
          throw error;
        })
      );
    } else {
      return this.updateClub(idClub, club).pipe(
        map((response: ClubResponse) => response.club || response as any)
      );
    }
  }

  // Eliminar un club
  deleteClub(id: number): Observable<ClubResponse> {
    return this.http.delete<ClubResponse>(`${this.API_URL}/${id}`);
  }

  // Filtrar clubes
  filterClubes(filters: ClubFilter): Observable<Club[]> {
    let params = new HttpParams();

    if (filters.nombre) params = params.set('nombre', filters.nombre);
    if (filters.cuit) params = params.set('cuit', filters.cuit);
    if (filters.estadoAfiliacion) params = params.set('estadoAfiliacion', filters.estadoAfiliacion);
    if (filters.fechaAfiliacionDesde) params = params.set('fechaAfiliacionDesde', filters.fechaAfiliacionDesde);
    if (filters.fechaAfiliacionHasta) params = params.set('fechaAfiliacionHasta', filters.fechaAfiliacionHasta);

    return this.http.get<Club[]>(`${this.API_URL}/filter`, { params });
  }

  // Obtener la URL del logo de un club
  getLogoUrl(club: Club): string {
    if (club.logo) {
      // Si ya es una URL completa
      if (club.logo.startsWith('http') || club.logo.startsWith('data:')) {
        return club.logo;
      }
      // Si es una ruta relativa, construir la URL completa
      if (club.logo.startsWith('/') || club.logo.includes('uploads')) {
        return `${this.API_URL.replace('/clubs', '')}${club.logo.startsWith('/') ? '' : '/'}${club.logo}`;
      }
      // Si parece ser solo un nombre de archivo
      return `${this.API_URL.replace('/clubs', '')}/uploads/${club.logo}`;
    }

    return '';
  }
}
