import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Credencial } from '../interfaces/credencial.interface';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CredencialService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    // Obtener todas las credenciales
    obtenerCredenciales(): Observable<Credencial[]> {
        return this.http.get<Credencial[]>(`${this.apiUrl}/credenciales`).pipe(
            catchError(error => {
                console.error('Error al obtener todas las credenciales:', error);
                return of([]);
            })
        );
    }

    // Crear credencial automática - solo una por persona
    crearCredencialAutomatica(idPersona: number): Observable<Credencial> {
        const fechaHoy = new Date();

        const nuevaCredencial = {
            idPersona: idPersona,
            fechaAlta: fechaHoy.toISOString().split('T')[0],
            estado: 'ACTIVO'
        };

        return this.http.post<any>(`${this.apiUrl}/credenciales`, nuevaCredencial).pipe(
            map(response => {
                console.log('Respuesta crear credencial:', response);
                if (response.status === "1" && response.credencial) {
                    return this.mapCredencialFromBackend(response.credencial);
                }
                throw new Error(response.msg || 'Error al crear credencial');
            }),
            catchError(error => {
                console.error('Error al crear credencial en backend:', error);
                return throwError(() => error);
            })
        );
    }

    // Método simplificado para obtener credencial de una persona (solo una)
    obtenerCredencialPorPersona(idPersona: number): Observable<Credencial | null> {
        console.log('Obteniendo credencial para persona:', idPersona);

        return this.http.get<any>(`${this.apiUrl}/credenciales/persona/${idPersona}`).pipe(
            map(response => {
                console.log('Respuesta del endpoint persona:', response);
                if (response.status === "1" && Array.isArray(response.credenciales) && response.credenciales.length > 0) {
                    return this.mapCredencialFromBackend(response.credenciales[0]);
                }
                return null;
            }),
            catchError(error => {
                console.error('Error obteniendo credencial:', error);
                return of(null);
            })
        );
    }

    // Método para obtener o crear credencial única
    obtenerOCrearCredencialPorPersona(idPersona: number): Observable<Credencial> {
        return this.obtenerCredencialPorPersona(idPersona).pipe(
            switchMap(credencial => {
                if (credencial) {
                    return of(credencial);
                } else {
                    console.log('No hay credencial, creando una nueva...');
                    return this.crearCredencialAutomatica(idPersona);
                }
            })
        );
    }

    // Obtener credencial por ID
    obtenerCredencialPorId(idCredencial: number): Observable<Credencial> {
        return this.http.get<Credencial>(`${this.apiUrl}/credenciales/${idCredencial}`).pipe(
            catchError(error => {
                console.error('Error al obtener credencial por ID:', error);
                return throwError(() => error);
            })
        );
    }

    // Obtener credencial por identificador
    obtenerCredencialPorIdentificador(identificador: string): Observable<Credencial> {
        return this.http.get<Credencial>(`${this.apiUrl}/credenciales/identificador/${identificador}`).pipe(
            catchError(error => {
                console.error('Error al obtener credencial por identificador:', error);
                return throwError(() => error);
            })
        );
    }

    // Crear nueva credencial
    crearCredencial(credencial: Credencial): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/credenciales`, credencial).pipe(
            catchError(error => {
                console.error('Error al crear credencial:', error);
                return throwError(() => error);
            })
        );
    }

    // Actualizar credencial
    actualizarCredencial(idCredencial: number, credencial: Credencial): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/credenciales/${idCredencial}`, credencial).pipe(
            catchError(error => {
                console.error('Error al actualizar credencial:', error);
                return throwError(() => error);
            })
        );
    }

    // Renovar credencial - actualizar para manejar respuesta del backend
    renovarCredencial(idCredencial: number): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/credenciales/renovar/${idCredencial}`, {}).pipe(
            map(response => {
                console.log('Respuesta renovar credencial:', response);
                if (response.status === "1") {
                    return response;
                }
                throw new Error(response.msg || 'Error al renovar credencial');
            }),
            catchError(error => {
                console.error('Error al renovar credencial:', error);
                return throwError(() => error);
            })
        );
    }

    // Validar credencial por identificador
    validarCredencial(identificador: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/credenciales/validar/${identificador}`).pipe(
            map(response => {
                console.log('Respuesta validar credencial:', response);
                return response;
            }),
            catchError(error => {
                console.error('Error al validar credencial:', error);
                return throwError(() => error);
            })
        );
    }

    // Generar QR para credencial
    generarQRCredencial(identificador: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/credenciales/qr/${identificador}`).pipe(
            map(response => {
                console.log('Respuesta generar QR:', response);
                return response;
            }),
            catchError(error => {
                console.error('Error al generar QR:', error);
                return throwError(() => error);
            })
        );
    }

    // Eliminar credencial
    eliminarCredencial(idCredencial: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/credenciales/${idCredencial}`).pipe(
            catchError(error => {
                console.error('Error al eliminar credencial:', error);
                return throwError(() => error);
            })
        );
    }

    // Cambiar estado de credencial
    cambiarEstadoCredencial(idCredencial: number, estado: string, observaciones?: string): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/credenciales/${idCredencial}/estado`, {
            estado,
            observaciones
        }).pipe(
            catchError(error => {
                console.error('Error al cambiar estado de credencial:', error);
                return throwError(() => error);
            })
        );
    }

    // Dar de alta credencial
    darDeAltaCredencial(idCredencial: number, fechaAlta: string, observaciones?: string): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/credenciales/${idCredencial}/dar-de-alta`, {
            fechaAlta,
            observaciones
        }).pipe(
            catchError(error => {
                console.error('Error al dar de alta credencial:', error);
                return throwError(() => error);
            })
        );
    }

    // Suspender credencial - método corregido
    suspenderCredencial(idCredencial: number, motivo?: string): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/credenciales/suspender/${idCredencial}`, {
            motivoSuspension: motivo
        }).pipe(
            map(response => {
                console.log('Respuesta suspender credencial:', response);
                if (response.status === "1") {
                    return response;
                }
                throw new Error(response.msg || 'Error al suspender credencial');
            }),
            catchError(error => {
                console.error('Error al suspender credencial:', error);
                return throwError(() => error);
            })
        );
    }

    // Reactivar credencial - método corregido
    reactivarCredencial(idCredencial: number): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/credenciales/reactivar/${idCredencial}`, {}).pipe(
            map(response => {
                console.log('Respuesta reactivar credencial:', response);
                if (response.status === "1") {
                    return response;
                }
                throw new Error(response.msg || 'Error al reactivar credencial');
            }),
            catchError(error => {
                console.error('Error al reactivar credencial:', error);
                return throwError(() => error);
            })
        );
    }

    // Obtener credenciales activas
    obtenerCredencialesActivas(): Observable<Credencial[]> {
        return this.http.get<Credencial[]>(`${this.apiUrl}/credenciales/activas`).pipe(
            catchError(error => {
                console.error('Error al obtener credenciales activas:', error);
                return of([]);
            })
        );
    }

    // Obtener credenciales inactivas
    obtenerCredencialesInactivas(): Observable<Credencial[]> {
        return this.http.get<Credencial[]>(`${this.apiUrl}/credenciales/inactivas`).pipe(
            catchError(error => {
                console.error('Error al obtener credenciales inactivas:', error);
                return of([]);
            })
        );
    }

    // Actualizar estado de todas las credenciales
    actualizarEstadoTodasCredenciales(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/credenciales/estado/actualizar`).pipe(
            catchError(error => {
                console.error('Error al actualizar estado de credenciales:', error);
                return throwError(() => error);
            })
        );
    }

    // Método simplificado de mapeo
    private mapCredencialFromBackend(credencial: any): Credencial {
        return {
            idCredencial: credencial.idCredencial,
            identificador: credencial.identificador,
            fechaAlta: credencial.fechaAlta,
            fechaVencimiento: credencial.fechaVencimiento,
            estado: credencial.estado,
            motivoSuspension: credencial.motivoSuspension,
            idPersona: credencial.idPersona,
            persona: credencial.persona,
            createdAt: credencial.createdAt,
            updatedAt: credencial.updatedAt,

            // Campos de compatibilidad
            numeroCredencial: credencial.numeroCredencial || credencial.identificador,
            fechaEmision: credencial.fechaEmision || credencial.fechaAlta,
            tipoCredencial: credencial.tipoCredencial || 'FJV_AFILIADO',
            observaciones: credencial.observaciones,
            activo: credencial.estado === 'ACTIVO'
        };
    }
}
