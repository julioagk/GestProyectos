Actúa como un Arquitecto de Software Senior, Product Designer UX/UI y Desarrollador Full Stack Senior.

Quiero que diseñes una plataforma web SaaS moderna de gestión de proyectos y equipos, inspirada en Slack, Jira, Asana, Monday y Trello, pero con identidad propia. NO debe ser una copia de ninguna plataforma existente.

==============================
OBJETIVO
==============================

Crear un sistema donde múltiples empresas puedan administrar sus empleados, proyectos, tareas y seguimiento del trabajo desde una sola plataforma.

La aplicación debe ser Multi-Tenant, donde cada empresa tenga completamente aislada su información.

Cada empresa tendrá:

• Usuarios
• Roles
• Equipos
• Proyectos
• Tareas
• Comentarios
• Archivos
• Actividad
• Dashboard
• Notificaciones

==============================
ARQUITECTURA
==============================

La aplicación debe seguir una arquitectura escalable.

Empresa
    ↓
Usuarios
Equipos
Proyectos
Tareas
Comentarios
Archivos
Notificaciones
Dashboard
Configuración

Todo debe relacionarse mediante IDs.

Cada empresa únicamente puede acceder a su información.

==============================
ROLES
==============================

Super Administrador
Administrador Empresa
Gerente
Supervisor
Empleado
Invitado

Cada rol tendrá permisos distintos.

==============================
PROYECTOS
==============================

Cada proyecto deberá contener:

Nombre

Descripción

Empresa

Responsable

Estado

Prioridad

Fecha inicio

Fecha límite

Porcentaje de avance

Equipo asignado

Etiquetas

Archivos

Comentarios

Actividad

Estados posibles:

Pendiente

En proceso

En revisión

Pausado

Completado

Cancelado

==============================
TAREAS
==============================

Cada proyecto podrá contener tareas ilimitadas.

Cada tarea tendrá:

Título

Descripción

Responsable

Fecha inicio

Fecha límite

Prioridad

Estado

Horas estimadas

Horas trabajadas

Checklist

Archivos

Comentarios

Actividad

Etiquetas

Dependencias

Subtareas

==============================
KANBAN
==============================

Implementar un tablero tipo Trello.

Columnas:

Pendiente

En proceso

En revisión

Completado

Las tarjetas deberán poder moverse mediante Drag & Drop.

==============================
COMENTARIOS
==============================

Cada proyecto y cada tarea tendrán un chat interno.

Características:

Responder comentarios

Menciones con @usuario

Adjuntar archivos

Reacciones

Editar mensajes

Eliminar mensajes

Historial

==============================
NOTIFICACIONES
==============================

Sistema en tiempo real.

Ejemplos:

Nueva tarea asignada

Comentario nuevo

Proyecto actualizado

Cambio de estado

Fecha límite cercana

Archivo agregado

Mención

==============================
DASHBOARD
==============================

Dashboard ejecutivo con:

Cantidad de proyectos

Proyectos activos

Proyectos terminados

Tareas pendientes

Tareas vencidas

Productividad por empleado

Horas registradas

Gráficas

Actividad reciente

==============================
SEGUIMIENTO
==============================

Toda acción debe generar un historial.

Ejemplo:

Julio creó el proyecto

Carlos creó la tarea

Ana comentó

Pedro terminó la tarea

Julio cambió la prioridad

Nunca eliminar historial.

==============================
CALENDARIO
==============================

Vista calendario.

Mostrar:

Entregas

Eventos

Tareas próximas

Recordatorios

==============================
ARCHIVOS
==============================

Cada proyecto podrá almacenar archivos.

Imágenes

PDF

Excel

Word

Videos

ZIP

Versionado opcional.

==============================
BÚSQUEDA
==============================

Búsqueda global por:

Proyecto

Empleado

Tarea

Empresa

Archivo

Comentario

==============================
PANEL DE EMPRESA
==============================

Cada empresa tendrá:

Logo

Nombre

Usuarios

Invitaciones

Equipos

Permisos

Configuración

Plan contratado

Facturación

==============================
SUPER ADMIN
==============================

Panel exclusivo para administrar:

Empresas

Usuarios

Planes

Facturación

Estadísticas

Espacio utilizado

Estado de suscripciones

==============================
DISEÑO
==============================

Quiero una interfaz moderna y profesional.

Inspiración:

Slack

Linear

Notion

Asana

ClickUp

Monday

No copiar diseños.

Utilizar:

Mucho espacio en blanco

Componentes minimalistas

Animaciones suaves

Cards modernas

Sidebar colapsable

Modo oscuro y claro

Responsive

Diseño premium.

==============================
TECNOLOGÍA
==============================

Genera la mejor arquitectura posible.

Frontend:
React
Next.js
TypeScript
TailwindCSS
shadcn/ui

Backend:
Node.js
NestJS

Base de datos:
PostgreSQL

ORM:
Prisma

Autenticación:
JWT
Refresh Tokens

Almacenamiento:
S3 compatible

Tiempo real:
WebSockets

==============================
OBJETIVO FINAL
==============================

Quiero una plataforma empresarial lista para crecer como un SaaS profesional, con código limpio, arquitectura modular, escalable y mantenible, priorizando la experiencia del usuario, la seguridad y el rendimiento.

Antes de generar código, analiza toda la arquitectura, propone mejoras, detecta posibles problemas de escalabilidad y sugiere funcionalidades adicionales que aporten valor al producto. Después, genera la estructura del proyecto, el modelo de base de datos, las entidades principales y un plan de desarrollo por fases.