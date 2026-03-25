
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { DashboardEvent, ProjectStatus, TeamMember, FinalConfirmation, Professional, TeamRole } from '../types';
import { Calendar, MapPin, Clock, Plus, AlertCircle, Camera, Video, Smartphone, Search, Bell, Users, User, AlertTriangle, Filter, ClipboardCheck, Lock, CheckCircle, X, LayoutList, Contact, ArrowRightLeft, UserCheck, Settings, Trash2, Save, FileText, ExternalLink, ChevronRight, FilePlus, CheckSquare, Pencil, Sparkles, Phone, Briefcase, Database } from 'lucide-react';

interface Props {
  events: DashboardEvent[];
  professionals: Professional[]; 
  onUpdateEvents: (events: DashboardEvent[]) => void;
  onAddProfessional: (pro: Professional) => void;
  onUpdateProfessional: (pro: Professional) => void;
  onRemoveProfessional: (id: string) => void;
  onNewProject: () => void;
  onSelectEvent: (event: DashboardEvent) => void;
  onSeedDatabase: () => void;
  onResetDatabase: () => void;
}

const ALL_ROLES: TeamRole[] = ['Fotógrafo', 'Storymaker', 'Videomaker', 'Assistente'];

// --- STATIC UTILITIES ---
const parseDateTime = (dateStr: string, timeStr: string) => {
  const [day, month, year] = dateStr.split('/').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
};

const getStatusColor = (status: ProjectStatus, hasConflict: boolean) => {
  if (hasConflict) return 'border-l-rose-600 bg-rose-500/5 border-rose-900/50';

  switch (status) {
    case 'Hoje': return 'border-l-rose-500 bg-rose-500/5 border-rose-900/20';
    case 'Em Execução': return 'border-l-indigo-500 bg-indigo-500/5 border-indigo-900/20';
    case 'Próximo': return 'border-l-amber-500 bg-amber-500/5 border-amber-900/20';
    case 'Planejado': return 'border-l-emerald-500 bg-emerald-500/5 border-emerald-900/20';
    default: return 'border-l-slate-700 bg-slate-900';
  }
};

const getStatusBadge = (status: ProjectStatus) => {
  switch (status) {
    case 'Hoje': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white animate-pulse">HOJE</span>;
    case 'Em Execução': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">EM EXECUÇÃO</span>;
    case 'Próximo': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">PRÓXIMO</span>;
    case 'Planejado': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">PLANEJADO</span>;
    default: return null;
  }
};

