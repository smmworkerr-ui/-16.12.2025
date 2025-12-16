

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Account, AppLogEntry, Conversation } from '../types';
import { BellIcon, ExclamationIcon, CheckIcon, RobotIcon, RocketIcon, TrashIcon, XIcon } from './icons';

interface NotificationCenterProps {
    accounts: Account[];
    conversations: Conversation[];
    logs: AppLogEntry[];
    onNavigate: (mode: 'accounts' | 'database' | 'logs', id?: string | number) => void;
}

interface Notification {
    id: string;
    type: 'error' | 'message' | 'system' | 'success';
    title: string;
    text: string;
    timestamp: number;
    action?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
    accounts, 
    conversations, 
    logs,
    onNavigate 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 1. Generate RAW notifications list
    const rawNotifications = useMemo(() => {
        const list: Notification[] = [];

        // 1. Account Errors
        accounts.forEach(acc => {
            if (acc.status !== 'OK') {
                list.push({
                    id: `acc-err-${acc.id}`,
                    type: 'error',
                    title: 'Ошибка аккаунта',
                    text: `${acc.name}: ${acc.error_details || 'Проблема с токеном'}`,
                    timestamp: Date.now(),
                    action: () => onNavigate('accounts', acc.id)
                });
            }
        });

        // 2. Unread Messages (Grouped)
        const unreadConvs = conversations.filter(c => c.unread_count > 0);
        if (unreadConvs.length > 0) {
            const totalUnread = unreadConvs.reduce((acc, c) => acc + c.unread_count, 0);
            const title = unreadConvs.length === 1 ? 'Новое сообщение' : `${totalUnread} новых сообщений`;
            const text = unreadConvs.length === 1 
                ? `От: ${unreadConvs[0].name}`
                : `В ${unreadConvs.length} чатах`;
            
            list.push({
                id: 'unread-group',
                type: 'message',
                title: title,
                text: text,
                timestamp: Date.now(),
                action: () => unreadConvs.length === 1 ? onNavigate('database', unreadConvs[0].id) : onNavigate('database')
            });
        }

        // 3. Campaign Logs (Success/Finish events)
        logs.filter(l => l.message.startsWith('$REPORT:')).slice(0, 5).forEach(l => {
            const msg = l.message.replace('$REPORT:', '').trim();
            // Try to extract campaign name from: "Рассылка 'Name' завершена."
            const match = msg.match(/Рассылка '([^']+)' завершена/);
            const campaignName = match ? match[1] : null;

            list.push({
                id: `log-${l.id}`,
                type: 'success',
                title: 'Рассылка завершена',
                text: msg.split('\n')[0],
                timestamp: 0, 
                // Navigate to database with campaign logic if found
                action: () => onNavigate('database', campaignName ? `CAMPAIGN:${campaignName}` : undefined)
            });
        });

        // 4. Critical Errors
        logs.filter(l => (l.level as string) === 'CRITICAL' || (l.level === 'ERROR' && !l.message.includes('Token'))).slice(0, 3).forEach(l => {
             list.push({
                id: `log-crit-${l.id}`,
                type: 'system',
                title: 'Системная ошибка',
                text: l.message.substring(0, 50) + '...',
                timestamp: 0,
                action: () => onNavigate('logs')
            });
        });

        return list;
    }, [accounts, conversations, logs, onNavigate]);

    // 2. Filter out dismissed ones
    const notifications = useMemo(() => {
        return rawNotifications.filter(n => !dismissedIds.has(n.id));
    }, [rawNotifications, dismissedIds]);

    const handleItemClick = (n: Notification) => {
        if (n.action) n.action();
        setIsOpen(false);
    };

    const handleDismiss = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDismissedIds(prev => new Set(prev).add(id));
    };

    const handleClearAll = () => {
        const newSet = new Set(dismissedIds);
        notifications.forEach(n => newSet.add(n.id));
        setDismissedIds(newSet);
    };

    const hasUrgent = notifications.some(n => n.type === 'error' || n.type === 'message');

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-xl transition-all duration-200 relative group ${isOpen ? 'bg-vk-blue text-white shadow-lg' : 'hover:bg-hover text-text-muted hover:text-text-main'}`}
            >
                <BellIcon className="w-5 h-5" />
                {hasUrgent && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-panel animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-panel border border-border-main rounded-xl shadow-2xl overflow-hidden z-[100] animate-fade-in origin-top-right">
                    <div className="p-3 border-b border-border-main bg-subpanel/50 backdrop-blur-sm flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Уведомления</span>
                            {notifications.length > 0 && (
                                <span className="bg-main text-text-muted text-[10px] px-2 py-0.5 rounded-full border border-border-main font-mono">{notifications.length}</span>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <button 
                                onClick={handleClearAll} 
                                className="p-1 text-text-muted hover:text-red-500 transition hover:bg-red-500/10 rounded"
                                title="Очистить все"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-text-muted opacity-50 flex flex-col items-center">
                                <BellIcon className="w-8 h-8 mb-2 stroke-1" />
                                <span className="text-xs">Все спокойно</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-border-main/50">
                                {notifications.map(n => (
                                    <div 
                                        key={n.id} 
                                        onClick={() => handleItemClick(n)}
                                        className="p-3 hover:bg-hover transition-colors cursor-pointer flex gap-3 items-start group relative pr-8"
                                    >
                                        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                            n.type === 'error' ? 'bg-red-500/10 text-red-500' : 
                                            n.type === 'message' ? 'bg-vk-blue/10 text-vk-blue' :
                                            n.type === 'success' ? 'bg-green-500/10 text-green-500' :
                                            'bg-orange-500/10 text-orange-500'
                                        }`}>
                                            {n.type === 'error' && <ExclamationIcon className="w-4 h-4" />}
                                            {n.type === 'message' && <RobotIcon className="w-4 h-4" />}
                                            {n.type === 'success' && <CheckIcon className="w-4 h-4" />}
                                            {n.type === 'system' && <RocketIcon className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-bold mb-0.5 ${n.type === 'error' ? 'text-red-400' : 'text-text-main'}`}>{n.title}</div>
                                            <div className="text-[11px] text-text-muted leading-snug break-words line-clamp-2 group-hover:text-text-main transition-colors">
                                                {n.text}
                                            </div>
                                        </div>
                                        
                                        {/* Dismiss Button */}
                                        <button 
                                            onClick={(e) => handleDismiss(e, n.id)}
                                            className="absolute top-2 right-2 p-1 text-text-muted hover:text-text-main opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 rounded"
                                            title="Скрыть"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
