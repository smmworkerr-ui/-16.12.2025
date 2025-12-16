
import React, { useState, useEffect } from 'react';
import { get, post, del } from '../../apiClient';
import { Reminder } from '../../types';
import { ClockIcon, TrashIcon, CalendarIcon, PlusIcon, XIcon } from '../icons';
import { formatDate } from '../utils';

interface ChatReminderModalProps {
    conversationId: string;
    onClose: () => void;
}

export const ChatReminderModal: React.FC<ChatReminderModalProps> = ({ conversationId, onClose }) => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // New Reminder State
    const [newDate, setNewDate] = useState('');
    const [newNote, setNewNote] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchReminders = async () => {
        setIsLoading(true);
        try {
            const data = await get<Reminder[]>(`conversations/${conversationId}/reminders`);
            setReminders(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReminders();
    }, [conversationId]);

    const handleCreate = async () => {
        if (!newDate) return alert("Выберите дату и время");
        setIsCreating(true);
        try {
            const timestamp = Math.floor(new Date(newDate).getTime() / 1000);
            await post(`conversations/${conversationId}/reminders`, {
                remind_at: timestamp,
                note: newNote
            });
            setNewDate('');
            setNewNote('');
            fetchReminders();
        } catch (e: any) {
            alert("Ошибка: " + e.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await del(`reminders/${id}`);
            fetchReminders();
        } catch (e: any) {
            alert("Ошибка удаления: " + e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-panel rounded-xl shadow-2xl border border-border-main w-full max-w-md flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-5 border-b border-border-main flex justify-between items-center bg-subpanel/50 rounded-t-xl">
                    <h3 className="font-bold text-text-main flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-vk-blue" />
                        Напоминания
                    </h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main"><XIcon className="w-5 h-5"/></button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-main min-h-[150px]">
                    {isLoading ? (
                        <div className="text-center text-xs text-text-muted py-4">Загрузка...</div>
                    ) : reminders.length === 0 ? (
                        <div className="text-center text-xs text-text-muted py-8 opacity-50 flex flex-col items-center gap-2">
                            <CalendarIcon className="w-8 h-8" />
                            Нет активных задач
                        </div>
                    ) : (
                        reminders.map(r => {
                            const isOverdue = r.remind_at < Math.floor(Date.now()/1000);
                            return (
                                <div key={r.id} className={`p-3 rounded-lg border flex gap-3 ${isOverdue ? 'bg-red-500/10 border-red-500/30' : 'bg-panel border-border-main'}`}>
                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono text-xs font-bold text-text-main">{formatDate(r.remind_at)}</div>
                                        {r.note && <div className="text-sm mt-1 text-text-muted break-words">{r.note}</div>}
                                    </div>
                                    <button onClick={() => handleDelete(r.id)} className="text-text-muted hover:text-red-500 self-start p-1"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Create Form */}
                <div className="p-4 border-t border-border-main bg-panel rounded-b-xl space-y-3">
                    <div className="text-xs font-bold text-text-muted uppercase tracking-wide">Новая задача</div>
                    <div className="flex gap-2">
                        <input 
                            type="datetime-local" 
                            value={newDate} 
                            onChange={e => setNewDate(e.target.value)} 
                            className="bg-subpanel border border-border-main rounded-lg px-3 py-2 text-xs text-text-main outline-none focus:border-vk-blue font-bold flex-1"
                        />
                    </div>
                    <textarea 
                        value={newNote} 
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Что нужно сделать?..." 
                        className="w-full bg-subpanel border border-border-main rounded-lg px-3 py-2 text-xs text-text-main outline-none focus:border-vk-blue resize-none h-16"
                    />
                    <button 
                        onClick={handleCreate} 
                        disabled={isCreating}
                        className="w-full bg-vk-blue hover:bg-vk-blue-dark text-white py-2 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2"
                    >
                        {isCreating ? 'Сохранение...' : <><PlusIcon className="w-4 h-4"/> Добавить задачу</>}
                    </button>
                </div>
            </div>
        </div>
    );
};
