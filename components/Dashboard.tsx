
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Conversation, HealthStatus, Account, Template, Recipient, AppLogEntry, CrmStatus, Project } from '../types';
import { get, post, del } from '../apiClient';
import { LibraIcon, RobotIcon, CarIcon, TemplateIcon, UsersIcon, LogsIcon, SearchIcon, GearIcon, QuestionIcon, KeyboardIcon, DatabaseIcon, RocketIcon, RomanOneIcon, MotorcycleIcon, FolderIcon, UserGroupIcon, ArrowLeftIcon, ChartBarIcon, MegaphoneIcon, BoardIcon, PlusIcon, ClockIcon, TrashIcon } from './icons';
import { CRM_STATUS_LABELS } from './StatusBadge';

// Import modules
import { AccountsTab } from './AccountsTab';
import { CampaignTab } from './CampaignTab';
import { TemplatesTab } from './TemplatesTab';
import { LogsTab } from './LogsTab';
import { MailingDatabaseModule } from './MailingDatabaseModule';
import { SettingsTab } from './SettingsTab';
import { WelcomeTab } from './WelcomeTab';
import { RecipientsTab } from './RecipientsTab';
import { AnalyticsTab } from './AnalyticsTab';
import { HowItWorks } from './HowItWorks';
import { NotificationCenter } from './NotificationCenter';
import { ConfirmModal } from './ConfirmModal';

type Mode = 'welcome' | 'database' | 'campaign' | 'templates' | 'accounts' | 'logs' | 'settings' | 'recipients' | 'analytics';

const VK_DARK_THEME_COLORS = {
    '--color-bg-main': '#111827',
    '--color-bg-panel': '#1f2937',
    '--color-bg-subpanel': '#374151',
    '--color-bg-hover': '#4b5563',
    '--color-border': '#4b5563',
    '--color-text-main': '#f9fafb',
    '--color-text-muted': '#9ca3af',
    '--color-accent': '#3b82f6',
    '--color-accent-dark': '#2563eb',
};

