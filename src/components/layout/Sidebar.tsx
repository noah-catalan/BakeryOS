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
    X,
    Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SidebarProps {
    isMobileOpen: boolean;
    setIsMobileOpen: (val: boolean) => void;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
    title: string;
}

const NAV_OPERATIVA: NavItem[] = [
    { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, title: 'Dashboard' },
    { href: '/inventario', label: 'Inventario', icon: <Package size={18} />, title: 'Inventario' },
    { href: '/produccion', label: 'Producción', icon: <ChefHat size={18} />, title: 'Producción' },
    { href: '/clientes', label: 'Clientes y Pedidos', icon: <Users size={18} />, title: 'Clientes y Pedidos' },
    { href: '/asistente', label: 'Asistente IA', icon: <Sparkles size={18} />, title: 'Asistente IA' },
];

const NAV_ADMIN: NavItem[] = [
    { href: '/facturacion', label: 'Facturación', icon: <FileText size={18} />, title: 'Facturación' },
    { href: '/configuracion', label: 'Configuración', icon: <Settings size={18} />, title: 'Configuración' },
];

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
        }, () => {
            // On error (permissions), use fallback
            setProfileName(user.displayName || user.email?.split('@')[0] || "Usuario");
            setAvatarUrl(user.photoURL || null);
        });
        return () => unsubscribe();
    }, [user]);

    // Close sidebar on outside click if it's open (not collapsed)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && !isCollapsed) {
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

    const renderNavItem = (item: NavItem) => {
        const active = isActive(item.href);
        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                title={item.title}
                className={`group relative flex items-center ${isCollapsed ? 'md:justify-center px-2' : 'gap-3 px-3'} rounded-xl py-2.5 text-sm font-medium transition-all duration-200
                    ${active
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 dark:from-amber-950/40 dark:to-orange-950/30 dark:text-amber-400 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                    }`}
            >
                <span className={`flex-shrink-0 transition-colors duration-200 ${active ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                    {item.icon}
                </span>
                {!isCollapsed && (
                    <>
                        <span className="whitespace-nowrap">{item.label}</span>
                        {active && <div className="ml-auto w-1.5 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full" />}
                    </>
                )}
                {/* Tooltip when collapsed */}
                {isCollapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50 pointer-events-none hidden md:block">
                        {item.label}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside
                ref={sidebarRef}
                className={`
                    fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out print:hidden
                    md:relative md:translate-x-0
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                    ${isCollapsed ? 'md:w-[68px]' : 'w-64'}
                `}
            >
                {/* Logo Area */}
                <div className={`flex h-16 items-center border-b border-slate-200 dark:border-slate-800 ${isCollapsed ? 'justify-center px-2' : 'px-5 justify-between'}`}>
                    {!isCollapsed && (
                        <Link href="/" className="flex items-center gap-2.5 overflow-hidden group">
                            <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2 text-white flex-shrink-0 shadow-md shadow-amber-500/20 group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-shadow duration-200">
                                <ChefHat size={18} />
                            </div>
                            <div className="flex-shrink-0">
                                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50 leading-tight tracking-tight">BakeryOS</h1>
                                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">ERP Panaderías</p>
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
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200"
                    >
                        <span className="md:hidden"><X size={20} /></span>
                        <span className="hidden md:inline"><span className={`block transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>{isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}</span></span>
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-5 overflow-x-hidden">
                    <nav className={`space-y-6 ${isCollapsed ? 'px-2' : 'px-3'}`}>
                        {/* Operativa Category */}
                        <div>
                            <h2 className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100'}`}>
                                Operativa
                            </h2>
                            <div className="space-y-1">
                                {NAV_OPERATIVA.map(renderNavItem)}
                            </div>
                        </div>

                        {/* Administración Category */}
                        <div>
                            <h2 className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 transition-all duration-300 whitespace-nowrap ${isCollapsed ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100'}`}>
                                Administración
                            </h2>
                            <div className="space-y-1">
                                {NAV_ADMIN.map(renderNavItem)}
                            </div>
                        </div>
                    </nav>
                </div>

                {/* User Profile */}
                <div className="border-t border-slate-200 dark:border-slate-800 p-3">
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-xl ${isCollapsed ? 'p-2' : 'p-2.5'} hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors duration-200`}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-slate-200 dark:border-slate-700 ring-2 ring-white dark:ring-slate-900" />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow-sm">
                                {profileName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        {!isCollapsed && (
                            <div className="flex flex-col whitespace-nowrap overflow-hidden">
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">{profileName}</span>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Administrador</span>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
