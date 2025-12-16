

import React, { useEffect, useState } from 'react';
import { Attachment } from '../../types';
import { get } from '../../apiClient';
import { XIcon, PhotoIcon, DocumentIcon } from '../icons';
import { formatDate } from '../utils';

interface ChatAttachmentsDrawerProps {
    conversationId: string;
    onClose: () => void;
}

export const ChatAttachmentsDrawer: React.FC<ChatAttachmentsDrawerProps> = ({ conversationId, onClose }) => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'photo' | 'doc'>('all');

    useEffect(() => {
        const fetchAttachments = async () => {
            setIsLoading(true);
            try {
                const data = await get<Attachment[]>(`messages/${conversationId}/attachments`);
                setAttachments(data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAttachments();
    }, [conversationId]);

    const filteredAttachments = attachments.filter(a => {
        if (filter === 'all') return true;
        if (filter === 'photo') return a.type === 'photo';
        if (filter === 'doc') return a.type === 'doc';
        return true;
    });

    return (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-panel border-l border-border-main shadow-2xl z-30 flex flex-col animate-fade-in-left">
            <div className="p-4 border-b border-border-main flex justify-between items-center bg-subpanel/50">
                <h3 className="font-bold text-text-main text-sm uppercase tracking-wide">Вложения</h3>
                <button onClick={onClose} className="p-1 hover:bg-hover rounded text-text-muted hover:text-text-main">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="p-2 border-b border-border-main flex gap-2 overflow-x-auto no-scrollbar">
                <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === 'all' ? 'bg-vk-blue text-white' : 'bg-subpanel text-text-muted hover:text-text-main'}`}>Все</button>
                <button onClick={() => setFilter('photo')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === 'photo' ? 'bg-vk-blue text-white' : 'bg-subpanel text-text-muted hover:text-text-main'}`}>Фото</button>
                <button onClick={() => setFilter('doc')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === 'doc' ? 'bg-vk-blue text-white' : 'bg-subpanel text-text-muted hover:text-text-main'}`}>Файлы</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {isLoading ? (
                    <div className="text-center text-xs text-text-muted py-4">Загрузка...</div>
                ) : filteredAttachments.length === 0 ? (
                    <div className="text-center text-xs text-text-muted py-10 opacity-50">Нет вложений</div>
                ) : (
                    <div className="space-y-2">
                        {filteredAttachments.map((att, idx) => (
                            <div key={idx} className="group bg-subpanel/50 rounded-lg p-2 border border-border-main hover:border-vk-blue/30 transition flex gap-3 items-start cursor-pointer" onClick={() => att.url && window.open(att.url, '_blank')}>
                                <div className="shrink-0 w-12 h-12 bg-black/20 rounded flex items-center justify-center overflow-hidden">
                                    {att.type === 'photo' ? (
                                        <img src={att.thumb || att.url} className="w-full h-full object-cover" alt="" />
                                    ) : att.type === 'doc' ? (
                                        <DocumentIcon className="w-6 h-6 text-text-muted" />
                                    ) : (
                                        <div className="text-[9px] uppercase font-bold text-text-muted">{att.type}</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-text-main truncate" title={att.title || 'Вложение'}>{att.title || 'Без названия'}</div>
                                    <div className="text-[10px] text-text-muted mt-1 flex justify-between">
                                        <span className="uppercase">{att.ext || att.type}</span>
                                        <span>{att.date ? formatDate(att.date).split(',')[0] : ''}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
