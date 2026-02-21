"use client";

import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const salesData = [
  { name: 'Lun', ventas: 1200, costes: 800 },
  { name: 'Mar', ventas: 1400, costes: 900 },
  { name: 'Mié', ventas: 1100, costes: 750 },
  { name: 'Jue', ventas: 1800, costes: 1100 },
  { name: 'Vie', ventas: 2200, costes: 1300 },
  { name: 'Sáb', ventas: 2800, costes: 1500 },
  { name: 'Dom', ventas: 3100, costes: 1600 },
];

const recentActivity = [
  { id: 1, action: "Producción completada", item: "Pan de Masa Madre (x50)", time: "hace 10 min", icon: Package, color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: 2, action: "Nuevo pedido", item: "Cafetería Central (#1024)", time: "hace 45 min", icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-50" },
  { id: 3, action: "Alerta de stock", item: "Harina de Fuerza (Quedan 5kg)", time: "hace 2 horas", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  { id: 4, action: "Producción iniciada", item: "Croissants (x120)", time: "hace 3 horas", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
];

export default function Home() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Resumen General</h2>
        <p className="text-sm text-slate-500 mt-1">Monitorea el estado actual de la panadería.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Ingresos (Mes)</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">12,450€</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-emerald-600 font-medium">
              <ArrowUpRight size={16} className="mr-1" />
              +12.5%
            </span>
            <span className="text-slate-400 ml-2">vs mes anterior</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Pedidos Pendientes</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">14</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <ShoppingCart size={20} className="text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-500">
              3 para entregar hoy
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Producción de Hoy</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">345</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Package size={20} className="text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <div className="w-full bg-slate-100 rounded-full h-2 mr-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <span className="text-slate-500 font-medium text-xs">75%</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Alertas Inventario</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">2</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-red-600 font-medium">
              <ArrowDownRight size={16} className="mr-1" />
              Requiere atención
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Flujo de Caja (Últimos 7 días)</h3>
            <select className="text-sm rounded-md border-slate-200 text-slate-600 py-1.5 pl-3 pr-8 bg-slate-50 focus:ring-blue-500 focus:border-blue-500">
              <option>Esta semana</option>
              <option>Este mes</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={salesData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCostes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(value) => `${value}€`} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                  formatter={(value: number) => [`${value}€`]}
                />
                <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                <Area type="monotone" dataKey="costes" name="Costes" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorCostes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Actividad Reciente</h3>
          <div className="space-y-6">
            {recentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex gap-4">
                  <div className={`mt-0.5 p-2 rounded-full h-fit flex-shrink-0 ${activity.bg}`}>
                    <Icon size={16} className={activity.color} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{activity.item}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="w-full mt-8 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors border border-blue-100 rounded-lg hover:bg-blue-50">
            Ver toda la actividad
          </button>
        </div>
      </div>
    </div>
  );
}
