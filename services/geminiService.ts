
import { GoogleGenAI, Type } from "@google/genai";
import { PreContractData, ContractExtractionData, ContractVerificationResult, PlanningJSON } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MASTER_PROMPT_CONTEXT = `
PAPEL DA IA: Você é uma IA operacional de gestão de projetos de eventos.
Sua função não é criar, não é opinar e não é interpretar livremente.
Se qualquer informação estiver ambígua ou ausente, você deve sinalizar erro, nunca inventar.

TAXONOMIA FECHADA (NUNCA INVENTAR):
- TIPOS DE EVENTO: Casamento, Debutante, Aniversário, Evento Corporativo, Ensaio, Evento Religioso, Outro.
- TIPOS DE SERVIÇO: Fotografia, Storymaker, Vídeo.
- TIPOS DE ENTREGA: Galeria Digital, Vídeos Curtos, Reels, Stories em Tempo Real, Material Bruto, Álbum.
`;

// --- AGENT 1: PRE-CONTRACT STRUCTURE ---
export const agent1StructureData = async (rawInput: string): Promise<PreContractData> => {
  const model = "gemini-3-flash-preview";

  const schema = {
    type: Type.OBJECT,
    properties: {
      project_id: { type: Type.STRING },
      client: {
        type: Type.OBJECT,
        properties: {
          full_name: { type: Type.STRING },
          document: { type: Type.STRING },
          phone: { type: Type.STRING },
          email: { type: Type.STRING },
          address: { type: Type.STRING }
        },
        required: ["full_name", "document", "phone"]
      },
      event: {
        type: Type.OBJECT,
        properties: {
          event_type: { 
            type: Type.STRING, 
            enum: ["Casamento", "Debutante", "Aniversário", "Evento Corporativo", "Ensaio", "Evento Religioso", "Outro"] 
          },
          event_name: { type: Type.STRING },
          event_date: { type: Type.STRING },
          locations: {
            type: Type.OBJECT,
            properties: {
              ceremony: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  city: { type: Type.STRING },
                  start_time: { type: Type.STRING }
                }
              },
              reception: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  city: { type: Type.STRING }
                }
              }
            }
          }
        },
        required: ["event_type", "event_date"]
      },
      main_service: {
        type: Type.OBJECT,
        properties: {
          service_type: { type: Type.STRING, enum: ["Fotografia"] },
          coverage_start_time: { type: Type.STRING },
          coverage_end_time: { type: Type.STRING }
        },
        required: ["service_type", "coverage_start_time", "coverage_end_time"]
      },
      additional_services: {
        type: Type.OBJECT,
        properties: {
          storymaker: {
            type: Type.OBJECT,
            properties: {
              enabled: { type: Type.BOOLEAN },
              coverage_type: { type: Type.STRING }
            },
            required: ["enabled"]
          },
          video: {
            type: Type.OBJECT,
            properties: {
              enabled: { type: Type.BOOLEAN }
            },
            required: ["enabled"]
          }
        },
        required: ["storymaker", "video"]
      },
      commercial_package: {
        type: Type.OBJECT,
        properties: {
          package_name: { type: Type.STRING },
          customized: { type: Type.BOOLEAN },
          custom_notes: { type: Type.STRING }
        }
      },
      deliverables: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: { type: Type.STRING, enum: ["Galeria Digital", "Vídeos Curtos", "Reels", "Stories em Tempo Real", "Material Bruto", "Álbum"] }
          },
          delivery_deadline_days: { type: Type.NUMBER }
        },
        required: ["items", "delivery_deadline_days"]
      },
      financial: {
        type: Type.OBJECT,
        properties: {
          total_value: { type: Type.NUMBER },
          entry_value: { type: Type.NUMBER },
          remaining_value: { type: Type.NUMBER },
          remaining_due_date: { type: Type.STRING }
        },
        required: ["total_value", "entry_value"]
      },
      operational_notes: { type: Type.STRING }
    },
    required: ["project_id", "client", "event", "main_service", "financial"]
  };

  // Sanitize input to prevent prompt confusion
  const cleanInput = rawInput.replace(/"/g, "'");

  const response = await ai.models.generateContent({
    model,
    contents: `${MASTER_PROMPT_CONTEXT}
    
    MODO 1 — PRÉ-CONTRATO
    Tarefas: Estruturar dados do formulário para Schema Oficial.
    IMPORTANTE: Gere apenas o JSON. Não repita dados. Se um campo não existir, use null.
    
    Entrada: "${cleanInput}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.1,
      maxOutputTokens: 2000, 
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");
    return JSON.parse(text);
  } catch (e) {
    console.error("Agent 1 JSON Parse Error:", e);
    console.debug("Agent 1 Raw Response:", response.text);
    throw new Error("Erro ao processar resposta da IA. Dados de entrada podem estar corrompidos ou muito longos.");
  }
};

// --- AGENT 2A: CONTRACT EXTRACTION (STRICT) ---
export const agent2ExtractContract = async (contractText: string): Promise<ContractExtractionData> => {
  const model = "gemini-3-flash-preview";

  const schema = {
    type: Type.OBJECT,
    properties: {
      project_id: { type: Type.STRING },
      contract_metadata: {
        type: Type.OBJECT,
        properties: {
          contract_type: { type: Type.STRING },
          contract_date: { type: Type.STRING },
          signed: { type: Type.BOOLEAN }
        },
        required: ["signed", "contract_date"]
      },
      parties: {
        type: Type.OBJECT,
        properties: {
          contractor: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING }, document: { type: Type.STRING } },
            required: ["name", "document"]
          },
          client: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING }, document: { type: Type.STRING } },
            required: ["name"]
          }
        },
        required: ["contractor", "client"]
      },
      event: {
        type: Type.OBJECT,
        properties: {
          event_type: { type: Type.STRING },
          event_date: { type: Type.STRING },
          event_name: { type: Type.STRING },
          locations: {
            type: Type.OBJECT,
            properties: {
              ceremony: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, address: { type: Type.STRING }, city: { type: Type.STRING }, start_time: { type: Type.STRING } }
              },
              reception: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, address: { type: Type.STRING }, city: { type: Type.STRING } }
              }
            }
          }
        }
      },
      services: {
        type: Type.OBJECT,
        properties: {
          main_service: { type: Type.STRING },
          coverage_duration_hours: { type: Type.NUMBER },
          additional_services: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      },
      deliverables: {
        type: Type.OBJECT,
        properties: {
          items: { type: Type.ARRAY, items: { type: Type.STRING } },
          delivery_deadline_days: { type: Type.NUMBER },
          delivery_method: { type: Type.STRING }
        }
      },
      financial: {
        type: Type.OBJECT,
        properties: {
          total_value: { type: Type.NUMBER },
          entry_value: { type: Type.NUMBER },
          remaining_value: { type: Type.NUMBER },
          remaining_due_date: { type: Type.STRING }
        }
      },
      image_usage: {
        type: Type.OBJECT,
        properties: { authorized: { type: Type.BOOLEAN }, restrictions: { type: Type.STRING } }
      },
      cancellation_policy: {
        type: Type.OBJECT,
        properties: { entry_refundable: { type: Type.BOOLEAN }, additional_conditions: { type: Type.STRING } }
      },
      legal: {
        type: Type.OBJECT,
        properties: { jurisdiction: { type: Type.STRING } }
      },
      extraction_notes: { type: Type.STRING },
      missing_or_ambiguous_fields: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["contract_metadata", "parties", "event", "services", "financial", "missing_or_ambiguous_fields"]
  };

  const response = await ai.models.generateContent({
    model,
    contents: `${MASTER_PROMPT_CONTEXT}
    
    MODO 2A — EXTRAÇÃO DE CONTRATO
    Tarefas:
    1. Ler o texto do contrato.
    2. Extrair APENAS o que estiver explícito para o JSON oficial.
    3. Nunca inferir. Se não estiver escrito, deixe vazio ou null.
    4. Se datas ou valores estiverem ausentes, adicione o nome do campo em 'missing_or_ambiguous_fields'.
    
    TEXTO DO CONTRATO:
    "${contractText.replace(/"/g, "'")}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.0,
      thinkingConfig: { thinkingBudget: 0 }, // SPEED OPTIMIZATION
    },
  });

  try {
      return JSON.parse(response.text || "{}");
  } catch(e) {
      console.error("Agent 2A Parse Error", e);
      throw new Error("Erro na extração do contrato.");
  }
};

