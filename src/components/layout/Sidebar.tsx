"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    ChefHat,
    Users,
    FileText,
    Settings,
    UserCircle,
    Menu,
    ChevronLeft,
    X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (val: boolean) => void;
}

export default function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const sidebarRef = useRef<HTMLElement>(null);
    const pathname = usePathname();
    const { user } = useAuth();

    const [profileName, setProfileName] = useState<string>("Usuario");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Fetch user settings
    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSnapshot(doc(db, "settings", user.uid), (docSnap) => {
            if (docSnap.exists() && docSnap.data().user) {
                const userData = docSnap.data().user;
                setProfileName(userData.nombre || user.displayName || user.email?.split('@')[0] || "Usuario");
                setAvatarUrl(userData.avatarUrl || user.photoURL || null);
            } else {
                setProfileName(user.displayName || user.email?.split('@')[0] || "Usuario");
                setAvatarUrl(user.photoURL || null);
            }
        });
        return () => unsubscribe();
    }, [user]);

    // Close sidebar on outside click if it's open (not collapsed)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && !isCollapsed) {
                // Actually, if it's desktop it shouldn't auto close maybe? The user prompt said:
                // "si la barra lateral está desplegada y el usuario hace clic fuera de ella, se pliegue automáticamente."
                setIsCollapsed(true);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isCollapsed]);

    // Active state helper
    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname?.startsWith(path);
    };

    // Auto-close on mobile when link is clicked
    const handleLinkClick = () => {
        if (isMobileOpen) {
            setIsMobileOpen(false);
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside
                ref={sidebarRef}
                className={`
                    fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out print:hidden
                    md:relative md:translate-x-0
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                    ${isCollapsed ? 'md:w-20' : 'w-64'}
                `}
            >
                {/* Logo Area */}
                <div className={`flex h-16 items-center border-b border-slate-200 dark:border-slate-800 ${isCollapsed ? 'justify-center' : 'px-6 justify-between'}`}>
                    {!isCollapsed && (
                        <Link href="/" className="flex items-center gap-2 overflow-hidden">
                            <div className="rounded-md bg-blue-600 p-1.5 text-white flex-shrink-0">
                                {/* Bakery Icon Approximation */}
                                <ChefHat size={20} fill="currentColor" />
                            </div>
                            <div className="flex-shrink-0">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight">BakeryOS</h1>
                                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">ERP Panaderías v1.0</p>
                            </div>
                        </Link>
                    )}

                    <button
                        onClick={() => {
                            if (window.innerWidth < 768) {
                                setIsMobileOpen(false);
                            } else {
                                setIsCollapsed(!isCollapsed);
                            }
                        }}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        <span className="md:hidden"><X size={20} /></span>
                        <span className="hidden md:inline">{isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}</span>
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
                                    onClick={handleLinkClick}
                                    title="Dashboard"
                                    className={`flex items-center ${isCollapsed ? 'md:justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium transition-colors ${isActive('/') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'}`}
                                >
                                    <LayoutDashboard size={18} className="flex-shrink-0" />
                                    {!isCollapsed && (
                                        <>
                                            <span className="whitespace-nowrap">Dashboard</span>
                                            {isActive('/') && <div className="ml-auto w-1 h-5 bg-blue-600 rounded-full" />}
                                        </>
                                    )}
                                </Link>
                                <Link
                                    href="/inventario"
                                    onClick={handleLinkClick}
                                    title="Inventario"
                                    className={`flex items-center ${isCollapsed ? 'md:justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium transition-colors ${isActive('/inventario') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'}`}
                                >
                                    <Package size={18} className="flex-shrink-0" />
                                    {!isCollapsed && (
                                        <>
                                            <span className="whitespace-nowrap">Inventario</span>
                                            {isActive('/inventario') && <div className="ml-auto w-1 h-5 bg-blue-600 rounded-full" />}
                                        </>
                                    )}
                                </Link>
                                <Link
                                    href="/produccion"
                                    onClick={handleLinkClick}
                                    title="Producción"
                                    className={`flex items-center ${isCollapsed ? 'md:justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium transition-colors ${isActive('/produccion') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'}`}
                                >
                                    <ChefHat size={18} className="flex-shrink-0" />
                                    {!isCollapsed && (
                                        <>
                                            <span className="whitespace-nowrap">Producción</span>
                                            {isActive('/produccion') && <div className="ml-auto w-1 h-5 bg-blue-600 rounded-full" />}
                                        </>
                                    )}
                                </Link>
                                <Link
                                    href="/clientes"
                                    onClick={handleLinkClick}
                                    title="Clientes y Pedidos"
                                    className={`flex items-center ${isCollapsed ? 'md:justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium transition-colors ${isActive('/clientes') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'}`}
                                >
                                    <Users size={18} className="flex-shrink-0" />
                                    {!isCollapsed && (
                                        <>
                                            <span className="whitespace-nowrap">Clientes y Pedidos</span>
                                            {isActive('/clientes') && <div className="ml-auto w-1 h-5 bg-blue-600 rounded-full" />}
                                        </>
                                    )}
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
                                    onClick={handleLinkClick}
                                    title="Facturación"
                                    className={`flex items-center ${isCollapsed ? 'md:justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium transition-colors ${isActive('/facturacion') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'}`}
                                >
                                    <FileText size={18} className="flex-shrink-0" />
                                    {!isCollapsed && (
                                        <>
                                            <span className="whitespace-nowrap">Facturación</span>
                                            {isActive('/facturacion') && <div className="ml-auto w-1 h-5 bg-blue-600 rounded-full" />}
                                        </>
                                    )}
                                </Link>
                                <Link
                                    href="/configuracion"
                                    onClick={handleLinkClick}
                                    title="Configuración"
                                    className={`flex items-center ${isCollapsed ? 'md:justify-center px-0' : 'gap-3 px-3'} rounded-md py-2 text-sm font-medium transition-colors ${isActive('/configuracion') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'}`}
                                >
                                    <Settings size={18} className="flex-shrink-0" />
                                    {!isCollapsed && (
                                        <>
                                            <span className="whitespace-nowrap">Configuración</span>
                                            {isActive('/configuracion') && <div className="ml-auto w-1 h-5 bg-blue-600 rounded-full" />}
                                        </>
                                    )}
                                </Link>
                            </div>
                        </div>
                    </nav>
                </div>

                {/* User Profile */}
                <div className="border-t border-slate-200 dark:border-slate-800 p-4">
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-md ${isCollapsed ? 'p-1' : 'p-2'} hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer`}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-slate-800" />
                        ) : (
                            <UserCircle size={36} className="text-slate-400 flex-shrink-0" />
                        )}
                        {!isCollapsed && (
                            <div className="flex flex-col whitespace-nowrap overflow-hidden">
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{profileName}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Admin</span>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
