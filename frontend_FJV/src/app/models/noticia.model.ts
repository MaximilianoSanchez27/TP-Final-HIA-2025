export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email?: string;
}

export interface BloqueBase {
  tipo: string;
  orden: number;
}

export interface BloqueTexto extends BloqueBase {
  tipo: 'texto';
  contenido: string;
}

export interface BloqueImagen extends BloqueBase {
  tipo: 'imagen';
  url: string;
  alt?: string;
  caption?: string;
  ancho?: string;
  alineacion?: 'left' | 'center' | 'right';
}

export interface ImagenGaleria {
  url: string;
  alt?: string;
  caption?: string;
}

export interface BloqueGaleria extends BloqueBase {
  tipo: 'galeria';
  imagenes: ImagenGaleria[];
  columnas?: number;
}

export type Bloque = BloqueTexto | BloqueImagen | BloqueGaleria;

export type EstadoNoticia = 'ACTIVO' | 'INACTIVO' | 'BORRADOR';
export type CategoriaNoticia = 'GENERAL' | 'DEPORTES' | 'EVENTOS' | 'TORNEOS' | 'INSTITUCIONAL' | 'RESULTADOS';

export interface Noticia {
  idNoticia?: number;
  titulo: string;
  resumen?: string;
  bloques: Bloque[];
  imagenPrincipal?: string;
  imagenPrincipalAlt?: string;
  estado: EstadoNoticia;
  fechaPublicacion?: string;
  fechaProgramada?: string;
  categoria: CategoriaNoticia;
  etiquetas?: string;
  destacado: boolean;
  vistas?: number;
  autorId?: number;
  autor?: Usuario;
  editorId?: number;
  editor?: Usuario;
  slug?: string;  // Campo para URL amigable
  actualizarSlug?: boolean; // Flag para indicar al backend que debe actualizar el slug
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginacionResponse<T> {
  status: string;
  noticias: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export interface CategoriaOption {
  valor: CategoriaNoticia;
  etiqueta: string;
}

export interface NoticiasParams {
  estado?: EstadoNoticia;
  categoria?: CategoriaNoticia;
  destacado?: boolean;
  limit?: number;
  page?: number;
  buscar?: string;
}

// Agregar la interfaz para la respuesta de buscar por URL
export interface NoticiaResponse {
  status: string;
  noticia: Noticia;
  alternativa?: boolean; // Propiedad opcional para indicar si es una noticia alternativa
}

/**
 * Interfaz para las estadísticas del dashboard de noticias
 */
export interface EstadisticasNoticia {
  totalNoticias: number;
  activas: number;
  inactivas: number;
  borradores: number;
  destacadas: number;
  vistasTotal: number;
  ultimoMes: number;
  porCategoria: Array<{ categoria: string; cantidad: number; vistas: number }>;
  porMes: Array<{ mes: string; cantidad: number; vistas: number }>;
}

export interface EstadisticasResponse {
  status: string;
  msg: string;
  estadisticas: EstadisticasNoticia;
}
