import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc, 
    query, 
    where, 
    writeBatch 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ingredient } from "@/types/inventory";
import { Recipe, ProductionOrder } from "@/types/production";
import { Client, SaleOrder } from "@/types/clients";
import { Invoice } from "@/types/billing";

// Centralized DB Service Layer
export const dbService = {
    // ═══════════════════════════════════════════
    // Generic Helper Methods
    // ═══════════════════════════════════════════
    async add<T extends object>(colName: string, data: T, userId: string): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, colName), {
                ...data,
                userId,
                updatedAt: Date.now()
            });
            return docRef.id;
        } catch (error) {
            console.error(`Error adding to ${colName}:`, error);
            throw new Error(`No se pudo agregar el registro en ${colName}.`);
        }
    },

    async update<T extends object>(colName: string, id: string, data: Partial<T>): Promise<void> {
        try {
            const docRef = doc(db, colName, id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error(`Error updating in ${colName}:`, error);
            throw new Error(`No se pudo actualizar el registro con id ${id} en ${colName}.`);
        }
    },

    async delete(colName: string, id: string): Promise<void> {
        try {
            const docRef = doc(db, colName, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error(`Error deleting from ${colName}:`, error);
            throw new Error(`No se pudo eliminar el registro con id ${id} de ${colName}.`);
        }
    },

    async getByUserId<T>(colName: string, userId: string): Promise<T[]> {
        try {
            const q = query(collection(db, colName), where("userId", "==", userId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as T[];
        } catch (error) {
            console.error(`Error fetching from ${colName}:`, error);
            throw new Error(`No se pudieron obtener los datos de ${colName}.`);
        }
    },

    // ═══════════════════════════════════════════
    // Ingredient Services
    // ═══════════════════════════════════════════
    async getIngredients(userId: string): Promise<Ingredient[]> {
        return this.getByUserId<Ingredient>("ingredientes", userId);
    },

    async addIngredient(ingredient: Omit<Ingredient, "id">, userId: string): Promise<string> {
        return this.add("ingredientes", ingredient, userId);
    },

    async updateIngredient(id: string, ingredient: Partial<Ingredient>): Promise<void> {
        return this.update("ingredientes", id, ingredient);
    },

    async deleteIngredient(id: string): Promise<void> {
        return this.delete("ingredientes", id);
    },

    // ═══════════════════════════════════════════
    // Recipe Services
    // ═══════════════════════════════════════════
    async getRecipes(userId: string): Promise<Recipe[]> {
        return this.getByUserId<Recipe>("recetas", userId);
    },

    async addRecipe(recipe: Omit<Recipe, "id">, userId: string): Promise<string> {
        return this.add("recetas", recipe, userId);
    },

    async updateRecipe(id: string, recipe: Partial<Recipe>): Promise<void> {
        return this.update("recetas", id, recipe);
    },

    async deleteRecipe(id: string): Promise<void> {
        return this.delete("recetas", id);
    },

    // ═══════════════════════════════════════════
    // Client Services
    // ═══════════════════════════════════════════
    async getClients(userId: string): Promise<Client[]> {
        return this.getByUserId<Client>("clientes", userId);
    },

    async addClient(client: Omit<Client, "id">, userId: string): Promise<string> {
        return this.add("clientes", client, userId);
    },

    async updateClient(id: string, client: Partial<Client>): Promise<void> {
        return this.update("clientes", id, client);
    },

    async deleteClient(id: string): Promise<void> {
        return this.delete("clientes", id);
    },

    // ═══════════════════════════════════════════
    // Order Services
    // ═══════════════════════════════════════════
    async getOrders(userId: string): Promise<SaleOrder[]> {
        const orders = await this.getByUserId<SaleOrder>("pedidosVenta", userId);
        return orders.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    },

    async addOrder(order: Omit<SaleOrder, "id">, userId: string): Promise<string> {
        return this.add("pedidosVenta", order, userId);
    },

    async updateOrder(id: string, order: Partial<SaleOrder>): Promise<void> {
        return this.update("pedidosVenta", id, order);
    },

    async deleteOrder(id: string): Promise<void> {
        return this.delete("pedidosVenta", id);
    },

    // ═══════════════════════════════════════════
    // Production Orders Services
    // ═══════════════════════════════════════════
    async getProductionOrders(userId: string): Promise<ProductionOrder[]> {
        const orders = await this.getByUserId<ProductionOrder>("ordenesProduccion", userId);
        return orders.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    },

    async addProductionOrder(order: Omit<ProductionOrder, "id">, userId: string): Promise<string> {
        return this.add("ordenesProduccion", order, userId);
    },

    async updateProductionOrder(id: string, order: Partial<ProductionOrder>): Promise<void> {
        return this.update("ordenesProduccion", id, order);
    },

    // ═══════════════════════════════════════════
    // Billing Services
    // ═══════════════════════════════════════════
    async getInvoices(userId: string): Promise<Invoice[]> {
        const invoices = await this.getByUserId<Invoice>("facturas", userId);
        return invoices.sort((a, b) => b.fechaEmision - a.fechaEmision);
    },

    async addInvoice(invoice: Omit<Invoice, "id">, userId: string): Promise<string> {
        return this.add("facturas", invoice, userId);
    },

    async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<void> {
        return this.update("facturas", id, invoice);
    },

    async deleteInvoice(id: string): Promise<void> {
        return this.delete("facturas", id);
    }
};
