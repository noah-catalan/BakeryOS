"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextProps {
    showToast: (message: string, type: ToastType, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType, duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string, duration?: number) => showToast(message, "success", duration), [showToast]);
    const error = useCallback((message: string, duration?: number) => showToast(message, "error", duration), [showToast]);
    const info = useCallback((message: string, duration?: number) => showToast(message, "info", duration), [showToast]);
    const warning = useCallback((message: string, duration?: number) => showToast(message, "warning", duration), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full px-4 sm:px-0 pointer-events-none">
                {toasts.map((toast) => {
                    let bgIconClass = "";
                    let icon = null;
                    let borderClass = "";

                    switch (toast.type) {
                        case "success":
                            bgIconClass = "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400";
                            icon = <CheckCircle2 size={18} />;
                            borderClass = "border-emerald-200 dark:border-emerald-900/30";
                            break;
                        case "error":
                            bgIconClass = "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400";
                            icon = <AlertCircle size={18} />;
                            borderClass = "border-red-200 dark:border-red-900/30";
                            break;
                        case "warning":
                            bgIconClass = "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
                            icon = <AlertTriangle size={18} />;
                            borderClass = "border-amber-200 dark:border-amber-900/30";
                            break;
                        case "info":
                        default:
                            bgIconClass = "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
                            icon = <Info size={18} />;
                            borderClass = "border-blue-200 dark:border-blue-900/30";
                            break;
                    }

                    return (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border ${borderClass} shadow-lg shadow-slate-100/10 dark:shadow-black/20 animate-slide-up duration-200`}
                            role="alert"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${bgIconClass}`}>
                                    {icon}
                                </div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                    {toast.message}
                                </p>
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-150"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
