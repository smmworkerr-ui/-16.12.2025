
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { post, get } from '../../apiClient';
import { UserGroupIcon, SearchIcon, RefreshIcon, CheckIcon, UsersIcon } from '../icons';
import { CRM_STATUS_LABELS, CRM_STATUS_COLORS } from '../StatusBadge';
import { Recipient } from '../../types';
import { ClientCard } from '../ClientCard';
import { ClientDetailsDrawer } from '../ClientDetailsDrawer';

interface CampaignDatabaseImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (ids: string[]) => void;
}

export const CampaignDatabaseImportModal: React.FC<CampaignDatabaseImportModalProps> = ({ isOpen, onClose, onImport }) => {
    const [statuses, setStatuses] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Data Stats
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [previewIds, setPreviewIds] = useState<string[]>([]); // ALL matching IDs from backend
    const [previewRecipients, setPreviewRecipients] = useState<Recipient[]>([]); // Visual subset (50)
    const [isSearching, setIsSearching] = useState(false);

    // Interaction State
    const [manualSelection, setManualSelection] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, recipient: Recipient} | null>(null);
    const [viewingRecipient, setViewingRecipient] = useState<Recipient | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Initial load of tags
    useEffect(() => {
        if (isOpen) {
            const fetchTags = async () => {
                try {
                    const data = await get<Recipient[]>('recipients');
                    const tags = new Set<string>();
                    data.forEach(r => { if(r.tags) r.tags.forEach(t => tags.add(t)); });
                    setAvailableTags(Array.from(tags).sort());
                } catch(e) { console.error(e); }
            };
            fetchTags();
            // Initial search with empty filters
            runSearch([], [], '');
            setManualSelection(new Set());
        }
    }, [isOpen]);

    // Search effect
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                runSearch(statuses, selectedTags, searchTerm);
            }, 500); // Debounce
            return () => clearTimeout(timer);
        }
    }, [statuses, selectedTags, searchTerm, isOpen]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const runSearch = async (sts: string[], tgs: string[], search: string) => {
        setIsSearching(true);
        try {
            const res = await post<{count: number, ids: string[], preview: Recipient[]}>('recipients/search-ids', {
                statuses: sts,
                tags: tgs,
                search: search
            });
            setPreviewCount(res.count);
            setPreviewIds(res.ids);
            setPreviewRecipients(res.preview || []);
        } catch(e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleStatus = (s: string) => {
        setStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    };

    const toggleTag = (t: string) => {
        setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    };

    const handleImport = () => {
        if (manualSelection.size > 0) {
            // Import ONLY manually selected
            onImport(Array.from(manualSelection));
        } else if (previewIds.length > 0) {
            // Import ALL matching (default)
            onImport(previewIds);
        }
        onClose();
    };

    // --- INTERACTION HANDLERS ---

    const handleLeftClickCard = (e: React.MouseEvent, recipient: Recipient) => {
        // LMB -> Selection
        setManualSelection(prev => {
            const next = new Set(prev);
            if (next.has(recipient.vk_user_id)) {
                next.delete(recipient.vk_user_id);
            } else {
                next.add(recipient.vk_user_id);
            }
            return next;
        });
    };

    const handleRightClickCard = (e: React.MouseEvent, recipient: Recipient) => {
        // RMB -> Context Menu
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            recipient: recipient
        });
    };

    const handleOpenCard = () => {
        if (contextMenu) {
            setViewingRecipient(contextMenu.recipient);
            setContextMenu(null);
        }
    };

    if (!isOpen) return null;

    const getStatusColor = (status: string) => {
        const classes = CRM_STATUS_COLORS[status as keyof typeof CRM_STATUS_LABELS] || 'bg-gray-500/10 text-gray-500';
        if (classes.includes('green')) return 'border-green-500';
        if (classes.includes('blue')) return 'border-blue-500';
        if (classes.includes('amber')) return 'border-amber-500';
        if (classes.includes('red')) return 'border-red-500';
        return 'border-gray-500';
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-panel rounded-xl shadow-2xl border border-border-main w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-border-main flex justify-between items-center bg-subpanel/50 shrink-0">
                    <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                        <UserGroupIcon className="w-6 h-6 text-vk-blue" />
                        Импорт из базы CRM
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-text-muted flex gap-3">
                            <span className="flex items-center gap-1"><span className="font-bold border border-text-muted/30 px-1 rounded">ЛКМ</span> Выбор</span>
                            <span className="flex items-center gap-1"><span className="font-bold border border-text-muted/30 px-1 rounded">ПКМ</span> Меню</span>
                        </div>
                        <button onClick={onClose} className="text-text-muted hover:text-text-main text-2xl leading-none">&times;</button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* LEFT COLUMN: FILTERS */}
                    <div className="w-72 border-r border-border-main p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6 bg-panel">
                        
                        {/* SEARCH */}
                        <div>
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">Поиск</label>
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
                                <input 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Имя, ID, заметки..." 
                                    className="w-full bg-subpanel pl-10 pr-4 py-2.5 rounded-xl border border-border-main outline-none focus:border-vk-blue transition-colors text-sm"
                                />
                            </div>
                        </div>

                        {/* STATUS FILTER */}
                        <div>
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">Статус сделки</label>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(CRM_STATUS_LABELS).map(([key, label]) => {
                                    const isSelected = statuses.includes(key);
                                    const borderColor = getStatusColor(key);
                                    
                                    return (
                                        <button 
                                            key={key} 
                                            onClick={() => toggleStatus(key)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 w-full ${isSelected ? `bg-vk-blue text-white border-vk-blue shadow-md` : `bg-subpanel text-text-muted border-border-main hover:border-text-muted hover:text-text-main`}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : borderColor.replace('border-', 'bg-')}`}></div>
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* TAGS FILTER */}
                        <div className="flex-1">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">Теги</label>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.length === 0 && <span className="text-xs text-text-muted italic">Нет тегов</span>}
                                {availableTags.map(tag => {
                                    const isSelected = selectedTags.includes(tag);
                                    return (
                                        <button 
                                            key={tag} 
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isSelected ? 'bg-purple-500 text-white border-purple-500 shadow-md' : 'bg-subpanel text-text-muted border-border-main hover:text-text-main'}`}
                                        >
                                            #{tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: PREVIEW GRID */}
                    <div className="flex-1 bg-main p-6 overflow-y-auto custom-scrollbar flex flex-col relative" onContextMenu={(e) => e.preventDefault()}>
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <div className="text-sm font-bold text-text-main">
                                Результаты поиска 
                                <span className="text-text-muted font-normal ml-2 text-xs">(Показано первые 50)</span>
                            </div>
                            {isSearching && <span className="text-xs text-vk-blue animate-pulse flex items-center gap-1"><RefreshIcon className="w-3 h-3 animate-spin"/> Поиск...</span>}
                        </div>

                        {previewRecipients.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-50 border-2 border-dashed border-border-main rounded-xl">
                                <UserGroupIcon className="w-12 h-12 mb-2" />
                                <span className="text-sm">Никого не найдено</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {previewRecipients.map(recipient => (
                                    <div key={recipient.id}>
                                        <ClientCard 
                                            recipient={recipient} 
                                            onClick={(e) => handleLeftClickCard(e, recipient)} 
                                            onContextMenu={(e) => handleRightClickCard(e, recipient)}
                                            onGoToChat={() => {}} 
                                            onDelete={() => {}} 
                                            variant="compact"
                                            hideId={true}
                                            hideActions={true}
                                            isSelected={manualSelection.has(recipient.vk_user_id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {previewCount !== null && previewCount > 50 && (
                            <div className="text-center py-4 text-xs text-text-muted italic">
                                ...и еще {previewCount - 50} человек
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border-main bg-subpanel/50 flex justify-between items-center shrink-0">
                    <div className="text-sm font-bold text-text-main">
                        К импорту: <span className="text-vk-blue text-lg ml-1">
                            {manualSelection.size > 0 ? manualSelection.size : (previewCount !== null ? previewCount : 0)}
                        </span> чел.
                        {manualSelection.size > 0 && <span className="text-xs text-text-muted ml-2 font-normal">(Выбрано вручную)</span>}
                    </div>
                    
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border-main text-sm font-bold text-text-muted hover:text-text-main hover:bg-subpanel transition">
                            Отмена
                        </button>
                        <button 
                            onClick={handleImport} 
                            disabled={(previewCount === 0 && manualSelection.size === 0) || isSearching}
                            className="px-6 py-2 rounded-xl bg-vk-blue hover:bg-vk-blue-dark text-white text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                        >
                            <CheckIcon className="w-4 h-4" />
                            {manualSelection.size > 0 ? 'Импортировать выбранных' : 'Импортировать всех'}
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTEXT MENU (RMB) */}
            {contextMenu && (
                <div 
                    ref={contextMenuRef}
                    className="fixed z-[10001] bg-panel border border-border-main rounded-xl shadow-2xl py-1 w-48 overflow-hidden animate-fade-in"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button 
                        onClick={handleOpenCard} 
                        className="w-full text-left px-4 py-3 text-sm font-bold text-text-main hover:bg-hover flex items-center gap-2"
                    >
                        <UsersIcon className="w-4 h-4 text-text-muted" /> 
                        Открыть карточку
                    </button>
                </div>
            )}

            {/* CLIENT DRAWER (Inside Modal) */}
            {viewingRecipient && (
                <ClientDetailsDrawer 
                    recipient={viewingRecipient}
                    onClose={() => setViewingRecipient(null)}
                    onUpdate={() => {}} // Read-only mostly, or update filters?
                    onDelete={() => {}} // Disable delete here or handle carefully
                    onGoToChat={() => {}} // Disable nav
                    availableTags={availableTags}
                />
            )}
        </div>,
        document.body
    );
};