const Dashboard: React.FC = () => {
  // Navigation History Stack
  const [history, setHistory] = useState<Mode[]>(() => {
      const savedMode = localStorage.getItem('last_active_mode');
      const initialMode = (savedMode as Mode) && ['welcome', 'database', 'campaign', 'templates', 'accounts', 'logs', 'settings', 'recipients', 'analytics'].includes(savedMode) 
          ? savedMode as Mode
          : 'welcome';
      return [initialMode];
  });

  const mode = history[history.length - 1];

  const setMode = (newMode: Mode) => {
      setHistory(prev => {
          if (prev[prev.length - 1] === newMode) return prev;
          const next = [...prev, newMode];
          if (next.length > 20) return next.slice(next.length - 20);
          return next;
      });
      localStorage.setItem('last_active_mode', newMode);
  };

  const goBack = () => {
      setHistory(prev => {
          if (prev.length <= 1) return prev;
          const next = prev.slice(0, -1);
          const prevMode = next[next.length - 1];
          localStorage.setItem('last_active_mode', prevMode);
          return next;
      });
  };

  const [showHelp, setShowHelp] = useState(false);

  // --- Projects State ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number>(() => {
      const saved = localStorage.getItem('last_project_id');
      return saved ? parseInt(saved, 10) : 1;
  });
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [contextMenuProject, setContextMenuProject] = useState<{ x: number, y: number, id: number } | null>(null);
  const projectContextMenuRef = useRef<HTMLDivElement>(null);

  // --- App Settings ---
  const [appSettings, setAppSettings] = useState({
      autoCollapseColumns: true,
      autoCollapseTemplates: true,
      chatLayout: 'alternating',
      disableDeleteConfirm: false 
  });

  // Server Time State
  const [serverTime, setServerTime] = useState<string>('--:--');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [appLogs, setAppLogs] = useState<AppLogEntry[]>([]);
  
  const [highlightAccountId, setHighlightAccountId] = useState<number | null>(null);
  const [highlightTemplateId, setHighlightTemplateId] = useState<number | null>(null);
  const [navToConversationId, setNavToConversationId] = useState<string | null>(null);
  const [navToCampaignName, setNavToCampaignName] = useState<string | null>(null);
  const [targetTemplateCampaign, setTargetTemplateCampaign] = useState<string | null>(null);
  const [targetStatusFilter, setTargetStatusFilter] = useState<CrmStatus | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const lastLogIdRef = useRef<number>(0);

  // === CLIENT-SIDE FIREWALL ===
  // Filter data by project_id to prevent "bleeding" if backend returns mixed data
  const refreshAll = useCallback(async () => {
    try {
        const h = await get<HealthStatus>('health-check');
        if(h.ok) {
            const [convs, accs, recs, tpls] = await Promise.all([
                get<Conversation[]>('conversations'),
                get<Account[]>('accounts'),
                get<Recipient[]>('recipients'),
                get<Template[]>('templates')
            ]);
            
            // STRICT FILTERING
            // If project_id is missing (old data), treat it as ID 1 (Main Project)
            const filterFn = (item: any) => {
                const pId = item.project_id || 1;
                return String(pId) === String(activeProjectId);
            };

            setConversations((convs || []).filter(filterFn));
            setAccounts((accs || []).filter(filterFn));
            setRecipients((recs || []).filter(filterFn));
            setTemplates((tpls || []).filter(filterFn));
        }
    } catch (e) { }
  }, [activeProjectId]);

  // MAIN DATA LOOP & INIT
  useEffect(() => {
      // 1. Theme & Settings Init
      const savedCollapse = localStorage.getItem('setting_autoCollapse');
      const savedCollapseTpl = localStorage.getItem('setting_autoCollapseTemplates');
      const savedChatLayout = localStorage.getItem('setting_chatLayout');
      const savedDisableConfirm = localStorage.getItem('setting_disableDeleteConfirm');
      
      setAppSettings(prev => ({
          ...prev,
          autoCollapseColumns: savedCollapse !== null ? savedCollapse === 'true' : true,
          autoCollapseTemplates: savedCollapseTpl !== null ? savedCollapseTpl === 'true' : true,
          chatLayout: savedChatLayout === 'linear' ? 'linear' : 'alternating',
          disableDeleteConfirm: savedDisableConfirm === 'true'
      }));

      const root = document.documentElement;
      Object.entries(VK_DARK_THEME_COLORS).forEach(([property, value]) => {
          root.style.setProperty(property, value);
      });
      document.documentElement.style.fontSize = `16px`; 

      // 2. Fetch Base Data
      fetchProjects();
      
      // 3. Trigger Refresh (Will run whenever refreshAll changes -> i.e., when activeProjectId changes)
      refreshAll();
      
  }, [refreshAll]); // <--- This dependency ensures refreshAll runs automatically when ID changes

  const fetchProjects = async () => {
      try {
          const data = await get<Project[]>('projects');
          if (data) setProjects(data);
      } catch (e) { console.error("Failed to load projects", e); }
  };

  const handleAddProject = async () => {
      if (!newProjectName.trim()) return;
      try {
          await post('projects', { name: newProjectName });
          setNewProjectName('');
          setIsAddProjectModalOpen(false);
          fetchProjects();
      } catch (e: any) { alert(e.message); }
  };

  const handleSwitchProject = (id: number) => {
      // 1. Update Storage FIRST (API Client reads this directly)
      localStorage.setItem('last_project_id', String(id));
      
      // 2. Clear visual state immediately (UX)
      setConversations([]);
      setAccounts([]);
      setRecipients([]);
      setTemplates([]);
      setAppLogs([]);
      
      // 3. Update React State -> This triggers 'refreshAll' via the useEffect dependency above
      setActiveProjectId(id);
  };

  const handleProjectContextMenu = (e: React.MouseEvent, id: number) => {
      e.preventDefault();
      setContextMenuProject({ x: e.clientX, y: e.clientY, id });
  };

  const deleteProject = async (id: number) => {
      try {
          await del(`projects/${id}`);
          if (activeProjectId === id) handleSwitchProject(1); // Default to main
          fetchProjects();
          setContextMenuProject(null);
      } catch (e: any) { alert("Не удалось удалить: " + e.message); }
  };

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (projectContextMenuRef.current && !projectContextMenuRef.current.contains(event.target as Node)) {
              setContextMenuProject(null);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Time Fetcher
  useEffect(() => {
      const fetchTime = async () => {
          try {
              const data = await get<{current_time: string}>('server-time');
              if (data && data.current_time) {
                  setServerTime(data.current_time);
              }
          } catch (e) { console.error(e); }
      };
      fetchTime();
      const t = setInterval(fetchTime, 30000); 
      return () => clearInterval(t);
  }, []);

  const updateAppSettings = (newSettings: typeof appSettings) => {
      setAppSettings(newSettings);
      localStorage.setItem('setting_autoCollapse', String(newSettings.autoCollapseColumns));
      localStorage.setItem('setting_autoCollapseTemplates', String(newSettings.autoCollapseTemplates));
      localStorage.setItem('setting_chatLayout', newSettings.chatLayout);
      localStorage.setItem('setting_disableDeleteConfirm', String(newSettings.disableDeleteConfirm));
  };

  useEffect(() => {
      const interval = setInterval(refreshAll, 5000);
      return () => clearInterval(interval);
  }, [refreshAll]);

  // Log Polling
  const pollLogs = useCallback(async () => {
      try {
          const logs = await get<AppLogEntry[]>('app-logs');
          if (logs && logs.length > 0) {
              setAppLogs(logs);
              const newest = logs[0];
              if (newest.id > lastLogIdRef.current) {
                  lastLogIdRef.current = newest.id;
              }
          }
      } catch (e) { }
  }, []);

  useEffect(() => {
      pollLogs();
      const interval = setInterval(pollLogs, 2000);
      return () => clearInterval(interval);
  }, [pollLogs]);

  // SEARCH LOGIC
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
              setShowSearchResults(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Collect all unique campaign names for search
  const allCampaignNames = useMemo(() => {
      const set = new Set<string>();
      templates.forEach(t => set.add(t.campaign_name || 'Общее'));
      conversations.forEach(c => {
          if (c.campaign_name) {
              c.campaign_name.split('|').forEach(part => {
                  const clean = part.trim();
                  if (clean && clean !== '📥 Прямые сообщения' && clean !== '🗄️ Прошлые кампании') set.add(clean);
              });
          }
      });
      recipients.forEach(r => {
          if (r.campaign_name && r.campaign_name !== 'Manual' && r.campaign_name !== '📥 Прямые сообщения') {
              set.add(r.campaign_name);
          }
      });
      return Array.from(set).sort();
  }, [templates, conversations, recipients]);

  const searchResults = useMemo(() => {
      if (!searchTerm.trim()) return null;
      const lower = searchTerm.toLowerCase();
      
      const foundRecipients = recipients.filter(r => 
          r.name.toLowerCase().includes(lower) || 
          String(r.vk_user_id).includes(lower) ||
          (r.notes && r.notes.toLowerCase().includes(lower))
      ).slice(0, 5);

      const foundAccounts = accounts.filter(a => 
          a.name.toLowerCase().includes(lower) || 
          String(a.vk_user_id).includes(lower)
      ).slice(0, 3);

      const foundConversations = conversations.filter(c => 
          c.name.toLowerCase().includes(lower) ||
          (c.last_message && c.last_message.toLowerCase().includes(lower))
      ).slice(0, 5);

      const foundTemplates = templates.filter(t => 
          t.name.toLowerCase().includes(lower) ||
          (t.campaign_name && t.campaign_name.toLowerCase().includes(lower))
      ).slice(0, 3);

      const foundCampaigns = allCampaignNames.filter(c => 
          c.toLowerCase().includes(lower)
      ).slice(0, 3);

      if (foundRecipients.length === 0 && foundAccounts.length === 0 && foundConversations.length === 0 && foundTemplates.length === 0 && foundCampaigns.length === 0) {
          return null;
      }

      return { foundRecipients, foundAccounts, foundConversations, foundTemplates, foundCampaigns };
  }, [searchTerm, recipients, accounts, conversations, templates, allCampaignNames]);

  // Navigation Helpers
  const handleGoToAccount = (id: number) => {
      setMode('accounts');
      setHighlightAccountId(id);
      setTimeout(() => setHighlightAccountId(null), 3000);
      setSearchTerm('');
      setShowSearchResults(false);
  };

  const handleGoToChat = (vk_id: string) => {
      const conv = conversations.find(c => c.peer_id === String(vk_id));
      if (conv) {
          setMode('database');
          setNavToConversationId(conv.id);
          setNavToCampaignName(null); // Clear campaign nav
          setTimeout(() => setNavToConversationId(null), 500);
      } else {
          setMode('database');
      }
      setSearchTerm('');
      setShowSearchResults(false);
  };

  const handleGoToDatabaseCampaign = (campaignName: string) => {
      setMode('database');
      setNavToCampaignName(campaignName);
      setNavToConversationId(null); // Clear specific chat nav
      setTimeout(() => setNavToCampaignName(null), 500);
      setSearchTerm('');
      setShowSearchResults(false);
  };

  const handleGoToClient = (vk_id: string) => {
      setMode('recipients');
      setSearchTerm('');
      setShowSearchResults(false);
  };

  const handleGoToTemplate = (campaignName: string) => {
      handleJumpToTemplates(campaignName || 'Общее');
      setSearchTerm('');
      setShowSearchResults(false);
  };

  const handleJumpToTemplates = (campaignName: string) => {
      setTargetTemplateCampaign(campaignName);
      setMode('templates');
      setTimeout(() => setTargetTemplateCampaign(null), 500);
  };

  const handleNotificationNavigate = (modeName: 'accounts' | 'database' | 'logs', id?: string | number) => {
      if (modeName === 'accounts' && typeof id === 'number') {
          handleGoToAccount(id);
      } else if (modeName === 'database') {
          if (typeof id === 'string') {
              if (id.startsWith('CAMPAIGN:')) {
                  const cName = id.replace('CAMPAIGN:', '');
                  handleGoToDatabaseCampaign(cName);
              } else {
                  setMode('database');
                  setNavToConversationId(id);
                  setNavToCampaignName(null);
                  setTimeout(() => setNavToConversationId(null), 500);
              }
          } else {
              setMode('database');
          }
      } else if (modeName === 'logs') {
          setMode('logs');
      }
  };

  return (
    <div className="h-screen w-screen bg-main text-text-main flex font-sans overflow-hidden selection:bg-vk-blue selection:text-white transition-colors duration-300">
      
      {/* 1. PROJECT BAR (Far Left) */}
      <aside className="w-[72px] bg-[#0f1218] border-r border-white/5 flex flex-col items-center py-4 gap-3 z-50 flex-shrink-0 shadow-2xl relative">
          <button 
                onClick={() => setMode('welcome')}
                className="w-12 h-12 bg-gradient-to-br from-vk-blue to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform transition hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden group mb-2"
                title="Главная"
          >
                 <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                 <RomanOneIcon className="w-7 h-7 text-white drop-shadow-md relative z-10" />
          </button>

          <div className="w-10 h-[2px] bg-white/10 rounded-full mb-1"></div>

          {/* Project List */}
          <div className="flex-1 w-full flex flex-col items-center gap-3 overflow-y-auto custom-scrollbar no-scrollbar px-1">
              {projects.map(p => {
                  const isActive = activeProjectId === p.id;
                  return (
                      <div key={p.id} className="relative group w-full flex justify-center">
                          {/* Active Indicator */}
                          {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>}
                          
                          <button
                              onClick={() => handleSwitchProject(p.id)}
                              onContextMenu={(e) => handleProjectContextMenu(e, p.id)}
                              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-200 border-2 relative overflow-hidden
                                ${isActive ? 'border-vk-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] bg-white/10' : 'border-transparent text-text-muted hover:text-white bg-[#1e232e] hover:rounded-2xl hover:bg-vk-blue/20'}`}
                              style={{ color: isActive ? 'white' : p.color }}
                          >
                              {p.name.substring(0, 1).toUpperCase()}
                          </button>
                          
                          {/* Tooltip */}
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-black text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-lg border border-white/10">
                              {p.name}
                          </div>
                      </div>
                  );
              })}
              
              <button 
                  onClick={() => setIsAddProjectModalOpen(true)}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1e232e] text-green-500 hover:bg-green-500 hover:text-white transition-all hover:rounded-2xl mt-1 border border-dashed border-white/10 hover:border-transparent group"
                  title="Добавить проект"
              >
                  <PlusIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
          </div>
      </aside>

      {/* 2. MODULE SIDEBAR (Tools) */}
      <aside className="w-20 bg-main border-r border-border-main flex flex-col items-center z-40 flex-shrink-0 shadow-lg">
          <div className="py-6 flex justify-center w-full border-b border-border-main mb-2">
              {/* Context Label (optional) */}
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted rotate-180" style={{ writingMode: 'vertical-rl' }}>Меню</span>
          </div>
          
          <div className="flex-1 w-full space-y-2 overflow-y-auto custom-scrollbar">
              <button onClick={() => setMode('database')} className={`w-full flex flex-col items-center justify-center py-4 px-1 gap-1 transition-all duration-200 group relative ${mode === 'database' ? 'text-text-main' : 'text-text-muted hover:text-text-main hover:bg-hover'}`}>
                  <div className={`w-1 h-full absolute left-0 top-0 bg-vk-blue transition-opacity ${mode === 'database' ? 'opacity-100' : 'opacity-0'}`}></div>
                  <RobotIcon className={`w-6 h-6 mb-1 ${mode === 'database' ? 'fill-current text-vk-blue drop-shadow-[0_0_5px_var(--color-accent)]' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${mode === 'database' ? 'text-vk-blue' : ''}`}>База</span>
              </button>
              <button onClick={() => setMode('campaign')} className={`w-full flex flex-col items-center justify-center py-4 px-1 gap-1 transition-all duration-200 group relative ${mode === 'campaign' ? 'text-text-main' : 'text-text-muted hover:text-text-main hover:bg-hover'}`}>
                  <div className={`w-1 h-full absolute left-0 top-0 bg-vk-blue transition-opacity ${mode === 'campaign' ? 'opacity-100' : 'opacity-0'}`}></div>
                  <MegaphoneIcon className={`w-6 h-6 mb-1 ${mode === 'campaign' ? 'fill-current text-vk-blue drop-shadow-[0_0_5px_var(--color-accent)]' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${mode === 'campaign' ? 'text-vk-blue' : ''}`}>Запуск</span>
              </button>
              <button onClick={() => setMode('templates')} className={`w-full flex flex-col items-center justify-center py-4 px-1 gap-1 transition-all duration-200 group relative ${mode === 'templates' ? 'text-text-main' : 'text-text-muted hover:text-text-main hover:bg-hover'}`}>
                  <div className={`w-1 h-full absolute left-0 top-0 bg-vk-blue transition-opacity ${mode === 'templates' ? 'opacity-100' : 'opacity-0'}`}></div>
                  <TemplateIcon className={`w-6 h-6 mb-1 ${mode === 'templates' ? 'fill-current text-vk-blue drop-shadow-[0_0_5px_var(--color-accent)]' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${mode === 'templates' ? 'text-vk-blue' : ''}`}>Шаблоны</span>
              </button>
              <button onClick={() => setMode('accounts')} className={`w-full flex flex-col items-center justify-center py-4 px-1 gap-1 transition-all duration-200 group relative ${mode === 'accounts' ? 'text-text-main' : 'text-text-muted hover:text-text-main hover:bg-hover'}`}>
                  <div className={`w-1 h-full absolute left-0 top-0 bg-vk-blue transition-opacity ${mode === 'accounts' ? 'opacity-100' : 'opacity-0'}`}></div>
                  <UsersIcon className={`w-6 h-6 mb-1 ${mode === 'accounts' ? 'fill-current text-vk-blue drop-shadow-[0_0_5px_var(--color-accent)]' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${mode === 'accounts' ? 'text-vk-blue' : ''}`}>Аккаунты</span>
              </button>
              <div className="border-t border-border-main my-2 mx-2"></div>
              <button onClick={() => setMode('recipients')} className={`w-full flex flex-col items-center justify-center py-4 px-1 gap-1 transition-all duration-200 group relative ${mode === 'recipients' ? 'text-text-main' : 'text-text-muted hover:text-text-main hover:bg-hover'}`}>
                  <div className={`w-1 h-full absolute left-0 top-0 bg-vk-blue transition-opacity ${mode === 'recipients' ? 'opacity-100' : 'opacity-0'}`}></div>
                  <UserGroupIcon className={`w-6 h-6 mb-1 ${mode === 'recipients' ? 'fill-current text-vk-blue drop-shadow-[0_0_5px_var(--color-accent)]' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${mode === 'recipients' ? 'text-vk-blue' : ''}`}>Клиенты</span>
              </button>
              <button onClick={() => setMode('analytics')} className={`w-full flex flex-col items-center justify-center py-4 px-1 gap-1 transition-all duration-200 group relative ${mode === 'analytics' ? 'text-text-main' : 'text-text-muted hover:text-text-main hover:bg-hover'}`}>
                  <div className={`w-1 h-full absolute left-0 top-0 bg-vk-blue transition-opacity ${mode === 'analytics' ? 'opacity-100' : 'opacity-0'}`}></div>
                  <ChartBarIcon className={`w-6 h-6 mb-1 ${mode === 'analytics' ? 'fill-current text-vk-blue drop-shadow-[0_0_5px_var(--color-accent)]' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${mode === 'analytics' ? 'text-vk-blue' : ''}`}>Аналитика</span>
              </button>
          </div>

          <div className="w-full mt-auto border-t border-border-main pt-2">
             <button 
                onClick={() => setShowHelp(true)}
                className="w-full flex flex-col items-center justify-center py-4 px-1 gap-1 text-text-muted hover:text-text-main hover:bg-hover transition-all"
             >
                 <QuestionIcon className="w-6 h-6 mb-1" />
                 <span className="text-[10px] font-medium uppercase tracking-wider">Помощь</span>
             </button>
             <button onClick={() => setMode('logs')} className={`w-full flex flex-col items-center justify-center py-4 px-1 gap-1 transition-all duration-200 group relative ${mode === 'logs' ? 'text-text-main' : 'text-text-muted hover:text-text-main hover:bg-hover'}`}>
                  <div className={`w-1 h-full absolute left-0 top-0 bg-vk-blue transition-opacity ${mode === 'logs' ? 'opacity-100' : 'opacity-0'}`}></div>
                  <LogsIcon className={`w-6 h-6 mb-1 ${mode === 'logs' ? 'fill-current text-vk-blue drop-shadow-[0_0_5px_var(--color-accent)]' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${mode === 'logs' ? 'text-vk-blue' : ''}`}>Логи</span>
              </button>
             <button onClick={() => setMode('settings')} className={`w-full flex flex-col items-center justify-center py-4 px-1 gap-1 transition-all duration-200 group relative ${mode === 'settings' ? 'text-text-main' : 'text-text-muted hover:text-text-main hover:bg-hover'}`}>
                  <div className={`w-1 h-full absolute left-0 top-0 bg-vk-blue transition-opacity ${mode === 'settings' ? 'opacity-100' : 'opacity-0'}`}></div>
                  <GearIcon className={`w-6 h-6 mb-1 ${mode === 'settings' ? 'fill-current text-vk-blue drop-shadow-[0_0_5px_var(--color-accent)]' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${mode === 'settings' ? 'text-vk-blue' : ''}`}>Настройки</span>
              </button>
          </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 h-full overflow-hidden bg-main relative flex flex-col">
        {/* HEADER */}
        <div className="bg-panel border-b border-border-main px-4 py-3 relative z-40 shadow-sm flex-shrink-0 flex items-center gap-4">
             <div className="flex-none w-24">
                 {history.length > 1 && (
                     <button onClick={goBack} className="flex items-center gap-2 text-text-muted hover:text-text-main bg-subpanel/50 hover:bg-hover px-3 py-1.5 rounded-lg transition-all border border-transparent hover:border-border-main text-xs font-bold uppercase tracking-wider animate-fade-in"><ArrowLeftIcon className="w-4 h-4" /> Назад</button>
                 )}
             </div>
             
             {/* SEARCH BAR */}
             <div className="max-w-2xl w-full mx-auto relative" ref={searchRef}>
                <div className="flex items-center bg-subpanel border border-border-main rounded-lg px-3 focus-within:border-vk-blue focus-within:ring-1 focus-within:ring-vk-blue/50 transition-all shadow-inner">
                    <SearchIcon className="w-5 h-5 text-text-muted" />
                    <input 
                        type="text" 
                        className="bg-transparent border-none outline-none text-sm p-2.5 w-full text-text-main placeholder-text-muted" 
                        placeholder="Поиск диалогов, клиентов, аккаунтов..." 
                        value={searchTerm} 
                        onChange={(e) => { setSearchTerm(e.target.value); setShowSearchResults(true); }} 
                        onFocus={() => { if(searchTerm) setShowSearchResults(true); }} 
                    />
                    {searchTerm && (<button onClick={() => { setSearchTerm(''); setShowSearchResults(false); }} className="text-text-muted hover:text-text-main px-2">✕</button>)}
                </div>

                {/* SEARCH DROPDOWN */}
                {showSearchResults && searchResults && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-panel border border-border-main rounded-xl shadow-2xl z-[100] max-h-[60vh] overflow-y-auto custom-scrollbar animate-fade-in">
                        {/* Search results logic remains unchanged */}
                        {/* Campaigns */}
                        {searchResults.foundCampaigns.length > 0 && (
                            <div className="p-2 border-b border-border-main">
                                <div className="text-[10px] font-bold text-text-muted uppercase px-2 mb-1">Кампании (Перейти в Базу)</div>
                                {searchResults.foundCampaigns.map(c => (
                                    <div key={c} onClick={() => handleGoToDatabaseCampaign(c)} className="flex items-center gap-3 p-2 hover:bg-hover rounded-lg cursor-pointer group">
                                        <div className="w-8 h-8 rounded-lg bg-subpanel flex items-center justify-center text-text-muted"><FolderIcon className="w-4 h-4" /></div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-sm font-bold text-text-main truncate group-hover:text-vk-blue">{c}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Recipients */}
                        {searchResults.foundRecipients.length > 0 && (
                            <div className="p-2">
                                <div className="text-[10px] font-bold text-text-muted uppercase px-2 mb-1">Клиенты</div>
                                {searchResults.foundRecipients.map(r => (
                                    <div key={r.id} onClick={() => handleGoToClient(r.vk_user_id)} className="flex items-center gap-3 p-2 hover:bg-hover rounded-lg cursor-pointer group">
                                        <img src={r.avatar || 'https://vk.com/images/camera_200.png'} className="w-8 h-8 rounded-full" alt="" />
                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-sm font-bold text-text-main truncate group-hover:text-vk-blue">{r.name}</div>
                                            <div className="text-[10px] text-text-muted truncate">{r.notes || r.vk_user_id}</div>
                                        </div>
                                        <div className="text-[10px] bg-subpanel px-2 rounded">{r.campaign_name || 'Direct'}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Conversations */}
                        {searchResults.foundConversations.length > 0 && (
                            <div className="p-2 border-t border-border-main">
                                <div className="text-[10px] font-bold text-text-muted uppercase px-2 mb-1">Диалоги</div>
                                {searchResults.foundConversations.map(c => (
                                    <div key={c.id} onClick={() => handleGoToChat(c.peer_id)} className="flex items-center gap-3 p-2 hover:bg-hover rounded-lg cursor-pointer group">
                                        <img src={c.avatar || 'https://vk.com/images/camera_200.png'} className="w-8 h-8 rounded-full" alt="" />
                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-sm font-bold text-text-main truncate group-hover:text-vk-blue">{c.name}</div>
                                            <div className="text-[10px] text-text-muted truncate">{c.last_message}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Accounts */}
                        {searchResults.foundAccounts.length > 0 && (
                            <div className="p-2 border-t border-border-main">
                                <div className="text-[10px] font-bold text-text-muted uppercase px-2 mb-1">Аккаунты</div>
                                {searchResults.foundAccounts.map(a => (
                                    <div key={a.id} onClick={() => handleGoToAccount(a.id)} className="flex items-center gap-3 p-2 hover:bg-hover rounded-lg cursor-pointer group">
                                        <img src={a.avatar} className="w-8 h-8 rounded-full" alt="" />
                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-sm font-bold text-text-main truncate group-hover:text-vk-blue">{a.name}</div>
                                            <div className="text-[10px] text-text-muted font-mono">{a.vk_user_id}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Templates */}
                        {searchResults.foundTemplates.length > 0 && (
                            <div className="p-2 border-t border-border-main">
                                <div className="text-[10px] font-bold text-text-muted uppercase px-2 mb-1">Шаблоны</div>
                                {searchResults.foundTemplates.map(t => (
                                    <div key={t.id} onClick={() => handleGoToTemplate(t.campaign_name || '')} className="flex items-center gap-3 p-2 hover:bg-hover rounded-lg cursor-pointer group">
                                        <div className="w-8 h-8 rounded-lg bg-subpanel flex items-center justify-center text-text-muted"><TemplateIcon className="w-4 h-4" /></div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-sm font-bold text-text-main truncate group-hover:text-vk-blue">{t.name}</div>
                                            <div className="text-[10px] text-text-muted truncate">{t.campaign_name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!searchResults.foundRecipients.length && !searchResults.foundConversations.length && !searchResults.foundAccounts.length && !searchResults.foundTemplates.length && !searchResults.foundCampaigns.length && (
                            <div className="p-6 text-center text-text-muted text-sm italic">
                                Ничего не найдено
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* HEADER RIGHT SIDE */}
            <div className="flex-none flex items-center justify-end gap-3 min-w-[120px]">
                
                {/* SERVER CLOCK (Windows Format 00:00) */}
                <div className="hidden md:flex items-center gap-2 bg-subpanel/50 border border-border-main rounded-xl px-3 py-2 h-[42px] shadow-sm select-none">
                    <ClockIcon className="w-4 h-4 text-vk-blue" />
                    <span className="font-mono font-bold text-sm text-text-main">{serverTime}</span>
                </div>

                {/* NOTIFICATION CENTER */}
                <NotificationCenter 
                    accounts={accounts} 
                    conversations={conversations} 
                    logs={appLogs} 
                    onNavigate={handleNotificationNavigate} 
                />
            </div>
        </div>

        {/* MODULES */}
        <div className="flex-1 overflow-hidden relative bg-main">
            
            {mode === 'welcome' && <WelcomeTab onNavigate={setMode} />}

            <div className={`w-full h-full ${mode === 'database' ? 'block' : 'hidden'}`}>
                 <MailingDatabaseModule 
                    conversations={conversations} 
                    accounts={accounts} 
                    recipients={recipients}
                    templates={templates}
                    refreshAll={refreshAll}
                    externalConversationId={navToConversationId} 
                    externalCampaignName={navToCampaignName}
                    onGoToAccount={handleGoToAccount}
                    autoCollapseColumns={appSettings.autoCollapseColumns}
                    chatLayout={appSettings.chatLayout}
                 />
            </div>

            <div className={`w-full h-full ${mode === 'campaign' ? 'block' : 'hidden'}`}>
                <CampaignTab 
                    templates={templates} 
                    accounts={accounts} 
                    recipients={recipients}
                    conversations={conversations} 
                    refreshAll={refreshAll} 
                    onJumpToTemplates={handleJumpToTemplates}
                    onGoToChat={handleGoToChat}
                    onGoToAccount={handleGoToAccount}
                    appLogs={appLogs} 
                />
            </div>

            <div className={`w-full h-full ${mode === 'templates' ? 'block' : 'hidden'}`}>
                <TemplatesTab 
                    templates={templates} 
                    refreshAll={refreshAll} 
                    highlightId={highlightTemplateId}
                    autoCollapseColumns={appSettings.autoCollapseTemplates}
                    targetCampaign={targetTemplateCampaign}
                    disableDeleteConfirm={appSettings.disableDeleteConfirm}
                />
            </div>

            <div className={`w-full h-full ${mode === 'accounts' ? 'block' : 'hidden'}`}>
                <AccountsTab 
                    accounts={accounts} 
                    refreshAll={refreshAll} 
                    highlightId={highlightAccountId}
                    disableDeleteConfirm={appSettings.disableDeleteConfirm}
                    onGoToChat={handleGoToChat}
                />
            </div>

            <div className={`w-full h-full ${mode === 'recipients' ? 'block' : 'hidden'}`}>
                <RecipientsTab 
                    recipients={recipients} 
                    refreshAll={refreshAll} 
                    onGoToChat={handleGoToChat}
                    disableDeleteConfirm={appSettings.disableDeleteConfirm}
                    initialStatusFilter={targetStatusFilter}
                />
            </div>

            <div className={`w-full h-full ${mode === 'analytics' ? 'block' : 'hidden'}`}>
                <AnalyticsTab isActive={mode === 'analytics'} />
            </div>

            <div className={`w-full h-full ${mode === 'logs' ? 'block' : 'hidden'}`}>
                <LogsTab logs={appLogs} />
            </div>

            <div className={`w-full h-full ${mode === 'settings' ? 'block' : 'hidden'}`}>
                <SettingsTab settings={appSettings} onUpdateSettings={updateAppSettings} />
            </div>
        </div>

        {/* HELP MODAL */}
        {showHelp && <HowItWorks onClose={() => setShowHelp(false)} />}

        {/* CREATE PROJECT MODAL */}
        <ConfirmModal
            isOpen={isAddProjectModalOpen}
            onClose={() => setIsAddProjectModalOpen(false)}
            onConfirm={handleAddProject}
            title="Новый проект"
            message=""
        >
            <input 
                autoFocus
                placeholder="Название проекта..."
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter') handleAddProject(); }}
                className="w-full bg-subpanel border border-border-main rounded-lg px-4 py-3 text-text-main outline-none focus:border-vk-blue mb-2"
            />
        </ConfirmModal>

        {/* PROJECT CONTEXT MENU */}
        {contextMenuProject && (
            <div 
                ref={projectContextMenuRef}
                className="fixed z-[9999] bg-panel border border-border-main rounded-xl shadow-2xl py-1 w-48 overflow-hidden animate-fade-in"
                style={{ left: contextMenuProject.x, top: contextMenuProject.y }}
            >
                <button 
                    onClick={() => deleteProject(contextMenuProject.id)}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                >
                    <TrashIcon className="w-4 h-4" /> Удалить проект
                </button>
            </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
