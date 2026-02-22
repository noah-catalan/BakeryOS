"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Recipe, ProductionOrder } from "@/types/production";
import { Ingredient } from "@/types/inventory";

// Hook to fetch and manage Recipes
export function useRecipes() {
    const [recetas, setRecetas] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "recetas"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Recipe[];
            setRecetas(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { recetas, loading };
}

// Hook to fetch and manage Production Orders
export function useProductionOrders() {
    const [ordenes, setOrdenes] = useState<ProductionOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "ordenesProduccion"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ProductionOrder[];
            // Sort to show newest first
            data.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
            setOrdenes(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { ordenes, loading };
}

// Hook to fetch and manage Ingredients
export function useIngredients() {
    const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "ingredientes"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ingredient[];
            setIngredientes(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { ingredientes, loading };
}
