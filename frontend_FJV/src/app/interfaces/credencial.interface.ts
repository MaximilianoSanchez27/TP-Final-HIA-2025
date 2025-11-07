import { Afiliado } from './afiliado.interface';

export interface Credencial {
  idCredencial?: number;
  identificador: string;
  fechaAlta: string; 
  fechaVencimiento: string; 
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'VENCIDO'; 
  motivoSuspension?: string; 
  idPersona: number;
  persona?: Afiliado;
  createdAt?: string;
  updatedAt?: string;

  // Campos obsoletos mantenidos para compatibilidad
  numeroCredencial?: string;
  fechaEmision?: string; 
  tipoCredencial?: string;
  observaciones?: string;
  activo?: boolean;
}
