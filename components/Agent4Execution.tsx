import React, { useState } from 'react';
import { PlanningJSON } from '../types';
import { CheckSquare, MapPin, Calendar, Clock, AlertCircle, Bookmark, Layers, ArrowRight } from 'lucide-react';

interface Props {
  plan: PlanningJSON;
  basicInfo: any; // Using basicInfo for display names if needed, though plan has most data
}

const Agent4Execution: React.FC<Props> = ({ plan, basicInfo }) => {
  // Merge main checklist and post-event tasks for a unified view, or keep separate tabs
  // For simplicity, we manage checklist state here
  const [checklistState, setChecklistState] = useState(
    plan.checklist.items.map((task, index) => ({ id: `main-${index}`, task, completed: false, type: 'main' }))
  );
  
  const [postEventState, setPostEventState] = useState(
    plan.post_event.post_event_tasks.map((task, index) => ({ id: `post-${index}`, task, completed: false, type: 'post' }))
  );

  const [activeTab, setActiveTab] = useState<'checklist' | 'post'>('checklist');

  const toggleChecklist = (id: string) => {
    setChecklistState(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const togglePostEvent = (id: string) => {
    setPostEventState(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const currentList = activeTab === 'checklist' ? checklistState : postEventState;
  const progress = Math.round((currentList.filter(i => i.completed).length / currentList.length) * 100);

  return (
    <div className="max-w-md mx-auto animate-fade-in pb-12">
      {/* Mobile-app style header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10 shadow-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
             <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
             Em Execução
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${progress === 100 ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
            {progress}%
          </span>
        </div>
        <h1 className="text-xl font-bold text-white leading-tight">{basicInfo.client.full_name}</h1>
        
        <div className="flex flex-col gap-1 mt-2">
           <div className="flex items-center gap-2 text-slate-300 text-sm">
             <MapPin className="w-3 h-3 text-indigo-400" />
             <span className="font-medium truncate">{plan.agenda.locations[0]}</span>
           </div>
        </div>

        {/* Classification Badges */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-400 border border-slate-700">
              <Layers className="w-3 h-3" />
              {plan.planning.execution_profile}
           </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 p-4">
         <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
            <Calendar className="w-5 h-5 text-indigo-400 mb-1" />
            <span className="text-xs text-slate-400">{plan.agenda.event_date}</span>
         </div>
         <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
            <Clock className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-xs text-slate-400">{plan.agenda.coverage_start_time}h</span>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 mb-4">
        <button 
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${activeTab === 'checklist' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
        >
          Checklist
        </button>
        <button 
          onClick={() => setActiveTab('post')}
          className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${activeTab === 'post' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
        >
          Pós-Evento
        </button>
      </div>

      {/* Checklist Items */}
      <div className="px-4 space-y-3">
        {activeTab === 'checklist' && (
           <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Tarefas Operacionais</h3>
        )}
        {activeTab === 'post' && (
           <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Finalização</h3>
        )}

        {currentList.map((item) => (
          <div 
            key={item.id}
            onClick={() => activeTab === 'checklist' ? toggleChecklist(item.id) : togglePostEvent(item.id)}
            className={`
              relative group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none
              ${item.completed 
                ? 'bg-slate-900/50 border-slate-800 opacity-60' 
                : 'bg-slate-800 border-slate-700 hover:border-slate-600 shadow-md'}
            `}
          >
            <div className={`mt-1 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
              ${item.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 group-hover:border-indigo-400'}
            `}>
              {item.completed && <CheckSquare className="w-4 h-4 text-white" />}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <span className={`font-medium text-sm ${item.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                  {item.task}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 mt-6">
        <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
          Observações de Campo
        </label>
        <textarea 
          className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          placeholder="Registre ocorrências ou notas para o pós-evento..."
        />
      </div>

      {activeTab === 'post' && progress === 100 && (
         <div className="p-4 pt-0">
            <button className="w-full py-4 bg-green-600 text-white font-bold rounded-lg shadow-lg shadow-green-900/20 flex items-center justify-center gap-2">
               Finalizar Projeto <ArrowRight className="w-5 h-5" />
            </button>
         </div>
      )}
    </div>
  );
};

export default Agent4Execution;