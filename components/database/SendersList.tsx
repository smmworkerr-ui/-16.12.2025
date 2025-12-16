
import React, { useState, useMemo } from 'react';
import { Account } from '../../types';
import { ArrowLeftIcon, BarsArrowDownIcon, UsersIcon } from '../icons';

interface SendersListProps {
    accounts: Account[];
    selectedAccount: number | null;
    unreadMap: Record<number, number>;
    isCollapsed: boolean;
    onSelect: (id: number | null) => void;
    onResetCampaign: () => void;
}

type SortMode = 'name' | 'unread' | 'status';

export const SendersList: React.FC<SendersListProps> = ({
    accounts,
    selectedAccount,
    unreadMap,
    isCollapsed,
    onSelect,
    onResetCampaign
}) => {
    const [sortMode, setSortMode] = useState<SortMode>('name');

    const toggleSort = () => {
        setSortMode(prev => {
            if (prev === 'name') return 'unread';
            if (prev === 'unread') return 'status';
            return 'name';
        });
    };

    const sortedAccounts = useMemo(() => {
        return [...accounts].sort((a, b) => {
            if (sortMode === 'unread') {
                return (unreadMap[b.id] || 0) - (unreadMap[a.id] || 0);
            }
            if (sortMode === 'status') {
                const statusA = a.status === 'OK' ? 1 : 0;
                const statusB = b.status === 'OK' ? 1 : 0;
                return statusB - statusA; 
            }
            return a.name.localeCompare(b.name);
        });
    }, [accounts, sortMode, unreadMap]);

    return (
        <div className={`relative flex flex-col border-r border-border-main bg-subpanel transition-all duration-300 ease-in-out z-20 flex-none shadow-lg ${isCollapsed ? 'w-16' : 'w-72'}`}>
            <div className="relative border-b border-border-main flex items-center bg-subpanel z-10 shrink-0 h-16 w-full overflow-hidden">
                {!isCollapsed ? (
                    <div className="w-full px-2 flex items-center justify-between whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <button onClick={onResetCampaign} className="p-2 hover:bg-hover rounded-lg text-text-muted hover:text-text-main transition">
                                <ArrowLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-text-main text-sm">Отправители</span>
                        </div>
                        <button 
                            onClick={toggleSort}
                            className={`p-2 rounded-lg hover:bg-hover transition ${sortMode !== 'name' ? 'text-vk-blue bg-vk-blue/10' : 'text-text-muted'}`}
                            title={`Сортировка: ${sortMode === 'unread' ? 'По непрочитанным' : (sortMode === 'status' ? 'По статусу' : 'По имени')}`}
                        >
                            <BarsArrowDownIcon className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => onSelect(null)} className="w-full h-full flex items-center justify-center hover:bg-hover transition text-text-muted hover:text-vk-blue" title="Сбросить выбор">
                        <UsersIcon className="w-6 h-6" />
                    </button>
                )}
            </div>

            <div className="relative overflow-y-auto flex-1 custom-scrollbar w-full z-10 py-2">
                {sortedAccounts.map(acc => {
                    const unread = unreadMap[acc.id] || 0;
                    const isSelected = selectedAccount === acc.id;
                    const isOk = acc.status === 'OK';

                    return (
                        <div 
                            key={acc.id}
                            onClick={() => onSelect(acc.id)}
                            className={`
                                cursor-pointer transition-all duration-200 group
                                ${isCollapsed ? 'mx-2 my-1 rounded-xl p-1 flex justify-center items-center h-12' : 'mx-3 my-1 rounded-xl p-2 flex items-center gap-3'}
                                ${isSelected 
                                    ? 'bg-vk-blue text-white shadow-md' 
                                    : 'hover:bg-panel text-text-main'}
                            `}
                            title={acc.name}
                        >
                            <div className="relative">
                                <img 
                                    src={acc.avatar} 
                                    className={`w-10 h-10 rounded-full bg-black/50 flex-shrink-0 object-cover border-2 transition-colors ${isSelected ? 'border-white/30' : 'border-transparent group-hover:border-border-main'}`} 
                                    alt="" 
                                />
                                {/* Status Dot */}
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${isSelected ? 'border-vk-blue' : 'border-subpanel'} ${isOk ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                
                                {unread > 0 && isCollapsed && (
                                    <div className={`absolute -top-1 -right-1 text-[9px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow border-2 border-subpanel ${isSelected ? 'bg-white text-vk-blue' : 'bg-red-500 text-white'}`}>
                                        {unread > 99 ? '!' : unread}
                                    </div>
                                )}
                            </div>
                            
                            {!isCollapsed && (
                                <div className="overflow-hidden flex-1 flex justify-between items-center">
                                    <div className="overflow-hidden">
                                        <div className={`font-semibold text-sm truncate ${isSelected ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]' : 'text-text-main'}`}>{acc.name}</div>
                                        <div className={`text-[10px] ${isSelected ? 'text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]' : 'text-text-muted opacity-80'}`}>
                                            {isOk ? 'Активен' : <span className={isSelected ? 'text-red-100 font-bold drop-shadow-md' : 'text-red-500 font-bold'}>0 HP / ERROR</span>}
                                        </div>
                                    </div>
                                    {unread > 0 && (
                                        <div className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${isSelected ? 'bg-white text-vk-blue' : 'bg-red-500 text-white'}`}>
                                            {unread}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
