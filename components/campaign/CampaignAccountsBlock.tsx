
import React, { useState, useMemo } from 'react';
import { Account } from '../../types';
import { UsersIcon, SearchIcon, FolderIcon, RefreshIcon, BarsArrowDownIcon, FireIcon } from '../icons';
import { calculateRisk } from '../utils';

interface CampaignAccountsBlockProps {
    accounts: Account[];
    selectedAccountIds: number[];
    setSelectedAccountIds: React.Dispatch<React.SetStateAction<number[]>>;
    isSpecific: boolean;
    setIsSpecific: (val: boolean) => void;
    accountTags: string[];
    tagFilter: string;
    setTagFilter: (tag: string) => void;
    error?: boolean;
    // For Health Calc (Should be Risky Count)
    recipientsCount: number; 
    delayMin: number;
    delayMax: number;
    spintaxScore: number;
    onContextMenu?: (e: React.MouseEvent, id: number) => void;
}

export const CampaignAccountsBlock: React.FC<CampaignAccountsBlockProps> = ({
    accounts,
    selectedAccountIds,
    setSelectedAccountIds,
    isSpecific,
    setIsSpecific,
    accountTags,
    tagFilter,
    setTagFilter,
    error,
    recipientsCount,
    delayMin,
    delayMax,
    spintaxScore,
    onContextMenu
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [groupFilter, setGroupFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({key: 'status', direction: 'desc'});

    const accountGroups = useMemo(() => {
        const groups = new Set<string>();
        accounts.forEach(a => { if (a.group_name) groups.add(a.group_name); });
        return Array.from(groups).sort();
    }, [accounts]);

    const filteredAccounts = useMemo(() => {
        let result = accounts.filter(a => {
            const matchesSearch = !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(a.vk_user_id).includes(searchTerm);
            let matchesGroup = true;
            if (groupFilter === 'all') matchesGroup = true;
            else if (groupFilter === 'no_group') matchesGroup = !a.group_name;
            else matchesGroup = a.group_name === groupFilter;
            
            let matchesTag = true;
            if (tagFilter !== 'all') {
                matchesTag = a.tags ? a.tags.includes(tagFilter) : false;
            }

            return matchesSearch && matchesGroup && matchesTag;
        });

        result.sort((a, b) => {
            let valA: any, valB: any;
            switch(sortConfig.key) {
                case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
                case 'group': valA = a.group_name || ''; valB = b.group_name || ''; break;
                case 'status': valA = a.status === 'OK' ? 1 : 0; valB = b.status === 'OK' ? 1 : 0; break;
                case 'health': valA = a.health_score ?? 100; valB = b.health_score ?? 100; break;
                default: valA = a.id; valB = b.id;
            }
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [accounts, searchTerm, groupFilter, sortConfig, tagFilter]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key, 
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const toggleAccount = (id: number) => { 
        setSelectedAccountIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); 
    };

    const selectAll = () => {
        const visibleIds = filteredAccounts.map(a => a.id);
        const allSelected = visibleIds.every(id => selectedAccountIds.includes(id));
        if (allSelected) { 
            setSelectedAccountIds(prev => prev.filter(id => !visibleIds.includes(id))); 
        } else { 
            const newSelection = new Set([...selectedAccountIds, ...visibleIds]); 
            setSelectedAccountIds(Array.from(newSelection)); 
        }
    };

    const SortIcon = ({ colKey }: { colKey: string }) => {
        if (sortConfig.key !== colKey) return <BarsArrowDownIcon className="w-3 h-3 opacity-30" />;
        return <BarsArrowDownIcon className={`w-3 h-3 text-vk-blue transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />;
    };

    return (
        <div className={`space-y-3 ${error ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" /> Отправители
                </label>
                <div className="flex gap-2">
                    {accountTags.length > 0 && (
                        <div className="flex gap-1 overflow-x-auto max-w-[200px] no-scrollbar">
                            {accountTags.map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setTagFilter(tagFilter === t ? 'all' : t)}
                                    className={`px-2 py-1 text-[9px] font-bold rounded border whitespace-nowrap ${tagFilter === t ? 'bg-purple-500 text-white border-purple-500' : 'bg-subpanel text-text-muted border-border-main'}`}
                                >
                                    #{t}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="bg-subpanel p-1 rounded-lg flex border border-border-main shrink-0">
                        <button onClick={() => setIsSpecific(false)} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${!isSpecific ? 'bg-vk-blue text-white shadow' : 'text-text-muted hover:text-text-main'}`}>АВТО-РОТАЦИЯ</button>
                        <button onClick={() => setIsSpecific(true)} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${isSpecific ? 'bg-vk-blue text-white shadow' : 'text-text-muted hover:text-text-main'}`}>ВЫБОР</button>
                    </div>
                </div>
            </div>

            {isSpecific ? (
                <div className="bg-panel rounded-xl border border-border-main shadow-sm flex flex-col overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between p-3 bg-subpanel border-b border-border-main gap-2">
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative">
                                <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-text-muted" />
                                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Поиск..." className="bg-main pl-8 pr-3 py-1.5 rounded-lg text-xs border border-border-main focus:border-vk-blue outline-none w-32 md:w-48" />
                            </div>
                            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="bg-main py-1.5 px-2 rounded-lg text-xs border border-border-main outline-none focus:border-vk-blue font-bold text-text-main max-w-[150px]">
                                <option value="all">Все группы</option>
                                <option value="no_group">Без группы</option>
                                {accountGroups.map(g => (<option key={g} value={g}>{g}</option>))}
                            </select>
                        </div>
                        <button onClick={selectAll} className="text-xs font-bold text-vk-blue hover:text-text-main transition px-2 whitespace-nowrap">
                            {filteredAccounts.length > 0 && filteredAccounts.every(a => selectedAccountIds.includes(a.id)) ? 'Снять все' : 'Выбрать все'}
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-subpanel/50 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="p-3 w-10"></th>
                                    <th className="p-3 text-[10px] uppercase font-bold text-text-muted cursor-pointer hover:text-text-main group" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1">Аккаунт <SortIcon colKey="name"/></div>
                                    </th>
                                    <th className="p-3 text-[10px] uppercase font-bold text-text-muted cursor-pointer hover:text-text-main group" onClick={() => handleSort('group')}>
                                        <div className="flex items-center gap-1">Группа <SortIcon colKey="group"/></div>
                                    </th>
                                    <th className="p-3 text-[10px] uppercase font-bold text-text-muted text-center cursor-pointer hover:text-text-main group" onClick={() => handleSort('health')}>
                                        <div className="flex items-center gap-1 justify-center">Здоровье (HP) <SortIcon colKey="health"/></div>
                                    </th>
                                    <th className="p-3 text-[10px] uppercase font-bold text-text-muted text-right cursor-pointer hover:text-text-main group" onClick={() => handleSort('status')}>
                                        <div className="flex items-center gap-1 justify-end">Статус <SortIcon colKey="status"/></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-main">
                                {filteredAccounts.map(acc => {
                                    const isSelected = selectedAccountIds.includes(acc.id);
                                    const hasError = acc.status !== 'OK';
                                    
                                    // REAL DB HEALTH - FORCE 0 IF ERROR
                                    const hp = acc.status === 'OK' ? (acc.health_score ?? 100) : 0;
                                    const isKamikaze = !!acc.kamikaze_mode;
                                    
                                    let healthColor = 'text-green-500';
                                    let bgBar = 'bg-green-500';
                                    if(hp < 80) { healthColor = 'text-yellow-500'; bgBar = 'bg-yellow-500'; }
                                    if(hp < 40) { healthColor = 'text-red-500'; bgBar = 'bg-red-500'; }

                                    return (
                                        <tr 
                                            key={acc.id} 
                                            onClick={() => toggleAccount(acc.id)} 
                                            onContextMenu={(e) => onContextMenu && onContextMenu(e, acc.id)}
                                            className={`cursor-pointer transition-colors ${isSelected ? 'bg-vk-blue/10' : 'hover:bg-hover'}`}
                                        >
                                            <td className="p-3"><div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-vk-blue border-vk-blue' : 'border-text-muted'}`}>{isSelected && <div className="w-2 h-2 bg-white rounded-sm"></div>}</div></td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <img src={acc.avatar} className="w-8 h-8 rounded-full bg-subpanel object-cover" alt="" />
                                                    <div>
                                                        <div className="text-xs font-bold text-text-main flex items-center gap-1">
                                                            {acc.name}
                                                            {isKamikaze && <span title="Kamikaze Mode ON"><FireIcon className="w-3 h-3 text-orange-500" /></span>}
                                                        </div>
                                                        <div className="text-[10px] text-text-muted font-mono">{acc.vk_user_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3"><span className="text-[10px] font-bold bg-subpanel border border-border-main px-2 py-0.5 rounded text-text-muted flex items-center w-fit gap-1"><FolderIcon className="w-3 h-3 opacity-50" />{acc.group_name || '—'}</span></td>
                                            <td className="p-3 text-center">
                                                <div className="w-16 h-1.5 bg-subpanel rounded-full overflow-hidden mx-auto border border-border-main mb-1">
                                                    <div className={`h-full ${bgBar} transition-all duration-500`} style={{ width: `${hp}%` }}></div>
                                                </div>
                                                <span className={`text-[10px] font-mono font-bold ${healthColor}`}>{hp}%</span>
                                            </td>
                                            <td className="p-3 text-right">{hasError ? (<span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">ERROR</span>) : (<span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">OK</span>)}</td>
                                        </tr>
                                    );
                                })}
                                {filteredAccounts.length === 0 && (<tr><td colSpan={5} className="p-6 text-center text-xs text-text-muted">Нет аккаунтов</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-subpanel/50 border border-border-main rounded-xl p-4 flex items-center justify-center text-xs text-text-muted gap-2">
                    <RefreshIcon className="w-4 h-4 animate-spin-slow" /> Система будет использовать все доступные активные аккаунты по очереди.
                </div>
            )}
        </div>
    );
};
