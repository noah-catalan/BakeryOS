"use client";

import { useState, useEffect } from "react";
import { BookOpen, CalendarClock, Plus, List, Scale, Clock, Trash2, CheckCircle, Play } from "lucide-react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Recipe, RecipeIngredient, ProductionOrder } from "@/types/production";
import { Ingredient } from "@/types/inventory";

export default function ProduccionPage() {
    const [activeTab, setActiveTab] = useState<'recetas' | 'ordenes'>('recetas');

    // Data State
    const [recetas, setRecetas] = useState<Recipe[]>([]);
    const [ordenes, setOrdenes] = useState<ProductionOrder[]>([]);
    const [ingredientesDb, setIngredientesDb] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State for Recipes
    const [showRecipeForm, setShowRecipeForm] = useState(false);
    const [recipeData, setRecipeData] = useState<Omit<Recipe, 'id'>>({
        nombre: '',
        ingredientes: [],
        rendimiento: 1,
        tiempoEstimado: 60
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

    // Fetch data in real-time
    useEffect(() => {
        // Fetch Recipes
        const unsubscribeRecetas = onSnapshot(collection(db, "recetas"), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Recipe[];
            setRecetas(data);
        });

        // Fetch Orders
        const unsubscribeOrdenes = onSnapshot(collection(db, "ordenesProduccion"), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ProductionOrder[];
            // Sort to show newest first
            data.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            setOrdenes(data);
        });

        // Fetch Ingredients for dropdown and deductions
        const unsubscribeIngredientes = onSnapshot(collection(db, "ingredientes"), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ingredient[];
            setIngredientesDb(data);
            setLoading(false);
        });

        return () => {
            unsubscribeRecetas();
            unsubscribeOrdenes();
            unsubscribeIngredientes();
        }
    }, []);

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
            ingredientes: [...recipeData.ingredientes, newIngDetail]
        });

        // Reset inputs
        setCurrentIngId("");
        setCurrentIngQty(0);
    };

    const handleRemoveIngredientFromRecipe = (index: number) => {
        const newIngs = [...recipeData.ingredientes];
        newIngs.splice(index, 1);
        setRecipeData({ ...recipeData, ingredientes: newIngs });
    };

    const handleSaveRecipe = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "recetas"), recipeData);
            setRecipeData({ nombre: '', ingredientes: [], rendimiento: 1, tiempoEstimado: 60 });
            setShowRecipeForm(false);
        } catch (error) {
            console.error("Error creating recipe:", error);
            alert("Error al guardar la receta.");
        }
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
            const newOrder = { ...orderData, fechaCreacion: Date.now() };
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

            for (const ingReq of receta.ingredientes) {
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
                    <h2 className="text-2xl font-bold text-slate-900">Módulo de Producción</h2>
                    <p className="text-sm text-slate-500 mt-1">Gestiona tus escandallos y planifica órdenes de horneado.</p>
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
            <div className="border-b border-slate-200 mb-6">
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
                    <div className="space-y-6">

                        {/* Recipe Form Modal/Inline */}
                        {showRecipeForm && (
                            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-semibold mb-4 text-slate-800">Crear Escandallo</h3>
                                <form onSubmit={handleSaveRecipe}>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de la Receta</label>
                                            <input required type="text" value={recipeData.nombre} onChange={e => setRecipeData({ ...recipeData, nombre: e.target.value })} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Rendimiento (Unidades)</label>
                                            <input required type="number" min="1" value={recipeData.rendimiento} onChange={e => setRecipeData({ ...recipeData, rendimiento: Number(e.target.value) })} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Tiempo Estimado (Minutos)</label>
                                            <input required type="number" min="1" value={recipeData.tiempoEstimado} onChange={e => setRecipeData({ ...recipeData, tiempoEstimado: Number(e.target.value) })} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                        </div>
                                    </div>

                                    {/* Ingredient Adder */}
                                    <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-6">
                                        <h4 className="text-sm font-medium text-slate-700 mb-3">Añadir Ingredientes</h4>
                                        <div className="flex gap-4 items-end">
                                            <div className="flex-1">
                                                <label className="block text-xs text-slate-500 mb-1">Seleccionar Ingrediente</label>
                                                <select value={currentIngId} onChange={e => setCurrentIngId(e.target.value)} className="w-full rounded-md border-0 py-1.5 pl-3 pr-8 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600 bg-white">
                                                    <option value="">-- Elige un ingrediente --</option>
                                                    {ingredientesDb.map(ing => (
                                                        <option key={ing.id} value={ing.id}>{ing.nombre} ({ing.SKU})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-32">
                                                <label className="block text-xs text-slate-500 mb-1">Cantidad (uds/kg)</label>
                                                <input type="number" min="0" step="0.01" value={currentIngQty} onChange={e => setCurrentIngQty(Number(e.target.value))} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                            </div>
                                            <button type="button" onClick={handleAddIngredientToRecipe} className="bg-slate-800 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700">Añadir</button>
                                        </div>

                                        {/* Current Ingredients List */}
                                        {recipeData.ingredientes.length > 0 && (
                                            <div className="mt-4 border-t border-slate-200 pt-4">
                                                <ul className="space-y-2">
                                                    {recipeData.ingredientes.map((ing, idx) => (
                                                        <li key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded border border-slate-100 text-sm">
                                                            <span className="font-medium text-slate-700">{ing.nombre}</span>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-slate-500">{ing.cantidad} {ing.unidad}</span>
                                                                <button type="button" onClick={() => handleRemoveIngredientFromRecipe(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowRecipeForm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md">Cancelar</button>
                                        <button type="submit" disabled={recipeData.ingredientes.length === 0} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Guardar Receta</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Recipes List */}
                        {loading ? (
                            <div className="text-center text-slate-500 py-8">Cargando recetas...</div>
                        ) : recetas.length === 0 ? (
                            <div className="text-center text-slate-500 py-8 bg-white rounded-lg border border-slate-200 shadow-sm">No hay recetas registradas.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {recetas.map(receta => (
                                    <div key={receta.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-bold text-slate-900 text-lg">{receta.nombre}</h3>
                                            <button onClick={() => receta.id && handleDeleteRecipe(receta.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                        <div className="space-y-3 mb-4">
                                            <div className="flex items-center text-sm text-slate-600">
                                                <Scale size={16} className="mr-2 text-slate-400" /> Rendimiento: <span className="font-medium text-slate-900 ml-1">{receta.rendimiento} uds</span>
                                            </div>
                                            <div className="flex items-center text-sm text-slate-600">
                                                <Clock size={16} className="mr-2 text-slate-400" /> Tiempo: <span className="font-medium text-slate-900 ml-1">{receta.tiempoEstimado} min</span>
                                            </div>
                                            <div className="flex items-center text-sm text-slate-600">
                                                <List size={16} className="mr-2 text-slate-400" /> Ingredientes: <span className="font-medium text-slate-900 ml-1">{receta.ingredientes.length}</span>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-slate-100">
                                            <button onClick={() => handlePlanOrder(receta)} className="text-sm text-blue-600 font-medium hover:text-blue-700 w-full text-center">Planificar Orden</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ORDERS TAB */}
                {activeTab === 'ordenes' && (
                    <div className="space-y-6">

                        {/* Order Form Modal/Inline */}
                        {showOrderForm && (
                            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm w-full max-w-lg mb-6">
                                <h3 className="text-lg font-semibold mb-4 text-slate-800">Planificar Orden de Producción</h3>
                                <form onSubmit={handleSaveOrder} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Seleccionar Receta</label>
                                        <select required value={orderData.recetaId} onChange={(e) => {
                                            const r = recetas.find(x => x.id === e.target.value);
                                            setOrderData({ ...orderData, recetaId: r?.id || '', recetaNombre: r?.nombre || '' });
                                        }} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600 bg-white">
                                            <option value="">-- Elige un escandallo --</option>
                                            {recetas.map(receta => <option key={receta.id} value={receta.id}>{receta.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Unidades Objetivo</label>
                                        <input required type="number" min="1" value={orderData.cantidadObjetivo} onChange={e => setOrderData({ ...orderData, cantidadObjetivo: Number(e.target.value) })} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button type="button" onClick={() => setShowOrderForm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md">Cancelar</button>
                                        <button type="submit" disabled={!orderData.recetaId} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Crear Orden</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center text-slate-500 py-8">Cargando órdenes...</div>
                        ) : ordenes.length === 0 ? (
                            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
                                No hay órdenes de producción pendientes.
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Receta</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Objetivo</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {ordenes.map(orden => (
                                            <tr key={orden.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{orden.recetaNombre}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{orden.cantidadObjetivo} <span className="text-slate-400 font-normal">uds</span></td>
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
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
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
