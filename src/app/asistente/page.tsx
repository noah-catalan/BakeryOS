"use client";

import { useState, useRef, useEffect } from "react";
import { 
    Sparkles, Send, Bot, User, HelpCircle, Package, Users, 
    AlertTriangle, Play, CheckCircle2, ChevronRight, Mic, MicOff, 
    Settings, Key, Zap, Check, Save, Hammer, Trash2, X, Globe, Cpu
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { collection, query, where, getDocs, updateDoc, doc, addDoc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ingredient } from "@/types/inventory";
import { Client } from "@/types/clients";
import { Recipe, RecipeIngredient } from "@/types/production";
import { useSettings, useRecipes, useIngredients } from "@/hooks/useFirebaseData";

interface Message {
    id: string;
    sender: "bot" | "user";
    text: string;
    timestamp: number;
    recipeActionData?: {
        nombre: string;
        rendimiento: number;
        tiempoEstimado: number;
        costeProduccion: number;
        ingredientes_necesarios: Array<{
            ingredienteId: string;
            nombre: string;
            cantidad: number;
            unidad: string;
        }>;
    };
    customCard?: React.ReactNode;
}

const PRESETS = [
    "¿Qué ingredientes están bajo mínimos?",
    "Añadir 20 a Harina de Fuerza T80",
    "Dame una receta de Croissants de chocolate para 12 unidades",
    "Sugiéreme una receta creativa con los ingredientes disponibles",
    "Planificar orden de producción de Croissants de chocolate",
    "Crear ingrediente Levadura Seca en Levaduras"
];

export default function AsistentePage() {
    const { user } = useAuth();
    const toast = useToast();
    
    // DB Hooks
    const { settings, loading: loadingSettings } = useSettings();
    const { recetas } = useRecipes();
    const { ingredientes } = useIngredients();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            sender: "bot",
            text: "¡Hola! Soy BakeryAI, tu asistente inteligente para la gestión de BakeryOS. Puedo ayudarte a actualizar el inventario, revisar stock crítico, registrar clientes o sugerir e incluso FABRICAR recetas en el sistema usando lenguaje natural. ¿Qué deseas hacer hoy?",
            timestamp: Date.now()
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // API Key states
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [localApiKey, setLocalApiKey] = useState("");
    const [showKeyCard, setShowKeyCard] = useState(false);
    const [verifyingKey, setVerifyingKey] = useState(false);

    // Get active API Key from Settings (Firestore), LocalStorage or Environment
    const activeApiKey = settings?.integrations?.geminiApiKey || localApiKey || (typeof window !== "undefined" ? localStorage.getItem("bakery_gemini_api_key") : "") || "";

    // Sync local state with localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("bakery_gemini_api_key");
            if (saved) {
                setLocalApiKey(saved);
                setApiKeyInput(saved);
            }
        }
    }, []);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const addMessage = (message: Message) => {
        setMessages((prev) => [...prev, message]);
    };

    // Verify Gemini API Key connection
    const handleVerifyAndSaveKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKeyInput.trim()) return;

        setVerifyingKey(true);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKeyInput}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hola" }] }] })
            });

            if (!res.ok) {
                throw new Error("Clave de API inválida");
            }

            if (typeof window !== "undefined") {
                localStorage.setItem("bakery_gemini_api_key", apiKeyInput);
                setLocalApiKey(apiKeyInput);
            }

            if (user) {
                const docRef = doc(db, "settings", user.uid);
                await setDoc(docRef, {
                    integrations: { geminiApiKey: apiKeyInput }
                }, { merge: true });
            }

            toast.success("¡Clave de Gemini vinculada y guardada con éxito!");
            setShowKeyCard(false);
        } catch (err) {
            console.error(err);
            toast.error("Error de conexión. Verifica que la clave de API sea válida.");
        } finally {
            setVerifyingKey(false);
        }
    };

    // Remove API key
    const handleRemoveKey = async () => {
        if (!confirm("¿Seguro que deseas desvincular la clave de API de Gemini?")) return;

        try {
            if (typeof window !== "undefined") {
                localStorage.removeItem("bakery_gemini_api_key");
                setLocalApiKey("");
                setApiKeyInput("");
            }

            if (user) {
                const docRef = doc(db, "settings", user.uid);
                await setDoc(docRef, {
                    integrations: { geminiApiKey: "" }
                }, { merge: true });
            }

            toast.success("Clave de API desvinculada.");
        } catch (err) {
            console.error(err);
            toast.error("Error al eliminar la clave.");
        }
    };

    // Call Gemini Generative AI Model
    const callGemini = async (userPrompt: string) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeApiKey}`;
        
        // Build database context
        const ingContext = ingredientes.map(i => `- ${i.nombre} (ID: ${i.id}): stockActual: ${i.stockActual} ${i.unidad || "kg"} (mínimo: ${i.stockMinimo})`).join("\n");
        const recContext = recetas.map(r => `- ${r.nombre} (ID: ${r.id}): rinde ${r.rendimiento} uds, coste de producción: ${r.costeProduccion}€`).join("\n");
        
        const systemPrompt = `Eres BakeryAI, el asistente virtual y maestro panadero de BakeryOS. Tu objetivo es ayudar al usuario a gestionar su almacén y catálogo de producción.
