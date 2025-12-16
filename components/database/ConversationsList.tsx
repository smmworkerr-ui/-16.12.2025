
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Conversation, Recipient, CrmStatus } from '../../types';
import { ArrowLeftIcon, EllipsisVerticalIcon, UserGroupIcon, PinIcon } from '../icons';
import { CRM_STATUS_LABELS, CRM_STATUS_COLORS } from '../StatusBadge';

type EntityType = 'user' | 'group' | 'all';
type SortMode = 'activity_desc' | 'activity_asc' | 'status';

interface ConversationsListProps {
    conversations: Conversation[];
    selectedId: string | null;
    selectedType: EntityType | null;
    recipientMap: Map<string, Recipient>;
    statusFilter: CrmStatus[];
    availableTypes: { hasUsers: boolean; hasGroups: boolean; hasAny: boolean };
    isCollapsed: boolean;
    onSelect: (id: string | null) => void;
    onSelectType: (type: EntityType | null) => void;
    onResetAccount: () => void;
    onContextMenu: (e: React.MouseEvent, convId: string) => void;
    onToggleStatusFilter: (status: CrmStatus) => void;
    onResetStatusFilter: () => void;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
    conversations,
    selectedId,
    selectedType,
    recipientMap,
    statusFilter,
    availableTypes,
    isCollapsed,
    onSelect,
    onSelectType,
    onResetAccount,
    onContextMenu,
    onToggleStatusFilter,
    onResetStatusFilter
}) => {
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const [sortMode, setSortMode] = useState<SortMode>('activity_desc');

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Helper to get dot color
    const getStatusDotColor = (status: CrmStatus) => {
        const classes = CRM_STATUS_COLORS[status] || CRM_STATUS_COLORS['new'];
        if (classes.includes('bg-red')) return 'bg-red-500';
        if (classes.includes('bg-green')) return 'bg-green-500';
        if (classes.includes('bg-blue')) return 'bg-blue-500';
        if (classes.includes('bg-amber')) return 'bg-amber-500';
        if (classes.includes('bg-yellow')) return 'bg-yellow-500';
        return 'bg-gray-400';
    };

    const processedConversations = useMemo(() => {
        if (!selectedType) return [];
        const sorted = [...conversations];
        
        sorted.sort((a, b) => {
            if (sortMode === 'activity_desc') {
                if (a.pinned !== b.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
                return 0; 
            }
            if (sortMode === 'activity_asc') {
                if (a.pinned !== b.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
                return -1; 
            }
            if (sortMode === 'status') {
                const recA = recipientMap.get(String(a.peer_id));
                const recB = recipientMap.get(String(b.peer_id));
                const statusA = recA?.crm_status || 'new';
                const statusB = recB?.crm_status || 'new';
                return statusA.localeCompare(statusB);
            }
            return 0;
        });
        
        if (sortMode === 'activity_asc') {
             const pinned = sorted.filter(c => c.pinned);
             const unpinned = sorted.filter(c => !c.pinned).reverse();
             return [...pinned, ...unpinned];
        }

        return sorted;

    }, [conversations, sortMode, recipientMap, selectedType]);

    return (
        <div className={`relative flex flex-col border-r border-border-main bg-main transition-all duration-300 ease-in-out z-10 flex-none ${isCollapsed ? 'w-16' : 'w-80'}`}>
            {/* HEADER */}
            <div className={`relative border-b border-border-main bg-main z-40 shrink-0 w-full flex flex-col justify-center ${(!isCollapsed) ? 'min-h-[100px] p-3 gap-2' : 'h-16 items-center'}`}>
                {!isCollapsed ? (
                    <div className="flex flex-col gap-3 w-full relative h-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button onClick={onResetAccount} className="p-2 hover:bg-hover rounded-lg text-text-muted hover:text-text-main transition">
                                    <ArrowLeftIcon className="w-4 h-4" />
                                </button>
                                <span className="font-bold text-text-main text-sm">Чаты ({processedConversations.length})</span>
                            </div>
                            
                            <button 
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                className={`p-2 rounded-lg hover:bg-hover transition ${showFilterMenu ? 'text-vk-blue bg-vk-blue/10' : 'text-text-muted hover:text-text-main'}`}
                            >
                                <EllipsisVerticalIcon className="w-5 h-5" />
                            </button>

                            {/* DROPDOWN MENU */}
                            {showFilterMenu && (
                                <div 
                                    ref={filterMenuRef}
                                    className="absolute right-0 top-10 z-[100] w-64 bg-panel border border-border-main rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col"
                                >
                                    <div className="px-4 py-2 bg-subpanel text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-main">
                                        Сортировка
                                    </div>
                                    {/* Sort Options */}
                                    {['activity_desc', 'activity_asc', 'status'].map(mode => (
                                        <button 
                                            key={mode}
                                            onClick={() => setSortMode(mode as SortMode)} 
                                            className={`px-4 py-2 text-xs text-left hover:bg-hover flex justify-between items-center ${sortMode === mode ? 'text-vk-blue font-bold bg-vk-blue/5' : 'text-text-main'}`}
                                        >
                                            <span>
                                                {mode === 'activity_desc' ? 'Сначала новые' : (mode === 'activity_asc' ? 'Сначала старые' : 'По CRM статусу')}
                                            </span>
                                            {sortMode === mode && <span>✓</span>}
                                        </button>
                                    ))}

                                    <div className="px-4 py-2 bg-subpanel text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-main border-t">
                                        Фильтр (CRM)
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {Object.entries(CRM_STATUS_LABELS).map(([key, label]) => {
                                            const isSelected = statusFilter.includes(key as CrmStatus);
                                            return (
                                                <div 
                                                    key={key}
                                                    onClick={(e) => { e.stopPropagation(); onToggleStatusFilter(key as CrmStatus); }}
                                                    className="px-4 py-2 text-xs text-text-main hover:bg-hover cursor-pointer flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${getStatusDotColor(key as CrmStatus)}`}></div>
                                                        <span>{label}</span>
                                                    </div>
                                                    {isSelected && <span className="text-vk-blue font-bold">✓</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {statusFilter.length > 0 && (
                                        <button onClick={onResetStatusFilter} className="px-4 py-3 text-xs text-red-500 hover:bg-red-500/10 border-t border-border-main font-bold w-full text-center">
                                            Сбросить фильтр
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* TYPE TABS */}
                        <div className="flex p-1 bg-subpanel rounded-lg border border-border-main">
                            {[
                                { id: 'all', label: 'Все' },
                                { id: 'user', label: 'Люди' },
                                { id: 'group', label: 'Группы' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => onSelectType(tab.id as EntityType)}
                                    disabled={!availableTypes[tab.id === 'user' ? 'hasUsers' : (tab.id === 'group' ? 'hasGroups' : 'hasAny')]}
                                    className={`
                                        flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all
                                        ${selectedType === tab.id 
                                            ? 'bg-panel text-vk-blue shadow-sm border border-border-main/50' 
                                            : 'text-text-muted hover:text-text-main hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed'}
                                    `}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <button onClick={() => onSelect(null)} className="w-full h-full flex items-center justify-center hover:bg-hover transition text-text-muted hover:text-vk-blue" title="Назад к списку">
                        <UserGroupIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
            
            {/* Conversation List */}
            <div className="relative overflow-y-auto flex-1 custom-scrollbar w-full z-0 py-2">
                {selectedType && processedConversations.map(c => {
                    const rec = recipientMap.get(String(c.peer_id));
                    const statusColor = getStatusDotColor(rec?.crm_status || 'new');
                    const isSelected = selectedId === c.id;
                    const unreadCount = Number(c.unread_count) || 0;
                    
                    return (
                        <div 
                            key={c.id}
                            onClick={() => onSelect(c.id)}
                            onContextMenu={(e) => onContextMenu(e, c.id)}
                            className={`
                                cursor-pointer transition-all duration-200 group relative
                                ${isCollapsed 
                                    ? 'mx-2 my-1 rounded-xl p-1 flex justify-center items-center h-12' 
                                    : 'mx-2 my-1 rounded-xl p-3 flex gap-3'}
                                ${isSelected 
                                    ? 'bg-vk-blue text-white shadow-md' 
                                    : 'hover:bg-hover/50 text-text-main'}
                            `}
                        >
                            <div className="relative shrink-0">
                                <img 
                                    src={c.avatar || 'https://vk.com/images/camera_200.png'} 
                                    className={`w-10 h-10 rounded-full flex-shrink-0 object-cover ${isSelected ? 'border-2 border-white/30' : 'bg-subpanel'}`} 
                                    alt="" 
                                />
                                
                                {!!c.pinned && (
                                    <div className="absolute -top-1 -left-1 bg-subpanel rounded-full p-0.5 border border-border-main shadow-sm text-text-muted">
                                        <PinIcon className="w-3 h-3 transform -rotate-45" />
                                    </div>
                                )}

                                {unreadCount > 0 && isCollapsed && (
                                    <div className={`absolute -top-1 -right-1 text-[9px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow border-2 border-main ${isSelected ? 'bg-white text-vk-blue' : 'bg-red-500 text-white'}`}>
                                        {unreadCount > 99 ? '!' : unreadCount}
                                    </div>
                                )}
                            </div>

                            {!isCollapsed && (
                                <div className="overflow-hidden flex-1 flex flex-col justify-center gap-0.5">
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            {/* Status Dot - ALWAYS VISIBLE COLOR */}
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} title={CRM_STATUS_LABELS[rec?.crm_status || 'new']}></div>
                                            <div className={`font-bold text-sm truncate ${isSelected ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]' : 'text-text-main'}`}>{c.name}</div>
                                        </div>
                                        
                                        {unreadCount > 0 && (
                                            <div className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm ${isSelected ? 'bg-white text-vk-blue' : 'bg-red-500 text-white'}`}>
                                                {unreadCount}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className={`text-xs truncate ${isSelected ? 'text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]' : 'text-text-muted'}`}>
                                        {c.last_message || <span className="italic opacity-50">Нет сообщений</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};
