
import React, { useState, useMemo } from 'react';
import { ArrowLeftIcon, BarsArrowDownIcon, FolderIcon, SearchIcon } from '../icons';

interface CampaignsListProps {
    campaigns: string[];
    selectedCampaign: string | null;
    unreadMap: Record<string, number>;
    activityMap: Record<string, number>; // Newest Recipient ID per campaign
    isCollapsed: boolean;
    onSelect: (campaign: string | null) => void;
    directCampaignName: string;
    onContextMenu?: (e: React.MouseEvent, campaign: string) => void;
}

type SortMode = 'name' | 'unread' | 'date_desc' | 'date_asc';

export const CampaignsList: React.FC<CampaignsListProps> = ({
    campaigns,
    selectedCampaign,
    unreadMap,
    activityMap,
    isCollapsed,
    onSelect,
    directCampaignName,
    onContextMenu
}) => {
    const [sortMode, setSortMode] = useState<SortMode>('date_desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);

    const toggleSort = () => {
        setSortMode(prev => {
            if (prev === 'name') return 'unread';
            if (prev === 'unread') return 'date_desc';
            if (prev === 'date_desc') return 'date_asc';
            return 'name';
        });
    };

    const getSortLabel = (mode: SortMode) => {
        switch(mode) {
            case 'name': return 'По имени (А-Я)';
            case 'unread': return 'По непрочитанным';
            case 'date_desc': return 'Сначала новые';
            case 'date_asc': return 'Сначала старые';
        }
    };

    const sortedCampaigns = useMemo(() => {
        // Special items that should stay pinned
        const pastCampaignsName = '🗄️ Прошлые кампании';
        
        let filtered = campaigns;
        
        // Filter by search term
        if (searchTerm.trim()) {
            filtered = campaigns.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        const hasDirect = filtered.includes(directCampaignName);
        const hasPast = filtered.includes(pastCampaignsName);
        
        // Filter out pinned items for sorting
        const sortable = filtered.filter(c => c !== directCampaignName && c !== pastCampaignsName);
        
        if (sortMode === 'unread') {
            sortable.sort((a, b) => (unreadMap[b] || 0) - (unreadMap[a] || 0));
        } else if (sortMode === 'date_desc') {
            sortable.sort((a, b) => (activityMap[b] || 0) - (activityMap[a] || 0));
        } else if (sortMode === 'date_asc') {
            sortable.sort((a, b) => (activityMap[a] || 0) - (activityMap[b] || 0));
        } else {
            sortable.sort((a, b) => a.localeCompare(b));
        }
        
        const result = [];
        if (hasDirect) result.push(directCampaignName);
        result.push(...sortable);
        if (hasPast) result.push(pastCampaignsName);
        
        return result;
    }, [campaigns, sortMode, unreadMap, activityMap, directCampaignName, searchTerm]);

    return (
        <div className={`relative flex flex-col border-r border-border-main bg-panel transition-all duration-300 ease-in-out z-30 flex-none shadow-xl ${isCollapsed ? 'w-16' : 'w-72'}`}>
            {/* Header */}
            <div className="relative border-b border-border-main flex items-center bg-panel z-10 shrink-0 h-16 w-full overflow-hidden">
                {!isCollapsed ? (
                    <div className="w-full px-4 flex justify-between items-center whitespace-nowrap gap-2">
                        
                        {isSearchActive ? (
                            <div className="flex items-center w-full bg-subpanel rounded-lg px-2 py-1 border border-vk-blue/50 animate-fade-in">
                                <input 
                                    autoFocus
                                    className="bg-transparent border-none outline-none text-xs text-text-main w-full placeholder-text-muted"
                                    placeholder="Поиск кампании..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onBlur={() => !searchTerm && setIsSearchActive(false)}
                                />
                                <button onClick={() => { setSearchTerm(''); setIsSearchActive(false); }} className="text-text-muted hover:text-text-main">
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div 
                                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
                                onClick={() => setIsSearchActive(true)}
                            >
                                <div className="w-8 h-8 rounded-lg bg-vk-blue/10 flex items-center justify-center text-vk-blue">
                                    <FolderIcon className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-text-main text-sm tracking-wide">Кампании</span>
                            </div>
                        )}

                        {!isSearchActive && (
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setIsSearchActive(true)}
                                    className="p-2 rounded-lg hover:bg-hover transition text-text-muted hover:text-text-main"
                                    title="Поиск"
                                >
                                    <SearchIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={toggleSort}
                                    className={`p-2 rounded-lg hover:bg-hover transition ${sortMode !== 'name' ? 'text-vk-blue bg-vk-blue/10' : 'text-text-muted'}`}
                                    title={getSortLabel(sortMode)}
                                >
                                    <BarsArrowDownIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={() => onSelect(null)} className="w-full h-full flex items-center justify-center hover:bg-hover transition text-text-muted hover:text-vk-blue" title="Сбросить выбор">
                        <FolderIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
            
            {/* List */}
            <div className="relative overflow-y-auto flex-1 custom-scrollbar w-full z-10 py-2">
                {sortedCampaigns.length === 0 && (
                    <div className="text-center text-xs text-text-muted mt-4">Нет кампаний</div>
                )}
                {sortedCampaigns.map(c => {
                    const unread = unreadMap[c] || 0;
                    const isDirect = c === directCampaignName;
                    const isSelected = selectedCampaign === c;
                    
                    return (
                        <div 
                            key={c} 
                            onClick={() => onSelect(c)}
                            onContextMenu={(e) => onContextMenu && onContextMenu(e, c)}
                            className={`
                                group relative cursor-pointer transition-all duration-200
                                ${isCollapsed ? 'mx-2 my-1 rounded-xl p-2 flex justify-center items-center h-12' : 'mx-3 my-1 rounded-xl p-3'}
                                ${isSelected 
                                    ? 'bg-vk-blue text-white shadow-md' 
                                    : 'hover:bg-hover text-text-main'}
                            `}
                            title={c}
                        >
                            {isCollapsed ? (
                                <div className="relative">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase transition-colors ${isSelected ? 'bg-white/20 text-white drop-shadow-md' : (isDirect ? 'bg-orange-500/20 text-orange-500' : 'bg-subpanel text-text-muted')}`}>
                                        {isDirect ? 'IN' : c.substring(0, 1)}
                                    </div>
                                    {unread > 0 && (
                                        <div className={`absolute -top-1.5 -right-1.5 text-[9px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow border-2 border-panel ${isSelected ? 'bg-white text-vk-blue' : 'bg-red-500 text-white'}`}>
                                            {unread > 99 ? '!' : unread}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex justify-between items-center pl-2">
                                    <div className="overflow-hidden pr-2">
                                        <div className={`font-semibold text-sm truncate ${isSelected ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]' : (isDirect ? 'text-orange-500' : 'text-text-main')}`}>{c}</div>
                                        <div className={`text-[10px] truncate transition-opacity ${isSelected ? 'text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]' : 'text-text-muted group-hover:text-text-main/70'}`}>
                                            {isDirect ? 'Прямые сообщения' : 'Папка рассылки'}
                                        </div>
                                    </div>
                                    {unread > 0 && (
                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse ${isSelected ? 'bg-white text-vk-blue' : 'bg-red-500 text-white'}`}>
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