// --- AGENT 2B: CONTRACT VERIFICATION (COMPARISON) ---
export const agent2CompareContracts = async (
  truth: PreContractData,
  extracted: ContractExtractionData
): Promise<ContractVerificationResult> => {
  const model = "gemini-3-flash-preview";

  const schema = {
    type: Type.OBJECT,
    properties: {
      contract_verified: { type: Type.BOOLEAN },
      discrepancies: { type: Type.ARRAY, items: { type: Type.STRING } },
      notes: { type: Type.STRING },
      error: { type: Type.STRING },
      confirmed_services: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["contract_verified", "discrepancies", "notes", "confirmed_services"]
  };

  const response = await ai.models.generateContent({
    model,
    contents: `${MASTER_PROMPT_CONTEXT}
    
    MODO 2B — VERIFICAÇÃO (COMPARAÇÃO)
    Tarefas:
    1. Comparar A VERDADE (Pré-Contrato) com os DADOS EXTRAÍDOS do contrato.
    2. Se houver divergência em Data, Valor, Serviços ou Local:
       - Adicione à lista 'discrepancies' NO FORMATO: "Campo: Esperado [Valor A] | Encontrado [Valor B]"
       - Defina contract_verified = false.
    3. Ignore pequenas diferenças de formatação (ex: 14:00 vs 14h).
    4. Se tudo estiver correto, 'discrepancies' deve ser vazio.
    
    A VERDADE (Pré-Contrato):
    ${JSON.stringify(truth, null, 2)}

    EXTRAÍDO DO CONTRATO:
    ${JSON.stringify(extracted, null, 2)}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0 }, // SPEED OPTIMIZATION
    },
  });

  try {
      const result = JSON.parse(response.text || "{}");
      return { ...result, extraction_data: extracted };
  } catch(e) {
      console.error("Agent 2B Parse Error", e);
      throw new Error("Erro na comparação de contratos.");
  }
};

// --- AGENT 3: PLANNING GENERATOR (STRICT LOGIC) ---
export const agent3GeneratePlan = async (
  preContractData: PreContractData,
  verifiedData: ContractVerificationResult
): Promise<PlanningJSON> => {
  const model = "gemini-3-flash-preview";

  const schema = {
    type: Type.OBJECT,
    properties: {
      project_id: { type: Type.STRING },
      planning: {
        type: Type.OBJECT,
        properties: {
          event_type: { type: Type.STRING },
          main_service: { type: Type.STRING },
          additional_services: { type: Type.ARRAY, items: { type: Type.STRING } },
          execution_profile: { type: Type.STRING, enum: ["Evento_Social_Completo", "Evento_Social_Padrão", "Ensaio_Simples", "Corporativo", "Religioso"] },
          status: { type: Type.STRING, enum: ["Planejado"] }
        },
        required: ["execution_profile", "status"]
      },
      agenda: {
        type: Type.OBJECT,
        properties: {
          event_created: { type: Type.BOOLEAN },
          event_date: { type: Type.STRING },
          coverage_start_time: { type: Type.STRING },
          coverage_end_time: { type: Type.STRING },
          locations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["event_created", "event_date", "locations"]
      },
      checklist: {
        type: Type.OBJECT,
        properties: {
          profile_name: { type: Type.STRING },
          items: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["profile_name", "items"]
      },
      alerts: {
        type: Type.OBJECT,
        properties: {
          pre_event: { type: Type.ARRAY, items: { type: Type.STRING } },
          day_of_event: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["pre_event", "day_of_event"]
      },
      post_event: {
        type: Type.OBJECT,
        properties: {
          next_status: { type: Type.STRING, enum: ["Pós-Produção"] },
          post_event_tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["next_status", "post_event_tasks"]
      }
    },
    required: ["project_id", "planning", "agenda", "checklist", "alerts", "post_event"]
  };

  const response = await ai.models.generateContent({
    model,
    contents: `${MASTER_PROMPT_CONTEXT}
    
    MODO 3 — PLANEJAMENTO (RÍGIDO)
    
    TAREFAS:
    1. Definir o 'execution_profile' baseado na regra BINÁRIA abaixo.
    2. Gerar checklist, alertas e tarefas pós-evento estritamente baseados nas definições fornecidas.
    
    REGRAS DE PERFIL BINÁRIO (PRIORIDADE MÁXIMA):
    1. Se 'event_type' for "Evento Corporativo" --> Use Perfil "Corporativo".
    2. QUALQUER OUTRO tipo de evento (Casamento, Debutante, Aniversário, Ensaio, etc.) --> Use Perfil "Evento_Social_Completo".
    
    ITENS DE CHECKLIST (Copiar exatamente):
    - Evento_Social_Completo: Confirmar equipamentos fotográficos, Baterias carregadas, Cartões de memória formatados, Chegar ao local com antecedência mínima, Registro da cerimônia, Mini ensaio com os protagonistas, Cobertura da recepção, Backup imediato pós-evento.
    - Corporativo: Briefing alinhado, Registro institucional, Cobertura de público e ambiente, Backup pós-evento.
    
    ALERTAS:
    - Pré-evento: 48h revisão, 24h equipamentos, 2h deslocamento.
    - Dia do evento: 30min antes da cobertura, Alerta de término.
    
    DADOS DE ENTRADA:
    ${JSON.stringify(preContractData, null, 2)}
    
    DADOS VERIFICADOS:
    ${JSON.stringify(verifiedData, null, 2)}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0 }, // SPEED OPTIMIZATION
    },
  });

  try {
      return JSON.parse(response.text || "{}");
  } catch(e) {
      console.error("Agent 3 Parse Error", e);
      throw new Error("Erro na geração do plano.");
  }
};
