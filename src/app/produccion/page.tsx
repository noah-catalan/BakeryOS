"use client";

import { useState } from "react";
import { BookOpen, CalendarClock, Plus, List, Scale, Clock, Trash2, CheckCircle, Play, Euro, Edit } from "lucide-react";
import { addDoc, collection, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Recipe, RecipeIngredient, ProductionOrder } from "@/types/production";
import { useRecipes, useProductionOrders, useIngredients } from "@/hooks/useFirebaseData";

export default function ProduccionPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'recetas' | 'ordenes'>('recetas');

    // Hooks
    const { recetas, loading: loadingRecetas } = useRecipes();
    const { ordenes, loading: loadingOrdenes } = useProductionOrders();
    const { ingredientes: ingredientesDb, loading: loadingIngredientes } = useIngredients();

    const loading = loadingRecetas || loadingOrdenes || loadingIngredientes;

    // Form State for Recipes
    const [showRecipeForm, setShowRecipeForm] = useState(false);
    const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
    const [recipeData, setRecipeData] = useState<Omit<Recipe, 'id'>>({
        nombre: '',
        ingredientes_necesarios: [],
        rendimiento: 1,
        tiempoEstimado: 60,
        costeProduccion: 0
    });
    // Temporary state for adding an ingredient to the recipe
    const [currentIngId, setCurrentIngId] = useState("");
    const [currentIngQty, setCurrentIngQty] = useState(0);

    // Form State for Orders
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [orderData, setOrderData] = useState<Omit<ProductionOrder, 'id'>>({
        recetaId: '',
        recetaNombre: '',
        cantidadObjetivo: 1,
        estado: 'pendiente',
        fechaCreacion: Date.now()
    });

    const handleAddIngredientToRecipe = () => {
        if (!currentIngId || currentIngQty <= 0) return;

        const selectedIng = ingredientesDb.find(i => i.id === currentIngId);
        if (!selectedIng) return;

        const newIngDetail: RecipeIngredient = {
            ingredienteId: currentIngId,
            nombre: selectedIng.nombre,
            cantidad: Number(currentIngQty),
            unidad: 'uds/kg' // Simplificado por ahora
        };

        setRecipeData({
            ...recipeData,
            ingredientes_necesarios: [...recipeData.ingredientes_necesarios, newIngDetail]
        });

        // Reset inputs
        setCurrentIngId("");
        setCurrentIngQty(0);
    };

    const handleRemoveIngredientFromRecipe = (index: number) => {
        const newIngs = [...recipeData.ingredientes_necesarios];
        newIngs.splice(index, 1);
        setRecipeData({ ...recipeData, ingredientes_necesarios: newIngs });
    };

    const handleSaveRecipe = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRecipeId) {
                await updateDoc(doc(db, "recetas", editingRecipeId), { ...recipeData });
            } else {
                await addDoc(collection(db, "recetas"), { ...recipeData, userId: user?.uid });
            }
            // Reset
            setEditingRecipeId(null);
            setRecipeData({ nombre: '', ingredientes_necesarios: [], rendimiento: 1, tiempoEstimado: 60, costeProduccion: 0 });
            setShowRecipeForm(false);
        } catch (error) {
            console.error("Error creating/updating recipe:", error);
            alert("Error al guardar la receta.");
        }
    };

    const handleEditRecipe = (receta: Recipe) => {
        setEditingRecipeId(receta.id || null);
        setRecipeData({
            nombre: receta.nombre,
            ingredientes_necesarios: [...receta.ingredientes_necesarios],
            rendimiento: receta.rendimiento,
            tiempoEstimado: receta.tiempoEstimado,
            costeProduccion: receta.costeProduccion
        });
        setActiveTab('recetas');
        setShowRecipeForm(true);
    };

    const handleDeleteRecipe = async (id: string) => {
        if (confirm("¿Eliminar este escandallo?")) {
            await deleteDoc(doc(db, "recetas", id));
        }
    };

    const handlePlanOrder = (receta: Recipe) => {
        setOrderData({
            recetaId: receta.id!,
            recetaNombre: receta.nombre,
            cantidadObjetivo: receta.rendimiento, // default to 1 batch
            estado: 'pendiente',
            fechaCreacion: Date.now()
        });
        setActiveTab('ordenes');
        setShowOrderForm(true);
    };

    const handleSaveOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newOrder = { ...orderData, fechaCreacion: Date.now(), userId: user?.uid };
            await addDoc(collection(db, "ordenesProduccion"), newOrder);
            setShowOrderForm(false);
        } catch (error) {
            console.error("Error creating order:", error);
            alert("Error al guardar la orden.");
        }
    };

    const handleStartOrder = async (id: string) => {
        await updateDoc(doc(db, "ordenesProduccion", id), { estado: 'enProceso' });
    };

    const handleCompleteOrder = async (order: ProductionOrder) => {
        if (!confirm("¿Marcar como completada? Esto deducirá los ingredientes del inventario.")) return;

        try {
            // 1. Find the recipe to know ingredients and yield
            const receta = recetas.find(r => r.id === order.recetaId);
            if (!receta) throw new Error("Receta original no encontrada");

            // Calculate multiplier (batches)
            const factor = order.cantidadObjetivo / receta.rendimiento;

            // 2. Prepare Batch update for Inventory
            const batch = writeBatch(db);

            for (const ingReq of receta.ingredientes_necesarios) {
                const dbIng = ingredientesDb.find(i => i.id === ingReq.ingredienteId);
                if (dbIng) {
                    const totalConsumido = ingReq.cantidad * factor;
                    const nuevoStock = Math.max(0, dbIng.stockActual - totalConsumido); // Prevent negative stock

                    // Simple status recalculation
                    let nuevoEstado = dbIng.estado;
                    if (nuevoStock <= dbIng.stockMinimo / 2) nuevoEstado = 'alerta';
                    else if (nuevoStock <= dbIng.stockMinimo) nuevoEstado = 'bajo';
                    else nuevoEstado = 'ok';

                    batch.update(doc(db, "ingredientes", dbIng.id!), {
                        stockActual: nuevoStock,
                        estado: nuevoEstado
                    });
                }
            }

            // 3. Mark order as complete
            batch.update(doc(db, "ordenesProduccion", order.id!), {
                estado: 'completada',
                fechaCompletada: Date.now()
            });

            // Commit transaction
            await batch.commit();
            alert("¡Orden completada e inventario actualizado!");

        } catch (error) {
            console.error("Error completing order:", error);
            alert("Error al procesar la orden y deducir inventario.");
        }
    };

    const handleDeleteOrder = async (id: string) => {
        if (confirm("¿Eliminar esta orden?")) {
            await deleteDoc(doc(db, "ordenesProduccion", id));
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Módulo de Producción</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tus escandallos y planifica órdenes de horneado.</p>
                </div>
                <button
                    onClick={() => activeTab === 'recetas' ? setShowRecipeForm(!showRecipeForm) : setShowOrderForm(!showOrderForm)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
                >
                    <Plus size={16} />
                    {activeTab === 'recetas' ? 'Nueva Receta' : 'Nueva Orden'}
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-slate-200 dark:border-slate-800 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('recetas')}
                        className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'recetas'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <BookOpen size={18} />
                        Recetas y Escandallos
                    </button>
                    <button
                        onClick={() => setActiveTab('ordenes')}
                        className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'ordenes'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <CalendarClock size={18} />
                        Órdenes de Horneado
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {/* RECIPES TAB */}
                {activeTab === 'recetas' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left column: Recipes List */}
                        <div className="lg:col-span-2 space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-50 border-b border-slate-200 dark:border-slate-800 pb-2">Directorio de Recetas</h3>
                            {loading ? (
                                <div className="text-center text-slate-500 dark:text-slate-400 py-8">Cargando recetas...</div>
                            ) : recetas.length === 0 ? (
                                <div className="text-center text-slate-500 dark:text-slate-400 py-8 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">No hay recetas registradas.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {recetas.map(receta => (
                                        <div key={receta.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">{receta.nombre}</h3>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleEditRecipe(receta)} className="text-slate-400 hover:text-blue-500 transition-colors" title="Editar"><Edit size={16} /></button>
                                                    <button onClick={() => receta.id && handleDeleteRecipe(receta.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            <div className="space-y-3 mb-4">
                                                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 border-b border-slate-50 pb-2">
                                                    <span className="flex items-center"><Scale size={16} className="mr-2 text-slate-400" /> Rendimiento</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-50">{receta.rendimiento} uds</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 border-b border-slate-50 pb-2">
                                                    <span className="flex items-center"><Clock size={16} className="mr-2 text-slate-400" /> Tiempo</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-50">{receta.tiempoEstimado} min</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 border-b border-slate-50 pb-2">
                                                    <span className="flex items-center"><Euro size={16} className="mr-2 text-slate-400" /> Coste Est.</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-50">{receta.costeProduccion} €</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                                                    <span className="flex items-center"><List size={16} className="mr-2 text-slate-400" /> Componentes</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-50">{receta.ingredientes_necesarios?.length || 0}</span>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md mt-2 flex justify-between items-center text-sm border border-slate-100 dark:border-slate-800/50">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium tracking-wide text-xs uppercase">Coste por ud.</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-50">{(receta.costeProduccion / (receta.rendimiento || 1)).toFixed(2)} €/ud</span>
                                            </div>
                                            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/50">
                                                <button onClick={() => handlePlanOrder(receta)} className="text-sm bg-slate-50 dark:bg-slate-800/50 text-blue-600 font-medium hover:bg-blue-50 hover:text-blue-700 w-full text-center py-2 rounded-md transition-colors">Planificar Orden</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right column: Form */}
                        <div className="lg:col-span-1">
                            {showRecipeForm ? (
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
                                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-50">{editingRecipeId ? 'Editar Escandallo' : 'Definir Escandallo'}</h3>
                                    <form onSubmit={handleSaveRecipe}>
                                        <div className="space-y-4 mb-6">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre de la Receta</label>
                                                <input required type="text" value={recipeData.nombre} onChange={e => setRecipeData({ ...recipeData, nombre: e.target.value })} className="w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Unidades</label>
                                                    <input required type="number" min="1" step="1" value={recipeData.rendimiento} onChange={e => setRecipeData({ ...recipeData, rendimiento: Number(e.target.value) })} className="w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Tiempo (min)</label>
                                                    <input required type="number" min="1" step="1" value={recipeData.tiempoEstimado} onChange={e => setRecipeData({ ...recipeData, tiempoEstimado: Number(e.target.value) })} className="w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Coste Estimado (€)</label>
                                                <input required type="number" step="1" min="0" value={recipeData.costeProduccion} onChange={e => setRecipeData({ ...recipeData, costeProduccion: Number(e.target.value) })} className="w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                            </div>
                                        </div>

                                        {/* Ingredient Adder */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-md border border-slate-200 dark:border-slate-800 mb-6">
                                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Añadir Ingredientes</h4>
                                            <div className="flex gap-4 items-end flex-wrap">
                                                <div className="flex-1 min-w-[150px]">
                                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Seleccionar Ingrediente</label>
                                                    <select value={currentIngId} onChange={e => setCurrentIngId(e.target.value)} className="w-full rounded-md border-0 py-2 pl-3 pr-8 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-900">
                                                        <option value="">-- Elige un ingrediente --</option>
                                                        {ingredientesDb.map(ing => (
                                                            <option key={ing.id} value={ing.id}>{ing.nombre} ({ing.SKU})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="w-24">
                                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Cant.</label>
                                                    <input type="number" min="0" step="1" value={currentIngQty} onChange={e => setCurrentIngQty(Number(e.target.value))} className="w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                                </div>
                                                <button type="button" onClick={handleAddIngredientToRecipe} className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700">Añadir</button>
                                            </div>

                                            {/* Current Ingredients List */}
                                            {recipeData.ingredientes_necesarios.length > 0 && (
                                                <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                                                    <ul className="space-y-2">
                                                        {recipeData.ingredientes_necesarios.map((ing, idx) => (
                                                            <li key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 px-3 py-2 rounded border border-slate-100 dark:border-slate-800/50 text-sm">
                                                                <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{ing.nombre}</span>
                                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                                    <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">{ing.cantidad} {ing.unidad}</span>
                                                                    <button type="button" onClick={() => handleRemoveIngredientFromRecipe(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 pt-2">
                                            <button type="submit" disabled={recipeData.ingredientes_necesarios.length === 0} className="w-full py-2.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                                {editingRecipeId ? 'Guardar Cambios' : 'Guardar Receta'}
                                            </button>
                                            <button type="button" onClick={() => { setShowRecipeForm(false); setEditingRecipeId(null); setRecipeData({ nombre: '', ingredientes_necesarios: [], rendimiento: 1, tiempoEstimado: 60, costeProduccion: 0 }); }} className="w-full py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 rounded-md transition-colors">Cancelar</button>
                                        </div>
                                    </form>
                                </div>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                                        <BookOpen size={32} />
                                    </div>
                                    <h3 className="text-slate-800 dark:text-slate-50 font-medium mb-2">Editor de Escandallos</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-[250px]">Crea nuevas recetas definiendo los ingredientes extraídos de tu inventario real.</p>
                                    <button onClick={() => setShowRecipeForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md font-medium text-sm transition-colors shadow-sm">
                                        <Plus size={16} /> Crear Nueva Receta
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ORDERS TAB */}
                {activeTab === 'ordenes' && (
                    <div className="space-y-6">

                        {/* Order Form Modal/Inline */}
                        {showOrderForm && (
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm w-full max-w-lg mb-6">
                                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-50">Planificar Orden de Producción</h3>
                                <form onSubmit={handleSaveOrder} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Seleccionar Receta</label>
                                        <select required value={orderData.recetaId} onChange={(e) => {
                                            const r = recetas.find(x => x.id === e.target.value);
                                            setOrderData({ ...orderData, recetaId: r?.id || '', recetaNombre: r?.nombre || '' });
                                        }} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-900">
                                            <option value="">-- Elige un escandallo --</option>
                                            {recetas.map(receta => <option key={receta.id} value={receta.id}>{receta.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Unidades Objetivo</label>
                                        <input required type="number" min="1" step="1" value={orderData.cantidadObjetivo} onChange={e => setOrderData({ ...orderData, cantidadObjetivo: Number(e.target.value) })} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button type="button" onClick={() => setShowOrderForm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50 rounded-md">Cancelar</button>
                                        <button type="submit" disabled={!orderData.recetaId} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Crear Orden</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center text-slate-500 dark:text-slate-400 py-8">Cargando órdenes...</div>
                        ) : ordenes.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 shadow-sm">
                                No hay órdenes de producción pendientes.
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Receta</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Objetivo</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200">
                                        {ordenes.map(orden => (
                                            <tr key={orden.id} className="hover:bg-slate-50 dark:bg-slate-800/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-50">{orden.recetaNombre}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-50">{orden.cantidadObjetivo} <span className="text-slate-400 font-normal">uds</span></td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                            ${orden.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                            ${orden.estado === 'enProceso' ? 'bg-blue-100 text-blue-800' : ''}
                                                            ${orden.estado === 'completada' ? 'bg-emerald-100 text-emerald-800' : ''}
                                                        `}>
                                                        {orden.estado === 'pendiente' && 'PENDIENTE'}
                                                        {orden.estado === 'enProceso' && 'EN PROCESO'}
                                                        {orden.estado === 'completada' && 'COMPLETADA'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                    {new Date(orden.fechaCreacion).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                                    {orden.estado === 'pendiente' && (
                                                        <button onClick={() => orden.id && handleStartOrder(orden.id)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Iniciar">
                                                            <Play size={18} />
                                                        </button>
                                                    )}
                                                    {orden.estado === 'enProceso' && (
                                                        <button onClick={() => handleCompleteOrder(orden)} className="text-emerald-600 hover:text-emerald-800 transition-colors" title="Completar y Deducir">
                                                            <CheckCircle size={18} />
                                                        </button>
                                                    )}
                                                    {orden.estado !== 'completada' && (
                                                        <button onClick={() => orden.id && handleDeleteOrder(orden.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Eliminar">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
