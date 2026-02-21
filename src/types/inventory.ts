export interface Ingredient {
    id?: string;
    nombre: string;
    SKU: string;
    categoria: string;
    stockActual: number;
    minimo: number;
    estado: 'ok' | 'bajo' | 'alerta';
}