const generateMockContractText = (event: DashboardEvent) => {
    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS\n\n` +
    `CONTRATANTE: ${event.client_name}\n` +
    `EVENTO: ${event.event_type} - ${event.event_name || 'Sem nome'}\n` +
    `DATA: ${event.date}\n` +
    `HORÁRIO: ${event.start_time}\n` +
    `LOCAL: ${event.location_name}, ${event.location_city}\n\n` +
    `SERVIÇOS CONTRATADOS:\n` +
    event.services.map(s => `- ${s}`).join('\n') + `\n\n` +
    `EQUIPE ALOCADA:\n` +
    event.team.map(t => `- ${t.role}: ${t.name} ${t.is_primary ? '(Responsável)' : ''}`).join('\n') + `\n\n` +
    `CLÁUSULA DE USO DE IMAGEM: O contratante autoriza o uso de imagem para portfólio.\n` +
    `CLÁUSULA DE CANCELAMENTO: Multa de 30% sobre o valor total em caso de desistência.\n\n` +
    `Sorocaba, ${new Date().toLocaleDateString()}`;
};

const Dashboard: React.FC<Props> = ({ events, professionals, onUpdateEvents, onAddProfessional, onUpdateProfessional, onRemoveProfessional, onNewProject, onSelectEvent, onSeedDatabase, onResetDatabase }) => {
  const [selectedPro, setSelectedPro] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'events' | 'team'>('events');
  
  // Modals State
  const [showConfModal, setShowConfModal] = useState(false);
  const [confEvent, setConfEvent] = useState<DashboardEvent | null>(null);
  const [confForm, setConfForm] = useState<FinalConfirmation['checklist'] | null>(null);
  const [confDivergence, setConfDivergence] = useState('');

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapEvent, setSwapEvent] = useState<DashboardEvent | null>(null);
  const [swapMemberIndex, setSwapMemberIndex] = useState<number | null>(null);
  const [swapTargetRole, setSwapTargetRole] = useState<TeamRole | null>(null);

  const [showTeamManager, setShowTeamManager] = useState(false);
  // Team Manager Local State
  const [newPro, setNewPro] = useState<Partial<Professional>>({ roles: ['Fotógrafo'] });
  const [editingProId, setEditingProId] = useState<string | null>(null);
  const [proSearch, setProSearch] = useState('');

  const [viewEvent, setViewEvent] = useState<DashboardEvent | null>(null);
  const [detailsTab, setDetailsTab] = useState<'info' | 'contract' | 'team'>('info');
  const [roleToAdd, setRoleToAdd] = useState<TeamRole>('Fotógrafo');

  // --- SYNC EFFECTS ---
  useEffect(() => {
    if (viewEvent) {
        const freshEvent = events.find(e => e.id === viewEvent.id);
        if (freshEvent && freshEvent !== viewEvent) {
            setViewEvent(freshEvent);
        }
    }
  }, [events, viewEvent]);


  // --- MEMOIZED LOGIC ---
  const conflicts = useMemo(() => {
    const conflictMap = new Map<string, Set<string>>();
    const proSchedule = new Map<string, { start: Date, end: Date, eventId: string }[]>();

    const activeEvents = events.filter(e => e.status !== 'Finalizado' && e.status !== 'Cancelado');

    activeEvents.forEach(event => {
       const start = parseDateTime(event.date, event.start_time);
       const end = event.end_time ? parseDateTime(event.date, event.end_time) : new Date(start.getTime() + 4 * 60 * 60 * 1000);

       event.team.forEach(member => {
          if (!member.name || member.name === 'A Definir') return;
          const nameLower = member.name.toLowerCase();
          
          if (!proSchedule.has(nameLower)) {
             proSchedule.set(nameLower, []);
          }
          const schedule = proSchedule.get(nameLower)!;
          
          for (const slot of schedule) {
             if (start < slot.end && end > slot.start) {
                if (!conflictMap.has(event.id)) conflictMap.set(event.id, new Set());
                conflictMap.get(event.id)!.add(nameLower);
                if (!conflictMap.has(slot.eventId)) conflictMap.set(slot.eventId, new Set());
                conflictMap.get(slot.eventId)!.add(nameLower);
             }
          }
          schedule.push({ start, end, eventId: event.id });
       });
    });

    return conflictMap;
  }, [events]);

  const teamWorkload = useMemo(() => {
      const workload = new Map<string, DashboardEvent[]>();
      professionals.forEach(p => workload.set(p.name, []));

      events.forEach(event => {
          if (event.status === 'Finalizado' || event.status === 'Cancelado') return;
          event.team.forEach(member => {
              if (!member.name || member.name === 'A Definir') return;
              if (!workload.has(member.name)) workload.set(member.name, []);
              
              const list = workload.get(member.name)!;
              if (!list.find(e => e.id === event.id)) {
                  list.push(event);
              }
          });
      });
      return workload;
  }, [events, professionals]);

  const allProfessionalsNames = useMemo(() => {
    return professionals.map(p => p.name).sort();
  }, [professionals]);

  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    if (selectedPro) {
      filtered = filtered.filter(e => e.team.some(t => t.name === selectedPro));
    }
    
    return filtered.sort((a, b) => {
        const score = (s: ProjectStatus) => {
            if (s === 'Em Execução') return 0;
            if (s === 'Hoje') return 1;
            if (s === 'Próximo') return 2;
            return 3;
        };
        const statusDiff = score(a.status) - score(b.status);
        if (statusDiff !== 0) return statusDiff;
        
        const [d1, m1, y1] = a.date.split('/');
        const [d2, m2, y2] = b.date.split('/');
        return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
    });
  }, [events, selectedPro]);

  // Memoized Available Pros for Swap Modal
  const availableProsForSwap = useMemo(() => {
    if (!swapEvent) return [];

    const targetStart = parseDateTime(swapEvent.date, swapEvent.start_time);
    const targetEnd = swapEvent.end_time ? parseDateTime(swapEvent.date, swapEvent.end_time) : new Date(targetStart.getTime() + 4 * 3600 * 1000);

    const capablePros = professionals.filter(p => 
        swapTargetRole ? p.roles.includes(swapTargetRole) : true
    );

    const busyPros = new Set<string>();

    events.forEach(otherEvent => {
        if (otherEvent.id === swapEvent.id) return;
        if (otherEvent.status === 'Finalizado' || otherEvent.status === 'Cancelado') return;

        const otherStart = parseDateTime(otherEvent.date, otherEvent.start_time);
        const otherEnd = otherEvent.end_time ? parseDateTime(otherEvent.date, otherEvent.end_time) : new Date(otherStart.getTime() + 4 * 3600 * 1000);

        if (targetStart < otherEnd && targetEnd > otherStart) {
            otherEvent.team.forEach(t => busyPros.add(t.name));
        }
    });

    return capablePros.map(p => p.name).filter(name => !busyPros.has(name));

  }, [swapEvent, swapTargetRole, professionals, events]);

  // --- ACTIONS ---

  const handleOpenSwap = useCallback((e: React.MouseEvent, event: DashboardEvent, memberIndex: number) => {
      e.stopPropagation();
      setSwapEvent(event);
      setSwapMemberIndex(memberIndex);
      setSwapTargetRole(event.team[memberIndex].role);
      setShowSwapModal(true);
  }, []);

  const executeSwap = useCallback((newProName: string) => {
      if (!swapEvent || swapMemberIndex === null) return;
      
      const updatedEvents = events.map(e => {
          if (e.id === swapEvent.id) {
              const newTeam = [...e.team];
              newTeam[swapMemberIndex] = { ...newTeam[swapMemberIndex], name: newProName };
              return { ...e, team: newTeam };
          }
          return e;
      });

      onUpdateEvents(updatedEvents);
      setShowSwapModal(false);
      setSwapEvent(null);
      setSwapMemberIndex(null);
      setSwapTargetRole(null);
  }, [events, swapEvent, swapMemberIndex, onUpdateEvents]);

  const handleAddTeamSlot = () => {
      if(!viewEvent) return;
      const newMember: TeamMember = {
          role: roleToAdd,
          name: 'A Definir',
          is_primary: false,
          added_later: true
      };
      const updatedEvents = events.map(e => {
          if(e.id === viewEvent.id) {
              return { ...e, team: [...e.team, newMember] };
          }
          return e;
      });
      onUpdateEvents(updatedEvents);
  };

  const handleRemoveTeamSlot = (index: number) => {
      if(!viewEvent) return;
      if(!window.confirm("Remover este profissional da escala?")) return;
      
      const updatedEvents = events.map(e => {
          if(e.id === viewEvent.id) {
              const newTeam = [...e.team];
              newTeam.splice(index, 1);
              return { ...e, team: newTeam };
          }
          return e;
      });
      onUpdateEvents(updatedEvents);
  }

  const handleSavePro = () => {
      if (!newPro.name || !newPro.phone) {
          alert("Nome e Telefone são obrigatórios.");
          return;
      }
      if (!newPro.roles || newPro.roles.length === 0) {
          alert("Selecione pelo menos uma função para o profissional.");
          return;
      }

      if (editingProId) {
          // UPDATE EXISTING
          const updatedPro: Professional = {
              id: editingProId,
              name: newPro.name,
              phone: newPro.phone,
              roles: newPro.roles,
              active: true
          };
          onUpdateProfessional(updatedPro);
          setEditingProId(null);
      } else {
          // CREATE NEW
          const pro: Professional = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: newPro.name,
              phone: newPro.phone,
              roles: newPro.roles,
              active: true
          };
          onAddProfessional(pro);
      }
      
      // Reset Form
      setNewPro({ roles: ['Fotógrafo'], name: '', phone: '' });
  };

  const startEditingPro = (pro: Professional) => {
      setNewPro({
          name: pro.name,
          phone: pro.phone,
          roles: pro.roles
      });
      setEditingProId(pro.id);
  };

  const cancelEditingPro = () => {
      setNewPro({ roles: ['Fotógrafo'], name: '', phone: '' });
      setEditingProId(null);
  };

  const toggleNewProRole = (role: TeamRole) => {
      const currentRoles = newPro.roles || [];
      if (currentRoles.includes(role)) {
          setNewPro({ ...newPro, roles: currentRoles.filter(r => r !== role) });
      } else {
          setNewPro({ ...newPro, roles: [...currentRoles, role] });
      }
  };

  // UPDATED: Robust delete handler for Team Manager
  const handleRemovePro = (e: React.MouseEvent, id: string) => {
      e.preventDefault(); 
      e.stopPropagation();
      
      if (window.confirm("ATENÇÃO: Deseja realmente excluir este profissional? Esta ação não pode ser desfeita.")) {
          onRemoveProfessional(id);
          // If we were editing this person, cancel edit
          if (editingProId === id) {
              cancelEditingPro();
          }
      }
  };

  const openConfirmation = (e: React.MouseEvent, event: DashboardEvent) => {
      setConfEvent(event);
      setConfForm({
          event_date: event.date,
          coverage_start_time: event.start_time,
          coverage_end_time: event.end_time || '',
          ceremony_location: event.location_name,
          reception_location: event.location_name,
          responsible_person_name: event.client_name,
          responsible_person_phone: ''
      });
      setConfDivergence('');
      setShowConfModal(true);
  };

  const handleConfChange = (field: keyof FinalConfirmation['checklist'], value: string) => {
      setConfForm(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const handleSaveConfirmation = () => {
      if (!confEvent || !confForm) return;

      const isDivergent = 
         confForm.event_date !== confEvent.date ||
         confForm.coverage_start_time !== confEvent.start_time ||
         confForm.ceremony_location !== confEvent.location_name;

      if (isDivergent && !confDivergence) {
          alert("Divergência detectada! Você deve adicionar uma observação justificando a alteração.");
          return;
      }

      const updatedEvents = events.map(e => {
          if (e.id === confEvent.id) {
              return {
                  ...e,
                  final_confirmation: {
                      authorized: true,
                      confirmed_at: new Date().toISOString(),
                      divergences_notes: confDivergence,
                      checklist: confForm
                  }
              };
          }
          return e;
      });

      onUpdateEvents(updatedEvents);
      setShowConfModal(false);
      setConfEvent(null);
  };

  // Helper component for Team Badges to keep JSX clean
  const renderTeamBadge = (member: TeamMember, eventId: string, index: number) => {
     let colorClass = "bg-slate-800 text-slate-400";
     let Icon = User; 

     if (member.role === 'Fotógrafo') { colorClass = "bg-blue-500/20 text-blue-300 border-blue-500/30"; Icon = Camera; }
     if (member.role === 'Storymaker') { colorClass = "bg-pink-500/20 text-pink-300 border-pink-500/30"; Icon = Smartphone; }
     if (member.role === 'Videomaker') { colorClass = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"; Icon = Video; }

     const eventConflicts = conflicts.get(eventId);
     const isConflicting = member.name !== 'A Definir' && eventConflicts?.has(member.name.toLowerCase());

     return (
        <div 
            key={`${member.name}-${member.role}-${index}`}
            onClick={(e) => isConflicting ? handleOpenSwap(e, events.find(ev => ev.id === eventId)!, index) : null}
            className={`
                flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border transition-all 
                ${colorClass} 
                ${isConflicting ? 'ring-2 ring-rose-500 bg-rose-500/20 text-rose-300 animate-pulse cursor-pointer hover:bg-rose-500/30' : ''}
                ${member.added_later ? 'border-dashed border-slate-500' : ''}
            `}
            title={isConflicting ? "Clique para resolver o conflito" : member.added_later ? "Adicionado via Aditivo" : ""}
        >
           {isConflicting && <AlertTriangle className="w-3 h-3 text-rose-500" />}
           <Icon className="w-3 h-3 opacity-70" />
           <span className="font-bold">{member.name.split(' ')[0]}</span>
           <span className="opacity-50 text-[9px] uppercase tracking-wide ml-1">{member.role}</span>
        </div>
     );
  };

  const handleCardClick = (event: DashboardEvent) => {
      const requiresConfirmation = (event.status === 'Próximo' || event.status === 'Hoje') && !event.final_confirmation?.authorized;
      
      if (requiresConfirmation) {
          alert("BLOQUEIO OPERACIONAL: Este evento exige Confirmação Final com o Cliente antes de acessar os detalhes de execução.");
          return;
      }
      
      setViewEvent(event);
      setDetailsTab('info');
  };
  
  const handleProceedToExecution = () => {
      if (viewEvent) {
          onSelectEvent(viewEvent);
          setViewEvent(null);
      }
  };

  const filteredPros = useMemo(() => {
     if(!proSearch) return professionals;
     return professionals.filter(p => p.name.toLowerCase().includes(proSearch.toLowerCase()));
  }, [professionals, proSearch]);

  const alerts = events.filter(e => e.status === 'Hoje' || e.status === 'Próximo' || conflicts.has(e.id));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Top Bar / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
           <div className="bg-indigo-500/20 p-3 rounded-full">
              <Calendar className="w-6 h-6 text-indigo-400" />
           </div>
           <div>
              <p className="text-slate-500 text-xs font-bold uppercase">Eventos na Fila</p>
              <p className="text-2xl font-bold text-white">{events.length}</p>
           </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
           <div className={`p-3 rounded-full ${alerts.length > 0 ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`}>
              <AlertCircle className={`w-6 h-6 ${alerts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
           </div>
           <div>
              <p className="text-slate-500 text-xs font-bold uppercase">Atenção Operacional</p>
              <p className={`text-2xl font-bold ${alerts.length > 0 ? 'text-rose-400' : 'text-white'}`}>{alerts.length}</p>
           </div>
        </div>

        <button 
            onClick={onNewProject}
            className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 p-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 group"
        >
           <Plus className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
           <span className="text-white font-bold">Novo Projeto</span>
        </button>
      </div>

      {/* Main Content Header & Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
         <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               {viewMode === 'events' ? 'Fila de Execução' : 'Carga de Trabalho da Equipe'}
             </h2>
             <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                 <button 
                    onClick={() => setViewMode('events')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'events' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                 >
                    <LayoutList className="w-3 h-3" /> Fila
                 </button>
                 <button 
                    onClick={() => setViewMode('team')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'team' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                 >
                    <Contact className="w-3 h-3" /> Equipe
                 </button>
             </div>
         </div>
         
         <div className="flex gap-2 w-full md:w-auto items-center">
            {/* SEARCH / FILTERS */}
            {viewMode === 'events' ? (
                <>
                   <div className="relative flex-1 md:flex-none md:w-64">
                     <select 
                        value={selectedPro || ''}
                        onChange={(e) => setSelectedPro(e.target.value || null)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                     >
                        <option value="">Todos os Profissionais</option>
                        {allProfessionalsNames.map(pro => (
                           <option key={pro} value={pro}>{pro}</option>
                        ))}
                     </select>
                     <Filter className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                   </div>
                   <button className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 rounded-lg"><Search className="w-5 h-5" /></button>
                   <button 
                        onClick={() => setShowTeamManager(true)}
                        className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 rounded-lg ml-1"
                        title="Gerenciar Equipe"
                   >
                        <Settings className="w-5 h-5" />
                   </button>
                </>
             ) : (
                <button 
                    onClick={() => setShowTeamManager(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2 text-sm font-bold transition-all"
                >
                    <Settings className="w-4 h-4" /> Gerenciar Cadastro
                </button>
             )}
         </div>
      </div>

      {/* VIEW: EVENTS LIST */}
      {viewMode === 'events' && (
         <div className="space-y-4">
            {filteredEvents.map((event) => {
               const hasConflict = conflicts.has(event.id);
               const isConfirmPending = (event.status === 'Próximo' || event.status === 'Hoje') && !event.final_confirmation?.authorized;

               return (
               <div 
                  key={event.id}
                  onClick={() => handleCardClick(event)}
                  className={`
                     relative group overflow-hidden rounded-xl border border-slate-800 p-5 transition-all hover:border-slate-600 cursor-pointer border-l-4 shadow-lg
                     ${getStatusColor(event.status, hasConflict)}
                     ${isConfirmPending ? 'opacity-90' : ''}
                  `}
               >
                  {/* ALERTS */}
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                      {hasConflict && (
                         <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded text-[10px] text-rose-400 font-bold uppercase tracking-wider animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            Conflito de Agenda
                         </div>
                      )}
                      
                      {isConfirmPending && (
                         <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                            <Lock className="w-3 h-3" />
                            Confirmação Pendente
                         </div>
                      )}

                      {!isConfirmPending && (event.status === 'Próximo' || event.status === 'Hoje') && (
                          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                            <CheckCircle className="w-3 h-3" />
                            Confirmado
                         </div>
                      )}
                  </div>


                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     
                     {/* Left: Date & Time */}
                     <div className="flex items-center gap-4 min-w-[140px]">
                        <div className="flex flex-col items-center justify-center bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 min-w-[60px]">
                           <span className="text-xs text-slate-400 uppercase font-bold">{event.date.split('/')[1] === '12' ? 'DEZ' : 'JAN'}</span>
                           <span className="text-xl font-bold text-white">{event.date.split('/')[0]}</span>
                        </div>
                        <div>
                           <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                              <Clock className="w-4 h-4 text-slate-500" />
                              {event.start_time}
                           </div>
                           <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{event.date.split('/').slice(2).join('')}</span>
                        </div>
                     </div>

                     {/* Middle: Event Info */}
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           {getStatusBadge(event.status)}
                           <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-bold tracking-wide">
                              {event.event_type}
                           </span>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                           {event.client_name}
                           {event.event_name && <span className="text-slate-500 font-normal"> • {event.event_name}</span>}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-400 mt-1 mb-3">
                           <MapPin className="w-3 h-3" />
                           {event.location_name}, {event.location_city}
                        </div>

                        {/* TEAM DISPLAY */}
                        <div className="flex flex-wrap gap-2">
                           {event.team.length > 0 ? (
                              event.team.map((member, idx) => renderTeamBadge(member, event.id, idx))
                           ) : (
                              <span className="text-xs text-slate-600 flex items-center gap-1 italic"><Users className="w-3 h-3" /> Equipe não alocada</span>
                           )}
                        </div>
                        
                        {/* CONFIRMATION ACTION BUTTON */}
                        {isConfirmPending && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); openConfirmation(e, event); }}
                                className="mt-3 text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-md font-bold shadow-lg shadow-amber-900/20 flex items-center gap-2 animate-bounce-subtle"
                            >
                                <ClipboardCheck className="w-3 h-3" />
                                Realizar Confirmação Final com Cliente
                            </button>
                        )}

                     </div>

                     {/* Right: Services & Action */}
                     <div className="hidden md:flex flex-col items-end gap-2 min-w-[120px]">
                        <div className="flex gap-1">
                           {event.services.includes('Fotografia') && <Camera className="w-4 h-4 text-indigo-400" />}
                           {event.services.includes('Storymaker') && <Smartphone className="w-4 h-4 text-pink-400" />}
                           {event.services.includes('Vídeo') && <Video className="w-4 h-4 text-cyan-400" />}
                        </div>
                     </div>
                  </div>
               </div>
            )})}
         </div>
      )}

      {/* VIEW: TEAM WORKLOAD */}
      {viewMode === 'team' && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allProfessionalsNames.map(proName => {
                const proEvents = teamWorkload.get(proName) || [];
                const upcoming = proEvents.filter(e => e.status !== 'Finalizado' && e.status !== 'Cancelado');
                
                // Identify if this pro has any conflict
                let hasActiveConflict = false;
                upcoming.forEach(e => {
                    if (conflicts.get(e.id)?.has(proName.toLowerCase())) hasActiveConflict = true;
                });

                return (
                   <div key={proName} className={`bg-slate-900 border rounded-xl overflow-hidden shadow-lg ${hasActiveConflict ? 'border-rose-500/50 shadow-rose-900/10' : 'border-slate-800'}`}>
                       <div className={`p-4 border-b flex items-center justify-between ${hasActiveConflict ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-950 border-slate-800'}`}>
                           <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-full ${hasActiveConflict ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                   <User className="w-5 h-5" />
                               </div>
                               <div>
                                   <h3 className="font-bold text-white text-sm">{proName}</h3>
                                   <p className="text-[10px] uppercase font-bold text-slate-500">{upcoming.length} Eventos Ativos</p>
                               </div>
                           </div>
                           {hasActiveConflict && <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />}
                       </div>
                       
                       <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                           {upcoming.length === 0 ? (
                               <p className="text-xs text-slate-600 text-center py-4 italic">Sem eventos futuros.</p>
                           ) : (
                               upcoming.map(e => {
                                   const isConflicting = conflicts.get(e.id)?.has(proName.toLowerCase());
                                   return (
                                       <div key={e.id} className={`p-3 rounded-lg border text-sm ${isConflicting ? 'bg-rose-900/20 border-rose-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                                           <div className="flex justify-between items-start mb-1">
                                               <span className={`text-xs font-bold ${isConflicting ? 'text-rose-300' : 'text-slate-400'}`}>{e.date}</span>
                                               <span className="text-xs font-mono text-slate-500">{e.start_time}</span>
                                           </div>
                                           <p className="font-medium text-slate-200 truncate">{e.client_name}</p>
                                           {isConflicting && <p className="text-[10px] text-rose-400 mt-1 font-bold uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Sobreposição Detectada</p>}
                                       </div>
                                   );
                               })
                           )}
                       </div>
                   </div>
                );
            })}
         </div>
      )}

      {/* MODAL: TEAM MANAGER (REFACTORED - CARD GRID) */}
      {showTeamManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh]">
                  
                  {/* MANAGER HEADER */}
                  <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-xl">
                      <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                             <Briefcase className="w-6 h-6 text-indigo-400" />
                             Gestão de Profissionais
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">Gerencie sua base de talentos para alocação em projetos.</p>
                      </div>
                      <div className="flex items-center gap-3">
                          <button 
                             onClick={onSeedDatabase}
                             className="hidden md:flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/20 rounded-lg transition-all"
                             title="Preencher com dados fictícios para teste"
                          >
                             <Database className="w-3 h-3" /> Gerar Dados de Teste
                          </button>
                          <button 
                             onClick={onResetDatabase}
                             className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-lg transition-all"
                             title="Limpar todos os profissionais"
                          >
                             <AlertCircle className="w-3 h-3" /> Resetar Base
                          </button>
                          <button onClick={() => setShowTeamManager(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
                      
                      {/* ADD / EDIT FORM AREA */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8 shadow-lg">
                           <div className="flex justify-between items-center mb-4">
                               <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-2">
                                  {editingProId ? <Pencil className="w-4 h-4"/> : <Sparkles className="w-4 h-4"/>}
                                  {editingProId ? 'Editando Profissional' : 'Novo Cadastro'}
                               </h4>
                               {editingProId && (
                                  <button onClick={cancelEditingPro} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                                      <X className="w-3 h-3" /> Cancelar Edição
                                  </button>
                               )}
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                               {/* Name Input */}
                               <div className="md:col-span-4 space-y-1">
                                   <label className="text-[10px] uppercase font-bold text-slate-500">Nome Completo</label>
                                   <input 
                                       type="text" 
                                       value={newPro.name || ''}
                                       onChange={e => setNewPro({...newPro, name: e.target.value})}
                                       className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                       placeholder="Ex: João da Silva"
                                   />
                               </div>

                               {/* Roles Input */}
                               <div className="md:col-span-5 space-y-1">
                                   <label className="text-[10px] uppercase font-bold text-slate-500">Funções Habilitadas</label>
                                   <div className="flex flex-wrap gap-2 bg-slate-950 border border-slate-700 rounded-lg p-2 min-h-[42px]">
                                        {ALL_ROLES.map(role => (
                                          <button 
                                            key={role}
                                            onClick={() => toggleNewProRole(role)}
                                            className={`text-xs px-2 py-1 rounded border transition-all ${
                                                newPro.roles?.includes(role) 
                                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' 
                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                                            }`}
                                          >
                                            {role}
                                          </button>
                                        ))}
                                   </div>
                               </div>

                               {/* Phone & Action */}
                               <div className="md:col-span-3 space-y-1">
                                   <label className="text-[10px] uppercase font-bold text-slate-500">Contato / WhatsApp</label>
                                   <div className="flex gap-2">
                                       <input 
                                           type="text" 
                                           value={newPro.phone || ''}
                                           onChange={e => setNewPro({...newPro, phone: e.target.value})}
                                           className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm"
                                           placeholder="(00) 00000-0000"
                                       />
                                       <button 
                                            onClick={handleSavePro}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 flex items-center justify-center shadow-lg transition-all"
                                            title="Salvar"
                                       >
                                           <Save className="w-5 h-5" />
                                       </button>
                                   </div>
                               </div>
                           </div>
                      </div>

                      {/* LIST AREA (GRID OF CARDS) */}
                      <div>
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                  <Users className="w-4 h-4" /> Base de Talentos ({filteredPros.length})
                              </h4>
                              <div className="relative">
                                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                                  <input 
                                      type="text" 
                                      value={proSearch}
                                      onChange={(e) => setProSearch(e.target.value)}
                                      placeholder="Buscar por nome..."
                                      className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 w-64"
                                  />
                              </div>
                          </div>

                          {filteredPros.length === 0 ? (
                              <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                                  <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                  <p className="text-slate-500 font-medium">Nenhum profissional encontrado.</p>
                                  <p className="text-slate-600 text-xs mt-1">Cadastre um novo acima.</p>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {filteredPros.map(pro => (
                                      <div 
                                        key={pro.id} 
                                        className={`group relative bg-slate-900 border rounded-xl p-4 transition-all hover:shadow-xl hover:-translate-y-1 ${editingProId === pro.id ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-slate-800 hover:border-slate-600'}`}
                                      >
                                          <div className="flex justify-between items-start mb-3">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-slate-600 shadow-inner">
                                                      <span className="font-bold text-slate-300">{pro.name.charAt(0)}</span>
                                                  </div>
                                                  <div>
                                                      <h5 className="font-bold text-white text-sm leading-tight">{pro.name}</h5>
                                                      <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                                                          <Phone className="w-3 h-3" /> {pro.phone}
                                                      </div>
                                                  </div>
                                              </div>
                                              
                                              {/* ACTIONS */}
                                              <div className="flex gap-1">
                                                  <button 
                                                      onClick={() => startEditingPro(pro)}
                                                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded"
                                                      title="Editar"
                                                  >
                                                      <Pencil className="w-4 h-4" />
                                                  </button>
                                                  <button 
                                                      onClick={(e) => handleRemovePro(e, pro.id)}
                                                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded"
                                                      title="Excluir"
                                                  >
                                                      <Trash2 className="w-4 h-4" />
                                                  </button>
                                              </div>
                                          </div>

                                          <div className="flex flex-wrap gap-1.5 mt-2">
                                              {pro.roles.map(r => (
                                                  <span key={r} className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                                      {r}
                                                  </span>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
