export interface HeroImage {
  idImagen?: number;
  url: string;
  alt: string;
  orden: number;
  activo: boolean;
  fechaCreacion?: string;
}

export interface HeroConfig {
  idConfig?: number;
  eslogan: string;
  subTexto: string;
  imagenes: HeroImage[];
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface HeroConfigForm {
  eslogan: string;
  subTexto: string;
  imagenes: File[];
}
