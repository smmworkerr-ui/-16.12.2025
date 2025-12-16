

import React, { useState, useEffect } from 'react';
import { get, post } from '../apiClient';
import { TrashIcon, UserGroupIcon, RefreshIcon } from './icons';
import { ConfirmModal } from './ConfirmModal';

interface ActiveCampaignsModalProps {
    onClose: () => void;
    onRefresh: () => void;
}

export const CampaignActiveModal: React.FC<ActiveCampaignsModalProps> = ({ onClose, onRefresh }) => {
    const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
    const [expandedAccounts, setExpandedAccounts] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<any>({});
    
    // Queue State
    const [queueData, setQueueData] = useState<any[]>([]);
    const [isLoadingQueue, setIsLoadingQueue] = useState(false);
    const [showQueue, setShowQueue] = useState(false);

    // Confirmation Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => Promise<void>;
        isLoading: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        action: async () => {},
        isLoading: false
    });

    const fetchActive = async () => {
        setIsLoading(true);
        try {
            const data = await get<any[]>('campaigns/active');
            setActiveCampaigns(data || []);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchActive();
        const interval = setInterval(fetchActive, 2000);
        return () => clearInterval(interval);
    }, []);

    // Fetch queue when expanded and showQueue is true
    useEffect(() => {
        if (expandedCampaign && showQueue) {
            fetchQueue(expandedCampaign);
        }
    }, [expandedCampaign, showQueue]);

    const fetchQueue = async (campaignName: string) => {
        setIsLoadingQueue(true);
        try {
            const data = await get<any[]>(`campaigns/queue?campaign_name=${encodeURIComponent(campaignName)}`);
            setQueueData(data || []);
        } catch (e) { console.error(e); }
        finally { setIsLoadingQueue(false); }
    };

    // --- Actions ---

    const executeAction = async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
            await confirmState.action();
            setConfirmState(prev => ({ ...prev, isOpen: false }));
        } catch (e: any) {
            console.error("Action failed:", e);
            alert("Ошибка выполнения: " + e.message);
        } finally {
            setConfirmState(prev => ({ ...prev, isLoading: false }));
        }
    };

    const openConfirm = (title: string, message: string, action: () => Promise<void>) => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            action,
            isLoading: false
        });
    };

    const handleStop = (name: string) => {
        openConfirm(
            "Остановка кампании",
            `Вы уверены, что хотите остановить рассылку "${name}"?`,
            async () => {
                console.log(`Sending STOP signal for ${name}`);
                // Changed from 'stop-campaign' to 'mission/stop' to avoid AdBlock/Network errors
                await post('mission/stop', { campaign_name: name });
                setTimeout(fetchActive, 500);
            }
        );
    };

    const handleForceDelete = (name: string) => {
        openConfirm(
            "Принудительное удаление",
            `⚠️ ПРИНУДИТЕЛЬНО УДАЛИТЬ "${name}" из списка?\nИспользуйте это, если кампания зависла или не удаляется.`,
            async () => {
                console.log(`Sending FORCE CLEANUP for ${name}`);
                await post('campaigns/cleanup', { campaign_name: name, delete_files: false });
                setTimeout(fetchActive, 500);
            }
        );
    };

    const handleRemoveAccount = (campaignName: string, accId: number) => {
        openConfirm(
            "Исключение аккаунта",
            "Исключить этот аккаунт из текущей рассылки?",
            async () => {
                await post('campaigns/exclude-account', { campaign_name: campaignName, account_id: accId });
                fetchActive();
            }
        );
    };

    const handleSkipRecipient = async (recId: number) => {
        try {
            await post('campaigns/skip-recipient', { id: recId });
            // Optimistically update list
            setQueueData(prev => prev.filter(r => r.id !== recId));
        } catch (e: any) {
            alert("Ошибка: " + e.message);
        }
    };

    const handleApplySettings = async (campaignName: string) => {
        const val = editValues[campaignName];
        if (!val) return;
        try {
            await post('campaigns/update-settings', {
                campaign_name: campaignName,
                delay_min: val.delay_min,
                delay_max: val.delay_max,
                work_start: val.work_start,
                work_end: val.work_end,
                skip_if_dialog_exists: val.skip_if_dialog_exists
            });
            alert("Настройки обновлены!");
            fetchActive();
        } catch(e: any) { alert("Ошибка: " + e.message); }
    };

    const toggleExpand = (c: any) => {
        if (expandedCampaign === c.name) {
            setExpandedCampaign(null);
            setShowQueue(false);
        } else {
            setExpandedCampaign(c.name);
            setEditValues((prev: any) => ({
                ...prev,
                [c.name]: {
                    delay_min: c.config.delay_min,
                    delay_max: c.config.delay_max,
                    work_start: c.config.work_start,
                    work_end: c.config.work_end,
                    skip_if_dialog_exists: c.config.skip_if_dialog_exists
                }
            }));
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
                <div className="bg-panel rounded-2xl shadow-2xl border border-border-main p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <h3 className="text-xl font-black text-text-main flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            Активные миссии
                        </h3>
                        <button onClick={onClose} className="text-text-muted hover:text-text-main text-2xl leading-none">&times;</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {isLoading && activeCampaigns.length === 0 && <div className="text-center text-text-muted text-sm py-4">Загрузка данных...</div>}
                        {!isLoading && activeCampaigns.length === 0 && <div className="text-center text-text-muted text-sm py-8 border border-dashed border-border-main rounded-xl">Нет активных кампаний</div>}
                        
                        {activeCampaigns.map(c => {
                            const progress = c.total > 0 ? (c.sent / c.total) * 100 : 0;
                            const isExpanded = expandedCampaign === c.name;
                            const edits = editValues[c.name] || {};

                            return (
                                <div key={c.name} className={`bg-subpanel rounded-xl border transition-all ${isExpanded ? 'border-vk-blue shadow-md' : 'border-border-main'}`}>
                                    <div className="p-4 cursor-pointer" onClick={() => toggleExpand(c)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-text-main truncate max-w-[300px] text-lg">{c.name}</div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleStop(c.name); }}
                                                    className="text-[10px] font-bold uppercase text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded border border-red-500/30 transition"
                                                >
                                                    Остановить
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleForceDelete(c.name); }}
                                                    className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded"
                                                    title="Принудительно удалить"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="w-full bg-main rounded-full h-2 mb-2 overflow-hidden border border-border-main">
                                            <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-text-muted font-mono">
                                            <span>Отправлено: {c.sent} / {c.total}</span>
                                            <span>В очереди: {c.queued || 0}</span>
                                            <span>{progress.toFixed(1)}%</span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="p-4 border-t border-border-main bg-main/30 space-y-4 animate-fade-in">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Задержка (сек)</label>
                                                    <div className="flex items-center gap-2">
                                                        <input type="number" value={edits.delay_min || ''} onChange={e => setEditValues({...editValues, [c.name]: {...edits, delay_min: Number(e.target.value)}})} className="w-16 bg-panel border border-border-main rounded px-2 py-1 text-xs text-center" />
                                                        <span className="text-text-muted">-</span>
                                                        <input type="number" value={edits.delay_max || ''} onChange={e => setEditValues({...editValues, [c.name]: {...edits, delay_max: Number(e.target.value)}})} className="w-16 bg-panel border border-border-main rounded px-2 py-1 text-xs text-center" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-text-muted uppercase block mb-1">Окно (Часы)</label>
                                                    <div className="flex items-center gap-2">
                                                        <input type="number" value={edits.work_start} onChange={e => setEditValues({...editValues, [c.name]: {...edits, work_start: Number(e.target.value)}})} className="w-16 bg-panel border border-border-main rounded px-2 py-1 text-xs text-center" />
                                                        <span className="text-text-muted">-</span>
                                                        <input type="number" value={edits.work_end} onChange={e => setEditValues({...editValues, [c.name]: {...edits, work_end: Number(e.target.value)}})} className="w-16 bg-panel border border-border-main rounded px-2 py-1 text-xs text-center" />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={edits.skip_if_dialog_exists} onChange={e => setEditValues({...editValues, [c.name]: {...edits, skip_if_dialog_exists: e.target.checked}})} className="rounded bg-panel border-border-main" />
                                                <span className="text-xs text-text-main">Не писать, если есть диалог</span>
                                            </label>

                                            <button onClick={() => handleApplySettings(c.name)} className="w-full bg-vk-blue hover:bg-vk-blue-dark text-white py-2 rounded-lg text-xs font-bold transition">
                                                Применить изменения
                                            </button>

                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setExpandedAccounts(expandedAccounts === c.name ? null : c.name);
                                                        setShowQueue(false);
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${expandedAccounts === c.name ? 'bg-panel shadow text-text-main' : 'bg-subpanel text-text-muted hover:text-text-main'}`}
                                                >
                                                    Аккаунты ({c.accounts.length})
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setShowQueue(!showQueue);
                                                        setExpandedAccounts(null);
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${showQueue ? 'bg-panel shadow text-text-main' : 'bg-subpanel text-text-muted hover:text-text-main'}`}
                                                >
                                                    Очередь ({c.queued || 0})
                                                </button>
                                            </div>

                                            {expandedAccounts === c.name && (
                                                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar bg-panel rounded-lg p-2 border border-border-main">
                                                    {c.accounts.map((acc: any) => (
                                                        <div key={acc.id} className="flex justify-between items-center bg-subpanel p-2 rounded border border-border-main">
                                                            <div className="flex items-center gap-2">
                                                                <img src={acc.avatar} className="w-6 h-6 rounded-full" alt="" />
                                                                <span className="text-xs truncate max-w-[150px]">{acc.name}</span>
                                                            </div>
                                                            <button onClick={() => handleRemoveAccount(c.name, acc.id)} className="text-text-muted hover:text-red-500 px-2" title="Исключить">&times;</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {showQueue && (
                                                <div className="mt-2 bg-panel rounded-lg p-2 border border-border-main">
                                                    <div className="flex justify-between items-center mb-2 px-2">
                                                        <span className="text-[10px] font-bold text-text-muted uppercase">Список отправки</span>
                                                        <button onClick={() => fetchQueue(c.name)} className={`p-1 hover:text-vk-blue ${isLoadingQueue ? 'animate-spin' : ''}`}><RefreshIcon className="w-3 h-3"/></button>
                                                    </div>
                                                    <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                        {isLoadingQueue && queueData.length === 0 && <div className="text-center text-xs text-text-muted py-2">Загрузка...</div>}
                                                        {!isLoadingQueue && queueData.length === 0 && <div className="text-center text-xs text-text-muted py-2">Очередь пуста</div>}
                                                        
                                                        {queueData.map((rec: any) => (
                                                            <div key={rec.id} className="flex justify-between items-center bg-subpanel p-2 rounded border border-border-main group hover:border-red-500/30 transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <img src={rec.avatar || 'https://vk.com/images/camera_200.png'} className="w-6 h-6 rounded-full bg-main" alt="" />
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-bold truncate max-w-[150px]">{rec.name}</span>
                                                                        <span className="text-[9px] font-mono text-text-muted">{rec.vk_user_id}</span>
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    onClick={() => handleSkipRecipient(rec.id)}
                                                                    className="text-text-muted hover:text-red-500 bg-main hover:bg-red-500/10 p-1.5 rounded transition" 
                                                                    title="Убрать из рассылки"
                                                                >
                                                                    <TrashIcon className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <ConfirmModal 
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={executeAction}
                title={confirmState.title}
                message={confirmState.message}
                isLoading={confirmState.isLoading}
            />
        </>
    );
};
