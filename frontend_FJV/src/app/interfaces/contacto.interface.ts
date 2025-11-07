export interface Contacto {
  idContacto?: number;
  direccion: string;
  telefono: string;
  email: string;
  horarios: string;
  mapaEmbed?: string; // no lo usaremos para mapa, pero lo dejamos
  facebook: string;
  instagram: string;
}