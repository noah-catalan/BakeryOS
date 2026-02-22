export interface BusinessSettings {
    razonSocial: string;
    cif: string;
    direccion: string;
    telefono: string;
    emailContacto: string;
    monedaBase: string;
    ivaPorDefecto: number;
}

export interface UserSettings {
    nombre: string;
    avatarUrl?: string;
    temaVisual: 'light' | 'dark' | 'system';
    notificacionesEmail: boolean;
    notificacionesPush: boolean;
}
