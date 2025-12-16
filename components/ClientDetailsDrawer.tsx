
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Recipient, CrmStatus } from '../types';
import { StatusBadge, CRM_STATUS_LABELS } from './StatusBadge';
import { VkIcon, NotebookIcon, TrashIcon, PlusIcon } from './icons';
import { put } from '../apiClient';

interface ClientDetailsDrawerProps {
    recipient: Recipient | null;
    onClose: () => void;
    onUpdate: () => void;
    onDelete: (id: number) => void;
    onGoToChat: (vk_id: string) => void;
    availableTags?: string[];
}

export const ClientDetailsDrawer: React.FC<ClientDetailsDrawerProps> = ({ 
    recipient, 
    onClose, 
    onUpdate,
    onDelete,
    onGoToChat,
    availableTags = []
}) => {
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<CrmStatus>('new');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    
    // Tag State
    const [tags, setTags] = useState<string[]>([]);
    const [newTagInput, setNewTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    
    // Refs for positioning the portal dropdown
    const tagInputRef = useRef<HTMLInputElement>(null);
    const [dropdownCoords, setDropdownCoords] = useState<{top: number, left: number, width: number} | null>(null);

    // FIX: Depend only on recipient.id to avoid form reset during polling
    useEffect(() => {
        if (recipient) {
            setNotes(recipient.notes || '');
            setStatus(recipient.crm_status || 'new');
            setTags(recipient.tags || []);
        }
    }, [recipient?.id]); // <--- CRITICAL FIX

    // Calculate dropdown position when shown
    useEffect(() => {
        if (showTagSuggestions && tagInputRef.current) {
            const rect = tagInputRef.current.getBoundingClientRect();
            setDropdownCoords({
                top: rect.bottom + 5,
                left: rect.left,
                width: rect.width
            });
        }
    }, [showTagSuggestions, newTagInput]);

    const handleStatusChange = async (newStatus: CrmStatus) => {
        setStatus(newStatus);
        if (recipient) {
            try {
                await put(`recipients/${recipient.id}/status`, { status: newStatus });
                onUpdate();
            } catch (e) { console.error("Status update failed", e); }
        }
    };

    const handleNotesSave = async () => {
        if (recipient) {
            setIsSavingNotes(true);
            try {
                await put(`recipients/${recipient.id}/notes`, { notes });
                onUpdate();
            } catch (e) { console.error("Notes save failed", e); } 
            finally { setTimeout(() => setIsSavingNotes(false), 500); }
        }
    };

    const handleAddTag = async (tagToAdd?: string) => {
        const tag = tagToAdd || newTagInput.trim();
        if (tag && recipient && !tags.includes(tag)) {
            const newTags = [...tags, tag];
            setTags(newTags);
            setNewTagInput('');
            setShowTagSuggestions(false);
            try {
                await put(`recipients/${recipient.id}/tags`, { tags: newTags });
                onUpdate();
            } catch(e) { console.error(e); }
        } else {
            setNewTagInput('');
            setShowTagSuggestions(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!recipient) return;
        const newTags = tags.filter(t => t !== tagToRemove);
        setTags(newTags);
        try {
            await put(`recipients/${recipient.id}/tags`, { tags: newTags });
            onUpdate();
        } catch(e) { console.error(e); }
    };

    const filteredSuggestions = useMemo(() => {
        // Show all available tags if input is empty, otherwise filter
        const lowerInput = newTagInput.trim().toLowerCase();
        return availableTags.filter(t => 
            !tags.includes(t) && (lowerInput === '' || t.toLowerCase().includes(lowerInput))
        );
    }, [newTagInput, availableTags, tags]);

    if (!recipient) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative w-full max-w-md bg-panel h-full shadow-2xl flex flex-col border-l border-border-main animate-fade-in-left">
                <div className="p-6 border-b border-border-main flex items-start justify-between bg-subpanel/30">
                    <div className="flex items-center gap-4">
                        <img src={recipient.avatar || 'https://vk.com/images/camera_200.png'} alt="" className="w-16 h-16 rounded-full border-2 border-border-main object-cover bg-main" />
                        <div>
                            <h2 className="text-xl font-bold text-text-main">{recipient.name}</h2>
                            <a href={recipient.profile_url} target="_blank" rel="noreferrer" className="text-sm text-vk-blue hover:underline flex items-center gap-1 mt-1">
                                <VkIcon className="w-4 h-4" /> ID: {recipient.vk_user_id}
                            </a>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main text-2xl leading-none">&times;</button>
                </div>

                <div 
                    className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8"
                    onScroll={() => setShowTagSuggestions(false)} // Close dropdown on scroll to avoid misalignment
                >
                    <div>
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 block">Этап сделки</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(CRM_STATUS_LABELS).map(([key, label]) => {
                                const isActive = status === key;
                                return (
                                    <button key={key} onClick={() => handleStatusChange(key as CrmStatus)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${isActive ? 'ring-2 ring-vk-blue ring-offset-1 ring-offset-panel shadow-md scale-105' : 'opacity-60 hover:opacity-100 hover:bg-hover'}`}>
                                        <StatusBadge status={key as CrmStatus} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* TAGS UI */}
                    <div>
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 block">Теги (Метки)</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map((tag, i) => (
                                <span key={i} className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 flex items-center gap-1">
                                    {tag}
                                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-white">×</button>
                                </span>
                            ))}
                        </div>
                        <div className="relative">
                            <input 
                                ref={tagInputRef}
                                value={newTagInput} 
                                onChange={e => {
                                    setNewTagInput(e.target.value);
                                    setShowTagSuggestions(true);
                                }} 
                                onKeyDown={handleKeyDown} 
                                onFocus={() => setShowTagSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                                className="w-full bg-subpanel border border-border-main rounded-lg px-3 py-2 text-sm text-text-main outline-none focus:border-vk-blue" 
                                placeholder="Добавить тег (Enter)..." 
                            />
                            <PlusIcon className="w-4 h-4 absolute right-3 top-2.5 text-text-muted pointer-events-none"/>
                            
                            {/* TAG SUGGESTIONS PORTAL */}
                            {showTagSuggestions && filteredSuggestions.length > 0 && dropdownCoords && createPortal(
                                <div 
                                    className="fixed bg-panel border border-border-main rounded-lg shadow-2xl z-[10000] max-h-48 overflow-y-auto custom-scrollbar animate-fade-in"
                                    style={{ 
                                        top: dropdownCoords.top, 
                                        left: dropdownCoords.left, 
                                        width: dropdownCoords.width 
                                    }}
                                >
                                    {filteredSuggestions.map(tag => (
                                        <div 
                                            key={tag} 
                                            className="px-3 py-2 text-sm hover:bg-hover cursor-pointer text-text-main border-b border-border-main last:border-0"
                                            onMouseDown={(e) => {
                                                // Prevent input blur so we can click
                                                e.preventDefault(); 
                                                handleAddTag(tag);
                                            }}
                                        >
                                            {tag}
                                        </div>
                                    ))}
                                </div>,
                                document.body
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => { onGoToChat(recipient.vk_user_id); onClose(); }} className="flex-1 bg-vk-blue text-white py-3 rounded-lg font-bold shadow-lg hover:bg-vk-blue-dark transition-transform active:scale-[0.98] flex items-center justify-center gap-2">
                            💬 Перейти в чат
                        </button>
                        <button onClick={() => { onDelete(recipient.id); onClose(); }} className="px-4 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center" title="Удалить клиента">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="h-48 flex flex-col">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex justify-between items-center">
                            <span>Заметки</span>
                            {isSavingNotes && <span className="text-green-500 animate-pulse lowercase font-normal">сохранено...</span>}
                        </label>
                        <div className="flex-1 relative">
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={handleNotesSave} className="w-full h-full bg-subpanel border border-border-main rounded-xl p-4 text-sm text-text-main resize-none focus:border-vk-blue focus:ring-1 focus:ring-vk-blue outline-none transition" placeholder="Напишите здесь важную информацию о клиенте..." />
                            <div className="absolute top-3 right-3 opacity-30 pointer-events-none"><NotebookIcon className="w-6 h-6" /></div>
                        </div>
                    </div>

                    <div className="bg-subpanel rounded-lg p-4 text-xs font-mono text-text-muted border border-border-main space-y-1">
                        <div className="flex justify-between"><span>Internal ID:</span> <span>{recipient.id}</span></div>
                        <div className="flex justify-between"><span>Кампания:</span> <span>{recipient.campaign_name || 'N/A'}</span></div>
                        <div className="flex justify-between"><span>Статус рассылки:</span> <span>{recipient.status}</span></div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
