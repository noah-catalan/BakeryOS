"use client";

import { Menu, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTheme } from 'next-themes';

const ROUTE_TITLES: Record<string, string> = {
    '/': 'Dashboard Operativo',
    '/inventario': 'Inventario',
    '/produccion': 'Producción',
    '/clientes': 'Clientes y Pedidos',
    '/facturacion': 'Facturación',
    '/configuracion': 'Configuración'
};

export default function Topbar({ toggleMobile }: { toggleMobile: () => void }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { theme, setTheme, resolvedTheme } = useTheme();
    const title = ROUTE_TITLES[pathname] || 'Panel de control';
    const [businessName, setBusinessName] = useState<string>("Mi Panadería");
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!user) {
            setBusinessName("Mi Panadería");
            return;
        }
        const unsubscribe = onSnapshot(doc(db, "settings", user.uid), (docSnap) => {
            if (docSnap.exists() && docSnap.data().business?.razonSocial) {
                setBusinessName(docSnap.data().business.razonSocial);
            } else {
                setBusinessName("Mi Panadería");
            }
        }, () => {
            // On error (permissions), just use default
            setBusinessName("Mi Panadería");
        });
        return () => unsubscribe();
    }, [user]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const cycleTheme = () => {
        if (resolvedTheme === 'dark') {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    };

    const ThemeIcon = () => {
        if (!mounted) return <Monitor size={18} />;
        if (resolvedTheme === 'dark') return <Moon size={18} />;
        return <Sun size={18} />;
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 md:px-8 print:hidden">
            {/* Left Side: Mobile Menu Toggle & Title */}
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleMobile}
                    className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <Menu size={22} />
                </button>
                <h1 className="text-base font-semibold text-slate-800 dark:text-slate-200 hidden sm:block">
                    {title}
                </h1>
            </div>

            {/* Center: Business Name */}
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-50 absolute left-1/2 -translate-x-1/2 hidden md:block truncate max-w-[280px]">
                {businessName}
            </h1>

            {/* Right Side: Theme + Logout */}
            <div className="flex items-center gap-1">
                {/* Theme Toggle */}
                <button
                    onClick={cycleTheme}
                    className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 hover:text-amber-600 dark:hover:text-amber-400"
                    title={`Tema: ${resolvedTheme === 'dark' ? 'oscuro' : 'claro'}`}
                >
                    <ThemeIcon />
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    title="Cerrar sesión"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-200"
                >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
            </div>
        </header>
    );
}
