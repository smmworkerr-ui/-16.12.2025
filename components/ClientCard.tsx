
import React from 'react';
import { Recipient, CrmStatus } from '../types';
import { CRM_STATUS_COLORS, CRM_STATUS_LABELS } from './StatusBadge';
import { TrashIcon, NotebookIcon, VkIcon, SendIcon, CheckIcon } from './icons';

interface ClientCardProps {
    recipient: Recipient;
    onClick: (e: React.MouseEvent) => void;
    onGoToChat: (vk_id: string) => void;
    onDelete: (e: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    variant?: 'grid' | 'compact';
    // Visual toggles
    hideId?: boolean;
    hideActions?: boolean;
    isSelected?: boolean;
}

export const ClientCard: React.FC<ClientCardProps> = ({ 
    recipient, 
    onClick, 
    onGoToChat, 
    onDelete,
    onContextMenu,
    variant = 'grid',
    hideId = false,
    hideActions = false,
    isSelected = false
}) => {
    
    const getStatusColor = (status: CrmStatus) => {
        const classes = CRM_STATUS_COLORS[status] || CRM_STATUS_COLORS['new'];
        if (classes.includes('green')) return 'bg-green-500';
        if (classes.includes('blue')) return 'bg-blue-500';
        if (classes.includes('amber')) return 'bg-amber-500';
        if (classes.includes('red')) return 'bg-red-500';
        return 'bg-gray-400';
    };

    const isDirect = (!recipient.campaign_name || recipient.campaign_name === 'Manual' || recipient.campaign_name === 'Ручное добавление' || !recipient.campaign_name.trim());
    const displayCampaign = isDirect ? 'Direct' : recipient.campaign_name;
    const crmStatus = recipient.crm_status || 'new';
    const statusColor = getStatusColor(crmStatus);

    // Ensure we have a valid link
    const profileLink = recipient.profile_url || `https://vk.com/${recipient.vk_user_id.startsWith('-') ? 'public' + recipient.vk_user_id.substring(1) : 'id' + recipient.vk_user_id}`;

    return (
        <div 
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={`
                group relative bg-panel rounded-xl shadow-sm transition-all duration-200 cursor-pointer overflow-hidden
                border flex flex-col
                ${isSelected ? 'border-vk-blue ring-2 ring-vk-blue/20 bg-vk-blue/5' : 'border-border-main hover:border-vk-blue/40 hover:shadow-lg'}
                ${variant === 'grid' ? 'h-full' : ''}
            `}
        >
            {/* Status Accent Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusColor}`}></div>

            {/* Selection Checkmark Overlay */}
            {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-vk-blue text-white rounded-full flex items-center justify-center shadow-md z-10">
                    <CheckIcon className="w-3.5 h-3.5" />
                </div>
            )}

            <div className={`flex flex-col gap-3 flex-1 ${hideActions ? 'p-3 pl-5 pb-3' : 'p-3 pl-5'}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <img 
                                src={recipient.avatar || 'https://vk.com/images/camera_200.png'} 
                                alt="" 
                                className="w-10 h-10 rounded-full border-2 border-border-main bg-subpanel object-cover shadow-sm" 
                            />
                            {/* CRM Status Dot */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-panel ${statusColor}`} title={CRM_STATUS_LABELS[crmStatus]}></div>
                        </div>
                        
                        <div className="min-w-0 flex flex-col">
                            <div className={`font-bold text-sm truncate leading-tight transition-colors ${isSelected ? 'text-vk-blue' : 'text-text-main group-hover:text-vk-blue'}`}>
                                {recipient.name}
                            </div>
                            {!hideId && (
                                <a 
                                    href={profileLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()} // Prevent card click
                                    className="flex items-center gap-1.5 mt-0.5 opacity-60 hover:opacity-100 transition-opacity hover:text-vk-blue group/link w-fit"
                                    title="Открыть страницу ВКонтакте"
                                >
                                    <VkIcon className="w-3 h-3 text-vk-blue" />
                                    <span className="text-[10px] font-mono tracking-wide group-hover/link:underline">{recipient.vk_user_id}</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tags & Campaign */}
                <div className="flex flex-wrap gap-1.5 items-center">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold truncate max-w-[120px] border ${isDirect ? 'bg-orange-500/5 text-orange-500 border-orange-500/10' : 'bg-subpanel text-text-muted border-border-main'}`}>
                        {displayCampaign}
                    </div>
                    {/* Tags Pills */}
                    {recipient.tags && recipient.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold truncate max-w-[80px]">
                            {tag}
                        </span>
                    ))}
                    {recipient.tags && recipient.tags.length > 3 && (
                        <span className="text-[9px] text-text-muted font-bold">+{recipient.tags.length - 3}</span>
                    )}
                </div>

                {/* Notes Snippet */}
                {recipient.notes && (
                    <div className="bg-subpanel/50 p-2.5 rounded-lg border border-border-main/50 mt-1">
                        <div className="flex gap-2 items-start">
                            <NotebookIcon className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-text-main/80 italic line-clamp-2 leading-relaxed">
                                {recipient.notes}
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="flex-1"></div>
            </div>

            {/* Actions Overlay / Footer */}
            {!hideActions && (
                <div className="flex border-t border-border-main bg-subpanel/30 divide-x divide-border-main/50">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onGoToChat(recipient.vk_user_id); }} 
                        className="flex-1 py-2.5 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors text-xs font-bold text-text-main hover:text-vk-blue group/btn"
                    >
                        <SendIcon className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        <span>Написать</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(e); }} 
                        className="px-4 hover:bg-red-500/10 hover:text-red-500 text-text-muted transition-colors flex items-center justify-center"
                        title="Удалить"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};
