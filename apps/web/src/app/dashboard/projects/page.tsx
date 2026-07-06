'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  FolderPlus,
  Plus,
  Search,
  SlidersHorizontal,
  Calendar,
  User,
  Tag,
  Loader2,
  Trash2,
  Building,
  Briefcase,
  Pencil,
  X,
  ChevronDown,
  Columns,
  LayoutGrid
} from 'lucide-react';
import Link from 'next/link';
import { useDialog } from '../../../components/DialogProvider';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  progress: number;
  startDate?: string;
  endDate?: string;
  team?: {
    id: string;
    name: string;
  };
  responsible?: {
    firstName: string;
    lastName: string;
  };
  _count?: {
    tasks: number;
  };
}

const defaultProjectStages = [
  { id: 'PENDING', name: 'Pendientes' },
  { id: 'IN_PROGRESS', name: 'En Progreso' },
  { id: 'IN_REVIEW', name: 'En Revisión' },
  { id: 'PAUSED', name: 'Pausados' },
  { id: 'COMPLETED', name: 'Completados' },
  { id: 'CANCELLED', name: 'Cancelados' }
];

export default function ProjectsPage() {
  const { accessToken } = useAuthStore();
  const { confirm, showToast } = useDialog();
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<'GRID' | 'STAGES'>('GRID');
  const [projectStages, setProjectStages] = useState<{ id: string; name: string }[]>([]);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Selector state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('PENDING');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      if (selectedCompanyId !== 'ALL') {
        setTeamId(selectedCompanyId);
      } else {
        setTeamId('');
      }
    }
  }, [isModalOpen, selectedCompanyId]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/projects`, {
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
        setProjects(data);
      }
    } catch {
      console.error('Error fetching projects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
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
    }
  };

  // Load project stages on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('project-stages');
      if (stored) {
        try {
          setProjectStages(JSON.parse(stored));
        } catch {
          setProjectStages(defaultProjectStages);
        }
      } else {
        setProjectStages(defaultProjectStages);
        localStorage.setItem('project-stages', JSON.stringify(defaultProjectStages));
      }
    }
  }, []);

  const handleUpdateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      const p = projects.find(proj => proj.id === projectId);
      if (!p) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: p.name,
          description: p.description,
          priority: p.priority,
          status: newStatus,
          teamId: p.team?.id || undefined,
          startDate: p.startDate,
          endDate: p.endDate,
        }),
      });
      if (!response.ok) throw new Error();
      fetchProjects();
      showToast('Estado del proyecto actualizado', 'success');
    } catch {
      showToast('Error al actualizar el estado del proyecto', 'error');
    }
  };

  const handleRenameStage = (stageId: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = projectStages.map((stg) => stg.id === stageId ? { ...stg, name: newName.trim() } : stg);
    setProjectStages(updated);
    localStorage.setItem('project-stages', JSON.stringify(updated));
    setEditingStageId(null);
    showToast('Etapa renombrada', 'success');
  };

  const handleAddStage = () => {
    const newStageId = `stage-${Date.now()}`;
    const updated = [...projectStages, { id: newStageId, name: 'Nueva Etapa' }];
    setProjectStages(updated);
    localStorage.setItem('project-stages', JSON.stringify(updated));
    showToast('Nueva etapa de proyecto creada', 'success');
  };

  const handleDeleteStage = async (stageId: string) => {
    if (projectStages.length <= 1) {
      showToast('Debe quedar al menos una etapa de proyecto.', 'error');
      return;
    }
    const projectsInStage = projects.filter((p) => p.status === stageId);
    if (projectsInStage.length > 0) {
      const isConfirmed = await confirm({
        title: '¿Eliminar etapa de proyecto?',
        message: `Esta etapa contiene ${projectsInStage.length} proyecto(s). Si la eliminas, se moverán a la primera etapa disponible. ¿Deseas continuar?`,
        isDestructive: true,
      });
      if (!isConfirmed) return;

      const fallbackStageId = projectStages.find((s) => s.id !== stageId)?.id || 'PENDING';
      for (const p of projectsInStage) {
        await handleUpdateProjectStatus(p.id, fallbackStageId);
      }
    }
    const updated = projectStages.filter((stg) => stg.id !== stageId);
    setProjectStages(updated);
    localStorage.setItem('project-stages', JSON.stringify(updated));
    showToast('Etapa de proyecto eliminada', 'success');
  };

  // Project Drag & Drop
  const handleProjectDragStart = (e: React.DragEvent, projId: string) => {
    e.dataTransfer.setData('text/plain', projId);
  };

  const handleProjectDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleProjectDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const projId = e.dataTransfer.getData('text/plain');
    if (!projId) return;

    // Optimistic Update
    const prevProjects = [...projects];
    setProjects(
      projects.map((p) => (p.id === projId ? { ...p, status: targetStageId } : p))
    );

    try {
      const p = prevProjects.find((proj) => proj.id === projId);
      if (!p) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/projects/${projId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: p.name,
          description: p.description,
          priority: p.priority,
          status: targetStageId,
          teamId: p.team?.id || undefined,
          startDate: p.startDate,
          endDate: p.endDate,
        }),
      });
      if (!response.ok) throw new Error();
      fetchProjects();
      showToast('Proyecto movido con éxito', 'success');
    } catch {
      setProjects(prevProjects);
      showToast('Error al mover el proyecto', 'error');
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchProjects();
      fetchTeams();
    }
  }, [accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          description,
          priority,
          status,
          teamId: teamId || undefined,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
        }),
      });

      if (!response.ok) throw new Error();
      
      // Reset form
      setName('');
      setDescription('');
      setPriority('MEDIUM');
      setStatus('PENDING');
      setStartDate('');
      setEndDate('');
      setTeamId('');
      setIsModalOpen(false);

      // Refresh list
      fetchProjects();
    } catch {
      showToast('Error al crear el proyecto', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const isConfirmed = await confirm({
      title: 'Eliminar Proyecto',
      message: '¿Estás seguro de que deseas eliminar este proyecto? Se eliminarán todas sus tareas y datos asociados.',
      isDestructive: true,
    });
    if (!isConfirmed) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error();
      fetchProjects();
      showToast('Proyecto eliminado con éxito', 'success');
    } catch {
      showToast('Error al eliminar el proyecto', 'error');
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Grouped projects mapping:
  const groupedProjects: Record<string, { companyName: string; projects: Project[] }> = {};

  filteredProjects.forEach((project) => {
    const companyId = project.team?.id || 'OTHER';
    const companyName = project.team?.name || 'Proyectos Generales';
    if (!groupedProjects[companyId]) {
      groupedProjects[companyId] = { companyName, projects: [] };
    }
    groupedProjects[companyId].projects.push(project);
  });

  const companyProjects = filteredProjects.filter(p => p.team?.id === selectedCompanyId);

  const renderProjectCard = (project: Project) => (
    <div
      draggable
      onDragStart={(e) => handleProjectDragStart(e, project.id)}
      key={project.id}
      className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 hover:border-slate-800/80 hover:bg-slate-900/50 transition-all flex flex-col justify-between group shadow-lg cursor-grab active:cursor-grabbing"
    >
      <div>
        <div className="flex justify-between items-start gap-4">
          <Link href={`/dashboard/projects/${project.id}`} className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors text-sm truncate">
              {project.name}
            </h3>
          </Link>
          <button
            onClick={(e) => handleDelete(e, project.id)}
            className="text-slate-600 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/5 transition-all opacity-0 group-hover:opacity-100 shrink-0"
            title="Eliminar Proyecto"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
          {project.description || 'Sin descripción disponible.'}
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-900/80 space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Progreso de Tareas</span>
            <span className="font-medium text-slate-300">{project.progress}%</span>
          </div>
          <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500 gap-2">
          <div className="flex items-center gap-1">
            <Tag size={10} className="text-emerald-400" />
            <span>{project._count?.tasks || 0} tareas</span>
          </div>
          {project.team && (
            <div className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900 max-w-[110px]">
              <Building size={9} className="shrink-0" />
              <span className="truncate">{project.team.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'IN_PROGRESS': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'IN_REVIEW': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PAUSED': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CANCELLED': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700/50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-rose-500/10 text-rose-400';
      case 'HIGH': return 'bg-amber-500/10 text-amber-400';
      case 'MEDIUM': return 'bg-sky-500/10 text-sky-400';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative min-h-[80vh]">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
            Proyectos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra, planifica y haz el seguimiento de todos tus proyectos.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 focus:outline-none shadow-lg shadow-indigo-600/15 active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Plus size={16} className="mr-1.5" />
          Nuevo Proyecto
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/20 p-4 border border-slate-900 rounded-2xl">
        <div className="flex-1 relative rounded-xl shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar proyectos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-900 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
          />
        </div>

        {/* Selector de tipo de Vista (Cuadrícula o Kanban) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800/80 shrink-0">
          <button
            onClick={() => setViewMode('GRID')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'GRID'
                ? 'bg-slate-900 text-emerald-400 shadow-sm shadow-emerald-500/5'
                : 'text-slate-550 hover:text-slate-300'
            }`}
            title="Vista de Cuadrícula"
          >
            <LayoutGrid size={13} />
            Cuadrícula
          </button>
          <button
            onClick={() => setViewMode('STAGES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'STAGES'
                ? 'bg-slate-900 text-emerald-400 shadow-sm shadow-emerald-500/5'
                : 'text-slate-550 hover:text-slate-300'
            }`}
            title="Vista por Etapas (Kanban)"
          >
            <Columns size={13} />
            Etapas
          </button>
        </div>

        <button className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-900 rounded-xl bg-slate-950 text-xs text-slate-400 hover:text-slate-200 transition-colors">
          <SlidersHorizontal size={14} />
          Filtros
        </button>
      </div>

      {/* Selector de Empresa */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ver Proyectos de:</span>
        <div className="flex gap-2 overflow-x-auto pb-2.5 scrollbar-thin scrollbar-thumb-slate-900 scrollbar-track-transparent">
          <button
            onClick={() => setSelectedCompanyId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
              selectedCompanyId === 'ALL'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-md shadow-emerald-500/5'
                : 'bg-slate-950/40 text-slate-400 border-slate-900 hover:border-slate-800 hover:text-slate-205'
            }`}
          >
            Todos los Proyectos
          </button>
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedCompanyId(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedCompanyId === t.id
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-md shadow-emerald-500/5'
                  : 'bg-slate-950/40 text-slate-400 border-slate-900 hover:border-slate-800 hover:text-slate-205'
              }`}
            >
              <Building size={12} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="py-24 flex justify-center text-slate-500 text-sm">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mr-2" />
          Cargando proyectos...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-slate-800 rounded-3xl space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
            <FolderPlus size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-300">No se encontraron proyectos</h3>
            <p className="text-sm text-slate-500 mt-1">Intenta con otra búsqueda o crea uno nuevo.</p>
          </div>
        </div>
      ) : viewMode === 'STAGES' ? (
        <div className="flex gap-6 items-start overflow-x-auto pb-4" style={{ minWidth: 0 }}>
          {projectStages.map((stage) => {
            const stageProjects = filteredProjects.filter(
              (p) => p.status === stage.id && (selectedCompanyId === 'ALL' || p.team?.id === selectedCompanyId)
            );
            return (
              <div
                key={stage.id}
                onDragOver={handleProjectDragOver}
                onDrop={(e) => handleProjectDrop(e, stage.id)}
                className="bg-slate-900/10 border border-slate-900/60 rounded-2xl p-3 flex flex-col gap-3 min-h-[550px] min-w-[210px] max-w-[260px] flex-1"
              >
                {/* Stage Header */}
                <div className="flex justify-between items-center px-1 group/stage">
                  {editingStageId === stage.id ? (
                    <form
                      className="flex items-center gap-1 flex-1"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRenameStage(stage.id, editingStageName);
                      }}
                    >
                      <input
                        autoFocus
                        type="text"
                        value={editingStageName}
                        onChange={(e) => setEditingStageName(e.target.value)}
                        onBlur={() => handleRenameStage(stage.id, editingStageName)}
                        className="w-full px-2 py-1 bg-slate-955 border border-emerald-500/50 rounded text-xs text-slate-200 focus:outline-none"
                      />
                    </form>
                  ) : (
                    <span
                      className="text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-default truncate max-w-[150px]"
                      onDoubleClick={() => {
                        setEditingStageId(stage.id);
                        setEditingStageName(stage.name);
                      }}
                    >
                      {stage.name}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                      {stageProjects.length}
                    </span>
                    {editingStageId !== stage.id && (
                      <>
                        <button
                          onClick={() => {
                            setEditingStageId(stage.id);
                            setEditingStageName(stage.name);
                          }}
                          className="opacity-0 group-hover/stage:opacity-100 transition-opacity p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-350"
                          title="Renombrar etapa"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          className="opacity-0 group-hover/stage:opacity-100 transition-opacity p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-455"
                          title="Eliminar etapa"
                        >
                          <X size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Projects in this stage */}
                <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
                  {stageProjects.map((project) => renderProjectCard(project))}
                  {stageProjects.length === 0 && (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-slate-900 rounded-2xl py-8 text-center text-slate-600 text-xs italic">
                      Sin proyectos
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Stage Column */}
          <button
            onClick={handleAddStage}
            className="flex items-center justify-center gap-2 min-w-[170px] py-4 bg-slate-900/10 border border-dashed border-slate-900 hover:border-slate-850 hover:bg-slate-900/20 text-slate-450 hover:text-slate-300 rounded-2xl text-xs font-semibold transition-all self-stretch min-h-[550px]"
          >
            <Plus size={14} />
            Agregar Etapa
          </button>
        </div>
      ) : selectedCompanyId === 'ALL' ? (
        <div className="space-y-10">
          {Object.keys(groupedProjects).map((companyId) => {
            const group = groupedProjects[companyId];
            return (
              <div key={companyId} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-900/60 pb-2">
                  <Building className="text-emerald-400 shrink-0" size={15} />
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{group.companyName}</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-950 border border-slate-900 text-slate-500 font-semibold">
                    {group.projects.length} {group.projects.length === 1 ? 'proyecto' : 'proyectos'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.projects.map((project) => renderProjectCard(project))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-900/60 pb-2">
            <Building className="text-emerald-400 shrink-0" size={15} />
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {teams.find((t) => t.id === selectedCompanyId)?.name || 'Proyectos de Empresa'}
            </h2>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-950 border border-slate-900 text-slate-500 font-semibold">
              {companyProjects.length} {companyProjects.length === 1 ? 'proyecto' : 'proyectos'}
            </span>
          </div>

          {companyProjects.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-3xl space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
                <FolderPlus size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-300">No hay proyectos para esta empresa</h3>
                <p className="text-sm text-slate-500 mt-1">¡Crea un proyecto para empezar a trabajar con este cliente!</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-[0.98] transition-all"
              >
                + Crear Proyecto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companyProjects.map((project) => renderProjectCard(project))}
            </div>
          )}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-200">Crear Nuevo Proyecto</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                  placeholder="ej. Rediseño del Sitio Web"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all resize-none"
                  placeholder="Describe brevemente el alcance o detalles del proyecto..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Empresa del Cliente (Hacer proyecto en base a la empresa)
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none"
                >
                  <option value="">Selecciona una empresa...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Etapa Inicial del Proyecto
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none"
                >
                  {projectStages.map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      {stg.name}
                    </option>
                  ))}
                </select>
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
                    'Crear Proyecto'
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

