'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/useAuthStore';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  Search,
  Loader2
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth, setAuth } = useAuthStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const canSeeCompanies = user?.role !== 'EMPLOYEE';

  // Cargar sesión del localStorage
  useEffect(() => {
    setIsClient(true);
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');
    if (storedUser && storedToken) {
      setAuth(JSON.parse(storedUser), storedToken);
    } else {
      router.push('/auth/login');
    }
  }, [setAuth, router]);

  if (!isClient || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    // Limpiar localStorage y store
    clearAuth();
    localStorage.removeItem('refreshToken');
    router.push('/auth/login');
  };

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Proyectos', href: '/dashboard/projects', icon: FolderKanban },
    ...(canSeeCompanies ? [{ name: 'Empresas', href: '/dashboard/teams', icon: Users }] : []),
    { name: 'Calendario', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-emerald-900/5 blur-[150px] pointer-events-none" />

      {/* Sidebar Desktop */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-900 bg-slate-950/80 backdrop-blur-md transition-all duration-300 z-20 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo / Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 min-w-[32px] rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-sm shadow-md text-white">
              {(user.companyName || user.companySlug || 'P')[0].toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <span className="font-bold tracking-tight text-slate-100 truncate text-base uppercase">
                {user.companyName || user.companySlug || 'Proyecto'}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'} />
                {!isSidebarCollapsed && <span>{link.name}</span>}
                {isSidebarCollapsed && (
                  <div className="absolute left-16 bg-slate-900 text-slate-200 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-800 shadow-xl z-50">
                    {link.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile / Logout */}
        <div className="p-4 border-t border-slate-900">
          <div className={`flex items-center justify-between gap-3 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-emerald-400 text-sm">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <h4 className="font-semibold text-slate-200 text-xs truncate">
                    {user.firstName} {user.lastName}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">
                    {user.role === 'MANAGER' ? 'Gestor' : user.role === 'COMPANY_ADMIN' ? 'Administrador' : 'Colaborador'}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/5 transition-all"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileOpen(false)}>
          <aside className="w-64 h-full bg-slate-950 border-r border-slate-900 flex flex-col p-4 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-900">
              <span className="font-bold text-slate-100 text-lg">Menu</span>
              <button onClick={() => setIsMobileOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>
            <nav className="flex-1 space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-slate-900 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">{user.firstName}</span>
              <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 p-2 rounded-xl">
                <LogOut size={16} />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main View Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-slate-900 flex items-center justify-between px-6 bg-slate-950/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
            >
              <Menu size={20} />
            </button>
            {/* Search bar */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 w-64 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
              <Search size={14} className="text-slate-500" />
              <input
                type="text"
                placeholder="Búsqueda global..."
                className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* No notifications */}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

