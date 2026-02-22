"use client";

import { useState, useEffect } from "react";
import { Building2, User, Save, Shield, Bell } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { BusinessSettings, UserSettings } from "@/types/settings";
import { useTheme } from "next-themes";

export default function ConfiguracionPage() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'negocio' | 'perfil'>('negocio');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });

    const [businessData, setBusinessData] = useState<BusinessSettings>({
        razonSocial: '',
        cif: '',
        direccion: '',
        telefono: '',
        emailContacto: '',
        monedaBase: 'EUR',
        ivaPorDefecto: 21,
    });

    const [userData, setUserData] = useState<UserSettings>({
        nombre: 'Noah Catalán',
        avatarUrl: '',
        temaVisual: 'light',
        notificacionesEmail: true,
        notificacionesPush: false,
    });

    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, "settings", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.business) setBusinessData(data.business);
                    if (data.user) setUserData(data.user);
                }
            } catch (error) {
                console.error("Error fetching config:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveMessage({ text: '', type: '' });

        try {
            if (!user) return;
            const docRef = doc(db, "settings", user.uid);
            await setDoc(docRef, {
                business: businessData,
                user: userData,
                updatedAt: Date.now()
            }, { merge: true });

            if (userData.temaVisual) {
                setTheme(userData.temaVisual);
            }

            setSaveMessage({ text: 'Configuración guardada correctamente.', type: 'success' });
            setTimeout(() => setSaveMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error("Error saving config:", error);
            setSaveMessage({ text: 'Error al guardar la configuración.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-4xl mx-auto flex justify-center items-center min-h-[400px]">
                <div className="text-slate-500">Cargando configuración...</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Configuración del Sistema</h2>
                <p className="text-sm text-slate-500 mt-1">Ajusta los parámetros globales de la panadería y tus preferencias de usuario.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                {/* Sidebar Setup Menu */}
                <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col flex-shrink-0">
                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('negocio')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'negocio' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
                        >
                            <Building2 size={18} />
                            Datos del Negocio
                        </button>
                        <button
                            onClick={() => setActiveTab('perfil')}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'perfil' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
                        >
                            <User size={18} />
                            Perfil y Preferencias
                        </button>
                        <hr className="my-4 border-slate-200" />
                        <button disabled className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 opacity-60 cursor-not-allowed">
                            <Shield size={18} />
                            Seguridad e Integraciones
                        </button>
                    </nav>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-white p-8 overflow-y-auto">
                    {saveMessage.text && (
                        <div className={`p-4 rounded-md mb-6 text-sm flex items-center ${saveMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                            {saveMessage.text}
                        </div>
                    )}

                    <form onSubmit={handleSave}>
                        {activeTab === 'negocio' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Información Fiscal Corporativa</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Panadería</label>
                                        <input type="text" value={businessData.razonSocial} onChange={e => setBusinessData({ ...businessData, razonSocial: e.target.value })} className="mt-1 block w-full rounded-md border text-slate-900 border-slate-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm" placeholder="Panadería Europea S.L." />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">CIF / NIF</label>
                                        <input type="text" value={businessData.cif} onChange={e => setBusinessData({ ...businessData, cif: e.target.value })} className="mt-1 block w-full rounded-md border text-slate-900 border-slate-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm" placeholder="B12345678" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email de Contacto</label>
                                        <input type="email" value={businessData.emailContacto} onChange={e => setBusinessData({ ...businessData, emailContacto: e.target.value })} className="mt-1 block w-full rounded-md border text-slate-900 border-slate-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm" placeholder="hola@panaderia.com" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                        <input type="text" value={businessData.telefono} onChange={e => setBusinessData({ ...businessData, telefono: e.target.value })} className="mt-1 block w-full rounded-md border text-slate-900 border-slate-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm" placeholder="+34 600 000 000" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Principal</label>
                                        <input type="text" value={businessData.direccion} onChange={e => setBusinessData({ ...businessData, direccion: e.target.value })} className="mt-1 block w-full rounded-md border text-slate-900 border-slate-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm" placeholder="Calle de la Harina 123, Madrid" />
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Ajustes Financieros</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Moneda Base</label>
                                        <select value={businessData.monedaBase} onChange={e => setBusinessData({ ...businessData, monedaBase: e.target.value })} className="mt-1 block w-full rounded-md border text-slate-900 border-slate-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm bg-white">
                                            <option value="EUR">Euro (€)</option>
                                            <option value="USD">Dólar ($)</option>
                                            <option value="GBP">Libra (£)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">IVA por defecto (%) para nuevos clientes</label>
                                        <input type="number" min="0" max="100" value={businessData.ivaPorDefecto} onChange={e => setBusinessData({ ...businessData, ivaPorDefecto: Number(e.target.value) })} className="mt-1 block w-full rounded-md border text-slate-900 border-slate-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'perfil' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Perfil Operativo</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Mostrado</label>
                                            <input type="text" value={userData.nombre} onChange={e => setUserData({ ...userData, nombre: e.target.value })} className="mt-1 block w-full rounded-md border text-slate-900 border-slate-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm" placeholder="Ej: Juan Pérez" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Foto de Perfil (URL pública)</label>
                                            <input type="text" value={userData.avatarUrl || ''} onChange={e => setUserData({ ...userData, avatarUrl: e.target.value })} className="mt-1 block w-full rounded-md border text-slate-900 border-slate-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm" placeholder="https://..." />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Preferencias de Sistema</h3>
                                </div>
                                <div className="space-y-4 pb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tema Visual</label>
                                        <select value={userData.temaVisual} onChange={e => setUserData({ ...userData, temaVisual: e.target.value as any })} className="mt-1 block w-full max-w-xs rounded-md border text-slate-900 border-slate-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm bg-white">
                                            <option value="light">Claro (Recomendado)</option>
                                            <option value="dark">Oscuro</option>
                                            <option value="system">Sincronizar con el Sistema</option>
                                        </select>
                                    </div>

                                    <div className="pt-4 space-y-3">
                                        <div className="flex items-start">
                                            <div className="flex h-5 items-center">
                                                <input id="email_notif" type="checkbox" checked={userData.notificacionesEmail} onChange={e => setUserData({ ...userData, notificacionesEmail: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="email_notif" className="font-medium text-slate-700">Notificaciones por Email</label>
                                                <p className="text-slate-500">Recibir resúmenes de turno y alertas de stock crítico en el correo principal.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start">
                                            <div className="flex h-5 items-center">
                                                <input id="push_notif" type="checkbox" checked={userData.notificacionesPush} onChange={e => setUserData({ ...userData, notificacionesPush: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="push_notif" className="font-medium text-slate-700">Notificaciones Push</label>
                                                <p className="text-slate-500">Alertas instantáneas en este navegador web cuando haya actualizaciones críticas.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex justify-center items-center gap-2 rounded-md border border-transparent bg-blue-600 py-2.5 px-6 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                            >
                                <Save size={16} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
