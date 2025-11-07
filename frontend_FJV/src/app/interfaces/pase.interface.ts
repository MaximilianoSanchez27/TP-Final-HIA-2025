import { Club } from './club.interface';

export interface Pase {
  idPase?: number;
  idPersona: number;
  clubProveniente?: string | null;
  idClubProveniente?: number | null;
  clubDestino: string;
  idClubDestino: number;
  fechaPase: string;
  habilitacion: 'HABILITADO' | 'PENDIENTE' | 'RECHAZADO';
  motivo?: string;
  observaciones?: string;
  datosAfiliado?: any;

  // Relaciones
  persona?: {
    idPersona: number;
    nombreApellido: string;
    dni: string;
  };
  clubProvenienteObj?: Club;
  clubDestinoObj?: Club;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface PaseFilter {
  idPersona?: number;
  idClub?: number;
  tipo?: 'provenientes' | 'destino' | 'todos';
  fechaDesde?: string;
  fechaHasta?: string;
  habilitacion?: 'HABILITADO' | 'PENDIENTE' | 'RECHAZADO';
}
