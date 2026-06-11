"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  TrendingUp, Package, Clock, AlertTriangle,
  ShoppingCart, CheckCircle, ChefHat, ArrowRight, Sparkles
} from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Invoice } from "@/types/billing";
import { SaleOrder } from "@/types/clients";
import { ProductionOrder } from "@/types/production";
import { Ingredient } from "@/types/inventory";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 7) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/* ── Skeleton Components ── */
function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start gap-4">
          <div className="skeleton w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-7 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="skeleton h-5 w-48 rounded mb-6" />
      <div className="skeleton h-64 w-full rounded-xl" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="skeleton h-5 w-40 rounded" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-4 w-20 rounded ml-auto" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const toast = useToast();
  const [ingresosMes, setIngresosMes] = useState(0);
  const [pedidosPendientes, setPedidosPendientes] = useState(0);
  const [ordenesEnProceso, setOrdenesEnProceso] = useState(0);
  const [alertasStock, setAlertasStock] = useState<Ingredient[]>([]);
  const [ultimosPedidos, setUltimosPedidos] = useState<SaleOrder[]>([]);
  const [salesData, setSalesData] = useState<{ name: string, ventas: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const qFacturas = query(collection(db, "facturas"), where("userId", "==", user.uid));
    const unsubscribeFacturas = onSnapshot(qFacturas, (snapshot) => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      let ingresos = 0;
      const facturasValidas = snapshot.docs.map(doc => doc.data() as Invoice)
        .filter(fac => (fac.estado === 'emitida' || fac.estado === 'pagada'));

      facturasValidas.forEach(fac => {
        if (fac.fechaEmision >= startOfMonth.getTime()) ingresos += fac.total;
      });
      setIngresosMes(ingresos);

      const chartMap = new Map();
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('es-ES', { weekday: 'short' });
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

    const qPedidos = query(collection(db, "pedidosVenta"), where("userId", "==", user.uid));
    const unsubscribePedidos = onSnapshot(qPedidos, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SaleOrder[];
      setPedidosPendientes(data.filter(p => p.estado === 'pendiente').length);
      data.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
      setUltimosPedidos(data.slice(0, 5));
    });

    const qProduccion = query(collection(db, "ordenesProduccion"), where("userId", "==", user.uid));
    const unsubscribeProduccion = onSnapshot(qProduccion, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as ProductionOrder);
      setOrdenesEnProceso(data.filter(o => o.estado === 'pendiente' || o.estado === 'enProceso').length);
    });

    const qInventario = query(collection(db, "ingredientes"), where("userId", "==", user.uid));
    const unsubscribeInventario = onSnapshot(qInventario, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ingredient[];
      const kriticos = data.filter(ing => Number(Number(ing.stockActual || 0).toFixed(2)) <= Number(Number(ing.stockMinimo || 0).toFixed(2)));
      kriticos.sort((a, b) => (Number(Number(a.stockActual || 0).toFixed(2)) / Number(Number(a.stockMinimo || 0).toFixed(2))) - (Number(Number(b.stockActual || 0).toFixed(2)) / Number(Number(b.stockMinimo || 0).toFixed(2))));
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
    if (!confirm("⚠️ ¿Estás seguro de que quieres BORRAR TODOS LOS DATOS y generar el Demo realista?")) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const colsToClear = ["ingredientes", "clientes", "recetas", "ordenesProduccion", "pedidosVenta", "facturas"];
      for (const colName of colsToClear) {
        const q = query(collection(db, colName), where("userId", "==", user?.uid));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(d => { batch.delete(doc(db, colName, d.id)); });
      }

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

      const demoClientes = [
        { nombre: "Cafetería Central", tipo: "B2B", email: "pedidos@cafecentral.com", telefono: "600123456", direccion: "Gran Vía 12", ultimaAct: Date.now(), userId: user?.uid },
        { nombre: "Hotel Miramar*****", tipo: "B2B", email: "cocina@miramar.com", telefono: "611987654", direccion: "Paseo Marítimo 1", ultimaAct: Date.now(), userId: user?.uid },
        { nombre: "Restaurante El Puerto", tipo: "B2B", email: "info@elpuerto.es", telefono: "622334455", direccion: "Muelle 4", ultimaAct: Date.now(), userId: user?.uid }
      ];
      demoClientes.forEach(cli => { batch.set(doc(collection(db, "clientes")), cli); });

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
      demoRecetas.forEach(rec => { batch.set(doc(collection(db, "recetas")), rec); });

      await batch.commit();
      toast.success("Datos Demo generados correctamente.");
    } catch (error) {
      console.error(error);
      toast.error("Error generando datos demo.");
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    { label: "Ingresos (Mes)", value: `${ingresosMes.toFixed(2)}€`, icon: <TrendingUp size={22} />, gradient: "from-emerald-500 to-teal-600", bgLight: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Pedidos Pendientes", value: pedidosPendientes, icon: <ShoppingCart size={22} />, gradient: "from-blue-500 to-indigo-600", bgLight: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Producción en Curso", value: ordenesEnProceso, icon: <ChefHat size={22} />, gradient: "from-violet-500 to-purple-600", bgLight: "bg-violet-50 dark:bg-violet-950/30" },
    { label: "Alertas Stock", value: alertasStock.length, icon: alertasStock.length > 0 ? <AlertTriangle size={22} /> : <CheckCircle size={22} />, gradient: alertasStock.length > 0 ? "from-red-500 to-rose-600" : "from-slate-400 to-slate-500", bgLight: alertasStock.length > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-slate-50 dark:bg-slate-800/30" },
  ];

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="skeleton h-8 w-72 rounded-lg" />
        <KPISkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8"><ChartSkeleton /><TableSkeleton /></div>
          <div><TableSkeleton /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-down">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            {getGreeting()} <span className="text-amber-500">👋</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Resumen de la actividad en tiempo real de BakeryOS.</p>
        </div>
        <button
          onClick={handleSeedData}
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm flex items-center gap-2"
        >
          <Sparkles size={14} />
          Generar Demo
        </button>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((kpi, i) => (
          <div key={i} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-slide-up stagger-${i + 1}`}>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.gradient} text-white shadow-sm`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{kpi.label}</p>
              <h3 className={`text-2xl font-bold animate-count-up ${kpi.label === "Alertas Stock" && alertasStock.length > 0 ? 'text-red-600' : 'text-slate-900 dark:text-slate-50'}`}>{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-slide-up stagger-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-50 mb-6">Facturación — Últimos 7 días</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.06} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} tickFormatter={(value) => `${value}€`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }} formatter={(value: any) => [`${value}€`, 'Ventas']} />
                  <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-slide-up stagger-4">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="font-bold text-slate-800 dark:text-slate-50 flex items-center gap-2 text-sm">
                <Clock className="text-blue-500" size={16} />
                Últimos Pedidos de Venta
              </h3>
              <Link href="/clientes" className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 transition-colors">
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              {ultimosPedidos.length === 0 ? (
                <div className="p-10 text-center">
                  <ShoppingCart className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={32} />
                  <p className="text-sm text-slate-400 dark:text-slate-500">No hay pedidos recientes.</p>
                  <Link href="/clientes" className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-2 inline-block">Crear primer pedido →</Link>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ultimosPedidos.map((pedido) => (
                      <tr key={pedido.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-slate-50 w-1/3">{pedido.clienteNombre}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(pedido.fechaCreacion).toLocaleDateString()}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-slate-800 dark:text-slate-50 text-right">{pedido.total.toFixed(2)}€</td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
                            ${pedido.estado === 'pendiente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' : ''}
                            ${pedido.estado === 'entregado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : ''}
                            ${pedido.estado === 'cancelado' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' : ''}
                          `}>{pedido.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-fit animate-slide-up stagger-5">
          <div className={`p-5 border-b flex items-center justify-between ${alertasStock.length > 0 ? 'border-red-100 dark:border-red-900/30 bg-red-50/40 dark:bg-red-950/20' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'}`}>
            <h3 className={`font-bold flex items-center gap-2 text-sm ${alertasStock.length > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
              {alertasStock.length > 0 ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
              Stock Crítico
            </h3>
            <Link href="/inventario" className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold transition-colors">Revisar</Link>
          </div>
          <div>
            {alertasStock.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle className="mx-auto text-emerald-400 mb-3" size={32} />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Inventario saludable</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Sin alertas de compra hoy.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {alertasStock.slice(0, 8).map((ing) => (
                  <li key={ing.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex flex-col transition-colors border-l-4 border-red-400 dark:border-red-500">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-slate-800 dark:text-slate-50 text-sm">{ing.nombre}</p>
                      <p className="font-bold text-red-600 dark:text-red-400">{Number((ing.stockActual || 0).toFixed(2))} <span className="text-xs font-normal">{ing.unidad}</span></p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Min: {Number((ing.stockMinimo || 0).toFixed(2))} {ing.unidad}</span>
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Bajo Mínimos</span>
                    </div>
                  </li>
                ))}
                {alertasStock.length > 8 && (
                  <li className="p-3 text-center bg-slate-50 dark:bg-slate-800/30">
                    <Link href="/inventario" className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600">
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
