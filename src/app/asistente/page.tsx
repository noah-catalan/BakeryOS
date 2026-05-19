"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, HelpCircle, Package, Users, AlertTriangle, Play, CheckCircle2, ChevronRight, Mic, MicOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ingredient } from "@/types/inventory";
import { Client } from "@/types/clients";

interface Message {
    id: string;
    sender: "bot" | "user";
    text: string;
    timestamp: number;
    actions?: {
        type: "success" | "warning" | "info";
        label: string;
        details?: string;
    };
    customCard?: React.ReactNode;
}

const PRESETS = [
    "¿Qué ingredientes están bajo mínimos?",
    "Añadir 20 a Harina de Fuerza T80",
    "Restar 3 a Mantequilla Extra 82%",
    "Mostrar listado de clientes",
    "Crear ingrediente Azúcar Moreno en Otros"
];

export default function AsistentePage() {
    const { user } = useAuth();
    const toast = useToast();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            sender: "bot",
            text: "¡Hola! Soy BakeryAI, tu asistente inteligente para la gestión de BakeryOS. Puedo ayudarte a actualizar el inventario, revisar stock crítico, registrar clientes o buscar información usando lenguaje natural. ¿Qué deseas hacer hoy?",
            timestamp: Date.now()
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const addMessage = (message: Message) => {
        setMessages((prev) => [...prev, message]);
    };

    // NLP Command Parser Engine (BakeryNLP)
    const handleCommand = async (text: string) => {
        setLoading(true);
        const queryText = text.trim().toLowerCase();
        const responseId = Math.random().toString(36).substring(2, 9);
        const timestamp = Date.now();

        try {
            if (!user) {
                addMessage({
                    id: responseId,
                    sender: "bot",
                    text: "Lo siento, debes iniciar sesión para poder realizar acciones.",
                    timestamp
                });
                setLoading(false);
                return;
            }

            // 1. Alert / Stock Low Command
            if (queryText.includes("bajo mínimos") || queryText.includes("mínimo") || queryText.includes("alerta") || queryText.includes("stock bajo")) {
                const q = query(collection(db, "ingredientes"), where("userId", "==", user.uid));
                const snap = await getDocs(q);
                const items = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Ingredient);
                const lowStock = items.filter(ing => ing.stockActual <= ing.stockMinimo);

                if (lowStock.length === 0) {
                    addMessage({
                        id: responseId,
                        sender: "bot",
                        text: "¡Excelente noticia! No tienes ningún ingrediente bajo el stock mínimo en este momento. Tu almacén está completamente saludable.",
                        timestamp,
                        customCard: (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3">
                                <CheckCircle2 className="text-emerald-500" size={24} />
                                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Inventario 100% óptimo</span>
                            </div>
                        )
                    });
                } else {
                    addMessage({
                        id: responseId,
                        sender: "bot",
                        text: `He encontrado ${lowStock.length} ingredientes que están por debajo del límite mínimo. Deberías considerar realizar un pedido de compra:`,
                        timestamp,
                        customCard: (
                            <div className="grid gap-2 max-w-md w-full">
                                {lowStock.map(ing => (
                                    <div key={ing.id} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{ing.nombre}</p>
                                            <p className="text-xs text-red-500">Mínimo: {ing.stockMinimo} {ing.unidad || 'kg'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-extrabold text-red-600 dark:text-red-400">{ing.stockActual} {ing.unidad || 'kg'}</p>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 uppercase">Reabastecer</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    });
                }
                setLoading(false);
                return;
            }

            // 2. Client list command
            if (queryText.includes("listado de clientes") || queryText.includes("clientes") || queryText.includes("mostrar cliente")) {
                const q = query(collection(db, "clientes"), where("userId", "==", user.uid));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Client);

                if (list.length === 0) {
                    addMessage({
                        id: responseId,
                        sender: "bot",
                        text: "Aún no tienes ningún cliente registrado en BakeryOS. Puedes crear uno diciendo: 'crear cliente Cafetería Plaza'",
                        timestamp
                    });
                } else {
                    addMessage({
                        id: responseId,
                        sender: "bot",
                        text: `He obtenido el directorio de tus clientes. Actualmente tienes ${list.length} registrados:`,
                        timestamp,
                        customCard: (
                            <div className="grid gap-2 max-w-md w-full">
                                {list.map(cli => (
                                    <div key={cli.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                            <Users size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{cli.nombre}</p>
                                            <p className="text-xs text-slate-500">{cli.email} • {cli.telefono}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    });
                }
                setLoading(false);
                return;
            }

            // 3. Add/Subtract inventory command
            // Regex to find quantity and ingredient name, e.g. "añadir 20 a Harina"
            const addMatch = queryText.match(/(añadir|sumar|agregar|quita|restar|quitar)\s+(\d+(?:\.\d+)?)\s*(?:a|de)?\s+(.+)/);
            if (addMatch) {
                const action = addMatch[1];
                const amount = parseFloat(addMatch[2]);
                const ingredientPart = addMatch[3].trim();

                const q = query(collection(db, "ingredientes"), where("userId", "==", user.uid));
                const snap = await getDocs(q);
                const items = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Ingredient);

                // Find best matching ingredient
                const matched = items.find(ing => ing.nombre.toLowerCase().includes(ingredientPart));

                if (!matched) {
                    addMessage({
                        id: responseId,
                        sender: "bot",
                        text: `Lo siento, no he podido encontrar ningún ingrediente en tu almacén que coincida con "${ingredientPart}". ¿Podrías deletrearlo de forma distinta?`,
                        timestamp
                    });
                } else {
                    const isAdd = ["añadir", "sumar", "agregar"].includes(action);
                    const oldStock = matched.stockActual;
                    const newStock = isAdd ? oldStock + amount : Math.max(0, oldStock - amount);
                    const status = newStock <= matched.stockMinimo ? "bajo" : "ok";

                    await updateDoc(doc(db, "ingredientes", matched.id!), {
                        stockActual: newStock,
                        estado: status,
                        ultimaAct: Date.now()
                    });

                    toast.success(`Inventario actualizado: ${matched.nombre}`);

                    addMessage({
                        id: responseId,
                        sender: "bot",
                        text: `¡Entendido! He ${isAdd ? 'añadido' : 'restado'} ${amount} ${matched.unidad || 'kg'} a **${matched.nombre}** de forma exitosa en el inventario de BakeryOS.`,
                        timestamp,
                        customCard: (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl max-w-sm flex items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Stock Actualizado</h4>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{matched.nombre}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-400 font-medium">{oldStock} →</span>
                                    <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{newStock} {matched.unidad || 'kg'}</p>
                                </div>
                            </div>
                        )
                    });
                }
                setLoading(false);
                return;
            }

            // 4. Create ingredient command: "crear ingrediente [nombre] en [categoria]"
            const createIngMatch = queryText.match(/crear ingrediente\s+(.+?)\s+en\s+(.+)/);
            if (createIngMatch) {
                const name = createIngMatch[1].trim();
                const category = createIngMatch[2].trim();

                const sku = "ING-" + Math.floor(100 + Math.random() * 900);
                const newIng: Omit<Ingredient, "id"> & { userId: string, ultimaAct: number } = {
                    nombre: name.charAt(0).toUpperCase() + name.slice(1),
                    SKU: sku,
                    categoria: category.charAt(0).toUpperCase() + category.slice(1),
                    stockActual: 0,
                    stockMinimo: 10,
                    unidad: "kg",
                    estado: "bajo",
                    userId: user.uid,
                    ultimaAct: Date.now()
                };

                await addDoc(collection(db, "ingredientes"), newIng);
                toast.success(`Nuevo ingrediente creado: ${newIng.nombre}`);

                addMessage({
                    id: responseId,
                    sender: "bot",
                    text: `He dado de alta un nuevo ingrediente en tu base de datos de manera profesional:`,
                    timestamp,
                    customCard: (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-sm">
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">{newIng.categoria}</span>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2">{newIng.nombre}</h4>
                            <div className="mt-3 flex justify-between text-xs text-slate-500">
                                <span>SKU: {newIng.SKU}</span>
                                <span>Stock Inicial: 0 kg</span>
                            </div>
                        </div>
                    )
                });
                setLoading(false);
                return;
            }

            // 5. Help / Default
            addMessage({
                id: responseId,
                sender: "bot",
                text: "No he conseguido procesar tu comando con exactitud. Prueba a usar comandos lógicos como:\n\n• *'¿Qué ingredientes están bajo mínimos?'*\n• *'Añadir 15 a Levadura Fresca'*\n• *'Restar 2 a Sal Fina'*\n• *'Mostrar listado de clientes'*\n• *'Crear ingrediente Harina de Espelta en Harinas'*",
                timestamp
            });

        } catch (err) {
            console.error(err);
            addMessage({
                id: responseId,
                sender: "bot",
                text: "Ha ocurrido un error inesperado al procesar la orden en la base de datos de Firebase. Por favor, asegúrate de tener conexión estable.",
                timestamp
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        const text = inputValue;
        setInputValue("");

        addMessage({
            id: Math.random().toString(36).substring(2, 9),
            sender: "user",
            text,
            timestamp: Date.now()
        });

        setTimeout(() => {
            handleCommand(text);
        }, 600);
    };

    const toggleListening = () => {
        if (isListening) {
            setIsListening(false);
            return;
        }

        // Web Speech API Mock / implementation
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setIsListening(true);
            const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const rec = new Speech();
            rec.lang = 'es-ES';
            rec.continuous = false;
            rec.interimResults = false;

            rec.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                setInputValue(text);
                setIsListening(false);
                toast.info("Voz detectada correctamente");
            };

            rec.onerror = () => {
                setIsListening(false);
                toast.error("Error al reconocer la voz");
            };

            rec.onend = () => {
                setIsListening(false);
            };

            rec.start();
        } else {
            toast.warning("El reconocimiento de voz no es compatible con este navegador.");
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center animate-slide-down">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
                        <Sparkles className="text-amber-500" size={24} />
                        Asistente Inteligente BakeryAI
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Controla tu panadería con lenguaje natural o comandos rápidos por voz.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Chat Container */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[600px] overflow-hidden">
                    {/* Bot Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white shadow-md relative">
                            <Bot size={20} />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">BakeryAI Agent</h3>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Online • Conectado a Firestore</span>
                        </div>
                    </div>

                    {/* Messages Stack */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex items-start gap-3.5 max-w-[85%] ${
                                    msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                                }`}
                            >
                                <div
                                    className={`p-2 rounded-xl text-white ${
                                        msg.sender === "user"
                                            ? "bg-slate-500 dark:bg-slate-700"
                                            : "bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm"
                                    }`}
                                >
                                    {msg.sender === "user" ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className="space-y-3">
                                    <div
                                        className={`p-4 rounded-2xl text-sm ${
                                            msg.sender === "user"
                                                ? "bg-amber-500 text-white rounded-tr-none shadow-sm"
                                                : "bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/40 dark:border-slate-700/20"
                                        }`}
                                    >
                                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                    {msg.customCard && (
                                        <div className="animate-scale-in duration-200">
                                            {msg.customCard}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-start gap-3.5">
                                <div className="p-2 rounded-xl text-white bg-gradient-to-br from-amber-400 to-orange-500 animate-pulse">
                                    <Bot size={16} />
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-2xl rounded-tl-none border border-slate-200/40 dark:border-slate-700/20 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Inputs */}
                    <form onSubmit={handleSend} className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/20">
                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`p-3 rounded-xl border transition-all duration-200 flex items-center justify-center ${
                                isListening
                                    ? "bg-red-500 border-red-500 text-white animate-pulse"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-amber-400 hover:text-amber-500"
                            }`}
                        >
                            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Escribe un comando (ej: 'añadir 15 a Harina')"
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-colors shadow-inner"
                        />
                        <button
                            type="submit"
                            className="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold flex items-center justify-center shadow-md shadow-amber-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>

                {/* Information / Presets Sidebar */}
                <div className="space-y-6">
                    {/* Help Box */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <HelpCircle className="text-amber-500" size={16} />
                            Comandos Rápidos
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Prueba a hacer clic en cualquiera de estos comandos de muestra para ejecutarlos al instante:</p>
                        <div className="flex flex-col gap-2">
                            {PRESETS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setInputValue(preset);
                                    }}
                                    className="text-left text-xs bg-slate-50 dark:bg-slate-800/40 hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/30 p-2.5 rounded-xl transition-all duration-150 text-slate-600 dark:text-slate-300 font-medium flex items-start gap-1"
                                >
                                    <ChevronRight size={12} className="mt-0.5 text-amber-500 shrink-0" />
                                    <span>{preset}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Backend Engine Details */}
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-2xl text-white shadow-md space-y-3">
                        <Bot size={24} />
                        <h4 className="text-sm font-bold">Prototipo NLP Avanzado</h4>
                        <p className="text-xs text-amber-100 leading-relaxed">
                            BakeryAI integra reconocimiento de voz nativo y procesamiento léxico de órdenes estructuradas, eliminando por completo mocks estáticos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
