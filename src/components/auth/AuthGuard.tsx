"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

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

    // Show a loading state while checking authentication
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-sm font-medium text-slate-500">Verificando sesión...</p>
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
