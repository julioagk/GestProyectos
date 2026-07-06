'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  Users,
  Plus,
  Search,
  Loader2,
  Trash2,
  UserPlus,
  Mail,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useDialog } from '../../../components/DialogProvider';

interface TeamMember {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
}

export default function TeamsPage() {
  const { accessToken, user } = useAuthStore();
  const { confirm, showToast } = useDialog();
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states (Team)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for creating members inline
  const [newMembers, setNewMembers] = useState<any[]>([]);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('EMPLOYEE');
  const [showMemberPassword, setShowMemberPassword] = useState(false);

  // Form states (Member)
  const [memberFirstName, setMemberFirstName] = useState('');
  const [memberLastName, setMemberLastName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState('EMPLOYEE');
  const [showMemberModalPassword, setShowMemberModalPassword] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/companies/teams`, {
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
      if (Array.isArray(data)) {
        setTeams(data);
      }
    } catch {
      console.error('Error fetching teams');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchTeams();
    }
  }, [accessToken]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/companies/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, description, newMembers }),
      });

      if (!response.ok) throw new Error();

      setName('');
      setDescription('');
      setNewMembers([]);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('EMPLOYEE');
      setIsModalOpen(false);
      fetchTeams();
    } catch {
      showToast('Error al crear la empresa', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const isConfirmed = await confirm({
      title: 'Eliminar Empresa',
      message: '¿Estás seguro de que deseas eliminar esta empresa? Se eliminarán todos sus usuarios y datos asociados.',
      isDestructive: true,
    });
    if (!isConfirmed) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/companies/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error();
      fetchTeams();
      showToast('Empresa eliminada con éxito', 'success');
    } catch {
      showToast('Error al eliminar la empresa', 'error');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    setIsAddingMember(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      
      const response = await fetch(`${apiUrl}/companies/teams/${selectedTeamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          firstName: memberFirstName,
          lastName: memberLastName,
          email: memberEmail,
          password: memberPassword,
          role: memberRole,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al añadir o crear el usuario');
      }

      setMemberFirstName('');
      setMemberLastName('');
      setMemberEmail('');
      setMemberPassword('');
      setMemberRole('EMPLOYEE');
      setIsMemberModalOpen(false);
      fetchTeams();
      showToast('Usuario creado y añadido con éxito', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al añadir el miembro', 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    const isConfirmed = await confirm({
      title: 'Remover Miembro',
      message: '¿Estás seguro de que deseas remover a este miembro del equipo?',
      isDestructive: true,
    });
    if (!isConfirmed) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/companies/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error();
      fetchTeams();
      showToast('Miembro removido del equipo', 'success');
    } catch {
      showToast('Error al remover el miembro', 'error');
    }
  };

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-h-[80vh]">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
            Empresas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra tus empresas clientes y asocia los usuarios correspondientes para su acceso.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 focus:outline-none shadow-lg shadow-indigo-600/15 active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Plus size={16} className="mr-1.5" />
          Nueva Empresa
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex bg-slate-900/20 p-4 border border-slate-900 rounded-2xl">
        <div className="flex-1 relative rounded-xl shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar empresas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-900 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
          />
        </div>
      </div>

      {/* Teams grid */}
      {isLoading ? (
        <div className="py-24 flex justify-center text-slate-500 text-sm">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mr-2" />
          Cargando empresas...
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-slate-800 rounded-3xl space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
            <Users size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-300">No se encontraron empresas</h3>
            <p className="text-sm text-slate-500 mt-1">Intenta con otra búsqueda o crea una nueva empresa.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 shadow-lg space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{team.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{team.description || 'Sin descripción.'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        setIsMemberModalOpen(true);
                      }}
                      className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/5 transition-all"
                      title="Añadir Usuario"
                    >
                      <UserPlus size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/5 transition-all"
                      title="Eliminar Empresa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-900/80">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Usuarios de la Empresa ({team.members.length})
                  </h4>
                  {team.members.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No hay usuarios en esta empresa aún.</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {team.members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
                              {m.user.firstName[0]}
                              {m.user.lastName[0]}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-semibold text-slate-200 truncate">
                                {m.user.firstName} {m.user.lastName}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">{m.user.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(team.id, m.user.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/5 transition-all"
                            title="Remover Miembro"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal (Team) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-200">Crear Nueva Empresa</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Nombre de la Empresa
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                    placeholder="ej. Kase Chemical Mexico"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 block w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                    placeholder="ej. Distribuidora química o CRM principal"
                  />
                </div>
              </div>

              {/* Sección de creación de miembros */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Crear Usuarios de la Empresa (Opcional)</h3>
                
                {/* Formulario de agregar miembro a la lista */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Apellido"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="email"
                    placeholder="Correo Electrónico"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="col-span-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="relative flex items-center">
                    <input
                      type={showMemberPassword ? 'text' : 'password'}
                      placeholder="Contraseña del Usuario"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-8 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMemberPassword(!showMemberPassword)}
                      className="absolute right-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showMemberPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="EMPLOYEE">Empleado</option>
                    <option value="MANAGER">Gestor</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!newFirstName || !newLastName || !newEmail || !newPassword) {
                      showToast('Por favor completa todos los campos del nuevo usuario', 'error');
                      return;
                    }
                    setNewMembers([...newMembers, {
                      firstName: newFirstName,
                      lastName: newLastName,
                      email: newEmail,
                      password: newPassword,
                      role: newRole
                    }]);
                    setNewFirstName('');
                    setNewLastName('');
                    setNewEmail('');
                    setNewPassword('');
                    setNewRole('EMPLOYEE');
                  }}
                  className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-xs font-semibold text-emerald-400 rounded-xl border border-slate-800 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={14} /> Registrar y Agregar Usuario a la Lista
                </button>

                {/* Lista de miembros pre-agregados */}
                {newMembers.length > 0 && (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pt-2">
                    <p className="text-[10px] font-semibold text-slate-400">Usuarios por crear ({newMembers.length}):</p>
                    {newMembers.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg border border-slate-900 text-xs">
                        <div>
                          <span className="font-semibold text-slate-300">{m.firstName} {m.lastName}</span>
                          <span className="text-slate-500 text-[10px] ml-2">({m.email})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewMembers(newMembers.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-300 px-1.5"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center py-2 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-teal-600/10 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Crear Empresa'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-200">Crear y Añadir Usuario</h2>
              <button onClick={() => setIsMemberModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <p className="text-xs text-slate-400">
                Registra un usuario nuevo directamente para esta empresa. Podrá iniciar sesión usando estas credenciales.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    value={memberFirstName}
                    onChange={(e) => setMemberFirstName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                    placeholder="Ej. Juan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Apellido
                  </label>
                  <input
                    type="text"
                    required
                    value={memberLastName}
                    onChange={(e) => setMemberLastName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                    placeholder="Ej. Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="block w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                    placeholder="correo@empresa.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <input
                    type={showMemberModalPassword ? 'text' : 'password'}
                    required
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    className="block w-full px-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMemberModalPassword(!showMemberModalPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showMemberModalPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Rol de Usuario
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                >
                  <option value="EMPLOYEE">Empleado / Colaborador</option>
                  <option value="MANAGER">Gestor</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="flex items-center py-2 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-teal-600/10 transition-all disabled:opacity-50"
                >
                  {isAddingMember ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Crear y Añadir'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

