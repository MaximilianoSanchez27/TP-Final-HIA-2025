export interface WorkArea {
  idArea?: number;
  titulo: string;
  descripcion: string;
  icono: string;
  orden: number;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface WorkAreasConfig {
  idConfig?: number;
  tituloSeccion: string;
  areas: WorkArea[];
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface WorkAreasForm {
  tituloSeccion: string;
  areas: WorkAreaForm[];
}

export interface WorkAreaForm {
  titulo: string;
  descripcion: string;
  icono: string;
}
