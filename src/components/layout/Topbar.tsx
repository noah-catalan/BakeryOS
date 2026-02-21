import { Search, Bell } from 'lucide-react';

export default function Topbar() {
    return (
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-8">
            {/* Page Title */}
            <h1 className="text-xl font-semibold text-slate-800">
                Panel de Control
            </h1>

            {/* Right Side: Search and Notifications */}
            <div className="flex items-center gap-6">
                {/* Search */}
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search size={16} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="block w-64 rounded-md border-0 py-1.5 pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 bg-slate-50"
                    />
                </div>

                {/* Notifications */}
                <button type="button" className="relative rounded-full bg-white p-1 text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <span className="sr-only">Ver notificaciones</span>
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 block w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>
            </div>
        </header>
    );
}
