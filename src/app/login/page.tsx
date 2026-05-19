"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ChefHat, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
        } catch (err: any) {
            const code = err?.code || "";
            if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
                setError("Credenciales incorrectas. Revisa el email y la contraseña.");
            } else if (code === "auth/too-many-requests") {
                setError("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
            } else {
                setError("Error al iniciar sesión. Inténtalo de nuevo.");
            }
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />

            {/* Decorative floating elements */}
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-200/30 dark:bg-amber-900/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-200/20 dark:bg-orange-900/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
            <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-rose-200/20 dark:bg-rose-900/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
                 style={{
                     backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                     backgroundSize: '24px 24px',
                 }}
            />

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md animate-scale-in">
                {/* Brand Header */}
                <div className="text-center mb-8 animate-slide-down">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 mb-5 animate-pulse-glow">
                        <ChefHat size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                        BakeryOS
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                        Sistema de Gestión para Panaderías
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-900/5 dark:shadow-black/20 border border-white/60 dark:border-slate-800/60 p-8 animate-slide-up stagger-1">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
                        Iniciar sesión
                    </h2>

                    <form className="space-y-5" onSubmit={handleLogin}>
                        {/* Error Message */}
                        {error && (
                            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 animate-slide-down">
                                <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label
                                htmlFor="login-email"
                                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                            >
                                Correo electrónico
                            </label>
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 dark:text-slate-50 bg-slate-50/80 dark:bg-slate-800/80 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 sm:text-sm transition-all duration-200"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="login-password"
                                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                            >
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="block w-full rounded-xl border-0 py-3 px-4 pr-12 text-slate-900 dark:text-slate-50 bg-slate-50/80 dark:bg-slate-800/80 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 sm:text-sm transition-all duration-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="relative flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:from-amber-600 hover:to-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Accediendo...
                                </>
                            ) : (
                                "Entrar"
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials Hint */}
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-2 font-medium uppercase tracking-wider">
                            Credenciales de prueba
                        </p>
                        <div className="flex gap-2 items-center justify-center">
                            <code className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-md font-mono">
                                admin@bakeryos.com
                            </code>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <code className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-md font-mono">
                                admin123
                            </code>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6 animate-fade-in stagger-3">
                    BakeryOS v1.0 — TFG Noah Catalán © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
