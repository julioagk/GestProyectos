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

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetch(`${apiUrl}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
        }
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  const markAsRead = async (recipientId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetch(`${apiUrl}/notifications/${recipientId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === recipientId ? { ...n, isRead: true } : n))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // Polling every 15 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none" />

      {/* Sidebar Desktop */}
      <aside
        className={`hidden md:flex flex-col h-screen sticky top-0 border-r border-slate-200 bg-white transition-all duration-300 z-20 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo / Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 min-w-[32px] rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-sm shadow-md text-white">
              {(user.companyName || user.companySlug || 'P')[0].toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <span className="font-bold tracking-tight text-slate-800 truncate text-base uppercase">
                {user.companyName || user.companySlug || 'Proyecto'}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all group relative ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-600'} />
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
        <div className="p-4 border-t border-slate-200 mt-auto shrink-0 bg-white">
          <div className={`flex items-center justify-between gap-3 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-emerald-600 text-sm">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <h4 className="font-bold text-slate-850 text-xs truncate">
                    {user.firstName} {user.lastName}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">
                    {user.role === 'MANAGER' ? 'Gestor' : user.role === 'COMPANY_ADMIN' ? 'Administrador' : 'Colaborador'}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-500/5 transition-all"
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 pb-16 md:pb-0">
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

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="text-slate-400 hover:text-emerald-400 p-2 rounded-xl hover:bg-slate-900/65 relative transition-all active:scale-95"
              title="Notificaciones"
            >
              <Bell size={20} />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-pulse" />
              )}
            </button>

            {showNotificationsDropdown && (
              <div className="absolute right-0 top-12 w-80 bg-slate-950 border border-slate-900 rounded-2xl shadow-2xl z-50 overflow-hidden py-1">
                <div className="px-4 py-2.5 border-b border-slate-900 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Notificaciones</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    {notifications.filter(n => !n.isRead).length} nuevas
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-slate-500 text-[11px] italic">
                      No tienes notificaciones
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (!item.isRead) markAsRead(item.id);
                          if (item.notification.link) {
                            router.push(item.notification.link);
                          }
                          setShowNotificationsDropdown(false);
                        }}
                        className={`px-4 py-3 hover:bg-slate-900/60 border-b border-slate-900/40 cursor-pointer flex flex-col gap-0.5 transition-colors ${
                          !item.isRead ? 'bg-emerald-500/[0.02]' : 'opacity-70'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className={`text-xs font-bold ${!item.isRead ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {item.notification.title}
                          </span>
                          {!item.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal font-medium">
                          {item.notification.message}
                        </p>
                        <span className="text-[9px] text-slate-500 mt-1">
                          {new Date(item.notification.createdAt).toLocaleDateString()} {new Date(item.notification.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-950 border-t border-slate-900 flex items-center justify-around px-2 md:hidden z-35 backdrop-blur-md bg-slate-950/90">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] mt-1">{link.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

