# BakeryOS 🥐

BakeryOS es un sistema ERP (Enterprise Resource Planning) moderno y potente diseñado específicamente para la gestión integral de panaderías y pastelerías. Permite a los administradores llevar un control en tiempo real del inventario, la producción, los pedidos y la facturación desde una única plataforma centralizada.

## 🚀 Características Principales (Sprint 1)
- **Autenticación Segura:** Sistema de login mediante Firebase Authentication.
- **Dashboard Interactivo:** Panel de control con métricas clave y gráficos en tiempo real usando Recharts.
- **Gestión de Inventario CRUD:** Control total de materias primas conectado en tiempo real a Firebase Firestore, incluyendo alertas dinámicas de stock.
- **Layout Profesional:** Interfaz de usuario moderna, limpia y retráctil construida con Tailwind CSS y componentes de Lucide.

## 🛠️ Stack Tecnológico
- **Frontend Framework:** [Next.js 15+](https://nextjs.org/) (App Router, React 19)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Base de Datos & Auth:** [Firebase](https://firebase.google.com/) (Firestore, Authentication)
- **Visualización de Datos:** [Recharts](https://recharts.org/)
- **Iconografía:** [Lucide React](https://lucide.dev/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)

## 📋 Requisitos Previos
Asegúrate de tener instalado en tu entorno local:
- [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
- Un gestor de paquetes como `npm`, `yarn` o `pnpm`.
- Un proyecto configurado en **Firebase** para obtener las credenciales de entorno.

## ⚙️ Instalación y Configuración

Sigue estos pasos para arrancar el entorno de desarrollo local:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/noah-catalan/BakeryOS.git
   cd bakeryos
   ```

2. **Instalar las dependencias:**
   ```bash
   npm install
   ```

3. **Configurar las variables de entorno:**
   Crea un archivo llamado `.env.local` en la raíz del proyecto y añade tus credenciales de Firebase:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY="tu-api-key"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="tu-auth-domain"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="tu-project-id"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="tu-storage-bucket"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="tu-sender-id"
   NEXT_PUBLIC_FIREBASE_APP_ID="tu-app-id"
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="tu-measurement-id"
   ```

4. **Arrancar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

5. **Ver la aplicación:**
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la interfaz.

---
*Desarrollado con ❤️ para transformar la gestión panadera.*
