
export interface Conversation {
  id: string;
  peer_id: string;
  owner_id: string; // ID аккаунта, которому принадлежит диалог
  name: string;
  last_message: string; 
  avatar: string;
  pinned?: boolean;
  unread_count: number;
  campaign_name?: string; // Название кампании
  campaign_type?: string; // Тип кампании (Прогрев, ОС и т.д.)
  project_id?: number; // Added for isolation
}

export interface Attachment {
  type: 'photo' | 'video' | 'doc' | 'sticker' | 'link' | 'audio_message' | 'video_message';
  url?: string;
  thumb?: string;
  title?: string;
  ext?: string;
  duration?: number; // For audio/video_message
  waveform?: number[]; // For audio
  date?: number; // Added for attachment list
}

export interface Reminder {
    id: number;
    conversation_id: string;
    remind_at: number; // timestamp
    note: string;
    created_at: number;
}

export interface ChatMessage {
  id: number;
  sender: 'me' | 'them';
  text: string;
  date: number;
  attachments?: Attachment[];
}

export interface CampaignLogEntry {
  id: number;
  campaign_id: string;
  timestamp: string;
  peer_id: string;
  status: string;
  message: string;
  project_id?: number;
}

export interface Campaign {
  log: CampaignLogEntry[];
  status: 'running' | 'finished';
}

export type Campaigns = Record<string, Campaign>;

export interface HealthStatus {
  ok: boolean;
  message: string;
}

export interface Account {
  id: number;
  project_id?: number; // Added for isolation
  vk_user_id: string;
  name: string;
  avatar: string;
  status: string; 
  access_token: string;
  group_name?: string; // Группа аккаунтов
  error_details?: string; // Детали ошибки для UI
  tags?: string[]; // Теги аккаунта
  
  // Credentials (Manual import)
  login?: string;
  password?: string;
  
  // Maintenance Settings
  cleanup_enabled?: boolean | number;
  cleanup_days?: number;

  // Auto-Accept (Secretary) Settings
  auto_accept_enabled?: boolean | number;
  auto_accept_msg?: string;
  auto_accept_delay_min?: number;
  auto_accept_delay_max?: number;
  skip_dialog_exists?: boolean | number;
  auto_accept_skip_msg?: boolean | number; // Do not send message (Just accept)
  
  // Safety
  day_limit?: number; // Дневной лимит сообщений (Default 20, 0 = Unlimited)
  messages_sent_today?: number; // Сообщений отправлено сегодня
  last_activity_at?: number; // Timestamp последней активности (для сброса)
  health_score?: number; // Здоровье токена (0-100)
  kamikaze_mode?: boolean | number; // Режим камикадзе
}

// Allow dynamic string types, but keep common ones for type hinting if needed
export type TemplateSubtype = string; 

export interface Template {
  id: number;
  project_id?: number; // Added for isolation
  name: string;
  text: string;
  campaign_name?: string; // Группировка по кампании
  subtype?: TemplateSubtype; // Тип части сообщения
}

export interface ConstructorPart {
    id: string;
    subtype: string;
}

export type CrmStatus = 'new' | 'progress' | 'hot' | 'success' | 'reject';

export interface Recipient {
  id: number;
  project_id?: number; // Added for isolation
  vk_user_id: string;
  name: string;
  avatar: string;
  profile_url: string;
  notes: string | null;
  tags?: string[]; // Теги (labels)
  status: string; 
  campaign_name?: string; // Название кампании
  campaign_type?: string; // Тип кампании
  crm_status: CrmStatus; // CRM статус (Лид, Клиент и т.д.)
}

export interface AppLogEntry {
  id: number;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
}

export interface Project {
    id: number;
    name: string;
    color: string;
    created_at?: number;
}

// === ANALYTICS TYPES ===

export interface ErrorStat {
    name: string;
    count: number;
    color: string;
}

export interface TimelinePoint {
    date: string; // DD.MM
    sent: number;
    received: number;
}

export interface HeatmapPoint {
    day: number; // 0-6 (Sun-Sat)
    hour: number; // 0-23
    value: number; // intensity
}

export interface AccountStat {
    id: number;
    name: string;
    avatar: string;
    status: string;
    conversations_count: number;
    error_rate_proxy: number; // Just a placeholder for now
}

export interface AnalyticsStats {
    available_campaigns: string[];
    
    // Level 1: Health
    success_rate_percent: number;
    error_breakdown: ErrorStat[];
    account_health: AccountStat[];

    // Level 2: Marketing / CRM
    crm_distribution: { name: string; value: number; fill: string }[];
    tech_distribution: { name: string; value: number; fill: string }[];
    timeline_data: TimelinePoint[];

    // Level 3: Ops
    heatmap_data: HeatmapPoint[];

    // Aggregates
    total_sent: number;
    total_recipients: number;
    top_campaigns: { name: string; count: number }[];
}
