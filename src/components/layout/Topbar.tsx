"use client";

import { Menu, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

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
    const title = ROUTE_TITLES[pathname] || 'Panel de control';
    const [businessName, setBusinessName] = useState<string>("Cargando...");

    useEffect(() => {
        if (!user) {
            setBusinessName("Panel de Control");
            return;
        }
        const unsubscribe = onSnapshot(doc(db, "settings", user.uid), (docSnap) => {
            if (docSnap.exists() && docSnap.data().business?.razonSocial) {
                setBusinessName(docSnap.data().business.razonSocial);
            } else {
                setBusinessName("Mi Panadería");
            }
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

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white dark:bg-slate-900 px-4 md:px-8 shadow-sm print:hidden">
            {/* Left Side: Mobile Menu Toggle & Title */}
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleMobile}
                    className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                >
                    <Menu size={24} />
                </button>
                <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">
                    {title}
                </h1>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 absolute left-1/2 -translate-x-1/2 hidden md:block">
                {businessName}
            </h1>

            {/* Right Side: Logout */}
            <div className="flex items-center">
                <button
                    onClick={handleLogout}
                    title="Cerrar sesion"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors"
                >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
            </div>
        </header>
    );
}
