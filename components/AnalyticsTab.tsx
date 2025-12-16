
import React, { useEffect, useState, useMemo } from 'react';
import { get } from '../apiClient';
import { AnalyticsStats, CrmStatus } from '../types';
import { ChartBarIcon, RefreshIcon, ExclamationIcon, UsersIcon, InfoIcon, LightningIcon } from './icons';
import { CRM_STATUS_LABELS } from './StatusBadge';

interface AnalyticsTabProps {
    isActive: boolean;
}

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="group relative inline-block ml-2">
        <InfoIcon className="w-4 h-4 text-text-muted cursor-help opacity-50 hover:opacity-100" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black/90 text-white text-[10px] p-2 rounded shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center leading-tight">
            {text}
        </div>
    </div>
);

const DonutChart = ({ data, size = 160, centerLabel, centerSub }: { data: { value: number, color: string }[], size?: number, centerLabel: string | number, centerSub?: string }) => {
    const total = data.reduce((acc, cur) => acc + cur.value, 0);
    const radius = size / 2 - 10; 
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    if (total === 0) {
        return (
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <div className="w-full h-full rounded-full border-4 border-subpanel box-border"></div>
                <div className="absolute text-xs text-text-muted">Нет данных</div>
            </div>
        );
    }

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {data.map((item, i) => {
                    const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
                    const strokeDashoffset = -accumulatedOffset;
                    accumulatedOffset += (item.value / total) * circumference;
                    
                    return (
                        <circle
                            key={i}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round" 
                            className="transition-all duration-1000 ease-out hover:opacity-80"
                        />
                    );
                })}
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-text-main">{centerLabel}</span>
                {centerSub && <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{centerSub}</span>}
            </div>
        </div>
    );
};

