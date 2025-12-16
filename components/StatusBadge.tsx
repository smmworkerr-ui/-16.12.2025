
import React from 'react';
import { CrmStatus } from '../types';

export const CRM_STATUS_LABELS: Record<CrmStatus, string> = {
    'new': 'Новый',
    'progress': 'В работе',
    'hot': 'Лид',
    'success': 'Клиент',
    'reject': 'Отказ'
};

export const CRM_STATUS_COLORS: Record<CrmStatus, string> = {
    'new': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    'progress': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'hot': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'success': 'bg-green-500/10 text-green-500 border-green-500/20',
    'reject': 'bg-red-500/10 text-red-500 border-red-500/20'
};

interface StatusBadgeProps {
    status: CrmStatus;
    className?: string;
    onClick?: () => void;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, onClick }) => {
    // Fallback if status is undefined or unknown
    const safeStatus = CRM_STATUS_LABELS[status] ? status : 'new';
    
    return (
        <span 
            onClick={onClick}
            className={`
                px-2.5 py-0.5 rounded-full text-xs font-bold border
                uppercase tracking-wide transition-colors whitespace-nowrap
                ${CRM_STATUS_COLORS[safeStatus]} 
                ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
                ${className || ''}
            `}
        >
            {CRM_STATUS_LABELS[safeStatus]}
        </span>
    );
};
