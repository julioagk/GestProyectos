'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { Calendar, ChevronLeft, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  dueDate?: string;
  status: string;
  projectId: string;
  project: {
    name: string;
  };
}

export default function CalendarPage() {
  const { accessToken } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        setIsLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        
        // Fetch projects first
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
        const projects = await projRes.json();
        
        if (Array.isArray(projects)) {
          const allTasks: Task[] = [];
          for (const proj of projects) {
            const tasksRes = await fetch(`${apiUrl}/tasks/project/${proj.id}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (tasksRes.status === 401 || tasksRes.status === 403) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('user');
              localStorage.removeItem('refreshToken');
              window.location.href = '/auth/login';
              return;
            }
            const projectTasks = await tasksRes.json();
            if (Array.isArray(projectTasks)) {
              allTasks.push(...projectTasks.map((t: any) => ({ ...t, project: { name: proj.name } })));
            }
          }
          setTasks(allTasks.filter(t => t.dueDate)); // Solo tareas con fecha límite
        }
      } catch (err) {
        console.error('Error fetching calendar tasks:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchAllTasks();
    }
  }, [accessToken]);

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDayTasks = (day: number) => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  // Generate blank grids before first day of month
  const gridItems = [];
  // Adjust first day offset for Monday as start of week (0 is Sunday, so 0->6, 1->0, 2->1...)
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  for (let i = 0; i < offset; i++) {
    gridItems.push(<div key={`empty-${i}`} className="h-28 bg-slate-950/20 border border-slate-900/30 rounded-lg opacity-40" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayTasks = getDayTasks(day);
    gridItems.push(
      <div
        key={`day-${day}`}
        className="h-28 bg-slate-900/30 border border-slate-900 rounded-lg p-2.5 space-y-2 overflow-y-auto hover:border-slate-800 transition-all"
      >
        <span className="text-xs font-bold text-slate-400 block">{day}</span>
        <div className="space-y-1">
          {dayTasks.map((task) => (
            <Link
              href={`/dashboard/projects/${task.projectId}`}
              key={task.id}
              className="block p-1 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 rounded text-[9px] font-medium text-emerald-300 truncate"
              title={`${task.title} - ${task.project.name}`}
            >
              {task.title}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-h-[85vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 font-sans">
            Calendario de Entregas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualiza las fechas límite de todas las tareas activas de tu empresa.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 border border-slate-900 px-3.5 py-1.5 rounded-xl">
          <button onClick={handlePrevMonth} className="text-slate-400 hover:text-slate-200">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-200 min-w-[120px] text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={handleNextMonth} className="text-slate-400 hover:text-slate-200">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center text-slate-500 text-sm">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mr-2" />
          Cargando calendario...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {daysOfWeek.map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {gridItems}
          </div>
        </div>
      )}
    </div>
  );
}

