export interface Client {
    id?: string;
    nombre: string;
    tipo: 'B2B' | 'B2C';
    email: string;
    telefono: string;
    direccion: string;
    fechaRegistro: number; // Timestamp
}

export interface SaleOrderItem {
    producto: string; // The name of the product being sold
    cantidad: number;
    precioUnitario: number;
}

export interface SaleOrder {
    id?: string;
    clienteId: string;
    clienteNombre: string;
    items: SaleOrderItem[];
    total: number;
    estado: 'pendiente' | 'entregado' | 'cancelado';
    fechaCreacion: number; // Timestamp
    fechaEntrega?: number; // Timestamp
}
