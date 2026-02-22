export interface RecipeIngredient {
    ingredienteId: string;
    nombre: string;
    cantidad: number;
    unidad: string; // e.g., 'kg', 'g', 'litros', 'unidades'
}

export interface Recipe {
    id?: string;
    nombre: string;
    ingredientes_necesarios: RecipeIngredient[]; // Rename and enforce DB structure
    rendimiento: number; // Unidades que produce esta receta
    tiempoEstimado: number; // En minutos
    costeProduccion: number; // Coste total estimado en €
}

export interface ProductionOrder {
    id?: string;
    recetaId: string;
    recetaNombre: string;
    cantidadObjetivo: number; // Cuántas unidades se desean producir
    estado: 'pendiente' | 'enProceso' | 'completada';
    fechaCreacion: number; // Timestamp
    fechaCompletada?: number; // Timestamp
}
