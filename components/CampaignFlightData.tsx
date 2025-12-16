
import React, { useState } from 'react';
import { Account } from '../types';
import { RocketIcon, QuestionIcon } from './icons';
import { calculateDetailedRisk } from './utils';

interface CampaignFlightDataProps {
    recipientsCount: number; // Total Workload
    riskyRecipientsCount?: number; // New Contacts (Health Basis)
    selectedAccounts: Account[];
    spintaxScore: number;
    minDelay: number;
    maxDelay: number;
    onContextMenu?: (e: React.MouseEvent, id: number) => void;
}

export const CampaignFlightData: React.FC<CampaignFlightDataProps> = ({ 
    recipientsCount, 
    riskyRecipientsCount,
    selectedAccounts, 
    spintaxScore,
    minDelay,
    maxDelay,
    onContextMenu
}) => {
    const [showHint, setShowHint] = useState(false);
    const [hoveredAccId, setHoveredAccId] = useState<number | null>(null);

    // Default risky to total if not provided
    const safeRiskyCount = riskyRecipientsCount !== undefined ? riskyRecipientsCount : recipientsCount;

    const avgDelay = (minDelay + maxDelay) / 2;
    const accountsCount = selectedAccounts.length;
    
    // Calculate loads
    const totalLoadPerAccount = accountsCount > 0 ? Math.ceil(recipientsCount / accountsCount) : 0;
    const riskyLoadPerAccount = accountsCount > 0 ? Math.ceil(safeRiskyCount / accountsCount) : 0;
    
    const totalSeconds = accountsCount > 0 ? (recipientsCount / accountsCount) * avgDelay : 0;
    const timeString = totalSeconds > 3600 
        ? `${(totalSeconds / 3600).toFixed(1)} ч.` 
        : `${Math.ceil(totalSeconds / 60)} мин.`;

    return (
        <div className="bg-panel border border-border-main rounded-xl p-4 shadow-sm flex flex-col h-full max-h-[350px] relative">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border-main pb-2 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><RocketIcon className="w-4 h-4" /> Полетные данные</div>
                <button 
                    onClick={() => setShowHint(!showHint)}
                    className={`p-1 rounded hover:bg-hover transition ${showHint ? 'text-vk-blue' : 'text-text-muted'}`}
                >
                    <QuestionIcon className="w-3.5 h-3.5" />
                </button>
            </h3>
            
            {showHint && (
                <div className="absolute top-10 left-4 right-4 z-20 bg-panel border border-vk-blue/50 shadow-2xl rounded-xl p-3 text-[10px] text-text-main animate-fade-in space-y-2">
                    <p className="font-bold text-vk-blue">Советы по безопасности (v2.0)</p>
                    <ul className="list-disc pl-3 space-y-1 text-text-muted">
                        <li><b>Задержка:</b> Держите среднюю задержку выше 60 секунд.</li>
                        <li><b>Лимиты:</b> Система наказывает за приближение к лимиту аккаунта. Лучше отправлять 50% от лимита.</li>
                        <li><b>Уникальность:</b> Добавьте минимум 3-5 вариантов текста.</li>
                        <li><b>Малые партии:</b> Отправка менее 7 сообщений считается безопасной ("Микро-партия").</li>
                        <li><b>Остывание:</b> Риск автоматически снижается, если аккаунт отдыхал последние часы (даже если 24ч еще не прошло).</li>
                    </ul>
                    <button onClick={() => setShowHint(false)} className="w-full text-center text-xs font-bold text-vk-blue mt-2 pt-2 border-t border-border-main">Закрыть</button>
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="text-[10px] text-text-muted uppercase font-bold">Время выполнения</div>
                    <div className="text-lg font-mono font-bold text-text-main">{timeString}</div>
                </div>
                <div>
                    <div className="text-[10px] text-text-muted uppercase font-bold">Нагрузка (на акк)</div>
                    <div className="text-lg font-mono font-bold text-text-main" title={`Всего: ${totalLoadPerAccount}, Новых: ${riskyLoadPerAccount}`}>
                        ~{totalLoadPerAccount} сообщ.
                    </div>
                    {riskyLoadPerAccount !== totalLoadPerAccount && (
                        <div className="text-[9px] text-text-muted">(из них новых: {riskyLoadPerAccount})</div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 relative">
                {selectedAccounts.length === 0 && <div className="text-xs text-text-muted italic text-center py-4">Нет выбранных аккаунтов</div>}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {selectedAccounts.map(acc => {
                        const accLimit = acc.day_limit || 20;
                        const usedToday = acc.messages_sent_today || 0;
                        const lastActivity = acc.last_activity_at;
                        const currentHp = acc.health_score !== undefined ? acc.health_score : 100;

                        // Use RISKY load for calculation, passing current usage and last activity
                        const details = calculateDetailedRisk(
                            riskyLoadPerAccount, 
                            avgDelay, 
                            spintaxScore, 
                            accLimit,
                            usedToday,
                            lastActivity
                        );
                        
                        // Calculate projected health based on ACTUAL current health
                        const healthEnd = Math.max(0, currentHp - details.totalRisk);
                        const isHovered = hoveredAccId === acc.id;
                        
                        // Determine visual style based on PROJECTED health
                        let borderColor = 'border-green-500/30';
                        let textColor = 'text-green-500';
                        let healthColor = 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'; // Default Green Glow
                        
                        if (healthEnd < 75) { 
                            borderColor = 'border-yellow-500/50'; 
                            textColor = 'text-yellow-500';
                            healthColor = 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]';
                        }
                        if (healthEnd <= 25) { // Adjusted logic for red zone
                            borderColor = 'border-red-500/50'; 
                            textColor = 'text-red-500';
                            healthColor = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
                        }

                        // Override styling on hover
                        const containerClass = isHovered 
                            ? 'bg-gray-800 border-vk-blue shadow-lg' 
                            : `bg-subpanel ${borderColor}`;

                        return (
                            <div 
                                key={acc.id} 
                                onContextMenu={(e) => onContextMenu && onContextMenu(e, acc.id)}
                                onMouseEnter={() => setHoveredAccId(acc.id)}
                                onMouseLeave={() => setHoveredAccId(null)}
                                className={`${containerClass} rounded-xl border-2 transition-all duration-200 flex flex-col p-2.5 cursor-pointer relative h-[92px]`}
                            >
                                {!isHovered ? (
                                    // STANDARD VIEW
                                    <div className="flex flex-col h-full justify-between animate-fade-in">
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-bold text-text-main truncate" title={acc.name}>{acc.name}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-mono">
                                            <span className="text-text-muted text-[10px] uppercase font-bold">Health</span>
                                            <div className="flex items-center gap-1">
                                                <span className={`${currentHp < 100 ? 'text-yellow-500' : 'text-green-500/50'}`}>{currentHp}</span>
                                                <span className="text-text-muted">→</span>
                                                <span className={`font-bold text-sm ${textColor}`}>{healthEnd}%</span>
                                            </div>
                                        </div>
                                        
                                        {/* 4-SEGMENT HEALTH BAR (Projected) */}
                                        <div className="w-full h-2 flex gap-1 mt-1">
                                            {[0, 1, 2, 3].map(i => {
                                                // Calculate fill for this segment based on healthEnd (projected)
                                                // i=0 (0-25), i=1 (26-50), i=2 (51-75), i=3 (76-100)
                                                const val = Math.min(Math.max((healthEnd - (i * 25)) * 4, 0), 100);
                                                
                                                return (
                                                    <div key={i} className="flex-1 bg-black/40 rounded-[1px] border border-white/5 overflow-hidden relative">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${healthColor}`} 
                                                            style={{ width: `${val}%` }}
                                                        ></div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    // HOVER DETAILS VIEW (Swapped Content)
                                    <div className="flex flex-col h-full justify-between animate-fade-in text-[10px]">
                                        <div className="flex justify-between items-center border-b border-gray-600 pb-1">
                                            <span className="text-gray-400 uppercase font-bold">Лимит</span>
                                            <span className="font-mono font-bold text-white">{riskyLoadPerAccount + usedToday} / {accLimit}</span>
                                        </div>

                                        <div className="space-y-0.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400">Нагрузка</span>
                                                <span className={details.loadPenalty > 0 ? "text-red-400 font-bold" : "text-green-500"}>
                                                    {details.loadPenalty > 0 ? `-${details.loadPenalty}%` : 'OK'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400">Скорость</span>
                                                <span className={details.speedPenalty > 0 ? "text-red-400 font-bold" : "text-green-500"}>
                                                    {details.speedPenalty > 0 ? `-${details.speedPenalty}%` : 'OK'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400">Спинтакс</span>
                                                <span className={details.contentPenalty > 0 ? "text-red-400 font-bold" : "text-green-500"}>
                                                    {details.contentPenalty > 0 ? `-${details.contentPenalty}%` : 'OK'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
