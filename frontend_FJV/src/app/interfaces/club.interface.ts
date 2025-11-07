export interface Club {
    idClub?: number;
    nombre: string;
    direccion: string;
    telefono?: string;
    email: string;
    cuit: string;
    fechaAfiliacion: string;
    estadoAfiliacion: string;
    logo?: string; // URL del logo almacenado en ImgBB
    createdAt?: string;
    updatedAt?: string;
    personas?: any[];
    equipos?: any[];
}
