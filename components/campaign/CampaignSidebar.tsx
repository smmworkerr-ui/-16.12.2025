
import React, { useRef, useState, useEffect } from 'react';
import { GearIcon, RobotIcon, UserGroupIcon, LightningIcon, ExclamationIcon } from '../icons';
import { CampaignFlightData } from '../CampaignFlightData';
import { Account, AppLogEntry } from '../../types';

interface CampaignSidebarProps {
    // Flight Data Props
    recipientsCount: number; 
    riskyRecipientsCount?: number; 
    selectedAccounts: Account[];
    spintaxScore: number;
    minDelay: number;
    maxDelay: number;
    // Tech Props
    isScheduled: boolean;
    setIsScheduled: (val: boolean) => void;
    scheduledTime: string;
    setScheduledTime: (val: string) => void;
    
    executionMode: 'sequential' | 'parallel';
    setExecutionMode: (val: 'sequential' | 'parallel') => void;

    delayMode: 'manual' | 'auto';
    setDelayMode: (val: 'manual' | 'auto') => void;
    
    delayMin: number;
    setDelayMin: (val: number) => void;
    delayMax: number;
    setDelayMax: (val: number) => void;
    workStart: number;
    setWorkStart: (val: number) => void;
    workEnd: number;
    setWorkEnd: (val: number) => void;
    skipIfDialogExists: boolean;
    setSkipIfDialogExists: (val: boolean) => void;
    resetStatusNew: boolean;
    setResetStatusNew: (val: boolean) => void;
    addFriends: boolean;
    setAddFriends: (val: boolean) => void;
    // Logs
    appLogs: AppLogEntry[];
    onGoToChat?: (id: string) => void;
    recipients?: any[]; 
    onAccountContextMenu?: (e: React.MouseEvent, id: number) => void;
}