Tienes acceso al estado actual de la base de datos de la panadería:

=== INVENTARIO (Ingredientes en almacén) ===
${ingContext || "No hay ingredientes registrados en este momento."}

=== CATÁLOGO (Recetas existentes) ===
${recContext || "No hay recetas guardadas en este momento."}

=== INSTRUCCIONES DE COMPORTAMIENTO ===
1. Responde preguntas generales sobre panadería, administración de recursos y recetas de forma profesional.
2. Si el usuario te pide una receta (ej: "cómo hacer croissants", "receta de tarta de manzana", "dame la receta de pan de centeno"), debes:
   - Explicar el proceso de cocción paso a paso de forma amigable en tu respuesta conversacional ('reply').
   - Retornar una acción estructurada de tipo 'create_recipe' con el desglose exacto de ingredientes. Intenta mapear cada ingrediente de la receta con un ingrediente REAL de la sección INVENTARIO si coincide por nombre. Si el ingrediente NO existe en el inventario, usa como ingredienteId la palabra "nuevo" y el asistente se encargará de registrarlo automáticamente.
3. Si el usuario te pide añadir stock (ej: "añadir 20 a Harina"), restar stock (ej: "restar 5 a Azúcar") o crear ingredientes, debes retornar la acción respectiva con los parámetros detectados.
4. Si pide planificar una orden de producción, busca la receta en el catálogo, y retorna 'create_production_order' con el ID de la receta y nombre.
5. Tu respuesta DEBE ser EXCLUSIVAMENTE un JSON válido que cumpla estrictamente con el siguiente esquema (sin envolverlo en bloques de código como \`\`\`json):

{
  "reply": "Respuesta conversacional detallada en formato Markdown en español...",
  "action": {
    "type": "create_recipe" | "add_ingredient_stock" | "subtract_ingredient_stock" | "create_ingredient" | "create_production_order" | "none",
    "data": {
       // Si type es "create_recipe":
       // { "nombre": "Nombre Receta", "rendimiento": 12, "tiempoEstimado": 60, "costeProduccion": 2.50, "ingredientes_necesarios": [{ "ingredienteId": "nuevo" o "ID_REAL", "nombre": "Nombre Ingrediente", "cantidad": 0.5, "unidad": "kg" }] }
       // Si type es "add_ingredient_stock" o "subtract_ingredient_stock":
       // { "name": "Nombre ingrediente", "amount": 20 }
       // Si type es "create_ingredient":
       // { "name": "Nombre", "category": "Otros", "stockMinimo": 10, "unidad": "kg" }
       // Si type es "create_production_order":
       // { "recipeName": "Nombre receta", "cantidadObjetivo": 12 }
    }
  }
}

Responde ÚNICAMENTE con el objeto JSON para poder parsearlo directamente.`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: `${systemPrompt}\n\nMensaje del usuario:\n${userPrompt}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Error HTTP ${response.status}`);
        }

        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) throw new Error("La IA retornó una respuesta vacía");
        
        return JSON.parse(resultText.trim());
    };

    // Action execution helpers
    const handleSaveRecipeFromAI = async (recipeData: any) => {
        try {
            // 1. Create any ingredients that do not exist yet!
            const batch = writeBatch(db);
            const finalIngs = [];

            for (const reqIng of recipeData.ingredientes_necesarios) {
                let dbIng = ingredientes.find(i => i.nombre.toLowerCase() === reqIng.nombre.toLowerCase() || i.id === reqIng.ingredienteId);
                
                if (!dbIng && reqIng.ingredienteId === "nuevo") {
                    const sku = "ING-" + Math.floor(100 + Math.random() * 900);
                    const newIngRef = doc(collection(db, "ingredientes"));
                    const newIng = {
                        nombre: reqIng.nombre.charAt(0).toUpperCase() + reqIng.nombre.slice(1),
                        SKU: sku,
                        categoria: "Otros",
                        stockActual: 0,
                        stockMinimo: 10,
                        unidad: reqIng.unidad || "kg",
                        estado: "bajo",
                        userId: user!.uid,
                        ultimaAct: Date.now()
                    };
                    batch.set(newIngRef, newIng);
                    
                    dbIng = { id: newIngRef.id, ...newIng } as Ingredient;
                    toast.info(`Registrando ingrediente faltante: ${newIng.nombre}`);
                }

                if (dbIng) {
                    finalIngs.push({
                        ingredienteId: dbIng.id!,
                        nombre: dbIng.nombre,
                        cantidad: Number(reqIng.cantidad),
                        unidad: reqIng.unidad || "kg"
                    });
                }
            }

            // 2. Add recipe
            const recipeRef = doc(collection(db, "recetas"));
            const finalRecipe = {
                nombre: recipeData.nombre,
                ingredientes_necesarios: finalIngs,
                rendimiento: Number(recipeData.rendimiento) || 1,
                tiempoEstimado: Number(recipeData.tiempoEstimado) || 60,
                costeProduccion: Number(recipeData.costeProduccion) || 0,
                userId: user!.uid,
                updatedAt: Date.now()
            };
            batch.set(recipeRef, finalRecipe);

            await batch.commit();
            toast.success(`Receta "${recipeData.nombre}" guardada de forma profesional en el recetario.`);
            return recipeRef.id;
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar la receta en la base de datos.");
            return null;
        }
    };

    const handlePlanOrderFromAI = async (recipeData: any) => {
        // Save recipe first (or match if already exists)
        let existingRecipe = recetas.find(r => r.nombre.toLowerCase() === recipeData.nombre.toLowerCase());
        let recipeId = existingRecipe?.id;

        if (!recipeId) {
            recipeId = await handleSaveRecipeFromAI(recipeData) || undefined;
        }

        if (!recipeId) return;

        try {
            const newOrder = {
                recetaId: recipeId,
                recetaNombre: recipeData.nombre,
                cantidadObjetivo: Number(recipeData.rendimiento) || 1,
                estado: 'pendiente' as const,
                fechaCreacion: Date.now(),
                userId: user!.uid
            };
            await addDoc(collection(db, "ordenesProduccion"), newOrder);
            toast.success(`Orden de producción planificada para ${recipeData.nombre}.`);
        } catch (err) {
            console.error(err);
            toast.error("Error al registrar la orden de producción.");
        }
    };

    const handleFabricateInstantlyFromAI = async (recipeData: any) => {
        // Save recipe first
        let existingRecipe = recetas.find(r => r.nombre.toLowerCase() === recipeData.nombre.toLowerCase());
        let recipeId = existingRecipe?.id;

        if (!recipeId) {
            recipeId = await handleSaveRecipeFromAI(recipeData) || undefined;
        }

        if (!recipeId) return;

        try {
            // Perform fabrication (deduct ingredients, save complete order)
            const batch = writeBatch(db);

            // Fetch fresh ingredient states
            const qIng = query(collection(db, "ingredientes"), where("userId", "==", user!.uid));
            const snapIng = await getDocs(qIng);
            const freshIngs = snapIng.docs.map(d => ({ id: d.id, ...d.data() }) as Ingredient);

            // Fetch the recipe to get final resolved ingredient IDs
            const snapRec = await getDoc(doc(db, "recetas", recipeId));
            const freshRecipe = snapRec.data() as Recipe;

            // Plan order as completed
            const orderRef = doc(collection(db, "ordenesProduccion"));
            const newOrder = {
                recetaId: recipeId,
                recetaNombre: recipeData.nombre,
                cantidadObjetivo: Number(recipeData.rendimiento) || 1,
                estado: 'completada' as const,
                fechaCreacion: Date.now(),
                fechaCompletada: Date.now(),
                userId: user!.uid
            };
            batch.set(orderRef, newOrder);

            // Deduct stocks
            for (const ingReq of freshRecipe.ingredientes_necesarios) {
                const dbIng = freshIngs.find(i => i.id === ingReq.ingredienteId);
                if (dbIng) {
                    const totalConsumido = ingReq.cantidad;
                    const nuevoStock = Math.max(0, dbIng.stockActual - totalConsumido);

                    let nuevoEstado = dbIng.estado;
                    if (nuevoStock <= dbIng.stockMinimo / 2) nuevoEstado = 'alerta';
                    else if (nuevoStock <= dbIng.stockMinimo) nuevoEstado = 'bajo';
                    else nuevoEstado = 'ok';

                    batch.update(doc(db, "ingredientes", dbIng.id!), {
                        stockActual: nuevoStock,
                        estado: nuevoEstado,
                        ultimaAct: Date.now()
                    });
                }
            }

            await batch.commit();
            toast.success("¡Fabricado e inventariado con éxito!");
        } catch (err) {
            console.error(err);
            toast.error("Error al procesar la fabricación instantánea.");
        }
    };

    // Actions received from Gemini
    const handleAddStockAction = async (data: any, responseId: string, timestamp: number) => {
        const name = data.name || "";
        const amount = parseFloat(data.amount) || 0;

        const matched = ingredientes.find(ing => ing.nombre.toLowerCase().includes(name.toLowerCase()));
        if (!matched) {
            addMessage({
                id: responseId,
                sender: "bot",
                text: `El asistente detectó que querías añadir stock de "${name}", pero no he podido localizar ese ingrediente en tu inventario.`,
                timestamp
            });
            return;
        }

        const oldStock = matched.stockActual;
        const newStock = oldStock + amount;
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
            text: `He sumado ${amount} ${matched.unidad || 'kg'} al stock de **${matched.nombre}**.`,
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
    };

    const handleSubtractStockAction = async (data: any, responseId: string, timestamp: number) => {
        const name = data.name || "";
        const amount = parseFloat(data.amount) || 0;

        const matched = ingredientes.find(ing => ing.nombre.toLowerCase().includes(name.toLowerCase()));
        if (!matched) {
            addMessage({
                id: responseId,
                sender: "bot",
                text: `El asistente detectó que querías restar stock de "${name}", pero no he podido localizar ese ingrediente en tu inventario.`,
                timestamp
            });
            return;
        }

        const oldStock = matched.stockActual;
        const newStock = Math.max(0, oldStock - amount);
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
            text: `He restado ${amount} ${matched.unidad || 'kg'} al stock de **${matched.nombre}**.`,
            timestamp,
            customCard: (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl max-w-sm flex items-center justify-between gap-4">
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Stock Restado</h4>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{matched.nombre}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium">{oldStock} →</span>
                        <p className="text-lg font-extrabold text-red-600 dark:text-red-400">{newStock} {matched.unidad || 'kg'}</p>
                    </div>
                </div>
            )
        });
    };

    const handleCreateIngredientAction = async (data: any, responseId: string, timestamp: number) => {
        const name = data.name || "";
        const category = data.category || "Otros";
        const unit = data.unidad || "kg";
        const minStock = Number(data.stockMinimo) || 10;

        const sku = "ING-" + Math.floor(100 + Math.random() * 900);
        const newIng = {
            nombre: name.charAt(0).toUpperCase() + name.slice(1),
            SKU: sku,
            categoria: category.charAt(0).toUpperCase() + category.slice(1),
            stockActual: 0,
            stockMinimo: minStock,
            unidad: unit,
            estado: "bajo",
            userId: user!.uid,
            ultimaAct: Date.now()
        };

        await addDoc(collection(db, "ingredientes"), newIng);
        toast.success(`Nuevo ingrediente creado: ${newIng.nombre}`);

        addMessage({
            id: responseId,
            sender: "bot",
            text: `He dado de alta el nuevo ingrediente **${newIng.nombre}** en la categoría **${newIng.categoria}**.`,
            timestamp,
            customCard: (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-sm">
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">{newIng.categoria}</span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2">{newIng.nombre}</h4>
                    <div className="mt-3 flex justify-between text-xs text-slate-500">
                        <span>SKU: {newIng.SKU}</span>
                        <span>Stock Mínimo: {newIng.stockMinimo} {newIng.unidad}</span>
                    </div>
                </div>
            )
        });
    };

    const handleCreateProductionOrderAction = async (data: any, responseId: string, timestamp: number) => {
        const recipeName = data.recipeName || "";
        const amount = Number(data.cantidadObjetivo) || 1;

        const matched = recetas.find(r => r.nombre.toLowerCase().includes(recipeName.toLowerCase()));
        if (!matched) {
            addMessage({
                id: responseId,
                sender: "bot",
                text: `No he podido planificar la producción porque la receta "${recipeName}" no existe en el catálogo.`,
                timestamp
            });
            return;
        }

        const newOrder = {
            recetaId: matched.id!,
            recetaNombre: matched.nombre,
            cantidadObjetivo: amount,
            estado: 'pendiente' as const,
            fechaCreacion: Date.now(),
            userId: user!.uid
        };
        await addDoc(collection(db, "ordenesProduccion"), newOrder);
        toast.success(`Orden de producción planificada.`);

        addMessage({
            id: responseId,
            sender: "bot",
            text: `He planificado una orden de producción para **${matched.nombre}** por un lote de ${amount} unidades.`,
            timestamp,
            customCard: (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl max-w-sm flex items-center justify-between gap-4">
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Orden Planificada</h4>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{matched.nombre}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{amount} Uds.</p>
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Pendiente</span>
                    </div>
                </div>
            )
        });
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

            // A. If Gemini Key is present, call Gemini Model
            if (activeApiKey) {
                try {
                    const geminiResponse = await callGemini(text);
                    const reply = geminiResponse.reply || "No he podido estructurar una respuesta.";
                    const action = geminiResponse.action || { type: "none" };

                    if (action.type === "create_recipe" && action.data) {
                        addMessage({
                            id: responseId,
                            sender: "bot",
                            text: reply,
                            timestamp,
                            recipeActionData: action.data
                        });
                    } else if (action.type === "add_ingredient_stock" && action.data) {
                        await handleAddStockAction(action.data, responseId, timestamp);
                    } else if (action.type === "subtract_ingredient_stock" && action.data) {
                        await handleSubtractStockAction(action.data, responseId, timestamp);
                    } else if (action.type === "create_ingredient" && action.data) {
                        await handleCreateIngredientAction(action.data, responseId, timestamp);
                    } else if (action.type === "create_production_order" && action.data) {
                        await handleCreateProductionOrderAction(action.data, responseId, timestamp);
                    } else {
                        addMessage({
                            id: responseId,
                            sender: "bot",
                            text: reply,
                            timestamp
                        });
                    }
                    setLoading(false);
                    return;
                } catch (geminiError) {
                    console.error("Gemini failed. Falling back to local NLP regex parser:", geminiError);
                    toast.warning("Gemini API falló o retornó JSON inválido. Usando el motor local básico.");
                }
            }

            // B. Fallback to Local Regex Parser (BakeryNLP)
            // 1. Alert / Stock Low Command
            if (queryText.includes("bajo mínimos") || queryText.includes("mínimo") || queryText.includes("alerta") || queryText.includes("stock bajo")) {
                const lowStock = ingredientes.filter(ing => ing.stockActual <= ing.stockMinimo);

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

            // 3. Add/Subtract stock command
            const addMatch = queryText.match(/(añadir|sumar|agregar|quita|restar|quitar)\s+(\d+(?:\.\d+)?)\s*(?:a|de)?\s+(.+)/);
            if (addMatch) {
                const action = addMatch[1];
                const amount = parseFloat(addMatch[2]);
                const ingredientPart = addMatch[3].trim();

                const matched = ingredientes.find(ing => ing.nombre.toLowerCase().includes(ingredientPart));

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

            // 4. Create ingredient command
            const createIngMatch = queryText.match(/crear ingrediente\s+(.+?)\s+en\s+(.+)/);
            if (createIngMatch) {
                const name = createIngMatch[1].trim();
                const category = createIngMatch[2].trim();

                const sku = "ING-" + Math.floor(100 + Math.random() * 900);
                const newIng = {
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
                text: "No he conseguido procesar tu comando con exactitud. Conecta tu API Key de Gemini en el lateral para desbloquear la generación de recetas o prueba con comandos locales:\n\n• *'¿Qué ingredientes están bajo mínimos?'*\n• *'Añadir 15 a Levadura Fresca'*\n• *'Restar 2 a Sal Fina'*\n• *'Mostrar listado de clientes'*\n• *'Crear ingrediente Harina en Harinas'*",
                timestamp
            });

        } catch (err) {
            console.error(err);
            addMessage({
                id: responseId,
                sender: "bot",
                text: "Ha ocurrido un error inesperado al procesar la orden. Por favor, revisa tu conexión.",
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
                        <Sparkles className="text-amber-500 animate-pulse" size={24} />
                        Asistente Inteligente BakeryAI
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Controla tu panadería con lenguaje natural impulsado por Google Gemini.
                    </p>
                </div>
                <button
                    onClick={() => setShowKeyCard(!showKeyCard)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-500 hover:border-amber-500 transition-all duration-200 flex items-center gap-2 bg-white dark:bg-slate-900 shadow-sm"
                >
                    <Settings size={18} />
                    <span className="text-xs font-semibold hidden sm:inline">Ajustes IA</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Chat Container */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[600px] overflow-hidden">
                    {/* Bot Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white shadow-md relative">
                                <Bot size={20} />
                                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white dark:border-slate-900 rounded-full ${activeApiKey ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">BakeryAI Agent</h3>
                                <span className="text-[10px] flex items-center gap-1 font-semibold uppercase">
                                    {activeApiKey ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <Zap size={10} /> Gemini Inteligente Activo
                                        </span>
                                    ) : (
                                        <span className="text-amber-600 dark:text-amber-500">
                                            Modo Local Básico
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {activeApiKey && (
                            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                                API CONECTADA
                            </span>
                        )}
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
                                <div className="space-y-2">
                                    <div
                                        className={`p-4 rounded-2xl text-sm ${
                                            msg.sender === "user"
                                                ? "bg-amber-500 text-white rounded-tr-none shadow-sm"
                                                : "bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/40 dark:border-slate-700/20"
                                        }`}
                                    >
                                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    </div>

                                    {/* Action Cards for Recipe suggestions */}
                                    {msg.recipeActionData && (
                                        <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm w-full max-w-md space-y-4 animate-scale-in">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1 w-fit">
                                                        <Sparkles size={10} /> Receta Generada por IA
                                                    </span>
                                                    <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1.5">{msg.recipeActionData.nombre}</h4>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-500">Rendimiento: <span className="font-bold text-slate-700 dark:text-slate-300">{msg.recipeActionData.rendimiento} uds</span></p>
                                                    <p className="text-[10px] text-slate-500">Tiempo: <span className="font-bold text-slate-700 dark:text-slate-300">{msg.recipeActionData.tiempoEstimado} min</span></p>
                                                </div>
                                            </div>

                                            {/* Ingredients list */}
                                            <div className="space-y-1.5">
                                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingredientes requeridos:</h5>
                                                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                    {msg.recipeActionData.ingredientes_necesarios.map((ing, i) => {
                                                        const exists = ingredientes.some(dbIng => dbIng.nombre.toLowerCase() === ing.nombre.toLowerCase() || dbIng.id === ing.ingredienteId);
                                                        return (
                                                            <div key={i} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                                                                <span className="font-medium text-slate-700 dark:text-slate-300">{ing.nombre}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-slate-600 dark:text-slate-400 font-bold">{ing.cantidad} {ing.unidad}</span>
                                                                    {exists ? (
                                                                        <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded font-bold uppercase tracking-wider">Mapeado</span>
                                                                    ) : (
                                                                        <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded font-bold uppercase tracking-wider">Crear</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                                <button
                                                    onClick={() => handleSaveRecipeFromAI(msg.recipeActionData)}
                                                    className="flex items-center justify-center gap-1 py-2 px-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                                                >
                                                    <Save size={14} />
                                                    Recetario
                                                </button>
                                                <button
                                                    onClick={() => handlePlanOrderFromAI(msg.recipeActionData)}
                                                    className="flex items-center justify-center gap-1 py-2 px-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                                >
                                                    <Play size={14} />
                                                    Planificar
                                                </button>
                                                <button
                                                    onClick={() => handleFabricateInstantlyFromAI(msg.recipeActionData)}
                                                    className="flex items-center justify-center gap-1 py-2 px-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-amber-500/10"
                                                >
                                                    <Zap size={14} />
                                                    Fabricar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {msg.customCard && (
                                        <div className="animate-scale-in">
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
                            placeholder={activeApiKey ? "Escribe o habla (ej: 'Cómo hago croissants')" : "Introduce un comando (ej: 'añadir 15 a Harina')"}
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

                {/* Information / Settings Sidebar */}
                <div className="space-y-6">
                    {/* Collapsible Key Card */}
                    {(showKeyCard || !activeApiKey) && (
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-md space-y-4 animate-scale-in">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-50 flex items-center gap-2">
                                    <Key className="text-amber-500" size={16} />
                                    Clave Gemini API
                                </h4>
                                {activeApiKey && (
                                    <button onClick={() => setShowKeyCard(false)} className="text-slate-400 hover:text-slate-600">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            
                            {activeApiKey ? (
                                <div className="space-y-3">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-400 flex items-start gap-2">
                                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Gemini IA vinculada</p>
                                            <p className="text-[10px] mt-0.5 opacity-80">La clave se cargará automáticamente en cada sesión.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRemoveKey}
                                        className="w-full py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Trash2 size={14} />
                                        Desvincular Clave
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleVerifyAndSaveKey} className="space-y-3">
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        BakeryAI necesita una clave de API de Gemini para comprender lenguaje complejo y sugerir recetas personalizadas en base a tu inventario.
                                    </p>
                                    <input
                                        type="password"
                                        value={apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        placeholder="AIzaSy..."
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={verifyingKey}
                                        className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        {verifyingKey ? (
                                            <>Verificando...</>
                                        ) : (
                                            <>
                                                <Check size={14} />
                                                Vincular y Probar
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[10px] text-center text-slate-400 leading-relaxed">
                                        Consigue una clave gratis en <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline font-medium">Google AI Studio</a>.
                                    </p>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Help Box */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <HelpCircle className="text-amber-500" size={16} />
                            Comandos de Prueba
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">Haz clic en un comando rápido para insertarlo en la caja de texto:</p>
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
                        <Globe size={24} />
                        <h4 className="text-sm font-bold">IA Conectada al Inventario</h4>
                        <p className="text-xs text-amber-100 leading-relaxed">
                            BakeryAI lee en tiempo real la base de datos de tu panadería. Las sugerencias de recetas se ajustan e identifican qué ingredientes tienes listos y cuáles deberás crear.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
