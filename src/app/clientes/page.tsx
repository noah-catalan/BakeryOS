"use client";

import { useState, useEffect } from "react";
import { Users, ShoppingBag, Plus, Building2, User, Phone, Mail, MapPin, Trash2, CheckCircle, Clock } from "lucide-react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Client, SaleOrder, SaleOrderItem } from "@/types/clients";

export default function ClientesPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'directorio' | 'pedidos'>('directorio');

    // Data State
    const [clientes, setClientes] = useState<Client[]>([]);
    const [pedidos, setPedidos] = useState<SaleOrder[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State for Clients
    const [showClientForm, setShowClientForm] = useState(false);
    const [editingClientId, setEditingClientId] = useState<string | null>(null);
    const [clientData, setClientData] = useState<Omit<Client, 'id'>>({
        nombre: '',
        tipo: 'B2B',
        email: '',
        telefono: '',
        direccion: '',
        fechaRegistro: Date.now()
    });

    // Form State for Orders
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [orderData, setOrderData] = useState<Omit<SaleOrder, 'id'>>({
        clienteId: '',
        clienteNombre: '',
        items: [],
        total: 0,
        estado: 'pendiente',
        fechaCreacion: Date.now()
    });

    // Temporary state for adding an item to the order
    const [currentItemName, setCurrentItemName] = useState("");
    const [currentItemQty, setCurrentItemQty] = useState(1);
    const [currentItemPrice, setCurrentItemPrice] = useState(0);

    // Fetch data in real-time
    useEffect(() => {
        if (!user) {
            setClientes([]);
            setPedidos([]);
            setLoading(false);
            return;
        }

        // Fetch Clients
        const qClientes = query(collection(db, "clientes"), where("userId", "==", user.uid));
        const unsubscribeClientes = onSnapshot(qClientes, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Client[];
            setClientes(data);
        });

        // Fetch Orders
        const qPedidos = query(collection(db, "pedidosVenta"), where("userId", "==", user.uid));
        const unsubscribePedidos = onSnapshot(qPedidos, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as SaleOrder[];
            data.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            setPedidos(data);
            setLoading(false);
        });

        return () => {
            unsubscribeClientes();
            unsubscribePedidos();
        }
    }, [user]);

    // --- CLIENTS LOGIC ---
    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingClientId) {
                await updateDoc(doc(db, "clientes", editingClientId), { ...clientData });
            } else {
                await addDoc(collection(db, "clientes"), { ...clientData, fechaRegistro: Date.now(), userId: user?.uid });
            }
            // Reset
            setEditingClientId(null);
            setClientData({ nombre: '', tipo: 'B2B', email: '', telefono: '', direccion: '', fechaRegistro: Date.now() });
            setShowClientForm(false);
        } catch (error) {
            console.error("Error creating/updating client:", error);
            alert("Error al guardar el cliente.");
        }
    };

    const handleEditClient = (cliente: Client) => {
        setEditingClientId(cliente.id || null);
        setClientData({
            nombre: cliente.nombre,
            tipo: cliente.tipo,
            email: cliente.email,
            telefono: cliente.telefono,
            direccion: cliente.direccion,
            fechaRegistro: cliente.fechaRegistro
        });
        setActiveTab('directorio');
        setShowClientForm(true);
    };

    const handleDeleteClient = async (id: string) => {
        if (confirm("¿Eliminar este cliente del directorio?")) {
            await deleteDoc(doc(db, "clientes", id));
        }
    };

    // --- ORDERS LOGIC ---
    const handleAddItemToOrder = () => {
        if (!currentItemName || currentItemQty <= 0 || currentItemPrice < 0) return;

        const newItem: SaleOrderItem = {
            producto: currentItemName,
            cantidad: Number(currentItemQty),
            precioUnitario: Number(currentItemPrice)
        };

        const newItems = [...orderData.items, newItem];
        const newTotal = newItems.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);

        setOrderData({
            ...orderData,
            items: newItems,
            total: newTotal
        });

        setCurrentItemName("");
        setCurrentItemQty(1);
        setCurrentItemPrice(0);
    };

    const handleRemoveItemFromOrder = (index: number) => {
        const newItems = [...orderData.items];
        newItems.splice(index, 1);
        const newTotal = newItems.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
        setOrderData({ ...orderData, items: newItems, total: newTotal });
    };

    const handleSaveOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (orderData.items.length === 0) {
                alert("Añade al menos un producto al pedido.");
                return;
            }
            await addDoc(collection(db, "pedidosVenta"), { ...orderData, fechaCreacion: Date.now(), userId: user?.uid });
            setOrderData({ clienteId: '', clienteNombre: '', items: [], total: 0, estado: 'pendiente', fechaCreacion: Date.now() });
            setShowOrderForm(false);
        } catch (error) {
            console.error("Error creating order:", error);
            alert("Error al guardar el pedido.");
        }
    };

    const handleCompleteOrder = async (id: string) => {
        if (confirm("¿Marcar este pedido como entregado?")) {
            await updateDoc(doc(db, "pedidosVenta", id), { estado: 'entregado', fechaEntrega: Date.now() });
        }
    };

    const handleDeleteOrder = async (id: string) => {
        if (confirm("¿Eliminar o cancelar este pedido?")) {
            await deleteDoc(doc(db, "pedidosVenta", id));
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Módulo de Clientes y Pedidos</h2>
                    <p className="text-sm text-slate-500 mt-1">Gestiona tu directorio comercial y registra los pedidos de venta.</p>
                </div>
                <button
                    onClick={() => activeTab === 'directorio' ? setShowClientForm(!showClientForm) : setShowOrderForm(!showOrderForm)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
                >
                    <Plus size={16} />
                    {activeTab === 'directorio' ? 'Nuevo Cliente' : 'Nuevo Pedido'}
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('directorio')}
                        className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'directorio'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Users size={18} />
                        Directorio de Clientes
                    </button>
                    <button
                        onClick={() => setActiveTab('pedidos')}
                        className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'pedidos'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <ShoppingBag size={18} />
                        Pedidos de Venta
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">

                {/* DIRECTORY TAB */}
                {activeTab === 'directorio' && (
                    <div className="space-y-6">
                        {/* Client Form */}
                        {showClientForm && (
                            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm w-full mb-6">
                                <h3 className="text-lg font-semibold mb-4 text-slate-800">{editingClientId ? 'Editar Cliente' : 'Registrar Cliente'}</h3>
                                <form onSubmit={handleSaveClient}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre / Razón Social</label>
                                            <input required type="text" value={clientData.nombre} onChange={e => setClientData({ ...clientData, nombre: e.target.value })} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Cliente</label>
                                            <select value={clientData.tipo} onChange={e => setClientData({ ...clientData, tipo: e.target.value as 'B2B' | 'B2C' })} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600 bg-white">
                                                <option value="B2B">B2B (Empresa/Restaurante)</option>
                                                <option value="B2C">B2C (Particular)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                                            <input required type="email" value={clientData.email} onChange={e => setClientData({ ...clientData, email: e.target.value })} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                                            <input required type="tel" value={clientData.telefono} onChange={e => setClientData({ ...clientData, telefono: e.target.value })} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Dirección de Entrega</label>
                                            <input required type="text" value={clientData.direccion} onChange={e => setClientData({ ...clientData, direccion: e.target.value })} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => { setShowClientForm(false); setEditingClientId(null); setClientData({ nombre: '', tipo: 'B2B', email: '', telefono: '', direccion: '', fechaRegistro: Date.now() }); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md">Cancelar</button>
                                        <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">{editingClientId ? 'Guardar Cambios' : 'Guardar Cliente'}</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Client List */}
                        {loading ? (
                            <div className="text-center text-slate-500 py-8">Cargando directorio...</div>
                        ) : clientes.length === 0 ? (
                            <div className="text-center text-slate-500 py-8 bg-white rounded-lg border border-slate-200 shadow-sm">No hay clientes registrados.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {clientes.map(cliente => (
                                    <div key={cliente.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                {cliente.tipo === 'B2B' ? <Building2 size={20} className="text-blue-600" /> : <User size={20} className="text-emerald-600" />}
                                                <div>
                                                    <h3 className="font-bold text-slate-900 leading-tight">{cliente.nombre}</h3>
                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{cliente.tipo}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleEditClient(cliente)} className="text-slate-400 hover:text-blue-500 transition-colors" title="Editar"><User size={16} /></button>
                                                <button onClick={() => cliente.id && handleDeleteClient(cliente.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center text-sm text-slate-600">
                                                <Phone size={14} className="mr-2 text-slate-400" /> {cliente.telefono}
                                            </div>
                                            <div className="flex items-center text-sm text-slate-600">
                                                <Mail size={14} className="mr-2 text-slate-400" /> {cliente.email}
                                            </div>
                                            <div className="flex items-start text-sm text-slate-600">
                                                <MapPin size={14} className="mr-2 mt-0.5 text-slate-400 shrink-0" /> <span className="line-clamp-2">{cliente.direccion}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ORDERS TAB */}
                {activeTab === 'pedidos' && (
                    <div className="space-y-6">
                        {/* Order Form */}
                        {showOrderForm && (
                            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm w-full mb-6">
                                <h3 className="text-lg font-semibold mb-4 text-slate-800">Registrar Nuevo Pedido</h3>
                                <form onSubmit={handleSaveOrder}>
                                    <div className="mb-6">
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Cliente</label>
                                        <select required value={orderData.clienteId} onChange={(e) => {
                                            const c = clientes.find(x => x.id === e.target.value);
                                            setOrderData({ ...orderData, clienteId: c?.id || '', clienteNombre: c?.nombre || '' });
                                        }} className="w-full md:w-1/2 rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600 bg-white">
                                            <option value="">-- Seleccionar cliente --</option>
                                            {clientes.map(cli => <option key={cli.id} value={cli.id}>{cli.nombre} ({cli.tipo})</option>)}
                                        </select>
                                    </div>

                                    {/* Items Adder */}
                                    <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-4">
                                        <h4 className="text-sm font-medium text-slate-700 mb-3">Líneas de Pedido</h4>
                                        <div className="flex flex-wrap gap-4 items-end">
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="block text-xs text-slate-500 mb-1">Producto (Ej. Croissant)</label>
                                                <input type="text" value={currentItemName} onChange={e => setCurrentItemName(e.target.value)} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-xs text-slate-500 mb-1">Cant.</label>
                                                <input type="number" min="1" value={currentItemQty} onChange={e => setCurrentItemQty(Number(e.target.value))} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                            </div>
                                            <div className="w-32">
                                                <label className="block text-xs text-slate-500 mb-1">Precio Unit. (€)</label>
                                                <input type="number" min="0" step="0.01" value={currentItemPrice} onChange={e => setCurrentItemPrice(Number(e.target.value))} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                            </div>
                                            <button type="button" onClick={handleAddItemToOrder} className="bg-slate-800 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700">Añadir</button>
                                        </div>

                                        {/* Current Items Table */}
                                        {orderData.items.length > 0 && (
                                            <div className="mt-4 border-t border-slate-200 pt-4">
                                                <table className="min-w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-slate-500">
                                                            <th className="font-medium pb-2">Producto</th>
                                                            <th className="font-medium pb-2 text-right">Cant.</th>
                                                            <th className="font-medium pb-2 text-right">Precio U.</th>
                                                            <th className="font-medium pb-2 text-right">Subtotal</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {orderData.items.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="py-2 text-slate-800">{item.producto}</td>
                                                                <td className="py-2 text-right text-slate-600">{item.cantidad}</td>
                                                                <td className="py-2 text-right text-slate-600">{item.precioUnitario.toFixed(2)}€</td>
                                                                <td className="py-2 text-right font-medium text-slate-800">{(item.cantidad * item.precioUnitario).toFixed(2)}€</td>
                                                                <td className="py-2 text-right">
                                                                    <button type="button" onClick={() => handleRemoveItemFromOrder(idx)} className="text-red-400 hover:text-red-600 inline-flex items-center"><Trash2 size={14} /></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr>
                                                            <td colSpan={3} className="pt-4 text-right font-bold text-slate-700">Total Pedido:</td>
                                                            <td className="pt-4 text-right font-bold text-blue-600 text-lg">{orderData.total.toFixed(2)}€</td>
                                                            <td></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button type="button" onClick={() => setShowOrderForm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md">Cancelar</button>
                                        <button type="submit" disabled={orderData.items.length === 0 || !orderData.clienteId} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Guardar Pedido</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Orders List */}
                        {loading ? (
                            <div className="text-center text-slate-500 py-8">Cargando pedidos...</div>
                        ) : pedidos.length === 0 ? (
                            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
                                No hay pedidos de venta registrados.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {pedidos.map(pedido => (
                                    <div key={pedido.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-900">{pedido.clienteNombre}</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {new Date(pedido.fechaCreacion).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                ${pedido.estado === 'pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                                ${pedido.estado === 'entregado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                                ${pedido.estado === 'cancelado' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                                            `}>
                                                {pedido.estado === 'pendiente' && <Clock size={12} className="mr-1" />}
                                                {pedido.estado === 'entregado' && <CheckCircle size={12} className="mr-1" />}
                                                {pedido.estado.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="p-5 flex-1 bg-slate-50/50">
                                            <ul className="space-y-2 mb-4">
                                                {pedido.items.map((item, idx) => (
                                                    <li key={idx} className="flex justify-between text-sm text-slate-600">
                                                        <span>{item.cantidad}x {item.producto}</span>
                                                        <span>{(item.cantidad * item.precioUnitario).toFixed(2)}€</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-white">
                                            <div className="font-bold text-slate-900">
                                                Total: <span className="text-blue-600">{pedido.total.toFixed(2)}€</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {pedido.estado === 'pendiente' && (
                                                    <button onClick={() => pedido.id && handleCompleteOrder(pedido.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Marcar Entregado">
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                                <button onClick={() => pedido.id && handleDeleteOrder(pedido.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-md transition-colors" title="Eliminar/Cancelar">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
