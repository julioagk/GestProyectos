'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  Building,
  Loader2,
  Lock
} from 'lucide-react';
import { useDialog } from '../../../components/DialogProvider';

interface CompanySettings {
  id: string;
  name: string;
  logoUrl?: string;
  slug: string;
  subscriptionStatus: string;
  plan: {
    name: string;
    price: number;
    maxUsers: number;
    maxProjects: number;
    storageLimitGB: number;
  };
}

interface Invoice {
  id: string;
  billingDate: string;
  amount: number;
  status: string;
}

export default function SettingsPage() {
  const { accessToken, user, setAuth } = useAuthStore();
  const { showToast } = useDialog();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);


  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        
        const res = await fetch(`${apiUrl}/companies/settings`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login';
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSettings(data);
        setCompanyName(data.name);
        setLogoUrl(data.logoUrl || '');

        // Mock invoices based on plan
        setInvoices([
          {
            id: 'INV-2026-001',
            billingDate: '2026-06-01T00:00:00.000Z',
            amount: data.plan.price,
            status: 'PAID',
          },
          {
            id: 'INV-2026-002',
            billingDate: '2026-07-01T00:00:00.000Z',
            amount: data.plan.price,
            status: 'PAID',
          },
        ]);
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchSettings();
    }
  }, [accessToken]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/companies/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: companyName, logoUrl }),
      });

      if (!response.ok) throw new Error();
      
      const storedUser = localStorage.getItem('user');
      if (storedUser && accessToken) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.companyName = companyName;
          localStorage.setItem('user', JSON.stringify(parsed));
          setAuth(parsed, accessToken);
        } catch (e) {
          console.error('Error parsing user storage', e);
        }
      }

      showToast('Configuración guardada exitosamente', 'success');
    } catch {
      showToast('Error al guardar la configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/auth/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Error al cambiar contraseña');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Contraseña actualizada exitosamente', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al cambiar la contraseña', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'TRIALING':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PAST_DUE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center text-slate-500 text-sm gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span>Cargando configuraciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto min-h-[85vh]">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
          Configuración
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Ajusta los detalles de tu empresa, plan de facturación y permisos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation Sidebar settings */}
        <div className="space-y-2">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Building size={14} className="text-emerald-400" /> Perfil de Empresa
          </div>
          <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl text-xs font-semibold text-slate-400 flex items-center gap-2">
            <Lock size={14} className="text-slate-500" /> Seguridad
          </div>
        </div>

        {/* Configurations content */}
        <div className="md:col-span-2 space-y-8">
          {/* Section 1: Profile */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-base font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-2">
              <Building size={16} className="text-emerald-400" /> Detalles de la Empresa
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Logo URL (Demostración)
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/logo.png"
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-teal-600/10 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>



          {/* Section 2: Change Password */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-base font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center gap-2">
              <Lock size={16} className="text-emerald-400" /> Cambiar Contraseña
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                  placeholder="Mín. 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 text-sm transition-all ${
                    confirmPassword && newPassword !== confirmPassword
                      ? 'border-rose-500/50 focus:ring-rose-500'
                      : 'border-slate-800 focus:ring-emerald-500'
                  }`}
                  placeholder="Repite la nueva contraseña"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[10px] text-rose-400 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isChangingPassword || (!!confirmPassword && newPassword !== confirmPassword)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-teal-600/10 transition-all disabled:opacity-50"
              >
                {isChangingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>


        </div>
      </div>
    </div>
  );
}

