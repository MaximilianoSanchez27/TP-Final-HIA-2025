import { Club } from './club.interface';

export interface Afiliado {
  idPersona?: number; // El ID de la persona en la base de datos (generado por el backend)

  // Campos principales del afiliado (frontend y backend)
  apellidoNombre: string;
  dni: string;
  fechaNacimiento: string;

  // Campos que mapean directamente a propiedades de 'Persona' en el backend
  tipo: string;
  licencia?: string;
  numeroAfiliacion?: number | null;
  categoria?: string;
  categoriaNivel?: string;

  // Campos relacionados con el Club al que pertenece y su ID (backend y frontend)
  club?: string | null;
  idClub?: number | null;
  clubActual?: string | null;

  // Campos relacionados con licencias (directamente del backend 'Persona')
  fechaLicencia?: string;
  // Campos de licencia actualizados con estado VENCIDO
  fechaLicenciaBaja?: string;
  estadoLicencia?: string;

  // Campos relacionados con pases (algunos frontend, otros backend)
  pase?: string;
  clubDestino?: string | null;
  fechaPase?: string;
  paseClub?: string | null; // Cambiar para permitir null
  otorgado?: boolean;

  // Propiedad para el objeto Club completo (si se incluye en la consulta del backend)
  clubObjeto?: any;

  // Timestamps automáticos de Sequelize (backend)
  createdAt?: string;
  updatedAt?: string;

  // Nuevos campos para foto y avatar
  foto?: string;
  avatar?: any;

  // Nueva propiedad para credenciales
  credenciales?: any[];
}
