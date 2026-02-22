export interface Ingredient {
    id?: string;
    nombre: string;
    SKU: string;
    categoria: string;
    stockActual: number;
    stockMinimo: number;
    unidad?: string;
    estado: 'ok' | 'bajo' | 'alerta';
}
