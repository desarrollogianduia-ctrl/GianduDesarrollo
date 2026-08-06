import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  Users, 
  MoreHorizontal,
  X,
  Trash2,
  CalendarDays
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addDays,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent, EventType, EventParticipant } from '../types';

interface CalendarViewProps {
  events: CalendarEvent[];
  tasks?: { id: string; text: string; deadline?: number; completed: boolean }[];
  onSaveEvent: (event: CalendarEvent) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  userId: string;
}

const EVENT_TYPES: { id: EventType; label: string; color: string }[] = [
  { id: 'reunion', label: 'Reunión', color: 'bg-blue-500' },
  { id: 'tarea', label: 'Tarea', color: 'bg-amber-500' },
  { id: 'hito', label: 'Hito', color: 'bg-emerald-500' },
  { id: 'otro', label: 'Otro', color: 'bg-purple-500' },
];

const COLORS = [
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#ef4444', // red
  '#ec4899', // pink
];

export function CalendarView({ events, tasks = [], onSaveEvent, onDeleteEvent, userId }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    type: 'reunion',
    color: COLORS[0],
    participants: [],
    location: '',
  });

  const [newParticipant, setNewParticipant] = useState('');

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const monthEvents = useMemo(() => {
    return events.filter(event => isSameMonth(new Date(event.startDate), currentMonth));
  }, [events, currentMonth]);

  const monthTasks = useMemo(() => {
    return tasks.filter(task => task.deadline && isSameMonth(new Date(task.deadline), currentMonth));
  }, [tasks, currentMonth]);

  const selectedDateEvents = useMemo(() => {
    return events.filter(event => isSameDay(new Date(event.startDate), selectedDate));
  }, [events, selectedDate]);

  const selectedDateTasks = useMemo(() => {
    return tasks.filter(task => task.deadline && isSameDay(new Date(task.deadline), selectedDate));
  }, [tasks, selectedDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    const event: CalendarEvent = {
      id: editingEvent?.id || `event_${Date.now()}`,
      title: formData.title!,
      description: formData.description || '',
      startDate: formData.startDate || selectedDate.getTime(),
      endDate: formData.endDate || selectedDate.getTime() + 3600000,
      type: formData.type || 'reunion',
      color: formData.color || COLORS[0],
      participants: formData.participants || [],
      location: formData.location || '',
      ownerId: userId,
    };

    await onSaveEvent(event);
    setIsAdding(false);
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      type: 'reunion',
      color: COLORS[0],
      participants: [],
      location: '',
    });
  };

  const addParticipant = () => {
    if (!newParticipant.trim()) return;
    setFormData({
      ...formData,
      participants: [...(formData.participants || []), { name: newParticipant.trim() }]
    });
    setNewParticipant('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="pane-title flex items-center gap-2">
            <CalendarIcon size={14} className="text-blue-400" />
            <span>Calendario Integrado</span>
          </div>
          <h2 className="text-4xl font-light italic font-serif">Planificación & Eventos</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 text-sm font-black uppercase tracking-widest text-white/80 min-w-[160px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="btn-primary py-3 px-6 text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-blue-500/20"
          >
            <Plus size={16} />
            NUEVO EVENTO
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calendar Grid */}
        <div className="lg:col-span-8 bg-white/5 border border-white/10 rounded-[40px] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-white/10">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
              <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayEvents = events.filter(e => isSameDay(new Date(e.startDate), day));
              const dayTasks = tasks.filter(t => t.deadline && isSameDay(new Date(t.deadline), day));
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <div 
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[120px] p-2 border-r border-b border-white/5 transition-all cursor-pointer group hover:bg-white/[0.02] ${
                    !isCurrentMonth ? 'opacity-20' : ''
                  } ${isSelected ? 'bg-blue-500/5' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-mono px-2 py-1 rounded-lg ${
                      isToday ? 'bg-blue-500 text-white font-bold' : isSelected ? 'text-blue-400 font-bold' : 'text-white/40'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {(dayEvents.length > 0 || dayTasks.length > 0) && (
                      <div className="flex gap-1">
                        {dayEvents.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        {dayTasks.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map(event => (
                      <div 
                        key={event.id}
                        className="text-[9px] px-2 py-1 rounded-md truncate text-white/80 border border-white/5"
                        style={{ backgroundColor: `${event.color}20`, borderLeft: `2px solid ${event.color}` }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[8px] text-white/30 pl-2 font-bold uppercase">
                        + {dayEvents.length - 3} más
                      </div>
                    )}
                    {dayEvents.length < 3 && dayTasks.slice(0, 3 - dayEvents.length).map(task => (
                      <div 
                        key={task.id}
                        className={`text-[9px] px-2 py-1 rounded-md truncate border border-amber-500/20 bg-amber-500/10 text-amber-200/80 ${task.completed ? 'opacity-50 line-through' : ''}`}
                      >
                        {task.text}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-8 h-full">
            <header className="space-y-1">
              <p className="text-[10px] uppercase font-black text-blue-400 tracking-[0.2em]">
                {format(selectedDate, 'EEEE', { locale: es })}
              </p>
              <h3 className="text-3xl font-light italic font-serif">
                {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </h3>
            </header>

            <div className="space-y-8">
              {/* Events Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                    <Users size={12} />
                    Eventos y Reuniones
                  </h4>
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="p-2 hover:bg-white/5 rounded-full text-blue-400 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedDateEvents.map(event => (
                    <motion.div 
                      layoutId={event.id}
                      key={event.id}
                      onClick={() => {
                        setEditingEvent(event);
                        setFormData(event);
                        setIsAdding(true);
                      }}
                      className="group bg-white/[0.02] border border-white/5 p-4 rounded-3xl hover:border-white/10 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                          {event.title}
                        </span>
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: event.color }} 
                        />
                      </div>
                      <div className="flex flex-wrap gap-3 text-[10px] text-white/40">
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          <span>{format(new Date(event.startDate), 'HH:mm')}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin size={10} />
                            <span className="truncate max-w-[100px]">{event.location}</span>
                          </div>
                        )}
                        {event.participants.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users size={10} />
                            <span>{event.participants.length}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {selectedDateEvents.length === 0 && (
                    <div className="py-8 text-center border border-dashed border-white/5 rounded-3xl">
                      <p className="text-[10px] uppercase font-black tracking-widest text-white/10">No hay reuniones</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks Section */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                  <CalendarDays size={12} />
                  Tareas del Día
                </h4>
                <div className="space-y-2">
                  {selectedDateTasks.map(task => (
                    <div 
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 ${task.completed ? 'opacity-40' : ''}`}
                    >
                      <div className={`w-1 h-8 rounded-full ${task.completed ? 'bg-white/10' : 'bg-amber-500/50'}`} />
                      <div className="flex flex-col">
                        <span className={`text-[11px] font-bold ${task.completed ? 'line-through' : 'text-white'}`}>
                          {task.text}
                        </span>
                        <span className="text-[9px] text-white/20 uppercase font-black">Proyecto Relacionado</span>
                      </div>
                    </div>
                  ))}
                  {selectedDateTasks.length === 0 && (
                    <div className="py-8 text-center border border-dashed border-white/5 rounded-3xl">
                      <p className="text-[10px] uppercase font-black tracking-widest text-white/10">Sin tareas programadas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for adding/editing event */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAdding(false);
                setEditingEvent(null);
                setFormData({
                  title: '',
                  description: '',
                  type: 'reunion',
                  color: COLORS[0],
                  participants: [],
                  location: '',
                });
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#121212] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSave} className="p-10 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <header className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest">
                      {editingEvent ? 'Editar Evento' : 'Programar Nuevo Evento'}
                    </p>
                    <h3 className="text-2xl font-light italic font-serif">
                      {editingEvent ? editingEvent.title : 'Detalles de la Reunión'}
                    </h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingEvent(null);
                    }}
                    className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </header>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Título del Evento</label>
                    <input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ej: Reunión de Avance I+D"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Tipo de Evento</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                      >
                        {EVENT_TYPES.map(type => (
                          <option key={type.id} value={type.id} className="bg-[#121212]">{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Color Identificador</label>
                      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl h-[54px] items-center justify-around">
                        {COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`w-6 h-6 rounded-full transition-all ${formData.color === color ? 'ring-2 ring-white scale-110' : 'hover:scale-110'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Fecha y Hora de Inicio</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.startDate ? format(new Date(formData.startDate), "yyyy-MM-dd'T'HH:mm") : format(selectedDate, "yyyy-MM-dd'T'09:00")}
                        onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value).getTime() })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Fecha y Hora de Fin</label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.endDate ? format(new Date(formData.endDate), "yyyy-MM-dd'T'HH:mm") : format(selectedDate, "yyyy-MM-dd'T'10:00")}
                        onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value).getTime() })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Ubicación / Link</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" />
                      <input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Sala de reuniones, Google Meet..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Participantes</label>
                    <div className="flex gap-2">
                      <input
                        value={newParticipant}
                        onChange={(e) => setNewParticipant(e.target.value)}
                        placeholder="Nombre del integrante..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                      />
                      <button 
                        type="button"
                        onClick={addParticipant}
                        className="px-6 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.participants?.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase text-blue-400">
                          {p.name}
                          <button 
                            type="button"
                            onClick={() => setFormData({ ...formData, participants: formData.participants?.filter((_, i) => i !== idx) })}
                            className="hover:text-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Descripción / Notas</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Temas a tratar, objetivos de la reunión..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  {editingEvent && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('¿Eliminar este evento?')) {
                          onDeleteEvent(editingEvent.id);
                          setIsAdding(false);
                          setEditingEvent(null);
                        }
                      }}
                      className="p-4 rounded-2xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingEvent(null);
                    }}
                    className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] btn-primary py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20"
                  >
                    {editingEvent ? 'Actualizar Evento' : 'Programar Evento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
