'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Folder,
  CheckSquare,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface Log {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  priority: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, accessToken } = useAuthStore();
  const canSeeCompanies = user?.role !== 'EMPLOYEE';
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingTasks: 0,
    totalTeams: 0,
    overdueTasks: 0,
  });
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !accessToken) return;

    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        
        // Fetch projects
        const projRes = await fetch(`${apiUrl}/projects`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (projRes.status === 401 || projRes.status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login';
          return;
        }
        const projData = await projRes.json();
        
        // Fetch teams
        const teamsRes = await fetch(`${apiUrl}/companies/teams`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const teamsData = await teamsRes.json();

        // Fetch aggregated dashboard stats
        const statsRes = await fetch(`${apiUrl}/projects/dashboard/stats`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const statsData = await statsRes.json();

        if (Array.isArray(projData)) {
          setProjects(projData.slice(0, 4));

          // Fetch tasks for reminders
          const allTasks: any[] = [];
          for (const proj of projData) {
            const tasksRes = await fetch(`${apiUrl}/tasks/project/${proj.id}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (tasksRes.ok) {
              const projectTasks = await tasksRes.json();
              if (Array.isArray(projectTasks)) {
                allTasks.push(...projectTasks.map((t: any) => ({ ...t, projectName: proj.name })));
              }
            }
          }
          const activeReminders = allTasks
            .filter((t: any) => t.dueDate && t.status !== 'COMPLETED')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
          setReminders(activeReminders.slice(0, 5));
        }

        setStats({
          activeProjects: statsData.activeProjects || 0,
          pendingTasks: statsData.pendingTasks || 0,
          totalTeams: Array.isArray(teamsData) ? teamsData.length : 0,
          overdueTasks: statsData.overdueTasks || 0,
        });

        if (Array.isArray(statsData.activities)) {
          setRecentLogs(statsData.activities);
        } else {
          setRecentLogs([
            {
              id: '1',
              action: 'WELCOME',
              description: `Te damos la bienvenida a tu gestor de proyectos, ${user.firstName}.`,
              createdAt: new Date().toISOString(),
            }
          ]);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, accessToken]);

  const cards = [
    { name: 'Proyectos Activos', value: stats.activeProjects, icon: Folder, color: 'from-emerald-500 to-teal-600', description: 'Proyectos en desarrollo' },
    { name: 'Tareas Pendientes', value: stats.pendingTasks, icon: CheckSquare, color: 'from-teal-400 to-cyan-500', description: 'Tareas por completar' },
    { name: 'Empresas registradas', value: stats.totalTeams, icon: Users, color: 'from-emerald-500 to-teal-600', description: 'Empresas de clientes' },
    { name: 'Tareas Vencidas', value: stats.overdueTasks, icon: Clock, color: 'from-amber-500 to-orange-500', description: 'Fuera de fecha límite' },
  ].filter((card) => canSeeCompanies || card.name !== 'Empresas registradas');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
          Hola, {user?.firstName} 👋
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Aquí tienes un resumen de la actividad de tu empresa hoy.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-800/80 transition-all shadow-xl"
            >
              {/* Radial background glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">{card.name}</span>
                <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${card.color} opacity-90 shadow-md`}>
                  <Icon size={16} className="text-white" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-slate-100">{card.value}</span>
                <div className="text-[10px] text-slate-500 mt-1.5 font-medium">
                  {card.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Projects List */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="text-emerald-400" size={18} />
              <h2 className="text-lg font-bold text-slate-200">Proyectos Recientes</h2>
            </div>
            <Link href="/dashboard/projects" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center text-slate-500 text-sm">Cargando proyectos...</div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
              No tienes proyectos creados. ¡Comienza creando uno!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  key={project.id}
                  className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl hover:border-slate-800 transition-all hover:bg-slate-900/60 group block"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-slate-200 text-sm truncate group-hover:text-emerald-400 transition-colors">
                      {project.name}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      project.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      project.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      project.priority === 'MEDIUM' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-700/20 text-slate-300 border border-slate-700/50'
                    }`}>
                      {project.priority}
                    </span>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Progreso</span>
                      <span className="font-medium text-slate-300">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* Recordatorios */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="text-amber-400 animate-pulse" size={18} />
                <h2 className="text-lg font-bold text-slate-200">Recordatorios</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Fechas Límite
              </span>
            </div>

            <div className="space-y-3">
              {reminders.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2 text-center">No hay vencimientos próximos.</p>
              ) : (
                reminders.map((task) => {
                  const isOverdue = new Date(task.dueDate).getTime() < new Date().getTime();
                  return (
                    <Link
                      href={`/dashboard/projects/${task.projectId}`}
                      key={task.id}
                      className="block p-3 bg-slate-950/40 border border-slate-900 hover:border-slate-800 rounded-xl transition-all"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-xs text-slate-200 line-clamp-1">
                          {task.title}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 font-medium ${
                          isOverdue ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                        }`}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-slate-500 mt-2 pt-2 border-t border-slate-900/50">
                        <span>Proyecto: {task.projectName}</span>
                        <span className="capitalize">{task.status === 'PENDING' ? 'Pendiente' : task.status === 'IN_PROGRESS' ? 'En proceso' : 'En revisión'}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2">
              <Activity className="text-emerald-400" size={18} />
              <h2 className="text-lg font-bold text-slate-200">Actividad Reciente</h2>
            </div>

          <div className="space-y-4 overflow-y-auto max-h-[300px] pr-1">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex gap-3 text-xs border-b border-slate-900 pb-3 last:border-0 last:pb-0">
                <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 shrink-0 mt-0.5">
                  {log.description[0]}
                </div>
                <div>
                  <p className="text-slate-300 leading-normal">{log.description}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

