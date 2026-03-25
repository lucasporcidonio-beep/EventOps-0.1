
import React, { useState, useEffect } from 'react';
import { agent2ExtractContract, agent2CompareContracts } from '../services/geminiService';
import { PreContractData, ContractVerificationResult, ContractExtractionData } from '../types';
import { Scale, Loader2, CheckCircle2, AlertTriangle, FileText, ArrowRight, Eye, ShieldAlert, X, RefreshCw, PenLine } from 'lucide-react';

interface Props {
  preContractData: PreContractData;
  onComplete: (data: ContractVerificationResult) => void;
}

// FIXED CONTRACTOR DATA (Hardcoded as requested)
const FIXED_CONTRACTOR_INFO = "LUCAS HENRIQUE NASCIMENTO PORCIDONIO, brasileiro, casado, nascido em 21/02/1991, residente e domiciliado na Rua Sérgio Siqueira, nº 59 - Bairro George Oetterer - Iperó/SP, inscrito no CPF nº 376.274.348-74 e RG nº 47.181.303-5, telefone (15) 99748-5268.";

// Helper to calculate deadlines string based on enabled services
const getDeadlinesText = (data: PreContractData) => {
  const deadlines = [];
  
  // Photography is usually main service, but check just in case
  if (data.main_service.service_type === 'Fotografia') {
      deadlines.push("Fotografia: até 15 dias úteis");
  }

  // Check additional services
  if (data.additional_services?.storymaker?.enabled) {
      deadlines.push("Stories: até 48 horas");
  }
  
  if (data.additional_services?.video?.enabled) {
      deadlines.push("Vídeo/Filme: até 30 dias úteis");
  }

  if (deadlines.length === 0) return "A definir conforme serviços contratados.";
  
  return deadlines.join("; ") + ".";
};

