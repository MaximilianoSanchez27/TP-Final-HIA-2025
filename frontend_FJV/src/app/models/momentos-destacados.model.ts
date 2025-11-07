export interface MomentoDestacadoImage {
  idImagen: number;
  url: string;
  alt: string;
  titulo: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
  fechaCreacion: Date;
}

export interface MomentosDestacadosConfig {
  idConfig: number;
  titulo: string;
  subTitulo: string;
  imagenes: MomentoDestacadoImage[];
  activo: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface MomentosDestacadosForm {
  titulo: string;
  subTitulo: string;
  imagenes: File[];
  imagenesActuales?: MomentoDestacadoImage[];
  imagenesParaBorrar?: number[];
  metadataImagenes?: {
    titulo: string;
    descripcion?: string;
    alt: string;
  }[];
}

export interface MomentoDestacadoImageUpload {
  file: File;
  titulo: string;
  descripcion?: string;
  alt: string;
  orden: number;
}
