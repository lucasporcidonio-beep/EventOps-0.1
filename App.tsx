
import React, { useState, useEffect } from 'react';
import Agent1PreContract from './components/Agent1PreContract';
import Agent2Contract from './components/Agent2Contract';
import Agent3Planning from './components/Agent3Planning';
import Agent4Execution from './components/Agent4Execution';
import Dashboard from './components/Dashboard';
import { PreContractData, ContractVerificationResult, PlanningJSON, AgentStep, DashboardEvent, Professional, TeamRole } from './types';
import { ChevronRight, Check, ArrowLeft, LayoutGrid } from 'lucide-react';

const App: React.FC = () => {
  // Navigation State
  const [view, setView] = useState<'dashboard' | 'wizard'>('dashboard');
  
  // Wizard State
  const [step, setStep] = useState<AgentStep>(1);
  const [preContractData, setPreContractData] = useState<PreContractData | null>(null);
  const [contractData, setContractData] = useState<ContractVerificationResult | null>(null);
  const [planningData, setPlanningData] = useState<PlanningJSON | null>(null);
  
  // Force remount key
  const [wizardSessionId, setWizardSessionId] = useState(0);

  // --- GLOBAL DATA (PERSISTENT) ---
  
  // 1. Professionals State (Load from LocalStorage or Default to Empty)
  const [professionals, setProfessionals] = useState<Professional[]>(() => {
    try {
      const saved = localStorage.getItem('eventops_pros');
      if (!saved) return [];
      
      const parsed = JSON.parse(saved);
      // SANITIZATION: Ensure all pros have valid IDs and strings are strings
      if (Array.isArray(parsed)) {
          return parsed.filter(p => p && p.name).map(p => ({
              ...p,
              id: String(p.id || Date.now() + Math.random().toString()), // Force ID if missing
              roles: Array.isArray(p.roles) ? p.roles : ['Fotógrafo'] // Ensure roles array
          }));
      }
      return [];
    } catch (e) {
      console.error("Error loading professionals", e);
      return [];
    }
  });

  // 2. Events State (Load from LocalStorage or Default to Empty)
  const [events, setEvents] = useState<DashboardEvent[]>(() => {
    try {
      const saved = localStorage.getItem('eventops_events');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading events", e);
      return [];
    }
  });

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => {
    localStorage.setItem('eventops_pros', JSON.stringify(professionals));
  }, [professionals]);

  useEffect(() => {
    localStorage.setItem('eventops_events', JSON.stringify(events));
  }, [events]);


  // --- HANDLERS ---

  const handleAddProfessional = (newPro: Professional) => {
      // Ensure ID is string and unique
      const proWithId = { ...newPro, id: String(newPro.id) };
      setProfessionals(prev => [...prev, proWithId]);
  };

  const handleUpdateProfessional = (updatedPro: Professional) => {
      setProfessionals(prev => prev.map(p => String(p.id) === String(updatedPro.id) ? updatedPro : p));
  };

  const handleRemoveProfessional = (id: string) => {
      console.log("Attempting to remove ID:", id);
      setProfessionals(prev => {
          const filtered = prev.filter(p => String(p.id) !== String(id));
          console.log("New List Size:", filtered.length);
          return filtered;
      });
  };

  // Handler for Dashboard updates
  const handleUpdateEvents = (updatedEvents: DashboardEvent[]) => {
      setEvents(updatedEvents);
  };

  // Handlers
  const startNewProject = () => {
    // Reset wizard state
    setWizardSessionId(prev => prev + 1); // Force remount of children
    setStep(1);
    setPreContractData(null);
    setContractData(null);
    setPlanningData(null);
    setView('wizard');
  };

  const handleAgent1Complete = (data: PreContractData) => {
    setPreContractData(data);
    setStep(2);
  };

  const handleAgent2Complete = (data: ContractVerificationResult) => {
    setContractData(data);
    setStep(3);
  };

  const handleAgent3Complete = (data: PlanningJSON) => {
    setPlanningData(data);
    setStep(4);
    
    // Add to dashboard queue immediately as "Em Execução" (since we are jumping to step 4)
    if (preContractData) {
        const locationName = preContractData.event.locations?.ceremony?.name || preContractData.event.locations?.reception?.name || 'Local a definir';
        const locationCity = preContractData.event.locations?.ceremony?.city || preContractData.event.locations?.reception?.city || 'Cidade a definir';

        const newEvent: DashboardEvent = {
            id: data.project_id || `new-${Date.now()}`,
            client_name: preContractData.client.full_name,
            event_name: preContractData.event.event_name || data.planning.execution_profile,
            event_type: preContractData.event.event_type,
            date: preContractData.event.event_date,
            start_time: preContractData.event.locations?.ceremony?.start_time || preContractData.main_service.coverage_start_time,
            end_time: preContractData.main_service.coverage_end_time, // Important for conflict checking
            location_name: locationName,
            location_city: locationCity,
            status: 'Em Execução', 
            services: [
                'Fotografia', 
                ...(preContractData.additional_services.storymaker.enabled ? ['Storymaker' as const] : []),
                ...(preContractData.additional_services.video.enabled ? ['Vídeo' as const] : [])
            ],
            alert_level: 'none',
            team: data.planning.team_assignment || [], // Receive team from Agent 3
            final_confirmation: {
                // Since we jumped to execution, assume auto-confirmed or mark as pending
                authorized: true,
                checklist: {
                    event_date: preContractData.event.event_date,
                    coverage_start_time: preContractData.main_service.coverage_start_time,
                    coverage_end_time: preContractData.main_service.coverage_end_time,
                    ceremony_location: preContractData.event.locations?.ceremony?.name || '',
                    reception_location: preContractData.event.locations?.reception?.name || '',
                    responsible_person_name: preContractData.client.full_name,
                    responsible_person_phone: preContractData.client.phone
                }
            }
        };
        // Add if not exists
        setEvents(prev => [...prev.filter(e => e.id !== newEvent.id), newEvent]);
    }
  };

  const handleBackToDashboard = () => {
      setView('dashboard');
  };

  // --- SEED DATABASE FUNCTION ---
  const handleSeedDatabase = () => {
      const MOCK_PROS: Professional[] = [
          { id: '1', name: 'Lucas Henrique', phone: '(15) 99748-5268', roles: ['Fotógrafo', 'Videomaker'], active: true },
          { id: '2', name: 'Ana Silva', phone: '(11) 98765-4321', roles: ['Storymaker', 'Assistente'], active: true },
          { id: '3', name: 'Carlos Oliveira', phone: '(21) 91234-5678', roles: ['Videomaker', 'Fotógrafo'], active: true },
          { id: '4', name: 'Mariana Costa', phone: '(19) 95555-1234', roles: ['Fotógrafo', 'Storymaker'], active: true },
          { id: '5', name: 'Pedro Santos', phone: '(15) 97777-8888', roles: ['Assistente'], active: true },
      ];

      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);

      const fmtDate = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

      const MOCK_EVENTS: DashboardEvent[] = [
          {
              id: 'evt-1',
              client_name: 'Isabela & Gabriel',
              event_name: 'Casamento Clássico',
              event_type: 'Casamento',
              date: fmtDate(today),
              start_time: '18:00',
              end_time: '23:00',
              location_name: 'Villa Sansu',
              location_city: 'Sorocaba',
              status: 'Hoje',
              services: ['Fotografia', 'Storymaker', 'Vídeo'],
              alert_level: 'high',
              team: [
                  { role: 'Fotógrafo', name: 'Lucas Henrique', is_primary: true },
                  { role: 'Storymaker', name: 'Ana Silva', is_primary: false },
                  { role: 'Videomaker', name: 'Carlos Oliveira', is_primary: false },
                  { role: 'Assistente', name: 'Pedro Santos', is_primary: false }
              ],
              final_confirmation: { authorized: true, checklist: {} as any }
          },
          {
              id: 'evt-2',
              client_name: '15 Anos Julia',
              event_name: 'Festa Neon',
              event_type: 'Debutante',
              date: fmtDate(nextWeek),
              start_time: '20:00',
              end_time: '02:00',
              location_name: 'Chácara Santa Victória',
              location_city: 'Sorocaba',
              status: 'Próximo',
              services: ['Fotografia', 'Storymaker'],
              alert_level: 'medium',
              team: [
                  { role: 'Fotógrafo', name: 'Lucas Henrique', is_primary: true }, // Intentional conflict
                  { role: 'Storymaker', name: 'Mariana Costa', is_primary: false }
              ],
              final_confirmation: { authorized: false, checklist: {} as any } // Needs confirmation
          },
          {
              id: 'evt-3',
              client_name: 'Empresa TechSolution',
              event_name: 'Confraternização Anual',
              event_type: 'Evento Corporativo',
              date: fmtDate(nextMonth),
              start_time: '14:00',
              end_time: '18:00',
              location_name: 'Hotel Ibis',
              location_city: 'Votorantim',
              status: 'Planejado',
              services: ['Fotografia'],
              alert_level: 'low',
              team: [
                 { role: 'Fotógrafo', name: 'A Definir', is_primary: true }
              ]
          }
      ];

      setProfessionals(MOCK_PROS);
      setEvents(MOCK_EVENTS);
      alert("Base de dados populada com dados de teste com sucesso!");
  };

  // --- RESET DATABASE FUNCTION ---
  const handleResetDatabase = () => {
      if (window.confirm("⚠️ ZONA DE PERIGO ⚠️\n\nIsso apagará TODOS os dados (Eventos e Profissionais) permanentemente.\n\nDeseja continuar?")) {
          localStorage.removeItem('eventops_pros');
          localStorage.removeItem('eventops_events');
          setProfessionals([]);
          setEvents([]);
          setStep(1);
          setPreContractData(null);
          setContractData(null);
          setPlanningData(null);
          // Optional: Force a small alert so user knows it happened
          // alert("Sistema resetado."); 
      }
  };

  // Step Visualizer
  const renderStepIndicator = (num: AgentStep, label: string) => {
    const isActive = step === num;
    const isCompleted = step > num;

    return (
      <div className={`flex items-center gap-2 ${isActive ? 'text-white' : isCompleted ? 'text-indigo-400' : 'text-slate-600'}`}>
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all
          ${isActive ? 'bg-indigo-600 border-indigo-500' : isCompleted ? 'bg-slate-900 border-indigo-900' : 'bg-transparent border-slate-700'}
        `}>
          {isCompleted ? <Check className="w-4 h-4" /> : num}
        </div>
        <span className={`hidden md:block font-medium ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleBackToDashboard}>
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-rose-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              EO
            </div>
            <span className="font-bold tracking-tight text-lg">EventOps <span className="text-indigo-400">AI</span></span>
          </div>

          {view === 'wizard' ? (
              <div className="flex items-center gap-4">
                {renderStepIndicator(1, "Origem")}
                <ChevronRight className="w-4 h-4 text-slate-700 hidden md:block" />
                {renderStepIndicator(2, "Contrato")}
                <ChevronRight className="w-4 h-4 text-slate-700 hidden md:block" />
                {renderStepIndicator(3, "Planejamento")}
                <ChevronRight className="w-4 h-4 text-slate-700 hidden md:block" />
                {renderStepIndicator(4, "Execução")}
              </div>
          ) : (
             <div className="flex items-center gap-3">
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Painel de Controle</span>
                 <LayoutGrid className="w-5 h-5 text-indigo-400" />
             </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        
        {view === 'dashboard' && (
            <Dashboard 
                events={events} 
                professionals={professionals}
                onUpdateEvents={handleUpdateEvents}
                onAddProfessional={handleAddProfessional}
                onUpdateProfessional={handleUpdateProfessional}
                onRemoveProfessional={handleRemoveProfessional}
                onNewProject={startNewProject}
                onSeedDatabase={handleSeedDatabase}
                onResetDatabase={handleResetDatabase} // PASSED PROP
                onSelectEvent={(evt) => {
                    if (planningData && evt.id === planningData.project_id) {
                        setView('wizard');
                        setStep(4);
                    } else {
                        alert(`Visualização de detalhes para ${evt.client_name}`);
                    }
                }}
            />
        )}

        {view === 'wizard' && (
            <div key={wizardSessionId}> {/* FORCE REMOUNT WHEN SESSION ID CHANGES */}
                <div className="mb-6 flex items-center gap-2 text-slate-500 hover:text-white transition-colors w-fit cursor-pointer" onClick={handleBackToDashboard}>
                   <ArrowLeft className="w-4 h-4" />
                   <span className="text-sm font-bold uppercase tracking-wide">Voltar ao Dashboard</span>
                </div>

                {step === 1 && <Agent1PreContract onComplete={handleAgent1Complete} />}
                
                {step === 2 && preContractData && (
                <Agent2Contract preContractData={preContractData} onComplete={handleAgent2Complete} />
                )}
                
                {step === 3 && contractData && preContractData && (
                <Agent3Planning 
                    contractData={contractData} 
                    preContractData={preContractData} 
                    onComplete={handleAgent3Complete} 
                    professionals={professionals}
                    onAddProfessional={handleAddProfessional}
                />
                )}

                {step === 4 && planningData && preContractData && (
                <Agent4Execution plan={planningData} basicInfo={preContractData} />
                )}

                {/* Debug / JSON View for Steps 1-3 */}
                {step < 4 && (
                <div className="mt-12 border-t border-slate-800 pt-8">
                    <h4 className="text-xs font-bold uppercase text-slate-600 mb-4">Estado do Sistema (JSON Sagrado)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {preContractData && (
                        <div className="bg-slate-900/50 p-4 rounded border border-slate-800/50">
                            <span className="text-indigo-400 text-xs font-mono mb-2 block">AGENTE 1 OUTPUT</span>
                            <pre className="text-[10px] text-slate-400 overflow-auto max-h-40">{JSON.stringify(preContractData, null, 2)}</pre>
                        </div>
                    )}
                    {contractData && (
                        <div className="bg-slate-900/50 p-4 rounded border border-slate-800/50">
                            <span className="text-emerald-400 text-xs font-mono mb-2 block">AGENTE 2 OUTPUT</span>
                            <pre className="text-[10px] text-slate-400 overflow-auto max-h-40">{JSON.stringify(contractData, null, 2)}</pre>
                        </div>
                    )}
                    </div>
                </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