// Helper to generate a draft contract based on the Source of Truth (Agent 1 Data)
const generateDraftContract = (data: PreContractData) => {
  const today = new Date().toLocaleDateString('pt-BR');
  const eventType = data.event.event_type;
  const deadlines = getDeadlinesText(data);
  
  // Safe Accessors
  const cerName = data.event.locations?.ceremony?.name || 'Local a definir';
  const cerAddr = data.event.locations?.ceremony?.address || 'Endereço a definir';
  const cerTime = data.event.locations?.ceremony?.start_time || 'Horário a definir';
  const recName = data.event.locations?.reception?.name || 'Local a definir';

  // --- MODELO 3: ENSAIO ---
  if (eventType === 'Ensaio') {
    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS – ENSAIO

Pelo presente instrumento particular, as partes:

CONTRATANTE: ${data.client.full_name}, portador(a) do RG/CPF ${data.client.document}, residente em ${data.client.address || 'Endereço não informado'}.
CONTRATADO: ${FIXED_CONTRACTOR_INFO}

Têm entre si justo e contratado o seguinte:

1. Objeto do Contrato
Prestação de serviços fotográficos profissionais para ensaio fotográfico, em local, data e horário previamente acordados.

2. Serviços
Sessão fotográfica: ${data.event.event_name || 'Ensaio'};
Local: ${cerName} (${cerAddr});
Data: ${data.event.event_date} às ${data.main_service.coverage_start_time};
Edição e tratamento profissional das imagens;
Entrega das fotos em alta resolução digital, via link online.

3. Prazos de Entrega
${deadlines}

4. Valor e Pagamento
Valor total: R$ ${data.financial.total_value}
Forma de Pagamento:
Entrada de R$ ${data.financial.entry_value} no agendamento;
Saldo de R$ ${data.financial.remaining_value} a ser quitado até a data do ensaio.

5. Uso de Imagem
O(a) CONTRATANTE autoriza o uso das imagens para divulgação e portfólio profissional do fotógrafo.

6. Cancelamento
Cancelamentos com menos de 48 horas poderão implicar perda do valor pago como entrada.

7. Foro
Fica eleito o foro da comarca de Sorocaba/SP.

Data de emissão: ${today}
________________________________
${data.client.full_name}
(Contratante)
`;
  }

  // --- MODELO 2: CASAMENTO ---
  if (eventType === 'Casamento') {
    return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS – CASAMENTO

Pelo presente instrumento particular, as partes:

CONTRATANTE: ${data.client.full_name}, portador(a) do RG/CPF ${data.client.document}, residente em ${data.client.address || 'Endereço não informado'}.
CONTRATADO: ${FIXED_CONTRACTOR_INFO}

Têm entre si justo e contratado o seguinte:

1. Objeto do Contrato
Prestação de serviços fotográficos profissionais para casamento, incluindo cerimônia, recepção e, quando contratado, ensaio pré ou mini ensaio pós-cerimônia.

2. Serviços Incluídos
Evento: ${data.event.event_name || 'Casamento'};
Data: ${data.event.event_date};
Cerimônia: ${cerName} (${cerTime});
Recepção: ${recName};
Serviços Adicionais: ${data.additional_services.storymaker.enabled ? 'Storymaker (Stories em tempo real); ' : ''}${data.additional_services.video.enabled ? 'Vídeo/Filme; ' : ''}
Todas as fotos entregues editadas e em alta qualidade digital, via galeria online.

3. Prazos de Entrega
${deadlines}

4. Valor e Forma de Pagamento
Valor total: R$ ${data.financial.total_value}
Forma de Pagamento:
Entrada: R$ ${data.financial.entry_value}, para reserva da data;
Saldo de R$ ${data.financial.remaining_value}: a ser quitado até a data do evento.

5. Uso de Imagem
Os noivos autorizam o uso das imagens para fins de portfólio e divulgação profissional, respeitando a intimidade e imagem dos envolvidos.

6. Cancelamento
Cancelamentos implicam perda da entrada paga, a título de reserva de data.

7. Foro
Fica eleito o foro da comarca de Sorocaba/SP.

Data de emissão: ${today}
________________________________
${data.client.full_name}
(Contratante)
`;
  }

  // --- MODELO 1: DEBUTANTE / SOCIAL / OUTROS (Padrão) ---
  // Usado para Debutante, Aniversário, Corporativo, etc.
  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS – ${data.event.event_type.toUpperCase()}

Pelo presente instrumento particular, as partes:

CONTRATANTE: ${data.client.full_name}, portador(a) do RG/CPF ${data.client.document}, residente em ${data.client.address || 'Endereço não informado'}.
CONTRATADO: ${FIXED_CONTRACTOR_INFO}

Têm entre si justo e contratado o seguinte:

1. Objeto do Contrato
O presente contrato tem por objeto a prestação de serviços fotográficos profissionais para o evento ${data.event.event_type} (${data.event.event_name}), incluindo cobertura do evento conforme condições descritas neste instrumento.

2. Descrição dos Serviços
Os serviços contratados compreendem:
Data: ${data.event.event_date};
Local: ${cerName} / ${recName};
Horário: Início às ${data.main_service.coverage_start_time};
Cobertura fotográfica do evento (entrada, cerimonial, convidados, decoração e momentos principais);
Edição e tratamento profissional das imagens;
Entrega das fotos em alta resolução digital, por meio de galeria online ou link para download;
Serviços Extras: ${data.additional_services.storymaker.enabled ? 'Storymaker; ' : ''}${data.additional_services.video.enabled ? 'Vídeo; ' : ''}

3. Prazos de Entrega
${deadlines}

4. Valor e Forma de Pagamento
O valor total dos serviços é de R$ ${data.financial.total_value}.
Forma de pagamento:
Entrada de R$ ${data.financial.entry_value}, no ato da assinatura, como reserva de data;
Saldo restante de R$ ${data.financial.remaining_value} a ser quitado até a data do evento.
A data somente será considerada reservada após o pagamento da entrada.

5. Uso de Imagem
A CONTRATANTE autoriza o CONTRATADO a utilizar algumas das imagens produzidas no evento para portfólio, redes sociais, site e materiais de divulgação profissional.

6. Obrigações das Partes
Do CONTRATADO: Comparecer pontualmente; Executar os serviços com qualidade técnica; Cumprir os prazos.
Da CONTRATANTE: Efetuar os pagamentos conforme combinado; Garantir acesso do fotógrafo aos locais.

7. Cancelamento
Em caso de cancelamento por parte da CONTRATANTE, o valor pago como entrada não será devolvido, por se tratar de reserva de agenda.

8. Foro
Fica eleito o foro da comarca de Sorocaba/SP, com renúncia a qualquer outro.

9. Disposições Finais
O presente contrato é firmado em duas vias de igual teor.

Data de emissão: ${today}
________________________________
${data.client.full_name}
(Contratante)
`;
};

const Agent2Contract: React.FC<Props> = ({ preContractData, onComplete }) => {
  // Initialize state with the dynamic draft instead of hardcoded text
  const [contractText, setContractText] = useState(() => generateDraftContract(preContractData));
  
  const [loading, setLoading] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ContractExtractionData | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ContractVerificationResult | null>(null);
  const [step, setStep] = useState<'input' | 'extracted' | 'compared'>('input');

  // Re-generate if preContractData changes (e.g. user went back and updated Agent 1)
  useEffect(() => {
    setContractText(generateDraftContract(preContractData));
    // Reset steps if data changes
    setExtractionResult(null);
    setComparisonResult(null);
    setStep('input');
  }, [preContractData]);

  const handleExtract = async () => {
    setLoading(true);
    try {
      const extracted = await agent2ExtractContract(contractText);
      setExtractionResult(extracted);
      setStep('extracted');
    } catch (error) {
      console.error("Extraction Error:", error);
      alert("Erro na extração dos dados do contrato.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!extractionResult) return;
    setLoading(true);
    try {
      const compared = await agent2CompareContracts(preContractData, extractionResult);
      setComparisonResult(compared);
      setStep('compared');
    } catch (error) {
      console.error("Comparison Error:", error);
      alert("Erro na comparação dos dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateDraft = () => {
      if(confirm("Isso irá sobrescrever qualquer edição manual feita no texto abaixo. Continuar?")) {
          setContractText(generateDraftContract(preContractData));
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3 text-emerald-400">
            <Scale className="w-6 h-6" />
            <h2 className="text-xl font-bold tracking-tight">Agente 2: Auditoria</h2>
          </div>
          <div className="flex gap-2">
            <div className={`h-2 w-8 rounded-full ${step === 'input' ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
            <div className={`h-2 w-8 rounded-full ${step === 'extracted' ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
            <div className={`h-2 w-8 rounded-full ${step === 'compared' ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
          </div>
        </div>

        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-4 flex justify-between items-start">
                 <div>
                    <h3 className="text-xs font-bold uppercase text-indigo-400 mb-2">Minuta do Contrato</h3>
                    <p className="text-sm text-slate-400">
                        O texto abaixo foi gerado automaticamente usando o modelo de <strong>{preContractData.event.event_type}</strong> do estúdio.
                    </p>
                 </div>
                 <button 
                    onClick={handleRegenerateDraft}
                    className="p-2 text-slate-500 hover:text-emerald-400 transition-colors"
                    title="Regerar rascunho original"
                 >
                    <RefreshCw className="w-4 h-4" />
                 </button>
              </div>
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                className="w-full h-96 bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-mono leading-relaxed"
                placeholder="Cole o texto do contrato aqui..."
              />
            </div>
            <div className="flex flex-col justify-center items-center gap-4 p-8 bg-slate-800/20 rounded-lg border border-slate-800 border-dashed">
               <FileText className="w-16 h-16 text-slate-700" />
               <p className="text-center text-slate-400 text-sm max-w-xs">
                 O sistema irá ler o contrato ao lado e validar se ele respeita integralmente o acordo definido na etapa anterior.
               </p>
               <button
                  onClick={handleExtract}
                  disabled={loading}
                  className="w-full max-w-xs py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Auditar Contrato
                </button>
            </div>
          </div>
        )}

        {/* STEP 2: EXTRACTION REVIEW */}
        {step === 'extracted' && extractionResult && (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                   <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Evento Extraído</h4>
                   <p className="text-lg font-bold text-white">{extractionResult.event.event_name}</p>
                   <p className="text-sm text-slate-400">{extractionResult.event.event_date} • {extractionResult.event.locations?.reception?.city || 'Cidade a definir'}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                   <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Financeiro Extraído</h4>
                   <p className="text-lg font-bold text-emerald-400">R$ {extractionResult.financial.total_value}</p>
                   <p className="text-sm text-slate-400">Entrada: R$ {extractionResult.financial.entry_value}</p>
                </div>
             </div>

             {extractionResult.missing_or_ambiguous_fields.length > 0 && (
               <div className="bg-amber-900/20 p-4 rounded border border-amber-900/50 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-500">Campos Ambíguos ou Ausentes</h4>
                    <p className="text-xs text-amber-200/70 mt-1">
                      O Agente não encontrou os seguintes dados no texto: <br/>
                      {extractionResult.missing_or_ambiguous_fields.join(", ")}
                    </p>
                  </div>
               </div>
             )}
             
             <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button onClick={() => setStep('input')} className="text-slate-500 hover:text-white text-sm">Voltar</button>
                <button
                  onClick={handleCompare}
                  disabled={loading}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                  Comparar com A Verdade
                </button>
             </div>
          </div>
        )}

        {/* STEP 3: COMPARISON RESULT */}
        {step === 'compared' && comparisonResult && (
          <div className="space-y-6 animate-fade-in">
             <div className={`p-6 rounded-lg border flex items-center gap-4 ${comparisonResult.contract_verified ? 'bg-emerald-900/20 border-emerald-800' : 'bg-rose-900/20 border-rose-800'}`}>
                {comparisonResult.contract_verified ? (
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-12 h-12 text-rose-500" />
                )}
                <div>
                   <h3 className={`text-xl font-bold ${comparisonResult.contract_verified ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {comparisonResult.contract_verified ? 'Contrato Validado' : 'Divergências Encontradas'}
                   </h3>
                   <p className="text-slate-400 text-sm">
                      {comparisonResult.notes}
                   </p>
                </div>
             </div>

             {comparisonResult.discrepancies.length > 0 && (
                <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                   <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-bold text-rose-400 uppercase">Lista de Divergências para Correção</span>
                      <span className="text-[10px] bg-rose-500/10 text-rose-300 px-2 py-1 rounded border border-rose-500/20">Atenção Necessária</span>
                   </div>
                   <div className="p-4 space-y-3">
                      <div className="bg-rose-500/5 p-3 rounded border border-rose-500/10 mb-2">
                        <p className="text-xs text-rose-300 mb-2 font-bold flex items-center gap-2">
                           <PenLine className="w-3 h-3" /> Ação Necessária:
                        </p>
                        <p className="text-xs text-slate-400">
                            Volte ao texto do contrato e corrija os seguintes pontos para igualar ao "JSON Sagrado":
                        </p>
                      </div>
                      <ul className="space-y-2">
                        {comparisonResult.discrepancies.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300 bg-slate-900 p-2 rounded">
                                <span className="text-rose-500 mt-1"><AlertTriangle className="w-3 h-3" /></span> 
                                <span className="font-mono text-xs">{d}</span>
                            </li>
                        ))}
                      </ul>
                   </div>
                </div>
             )}

             <div className="flex justify-end pt-4 gap-3">
                {!comparisonResult.contract_verified && (
                   <button
                     onClick={() => setStep('input')}
                     className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all flex items-center gap-2 border border-slate-700"
                   >
                     <PenLine className="w-4 h-4" /> Corrigir Minuta
                   </button>
                )}
                
                <button
                  onClick={() => onComplete(comparisonResult)}
                  className={`px-8 py-3 font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg ${
                     comparisonResult.contract_verified
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20'
                  }`}
                >
                  {comparisonResult.contract_verified ? (
                     <>Avançar para Planejamento <ArrowRight className="w-4 h-4" /></>
                  ) : (
                     <>Ignorar e Continuar <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Agent2Contract;
