export interface IPInfo {
  ip: string;
  ubicacion: {
    pais: string;
    ciudad: string;
    region: string;
    codigoPais: string;
    codigoRegion: string;
    codigoCiudad: string;
    latitud: number;
    longitud: number;
    zonaHoraria: string;
  };
  red: {
    sistemaAutonomo: {
      asn: number;
      nombre: string;
    };
    proveedor: string;
    tipo: string;
    cidr?: string;
  };
}

export interface LocationInfo {
  ciudad?: string;
  pais?: string;
  zonaHoraria?: string;
  coordenadas?: {
    latitud?: number;
    longitud?: number;
  };
}

export interface ASNInfo {
  asn: number;
  nombre: string;
  descripcion: string;
  tipo: string;
  pais: string;
}

export interface NetworkInfo {
  cidr: string;
  rangoInicio: string;
  rangoFin: string;
  mascara: string;
  prefijo: number;
  totalIPs: number;
  tipo: string;
}

export interface ValidationResponse {
  success: boolean;
  data: {
    ip?: string;
    cidr?: string;
    esValida: boolean;
    mensaje: string;
  };
}

export interface IPGuideResponse {
  success: boolean;
  data: IPInfo | NetworkInfo | ASNInfo;
  error?: string;
  status?: number;
}

export interface NoticiaVista {
  id: number;
  noticiaId: number;
  ip: string;
  createdAt: string;
  updatedAt: string;
  ipInfo?: IPInfo; // Información enriquecida de la IP
}

export interface VistaNoticiaResponse {
  success: boolean;
  message: string;
  vista?: NoticiaVista;
  error?: string;
}

export interface VistasNoticiaResponse {
  success: boolean;
  vistas: NoticiaVista[];
  total: number;
  error?: string;
}
