"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard,
    Package,
    ChefHat,
    Users,
    FileText,
    Settings,
    UserCircle,
    Menu,
    ChevronLeft
} from 'lucide-react';

export default function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside className={`relative z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Logo Area */}
            <div className={`flex h-16 items-center border-b border-slate-200 ${isCollapsed ? 'justify-center' : 'px-6 justify-between'}`}>
                {!isCollapsed && (
                    <Link href="/" className="flex items-center gap-2 overflow-hidden">
                        <div className="rounded-md bg-blue-600 p-1.5 text-white flex-shrink-0">
                            {/* Bakery Icon Approximation */}
                            <ChefHat size={20} fill="currentColor" />
                        </div>
                        <div className="flex-shrink-0">
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">BakeryOS</h1>
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">ERP Panaderías v1.0</p>
                        </div>
                    </Link>
                )}

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                >
                    {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
                <nav className={`space-y-6 ${isCollapsed ? 'px-2' : 'px-3'}`}>
                    {/* Operativa Category */}
                    <div>
                        <h2 className={`mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100'}`}>
                            Operativa
                        </h2>
                        <div className="space-y-1">
                            <Link
                                href="/"
                                title="Dashboard"
                                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} rounded-md bg-blue-50 py-2 text-sm font-medium text-blue-700 transition-colors`}
                            >
                                <LayoutDashboard size={18} className="flex-shrink-0" />
                                {!isCollapsed && (
                                    <>
                                        <span className="whitespace-nowrap">Dashboard</span>
                                        <div className="ml-auto w-1 h-5 bg-blue-600 rounded-full" />
                                    </>
                                )}
                            </Link>
                            <Link
                                href="/inventario"
                                title="Inventario"
                                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
                            >
                                <Package size={18} className="flex-shrink-0" />
                                {!isCollapsed && <span className="whitespace-nowrap">Inventario</span>}
                            </Link>
                            <Link
                                href="/produccion"
                                title="Producción"
                                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
                            >
                                <ChefHat size={18} className="flex-shrink-0" />
                                {!isCollapsed && <span className="whitespace-nowrap">Producción</span>}
                            </Link>
                            <Link
                                href="/clientes"
                                title="Clientes y Pedidos"
                                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
                            >
                                <Users size={18} className="flex-shrink-0" />
                                {!isCollapsed && <span className="whitespace-nowrap">Clientes y Pedidos</span>}
                            </Link>
                        </div>
                    </div>

                    {/* Administración Category */}
                    <div>
                        <h2 className={`mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100'}`}>
                            Administración
                        </h2>
                        <div className="space-y-1">
                            <Link
                                href="/facturacion"
                                title="Facturación"
                                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
                            >
                                <FileText size={18} className="flex-shrink-0" />
                                {!isCollapsed && <span className="whitespace-nowrap">Facturación</span>}
                            </Link>
                            <Link
                                href="/configuracion"
                                title="Configuración"
                                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
                            >
                                <Settings size={18} className="flex-shrink-0" />
                                {!isCollapsed && <span className="whitespace-nowrap">Configuración</span>}
                            </Link>
                        </div>
                    </div>
                </nav>
            </div>

            {/* User Profile */}
            <div className="border-t border-slate-200 p-4">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-md ${isCollapsed ? 'p-1' : 'p-2'} hover:bg-slate-50 cursor-pointer`}>
                    <UserCircle size={36} className="text-slate-400 flex-shrink-0" />
                    {!isCollapsed && (
                        <div className="flex flex-col whitespace-nowrap overflow-hidden">
                            <span className="text-sm font-semibold text-slate-900">Noah Catalán</span>
                            <span className="text-xs text-slate-500">Admin</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
