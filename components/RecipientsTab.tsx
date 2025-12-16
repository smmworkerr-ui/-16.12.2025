
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Recipient, CrmStatus } from '../types';
import { post, del, get } from '../apiClient'; 
import { RefreshIcon, SearchIcon, PlusIcon, BoardIcon, UserGroupIcon, DocumentIcon, FileCsvIcon, FileJsonIcon, ListBulletIcon, Squares2x2Icon, VkIcon, TrashIcon, SendIcon, BarsArrowDownIcon } from './icons'; 
import { ConfirmModal } from './ConfirmModal';
import { StatusBadge, CRM_STATUS_LABELS, CRM_STATUS_COLORS } from './StatusBadge';
import { ClientCard } from './ClientCard';
import { ClientDetailsDrawer } from './ClientDetailsDrawer';
import { KanbanBoard } from './KanbanBoard';
import { API_BASE_URL } from '../config';

interface RecipientsTabProps {
    recipients: Recipient[];
    refreshAll: () => void;
    onGoToChat: (vk_id: string) => void;
    disableDeleteConfirm?: boolean;
    initialStatusFilter?: CrmStatus | null;
}

const DIRECT_MSG_LABEL = "📥 Прямые сообщения";

type SortKey = 'name' | 'status' | 'campaign' | 'id';
type SortDirection = 'asc' | 'desc';

