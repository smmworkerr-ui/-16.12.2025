
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Account } from '../types';
import { post, del, put, get } from '../apiClient';
import { RefreshIcon, UsersIcon, PlusIcon, TrashIcon, ExclamationIcon, FolderIcon, SearchIcon, FireIcon, LightningIcon } from './icons';
import { ConfirmModal } from './ConfirmModal';
import { AccountDetailsDrawer } from './AccountDetailsDrawer';
import { AccountImportModal } from './AccountImportModal';

interface AccountsTabProps {
    accounts: Account[];
    refreshAll: () => void;
    highlightId: number | null;
    disableDeleteConfirm?: boolean;
    onGoToChat?: (id: string) => void;
}

export const AccountsTab: React.FC<AccountsTabProps> = ({ 
    accounts, 
    refreshAll, 
    highlightId,
    disableDeleteConfirm = false,
    onGoToChat
}) => {
    const [newAccountToken, setNewAccountToken] = useState('');
    const [newAccountGroup, setNewAccountGroup] = useState(''); 
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [checkingIds, setCheckingIds] = useState<number[]>([]);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [tagFilter, setTagFilter] = useState<string>('all');
    const [groupFilter, setGroupFilter] = useState<string>('all');

    // Autocomplete State
    const [showAddGroupSuggestions, setShowAddGroupSuggestions] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const uniqueGroups = useMemo(() => {
        const groups = new Set<string>();
        accounts.forEach(a => { if (a.group_name) groups.add(a.group_name); });
        return Array.from(groups).sort();
    }, [accounts]);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        accounts.forEach(a => { if (a.tags) a.tags.forEach(t => tags.add(t)); });
        return Array.from(tags).sort();
    }, [accounts]);

    const filteredAccounts = useMemo(() => {
        return accounts.filter(a => {
            if (tagFilter !== 'all' && (!a.tags || !a.tags.includes(tagFilter))) return false;
            if (groupFilter !== 'all') {
                if (groupFilter === 'no_group') { if (a.group_name) return false; } 
                else { if (a.group_name !== groupFilter) return false; }
            }
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesName = a.name.toLowerCase().includes(term);
                const matchesID = String(a.vk_user_id).includes(term);
                if (!matchesName && !matchesID) return false;
            }
            return true;
        });
    }, [accounts, tagFilter, groupFilter, searchTerm]);

    useEffect(() => {
        if (highlightId && itemRefs.current[highlightId]) {
            itemRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightId]);

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = newAccountToken.trim();
        const group = newAccountGroup.trim();
        
        if (!token) { alert("Поле токена не может быть пустым!"); return; }

        try {
            await post('accounts', { token: token, group_name: group });
            setNewAccountToken('');
            setNewAccountGroup('');
            refreshAll();
        } catch (e: any) { alert(e.message); }
    };

    const handleCheckAccount = async (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setCheckingIds(prev => [...prev, id]);
        try {
            await post<{valid: boolean, message: string}>('accounts/' + id + '/check', {});
            refreshAll();
        } catch (e: any) {
            alert("Ошибка запроса: " + e.message);
        } finally {
            setCheckingIds(prev => prev.filter(x => x !== id));
        }
    };

    const requestDeleteAccount = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (disableDeleteConfirm) { executeDelete(id); } else { setAccountToDelete(id); setDeleteModalOpen(true); }
    };

    const executeDelete = async (id: number) => {
        setIsDeleting(true);
        try {
            await del(`accounts/${id}`);
            if (selectedAccountId === id) setSelectedAccountId(null);
            setTimeout(() => { refreshAll(); setDeleteModalOpen(false); setAccountToDelete(null); setIsDeleting(false); }, 300); 
        } catch (error: any) {
            alert("Не удалось удалить аккаунт: " + (error.message || "Ошибка сети"));
            setIsDeleting(false);
            setDeleteModalOpen(false);
        }
    };

    const authLinks = [
        { id: 2685278, name: "Kate Mobile", url: "https://oauth.vk.com/authorize?client_id=2685278&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=offline,notifications,email,ads,adsmanagement,docs,market,photos,video,pages,status,notes,wall,groups,friends,messages,stats,stories&response_type=token&v=5.199" },
        { id: 7556576, name: "VK Me", url: "https://oauth.vk.com/authorize?client_id=7556576&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=offline,notify,friends,photos,audio,video,stories,pages,status,notes,wall,groups,docs,stats,market,ads,adsmanagement,notifications,email,messages,offline&response_type=token&v=5.199" },
        { id: 7799655, name: "VK Admin", url: "https://oauth.vk.com/authorize?client_id=7799655&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=offline,notifications,email,ads,adsmanagement,docs,market,photos,video,pages,status,notes,wall,groups,friends,messages,stats,stories&response_type=token&v=5.199" },
    ];

    const activeAccount = accounts.find(a => a.id === selectedAccountId);

    return (
        <div className="w-full h-full bg-main text-text-main flex flex-col overflow-y-auto custom-scrollbar p-6 md:p-8 relative">
            <div className="max-w-5xl mx-auto w-full space-y-8 pb-10">
                
                {/* HERO SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border-main">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg text-white shadow-lg"><UsersIcon className="w-7 h-7" /></span>
                            Аккаунты
                        </h1>
                        <p className="text-text-muted mt-2 max-w-xl leading-relaxed">Управляйте вашими профилями ВКонтакте.</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-text-muted font-bold uppercase tracking-wider block w-full mb-1">Получить токен:</span>
                        {authLinks.map(app => (
                            <a key={app.id} href={app.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-subpanel hover:bg-hover border border-border-main rounded-md transition-colors text-text-main font-medium">{app.name}</a>
                        ))}
                    </div>
                </div>

                {/* ADD ACCOUNT FORM */}
                <div className="bg-panel rounded-2xl p-6 border border-border-main shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2"><PlusIcon className="w-5 h-5 text-green-500" /> Добавить новый аккаунт</h3>
                        <button 
                            onClick={() => setIsImportModalOpen(true)}
                            className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-colors"
                        >
                            <LightningIcon className="w-4 h-4" />
                            Массовый импорт
                        </button>
                    </div>
                    <form onSubmit={handleAddAccount} className="flex flex-col md:flex-row gap-4 items-stretch">
                        <div className="flex-1">
                            <input type="text" value={newAccountToken} onChange={e => setNewAccountToken(e.target.value)} placeholder="Вставьте токен или ссылку из адресной строки..." className="w-full bg-subpanel p-3.5 rounded-xl border border-border-main outline-none focus:border-vk-blue focus:ring-1 focus:ring-vk-blue transition-all text-sm font-mono" />
                        </div>
                        <div className="w-full md:w-1/4 relative">
                            <input type="text" value={newAccountGroup} onChange={e => { setNewAccountGroup(e.target.value); setShowAddGroupSuggestions(true); }} onFocus={() => setShowAddGroupSuggestions(true)} onBlur={() => setTimeout(() => setShowAddGroupSuggestions(false), 200)} placeholder="Группа (необязательно)" className="w-full bg-subpanel p-3.5 rounded-xl border border-border-main outline-none focus:border-vk-blue focus:ring-1 focus:ring-vk-blue transition-all text-sm" />
                            {showAddGroupSuggestions && uniqueGroups.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-panel border border-border-main rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto custom-scrollbar">
                                    {uniqueGroups.filter(g => g.toLowerCase().includes(newAccountGroup.toLowerCase())).map(g => (
                                        <div key={g} className="px-4 py-2 hover:bg-hover cursor-pointer text-sm" onMouseDown={(e) => { e.preventDefault(); setNewAccountGroup(g); setShowAddGroupSuggestions(false); }}>{g}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button type="submit" className="bg-vk-blue hover:bg-vk-blue-dark text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-vk-blue/20 active:scale-95 flex items-center justify-center gap-2"><span>Добавить</span></button>
                    </form>
                </div>

                {/* FILTERS TOOLBAR */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-3.5 w-4 h-4 text-text-muted" />
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Поиск по имени или ID..." className="w-full bg-subpanel pl-10 pr-4 py-3 rounded-xl border border-border-main outline-none focus:border-vk-blue focus:ring-1 focus:ring-vk-blue transition-all text-sm" />
                    </div>
                    <div className="relative md:w-64">
                        <FolderIcon className="absolute left-3 top-3.5 w-4 h-4 text-text-muted" />
                        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="w-full bg-subpanel pl-10 pr-8 py-3 rounded-xl border border-border-main outline-none focus:border-vk-blue transition-all text-sm appearance-none cursor-pointer text-text-main font-medium">
                            <option value="all">Все группы</option>
                            <option value="no_group">Без группы</option>
                            {uniqueGroups.map(g => (<option key={g} value={g}>{g}</option>))}
                        </select>
                        <div className="absolute right-3 top-3.5 pointer-events-none text-text-muted text-xs">▼</div>
                    </div>
                </div>

                {/* TAGS FILTER */}
                {allTags.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        <span className="text-xs font-bold text-text-muted uppercase mr-2 flex-shrink-0">Теги:</span>
                        <button onClick={() => setTagFilter('all')} className={`px-3 py-1 rounded-full text-xs font-bold border transition whitespace-nowrap ${tagFilter === 'all' ? 'bg-white text-vk-blue border-white shadow-sm' : 'bg-subpanel text-text-muted border-border-main hover:text-text-main'}`}>Все</button>
                        {allTags.map(tag => (
                            <button key={tag} onClick={() => setTagFilter(tag === tagFilter ? 'all' : tag)} className={`px-3 py-1 rounded-full text-xs font-bold border transition whitespace-nowrap ${tagFilter === tag ? 'bg-vk-blue text-white border-vk-blue shadow-sm' : 'bg-subpanel text-text-muted border-border-main hover:text-text-main'}`}>{tag}</button>
                        ))}
                    </div>
                )}

                {/* ACCOUNTS LIST */}
                <div className="grid grid-cols-1 gap-4">
                    {filteredAccounts.length === 0 && (
                        <div className="text-center py-20 text-text-muted opacity-50 border-2 border-dashed border-border-main rounded-2xl bg-panel/30">
                            <UsersIcon className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-xl font-bold">Аккаунты не найдены</p>
                        </div>
                    )}
                    
                    {filteredAccounts.map(account => {
                        const isChecking = checkingIds.includes(account.id);
                        const isHighlighted = highlightId === account.id;
                        
                        // Status logic
                        const status = account.status;
                        const isBanned = status === 'BANNED';
                        const isInvalid = status === 'INVALID';
                        const isOk = status === 'OK';
                        const hasError = !isOk;
                        
                        const isKamikaze = !!account.kamikaze_mode;

                        let borderClass = 'border-border-main shadow-sm hover:border-vk-blue/50';
                        if (isBanned) borderClass = 'border-red-500/50 shadow-md ring-1 ring-red-500/20 bg-red-900/5';
                        if (isInvalid) borderClass = 'border-yellow-500/50 shadow-md ring-1 ring-yellow-500/20 bg-yellow-900/5';
                        if (isHighlighted) borderClass = 'border-vk-blue ring-2 ring-vk-blue/20 shadow-xl scale-[1.01]';

                        return (
                            <div key={account.id} onClick={() => setSelectedAccountId(account.id)} ref={el => { itemRefs.current[account.id] = el; }} className={`bg-panel border rounded-2xl p-5 transition-all duration-300 group relative overflow-hidden cursor-pointer hover:shadow-md ${borderClass}`}>
                                {isHighlighted && <div className="absolute top-0 left-0 w-1.5 h-full bg-vk-blue"></div>}
                                
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                                    <div className="relative shrink-0">
                                        <img src={account.avatar} alt={account.name} className={`w-16 h-16 rounded-full border-4 object-cover bg-subpanel shadow-sm ${isBanned ? 'grayscale border-red-500' : 'border-subpanel'}`} />
                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-panel flex items-center justify-center text-[10px] text-white font-bold shadow-sm ${hasError ? 'bg-red-500' : 'bg-green-500'}`}>
                                            {hasError ? '!' : '✓'}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className={`text-lg font-bold truncate transition-colors ${isBanned ? 'text-red-500 line-through' : 'text-text-main group-hover:text-vk-blue'}`}>{account.name}</h3>
                                            {isKamikaze && <span title="Kamikaze Mode ON"><FireIcon className="w-4 h-4 text-orange-500 animate-pulse" /></span>}
                                            <span className="text-xs font-mono text-text-muted bg-subpanel px-2 py-0.5 rounded border border-border-main">ID: {account.vk_user_id}</span>
                                            {account.group_name && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1"><FolderIcon className="w-3 h-3" />{account.group_name}</span>}
                                            {account.tags && account.tags.map(t => <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">#{t}</span>)}
                                        </div>
                                        
                                        <div className="text-sm">
                                            {isBanned ? (
                                                <div className="text-white flex items-center gap-2 font-bold bg-red-600 px-3 py-1 rounded w-fit shadow-md uppercase text-xs tracking-wider">
                                                    <ExclamationIcon className="w-4 h-4" /> ЗАБЛОКИРОВАН (0 HP)
                                                </div>
                                            ) : isInvalid ? (
                                                <div className="text-yellow-900 flex items-center gap-2 font-bold bg-yellow-400 px-3 py-1 rounded w-fit shadow-md uppercase text-xs tracking-wider">
                                                    <ExclamationIcon className="w-4 h-4" /> ТОКЕН СЛЕТЕЛ (0 HP)
                                                </div>
                                            ) : hasError ? (
                                                <div className="text-red-500 flex items-center gap-2 font-medium bg-red-500/5 px-2 py-1 rounded w-fit border border-red-500/20">
                                                    <ExclamationIcon className="w-4 h-4" /> {account.error_details || 'Ошибка (0 HP)'}
                                                </div>
                                            ) : (
                                                <div className="text-green-500 flex items-center gap-2 font-bold text-xs uppercase tracking-wider">Активен</div>
                                            )}
                                            
                                            {(isBanned || isInvalid) && account.error_details && <div className="text-[10px] text-red-400 mt-1 font-mono">{account.error_details}</div>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                                        <button onClick={(e) => handleCheckAccount(account.id, e)} className={`p-2.5 rounded-xl border border-border-main bg-subpanel text-text-muted hover:text-vk-blue hover:border-vk-blue/30 transition-all ${isChecking ? 'animate-spin text-vk-blue' : ''}`} title="Проверить статус"><RefreshIcon className="w-5 h-5" /></button>
                                        <button onClick={(e) => requestDeleteAccount(account.id, e)} className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${isBanned ? 'bg-red-600 text-white border-red-600 shadow-lg hover:bg-red-700 animate-pulse' : 'bg-subpanel text-text-muted border-border-main hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5'}`} title="Удалить"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {activeAccount && (
                <AccountDetailsDrawer 
                    account={activeAccount}
                    onClose={() => setSelectedAccountId(null)}
                    onUpdate={refreshAll}
                    onGoToChat={onGoToChat}
                />
            )}

            <ConfirmModal 
                isOpen={isDeleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setAccountToDelete(null); }}
                onConfirm={() => accountToDelete && executeDelete(accountToDelete)}
                title="Удаление аккаунта"
                message="Вы уверены, что хотите удалить этот аккаунт?"
                isLoading={isDeleting}
            />

            <AccountImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={refreshAll}
            />
        </div>
    );
};
