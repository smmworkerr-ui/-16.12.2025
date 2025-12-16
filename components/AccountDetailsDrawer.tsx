
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Account } from '../types';
import { put, post, get } from '../apiClient';
import { HeartIcon, PlusIcon, RobotIcon, GearIcon, ExclamationIcon, LightningIcon, FireIcon, UserGroupIcon, SearchIcon, RefreshIcon, SendIcon, CheckIcon, TrashIcon } from './icons';
import { ConfirmModal } from './ConfirmModal';

interface AccountDetailsDrawerProps {
    account: Account;
    onClose: () => void;
    onUpdate: () => void;
    onGoToChat?: (id: string) => void;
}

export const AccountDetailsDrawer: React.FC<AccountDetailsDrawerProps> = ({ account, onClose, onUpdate, onGoToChat }) => {
    // -- SETTINGS STATE --
    const [cleanupDays, setCleanupDays] = useState(account.cleanup_days || 30);
    const [cleanupEnabled, setCleanupEnabled] = useState(!!account.cleanup_enabled);
    
    // Auto-Accept Settings
    const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(!!account.auto_accept_enabled);
    const [autoAcceptMsg, setAutoAcceptMsg] = useState(account.auto_accept_msg || '');
    const [autoAcceptDelayMin, setAutoAcceptDelayMin] = useState(account.auto_accept_delay_min || 1);
    const [autoAcceptDelayMax, setAutoAcceptDelayMax] = useState(account.auto_accept_delay_max || 5);
    const [skipDialogExists, setSkipDialogExists] = useState(account.skip_dialog_exists !== undefined ? !!account.skip_dialog_exists : true);
    const [autoAcceptSkipMsg, setAutoAcceptSkipMsg] = useState(account.auto_accept_skip_msg !== undefined ? !!account.auto_accept_skip_msg : true);

    // Safety Settings
    const [dayLimit, setDayLimit] = useState(account.day_limit || 20);
    const [isUnlimited, setIsUnlimited] = useState(account.day_limit === 0);
    const [kamikazeMode, setKamikazeMode] = useState(!!account.kamikaze_mode);

    // Tags
    const [accountTags, setAccountTags] = useState<string[]>(account.tags || []);
    const [newTagInput, setNewTagInput] = useState('');

    // Health Stats
    const [healthStats, setHealthStats] = useState<any>(null);
    const [isFetchingHealth, setIsFetchingHealth] = useState(false);

    // Friends List
    const [friends, setFriends] = useState<any[]>([]);
    const [isFriendsOpen, setIsFriendsOpen] = useState(false);
    const [isFriendsLoading, setIsFriendsLoading] = useState(false);
    const [friendSearch, setFriendSearch] = useState('');

    // Requests List
    const [requests, setRequests] = useState<any[]>([]);
    const [isRequestsOpen, setIsRequestsOpen] = useState(false);
    const [isRequestsLoading, setIsRequestsLoading] = useState(false);

    // Calculated Time
    const [timeToReset, setTimeToReset] = useState<string>('');
    
    // Kamikaze Modal
    const [isKamikazeConfirmOpen, setIsKamikazeConfirmOpen] = useState(false);
    
    // Token Health (Real) - FORCE 0 IF STATUS IS NOT OK
    const healthScore = account.status === 'OK' ? (account.health_score ?? 100) : 0;

    // FIX: Depend only on account.id to prevent form reset during background polling
    useEffect(() => {
        setCleanupDays(account.cleanup_days || 30);
        setCleanupEnabled(!!account.cleanup_enabled);
        setAutoAcceptEnabled(!!account.auto_accept_enabled);
        setAutoAcceptMsg(account.auto_accept_msg || '');
        setAutoAcceptDelayMin(account.auto_accept_delay_min || 1);
        setAutoAcceptDelayMax(account.auto_accept_delay_max || 5);
        setSkipDialogExists(account.skip_dialog_exists !== undefined ? !!account.skip_dialog_exists : true);
        setAutoAcceptSkipMsg(account.auto_accept_skip_msg !== undefined ? !!account.auto_accept_skip_msg : true);
        
        setDayLimit(account.day_limit === 0 ? 20 : (account.day_limit || 20));
        setIsUnlimited(account.day_limit === 0);
        
        setKamikazeMode(!!account.kamikaze_mode);
        setAccountTags(account.tags || []);
        
        fetchAccountHealth();
        calculateResetTime();
        
        // Reset lists
        setIsFriendsOpen(false);
        setIsRequestsOpen(false);
        setFriends([]);
        setRequests([]);
        
    }, [account.id]);

    // Separate effect for timer to avoid dependency issues
    useEffect(() => {
        calculateResetTime();
        const timer = setInterval(calculateResetTime, 60000); 
        return () => clearInterval(timer);
    }, [account.last_activity_at, account.messages_sent_today]);

    const calculateResetTime = () => {
        if (!account.last_activity_at || account.messages_sent_today === 0) {
            setTimeToReset('Готов к работе');
            return;
        }

        const now = Math.floor(Date.now() / 1000);
        const diff = now - account.last_activity_at;
        const resetTime = 86400; // 24h

        if (diff >= resetTime) {
            setTimeToReset('Сброс ожидается...');
        } else {
            const left = resetTime - diff;
            const hours = Math.floor(left / 3600);
            const minutes = Math.floor((left % 3600) / 60);
            setTimeToReset(`${hours}ч ${minutes}м`);
        }
    };

    const fetchAccountHealth = async () => {
        setIsFetchingHealth(true);
        try {
            const allStats = await get<any[]>('analytics/vk-stats');
            if (allStats) {
                const myStats = allStats.find(s => s.id === account.id);
                setHealthStats(myStats || { incoming: 0, outgoing: 0, friends: 0 });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsFetchingHealth(false);
        }
    };

    const fetchFriends = async () => {
        setIsFriendsLoading(true);
        try {
            const data = await get<any[]>(`accounts/${account.id}/friends`);
            setFriends(data || []);
        } catch (e) {
            console.error("Failed to load friends", e);
        } finally {
            setIsFriendsLoading(false);
        }
    };

    const fetchRequests = async () => {
        setIsRequestsLoading(true);
        try {
            const data = await get<any[]>(`accounts/${account.id}/requests`);
            setRequests(data || []);
        } catch (e) {
            console.error("Failed to load requests", e);
        } finally {
            setIsRequestsLoading(false);
        }
    };

    const handleRefreshFriends = async () => {
        setIsFriendsLoading(true);
        try {
            const res = await post<{status: string, count: number}>(`accounts/${account.id}/friends/refresh`, {});
            await fetchFriends();
            alert(`Обновлено! Найдено друзей: ${res.count}`);
        } catch (e: any) {
            alert("Ошибка обновления: " + e.message);
        } finally {
            setIsFriendsLoading(false);
        }
    };

    const handleAcceptRequest = async (userId: string) => {
        try {
            await post(`accounts/${account.id}/requests/accept`, { user_id: userId });
            setRequests(prev => prev.filter(r => String(r.id) !== String(userId)));
            // Optionally update health stats locally or refetch
        } catch (e: any) {
            alert("Ошибка принятия: " + e.message);
        }
    };

    const handleDeleteRequest = async (userId: string) => {
        try {
            await post(`accounts/${account.id}/requests/delete`, { user_id: userId });
            setRequests(prev => prev.filter(r => String(r.id) !== String(userId)));
        } catch (e: any) {
            alert("Ошибка удаления: " + e.message);
        }
    };

    const handleUpdateSettings = async () => {
        try {
            await put(`accounts/${account.id}`, { 
                cleanup_days: cleanupDays,
                cleanup_enabled: cleanupEnabled ? 1 : 0,
                auto_accept_enabled: autoAcceptEnabled ? 1 : 0,
                auto_accept_msg: autoAcceptMsg,
                auto_accept_delay_min: autoAcceptDelayMin,
                auto_accept_delay_max: autoAcceptDelayMax,
                skip_dialog_exists: skipDialogExists ? 1 : 0,
                auto_accept_skip_msg: autoAcceptSkipMsg ? 1 : 0,
                day_limit: isUnlimited ? 0 : dayLimit,
                tags: accountTags
            });
            onUpdate();
            alert("Настройки сохранены!");
        } catch (e: any) { alert(e.message); }
    };

    const handleToggleKamikazeRequest = () => {
        if (!kamikazeMode) {
            setIsKamikazeConfirmOpen(true);
        } else {
            executeToggleKamikaze();
        }
    };

    const executeToggleKamikaze = async () => {
        try {
            await post(`accounts/${account.id}/toggle-kamikaze`, {});
            setKamikazeMode(!kamikazeMode);
            onUpdate();
            setIsKamikazeConfirmOpen(false);
        } catch (e: any) { alert(e.message); }
    };

    const handleAddTag = () => {
        const t = newTagInput.trim();
        if (t && !accountTags.includes(t)) {
            setAccountTags(prev => [...prev, t]);
            setNewTagInput('');
        }
    };

    const handleRemoveTag = (t: string) => {
        setAccountTags(prev => prev.filter(tag => tag !== t));
    };

    const filteredFriends = friends.filter(f => {
        const full = `${f.first_name} ${f.last_name}`.toLowerCase();
        return full.includes(friendSearch.toLowerCase());
    });

    const used = account.messages_sent_today || 0;
    const currentLimit = isUnlimited ? 0 : dayLimit;
    const usagePercent = isUnlimited ? 0 : Math.min(100, (used / currentLimit) * 100);
    
    // Health Bar Logic
    let healthColor = 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]';
    if (healthScore > 75) healthColor = 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]';
    else if (healthScore > 25) healthColor = 'bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.5)]';

    const segments = [0, 1, 2, 3]; 

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative w-full max-w-md bg-panel h-full shadow-2xl flex flex-col border-l border-border-main animate-fade-in-left">
                <div className="p-6 border-b border-border-main flex items-start justify-between bg-subpanel/30">
                    <div className="flex items-center gap-4">
                        <img src={account.avatar} alt="" className="w-16 h-16 rounded-full border-2 border-border-main object-cover bg-main" />
                        <div>
                            <h2 className="text-xl font-bold text-text-main">{account.name}</h2>
                            <div className="text-sm text-text-muted flex items-center gap-2 mt-1">
                                <a 
                                    href={`https://vk.com/id${account.vk_user_id}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="font-mono hover:text-vk-blue hover:underline transition-colors"
                                    title="Открыть страницу ВКонтакте"
                                >
                                    ID: {account.vk_user_id}
                                </a>
                                {account.status === 'OK' ? (
                                    <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded">ONLINE</span>
                                ) : account.status === 'BANNED' ? (
                                    <span className="bg-red-600/10 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1"><ExclamationIcon className="w-3 h-3"/> BANNED</span>
                                ) : account.status === 'INVALID' ? (
                                    <span className="bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">INVALID TOKEN</span>
                                ) : (
                                    <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded">ERROR</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-main text-2xl leading-none">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    {/* Health Score (Big) */}
                    <div className={`bg-panel border rounded-xl p-4 shadow-sm relative overflow-hidden transition-colors ${kamikazeMode ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-border-main'}`}>
                        {kamikazeMode && (
                            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                <FireIcon className="w-24 h-24 text-orange-500" />
                            </div>
                        )}
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold text-vk-blue uppercase tracking-wider flex items-center gap-2">
                                <HeartIcon className="w-4 h-4" /> Token Health
                            </h3>
                            <span className={`text-2xl font-black ${healthScore === 0 ? 'text-red-500' : 'text-text-main'}`}>{healthScore}%</span>
                        </div>
                        
                        {/* 4-SEGMENT HEALTH BAR */}
                        <div className="w-full h-4 flex gap-1.5 mb-2">
                            {segments.map(i => {
                                const val = Math.min(Math.max((healthScore - (i * 25)) * 4, 0), 100);
                                return (
                                    <div key={i} className="flex-1 bg-black/40 rounded-sm border border-white/5 overflow-hidden relative">
                                        <div 
                                            className={`h-full transition-all duration-700 ease-out ${healthColor}`} 
                                            style={{ width: `${val}%` }}
                                        ></div>
                                    </div>
                                )
                            })}
                        </div>

                        <p className="text-[10px] text-text-muted mb-4 relative z-10 flex justify-between">
                            <span>{healthScore === 0 ? <span className="text-red-500 font-bold">ТОКЕН НЕ РАБОТАЕТ</span> : 'Восстанавливается автоматически.'}</span>
                            <span className="opacity-50 font-mono">REGEN: +5%/1h</span>
                        </p>

                        {/* KAMIKAZE TOGGLE */}
                        <div className="border-t border-border-main pt-4 relative z-10">
                            <div className="flex items-center justify-between cursor-pointer" onClick={handleToggleKamikazeRequest}>
                                <div>
                                    <div className={`text-sm font-bold flex items-center gap-2 ${kamikazeMode ? 'text-orange-500' : 'text-text-main'}`}>
                                        <FireIcon className="w-4 h-4" /> Kamikaze Mode
                                    </div>
                                    <div className="text-[10px] text-text-muted">Игнорировать защиту (Риск бана!)</div>
                                </div>
                                <div className={`w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors ${kamikazeMode ? 'bg-orange-600' : 'bg-gray-700'}`}>
                                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${kamikazeMode ? 'translate-x-5' : ''}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Limits */}
                    <div className="bg-panel border border-border-main rounded-xl p-4 shadow-sm">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                            <LightningIcon className="w-4 h-4" /> Лимиты
                        </h3>
                        
                        <div className="space-y-4">
                            {/* Energy Bar */}
                            <div className="bg-subpanel/50 p-3 rounded-lg border border-border-main">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="font-bold text-text-muted">Отправлено за 24ч</span>
                                    <span className="font-mono font-bold text-text-main">{used} / {isUnlimited ? '∞' : currentLimit}</span>
                                </div>
                                <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mb-2">
                                    <div 
                                        className={`h-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-500' : (usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500')}`} 
                                        style={{ width: `${isUnlimited ? 0 : usagePercent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-text-muted">Сброс через: <span className="text-text-main font-bold">{timeToReset}</span></span>
                                </div>
                            </div>

                            {/* Limit Switch & Slider */}
                            <div>
                                <label className="flex items-center justify-between cursor-pointer mb-3">
                                    <span className="text-xs font-bold text-text-muted">Ограничение лимита</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={!isUnlimited} 
                                            onChange={e => setIsUnlimited(!e.target.checked)} 
                                            className="sr-only peer" 
                                        />
                                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-vk-blue"></div>
                                    </div>
                                </label>
                                
                                <div className={`flex items-center gap-3 transition-all duration-300 ${isUnlimited ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                                    <input 
                                        type="range" 
                                        min="5" 
                                        max="200" 
                                        step="1"
                                        value={dayLimit} 
                                        onChange={e => setDayLimit(Number(e.target.value))}
                                        className="w-full accent-vk-blue cursor-pointer"
                                    />
                                    {/* Manual Input for Limit */}
                                    <input 
                                        type="number"
                                        min="1"
                                        max="500"
                                        value={dayLimit}
                                        onChange={e => setDayLimit(Number(e.target.value))}
                                        className="w-16 bg-subpanel border border-border-main rounded px-2 py-1 text-sm font-mono font-bold text-center outline-none focus:border-vk-blue"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-subpanel rounded-xl p-4 border border-border-main">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                            Статистика ВК
                        </h3>
                        {isFetchingHealth ? (
                            <div className="text-center py-4 text-xs text-text-muted animate-pulse">Загрузка...</div>
                        ) : (
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div><div className="text-xl font-black text-text-main">{healthStats?.incoming || 0}</div><div className="text-[9px] font-bold text-text-muted uppercase">Входящие</div></div>
                                <div><div className="text-xl font-black text-text-main">{healthStats?.outgoing || 0}</div><div className="text-[9px] font-bold text-text-muted uppercase">Исходящие</div></div>
                                <div><div className="text-xl font-black text-text-main">{healthStats?.friends || 0}</div><div className="text-[9px] font-bold text-text-muted uppercase">Друзья</div></div>
                            </div>
                        )}
                    </div>

                    {/* Tags Section */}
                    <div className="bg-panel border border-border-main rounded-xl p-4 shadow-sm">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Теги</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {accountTags.map(t => (
                                <span key={t} className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20 flex items-center gap-1">
                                    #{t}
                                    <button onClick={() => handleRemoveTag(t)} className="hover:text-white ml-1">×</button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={newTagInput} onChange={e => setNewTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} className="flex-1 bg-subpanel border border-border-main rounded-lg px-3 py-2 text-xs outline-none focus:border-vk-blue" placeholder="Добавить тег..." />
                            <button onClick={handleAddTag} className="px-3 bg-subpanel border border-border-main rounded-lg hover:text-vk-blue"><PlusIcon className="w-4 h-4"/></button>
                        </div>
                    </div>

                    {/* FRIENDS LIST SECTION */}
                    <div className="bg-panel border border-border-main rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => { setIsFriendsOpen(!isFriendsOpen); setIsRequestsOpen(false); if(!isFriendsOpen && friends.length === 0) fetchFriends(); }}>
                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <UserGroupIcon className="w-4 h-4" /> Список друзей
                            </h3>
                            <span className="text-xs text-text-muted">{isFriendsOpen ? '▼' : '▶'}</span>
                        </div>

                        {isFriendsOpen && (
                            <div className="mt-4 animate-fade-in">
                                <div className="flex gap-2 mb-3">
                                    <div className="relative flex-1">
                                        <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-text-muted" />
                                        <input 
                                            value={friendSearch}
                                            onChange={e => setFriendSearch(e.target.value)}
                                            placeholder="Поиск друга..."
                                            className="w-full bg-subpanel pl-8 pr-3 py-1.5 rounded-lg text-xs border border-border-main outline-none focus:border-vk-blue"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleRefreshFriends}
                                        disabled={isFriendsLoading}
                                        className={`p-1.5 rounded-lg bg-subpanel border border-border-main text-text-muted hover:text-vk-blue ${isFriendsLoading ? 'animate-spin' : ''}`}
                                        title="Обновить из ВК"
                                    >
                                        <RefreshIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="max-h-48 overflow-y-auto custom-scrollbar bg-subpanel rounded-lg border border-border-main">
                                    {filteredFriends.length === 0 ? (
                                        <div className="text-center py-4 text-xs text-text-muted">
                                            {isFriendsLoading ? 'Загрузка...' : 'Друзья не найдены'}
                                        </div>
                                    ) : (
                                        filteredFriends.map(f => (
                                            <div key={f.id} className="flex items-center gap-3 p-2 hover:bg-hover transition border-b border-border-main last:border-0 group">
                                                <img src={f.photo_100 || 'https://vk.com/images/camera_200.png'} className="w-8 h-8 rounded-full bg-main object-cover" alt=""/>
                                                <div className="flex-1 min-w-0">
                                                    <a 
                                                        href={`https://vk.com/id${f.id}`} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="text-xs font-bold text-text-main truncate hover:text-vk-blue hover:underline block"
                                                    >
                                                        {f.first_name} {f.last_name}
                                                    </a>
                                                    <div className="text-[9px] text-text-muted font-mono">{f.id}</div>
                                                </div>
                                                {onGoToChat && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onGoToChat(String(f.id)); onClose(); }}
                                                        className="p-1.5 rounded-lg bg-subpanel text-text-muted hover:text-white hover:bg-vk-blue opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-border-main hover:border-vk-blue"
                                                        title="Написать сообщение"
                                                    >
                                                        <SendIcon className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="text-[9px] text-text-muted text-right mt-1">
                                    Всего в базе: {friends.length}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* INCOMING REQUESTS SECTION */}
                    <div className="bg-panel border border-border-main rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => { setIsRequestsOpen(!isRequestsOpen); setIsFriendsOpen(false); if(!isRequestsOpen) fetchRequests(); }}>
                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <UserGroupIcon className="w-4 h-4 text-green-500" /> Входящие заявки
                            </h3>
                            <div className="flex items-center gap-2">
                                {healthStats?.incoming > 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 rounded-full">{healthStats.incoming}</span>}
                                <span className="text-xs text-text-muted">{isRequestsOpen ? '▼' : '▶'}</span>
                            </div>
                        </div>

                        {isRequestsOpen && (
                            <div className="mt-4 animate-fade-in">
                                <div className="flex justify-end mb-2">
                                    <button 
                                        onClick={fetchRequests}
                                        disabled={isRequestsLoading}
                                        className={`p-1 text-text-muted hover:text-vk-blue ${isRequestsLoading ? 'animate-spin' : ''}`}
                                    >
                                        <RefreshIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar bg-subpanel rounded-lg border border-border-main">
                                    {requests.length === 0 ? (
                                        <div className="text-center py-4 text-xs text-text-muted">
                                            {isRequestsLoading ? 'Загрузка...' : 'Заявок нет'}
                                        </div>
                                    ) : (
                                        requests.map(r => (
                                            <div key={r.id} className="flex items-center gap-3 p-2 hover:bg-hover transition border-b border-border-main last:border-0 group">
                                                <img src={r.avatar || 'https://vk.com/images/camera_200.png'} className="w-8 h-8 rounded-full bg-main object-cover" alt=""/>
                                                <div className="flex-1 min-w-0">
                                                    <a 
                                                        href={`https://vk.com/id${r.id}`} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="text-xs font-bold text-text-main truncate hover:text-vk-blue hover:underline block"
                                                    >
                                                        {r.name}
                                                    </a>
                                                    <div className="text-[9px] text-text-muted font-mono">{r.id}</div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => handleAcceptRequest(r.id)}
                                                        className="p-1.5 rounded bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition"
                                                        title="Принять"
                                                    >
                                                        <CheckIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteRequest(r.id)}
                                                        className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition"
                                                        title="Отклонить"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Auto-Accept */}
                    <div className="bg-panel border border-border-main rounded-xl p-4 shadow-sm">
                        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2"><RobotIcon className="w-4 h-4" /> Авто-Секретарь</h3>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-subpanel border border-border-main hover:border-purple-500/50 transition">
                                <span className="text-sm font-bold text-text-main">Авто-прием заявок</span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={autoAcceptEnabled} onChange={e => setAutoAcceptEnabled(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </div>
                            </label>
                            
                            <div className={`space-y-4 transition-all duration-300 ${autoAcceptEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <div className="bg-subpanel rounded-xl border border-border-main p-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={autoAcceptSkipMsg} 
                                            onChange={e => setAutoAcceptSkipMsg(e.target.checked)} 
                                            className="w-4 h-4 accent-purple-500 rounded bg-subpanel border-border-main" 
                                        />
                                        <span className="text-xs text-text-main font-bold">Не отправлять приветствие</span>
                                    </label>
                                </div>

                                <div className={`space-y-4 transition-all duration-300 ${autoAcceptSkipMsg ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-text-muted">Интервал (мин):</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" value={autoAcceptDelayMin} onChange={e => setAutoAcceptDelayMin(Number(e.target.value))} className="w-full bg-subpanel border border-border-main rounded-lg p-2 text-center text-sm" min={1} />
                                            <span className="text-text-muted">-</span>
                                            <input type="number" value={autoAcceptDelayMax} onChange={e => setAutoAcceptDelayMax(Number(e.target.value))} className="w-full bg-subpanel border border-border-main rounded-lg p-2 text-center text-sm" min={1} />
                                        </div>
                                    </div>
                                    
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={skipDialogExists} onChange={e => setSkipDialogExists(e.target.checked)} className="w-4 h-4 accent-purple-500 rounded bg-subpanel border-border-main" />
                                        <span className="text-xs text-text-main">Не писать, если есть диалог</span>
                                    </label>
                                    
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-text-muted">Приветствие:</label>
                                        <textarea value={autoAcceptMsg} onChange={e => setAutoAcceptMsg(e.target.value)} className="w-full bg-subpanel border border-border-main rounded-lg p-3 text-sm text-text-main h-24 resize-none outline-none focus:border-purple-500 placeholder-text-muted/50" placeholder="Привет!..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Maintenance */}
                    <div className="space-y-4 pt-4 border-t border-border-main">
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2"><GearIcon className="w-4 h-4" /> Чистка</h3>
                        <div className="flex flex-col gap-4">
                            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-subpanel border border-border-main hover:border-vk-blue/50 transition">
                                <span className="text-sm font-bold text-text-main">Авто-отмена исходящих</span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={cleanupEnabled} onChange={e => setCleanupEnabled(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </div>
                            </label>
                            <div className={`transition-all duration-300 ${cleanupEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}><label className="text-xs font-bold text-text-muted mb-2 block">Отменять заявки старше (дней):</label><input type="number" value={cleanupDays} onChange={e => setCleanupDays(Number(e.target.value))} className="w-full bg-subpanel border border-border-main rounded-xl p-3 text-sm font-bold text-text-main outline-none focus:border-vk-blue" min={1} /></div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border-main bg-panel">
                    <button onClick={handleUpdateSettings} className="w-full bg-vk-blue hover:bg-vk-blue-dark text-white py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-[0.98]">Сохранить настройки</button>
                </div>
            </div>

            <ConfirmModal 
                isOpen={isKamikazeConfirmOpen}
                onClose={() => setIsKamikazeConfirmOpen(false)}
                onConfirm={executeToggleKamikaze}
                title="⚠️ ВКЛЮЧИТЬ РЕЖИМ КАМИКАДЗЕ?"
                message={`- Защита здоровья токена будет ОТКЛЮЧЕНА.\n- Аккаунт будет работать на износ (до бана).\n- Задержки будут минимальными (в авто-режиме).\n\nВы действительно хотите включить этот режим?`}
            />
        </div>,
        document.body
    );
};
