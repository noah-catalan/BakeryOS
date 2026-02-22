import { SaleOrderItem } from './clients';

export interface Invoice {
    id?: string;
    numeroFactura: string;
    clienteId: string;
    clienteNombre: string;
    items: SaleOrderItem[]; // We reuse the SaleOrderItem type
    subtotal: number;
    impuestosPorcentaje: number;
    total: number;
    estado: 'borrador' | 'emitida' | 'pagada' | 'vencida';
    fechaEmision: number; // Timestamp
    fechaVencimiento: number; // Timestamp
    pedidoOrigenId?: string; // Optional reference to the SaleOrder it came from
}