export const CampaignSidebar: React.FC<CampaignSidebarProps> = ({
    recipientsCount, riskyRecipientsCount, selectedAccounts, spintaxScore, minDelay, maxDelay,
    isScheduled, setIsScheduled, scheduledTime, setScheduledTime,
    executionMode, setExecutionMode,
    delayMode, setDelayMode,
    delayMin, setDelayMin, delayMax, setDelayMax,
    workStart, setWorkStart, workEnd, setWorkEnd,
    skipIfDialogExists, setSkipIfDialogExists,
    resetStatusNew, setResetStatusNew,
    addFriends, setAddFriends,
    appLogs, onGoToChat, recipients,
    onAccountContextMenu
}) => {
    const dateInputRef = useRef<HTMLInputElement>(null);

    const getRecipientName = (id: string) => {
        if (!recipients) return id;
        const r = recipients.find(r => String(r.vk_user_id) === id || String(r.vk_user_id) === String(id).replace('-', ''));
        return r ? r.name : id;
    };

    const handleDateContainerClick = (e: React.MouseEvent) => {
        if (e.target === dateInputRef.current) return;
        try {
            if (dateInputRef.current && 'showPicker' in dateInputRef.current) {
                (dateInputRef.current as any).showPicker();
            } else {
                dateInputRef.current?.focus();
            }
        } catch (err) {
            dateInputRef.current?.focus();
        }
    };

    // Функция синхронизации времени лога с локальным временем компьютера
    const formatLogTime = (ts: string) => {
        if (!ts) return '--:--';
        try {
            // Предполагаем, что сервер отдает UTC. Добавляем 'Z'.
            const dateStr = ts.replace(' ', 'T') + 'Z'; 
            const date = new Date(dateStr);
            
            if (isNaN(date.getTime())) {
                return ts;
            }
            
            return date.toLocaleString('ru-RU', { 
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
        } catch (e) {
            return ts;
        }
    };

    // Фильтрация логов
    const filteredLogs = (appLogs || []).filter(l => {
        const m = l.message.toLowerCase();
        return l.message.startsWith('$') || 
               m.includes('sending') || 
               m.includes('finished') || 
               m.includes('stopped') || 
               m.includes('completed') || 
               l.level === 'ERROR';
    });

    return (
        <div className="w-5/12 h-full flex flex-col bg-panel border-l border-border-main relative z-20">
            {/* 1. FLIGHT DATA */}
            <div className="p-6 border-b border-border-main bg-subpanel/30">
                <CampaignFlightData 
                    recipientsCount={recipientsCount} 
                    riskyRecipientsCount={riskyRecipientsCount}
                    selectedAccounts={selectedAccounts}
                    spintaxScore={spintaxScore}
                    minDelay={delayMode === 'auto' ? 60 : minDelay} 
                    maxDelay={delayMode === 'auto' ? 120 : maxDelay}
                    onContextMenu={onAccountContextMenu}
                />
            </div>

            {/* 2. CONTROL PANELS SCROLL AREA */}
            <div className="border-b border-border-main space-y-0 overflow-y-auto max-h-[450px] custom-scrollbar flex-1">
                
                {/* Tech Panel (Scheduler + Config) */}
                <div className="p-6 border-b border-border-main/50">
                    <div className="bg-subpanel/50 border border-border-main rounded-xl p-5 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <GearIcon className="w-5 h-5 text-text-muted" /> 
                                Технический Пульт
                            </h3>
                            <div className="flex bg-main rounded-lg p-1 border border-border-main shrink-0" onClick={e => e.stopPropagation()}>
                                <button onClick={() => setIsScheduled(false)} className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase transition ${!isScheduled ? 'bg-vk-blue text-white shadow' : 'text-text-muted hover:text-text-main'}`}>⚡ Сейчас</button>
                                <button onClick={() => setIsScheduled(true)} className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase transition ${isScheduled ? 'bg-vk-blue text-white shadow' : 'text-text-muted hover:text-text-main'}`}>📅 Планировщик</button>
                            </div>
                        </div>
                        
                        {isScheduled && (
                            <div 
                                className="animate-fade-in bg-main border border-border-main rounded-xl p-4 cursor-pointer hover:border-vk-blue transition-colors group relative"
                                onClick={handleDateContainerClick}
                            >
                                <label className="text-xs font-bold text-text-muted uppercase block mb-2 cursor-pointer group-hover:text-vk-blue transition-colors pointer-events-none">Время старта</label>
                                <input 
                                    ref={dateInputRef}
                                    type="datetime-local" 
                                    value={scheduledTime}
                                    onChange={e => setScheduledTime(e.target.value)}
                                    className="w-full bg-subpanel border border-border-main rounded-lg px-3 py-3 text-sm text-text-main outline-none focus:border-vk-blue cursor-pointer font-bold"
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-5">
                            
                            {/* STRATEGY SWITCHER (Sequential / Parallel) */}
                            <div className="w-full">
                                <label className="text-xs font-bold text-text-muted uppercase block mb-2">Стратегия выполнения</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setExecutionMode('sequential')}
                                        className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${executionMode === 'sequential' ? 'bg-vk-blue text-white border-vk-blue shadow-md' : 'bg-main border-border-main text-text-muted hover:text-text-main hover:border-vk-blue/30'}`}
                                    >
                                        <div className="font-bold text-xs uppercase mb-1">По очереди</div>
                                        <div className="text-[9px] opacity-70">1 поток. Безопасно.</div>
                                    </button>
                                    <button 
                                        onClick={() => setExecutionMode('parallel')}
                                        className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${executionMode === 'parallel' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-main border-border-main text-text-muted hover:text-text-main hover:border-purple-500/30'}`}
                                    >
                                        <div className="font-bold text-xs uppercase mb-1 flex items-center gap-1"><LightningIcon className="w-3 h-3"/> Параллельно</div>
                                        <div className="text-[9px] opacity-70">Турбо режим (Micro-Batching)</div>
                                    </button>
                                </div>
                                {executionMode === 'parallel' && (
                                    <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2 flex items-start gap-2 animate-fade-in">
                                        <ExclamationIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <div className="text-[10px] text-text-main leading-snug">
                                            <span className="font-bold text-red-500">ВНИМАНИЕ!</span> Используйте только с качественными прокси. Высокий риск бана по IP при работе с одного адреса.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Delay Mode Switch */}
                            <div className="w-full">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-text-muted uppercase block">Режим задержки</label>
                                    <div className="flex bg-main rounded-lg p-0.5 border border-border-main">
                                        <button 
                                            onClick={() => setDelayMode('manual')} 
                                            className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition flex items-center gap-1 ${delayMode === 'manual' ? 'bg-vk-blue text-white shadow' : 'text-text-muted hover:text-text-main'}`}
                                        >
                                            🛠️ Вручную
                                        </button>
                                        <button 
                                            onClick={() => setDelayMode('auto')} 
                                            className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition flex items-center gap-1 ${delayMode === 'auto' ? 'bg-green-500 text-white shadow' : 'text-text-muted hover:text-text-main'}`}
                                        >
                                            🤖 Авто
                                        </button>
                                    </div>
                                </div>

                                {delayMode === 'manual' ? (
                                    <div className="flex items-center gap-3 animate-fade-in">
                                        <div className="relative flex-1">
                                            <input 
                                                type="number" 
                                                step="0.1" 
                                                value={delayMin} 
                                                onChange={e => setDelayMin(Number(e.target.value))} 
                                                className="w-full bg-main border border-border-main rounded-xl pl-2 pr-8 py-3 text-base text-center outline-none focus:border-vk-blue font-mono font-bold" 
                                                min={0.1} 
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-bold pointer-events-none">сек</span>
                                        </div>
                                        <span className="text-text-muted font-bold">—</span>
                                        <div className="relative flex-1">
                                            <input 
                                                type="number" 
                                                step="0.1" 
                                                value={delayMax} 
                                                onChange={e => setDelayMax(Number(e.target.value))} 
                                                className="w-full bg-main border border-border-main rounded-xl pl-2 pr-8 py-3 text-base text-center outline-none focus:border-vk-blue font-mono font-bold" 
                                                min={0.1} 
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-bold pointer-events-none">сек</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-start gap-3 animate-fade-in">
                                        <RobotIcon className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                        <div className="text-xs text-text-muted leading-relaxed">
                                            <span className="font-bold text-green-500 block mb-1">Адаптивный режим</span>
                                            Система сама подберет безопасные интервалы на основе здоровья каждого аккаунта.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Time Window */}
                            <div className="w-full">
                                <label className="text-xs font-bold text-text-muted uppercase block mb-2">Окно работы (Часы)</label>
                                <div className="flex items-center gap-3">
                                    <select value={workStart} onChange={e => setWorkStart(Number(e.target.value))} className="flex-1 bg-main border border-border-main rounded-xl px-2 py-3 text-sm text-center outline-none focus:border-vk-blue appearance-none font-bold cursor-pointer hover:bg-hover transition">
                                        {Array.from({length: 25}, (_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                    <span className="text-text-muted font-bold">➜</span>
                                    <select value={workEnd} onChange={e => setWorkEnd(Number(e.target.value))} className="flex-1 bg-main border border-border-main rounded-xl px-2 py-3 text-sm text-center outline-none focus:border-vk-blue appearance-none font-bold cursor-pointer hover:bg-hover transition">
                                        {Array.from({length: 25}, (_, i) => <option key={i} value={i}>{i}:00</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. FILTERS */}
                <div className="p-6 bg-subpanel/10">
                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">🛡️ Фильтры</h3>
                    <div className="bg-subpanel rounded-xl p-4 border border-border-main space-y-4">
                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-sm font-bold text-text-main group-hover:text-vk-blue transition-colors">Не писать, если есть диалог</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={skipIfDialogExists} onChange={e => setSkipIfDialogExists(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500 shadow-sm"></div>
                            </div>
                        </label>
                        
                        <label className="flex items-center justify-between cursor-pointer group pt-3 border-t border-border-main/50">
                            <span className="text-sm font-bold text-text-main group-hover:text-vk-blue transition-colors">Сбрасывать статус на "Новый"</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={resetStatusNew} onChange={e => setResetStatusNew(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500 shadow-sm"></div>
                            </div>
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group pt-3 border-t border-border-main/50">
                            <span className="text-sm font-bold text-text-main group-hover:text-green-500 transition-colors flex items-center gap-2">
                                <UserGroupIcon className="w-4 h-4 text-green-500" />
                                Добавлять в друзья
                            </span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={addFriends} onChange={e => setAddFriends(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 shadow-sm"></div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* 4. LOGS HEADER */}
            <div className="p-4 border-b border-border-main bg-subpanel/50 backdrop-blur flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="relative"><div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div><div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute inset-0 opacity-50"></div></div>
                    <h3 className="font-bold text-text-main text-xs uppercase tracking-wide">Live Monitor</h3>
                </div>
            </div>
            
            {/* 5. LOGS LIST */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-main font-mono text-[11px] custom-scrollbar min-h-[150px]">
                {filteredLogs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50">
                        <div className="text-5xl mb-3 grayscale">📜</div>
                        <div>Ожидание запуска...</div>
                    </div>
                )}
                
                {filteredLogs.slice(0, 100).map((log) => {
                    // Match strict format [ID:12345] or [ID:-12345]
                    const idMatch = log.message.match(/\[ID:(-?\d+)\]/);
                    let displayMessage = log.message.replace(/^\$/, ''); 
                    let clickableId = null;
                    if (idMatch && idMatch[1]) clickableId = idMatch[1];

                    const isReport = log.message.startsWith('$REPORT:');
                    const isError = log.level === 'ERROR';
                    const recipientName = clickableId ? getRecipientName(clickableId) : clickableId;

                    return (
                        <div 
                            key={log.id} 
                            className={`flex gap-3 pb-2 border-b border-border-main/50 animate-fade-in 
                                ${isError ? 'text-red-400' : 'text-green-400'} 
                                ${isReport ? 'bg-[#1e293b] border border-pink-500/50 p-4 rounded-xl my-4 text-xs text-text-main shadow-lg relative overflow-hidden' : ''}`
                            }
                        >
                            {!isReport ? (
                                <>
                                    <div className="opacity-50 min-w-[80px] whitespace-nowrap">{formatLogTime(log.timestamp)}</div>
                                    <div className="font-bold">{isError ? '✖' : '✔'}</div>
                                    <div className="flex-1 break-words leading-relaxed text-text-muted">
                                        {clickableId ? (
                                            <>
                                                {displayMessage.split(`[ID:${clickableId}]`)[0]}
                                                <span 
                                                    onClick={() => onGoToChat && onGoToChat(clickableId!)} 
                                                    className="cursor-pointer hover:underline text-vk-blue hover:text-white transition-colors font-bold px-1" 
                                                    title={`Открыть диалог с ID: ${clickableId}`}
                                                >
                                                    {recipientName}
                                                </span>
                                                {displayMessage.split(`[ID:${clickableId}]`)[1]}
                                            </>
                                        ) : displayMessage}
                                    </div>
                                </>
                            ) : (
                                <div className="w-full relative z-10">
                                    {/* Report Content Parsing */}
                                    <div className="font-bold text-green-400 mb-3 text-sm border-b border-gray-600 pb-2">
                                        {displayMessage.split('\n')[0].replace('REPORT:', '')}
                                    </div>
                                    <div className="space-y-1.5 font-mono text-gray-300">
                                        {displayMessage.split('\n').slice(1).map((line, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                {line}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Decorative background glow */}
                                    <div className="absolute -top-10 -right-10 w-20 h-20 bg-pink-500/20 rounded-full blur-xl pointer-events-none"></div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};
