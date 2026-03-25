
import React, { useState, useEffect } from 'react';
import { agent3GeneratePlan } from '../services/geminiService';
import { ContractVerificationResult, PreContractData, PlanningJSON, TeamMember, TeamRole, Professional } from '../types';
import { CalendarClock, Loader2, Settings2, Bell, ListTodo, Check, Briefcase, Users, Plus, Trash2, UserPlus, BrainCircuit, X, Search } from 'lucide-react';

interface Props {
  contractData: ContractVerificationResult;
  preContractData: PreContractData;
  onComplete: (data: PlanningJSON) => void;
  // New props for selection
  professionals: Professional[];
  onAddProfessional: (pro: Professional) => void;
}

const Agent3Planning: React.FC<Props> = ({ contractData, preContractData, onComplete, professionals, onAddProfessional }) => {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [generatedPlan, setGeneratedPlan] = useState<PlanningJSON | null>(null);
  
  // Team Assignment State
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [showTeamInput, setShowTeamInput] = useState(false);

  // Quick Add State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPhone, setQuickAddPhone] = useState('');
  const [quickAddRole, setQuickAddRole] = useState<TeamRole>('Fotógrafo');

  // Loading Steps Animation Text
  const loadingMessages = [
     "Analisando Contrato Validado...",
     "Classificando Perfil: Corporativo ou Social?",
     "Calculando Janela de Cobertura...",
     "Gerando Checklist Operacional...",
     "Definindo Alertas de Cronograma...",
     "Finalizando Estratégia..."
  ];

  // Effect for Loading Animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loading) {
        setLoadingStep(0);
        interval = setInterval(() => {
            setLoadingStep(prev => (prev + 1) % loadingMessages.length);
        }, 1200); // Change message every 1.2s
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Auto-populate needed roles when component mounts or data changes
  useEffect(() => {
     if (!generatedPlan && team.length === 0) {
        const initialTeam: TeamMember[] = [];
        
        // Always need a photographer
        if (preContractData.main_service.service_type === 'Fotografia') {
            initialTeam.push({ role: 'Fotógrafo' as TeamRole, name: '', is_primary: true });
        }
        
        // Storymaker
        if (preContractData.additional_services?.storymaker?.enabled) {
            initialTeam.push({ role: 'Storymaker' as TeamRole, name: '', is_primary: false });
        }

        // Video
        if (preContractData.additional_services?.video?.enabled) {
            initialTeam.push({ role: 'Videomaker' as TeamRole, name: '', is_primary: false });
        }

        setTeam(initialTeam);
     }
  }, [preContractData, generatedPlan]);


  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      // Accessing new nested event_type
      const result = await agent3GeneratePlan(preContractData, contractData);
      setGeneratedPlan(result);
      setShowTeamInput(true); // Show team assignment after plan is generated
    } catch (error) {
      console.error("Agent 3 Error:", error);
      alert("Erro ao gerar planejamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
      setTeam([...team, { role: 'Assistente', name: '', is_primary: false }]);
  };

  const handleRemoveMember = (index: number) => {
      const newTeam = [...team];
      newTeam.splice(index, 1);
      setTeam(newTeam);
  };

  const handleUpdateMember = (index: number, field: keyof TeamMember, value: any) => {
      const newTeam = [...team];
      // Type safety adjustment
      if (field === 'role') newTeam[index].role = value as TeamRole;
      if (field === 'name') newTeam[index].name = value as string;
      if (field === 'is_primary') {
          // Only one primary allowed, if setting to true, uncheck others
          if (value === true) {
              newTeam.forEach(m => m.is_primary = false);
          }
          newTeam[index].is_primary = value as boolean;
      }
      setTeam(newTeam);
  };

  const handleSelectProfessional = (index: number, proId: string) => {
      if (proId === 'new') {
          // Preset the role for quick add based on the row being edited
          setQuickAddRole(team[index].role);
          setShowQuickAdd(true);
          return;
      }

      const pro = professionals.find(p => p.id === proId);
      if (pro) {
          handleUpdateMember(index, 'name', pro.name);
      }
  };

  const handleQuickAddSubmit = () => {
      if (!quickAddName) return;
      
      const newPro: Professional = {
          id: Date.now().toString(),
          name: quickAddName,
          phone: quickAddPhone || 'N/A',
          roles: [quickAddRole], // Add the role context they were added in
          active: true
      };
      
      onAddProfessional(newPro);
      
      // Auto-select in the first empty slot for that role (logic simplification: just add to list, user selects)
      setShowQuickAdd(false);
      setQuickAddName('');
      setQuickAddPhone('');
  };

  const handleConfirm = () => {
    if (generatedPlan) {
      // Validation: Must have at least one photographer with a name
      const hasPhotographer = team.some(m => m.role === 'Fotógrafo' || m.role === 'Fotografia' as any); // adjusting for type mismatch in initial load
      const allHaveNames = team.every(m => m.name.trim().length > 0);

      if (!hasPhotographer) {
          alert("É obrigatório alocar pelo menos um Fotógrafo.");
          return;
      }

      if (!allHaveNames) {
          alert("Preencha o nome de todos os profissionais da equipe.");
          return;
      }

      // Merge team into plan
      const finalPlan = { ...generatedPlan, planning: { ...generatedPlan.planning, team_assignment: team } };
      onComplete(finalPlan);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6 text-amber-400">
          <CalendarClock className="w-6 h-6" />
          <h2 className="text-xl font-bold tracking-tight">Agente 3: Planejamento Operacional</h2>
        </div>

        {!generatedPlan ? (
          <div className="bg-slate-950 p-6 rounded-lg border border-slate-800">
            <h3 className="text-lg font-medium text-slate-200 mb-4 text-center">
              Gerar Estratégia de Execução
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900 p-4 rounded border border-slate-800">
                <span className="text-xs uppercase font-bold text-slate-500 block mb-1">Evento</span>
                <span className="text-white font-medium">{preContractData.event.event_type}</span>
              </div>
              <div className="bg-slate-900 p-4 rounded border border-slate-800">
                <span className="text-xs uppercase font-bold text-slate-500 block mb-1">Serviços Confirmados</span>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">
                    {preContractData.main_service.service_type}
                  </span>
                  {preContractData.additional_services.storymaker.enabled && (
                    <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-1 rounded">Storymaker</span>
                  )}
                  {preContractData.additional_services.video.enabled && (
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">Vídeo</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
               {!loading && (
                   <p className="text-slate-400 text-sm max-w-md text-center mb-6">
                     O sistema irá classificar automaticamente o perfil (<strong>Social</strong> ou <strong>Corporativo</strong>) e gerar a agenda detalhada.
                   </p>
               )}

              <button
                onClick={handleGeneratePlan}
                disabled={loading}
                className={`w-full md:w-auto px-8 py-3 font-bold rounded-lg transition-all inline-flex items-center justify-center gap-3 shadow-lg 
                    ${loading ? 'bg-slate-800 text-amber-400 cursor-wait border border-amber-500/20' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20'}
                `}
              >
                {loading ? (
                  <>
                    <BrainCircuit className="w-5 h-5 animate-pulse" />
                    <span className="animate-pulse">{loadingMessages[loadingStep]}</span>
                  </>
                ) : (
                  <>
                    <Settings2 className="w-5 h-5" />
                    Gerar Plano Operacional
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
             
             {/* HEADER INFO */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-amber-900/10 border border-amber-900/50 p-4 rounded-lg flex items-center gap-4">
                   <div className="bg-amber-900/20 p-3 rounded-full">
                      <Briefcase className="w-6 h-6 text-amber-500" />
                   </div>
                   <div>
                      <h4 className="text-xs uppercase font-bold text-amber-600">Perfil Definido</h4>
                      <p className="text-lg font-bold text-amber-400">{generatedPlan.planning.execution_profile}</p>
                   </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg">
                   <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs uppercase font-bold text-slate-500">Agenda Criada</h4>
                      {generatedPlan.agenda.event_created && <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded font-bold">OK</span>}
                   </div>
                   <div className="space-y-1">
                      <p className="text-sm text-slate-300"><span className="text-slate-600">Data:</span> {generatedPlan.agenda.event_date}</p>
                      <p className="text-sm text-slate-300"><span className="text-slate-600">Horário:</span> {generatedPlan.agenda.coverage_start_time} - {generatedPlan.agenda.coverage_end_time}</p>
                   </div>
                </div>
             </div>

             {/* TEAM ASSIGNMENT SECTION (OPERATIONAL LAYER) */}
             <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-sm font-bold text-slate-200">Alocação de Equipe (Obrigatório)</h4>
                    </div>
                    <button onClick={handleAddMember} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-white">
                        <Plus className="w-3 h-3" /> Adicionar
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    {team.map((member, idx) => {
                        // Filter pros by role capability
                        const availablePros = professionals.filter(p => p.roles.includes(member.role));

                        return (
                        <div key={idx} className="flex flex-col md:flex-row gap-2 items-start md:items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                             <select 
                                value={member.role} 
                                onChange={(e) => handleUpdateMember(idx, 'role', e.target.value)}
                                className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded px-2 py-1 w-full md:w-32"
                             >
                                <option value="Fotógrafo">Fotógrafo</option>
                                <option value="Storymaker">Storymaker</option>
                                <option value="Videomaker">Videomaker</option>
                                <option value="Assistente">Assistente</option>
                             </select>
                             
                             {/* SMART SELECTION DROPDOWN */}
                             <select
                                value={professionals.find(p => p.name === member.name)?.id || (member.name ? 'custom' : '')}
                                onChange={(e) => handleSelectProfessional(idx, e.target.value)}
                                className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded px-2 py-1 flex-1 w-full cursor-pointer"
                             >
                                <option value="">Selecione um profissional...</option>
                                {availablePros.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                                {member.name && !professionals.find(p => p.name === member.name) && (
                                    <option value="custom">{member.name} (Externo)</option>
                                )}
                                <option disabled>──────────</option>
                                <option value="new" className="text-indigo-400 font-bold">+ Cadastrar Novo</option>
                             </select>

                             <div className="flex items-center gap-2 mt-2 md:mt-0">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                                    <input 
                                        type="checkbox" 
                                        checked={member.is_primary}
                                        onChange={(e) => handleUpdateMember(idx, 'is_primary', e.target.checked)}
                                        className="rounded border-slate-700 bg-slate-950"
                                    />
                                    Responsável
                                </label>
                                <button onClick={() => handleRemoveMember(idx)} className="p-1 text-slate-600 hover:text-rose-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                        </div>
                    )})}
                    {team.length === 0 && (
                        <p className="text-sm text-slate-500 italic text-center py-2">Nenhum profissional alocado.</p>
                    )}
                </div>
             </div>

             {/* CHECKLIST & ALERTS */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Checklist */}
                <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                   <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-sm font-bold text-slate-200">Checklist Operacional</h4>
                   </div>
                   <ul className="p-4 space-y-2">
                      {generatedPlan.checklist.items.map((item, i) => (
                         <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                            <span className="text-slate-700 mt-1">•</span> {item}
                         </li>
                      ))}
                   </ul>
                </div>

                {/* Alerts */}
                <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                   <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-rose-400" />
                      <h4 className="text-sm font-bold text-slate-200">Alertas Programados</h4>
                   </div>
                   <div className="p-4 space-y-4">
                      <div>
                         <span className="text-xs font-bold text-slate-600 uppercase block mb-1">Pré-Evento</span>
                         <div className="flex flex-wrap gap-2">
                            {generatedPlan.alerts.pre_event.map((alert, i) => (
                               <span key={i} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">{alert}</span>
                            ))}
                         </div>
                      </div>
                      <div>
                         <span className="text-xs font-bold text-slate-600 uppercase block mb-1">No Dia</span>
                         <div className="flex flex-wrap gap-2">
                            {generatedPlan.alerts.day_of_event.map((alert, i) => (
                               <span key={i} className="text-xs bg-rose-900/20 text-rose-300 px-2 py-1 rounded border border-rose-900/50">{alert}</span>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* ACTIONS */}
             <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                   onClick={handleConfirm}
                   className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                >
                   <Check className="w-5 h-5" />
                   Confirmar e Iniciar Execução
                </button>
             </div>

          </div>
        )}
      </div>

      {/* QUICK ADD MODAL */}
      {showQuickAdd && (
          <div className="absolute inset-0 z-10 bg-slate-950/90 backdrop-blur-sm rounded-xl flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg w-full max-w-sm shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-bold text-lg">Cadastro Rápido</h3>
                      <button onClick={() => setShowQuickAdd(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Nome</label>
                          <input 
                              type="text" 
                              value={quickAddName}
                              onChange={e => setQuickAddName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                              autoFocus
                          />
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Telefone</label>
                          <input 
                              type="text" 
                              value={quickAddPhone}
                              onChange={e => setQuickAddPhone(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                          />
                      </div>
                      <div>
                           <label className="text-xs text-slate-500 uppercase font-bold block mb-1">Função Principal</label>
                           <span className="text-sm text-indigo-400 font-bold bg-indigo-900/20 px-2 py-1 rounded border border-indigo-500/30">
                               {quickAddRole}
                           </span>
                      </div>
                      <button 
                          onClick={handleQuickAddSubmit}
                          disabled={!quickAddName}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          <UserPlus className="w-4 h-4" /> Salvar e Usar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Agent3Planning;
