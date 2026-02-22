"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  TrendingUp, Package, Clock, AlertTriangle,
  ShoppingCart, CheckCircle, ChefHat, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Invoice } from "@/types/billing";
import { SaleOrder } from "@/types/clients";
import { ProductionOrder } from "@/types/production";
import { Ingredient } from "@/types/inventory";

export default function Home() {
  const { user } = useAuth();
  // KPI Data
  const [ingresosMes, setIngresosMes] = useState(0);
  const [pedidosPendientes, setPedidosPendientes] = useState(0);
  const [ordenesEnProceso, setOrdenesEnProceso] = useState(0);
  const [alertasStock, setAlertasStock] = useState<Ingredient[]>([]);
  const [ultimosPedidos, setUltimosPedidos] = useState<SaleOrder[]>([]);

  // For Chart
  const [salesData, setSalesData] = useState<{ name: string, ventas: number }[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Ingresos y Gráfico
    const qFacturas = query(collection(db, "facturas"), where("userId", "==", user.uid));
    const unsubscribeFacturas = onSnapshot(qFacturas, (snapshot) => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      let ingresos = 0;
      const facturasValidas = snapshot.docs.map(doc => doc.data() as Invoice)
        .filter(fac => (fac.estado === 'emitida' || fac.estado === 'pagada'));

      // Calculate this month's revenue
      facturasValidas.forEach(fac => {
        if (fac.fechaEmision >= startOfMonth.getTime()) {
          ingresos += fac.total;
        }
      });
      setIngresosMes(ingresos);

      // Calculate Last 7 Days for Chart
      const chartMap = new Map();
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('es-ES', { weekday: 'short' }); // "lun", "mar", etc.
        chartMap.set(dateStr, 0);
      }

      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      facturasValidas.forEach(fac => {
        if (fac.fechaEmision >= sevenDaysAgo.getTime()) {
          const facDateStr = new Date(fac.fechaEmision).toLocaleDateString('es-ES', { weekday: 'short' });
          if (chartMap.has(facDateStr)) {
            chartMap.set(facDateStr, chartMap.get(facDateStr) + fac.total);
          }
        }
      });

      const newChartData = Array.from(chartMap.entries()).map(([name, ventas]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        ventas
      }));
      setSalesData(newChartData);

    });

    // 2. Pedidos Pendientes & Últimos Pedidos
    const qPedidos = query(collection(db, "pedidosVenta"), where("userId", "==", user.uid));
    const unsubscribePedidos = onSnapshot(qPedidos, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SaleOrder[];

      // Pending count
      const pendientesCount = data.filter(p => p.estado === 'pendiente').length;
      setPedidosPendientes(pendientesCount);

      // Latest 5
      data.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
      setUltimosPedidos(data.slice(0, 5));
    });

    // 3. Órdenes de Producción Activas
    const qProduccion = query(collection(db, "ordenesProduccion"), where("userId", "==", user.uid));
    const unsubscribeProduccion = onSnapshot(qProduccion, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as ProductionOrder);
      const enProcesoCount = data.filter(o => o.estado === 'pendiente' || o.estado === 'enProceso').length;
      setOrdenesEnProceso(enProcesoCount);
    });

    // 4. Inventario - Alertas de Stock
    const qInventario = query(collection(db, "ingredientes"), where("userId", "==", user.uid));
    const unsubscribeInventario = onSnapshot(qInventario, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ingredient[];
      const kriticos = data.filter(ing => ing.stockActual <= ing.stockMinimo);
      kriticos.sort((a, b) => (a.stockActual / a.stockMinimo) - (b.stockActual / b.stockMinimo));
      setAlertasStock(kriticos);

      setLoading(false);
    });

    return () => {
      unsubscribeFacturas();
      unsubscribePedidos();
      unsubscribeProduccion();
      unsubscribeInventario();
    };
  }, [user]);

  const handleSeedData = async () => {
    if (!confirm("⚠️ ¿Estás seguro de que quieres BORRAR TODOS LOS DATOS (Ingredientes, Clientes, Recetas) preexistentes y generar el Demo realista?")) return;
    setLoading(true);

    try {
      const batch = writeBatch(db);

      // 1. Borrar colecciones actuales del usuario
      const colsToClear = ["ingredientes", "clientes", "recetas", "ordenesProduccion", "pedidosVenta", "facturas"];
      for (const colName of colsToClear) {
        const q = query(collection(db, colName), where("userId", "==", user?.uid));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(d => {
          batch.delete(doc(db, colName, d.id));
        });
      }

      // 2. Poblar Ingredientes (6)
      const demoIngredientes = [
        { nombre: "Harina de Fuerza T80", SKU: "HAR-001", categoria: "Harinas", stockActual: 120, stockMinimo: 50, unidad: "kg", estado: "ok", ultimaAct: Date.now(), userId: user?.uid },
        { nombre: "Levadura Fresca", SKU: "LEV-001", categoria: "Levaduras", stockActual: 2, stockMinimo: 5, unidad: "kg", estado: "bajo", ultimaAct: Date.now(), userId: user?.uid },
        { nombre: "Mantequilla Extra 82%", SKU: "MAN-001", categoria: "Lácteos", stockActual: 15, stockMinimo: 20, unidad: "kg", estado: "bajo", ultimaAct: Date.now(), userId: user?.uid },
        { nombre: "Sal Fina", SKU: "SAL-001", categoria: "Otros", stockActual: 25, stockMinimo: 10, unidad: "kg", estado: "ok", ultimaAct: Date.now(), userId: user?.uid },
        { nombre: "Azúcar Blanco", SKU: "AZU-001", categoria: "Otros", stockActual: 40, stockMinimo: 15, unidad: "kg", estado: "ok", ultimaAct: Date.now(), userId: user?.uid },
        { nombre: "Chips de Chocolate 54%", SKU: "CHO-001", categoria: "Chocolates", stockActual: 8, stockMinimo: 10, unidad: "kg", estado: "bajo", ultimaAct: Date.now(), userId: user?.uid }
      ];

      const ingRefs = demoIngredientes.map(ing => {
        const ref = doc(collection(db, "ingredientes"));
        batch.set(ref, ing);
        return { id: ref.id, nombre: ing.nombre, unidad: ing.unidad };
      });

      // 3. Poblar Clientes (3)
      const demoClientes = [
        { nombre: "Cafetería Central", tipo: "B2B", email: "pedidos@cafecentral.com", telefono: "600123456", direccion: "Gran Vía 12", ultimaAct: Date.now(), userId: user?.uid },
        { nombre: "Hotel Miramar*****", tipo: "B2B", email: "cocina@miramar.com", telefono: "611987654", direccion: "Paseo Marítimo 1", ultimaAct: Date.now(), userId: user?.uid },
        { nombre: "Restaurante El Puerto", tipo: "B2B", email: "info@elpuerto.es", telefono: "622334455", direccion: "Muelle 4", ultimaAct: Date.now(), userId: user?.uid }
      ];
      demoClientes.forEach(cli => {
        const ref = doc(collection(db, "clientes"));
        batch.set(ref, cli);
      });

      // 4. Poblar Recetas (3)
      const demoRecetas = [
        {
          nombre: "Barra Rústica", mermasPermitidas: 2, ultimaAct: Date.now(), userId: user?.uid,
          rendimiento: 50, tiempoEstimado: 240, costeProduccion: 5.25,
          ingredientes_necesarios: [
            { ingredienteId: ingRefs[0].id, nombre: ingRefs[0].nombre, cantidad: 12.5, unidad: ingRefs[0].unidad },
            { ingredienteId: ingRefs[1].id, nombre: ingRefs[1].nombre, cantidad: 0.25, unidad: ingRefs[1].unidad },
            { ingredienteId: ingRefs[3].id, nombre: ingRefs[3].nombre, cantidad: 0.25, unidad: ingRefs[3].unidad }
          ]
        },
        {
          nombre: "Croissant de Mantequilla", mermasPermitidas: 5, ultimaAct: Date.now(), userId: user?.uid,
          rendimiento: 40, tiempoEstimado: 180, costeProduccion: 16.40,
          ingredientes_necesarios: [
            { ingredienteId: ingRefs[0].id, nombre: ingRefs[0].nombre, cantidad: 2.5, unidad: ingRefs[0].unidad },
            { ingredienteId: ingRefs[1].id, nombre: ingRefs[1].nombre, cantidad: 0.1, unidad: ingRefs[1].unidad },
            { ingredienteId: ingRefs[2].id, nombre: ingRefs[2].nombre, cantidad: 1.25, unidad: ingRefs[2].unidad },
            { ingredienteId: ingRefs[4].id, nombre: ingRefs[4].nombre, cantidad: 0.25, unidad: ingRefs[4].unidad }
          ]
        },
        {
          nombre: "Napolitana de Chocolate", mermasPermitidas: 5, ultimaAct: Date.now(), userId: user?.uid,
          rendimiento: 35, tiempoEstimado: 190, costeProduccion: 18.20,
          ingredientes_necesarios: [
            { ingredienteId: ingRefs[0].id, nombre: ingRefs[0].nombre, cantidad: 2.5, unidad: ingRefs[0].unidad },
            { ingredienteId: ingRefs[2].id, nombre: ingRefs[2].nombre, cantidad: 1.25, unidad: ingRefs[2].unidad },
            { ingredienteId: ingRefs[5].id, nombre: ingRefs[5].nombre, cantidad: 0.8, unidad: ingRefs[5].unidad }
          ]
        }
      ];
      demoRecetas.forEach(rec => {
        const ref = doc(collection(db, "recetas"));
        batch.set(ref, rec);
      });

      await batch.commit();
      alert("✅ Datos Demo generados correctamente.");
    } catch (error) {
      console.error(error);
      alert("❌ Error generando datos demo.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando tablero y métricas...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Panel de Control Operativo</h2>
          <p className="text-sm text-slate-500 mt-1">Resumen de la actividad en tiempo real de BakeryOS.</p>
        </div>
        <button
          onClick={handleSeedData}
          className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          title="Poblar base de datos con información realista"
        >
          Generar Datos Demo
        </button>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Ingresos (Mes)</p>
            <h3 className="text-2xl font-bold text-slate-900">{ingresosMes.toFixed(2)}€</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Pedidos Pendientes</p>
            <h3 className="text-2xl font-bold text-slate-900">{pedidosPendientes}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <ChefHat size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Producción en Curso</p>
            <h3 className="text-2xl font-bold text-slate-900">{ordenesEnProceso}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow" title={alertasStock.length > 0 ? "Requiere atención prioritaria" : "Inventario saludable"}>
          <div className={`p-3 rounded-lg ${alertasStock.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
            {alertasStock.length > 0 ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Alertas Stock</p>
            <h3 className={`text-2xl font-bold ${alertasStock.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>{alertasStock.length}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* CHART & RECENT ORDERS */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Facturación (Últimos 7 días)</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(value) => `${value}€`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [`${value}€`]} />
                  <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Últimos Pedidos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="text-blue-600" size={18} />
                Últimos Pedidos de Venta
              </h3>
              <Link href="/clientes" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>
            <div className="flex-1 p-0 overflow-x-auto">
              {ultimosPedidos.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No hay pedidos recientes en la base de datos.</div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100">
                  <tbody className="divide-y divide-slate-100">
                    {ultimosPedidos.map((pedido) => (
                      <tr key={pedido.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-slate-900 w-1/3">
                          {pedido.clienteNombre}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">
                          {new Date(pedido.fechaCreacion).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-slate-800 text-right">
                          {pedido.total.toFixed(2)}€
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider
                                                        ${pedido.estado === 'pendiente' ? 'bg-amber-100 text-amber-800' : ''}
                                                        ${pedido.estado === 'entregado' ? 'bg-emerald-100 text-emerald-800' : ''}
                                                        ${pedido.estado === 'cancelado' ? 'bg-red-100 text-red-800' : ''}
                                                    `}>
                            {pedido.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ALERTAS DE STOCK CRÍTICO */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-fit">
          <div className="p-5 border-b border-red-50 flex items-center justify-between bg-red-50/30">
            <h3 className="font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle size={18} />
              Stock Crítico Prio.
            </h3>
            <Link href="/inventario" className="text-sm text-red-600 hover:text-red-800 font-medium">Revisar Repo.</Link>
          </div>
          <div className="flex-1 p-0">
            {alertasStock.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                <CheckCircle className="text-emerald-500 mb-1" size={24} />
                Inventario saludable.<br />Sin alertas de compra hoy.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {alertasStock.slice(0, 8).map((ing) => (
                  <li key={ing.id} className="p-4 hover:bg-slate-50 flex flex-col transition-colors border-l-4 border-red-400">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-slate-800 text-sm">{ing.nombre}</p>
                      <p className="font-bold text-red-600">{ing.stockActual} <span className="text-xs font-normal">{ing.unidad}</span></p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Min: {ing.stockMinimo} {ing.unidad}</span>
                      <span className="text-xs font-medium text-red-500 uppercase tracking-tighter">Bajo Mínimos</span>
                    </div>
                  </li>
                ))}
                {alertasStock.length > 8 && (
                  <li className="p-3 text-center bg-slate-50 border-t border-slate-100">
                    <Link href="/inventario" className="text-xs font-bold text-slate-500 hover:text-red-600">
                      + {alertasStock.length - 8} ingredientes más en alerta
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
