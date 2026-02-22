"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, CheckCircle, Clock, Trash2, Download, AlertCircle, Printer } from "lucide-react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Invoice } from "@/types/billing";
import { Client, SaleOrder, SaleOrderItem } from "@/types/clients";

export default function FacturacionPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'historial' | 'nueva'>('historial');

    // Data State
    const [facturas, setFacturas] = useState<Invoice[]>([]);
    const [clientes, setClientes] = useState<Client[]>([]);
    const [pedidos, setPedidos] = useState<SaleOrder[]>([]);
    const [loading, setLoading] = useState(true);

    // Print State
    const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);

    // Form State for Invoice
    const [invoiceData, setInvoiceData] = useState<Omit<Invoice, 'id' | 'numeroFactura'>>({
        clienteId: '',
        clienteNombre: '',
        items: [],
        subtotal: 0,
        impuestosPorcentaje: 21, // Default IVA in Spain
        total: 0,
        estado: 'borrador',
        fechaEmision: Date.now(),
        fechaVencimiento: Date.now() + (30 * 24 * 60 * 60 * 1000) // Default 30 days
    });

    // Temporary state for adding an item manually
    const [currentItemName, setCurrentItemName] = useState("");
    const [currentItemQty, setCurrentItemQty] = useState(1);
    const [currentItemPrice, setCurrentItemPrice] = useState(0);

    // Fetch data in real-time
    useEffect(() => {
        if (!user) {
            setFacturas([]);
            setClientes([]);
            setPedidos([]);
            setLoading(false);
            return;
        }

        const qFacturas = query(collection(db, "facturas"), where("userId", "==", user.uid));
        const unsubscribeFacturas = onSnapshot(qFacturas, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Invoice[];
            data.sort((a, b) => b.fechaEmision - a.fechaEmision);
            setFacturas(data);
        });

        const qClientes = query(collection(db, "clientes"), where("userId", "==", user.uid));
        const unsubscribeClientes = onSnapshot(qClientes, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Client[];
            setClientes(data);
        });

        const qPedidos = query(collection(db, "pedidosVenta"), where("userId", "==", user.uid));
        const unsubscribePedidos = onSnapshot(qPedidos, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SaleOrder[];
            // Only care about delivered or pending orders to potentially invoice them
            setPedidos(data.filter(p => p.estado !== 'cancelado'));
            setLoading(false);
        });

        return () => {
            unsubscribeFacturas();
            unsubscribeClientes();
            unsubscribePedidos();
        }
    }, [user]);

    // --- MATH & LOGIC ---
    const recalculateTotals = (items: SaleOrderItem[], impPorcentaje: number) => {
        const sub = items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
        const tot = sub * (1 + (impPorcentaje / 100));
        return { subtotal: sub, total: tot };
    };

    const handleAddItem = () => {
        if (!currentItemName || currentItemQty <= 0 || currentItemPrice < 0) return;

        const newItem: SaleOrderItem = {
            producto: currentItemName,
            cantidad: Number(currentItemQty),
            precioUnitario: Number(currentItemPrice)
        };

        const newItems = [...invoiceData.items, newItem];
        const { subtotal, total } = recalculateTotals(newItems, invoiceData.impuestosPorcentaje);

        setInvoiceData({ ...invoiceData, items: newItems, subtotal, total });
        setCurrentItemName(""); setCurrentItemQty(1); setCurrentItemPrice(0);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...invoiceData.items];
        newItems.splice(index, 1);
        const { subtotal, total } = recalculateTotals(newItems, invoiceData.impuestosPorcentaje);
        setInvoiceData({ ...invoiceData, items: newItems, subtotal, total });
    };

    const handleTaxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTax = Number(e.target.value);
        const { subtotal, total } = recalculateTotals(invoiceData.items, newTax);
        setInvoiceData({ ...invoiceData, impuestosPorcentaje: newTax, subtotal, total });
    };

    const handleLoadFromOrder = (pedidoId: string) => {
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (!pedido) return;

        const { subtotal, total } = recalculateTotals(pedido.items, invoiceData.impuestosPorcentaje);

        setInvoiceData({
            ...invoiceData,
            clienteId: pedido.clienteId,
            clienteNombre: pedido.clienteNombre,
            items: [...pedido.items], // Clone items
            subtotal,
            total,
            pedidoOrigenId: pedido.id
        });
    };

    const generateInvoiceNumber = () => {
        // Very simple logic: FAC-YYYY-XXX
        const year = new Date().getFullYear();
        const count = facturas.filter(f => f.numeroFactura.includes(year.toString())).length + 1;
        return `FAC-${year}-${count.toString().padStart(4, '0')}`;
    };

    const handleSaveInvoice = async (e: React.FormEvent, emitir: boolean) => {
        e.preventDefault();
        try {
            if (invoiceData.items.length === 0) {
                alert("La factura debe tener al menos un ítem.");
                return;
            }

            const numFac = generateInvoiceNumber();
            const finalData = {
                ...invoiceData,
                numeroFactura: numFac,
                estado: emitir ? 'emitida' : 'borrador',
                fechaEmision: Date.now(),
                userId: user?.uid
            };

            await addDoc(collection(db, "facturas"), finalData);

            // Reset
            setInvoiceData({
                clienteId: '', clienteNombre: '', items: [], subtotal: 0, impuestosPorcentaje: 21, total: 0,
                estado: 'borrador', fechaEmision: Date.now(), fechaVencimiento: Date.now() + (30 * 24 * 60 * 60 * 1000), pedidoOrigenId: ''
            });
            setActiveTab('historial');
            alert(`Factura ${numFac} guardada exitosamente.`);
        } catch (error) {
            console.error("Error creating invoice:", error);
            alert("Error al guardar la factura.");
        }
    };

    const handleMarkAsPaid = async (id: string) => {
        if (confirm("¿Marcar esta factura como PAGADA?")) {
            await updateDoc(doc(db, "facturas", id), { estado: 'pagada' });
        }
    };

    const handleDeleteInvoice = async (id: string) => {
        if (confirm("¿Eliminar factura? Esto no se puede deshacer.")) {
            await deleteDoc(doc(db, "facturas", id));
        }
    };

    const handlePrintInvoice = (fac: Invoice) => {
        setInvoiceToPrint(fac);
        setTimeout(() => {
            window.print();
            setTimeout(() => setInvoiceToPrint(null), 500); // clear after dialog
        }, 100);
    };

    return (
        <>
            {/* Printable Invoice Container */}
            {invoiceToPrint && (
                <div className="hidden print:block fixed inset-0 z-[100] bg-white text-black p-12">
                    <div className="flex justify-between items-start mb-12 border-b-2 border-slate-200 pb-8">
                        <div>
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">FACTURA</h1>
                            <p className="text-lg text-slate-500 mt-2 font-medium">{invoiceToPrint.numeroFactura}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-slate-800 text-lg">BakeryOS</p>
                            <p className="text-slate-500">Documento Fiscal</p>
                            <p className="text-slate-500">Fecha: {new Date(invoiceToPrint.fechaEmision).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="mb-12">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Facturado a:</p>
                        <p className="text-xl font-bold text-slate-900">{invoiceToPrint.clienteNombre}</p>
                    </div>

                    <table className="w-full text-left mb-12">
                        <thead>
                            <tr className="border-b-2 border-slate-900">
                                <th className="py-3 text-slate-800 font-bold">Concepto</th>
                                <th className="py-3 text-right text-slate-800 font-bold">Cant.</th>
                                <th className="py-3 text-right text-slate-800 font-bold">Precio U.</th>
                                <th className="py-3 text-right text-slate-800 font-bold">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceToPrint.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-200">
                                    <td className="py-4 text-slate-800 font-medium">{item.producto}</td>
                                    <td className="py-4 text-right text-slate-600">{item.cantidad}</td>
                                    <td className="py-4 text-right text-slate-600">{item.precioUnitario.toFixed(2)}€</td>
                                    <td className="py-4 text-right text-slate-900 font-medium">{(item.cantidad * item.precioUnitario).toFixed(2)}€</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-end">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-slate-600">
                                <span>Base Imponible:</span>
                                <span>{invoiceToPrint.subtotal.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>IVA ({invoiceToPrint.impuestosPorcentaje}%):</span>
                                <span>{(invoiceToPrint.subtotal * (invoiceToPrint.impuestosPorcentaje / 100)).toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between text-2xl font-bold text-slate-900 pt-4 border-t-2 border-slate-900">
                                <span>Total a Pagar:</span>
                                <span>{invoiceToPrint.total.toFixed(2)}€</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-8 max-w-7xl mx-auto print:hidden">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Módulo de Facturación</h2>
                        <p className="text-sm text-slate-500 mt-1">Emite facturas y controla el estado de los cobros.</p>
                    </div>
                    <button
                        onClick={() => setActiveTab('nueva')}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
                    >
                        <Plus size={16} />
                        Nueva Factura
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('historial')}
                            className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'historial'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            <FileText size={18} />
                            Historial de Facturas
                        </button>
                        <button
                            onClick={() => setActiveTab('nueva')}
                            className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'nueva'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            <Plus size={18} />
                            Emisor de Facturas
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">

                    {/* HISTORIAL TAB */}
                    {activeTab === 'historial' && (
                        <div className="space-y-6">
                            {loading ? (
                                <div className="text-center text-slate-500 py-8">Cargando facturas...</div>
                            ) : facturas.length === 0 ? (
                                <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
                                    No hay facturas emitidas ni en borrador.
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Número</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Importe</th>
                                                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Emisión</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {facturas.map(fac => (
                                                <tr key={fac.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{fac.numeroFactura}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{fac.clienteNombre}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 text-right">{fac.total.toFixed(2)}€</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                        ${fac.estado === 'borrador' ? 'bg-slate-100 text-slate-700 border-slate-200' : ''}
                                                        ${fac.estado === 'emitida' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                                        ${fac.estado === 'pagada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                                        ${fac.estado === 'vencida' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                                                    `}>
                                                            {fac.estado.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                        {new Date(fac.fechaEmision).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                        {fac.estado === 'emitida' && (
                                                            <button onClick={() => fac.id && handleMarkAsPaid(fac.id)} className="text-emerald-600 hover:text-emerald-800 p-1" title="Marcar Pagada">
                                                                <CheckCircle size={18} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handlePrintInvoice(fac)} className="text-slate-400 hover:text-slate-600 p-1" title="Imprimir o PDF">
                                                            <Printer size={18} />
                                                        </button>
                                                        <button onClick={() => fac.id && handleDeleteInvoice(fac.id)} className="text-red-400 hover:text-red-600 p-1" title="Eliminar">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* EMISOR TAB */}
                    {activeTab === 'nueva' && (
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm w-full max-w-4xl opacity-100 transition-opacity p-8">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <FileText className="text-blue-600" />
                                    Nueva Factura
                                </h3>
                                <span className="text-sm font-medium text-slate-400">Autogenerado al guardar</span>
                            </div>

                            {/* Top Controls: Client & Linked Order */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Facturar a</label>
                                    <select required value={invoiceData.clienteId} onChange={(e) => {
                                        const c = clientes.find(x => x.id === e.target.value);
                                        setInvoiceData({ ...invoiceData, clienteId: c?.id || '', clienteNombre: c?.nombre || '' });
                                    }} className="w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600 bg-white">
                                        <option value="">-- Seleccionar cliente del directorio --</option>
                                        {clientes.map(cli => <option key={cli.id} value={cli.id}>{cli.nombre}</option>)}
                                    </select>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide flex items-center justify-between">
                                        <span>Importar desde Pedido</span>
                                        <span className="text-amber-600 text-[10px] flex items-center gap-1"><AlertCircle size={10} /> Opcional</span>
                                    </label>
                                    <select value={invoiceData.pedidoOrigenId || ''} onChange={(e) => handleLoadFromOrder(e.target.value)}
                                        className="w-full rounded-md border-0 py-2 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600 bg-white">
                                        <option value="">-- Volcar datos de un pedido --</option>
                                        {pedidos.map(ped => <option key={ped.id} value={ped.id}>{ped.clienteNombre} - {new Date(ped.fechaCreacion).toLocaleDateString()} ({ped.total}€)</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Items Manager */}
                            <div className="mb-8">
                                <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Líneas de Factura</h4>

                                {/* Items Table */}
                                <table className="min-w-full text-sm mb-4">
                                    <thead>
                                        <tr className="text-left text-slate-500 border-b border-slate-200">
                                            <th className="font-medium pb-2 px-2">Concepto</th>
                                            <th className="font-medium pb-2 px-2 text-right w-24">Cant.</th>
                                            <th className="font-medium pb-2 px-2 text-right w-32">Precio U.</th>
                                            <th className="font-medium pb-2 px-2 text-right w-32">Subtotal</th>
                                            <th className="w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {invoiceData.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="py-3 px-2 text-slate-800 font-medium">{item.producto}</td>
                                                <td className="py-3 px-2 text-right text-slate-600">{item.cantidad}</td>
                                                <td className="py-3 px-2 text-right text-slate-600">{item.precioUnitario.toFixed(2)}€</td>
                                                <td className="py-3 px-2 text-right font-medium text-slate-900">{(item.cantidad * item.precioUnitario).toFixed(2)}€</td>
                                                <td className="py-3 px-2 text-right">
                                                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {invoiceData.items.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-6 text-center text-slate-400 italic">No hay ítems en esta factura. Añade manual o importa un pedido.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Add Item Quick Form */}
                                <div className="flex flex-wrap gap-2 items-end bg-blue-50/50 p-3 rounded-md border border-blue-100">
                                    <div className="flex-1 min-w-[200px]">
                                        <input type="text" placeholder="Concepto (ej. Tarta Sacher)" value={currentItemName} onChange={e => setCurrentItemName(e.target.value)} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                    </div>
                                    <div className="w-20">
                                        <input type="number" min="1" placeholder="Cant." value={currentItemQty} onChange={e => setCurrentItemQty(Number(e.target.value))} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                    </div>
                                    <div className="w-28">
                                        <input type="number" min="0" step="0.01" placeholder="Precio U." value={currentItemPrice} onChange={e => setCurrentItemPrice(Number(e.target.value))} className="w-full rounded-md border-0 py-1.5 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-600" />
                                    </div>
                                    <button type="button" onClick={handleAddItem} className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700">Añadir Línea</button>
                                </div>
                            </div>

                            {/* Totals & Tax Footer */}
                            <div className="flex justify-end pt-6 border-t border-slate-200">
                                <div className="w-full max-w-sm space-y-3">
                                    <div className="flex justify-between items-center text-sm text-slate-600">
                                        <span>Base Imponible:</span>
                                        <span className="font-medium">{invoiceData.subtotal.toFixed(2)}€</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-slate-600">
                                        <span className="flex items-center gap-2">
                                            Impuestos (IVA):
                                            <select value={invoiceData.impuestosPorcentaje} onChange={handleTaxChange} className="rounded border-slate-300 py-0.5 px-1 text-xs bg-slate-50">
                                                <option value={21}>21% (General)</option>
                                                <option value={10}>10% (Reducido)</option>
                                                <option value={4}>4% (Superreducido)</option>
                                                <option value={0}>0% (Exento)</option>
                                            </select>
                                        </span>
                                        <span className="font-medium">{(invoiceData.subtotal * (invoiceData.impuestosPorcentaje / 100)).toFixed(2)}€</span>
                                    </div>
                                    <div className="flex justify-between items-center text-lg font-bold text-slate-900 pt-3 border-t border-slate-200">
                                        <span>Total a Pagar:</span>
                                        <span className="text-blue-700">{invoiceData.total.toFixed(2)}€</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-10">
                                <button type="button" onClick={(e) => handleSaveInvoice(e, false)} disabled={invoiceData.items.length === 0 || !invoiceData.clienteId}
                                    className="px-5 py-2.5 text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg disabled:opacity-50">
                                    Guardar como Borrador
                                </button>
                                <button type="button" onClick={(e) => handleSaveInvoice(e, true)} disabled={invoiceData.items.length === 0 || !invoiceData.clienteId}
                                    className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center gap-2">
                                    Emitir Factura
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}
