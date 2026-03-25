
export type EventType = 
  | 'Casamento' 
  | 'Debutante' 
  | 'Aniversário' 
  | 'Evento Corporativo' 
  | 'Ensaio' 
  | 'Evento Religioso' 
  | 'Outro';

export type ServiceType = 
  | 'Fotografia' 
  | 'Storymaker' 
  | 'Vídeo';

export type DeliverableType = 
  | 'Galeria Digital' 
  | 'Vídeos Curtos' 
  | 'Reels' 
  | 'Stories em Tempo Real' 
  | 'Material Bruto' 
  | 'Álbum';

export type ProjectStatus = 
  | 'Lead' 
  | 'Pré-Contrato' 
  | 'Em Negociação' 
  | 'Contrato Assinado' 
  | 'Planejado' 
  | 'Próximo' // Added for Dashboard logic (Yellow)
  | 'Hoje'    // Added for Dashboard logic (Red)
  | 'Em Execução' 
  | 'Pós-Produção' 
  | 'Entregue' 
  | 'Finalizado' 
  | 'Cancelado';

export type LocationType = 
  | 'Igreja' 
  | 'Salão' 
  | 'Espaço Aberto' 
  | 'Empresa' 
  | 'Residência' 
  | 'Outro';

// --- TEAM & OPS LAYER ---
export type TeamRole = 
  | 'Fotógrafo' 
  | 'Storymaker' 
  | 'Videomaker' 
  | 'Assistente';

export interface TeamMember {
  role: TeamRole;
  name: string;
  is_primary: boolean;
  added_later?: boolean; // Indicates a sub-contract or operational addition
}

export interface Professional {
  id: string;
  name: string;
  roles: TeamRole[]; // Changed to array to support multiple capabilities
  phone: string;
  email?: string;
  active: boolean;
}

// --- CLIENT CONFIRMATION LAYER (NEW) ---
export interface FinalConfirmation {
  authorized: boolean;
  confirmed_at?: string;
  divergences_notes?: string;
  checklist: {
    event_date: string;
    coverage_start_time: string;
    coverage_end_time: string;
    ceremony_location: string;
    reception_location: string;
    responsible_person_name: string;
    responsible_person_phone: string;
  };
}

// --- NESTED STRUCTURES ---

export interface ClientData {
  full_name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
}

export interface CeremonyLocation {
  name: string;
  address: string;
  city: string;
  start_time: string;
}

export interface ReceptionLocation {
  name: string;
  address: string;
  city: string;
}

export interface EventData {
  event_type: EventType;
  event_name: string;
  event_date: string;
  locations: {
    ceremony: CeremonyLocation;
    reception: ReceptionLocation;
  };
}

export interface MainService {
  service_type: 'Fotografia';
  coverage_start_time: string;
  coverage_end_time: string;
}

export interface AdditionalServices {
  storymaker: {
    enabled: boolean;
    coverage_type: string;
  };
  video: {
    enabled: boolean;
  };
}

export interface CommercialPackage {
  package_name: string;
  customized: boolean;
  custom_notes: string;
}

export interface DeliverablesData {
  items: DeliverableType[];
  delivery_deadline_days: string | number;
}

export interface FinancialData {
  total_value: number;
  entry_value: number;
  remaining_value: number;
  remaining_due_date: string;
}

// --- OFFICIAL PRE-CONTRACT JSON ---
export interface PreContractData {
  project_id: string; // AUTO_GENERATED
  client: ClientData;
  event: EventData;
  main_service: MainService;
  additional_services: AdditionalServices;
  commercial_package: CommercialPackage;
  deliverables: DeliverablesData;
  financial: FinancialData;
  operational_notes: string;
  status?: ProjectStatus;
}

// --- OFFICIAL CONTRACT EXTRACTION JSON ---
export interface ContractExtractionData {
  project_id: string;
  contract_metadata: {
    contract_type: string;
    contract_date: string;
    signed: boolean;
  };
  parties: {
    contractor: { name: string; document: string };
    client: { name: string; document: string };
  };
  event: {
    event_type: string;
    event_date: string;
    event_name: string;
    locations: {
      ceremony: { name: string; address: string; city: string; start_time: string };
      reception: { name: string; address: string; city: string };
    };
  };
  services: {
    main_service: string;
    coverage_duration_hours: number | string;
    additional_services: string[];
  };
  deliverables: {
    items: string[];
    delivery_deadline_days: number | string;
    delivery_method: string;
  };
  financial: {
    total_value: number;
    entry_value: number;
    remaining_value: number;
    remaining_due_date: string;
  };
  image_usage: { authorized: boolean; restrictions: string };
  cancellation_policy: { entry_refundable: boolean; additional_conditions: string };
  legal: { jurisdiction: string };
  extraction_notes: string;
  missing_or_ambiguous_fields: string[];
}

export interface ContractVerificationResult {
  contract_verified: boolean;
  discrepancies: string[];
  extraction_data: ContractExtractionData;
  notes: string;
  error?: string;
  confirmed_services: ServiceType[]; // Kept for compatibility with Agent 3
}

// --- OFFICIAL PLANNING JSON ---

export type ExecutionProfile =
  | 'Evento_Social_Completo'
  | 'Evento_Social_Padrão'
  | 'Ensaio_Simples'
  | 'Corporativo'
  | 'Religioso';

export interface PlanningJSON {
  project_id: string;

  planning: {
    event_type: string;
    main_service: string;
    additional_services: string[];
    execution_profile: ExecutionProfile;
    status: string; // "Planejado"
    team_assignment?: TeamMember[];
    final_confirmation?: FinalConfirmation; // Added
  };

  agenda: {
    event_created: boolean;
    event_date: string;
    coverage_start_time: string;
    coverage_end_time: string;
    locations: string[];
  };

  checklist: {
    profile_name: string;
    items: string[];
  };

  alerts: {
    pre_event: string[];
    day_of_event: string[];
  };

  post_event: {
    next_status: string; // "Pós-Produção"
    post_event_tasks: string[];
  };
}

export interface ChecklistItem {
  id: string;
  task: string;
  timeframe: string;
  completed: boolean;
  critical: boolean;
}

// --- DASHBOARD STRUCTURES ---
export interface DashboardEvent {
  id: string;
  client_name: string;
  event_name: string;
  event_type: EventType;
  date: string;
  start_time: string;
  end_time?: string;
  location_name: string;
  location_city: string;
  status: ProjectStatus;
  services: ServiceType[];
  team: TeamMember[];
  final_confirmation?: FinalConfirmation | null; // Added
  alert_level: 'none' | 'low' | 'medium' | 'high';
}

export type AgentStep = 1 | 2 | 3 | 4;
