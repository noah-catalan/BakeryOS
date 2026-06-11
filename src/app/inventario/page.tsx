"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Ingredient } from "@/types/inventory";
import { Trash2, Plus, Pencil, Package, X } from "lucide-react";

export default function InventarioPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editingIngId, setEditingIngId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nombre: "",
        SKU: "",
        categoria: "Harinas",
        stockActual: 0,
        stockMinimo: 0,
        unidad: "kg",
        estado: "ok" as 'ok' | 'bajo' | 'alerta',
    });

    // Fetch data in real-time
    useEffect(() => {
        if (!user) {
            setIngredientes([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, "ingredientes"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ingredientesData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ingredient[];
            setIngredientes(ingredientesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching ingredients: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const calculateStatus = (current: number, min: number) => {
        const roundedCurrent = Number(Number(current || 0).toFixed(2));
        const roundedMin = Number(Number(min || 0).toFixed(2));
        if (roundedCurrent <= 0) return "alerta";
        if (roundedCurrent <= roundedMin) return "bajo";
        return "ok";
    };

    const handleSaveIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const finalData = {
                nombre: formData.nombre,
                SKU: formData.SKU,
                categoria: formData.categoria,
                stockActual: Number(Number(formData.stockActual || 0).toFixed(2)),
                stockMinimo: Number(Number(formData.stockMinimo || 0).toFixed(2)),
                unidad: formData.unidad,
                estado: calculateStatus(Number(formData.stockActual), Number(formData.stockMinimo)),
                ultimaAct: Date.now(),
                userId: user?.uid
            };

            const sanitizedData = Object.fromEntries(
                Object.entries(finalData).filter(([_, v]) => v !== undefined)
            );

            if (editingIngId) {
                await updateDoc(doc(db, "ingredientes", editingIngId), sanitizedData);
            } else {
                await addDoc(collection(db, "ingredientes"), sanitizedData);
            }

            toast.success(editingIngId ? "Ingrediente actualizado correctamente." : "Ingrediente guardado correctamente.");
            setEditingIngId(null);
            setFormData({ nombre: "", SKU: "", categoria: "Harinas", stockActual: 0, stockMinimo: 0, unidad: "kg", estado: "ok" });
            setShowForm(false);
        } catch (error) {
            console.error("Error saving ingredient: ", error);
            toast.error("Hubo un error al guardar el ingrediente.");
        }
    };

    const handleEditIngredient = (ing: Ingredient) => {
        setEditingIngId(ing.id || null);
        setFormData({
            nombre: ing.nombre,
            SKU: ing.SKU,
            categoria: ing.categoria,
            stockActual: ing.stockActual,
            stockMinimo: ing.stockMinimo,
            unidad: ing.unidad || "kg",
            estado: ing.estado,
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de que deseas eliminar este ingrediente?")) {
            try {
                await deleteDoc(doc(db, "ingredientes", id));
                toast.success("Ingrediente eliminado correctamente.");
            } catch (error) {
                console.error("Error deleting document: ", error);
                toast.error("Hubo un error al eliminar el ingrediente.");
            }
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingIngId(null);
        setFormData({ nombre: "", SKU: "", categoria: "Harinas", stockActual: 0, stockMinimo: 0, unidad: "kg", estado: "ok" });
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Inventario de Materias Primas</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona el stock de ingredientes y alertas.</p>
                </div>
                <button
                    onClick={() => { showForm ? resetForm() : setShowForm(true); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cerrar' : 'Nuevo Ingrediente'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 mb-8 shadow-sm animate-slide-down">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-50">{editingIngId ? 'Editar Ingrediente' : 'Añadir Ingrediente'}</h3>
                    <form onSubmit={handleSaveIngredient} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre</label>
                            <input required type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full rounded-xl border-0 py-2 px-3 text-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">SKU</label>
                            <input required type="text" value={formData.SKU} onChange={e => setFormData({ ...formData, SKU: e.target.value })} className="w-full rounded-xl border-0 py-2 px-3 text-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Categoría</label>
                            <input required type="text" value={formData.categoria} onChange={e => setFormData({ ...formData, categoria: e.target.value })} className="w-full rounded-xl border-0 py-2 px-3 text-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Unidad</label>
                            <input required type="text" value={formData.unidad} onChange={e => setFormData({ ...formData, unidad: e.target.value })} className="w-full rounded-xl border-0 py-2 px-3 text-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" placeholder="kg, g, L, uds" />
                        </div>
                        <div className="flex space-x-2">
                            <div className="w-1/2">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Stock</label>
                                <input required type="number" min="0" step="1" value={formData.stockActual} onChange={e => setFormData({ ...formData, stockActual: Number(e.target.value) })} className="w-full rounded-xl border-0 py-2 px-3 text-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                            </div>
                            <div className="w-1/2">
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Mínimo</label>
                                <input type="number" required placeholder="0" step="1" value={formData.stockMinimo} onChange={e => setFormData({ ...formData, stockMinimo: Number(e.target.value) })} className="w-full rounded-xl border-0 py-2 px-3 text-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                            </div>
                        </div>
                        <div className="flex justify-end h-full gap-2">
                            <button type="button" onClick={resetForm} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl py-2 font-medium text-sm transition-colors">Cancelar</button>
                            <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl py-2 font-medium text-sm transition-all shadow-sm">{editingIngId ? 'Actualizar' : 'Guardar'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                {loading ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-6">
                                <div className="skeleton h-4 w-32 rounded" />
                                <div className="skeleton h-4 w-20 rounded" />
                                <div className="skeleton h-4 w-20 rounded" />
                                <div className="skeleton h-4 w-16 rounded ml-auto" />
                                <div className="skeleton h-5 w-14 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : ingredientes.length === 0 ? (
                    <div className="p-12 text-center animate-fade-in">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center mx-auto mb-4">
                            <Package size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Sin ingredientes registrados</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm mx-auto">Empieza añadiendo tus materias primas para llevar un control preciso del inventario.</p>
                        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all">
                            <Plus size={16} /> Registrar primer ingrediente
                        </button>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50/80 dark:bg-slate-800/40">
                            <tr>
                                <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ingrediente</th>
                                <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">SKU</th>
                                <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Categoría</th>
                                <th scope="col" className="px-6 py-3.5 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Stock / Mínimo</th>
                                <th scope="col" className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Estado</th>
                                <th scope="col" className="relative px-6 py-3.5"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {ingredientes.map((ing) => (
                                <tr key={ing.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-slate-50">{ing.nombre}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono text-xs">{ing.SKU}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{ing.categoria}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-slate-800 dark:text-slate-50 text-center">
                                        {Number((ing.stockActual || 0).toFixed(2))} <span className="text-slate-400 font-normal">{ing.unidad || 'kg'} / {Number((ing.stockMinimo || 0).toFixed(2))} {ing.unidad || 'kg'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
                                            ${ing.estado === 'ok' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : ''}
                                            ${ing.estado === 'bajo' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' : ''}
                                            ${ing.estado === 'alerta' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' : ''}
                                        `}>
                                            {ing.estado.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEditIngredient(ing)} className="text-slate-400 hover:text-amber-500 transition-colors mr-3 p-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30" title="Editar">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => ing.id && handleDelete(ing.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30" title="Eliminar">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
