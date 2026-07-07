'use client';

import React, { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { useAuthStore } from '../../../../store/useAuthStore';
import {
  Calendar,
  CheckSquare,
  Clock,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  CheckCircle2,
  User,
  MessageSquare,
  Paperclip,
  Activity,
  UserPlus,
  Pencil,
  X,
  Upload,
  Eye,
  Download,
  FileText,
  Link2,
  History,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useDialog } from '../../../../components/DialogProvider';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours: number;
  workedHours: number;
  kanbanOrder: string;
  responsible?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  checklistItems?: {
    id: string;
    title: string;
    isCompleted: boolean;
  }[];
  subtasks?: any[];
  dependencies?: any[];
  createdAt?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  progress: number;
  startDate?: string;
  endDate?: string;
  responsible?: {
    firstName: string;
    lastName: string;
  };
  team?: any;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

interface Attachment {
  id?: string;
  name: string;
  dataUrl: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
  uploadedBy?: string;
}

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  
  const { accessToken, user } = useAuthStore();
  const { confirm, showToast } = useDialog();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Task selection for detail Drawer
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // New task creation states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newStatus, setNewStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'>('PENDING');
  const [newDueDate, setNewDueDate] = useState('');
  const [newEstimatedHours, setNewEstimatedHours] = useState(0);
  const [newResponsibleId, setNewResponsibleId] = useState('');
  const [membersList, setMembersList] = useState<any[]>([]);
  const [inlineTaskTitles, setInlineTaskTitles] = useState<Record<string, string>>({});
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Project's team info for filtering assignees
  const [projectTeamId, setProjectTeamId] = useState<string | null>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  // Top Tabs: Kanban vs Files
  const [activeTab, setActiveTab] = useState<'KANBAN' | 'FILES'>('KANBAN');
  const [projectFiles, setProjectFiles] = useState<Attachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // Drawer Tabs: Comments vs Activity History
  const [activityTab, setActivityTab] = useState<'COMMENTS' | 'ACTIVITY'>('COMMENTS');
  const [taskActivities, setTaskActivities] = useState<any[]>([]);

  // Comments and Checklist inside drawer
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [isLoggingHours, setIsLoggingHours] = useState(false);
  const [logHoursVal, setLogHoursVal] = useState(0);

  // States for Checklist Proofs / Evidences
  const [openChecklistId, setOpenChecklistId] = useState<string | null>(null);
  const [proofs, setProofs] = useState<Record<string, Attachment[]>>({});



  useEffect(() => {
    if (!projectId) return;
    const colKey = `project-columns-${projectId}`;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(colKey);
      if (stored) {
        try {
          setColumns(JSON.parse(stored));
        } catch {
          setDefaultCols();
        }
      } else {
        setDefaultCols();
      }

      // Load files
      const fileKey = `project-files-${projectId}`;
      const storedFiles = localStorage.getItem(fileKey);
      if (storedFiles) {
        try { setProjectFiles(JSON.parse(storedFiles)); } catch {}
      } else {
        setProjectFiles([]);
      }
    }
  }, [projectId]);

  const setDefaultCols = () => {
    const defaultCols = [
      { id: 'PENDING', name: 'Pendientes' },
      { id: 'IN_PROGRESS', name: 'En Proceso' },
      { id: 'IN_REVIEW', name: 'En Revisión' },
      { id: 'COMPLETED', name: 'Completadas' },
    ];
    setColumns(defaultCols);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`project-columns-${projectId}`, JSON.stringify(defaultCols));
    }
  };

  const getPreviewKind = (attachment: Pick<Attachment, 'mimeType' | 'name'>) => {
    const mimeType = attachment.mimeType?.toLowerCase() || '';
    const fileName = attachment.name.toLowerCase();

    if (mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName)) {
      return 'image';
    }
    if (mimeType === 'application/pdf' || /\.pdf$/i.test(fileName)) {
      return 'pdf';
    }
    if (mimeType.startsWith('text/') || /\.(txt|md|csv|json|log|xml|yaml|yml)$/i.test(fileName)) {
      return 'text';
    }

    return 'unsupported';
  };

  const openAttachmentPreview = (attachment: Attachment) => {
    setPreviewAttachment(attachment);
  };

  const closeAttachmentPreview = () => {
    setPreviewAttachment(null);
  };

  const handleUploadProof = async (itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const itemProofs = proofs[itemId] || [];
      const newProof: Attachment = {
        id: `${itemId}-${Date.now()}`,
        name: file.name,
        dataUrl,
        mimeType: file.type,
        uploadedAt: new Date().toISOString()
      };
      const updatedList = [...itemProofs, newProof];
      
      const updated = {
        ...proofs,
        [itemId]: updatedList
      };
      setProofs(updated);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
        const res = await fetch(`${apiUrl}/tasks/checklist/${itemId}/proofs`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ proofs: JSON.stringify(updatedList) }),
        });
        if (res.ok) {
          showToast('Evidencia subida y guardada en el servidor', 'success');
          if (selectedTask) {
            const reloadRes = await fetch(`${apiUrl}/tasks/${selectedTask.id}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (reloadRes.ok) {
              const reloaded = await reloadRes.json();
              setSelectedTask(reloaded);
            }
          }
        } else {
          showToast('Error al guardar evidencia en el servidor', 'error');
        }
      } catch {
        showToast('Error de conexión al subir evidencia', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProof = async (itemId: string, index: number) => {
    const itemProofs = proofs[itemId] || [];
    const updatedProofs = itemProofs.filter((_, i) => i !== index);
    
    const updated = {
      ...proofs,
      [itemId]: updatedProofs
    };
    setProofs(updated);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/tasks/checklist/${itemId}/proofs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ proofs: JSON.stringify(updatedProofs) }),
      });
      if (res.ok) {
        showToast('Evidencia eliminada del servidor', 'success');
        if (selectedTask) {
          const reloadRes = await fetch(`${apiUrl}/tasks/${selectedTask.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (reloadRes.ok) {
            const reloaded = await reloadRes.json();
            setSelectedTask(reloaded);
          }
        }
      } else {
        showToast('Error al eliminar evidencia en el servidor', 'error');
      }
    } catch {
      showToast('Error de conexión al eliminar evidencia', 'error');
    }
  };

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

      // Project info
      const projRes = await fetch(`${apiUrl}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!projRes.ok) throw new Error();
      const projData = await projRes.json();
      setProject(projData);
      setProjectTeamId(projData.teamId || null);

      // Tasks info
      const tasksRes = await fetch(`${apiUrl}/tasks/project/${projectId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!tasksRes.ok) throw new Error();
      const tasksData = await tasksRes.json();
      if (Array.isArray(tasksData)) {
        const colKey = `project-columns-${projectId}`;
        let activeCols = [
          { id: 'PENDING', name: 'Pendientes' },
          { id: 'IN_PROGRESS', name: 'En Proceso' },
          { id: 'IN_REVIEW', name: 'En Revisión' },
          { id: 'COMPLETED', name: 'Completadas' }
        ];
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(colKey);
          if (stored) {
            try { activeCols = JSON.parse(stored); } catch {}
          }
        }
        const validStatusIds = new Set(activeCols.map((c) => c.id));
        const firstColId = activeCols[0]?.id || 'PENDING';

        const sanitizedTasks = tasksData.map((t) => {
          if (!validStatusIds.has(t.status)) {
            return { ...t, status: firstColId };
          }
          return t;
        });
        setTasks(sanitizedTasks);
      }

      // Fetch teams to build the list of members (assignees)
      try {
        const teamsRes = await fetch(`${apiUrl}/companies/teams`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const allUsers: any[] = [];
          const seenUserIds = new Set();

          // Filter: only show members from the project's team if teamId is set
          const projectTeam = projData.teamId
            ? teamsData.find((t: any) => t.id === projData.teamId)
            : null;
          const teamsToScan = projectTeam ? [projectTeam] : teamsData;

          if (user?.id) {
            const normalizedId = user.id.trim().toLowerCase();
            seenUserIds.add(normalizedId);
            allUsers.push({
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role
            });
          }
          teamsToScan.forEach((team: any) => {
            team.members?.forEach((m: any) => {
              if (m.user && m.user.id) {
                const normalizedId = m.user.id.trim().toLowerCase();
                if (!seenUserIds.has(normalizedId)) {
                  seenUserIds.add(normalizedId);
                  allUsers.push(m.user);
                }
              }
            });
          });
          setMembersList(allUsers);
        }
      } catch (err) {
        console.error('Error fetching members list:', err);
      }
    } catch {
      console.error('Error loading project details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && projectId) {
      fetchProjectData();
    }
  }, [accessToken, projectId]);

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Filter tasks in the target column to calculate correct LexoRank positioning
    const columnTasks = tasks.filter((t) => t.status === status);
    
    // Optimistic Update
    const prevTasks = [...tasks];
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, status } : t))
    );

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      
      const lastTask = columnTasks[columnTasks.length - 1];
      const prevOrder = lastTask?.kanbanOrder || null;

      const response = await fetch(`${apiUrl}/tasks/${taskId}/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status,
          prevOrder,
          nextOrder: null,
        }),
      });

      if (!response.ok) throw new Error();
      
      // Reload tasks to align state
      const tasksRes = await fetch(`${apiUrl}/tasks/project/${projectId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const tasksData = await tasksRes.json();
      if (Array.isArray(tasksData)) {
        setTasks(tasksData);
      }
    } catch {
      setTasks(prevTasks);
      showToast('Error al reordenar la tarea', 'error');
    }
  };

  const handleRenameColumn = (columnId: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = columns.map((col) => col.id === columnId ? { ...col, name: newName.trim() } : col);
    setColumns(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`project-columns-${projectId}`, JSON.stringify(updated));
    }
    setEditingColumnId(null);
    showToast('Etapa renombrada', 'success');
  };

  const handleAddColumn = () => {
    const newColId = `etapa-${Date.now()}`;
    const updated = [...columns, { id: newColId, name: 'Nueva Etapa' }];
    setColumns(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`project-columns-${projectId}`, JSON.stringify(updated));
    }
    showToast('Nueva etapa creada', 'success');
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (columns.length <= 1) {
      showToast('No puedes eliminar todas las etapas. Debe quedar al menos una.', 'error');
      return;
    }

    const columnTasks = tasks.filter((t) => t.status === columnId);
    if (columnTasks.length > 0) {
      const isConfirmed = await confirm({
        title: '¿Eliminar etapa?',
        message: `Esta etapa contiene ${columnTasks.length} tareas. Si la eliminas, todas las tareas se moverán a la primera columna. ¿Deseas continuar?`,
        isDestructive: true,
      });
      if (!isConfirmed) return;

      const firstColId = columns.find((c) => c.id !== columnId)?.id || 'PENDING';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      
      // Update tasks in DB
      for (const t of columnTasks) {
        try {
          await fetch(`${apiUrl}/tasks/${t.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              title: t.title,
              status: firstColId,
            }),
          });
        } catch (e) {
          console.error(e);
        }
      }
      fetchProjectData();
    }

    const updated = columns.filter((col) => col.id !== columnId);
    setColumns(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`project-columns-${projectId}`, JSON.stringify(updated));
    }
    showToast('Etapa eliminada con éxito', 'success');
  };

  const isTaskBlocked = (task: Task) => {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some((dep) => {
      const depTask = tasks.find((t) => t.id === dep.dependsOnTaskId);
      return depTask && depTask.status !== 'COMPLETED';
    });
  };

  const getStatusFromActivity = (act: any): string | null => {
    if (!act) return null;
    let meta = act.metadata;
    if (meta) {
      if (typeof meta === 'string') {
        try {
          meta = JSON.parse(meta);
        } catch {}
      }
      if (typeof meta === 'object') {
        if (meta.status) return String(meta.status);
        if (meta.after && typeof meta.after === 'object' && meta.after.status) {
          return String(meta.after.status);
        }
      }
    }
    // Regex fallbacks
    const desc = act.description || '';
    const updateMatch = desc.match(/cambió el estado de la tarea de ["']?([^"']+)["']? a ["']?([^"']+)["']?/i);
    if (updateMatch && updateMatch[2]) return updateMatch[2];
    
    const moveMatch = desc.match(/movió la tarea ["']?[^"']+["']? a ["']?([^"']+)["']?/i);
    if (moveMatch && moveMatch[1]) return moveMatch[1];
    
    return null;
  };

  const calculateStageDurations = (task: Task, activities: any[]) => {
    const sortedActs = [...activities]
      .filter(act => act.action === 'MOVE_TASK' || act.action === 'UPDATE_TASK')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let initialStatus = 'PENDING';
    if (columns && columns[0]) {
      initialStatus = columns[0].id;
    }

    const firstAct = sortedActs[0];
    if (firstAct) {
      if (firstAct.metadata) {
        let meta = firstAct.metadata;
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch {}
        }
        if (typeof meta === 'object' && meta.before && typeof meta.before === 'object' && meta.before.status) {
          initialStatus = String(meta.before.status);
        }
      } else {
        const fromMatch = firstAct.description.match(/cambió el estado de la tarea de ["']?([^"']+)["']? a/i);
        if (fromMatch && fromMatch[1]) {
          initialStatus = fromMatch[1];
        }
      }
    }

    const transitions: { status: string; timestamp: number }[] = [
      { status: initialStatus, timestamp: new Date(task.createdAt || Date.now()).getTime() }
    ];

    sortedActs.forEach((act) => {
      const newStatus = getStatusFromActivity(act);
      if (newStatus) {
        transitions.push({
          status: newStatus,
          timestamp: new Date(act.createdAt).getTime()
        });
      }
    });

    if (transitions.length > 0) {
      const lastTransition = transitions[transitions.length - 1];
      if (lastTransition.status !== task.status) {
        transitions.push({
          status: task.status,
          timestamp: lastTransition.timestamp
        });
      }
    }

    const durations: Record<string, number> = {};
    for (let i = 0; i < transitions.length; i++) {
      const current = transitions[i];
      const nextTimestamp = i + 1 < transitions.length ? transitions[i + 1].timestamp : Date.now();
      durations[current.status] = (durations[current.status] || 0) + (nextTimestamp - current.timestamp);
    }
    return durations;
  };

  const formatDuration = (ms: number) => {
    if (ms < 0) return "0 min";
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    if (min < 1) return "< 1 min";
    if (min < 60) return `${min} min`;
    const hours = Math.floor(min / 60);
    const remMin = min % 60;
    if (hours < 24) return `${hours}h ${remMin}m`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  };

  const handleAddDependency = async (dependsOnTaskId: string) => {
    if (!selectedTask || !dependsOnTaskId) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/tasks/${selectedTask.id}/dependency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ dependsOnTaskId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al agregar la dependencia');
      }

      const detailRes = await fetch(`${apiUrl}/tasks/${selectedTask.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setSelectedTask(detailData);
      }
      fetchProjectData();
      showToast('Dependencia agregada con éxito', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al agregar la dependencia', 'error');
    }
  };

  const handleRemoveDependency = async (dependsOnTaskId: string) => {
    if (!selectedTask) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/tasks/${selectedTask.id}/dependency/${dependsOnTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();

      const detailRes = await fetch(`${apiUrl}/tasks/${selectedTask.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setSelectedTask(detailData);
      }
      fetchProjectData();
      showToast('Dependencia eliminada', 'success');
    } catch {
      showToast('Error al eliminar la dependencia', 'error');
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTask(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/tasks/project/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          status: newStatus,
          priority: newPriority,
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
          estimatedHours: Number(newEstimatedHours),
          responsibleId: newResponsibleId || undefined,
        }),
      });

      if (!response.ok) throw new Error();

      setNewTitle('');
      setNewDesc('');
      setNewPriority('MEDIUM');
      setNewDueDate('');
      setNewEstimatedHours(0);
      setNewResponsibleId('');
      setIsTaskModalOpen(false);

      fetchProjectData();
      showToast('Tarea creada con éxito', 'success');
    } catch {
      showToast('Error al crear la tarea', 'error');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleCreateTaskInline = async (title: string, status: string) => {
    if (!title.trim()) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/tasks/project/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          status: status,
          priority: 'MEDIUM',
        }),
      });
      if (!response.ok) throw new Error();
      fetchProjectData();
      showToast('Tarea agregada con éxito', 'success');
    } catch {
      showToast('Error al agregar la tarea rápida', 'error');
    }
  };

  const handleTaskClick = async (task: Task) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/tasks/${task.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      const taskData = await res.json();
      setSelectedTask(taskData);
      setComments(taskData.comments || []);

      // Load checklist item proofs from taskData into the proofs state
      const initialProofs: Record<string, Attachment[]> = {};
      if (Array.isArray(taskData.checklistItems)) {
        taskData.checklistItems.forEach((item: any) => {
          try {
            initialProofs[item.id] = JSON.parse(item.proofs || '[]');
          } catch {
            initialProofs[item.id] = [];
          }
        });
      }
      setProofs(initialProofs);
      
      // Fetch activity logs for this task
      try {
        const actRes = await fetch(`${apiUrl}/projects/${projectId}/activity`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (actRes.ok) {
          const allActivities = await actRes.json();
          const taskActs = Array.isArray(allActivities) 
            ? allActivities.filter((a: any) => a.taskId === task.id)
            : [];
          setTaskActivities(taskActs);
        }
      } catch {}

      setIsDrawerOpen(true);
    } catch {
      setSelectedTask(task);
      setIsDrawerOpen(true);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle || !selectedTask) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/tasks/${selectedTask.id}/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title: newChecklistTitle }),
      });
      if (!res.ok) throw new Error();
      const newItem = await res.json();
      
      setSelectedTask({
        ...selectedTask,
        checklistItems: [...(selectedTask.checklistItems || []), newItem],
      });
      setNewChecklistTitle('');
      fetchProjectData();
    } catch {
      showToast('Error al agregar el elemento', 'error');
    }
  };

  const handleToggleChecklist = async (itemId: string, isCompleted: boolean) => {
    if (!selectedTask) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/tasks/checklist/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ isCompleted }),
      });
      if (!res.ok) throw new Error();

      setSelectedTask({
        ...selectedTask,
        checklistItems: selectedTask.checklistItems?.map((item) =>
          item.id === itemId ? { ...item, isCompleted } : item
        ),
      });
      fetchProjectData();
    } catch {
      showToast('Error al actualizar el checklist', 'error');
    }
  };

  const handleReassignTask = async (newAssigneeId: string) => {
    if (!selectedTask) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: selectedTask.title,
          description: selectedTask.description,
          status: selectedTask.status,
          priority: selectedTask.priority,
          dueDate: selectedTask.dueDate,
          estimatedHours: selectedTask.estimatedHours,
          workedHours: selectedTask.workedHours,
          responsibleId: newAssigneeId || null,
        }),
      });
      if (!res.ok) throw new Error();
      
      const updatedResponsible = newAssigneeId 
        ? membersList.find((m) => m.id === newAssigneeId)
        : undefined;

      setSelectedTask({
        ...selectedTask,
        responsible: updatedResponsible ? {
          id: updatedResponsible.id,
          firstName: updatedResponsible.firstName,
          lastName: updatedResponsible.lastName,
          avatarUrl: updatedResponsible.avatarUrl,
        } : undefined,
      });

      fetchProjectData();
      showToast('Responsable actualizado con éxito', 'success');
    } catch {
      showToast('Error al actualizar el responsable', 'error');
    }
  };

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || logHoursVal <= 0) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const totalHours = selectedTask.workedHours + Number(logHoursVal);
      const res = await fetch(`${apiUrl}/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: selectedTask.title,
          workedHours: totalHours
        }),
      });
      if (!res.ok) throw new Error();
      
      setSelectedTask({
        ...selectedTask,
        workedHours: totalHours,
      });
      setLogHoursVal(0);
      setIsLoggingHours(false);
      fetchProjectData();
    } catch {
      showToast('Error al registrar horas', 'error');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;
    
    const content = newComment.trim();
    setNewComment('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const commentData = await res.json();
        setComments([...comments, commentData]);
        
        // Reload task to keep in sync
        const reloadRes = await fetch(`${apiUrl}/tasks/${selectedTask.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (reloadRes.ok) {
          const reloaded = await reloadRes.json();
          setSelectedTask(reloaded);
        }
      } else {
        showToast('Error al publicar comentario', 'error');
      }
    } catch {
      showToast('Error de conexión al comentar', 'error');
    }
  };

  if (isLoading && !project) {
    return (
      <div className="py-24 flex flex-col justify-center items-center text-slate-500 text-sm gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span>Cargando tablero...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative min-h-[85vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-5">
        <div className="space-y-2">
          <Link href="/dashboard/projects" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={13} /> Volver a proyectos
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            {project?.name}
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            {project?.description || 'Sin descripción disponible.'}
          </p>
        </div>

        {(user?.role === 'MANAGER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN') && (
        <button
          onClick={() => {
            setNewStatus('PENDING');
            setIsTaskModalOpen(true);
          }}
          className="flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-teal-600/10 active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Plus size={16} className="mr-1.5" />
          Nueva Tarea
        </button>
        )}
      </div>

      {/* Tab Switcher: Kanban | Archivos */}
      <div className="flex items-center gap-1 border-b border-slate-900 mb-2">
        <button
          onClick={() => setActiveTab('KANBAN')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${activeTab === 'KANBAN' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-900/30' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <CheckSquare size={13} className="inline mr-1.5 -mt-0.5" />
          Tablero
        </button>
        <button
          onClick={() => setActiveTab('FILES')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${activeTab === 'FILES' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-900/30' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <FileText size={13} className="inline mr-1.5 -mt-0.5" />
          Archivos del Proyecto
        </button>
      </div>

      {activeTab === 'KANBAN' && (
      <>
      {/* Kanban Board Container */}
      <div className="flex gap-6 items-start overflow-x-auto pb-4" style={{ minWidth: 0 }}>
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);
          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className="bg-slate-900/10 border border-slate-900/60 rounded-2xl p-4 flex flex-col gap-4 min-h-[500px] min-w-[260px] flex-1"
            >
              {/* Column Title */}
              <div className="flex justify-between items-center px-1 group/col">
                {editingColumnId === column.id ? (
                  <form
                    className="flex items-center gap-1 flex-1"
                    onSubmit={(e) => { e.preventDefault(); handleRenameColumn(column.id, editingColumnName); }}
                  >
                    <input
                      autoFocus
                      type="text"
                      value={editingColumnName}
                      onChange={(e) => setEditingColumnName(e.target.value)}
                      onBlur={() => handleRenameColumn(column.id, editingColumnName)}
                      className="w-full px-2 py-1 bg-slate-950 border border-emerald-500/50 rounded text-xs text-slate-200 focus:outline-none"
                    />
                  </form>
                ) : (
                  <span
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-default"
                    onDoubleClick={() => {
                      if (user?.role === 'MANAGER' || user?.role === 'COMPANY_ADMIN') {
                        setEditingColumnId(column.id);
                        setEditingColumnName(column.name);
                      }
                    }}
                  >
                    {column.name}
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                    {columnTasks.length}
                  </span>
                  {(user?.role === 'MANAGER' || user?.role === 'COMPANY_ADMIN') && editingColumnId !== column.id && (
                    <>
                      <button
                        onClick={() => { setEditingColumnId(column.id); setEditingColumnName(column.name); }}
                        className="opacity-0 group-hover/col:opacity-100 transition-opacity p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300"
                        title="Renombrar etapa"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteColumn(column.id)}
                        className="opacity-0 group-hover/col:opacity-100 transition-opacity p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400"
                        title="Eliminar etapa"
                      >
                        <X size={11} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => handleTaskClick(task)}
                    className="p-4 bg-slate-900/40 border border-slate-900 rounded-xl hover:border-slate-800 transition-all hover:bg-slate-900/60 cursor-pointer group shadow-sm flex flex-col justify-between space-y-3 active:scale-[0.98] transform"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-slate-200 line-clamp-2 leading-relaxed group-hover:text-emerald-400 transition-colors">
                          {task.title}
                        </h4>
                        {isTaskBlocked(task) && (
                          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-bold whitespace-nowrap">
                            🔒 Bloqueada
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-normal">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-950 flex justify-between items-center text-[9px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={10} className="text-slate-550" />
                        <span>
                          {task.dueDate ? `Vence: ${new Date(task.dueDate).toLocaleDateString()}` : 'Sin fecha'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.responsible ? (
                          <div 
                            className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[8px]"
                            title={`Responsable: ${task.responsible.firstName} ${task.responsible.lastName}`}
                          >
                            {task.responsible.firstName[0]}{task.responsible.lastName[0]}
                          </div>
                        ) : (
                          <div 
                            className="h-5 w-5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 text-[8px]"
                            title="Sin responsable"
                          >
                            ?
                          </div>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${
                          task.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-400' :
                          task.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {task.priority === 'URGENT' ? 'Urgente' :
                           task.priority === 'HIGH' ? 'Alta' : 'Media'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center border border-dashed border-slate-900/60 rounded-xl text-[10px] text-slate-600 italic">
                    Arrastra tareas aquí
                  </div>
                )}
              </div>

              {/* Quick Inline Task Creator */}
              {(user?.role === 'MANAGER' || user?.role === 'COMPANY_ADMIN') && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const title = inlineTaskTitles[column.id] || '';
                    if (!title.trim()) return;
                    handleCreateTaskInline(title, column.id);
                    setInlineTaskTitles({
                      ...inlineTaskTitles,
                      [column.id]: '',
                    });
                  }}
                  className="mt-1 pt-2 border-t border-slate-900/60"
                >
                  <input
                    type="text"
                    placeholder="+ Agregar tarea rápida..."
                    value={inlineTaskTitles[column.id] || ''}
                    onChange={(e) => setInlineTaskTitles({
                      ...inlineTaskTitles,
                      [column.id]: e.target.value,
                    })}
                    className="w-full px-3 py-2 bg-slate-950/40 border border-slate-900 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </form>
              )}
            </div>
          );
        })}

        {/* Add New Stage Button */}
        {(user?.role === 'MANAGER' || user?.role === 'COMPANY_ADMIN') && (
          <button
            onClick={handleAddColumn}
            className="min-w-[200px] min-h-[500px] border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all cursor-pointer group/add shrink-0"
          >
            <Plus size={24} className="group-hover/add:scale-110 transition-transform" />
            <span className="text-xs font-medium">Agregar Etapa</span>
          </button>
        )}
      </div>
      </>
      )}

      {/* FILES TAB CONTENT */}
      {activeTab === 'FILES' && (
        <div className="space-y-6">
          {/* Upload Area */}
          {(user?.role === 'MANAGER' || user?.role === 'COMPANY_ADMIN') && (
            <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:border-emerald-500/30 transition-all group/upload bg-slate-900/10">
              <Upload size={32} className="text-slate-600 group-hover/upload:text-emerald-400 transition-colors mb-2" />
              <span className="text-sm text-slate-500 group-hover/upload:text-slate-300 transition-colors">Haz clic o arrastra archivos para subirlos</span>
              <span className="text-[10px] text-slate-600 mt-1">PDF, Imágenes, Documentos (máx. 10MB)</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const newFile = {
                      id: Date.now().toString(),
                      name: file.name,
                      size: file.size,
                      mimeType: file.type,
                      dataUrl: reader.result as string,
                      uploadedAt: new Date().toISOString(),
                      uploadedBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                    };
                    const updated = [newFile, ...projectFiles];
                    setProjectFiles(updated);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem(`project-files-${projectId}`, JSON.stringify(updated));
                    }
                    showToast(`Archivo "${file.name}" subido con éxito`, 'success');
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
            </label>
          )}

          {/* Files List */}
          {projectFiles.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
              <FileText size={32} className="mx-auto mb-2 text-slate-600" />
              No hay archivos subidos aún en este proyecto.
            </div>
          ) : (
            <div className="space-y-3">
              {projectFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-slate-900/30 border border-slate-900 rounded-xl hover:border-slate-800 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>{((file.size ?? 0) / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Sin fecha'}</span>
                        {file.uploadedBy && (
                          <>
                            <span>•</span>
                            <span>Por: {file.uploadedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openAttachmentPreview(file)}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-all"
                      title="Previsualizar"
                      aria-label={`Previsualizar ${file.name}`}
                    >
                      <Eye size={14} />
                    </button>
                    <a
                      href={file.dataUrl}
                      download={file.name}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-all"
                      title="Descargar"
                    >
                      <Download size={14} />
                    </a>
                    {(user?.role === 'MANAGER' || user?.role === 'COMPANY_ADMIN') && (
                      <button
                        onClick={() => {
                          const updated = projectFiles.filter((f) => f.id !== file.id);
                          setProjectFiles(updated);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem(`project-files-${projectId}`, JSON.stringify(updated));
                          }
                          showToast('Archivo eliminado', 'success');
                        }}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all"
                        title="Eliminar archivo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-200">Crear Nueva Tarea</h2>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Título de la Tarea
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
                  placeholder="ej. Crear prototipo Figma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Descripción
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm transition-all resize-none"
                  placeholder="Detalles sobre el requerimiento..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Prioridad
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none"
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Asignar a (Responsable)
                </label>
                <select
                  value={newResponsibleId}
                  onChange={(e) => setNewResponsibleId(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none"
                >
                  <option value="">Sin asignar / Libre</option>
                  {membersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.role === 'MANAGER' ? 'Gestor' : 'Empleado'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3 justify-end border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="flex items-center py-2 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-teal-600/10 transition-all disabled:opacity-50"
                >
                  {isCreatingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details sliding Drawer */}
      {isDrawerOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsDrawerOpen(false)}>
          <div
            className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 flex flex-col justify-between p-6 shadow-2xl space-y-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                  selectedTask.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-400' :
                  selectedTask.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {selectedTask.priority === 'URGENT' ? 'Prioridad Urgente' :
                   selectedTask.priority === 'HIGH' ? 'Prioridad Alta' : 'Prioridad Media'}
                </span>
                <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <h2 className="text-xl font-bold text-slate-100">{selectedTask.title}</h2>
              <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-900/50">
                {selectedTask.description || 'Sin descripción detallada.'}
              </p>
            </div>

            {/* Responsable de la tarea */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Responsable</span>
              {user?.role === 'MANAGER' || user?.role === 'COMPANY_ADMIN' ? (
                <select
                  value={selectedTask.responsible?.id || ''}
                  onChange={(e) => handleReassignTask(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800/80 rounded-xl text-slate-350 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-950"
                >
                  <option value="">Sin asignar / Libre</option>
                  {membersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.role === 'MANAGER' ? 'Gestor' : 'Empleado'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/40 border border-slate-900 rounded-xl">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                    {selectedTask.responsible 
                      ? `${selectedTask.responsible.firstName[0]}${selectedTask.responsible.lastName[0]}`
                      : '?'}
                  </div>
                  <span className="text-xs text-slate-300">
                    {selectedTask.responsible 
                      ? `${selectedTask.responsible.firstName} ${selectedTask.responsible.lastName}`
                      : 'Sin asignar'}
                  </span>
                </div>
              )}
            </div>

            {/* Metricas de fecha */}
            <div className="grid grid-cols-2 gap-4 bg-slate-950/30 p-4 border border-slate-900 rounded-xl">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Fecha de Inicio</span>
                <span className="text-sm font-bold text-slate-300">
                  {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : 'No asignada'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Fecha Límite</span>
                <span className="text-sm font-bold text-slate-300">
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'No asignada'}
                </span>
              </div>
            </div>

            {/* Tiempo por Etapa */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Tiempo Acumulado por Etapa</span>
              <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4 space-y-3">
                {(() => {
                  const durations = calculateStageDurations(selectedTask, taskActivities);
                  return columns.map((col) => {
                    const ms = durations[col.id] || 0;
                    const totalMs = Object.values(durations).reduce((a, b) => a + b, 0) || 1;
                    const pct = Math.round((ms / totalMs) * 100);
                    return (
                      <div key={col.id} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-400">{col.name}</span>
                          <span className="font-bold text-slate-200">{formatDuration(ms)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                            style={{ width: `${pct || 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Dependencies / Blocking Section */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Dependencias / Bloqueos</span>
              {selectedTask.dependencies && selectedTask.dependencies.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedTask.dependencies.map((dep) => {
                    const depTask = tasks.find((t) => t.id === dep.dependsOnTaskId);
                    const isComplete = depTask?.status === 'COMPLETED';
                    return (
                      <div key={dep.dependsOnTaskId} className="flex items-center justify-between px-3 py-2 bg-slate-950/40 border border-slate-900 rounded-xl">
                        <div className="flex items-center gap-2 text-xs">
                          <Link2 size={11} className={isComplete ? 'text-emerald-400' : 'text-amber-400'} />
                          <span className={isComplete ? 'text-slate-400 line-through' : 'text-slate-300'}>
                            {depTask?.title || dep.dependsOnTaskId}
                          </span>
                          {!isComplete && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[8px] font-bold">Pendiente</span>
                          )}
                          {isComplete && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-bold">Completada</span>
                          )}
                        </div>
                        {(user?.role === 'MANAGER' || user?.role === 'COMPANY_ADMIN') && (
                          <button
                            onClick={() => handleRemoveDependency(dep.dependsOnTaskId)}
                            className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all"
                            title="Quitar dependencia"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-slate-600 italic">Esta tarea no tiene dependencias definidas.</p>
              )}

              {(user?.role === 'MANAGER' || user?.role === 'COMPANY_ADMIN') && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddDependency(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 mt-1"
                  defaultValue=""
                >
                  <option value="" disabled>+ Agregar dependencia...</option>
                  {tasks
                    .filter((t) => t.id !== selectedTask.id && !selectedTask.dependencies?.some((d) => d.dependsOnTaskId === t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))
                  }
                </select>
              )}
            </div>

            {/* Checklist items */}
            <div className="space-y-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Checklist</span>
              
              <div className="space-y-3">
                {selectedTask.checklistItems?.map((item) => {
                  const itemProofs = proofs[item.id] || [];
                  const isOpen = openChecklistId === item.id;
                  const isEmployee = !!user;
                  return (
                    <div key={item.id} className="space-y-2 border-b border-slate-900/50 pb-2 last:border-0">
                      <div 
                        onClick={() => setOpenChecklistId(isOpen ? null : item.id)}
                        className={`flex items-center justify-between group p-1.5 rounded-lg hover:bg-slate-950/60 cursor-pointer transition-all border border-transparent ${isOpen ? 'bg-slate-950/45 border-slate-800/40' : ''}`}
                        title="Haga clic para ver o subir pruebas de entrega"
                      >
                        <div className="flex items-center gap-2.5 text-xs min-w-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            disabled={!isEmployee}
                            onChange={(e) => handleToggleChecklist(item.id, e.target.checked)}
                            className="h-4 w-4 text-emerald-500 focus:ring-emerald-500 border-slate-800 rounded bg-slate-950 disabled:opacity-60 cursor-pointer transition-colors"
                          />
                          <span className={`truncate select-none font-medium transition-all ${item.isCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {item.title}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {itemProofs.length > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium flex items-center gap-1">
                              <Paperclip size={10} className="text-emerald-400" />
                              {itemProofs.length} {itemProofs.length === 1 ? 'prueba' : 'pruebas'}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 bg-slate-800/50 text-slate-400 rounded-full font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Paperclip size={10} />
                              Subir prueba
                            </span>
                          )}
                          <ChevronDown size={14} className={`text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-185 text-emerald-400' : ''}`} />
                        </div>
                      </div>

                      {/* Panel de evidencias */}
                      {isOpen && (
                        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900 space-y-2 ml-5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-400">Pruebas / Evidencias de entrega</span>
                            {isEmployee && (
                              <label className="cursor-pointer text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
                                <span>+ Subir</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleUploadProof(item.id, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          {itemProofs.length === 0 && (
                            <p className="text-slate-500 italic text-[10px]">No se han subido evidencias aún.</p>
                          )}
                          {itemProofs.length > 0 && (
                            <div className="space-y-1">
                              {itemProofs.map((proof, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-900/50 px-2 py-1 rounded-lg">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Paperclip size={10} className="text-emerald-400 shrink-0" />
                                    <span className="truncate text-slate-300">{proof.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => openAttachmentPreview(proof)}
                                      className="text-slate-400 hover:text-emerald-400"
                                      title="Previsualizar"
                                      aria-label={`Previsualizar ${proof.name}`}
                                    >
                                      <Eye size={10} />
                                    </button>
                                    <a
                                      href={proof.dataUrl}
                                      download={proof.name}
                                      className="text-slate-400 hover:text-emerald-400"
                                      title="Descargar"
                                    >
                                      <Download size={10} />
                                    </a>
                                    {isEmployee && (
                                      <button
                                        onClick={() => handleDeleteProof(item.id, idx)}
                                        className="text-slate-500 hover:text-rose-400"
                                        title="Eliminar evidencia"
                                      >
                                        <X size={10} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {/* Attachment Preview Modal */}
                              {previewAttachment && (
                                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeAttachmentPreview}>
                                  <div
                                    className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-start justify-between gap-4 p-4 border-b border-slate-800 bg-slate-950/50">
                                      <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-slate-100 truncate">{previewAttachment.name}</h3>
                                        <p className="text-[11px] text-slate-500 mt-1">
                                          {previewAttachment.uploadedAt ? new Date(previewAttachment.uploadedAt).toLocaleString() : 'Vista previa inmediata'}
                                          {previewAttachment.uploadedBy ? ` · ${previewAttachment.uploadedBy}` : ''}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <a
                                          href={previewAttachment.dataUrl}
                                          download={previewAttachment.name}
                                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                                        >
                                          Descargar
                                        </a>
                                        <button
                                          type="button"
                                          onClick={closeAttachmentPreview}
                                          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                          aria-label="Cerrar vista previa"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex-1 min-h-0 bg-slate-950/60 p-4">
                                      {getPreviewKind(previewAttachment) === 'image' ? (
                                        <div className="relative h-[70vh] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-3">
                                          <Image
                                            src={previewAttachment.dataUrl}
                                            alt={previewAttachment.name}
                                            fill
                                            unoptimized
                                            className="object-contain rounded-xl shadow-lg"
                                          />
                                        </div>
                                      ) : getPreviewKind(previewAttachment) === 'pdf' || getPreviewKind(previewAttachment) === 'text' ? (
                                        <iframe
                                          src={previewAttachment.dataUrl}
                                          title={previewAttachment.name}
                                          className="w-full h-[70vh] rounded-2xl border border-slate-800 bg-slate-950"
                                        />
                                      ) : (
                                        <div className="h-[70vh] flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950 text-center px-6">
                                          <FileText size={36} className="text-slate-600 mb-3" />
                                          <p className="text-sm font-semibold text-slate-200">No hay vista previa disponible para este archivo.</p>
                                          <p className="text-xs text-slate-500 mt-2 max-w-md">
                                            Puedes descargarlo para abrirlo en tu equipo o subir una imagen, PDF o archivo de texto para verlo aquí.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleAddChecklist} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Agregar elemento..."
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
                <button type="submit" className="px-3 py-1 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs">
                  Añadir
                </button>
              </form>
            </div>

            {/* Comments + Activity Tabs */}
            <div className="border-t border-slate-800/80 pt-4 flex-1 flex flex-col overflow-hidden">
              {/* Tab headers */}
              <div className="flex items-center gap-1 mb-3">
                <button
                  onClick={() => setActivityTab('COMMENTS')}
                  className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all ${activityTab === 'COMMENTS' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <MessageSquare size={11} className="inline mr-1 -mt-0.5" />
                  Comentarios
                </button>
                <button
                  onClick={async () => {
                    setActivityTab('ACTIVITY');
                    try {
                      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
                      const res = await fetch(`${apiUrl}/projects/${projectId}/activity`, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                      });
                      if (res.ok) {
                        const allActivities = await res.json();
                        const taskActs = Array.isArray(allActivities) 
                          ? allActivities.filter((a: any) => a.taskId === selectedTask.id)
                          : [];
                        setTaskActivities(taskActs);
                      }
                    } catch {}
                  }}
                  className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all ${activityTab === 'ACTIVITY' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <History size={11} className="inline mr-1 -mt-0.5" />
                  Historial
                </button>
              </div>

              {/* Comments Tab */}
              {activityTab === 'COMMENTS' && (
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                    {comments.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic py-4">No hay comentarios en esta tarea aún.</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900 text-xs space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-300">
                              {comment.user.firstName} {comment.user.lastName}
                            </span>
                            <span>
                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300 leading-normal">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2 mt-4">
                    <input
                      type="text"
                      required
                      placeholder="Escribe un comentario..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                    />
                    <button type="submit" className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md">
                      Enviar
                    </button>
                  </form>
                </>
              )}

              {/* Activity History Tab */}
              {activityTab === 'ACTIVITY' && (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
                  {taskActivities.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic py-4">No hay actividad registrada para esta tarea aún.</p>
                  ) : (
                    taskActivities.map((act, idx) => {
                      const timeAgo = (() => {
                        const diff = Date.now() - new Date(act.createdAt).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return 'Justo ahora';
                        if (mins < 60) return `hace ${mins} min`;
                        const hours = Math.floor(mins / 60);
                        if (hours < 24) return `hace ${hours}h`;
                        const days = Math.floor(hours / 24);
                        return `hace ${days}d`;
                      })();
                      return (
                        <div key={idx} className="flex items-start gap-3 text-xs">
                          <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500/60 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-300">
                                {act.user ? `${act.user.firstName} ${act.user.lastName}` : 'Sistema'}
                              </span>
                              <span className="text-[9px] text-slate-600">{timeAgo}</span>
                            </div>
                            <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">{act.description}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

