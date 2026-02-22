"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Ingredient } from "@/types/inventory";
import { Trash2, Plus } from "lucide-react";

export default function InventarioPage() {
    const { user } = useAuth();
    const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        nombre: "",
        SKU: "",
        categoria: "Harinas",
        stockActual: 0,
        stockMinimo: 0, // renamed from minimo
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

    // Calculate status based on stock
    const calculateStatus = (current: number, min: number) => {
        if (current <= 0) return "alerta";
        if (current <= min) return "bajo";
        return "ok";
    };

    const handleAddIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const finalData = {
                nombre: formData.nombre,
                SKU: formData.SKU,
                categoria: formData.categoria,
                stockActual: Number(formData.stockActual),
                stockMinimo: Number(formData.stockMinimo),
                estado: calculateStatus(Number(formData.stockActual), Number(formData.stockMinimo)),
                ultimaAct: Date.now(),
                userId: user?.uid
            };

            await addDoc(collection(db, "ingredientes"), finalData);

            // Reset form and close
            setFormData({ nombre: "", SKU: "", categoria: "Harinas", stockActual: 0, stockMinimo: 0, estado: "ok" });
            setShowForm(false);
        } catch (error) {
            console.error("Error adding ingredient: ", error);
            alert("Hubo un error al añadir el ingrediente.");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de que deseas eliminar este ingrediente?")) {
            try {
                await deleteDoc(doc(db, "ingredientes", id));
            } catch (error) {
                console.error("Error deleting document: ", error);
                alert("Hubo un error al eliminar el ingrediente.");
            }
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Inventario de Materias Primas</h2>
                    <p className="text-sm text-slate-500 mt-1">Gestiona el stock de ingredientes y alertas.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
                >
                    <Plus size={16} />
                    Nuevo Ingrediente
                </button>
            </div>

            {/* Basic Inline Add Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-lg border border-slate-200 mb-8 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Añadir Ingrediente</h3>
                    <form onSubmit={handleAddIngredient} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                            <input
                                required type="text"
                                value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">SKU</label>
                            <input
                                required type="text"
                                value={formData.SKU} onChange={e => setFormData({ ...formData, SKU: e.target.value })}
                                className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
                            <input
                                required type="text"
                                value={formData.categoria} onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                            />
                        </div>
                        <div className="flex space-x-2">
                            <div className="w-1/2">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Stock</label>
                                <input
                                    required type="number" min="0" step="0.01"
                                    value={formData.stockActual} onChange={e => setFormData({ ...formData, stockActual: Number(e.target.value) })}
                                    className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Mínimo</label>
                                <input type="number" required placeholder="0" className="w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600 bg-white"
                                    value={formData.stockMinimo} onChange={e => setFormData({ ...formData, stockMinimo: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end h-full">
                            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-md py-1.5 font-medium text-sm transition-colors">
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Main Table Area */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Cargando inventario...</div>
                ) : ingredientes.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No hay ingredientes registrados.</div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Ingrediente
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    SKU
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Categoría
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Stock / Mínimo
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {ingredientes.map((ing) => (
                                <tr key={ing.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        {ing.nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {ing.SKU}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {ing.categoria}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-slate-800 text-right">
                                        {ing.stockActual} <span className="text-slate-400 font-normal">/ {ing.stockMinimo}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${ing.estado === 'ok' ? 'bg-emerald-100 text-emerald-800' : ''}
                        ${ing.estado === 'bajo' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${ing.estado === 'alerta' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                                            {ing.estado.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => ing.id && handleDelete(ing.id)}
                                            className="text-slate-400 hover:text-red-600 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
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