export const RecipientsTab: React.FC<RecipientsTabProps> = ({ 
    recipients, 
    refreshAll, 
    onGoToChat,
    disableDeleteConfirm = false,
    initialStatusFilter
}) => {
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [listLayout, setListLayout] = useState<'table' | 'grid'>('table');
    const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
    const [newRecipientIdentifier, setNewRecipientIdentifier] = useState('');
    const [statusFilter, setStatusFilter] = useState<CrmStatus | 'all'>('all');
    const [campaignFilter, setCampaignFilter] = useState<string | 'all'>('all');
    
    // TAG FILTER
    const [tagFilter, setTagFilter] = useState<string>('all');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [recipientToDelete, setRecipientToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (initialStatusFilter) {
            setViewMode('list');
            setStatusFilter(initialStatusFilter);
        }
    }, [initialStatusFilter]);

    // Calculate all available tags
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        recipients.forEach(r => {
            if (r.tags) {
                r.tags.forEach(t => tags.add(t));
            }
        });
        return Array.from(tags).sort();
    }, [recipients]);

    const handleAddRecipient = async () => {
        try {
            await post('recipients', { identifier: newRecipientIdentifier });
            setNewRecipientIdentifier('');
            setShowAddRecipientModal(false);
            refreshAll();
        } catch (e: any) { alert(e.message); }
    };

    const handleExport = (format: 'csv' | 'json') => {
        window.open(`${API_BASE_URL}/export-recipients?format=${format}`, '_blank');
        setShowExportMenu(false);
    };

    const requestDeleteRecipient = (e: React.MouseEvent, id: number) => {
        e.stopPropagation(); 
        if (disableDeleteConfirm) {
            executeDelete(id);
        } else {
            setRecipientToDelete(id);
            setDeleteModalOpen(true);
        }
    };

    const executeDelete = async (id: number) => {
        setIsDeleting(true);
        try {
            await del(`recipients/${id}`);
            refreshAll();
            setDeleteModalOpen(false);
            setRecipientToDelete(null);
            if (selectedRecipient?.id === id) setSelectedRecipient(null);
        } catch (error: any) { 
             alert("Ошибка удаления: " + error.message); 
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSort = (key: SortKey) => {
        setSortConfig(current => {
            if (current && current.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const campaigns = useMemo(() => {
        const unique = new Set(recipients.map(r => {
            if (!r.campaign_name || r.campaign_name === 'Manual' || r.campaign_name === 'Ручное добавление' || !r.campaign_name.trim()) {
                return DIRECT_MSG_LABEL;
            }
            return r.campaign_name;
        }));
        const arr = Array.from(unique).sort();
        if (arr.includes(DIRECT_MSG_LABEL)) {
            return [DIRECT_MSG_LABEL, ...arr.filter(c => c !== DIRECT_MSG_LABEL)];
        }
        return arr;
    }, [recipients]);

    const filteredRecipients = useMemo(() => {
        let result = recipients.filter(r => {
            if (statusFilter !== 'all') {
                const rStatus = r.crm_status || 'new';
                if (rStatus !== statusFilter) return false;
            }
            if (campaignFilter !== 'all') {
                const rCamp = (!r.campaign_name || r.campaign_name === 'Manual' || r.campaign_name === 'Ручное добавление') ? DIRECT_MSG_LABEL : r.campaign_name;
                if (rCamp !== campaignFilter) return false;
            }
            if (tagFilter !== 'all') {
                if (!r.tags || !r.tags.includes(tagFilter)) return false;
            }
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (!r.name.toLowerCase().includes(term) && !String(r.vk_user_id).includes(term) && !(r.notes && r.notes.toLowerCase().includes(term))) return false;
            }
            return true;
        });

        if (sortConfig) {
            result.sort((a, b) => {
                if (sortConfig.key === 'status') {
                    const statusA = a.crm_status || 'new';
                    const statusB = b.crm_status || 'new';
                    if (statusA < statusB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (statusA > statusB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }
                let valA: any = a[sortConfig.key as keyof Recipient];
                let valB: any = b[sortConfig.key as keyof Recipient];
                
                if (sortConfig.key === 'campaign') {
                    valA = a.campaign_name || '';
                    valB = b.campaign_name || '';
                }

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            result.sort((a, b) => b.id - a.id);
        }

        return result;
    }, [recipients, statusFilter, campaignFilter, tagFilter, searchTerm, sortConfig]);

    const getStatusColor = (status: CrmStatus) => {
        const classes = CRM_STATUS_COLORS[status] || CRM_STATUS_COLORS['new'];
        if (classes.includes('bg-red')) return 'bg-red-500';
        if (classes.includes('bg-green')) return 'bg-green-500';
        if (classes.includes('bg-blue')) return 'bg-blue-500';
        if (classes.includes('bg-yellow')) return 'bg-yellow-500';
        return 'bg-gray-400';
    };

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        if (sortConfig?.key !== colKey) return <BarsArrowDownIcon className="w-3 h-3 text-transparent group-hover:text-text-muted transition-colors opacity-30" />;
        return (
            <BarsArrowDownIcon className={`w-3 h-3 text-vk-blue transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
        );
    };

    return (
        <div className="w-full h-full bg-main text-text-main font-sans overflow-hidden flex flex-col relative">
            
            {/* HEADER */}
            <div className="px-6 py-4 border-b border-border-main bg-panel flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg text-white shadow-lg">
                        <UserGroupIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight leading-none">Клиенты</h1>
                        <p className="text-text-muted text-xs mt-1 font-medium">База контактов и CRM статусы</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-text-muted group-focus-within:text-vk-blue transition-colors" />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Поиск по имени, ID, заметкам..." 
                            className="bg-subpanel pl-9 pr-4 py-2 rounded-xl text-sm border border-border-main focus:border-vk-blue focus:ring-1 focus:ring-vk-blue/50 outline-none w-64 transition-all"
                        />
                    </div>
                    <button onClick={() => setShowAddRecipientModal(true)} className="bg-vk-blue hover:bg-vk-blue-dark text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-vk-blue/20 transition-transform active:scale-95 flex items-center gap-2">
                        <PlusIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Добавить</span>
                    </button>
                    {/* ... export menu ... */}
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="px-6 py-2 border-b border-border-main bg-subpanel/50 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0 z-10">
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1 md:pb-0">
                    {/* View Switcher ... */}
                    <div className="flex bg-panel rounded-lg p-1 border border-border-main shadow-sm shrink-0">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-subpanel text-text-main shadow' : 'text-text-muted hover:text-text-main'}`} title="Список"><ListBulletIcon className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded transition ${viewMode === 'kanban' ? 'bg-subpanel text-text-main shadow' : 'text-text-muted hover:text-text-main'}`} title="Канбан"><BoardIcon className="w-4 h-4" /></button>
                    </div>

                    {viewMode === 'list' && (
                        <div className="flex bg-panel rounded-lg p-1 border border-border-main shadow-sm shrink-0 ml-2">
                            <button onClick={() => setListLayout('table')} className={`p-1.5 rounded transition ${listLayout === 'table' ? 'bg-subpanel text-text-main shadow' : 'text-text-muted hover:text-text-main'}`} title="Таблица"><ListBulletIcon className="w-4 h-4" /></button>
                            <button onClick={() => setListLayout('grid')} className={`p-1.5 rounded transition ${listLayout === 'grid' ? 'bg-subpanel text-text-main shadow' : 'text-text-muted hover:text-text-main'}`} title="Сетка"><Squares2x2Icon className="w-4 h-4" /></button>
                        </div>
                    )}

                    <div className="h-6 w-px bg-border-main mx-2 shrink-0"></div>

                    {/* Status Filter */}
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-panel border border-border-main text-text-main text-xs rounded-lg px-2 py-1.5 outline-none focus:border-vk-blue font-bold shadow-sm">
                        <option value="all">Все статусы</option>
                        {Object.entries(CRM_STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                    </select>

                    {/* Campaign Filter */}
                    <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} className="bg-panel border border-border-main text-text-main text-xs rounded-lg px-2 py-1.5 outline-none focus:border-vk-blue font-bold shadow-sm max-w-[150px] truncate">
                        <option value="all">Все кампании</option>
                        {campaigns.map(c => (<option key={c} value={c}>{c}</option>))}
                    </select>

                    {/* TAG FILTER */}
                    {allTags.length > 0 && (
                        <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="bg-panel border border-border-main text-text-main text-xs rounded-lg px-2 py-1.5 outline-none focus:border-vk-blue font-bold shadow-sm max-w-[150px] truncate">
                            <option value="all">Все теги</option>
                            {allTags.map(t => (<option key={t} value={t}>#{t}</option>))}
                        </select>
                    )}
                </div>
                
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">
                    Найдено: {filteredRecipients.length}
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-hidden relative bg-main">
                {viewMode === 'kanban' ? (
                    <KanbanBoard 
                        recipients={filteredRecipients}
                        onUpdate={refreshAll}
                        onGoToChat={onGoToChat}
                        onDelete={requestDeleteRecipient}
                        onSelect={setSelectedRecipient}
                    />
                ) : (
                    <div className="h-full overflow-y-auto custom-scrollbar p-4">
                        {listLayout === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {filteredRecipients.map(recipient => (
                                    <div key={recipient.id} className="h-full">
                                        <ClientCard recipient={recipient} onClick={() => setSelectedRecipient(recipient)} onGoToChat={onGoToChat} onDelete={(e) => requestDeleteRecipient(e, recipient.id)} variant="grid"/>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="min-w-full inline-block align-middle">
                                <div className="border border-border-main rounded-xl overflow-hidden bg-panel shadow-sm">
                                    <table className="min-w-full divide-y divide-border-main">
                                        <thead className="bg-subpanel">
                                            <tr>
                                                <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-text-muted uppercase tracking-wider w-12 cursor-default"><div className="flex items-center gap-1">Color</div></th>
                                                <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-text-muted uppercase tracking-wider cursor-pointer group hover:bg-hover" onClick={() => handleSort('name')}><div className="flex items-center gap-1">Клиент <SortIcon colKey="name"/></div></th>
                                                <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-text-muted uppercase tracking-wider cursor-pointer group hover:bg-hover" onClick={() => handleSort('status')}><div className="flex items-center gap-1">Статус <SortIcon colKey="status"/></div></th>
                                                <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-text-muted uppercase tracking-wider cursor-pointer group hover:bg-hover" onClick={() => handleSort('campaign')}><div className="flex items-center gap-1">Кампания <SortIcon colKey="campaign"/></div></th>
                                                <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-text-muted uppercase tracking-wider hidden md:table-cell">Теги</th>
                                                <th scope="col" className="px-4 py-3 text-right text-[10px] font-black text-text-muted uppercase tracking-wider">Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-main bg-main">
                                            {filteredRecipients.map((recipient) => {
                                                const status = recipient.crm_status || 'new';
                                                const isDirect = (!recipient.campaign_name || recipient.campaign_name === 'Manual' || recipient.campaign_name === 'Ручное добавление');
                                                
                                                return (
                                                    <tr key={recipient.id} onClick={() => setSelectedRecipient(recipient)} className="group hover:bg-hover border-b border-border-main border-l-4 border-l-transparent hover:border-l-vk-blue transition-all duration-75 cursor-pointer">
                                                        <td className="px-4 py-3 whitespace-nowrap"><div className={`w-3 h-8 rounded-full ${getStatusColor(status)} shadow-sm`}></div></td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="flex-shrink-0 h-9 w-9"><img className="h-9 w-9 rounded-full object-cover border border-border-main" src={recipient.avatar || 'https://vk.com/images/camera_200.png'} alt="" /></div>
                                                                <div className="ml-4"><div className="text-sm font-bold text-text-main">{recipient.name}</div><div className="text-[10px] text-text-muted font-mono">{recipient.vk_user_id}</div></div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={status} /></td>
                                                        <td className="px-4 py-3 whitespace-nowrap"><span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${isDirect ? 'bg-orange-500/5 text-orange-500 border-orange-500/10' : 'bg-subpanel text-text-muted border-border-main'} transition-colors`}>{isDirect ? 'Direct' : recipient.campaign_name}</span></td>
                                                        <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                                                            <div className="flex gap-1">
                                                                {recipient.tags && recipient.tags.slice(0, 2).map((tag, i) => (<span key={i} className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[9px] font-bold border border-purple-500/20">{tag}</span>))}
                                                                {recipient.tags && recipient.tags.length > 2 && <span className="text-[9px] text-text-muted">...</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={(e) => { e.stopPropagation(); onGoToChat(recipient.vk_user_id); }} className="w-8 h-8 rounded-lg bg-vk-blue hover:bg-vk-blue-dark text-white flex items-center justify-center shadow-md transition-all" title="Написать"><SendIcon className="w-4 h-4" /></button>
                                                                <button onClick={(e) => requestDeleteRecipient(e, recipient.id)} className="w-8 h-8 rounded-lg bg-subpanel hover:bg-red-500 hover:text-white text-red-500 border border-red-500/30 flex items-center justify-center transition-colors" title="Удалить"><TrashIcon className="w-4 h-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Profile Drawer */}
            {selectedRecipient && (
                <ClientDetailsDrawer 
                    recipient={selectedRecipient}
                    onClose={() => setSelectedRecipient(null)}
                    onUpdate={refreshAll}
                    onDelete={(id) => requestDeleteRecipient({ stopPropagation: () => {} } as any, id)}
                    onGoToChat={onGoToChat}
                    availableTags={allTags}
                />
            )}

            {/* Modals ... */}
            <ConfirmModal 
                isOpen={isDeleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setRecipientToDelete(null); }}
                onConfirm={() => recipientToDelete && executeDelete(recipientToDelete)}
                title="Удаление клиента"
                message="Вы уверены? Это удалит карточку клиента из CRM, но переписка (если есть) останется в базе диалогов."
                isLoading={isDeleting}
            />
        </div>
    );
};
