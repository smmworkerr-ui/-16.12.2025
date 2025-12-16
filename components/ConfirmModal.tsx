
import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isLoading?: boolean;
    children?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, onClose, onConfirm, title, message, isLoading, children
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-panel rounded-xl shadow-2xl border border-border-main p-6 w-full max-w-md transform transition-all scale-100 relative"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                <h3 className="text-lg font-bold text-text-main mb-2">{title}</h3>
                <p className="text-text-muted mb-4 text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
                
                {children && (
                    <div className="mb-6">
                        {children}
                    </div>
                )}
                
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-bold text-text-muted bg-subpanel border border-border-main rounded-lg hover:bg-hover hover:text-text-main transition-colors disabled:opacity-50"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2 border border-red-500"
                    >
                        {isLoading ? (
                            <>
                                <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                                Обработка...
                            </>
                        ) : 'Подтвердить'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
