
import React, { useState } from 'react';
import { agent1StructureData } from '../services/geminiService';
import { PreContractData } from '../types';
import { Bot, FileText, Loader2, Database, Sparkles, ArrowDown, Check, RefreshCw, Eraser } from 'lucide-react';

interface Props {
  onComplete: (data: PreContractData) => void;
}

const Agent1PreContract: React.FC<Props> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<PreContractData | null>(null);
  
  // Initialize with empty string to ensure no default data
  const [rawInput, setRawInput] = useState('');

  const handleProcess = async () => {
    if (!rawInput.trim()) {
      alert("Cole os dados do cliente para processar.");
      return;
    }
    setLoading(true);
    try {
      const result = await agent1StructureData(rawInput);
      setGeneratedData(result);
    } catch (error) {
      console.error("Agent 1 Error:", error);
      alert("Falha ao interpretar o texto. Verifique se o texto não é muito longo ou tente simplificá-lo.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (generatedData) {
      onComplete(generatedData);
    }
  };

  const handleEdit = () => {
    setGeneratedData(null);
  };

  if (generatedData) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
           <div className="bg-emerald-900/20 p-6 border-b border-emerald-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3 text-emerald-400">
              <Check className="w-6 h-6" />
              <div>
                 <h2 className="text-xl font-bold tracking-tight">Dados Estruturados com Sucesso</h2>
                 <p className="text-xs text-emerald-300/70 uppercase tracking-widest font-semibold">Revise antes de continuar</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
               <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Cliente</span>
                  <p className="text-white font-medium">{generatedData.client.full_name}</p>
                  <p className="text-sm text-slate-400">{generatedData.client.phone}</p>
               </div>
               <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Evento</span>
                  <p className="text-white font-medium">{generatedData.event.event_type} - {generatedData.event.event_date}</p>
                  <p className="text-sm text-slate-400">{generatedData.event.locations?.ceremony?.name || generatedData.event.locations?.reception?.name || 'Local não identificado'}</p>
               </div>
               <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Serviço Principal</span>
                  <p className="text-white font-medium">{generatedData.main_service.service_type}</p>
               </div>
               <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Financeiro</span>
                  <p className="text-emerald-400 font-medium">Total: R$ {generatedData.financial.total_value}</p>
                  <p className="text-sm text-slate-400">Entrada: R$ {generatedData.financial.entry_value}</p>
               </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleEdit}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Refazer / Editar Texto
              </button>
              <button 
                onClick={handleConfirm}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
              >
                <Check className="w-4 h-4" /> Confirmar e Avançar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="bg-slate-950/50 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 text-indigo-400">
            <Sparkles className="w-6 h-6" />
            <div>
               <h2 className="text-xl font-bold tracking-tight">Agente 1: Input Rápido</h2>
               <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Origem da Verdade</p>
            </div>
          </div>
          <Bot className="w-6 h-6 text-slate-700" />
        </div>
        
        <div className="p-6 grid gap-6">
          
          <div className="bg-indigo-900/10 border border-indigo-900/30 p-4 rounded-lg">
            <p className="text-sm text-indigo-300 flex gap-2">
              <FileText className="w-4 h-4 shrink-0 mt-0.5" />
              Basta colar os dados brutos (WhatsApp, Email, Bloco de Notas). A IA vai organizar, categorizar e criar a estrutura oficial do projeto.
            </p>
          </div>

          <div className="relative">
            <div className="flex justify-between items-center mb-2">
               <label className="block text-xs font-bold text-slate-500 uppercase">
                  Cole os dados aqui
               </label>
               {rawInput.length > 0 && (
                   <button 
                      onClick={() => setRawInput('')}
                      className="text-xs text-slate-500 hover:text-white flex items-center gap-1"
                   >
                      <Eraser className="w-3 h-3" /> Limpar
                   </button>
               )}
            </div>
            <textarea 
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="w-full h-80 bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed resize-none"
              placeholder="Ex: Nome do cliente, data, local, valores..."
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <ArrowDown className="w-5 h-5 text-slate-600 animate-bounce" />
            <button
              onClick={handleProcess}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-900/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-lg">Estruturando Dados...</span>
                </>
              ) : (
                <>
                  <Database className="w-6 h-6" />
                  <span className="text-lg">Gerar JSON Sagrado</span>
                </>
              )}
            </button>
            <p className="text-xs text-slate-600 mt-2">
              A IA preencherá automaticamente campos faltantes com "null" ou valores padrão para revisão posterior.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Agent1PreContract;