const AreaChart = ({ data, height = 200 }: { data: { label: string, sent: number, received: number }[], height?: number }) => {
    if (!data || data.length === 0) return null;

    const maxVal = Math.max(...data.map(d => Math.max(d.sent, d.received)), 5); 
    const width = 1000; 
    const padding = 20;
    
    const getX = (index: number) => (index / (data.length - 1)) * (width - padding * 2) + padding;
    const getY = (val: number) => height - (val / maxVal) * (height - padding * 2) - padding;

    const createPath = (key: 'sent' | 'received') => {
        let path = `M ${getX(0)} ${getY(data[0][key])}`;
        for (let i = 1; i < data.length; i++) {
            path += ` L ${getX(i)} ${getY(data[i][key])}`;
        }
        return path;
    };

    const createArea = (key: 'sent' | 'received') => {
        let path = `M ${getX(0)} ${height} L ${getX(0)} ${getY(data[0][key])}`;
        for (let i = 1; i < data.length; i++) {
            path += ` L ${getX(i)} ${getY(data[i][key])}`;
        }
        path += ` L ${getX(data.length - 1)} ${height} Z`;
        return path;
    };

    return (
        <div className="w-full relative group">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                </defs>

                <line x1="0" y1={height - padding} x2={width} y2={height - padding} stroke="var(--color-border)" strokeWidth="1" />
                <line x1="0" y1={padding} x2={width} y2={padding} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4" opacity="0.3" />

                <path d={createArea('received')} fill="url(#gradRec)" />
                <path d={createPath('received')} fill="none" stroke="#3b82f6" strokeWidth="3" />

                <path d={createArea('sent')} fill="url(#gradSent)" />
                <path d={createPath('sent')} fill="none" stroke="#22c55e" strokeWidth="3" />

                {data.map((d, i) => (
                    <g key={i} className="group/point">
                        <circle cx={getX(i)} cy={getY(d.sent)} r="4" fill="#22c55e" stroke="var(--color-bg-panel)" strokeWidth="2" />
                        <circle cx={getX(i)} cy={getY(d.received)} r="4" fill="#3b82f6" stroke="var(--color-bg-panel)" strokeWidth="2" />
                        
                        <foreignObject x={getX(i) - 50} y={0} width="100" height="100%" className="opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none">
                            <div className="flex flex-col items-center justify-end h-full pb-8">
                                <div className="bg-panel border border-border-main shadow-xl rounded px-2 py-1 text-[10px] whitespace-nowrap z-50">
                                    <div className="font-bold mb-1">{d.label}</div>
                                    <div className="text-green-500">Отпр: {d.sent}</div>
                                    <div className="text-blue-500">Ответ: {d.received}</div>
                                </div>
                            </div>
                        </foreignObject>
                    </g>
                ))}
            </svg>
            
            <div className="flex justify-between mt-2 px-2 text-[10px] text-text-muted font-mono">
                {data.map((d, i) => <div key={i}>{d.label}</div>)}
            </div>
        </div>
    );
};

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ isActive }) => {
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [vkStats, setVkStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [vkLoading, setVkLoading] = useState(false);
    const [campaignFilter, setCampaignFilter] = useState<string>('all');

    const fetchStats = async () => {
        setLoading(true);
        try {
            const endpoint = campaignFilter === 'all' ? 'analytics' : `analytics?campaign=${encodeURIComponent(campaignFilter)}`;
            const data = await get<AnalyticsStats>(endpoint);
            setStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchVkStats = async () => {
        setVkLoading(true);
        try {
            const data = await get<any[]>('analytics/vk-stats');
            setVkStats(data || []);
        } catch (e) {
            console.error("VK Stats Error", e);
        } finally {
            setVkLoading(false);
        }
    };

    useEffect(() => {
        if (isActive) {
            fetchStats();
            fetchVkStats();
        }
    }, [isActive, campaignFilter]);

    const donutData = useMemo(() => {
        if (!stats) return [];
        return [
            { value: stats.total_sent, color: '#22c55e' }, 
            { value: stats.error_breakdown.reduce((a, b) => a + b.count, 0), color: '#ef4444' }, 
            { value: Math.max(0, stats.total_recipients - stats.total_sent - stats.error_breakdown.reduce((a, b) => a + b.count, 0)), color: '#3b82f6' } 
        ];
    }, [stats]);

    const timelineChartData = useMemo(() => {
        if (!stats) return [];
        return stats.timeline_data.map(d => ({
            label: d.date,
            sent: d.sent,
            received: d.received
        }));
    }, [stats]);

    const renderHeatmap = () => {
        if (!stats) return null;
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const hours = [0, 3, 6, 9, 12, 15, 18, 21];
        const allHours = Array.from({length: 24}, (_, i) => i);
        
        const maxVal = Math.max(...stats.heatmap_data.map(d => d.value), 1);
        const valMap = new Map();
        stats.heatmap_data.forEach(d => valMap.set(`${d.day}-${d.hour}`, d.value));

        return (
            <div className="overflow-x-auto pb-2">
                <div className="min-w-[500px]">
                     <div className="flex mb-1">
                         <div className="w-8"></div>
                         {allHours.map(h => (
                             <div key={h} className="flex-1 text-[9px] text-text-muted text-center relative h-4">
                                {hours.includes(h) && <span className="absolute left-1/2 -translate-x-1/2">{h}</span>}
                             </div>
                         ))}
                     </div>
                     {days.map((d, dIdx) => (
                         <div key={d} className="flex h-7 mb-1 items-center">
                             <div className="w-8 text-[10px] font-bold text-text-muted">{d}</div>
                             {allHours.map(h => {
                                 const val = valMap.get(`${dIdx}-${h}`) || 0;
                                 const intensity = val / maxVal;
                                 
                                 return (
                                     <div key={h} className="flex-1 px-[1px] h-full relative group">
                                         <div 
                                            className={`w-full h-full rounded-sm transition-all ${val > 0 ? 'bg-vk-blue' : 'bg-subpanel/50'}`}
                                            style={{ opacity: val > 0 ? 0.3 + (intensity * 0.7) : 1 }}
                                         ></div>
                                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                                             {d} {h}:00 — {val} сообщ.
                                         </div>
                                     </div>
                                 )
                             })}
                         </div>
                     ))}
                     <div className="flex justify-end items-center gap-2 mt-2 text-[10px] text-text-muted">
                         <span>Меньше</span>
                         <div className="flex gap-1">
                             <div className="w-3 h-3 bg-subpanel rounded-sm"></div>
                             <div className="w-3 h-3 bg-vk-blue/30 rounded-sm"></div>
                             <div className="w-3 h-3 bg-vk-blue/60 rounded-sm"></div>
                             <div className="w-3 h-3 bg-vk-blue rounded-sm"></div>
                         </div>
                         <span>Больше</span>
                     </div>
                </div>
            </div>
        );
    };

    if (!stats) return (
        <div className="h-full flex flex-col items-center justify-center text-text-muted">
            <div className={`text-xl font-light ${loading ? 'animate-pulse' : ''}`}>
                {loading ? 'Сбор данных...' : 'Подключение к аналитике...'}
            </div>
        </div>
    );

    return (
        <div className="w-full h-full bg-main text-text-main overflow-y-auto custom-scrollbar p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8 pb-10">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg text-white shadow-lg">
                                <ChartBarIcon className="w-6 h-6" />
                            </span>
                            Аналитика
                        </h1>
                        <p className="text-text-muted text-sm mt-1 ml-1">Мониторинг эффективности рассылок и статусов CRM</p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-panel p-1 rounded-xl border border-border-main shadow-sm">
                         <select 
                            value={campaignFilter}
                            onChange={e => setCampaignFilter(e.target.value)}
                            className="bg-transparent text-text-main text-sm font-bold py-2 px-3 outline-none cursor-pointer hover:text-vk-blue transition min-w-[180px]"
                        >
                            <option value="all">📁 Все кампании</option>
                            {stats.available_campaigns.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <div className="w-px h-6 bg-border-main"></div>
                        <button 
                            onClick={() => { fetchStats(); fetchVkStats(); }}
                            className={`p-2 rounded-lg hover:bg-hover text-text-muted hover:text-text-main transition ${loading ? 'animate-spin' : ''}`}
                            title="Обновить данные"
                        >
                            <RefreshIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* SECTION 0: ACCOUNT PULSE (REAL-TIME VK DATA) */}
                <div className="bg-panel p-6 rounded-2xl border border-border-main shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <LightningIcon className="w-5 h-5 text-yellow-500" />
                            Пульс Аккаунтов (VK Real-time)
                        </h3>
                        {vkLoading && <span className="text-xs text-text-muted animate-pulse">Обновление данных из VK...</span>}
                    </div>
                    
                    {vkStats.length === 0 ? (
                        <div className="text-center text-text-muted text-sm py-4">Нет активных аккаунтов для проверки</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {vkStats.map(acc => (
                                <div key={acc.id} className="bg-subpanel/50 rounded-xl p-4 border border-border-main flex items-center gap-4">
                                    <div className="relative">
                                        <img src={acc.avatar} className="w-12 h-12 rounded-full object-cover border border-border-main" alt="" />
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-subpanel"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm truncate mb-2">{acc.name}</div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <div className="text-[10px] text-text-muted uppercase font-bold">Входящие</div>
                                                <div className={`font-mono font-bold ${acc.incoming > 0 ? 'text-green-500' : 'text-text-main'}`}>{acc.incoming}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-text-muted uppercase font-bold">Исходящие</div>
                                                <div className={`font-mono font-bold ${acc.outgoing > 0 ? 'text-yellow-500' : 'text-text-main'}`}>{acc.outgoing}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-text-muted uppercase font-bold">Друзья</div>
                                                <div className="font-mono font-bold text-text-main">{acc.friends}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SECTION 1: KEY METRICS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-panel p-5 rounded-2xl border border-border-main shadow-sm flex flex-col justify-between group hover:border-vk-blue/30 transition-all">
                        <div className="text-text-muted text-xs uppercase font-bold tracking-wider mb-2 flex items-center justify-between">
                            База
                            <UsersIcon className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity text-vk-blue" />
                        </div>
                        <div className="text-4xl font-black text-text-main">{stats.total_recipients}</div>
                    </div>
                    <div className="bg-panel p-5 rounded-2xl border border-border-main shadow-sm flex flex-col justify-between group hover:border-green-500/30 transition-all">
                        <div className="text-text-muted text-xs uppercase font-bold tracking-wider mb-2 flex items-center justify-between">
                            Отправлено
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        </div>
                        <div className="text-4xl font-black text-green-500">{stats.total_sent}</div>
                    </div>
                    <div className="bg-panel p-5 rounded-2xl border border-border-main shadow-sm flex flex-col justify-between group hover:border-blue-500/30 transition-all">
                        <div className="text-text-muted text-xs uppercase font-bold tracking-wider mb-2 flex items-center justify-between">
                            Доставляемость
                            <Tooltip text="% успешно отправленных сообщений от общей базы" />
                        </div>
                        <div className="text-4xl font-black text-blue-500">{stats.success_rate_percent}%</div>
                    </div>
                    <div className="bg-panel p-5 rounded-2xl border border-border-main shadow-sm flex flex-col justify-between group hover:border-purple-500/30 transition-all">
                         <div className="text-text-muted text-xs uppercase font-bold tracking-wider mb-2">Топ Кампания</div>
                         <div className="text-lg font-bold text-purple-500 truncate leading-tight" title={stats.top_campaigns[0]?.name}>
                             {stats.top_campaigns[0]?.name || '—'}
                         </div>
                         <div className="text-xs text-text-muted mt-1">{stats.top_campaigns[0]?.count || 0} чел.</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* SECTION 2: TIMELINE (Main Chart) */}
                    <div className="lg:col-span-2 bg-panel p-6 rounded-2xl border border-border-main shadow-sm flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold">Динамика активности</h3>
                                <p className="text-xs text-text-muted">Отправленные сообщения и полученные ответы за 7 дней</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span> Рассылка
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                                    <span className="w-3 h-3 rounded-full bg-blue-500"></span> Ответы
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-[200px]">
                            <AreaChart data={timelineChartData} height={220} />
                        </div>
                    </div>

                    {/* SECTION 3: TECHNICAL DONUT */}
                    <div className="bg-panel p-6 rounded-2xl border border-border-main shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                        <h3 className="text-lg font-bold absolute top-6 left-6">Статус базы</h3>
                        <div className="mt-8">
                            <DonutChart 
                                data={donutData} 
                                size={180} 
                                centerLabel={stats.total_recipients} 
                                centerSub="ВСЕГО"
                            />
                        </div>
                        <div className="w-full mt-8 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2 font-bold text-text-muted"><div className="w-2 h-2 rounded-full bg-green-500"></div> Отправлено</div>
                                <div className="font-mono">{stats.total_sent}</div>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2 font-bold text-text-muted"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Очередь</div>
                                <div className="font-mono">{Math.max(0, stats.total_recipients - stats.total_sent - stats.error_breakdown.reduce((a,b)=>a+b.count,0))}</div>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2 font-bold text-text-muted"><div className="w-2 h-2 rounded-full bg-red-500"></div> Ошибки</div>
                                <div className="font-mono">{stats.error_breakdown.reduce((a,b)=>a+b.count,0)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* SECTION 4: HEATMAP */}
                    <div className="bg-panel p-6 rounded-2xl border border-border-main shadow-sm flex flex-col">
                        <div className="mb-6 flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold">Тепловая карта ответов</h3>
                                <p className="text-xs text-text-muted">В какое время клиенты наиболее активны (входящие)</p>
                            </div>
                        </div>
                        <div className="flex-1 flex items-center">
                            {renderHeatmap()}
                        </div>
                    </div>

                    {/* SECTION 5: ERRORS */}
                    <div className="bg-panel p-6 rounded-2xl border border-border-main shadow-sm flex flex-col">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <ExclamationIcon className="w-5 h-5 text-red-500"/>
                                Анализ ошибок
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                             {stats.error_breakdown.length === 0 ? (
                                 <div className="text-center text-text-muted text-sm italic py-10 opacity-50 bg-subpanel/30 rounded-xl border border-dashed border-border-main">
                                     Ошибок нет! 🎉<br/>Система работает идеально.
                                 </div>
                             ) : (
                                 stats.error_breakdown.map((err, idx) => (
                                     <div key={idx} className="group">
                                         <div className="flex justify-between text-xs mb-1.5 font-bold">
                                             <span className="text-text-main group-hover:text-red-400 transition-colors">{err.name}</span>
                                             <span className="text-text-muted">{err.count}</span>
                                         </div>
                                         <div className="h-2.5 bg-subpanel rounded-full overflow-hidden">
                                             <div 
                                                className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                                                style={{ width: `${(err.count / stats.error_breakdown[0].count) * 100}%`, backgroundColor: err.color }}
                                             >
                                                 <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                             </div>
                                         </div>
                                     </div>
                                 ))
                             )}
                        </div>
                    </div>
                </div>

                {/* SECTION 6: CRM FUNNEL (Simple Bar Representation) */}
                <div className="bg-panel p-6 rounded-2xl border border-border-main shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Воронка продаж (CRM)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {['new', 'progress', 'hot', 'success', 'reject'].map(status => {
                            const item = stats.crm_distribution.find(d => d.name === status);
                            const val = item ? item.value : 0;
                            const label = CRM_STATUS_LABELS[status as keyof typeof CRM_STATUS_LABELS];
                            const color = item ? item.fill : '#555';
                            
                            return (
                                <div key={status} className="bg-subpanel/50 rounded-xl p-4 border border-border-main flex flex-col items-center text-center relative overflow-hidden group">
                                    <div className={`absolute top-0 left-0 w-full h-1`} style={{ backgroundColor: color }}></div>
                                    <div className="text-xs font-bold text-text-muted uppercase mb-2">{label}</div>
                                    <div className="text-2xl font-black text-text-main group-hover:scale-110 transition-transform">{val}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};
