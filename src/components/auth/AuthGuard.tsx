"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChefHat } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            // Si el usuario no está autenticado y no está en la página de login, redirigir a login
            if (!user && pathname !== '/login') {
                router.push('/login');
            }
            // Si el usuario está autenticado y está tratando de acceder al login, redirigir al Dashboard
            if (user && pathname === '/login') {
                router.push('/');
            }
        }
    }, [user, loading, pathname, router]);

    // Show a premium loading state while checking authentication
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-5 animate-fade-in">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 animate-pulse-glow">
                            <ChefHat size={28} />
                        </div>
                        {/* Spinner ring */}
                        <div className="absolute -inset-2.5">
                            <div className="w-full h-full rounded-2xl border-2 border-amber-200 dark:border-amber-900/50 border-t-amber-500 dark:border-t-amber-400 animate-spin" style={{ animationDuration: '1.2s' }} />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">BakeryOS</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Verificando sesión...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Si no está autenticado y no es login, no renderizar los hijos (evita flasheo antes del redirect)
    if (!user && pathname !== '/login') {
        return null;
    }

    return <>{children}</>;
}
