
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { post } from '../apiClient';
import { CheckIcon, TrashIcon, RefreshIcon, LightningIcon, FolderIcon } from './icons';

interface AccountImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedAccount {
    token: string | null;
    login: string | null;
    password: string | null;
    vk_id: string | null;
}

export const AccountImportModal: React.FC<AccountImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [rawText, setRawText] = useState('');
    const [parsedData, setParsedData] = useState<ParsedAccount[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [targetGroup, setTargetGroup] = useState('Imported');

    if (!isOpen) return null;

    const handleParse = async () => {
        if (!rawText.trim()) return;
        setIsProcessing(true);
        try {
            const res = await post<{ count: number, parsed: ParsedAccount[] }>('accounts/parse', { text: rawText });
            setParsedData(res.parsed);
            setStep('preview');
        } catch (e: any) {
            alert("Ошибка парсинга: " + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        setIsProcessing(true);
        try {
            await post('accounts/batch', { accounts: parsedData, group_name: targetGroup });
            onSuccess();
            onClose();
            // Reset
            setStep('input');
            setRawText('');
            setParsedData([]);
        } catch (e: any) {
            alert("Ошибка сохранения: " + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const removeRow = (index: number) => {
        setParsedData(prev => prev.filter((_, i) => i !== index));
    };

    return createPortal(
        <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-panel rounded-xl shadow-2xl border border-border-main w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()} 
            >
                <div className="p-6 border-b border-border-main bg-subpanel/50 flex justify-between items-center">
                    <h3 className="text-xl font-black text-text-main flex items-center gap-2">
                        <LightningIcon className="w-6 h-6 text-yellow-500" />
                        Массовый Импорт Аккаунтов
                    </h3>
                    <div className="flex gap-2">
                        {step === 'preview' && (
                            <button onClick={() => setStep('input')} className="px-4 py-2 text-xs font-bold rounded-lg border border-border-main text-text-muted hover:text-text-main hover:bg-subpanel">
                                Назад
                            </button>
                        )}
                        <button onClick={onClose} className="text-text-muted hover:text-text-main text-2xl leading-none px-2">&times;</button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-6 bg-main flex flex-col">
                    {step === 'input' ? (
                        <>
                            <div className="mb-4 text-sm text-text-muted bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                <p className="font-bold text-blue-400 mb-2">💡 Как это работает?</p>
                                <p>Вставьте список аккаунтов в любом формате. Система сама найдет токены, логины и пароли.</p>
                                <p className="mt-2 opacity-70">Поддерживаются разделители: <code>:</code> <code>;</code> <code>|</code></p>
                            </div>
                            <textarea 
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                                className="flex-1 w-full bg-subpanel border border-border-main rounded-xl p-4 font-mono text-xs text-text-main resize-none focus:border-vk-blue outline-none"
                                placeholder={`79991234567:pass:token\n79990000000;pass;token\n...`}
                            />
                        </>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-sm font-bold text-text-main">
                                    Найдено аккаунтов: <span className="text-green-500">{parsedData.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FolderIcon className="w-4 h-4 text-text-muted"/>
                                    <input 
                                        value={targetGroup}
                                        onChange={e => setTargetGroup(e.target.value)}
                                        className="bg-subpanel border border-border-main rounded-lg px-3 py-1.5 text-xs text-text-main outline-none focus:border-vk-blue"
                                        placeholder="Имя группы..."
                                    />
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar border border-border-main rounded-xl bg-subpanel/30">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-panel z-10 text-[10px] uppercase text-text-muted font-bold tracking-wider">
                                        <tr>
                                            <th className="p-3 border-b border-border-main">Токен</th>
                                            <th className="p-3 border-b border-border-main">Логин</th>
                                            <th className="p-3 border-b border-border-main">Пароль</th>
                                            <th className="p-3 border-b border-border-main w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-main text-xs font-mono">
                                        {parsedData.map((acc, idx) => (
                                            <tr key={idx} className="hover:bg-subpanel/50 group transition-colors">
                                                <td className="p-3 truncate max-w-[200px]" title={acc.token || ''}>
                                                    {acc.token ? <span className="text-green-500 font-bold">FOUND</span> : <span className="text-red-500">MISSING</span>}
                                                    <span className="ml-2 opacity-50">{acc.token?.substring(0, 20)}...</span>
                                                </td>
                                                <td className="p-3 text-text-main">{acc.login || <span className="opacity-30">-</span>}</td>
                                                <td className="p-3 text-text-muted">{acc.password || <span className="opacity-30">-</span>}</td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => removeRow(idx)} className="text-text-muted hover:text-red-500 p-1 rounded hover:bg-red-500/10">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-border-main bg-subpanel/50 flex justify-end gap-3">
                    {step === 'input' ? (
                        <button 
                            onClick={handleParse}
                            disabled={isProcessing || !rawText.trim()}
                            className="px-6 py-3 bg-vk-blue hover:bg-vk-blue-dark text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <LightningIcon className="w-4 h-4"/>}
                            Разобрать текст
                        </button>
                    ) : (
                        <button 
                            onClick={handleSave}
                            disabled={isProcessing || parsedData.length === 0}
                            className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <CheckIcon className="w-4 h-4"/>}
                            Импортировать {parsedData.length} акк.
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
