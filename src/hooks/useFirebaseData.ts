"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Recipe, ProductionOrder } from "@/types/production";
import { Ingredient } from "@/types/inventory";

// Hook to fetch and manage Recipes
export function useRecipes() {
    const [recetas, setRecetas] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setRecetas([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, "recetas"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Recipe[];
            setRecetas(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { recetas, loading };
}

// Hook to fetch and manage Production Orders
export function useProductionOrders() {
    const [ordenes, setOrdenes] = useState<ProductionOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setOrdenes([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, "ordenesProduccion"), where("userId", "==", user.uid));
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
    }, [user]);

    return { ordenes, loading };
}

// Hook to fetch and manage Ingredients
export function useIngredients() {
    const [ingredientes, setIngredientes] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setIngredientes([]);
            setLoading(false);
            return;
        }

        const q = query(collection(db, "ingredientes"), where("userId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Ingredient[];
            setIngredientes(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { ingredientes, loading };
}
