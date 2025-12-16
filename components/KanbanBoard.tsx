
import React, { useState, useMemo } from 'react';
import { Recipient, CrmStatus } from '../types';
import { CRM_STATUS_LABELS, CRM_STATUS_COLORS } from './StatusBadge';
import { put } from '../apiClient';
import { ClientCard } from './ClientCard';

interface KanbanBoardProps {
    recipients: Recipient[];
    onUpdate: () => void;
    onGoToChat: (vk_id: string) => void;
    onDelete: (e: React.MouseEvent, id: number) => void;
    onSelect: (recipient: Recipient) => void;
}

const COLUMNS: CrmStatus[] = ['new', 'progress', 'hot', 'success', 'reject'];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
    recipients, 
    onUpdate, 
    onGoToChat, 
    onDelete,
    onSelect
}) => {
    const [draggedRecipientId, setDraggedRecipientId] = useState<number | null>(null);

    // Group recipients by status
    const columnsData = useMemo(() => {
        const data: Record<CrmStatus, Recipient[]> = {
            new: [], progress: [], hot: [], success: [], reject: []
        };
        recipients.forEach(r => {
            const status = r.crm_status || 'new';
            if (data[status]) data[status].push(r);
        });
        return data;
    }, [recipients]);

    const handleDragStart = (e: React.DragEvent, id: number) => {
        setDraggedRecipientId(id);
        e.dataTransfer.effectAllowed = "move";
        // Make the drag ghost slightly transparent if possible or rely on browser default
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = async (e: React.DragEvent, targetStatus: CrmStatus) => {
        e.preventDefault();
        if (draggedRecipientId === null) return;

        try {
            await put(`recipients/${draggedRecipientId}/status`, { status: targetStatus });
            onUpdate();
        } catch (err) {
            alert('Failed to update status');
        } finally {
            setDraggedRecipientId(null);
        }
    };

    const getColumnStyles = (status: CrmStatus) => {
        const classes = CRM_STATUS_COLORS[status];
        // Extract basic color
        if (classes.includes('green')) return { border: 'border-green-500', bg: 'bg-green-500/5', header: 'text-green-600' };
        if (classes.includes('blue')) return { border: 'border-blue-500', bg: 'bg-blue-500/5', header: 'text-blue-500' };
        if (classes.includes('amber')) return { border: 'border-amber-500', bg: 'bg-amber-500/5', header: 'text-amber-600' };
        if (classes.includes('red')) return { border: 'border-red-500', bg: 'bg-red-500/5', header: 'text-red-500' };
        return { border: 'border-gray-500', bg: 'bg-subpanel/50', header: 'text-gray-500' };
    };

    return (
        <div className="flex h-full overflow-x-auto p-6 gap-4 custom-scrollbar items-start">
            {COLUMNS.map(status => {
                const styles = getColumnStyles(status);
                const count = columnsData[status].length;

                return (
                    <div 
                        key={status}
                        className={`flex-shrink-0 w-[300px] flex flex-col rounded-xl border border-border-main max-h-full transition-colors ${styles.bg}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        {/* Column Header */}
                        <div className={`p-3 border-b border-border-main rounded-t-xl flex justify-between items-center bg-panel/50 backdrop-blur-sm sticky top-0 z-10 border-t-4 ${styles.border.replace('border-', 'border-t-')}`}>
                            <div className={`font-black text-xs uppercase tracking-widest ${styles.header}`}>
                                {CRM_STATUS_LABELS[status]}
                            </div>
                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-border-main bg-main shadow-sm ${styles.header}`}>
                                {count}
                            </div>
                        </div>

                        {/* Cards Container */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar min-h-[150px]">
                            {columnsData[status].map(recipient => (
                                <div 
                                    key={recipient.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, recipient.id)}
                                    className="cursor-move transform transition-transform hover:scale-[1.02] active:scale-95 active:opacity-80"
                                >
                                    <ClientCard 
                                        recipient={recipient}
                                        onClick={() => onSelect(recipient)}
                                        onGoToChat={onGoToChat}
                                        onDelete={(e) => onDelete(e, recipient.id)}
                                        variant="compact"
                                    />
                                </div>
                            ))}
                            {count === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-text-muted text-[10px] uppercase font-bold tracking-widest opacity-30 py-10">
                                    Пусто
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    );
};
