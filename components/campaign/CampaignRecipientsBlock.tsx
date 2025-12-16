
import React, { useState, useRef, useEffect } from 'react';
import { UserGroupIcon, SearchIcon, BarsArrowDownIcon, CloudArrowUpIcon, RefreshIcon, DatabaseIcon } from '../icons';
import { API_BASE_URL } from '../../config';
import { CampaignDatabaseImportModal } from './CampaignDatabaseImportModal';

interface CampaignRecipientsBlockProps {
    recipientSource: 'manual' | 'campaign';
    setRecipientSource: (val: 'manual' | 'campaign') => void;
    recipientMode: 'auto' | 'users' | 'groups';
    setRecipientMode: (val: 'auto' | 'users' | 'groups') => void;
    bulkIds: string;
    setBulkIds: (val: React.SetStateAction<string>) => void;
    sourceRecipientCampaign: string;
    setSourceRecipientCampaign: (val: string) => void;
    pastCampaigns: string[];
    error?: boolean;
}

export const CampaignRecipientsBlock: React.FC<CampaignRecipientsBlockProps> = ({
    recipientSource, setRecipientSource,
    recipientMode, setRecipientMode,
    bulkIds, setBulkIds,
    sourceRecipientCampaign, setSourceRecipientCampaign,
    pastCampaigns,
    error
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDbImportOpen, setIsDbImportOpen] = useState(false); // Modal State
    
    const wrapperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCampaigns = pastCampaigns.filter(c => 
        !sourceRecipientCampaign || c.toLowerCase().includes(sourceRecipientCampaign.toLowerCase())
    );

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setIsUploading(true);
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const res = await fetch(`${API_BASE_URL}/campaigns/import-recipients`, { 
                    method: 'POST', 
                    body: formData 
                });
                const data = await res.json();
                
                if (data.status === 'ok') {
                    const newText = data.text;
                    setBulkIds(prev => prev ? prev + '\n' + newText : newText);
                    setRecipientSource('manual'); // Switch to manual mode so they see the IDs
                } else {
                    alert('Ошибка импорта: ' + data.error);
                }
            } catch (err: any) { 
                alert('Network error: ' + err.message); 
            } finally { 
                setIsUploading(false); 
                if (fileInputRef.current) fileInputRef.current.value = ''; 
            }
        }
    };

    const handleDbImport = (ids: string[]) => {
        const text = ids.join('\n');
        setBulkIds(prev => prev ? prev + '\n' + text : text);
        setRecipientSource('manual');
    };

    return (
        <div className={`space-y-3 ${error ? 'animate-pulse' : ''}`}>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4" /> Получатели / Источник
                </div>
                {/* Tools */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsDbImportOpen(true)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-subpanel hover:bg-hover border border-border-main text-[10px] font-bold transition text-text-main"
                        title="Импорт из внутренней CRM"
                    >
                        <DatabaseIcon className="w-3 h-3 text-purple-500" />
                        <span>Из CRM</span>
                    </button>

                    <div className="h-4 w-px bg-border-main"></div>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".txt,.csv,.xlsx" 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded bg-subpanel hover:bg-hover border border-border-main text-[10px] font-bold transition ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                        title="Импорт из TXT, CSV"
                    >
                        {isUploading ? (
                            <RefreshIcon className="w-3 h-3 animate-spin" />
                        ) : (
                            <CloudArrowUpIcon className="w-3 h-3 text-vk-blue" />
                        )}
                        <span>Загрузить файл</span>
                    </button>
                </div>
            </label>
            
            <div className="bg-panel rounded-xl border border-border-main overflow-hidden">
                <div className="flex border-b border-border-main overflow-x-auto no-scrollbar">
                    <button onClick={() => { setRecipientSource('manual'); setRecipientMode('auto'); }} className={`flex-1 py-3 px-2 text-xs font-bold uppercase whitespace-nowrap transition ${recipientSource === 'manual' ? 'bg-subpanel text-vk-blue' : 'hover:bg-hover text-text-muted'}`}>Вручную</button>
                    <div className="w-px bg-border-main shrink-0"></div>
                    <button onClick={() => { setRecipientSource('campaign'); setRecipientMode('auto'); }} className={`flex-1 py-3 px-2 text-xs font-bold uppercase whitespace-nowrap transition ${recipientSource === 'campaign' ? 'bg-subpanel text-vk-blue' : 'hover:bg-hover text-text-muted'}`}>Прошлая кампания</button>
                </div>
                
                <div className="p-4">
                    {recipientSource === 'campaign' && (
                        <div className="mb-3 relative z-20" ref={wrapperRef}>
                            <label className="text-[10px] text-text-muted font-bold mb-1 block uppercase">Выберите прошлую кампанию:</label>
                            
                            <div className="relative group">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-vk-blue transition-colors" />
                                <input 
                                    value={sourceRecipientCampaign} 
                                    onChange={e => {
                                        setSourceRecipientCampaign(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onClick={() => setShowSuggestions(true)}
                                    className="w-full bg-subpanel text-text-main p-2.5 pl-9 pr-8 rounded-lg border border-border-main text-sm outline-none focus:border-vk-blue placeholder-text-muted transition-all cursor-pointer"
                                    placeholder="Начните вводить название..." 
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    <BarsArrowDownIcon className={`w-3 h-3 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            {/* Autocomplete Dropdown */}
                            {showSuggestions && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-panel border border-border-main rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar z-50 animate-fade-in">
                                    {filteredCampaigns.length > 0 ? (
                                        filteredCampaigns.map(c => (
                                            <div 
                                                key={c} 
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setSourceRecipientCampaign(c);
                                                    setShowSuggestions(false);
                                                }}
                                                className="px-3 py-2 text-xs font-medium hover:bg-hover cursor-pointer border-b border-border-main last:border-0 text-text-main flex justify-between items-center"
                                            >
                                                <span>{c}</span>
                                                {c === sourceRecipientCampaign && <span className="text-vk-blue font-bold">✓</span>}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 text-xs text-text-muted text-center">
                                            Ничего не найдено
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setRecipientMode('auto')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition ${recipientMode === 'auto' ? 'bg-vk-blue text-white border-vk-blue' : 'border-border-main text-text-muted hover:text-text-main'}`}>Авто</button>
                        <button onClick={() => setRecipientMode('users')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition ${recipientMode === 'users' ? 'bg-blue-600 text-white border-blue-600' : 'border-border-main text-text-muted hover:text-text-main'}`}>Люди (ID+)</button>
                        <button onClick={() => setRecipientMode('groups')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition ${recipientMode === 'groups' ? 'bg-purple-600 text-white border-purple-600' : 'border-border-main text-text-muted hover:text-text-main'}`}>Группы (ID-)</button>
                    </div>
                    
                    <textarea 
                        value={bulkIds} 
                        onChange={e => setBulkIds(e.target.value)} 
                        readOnly={recipientSource === 'campaign'} 
                        className={`w-full bg-subpanel p-4 rounded-xl border border-border-main h-32 text-xs font-mono text-text-main focus:border-vk-blue outline-none resize-none leading-relaxed custom-scrollbar ${recipientSource === 'campaign' ? 'opacity-70 cursor-not-allowed' : ''}`} 
                        placeholder={recipientSource === 'campaign' ? 'ID загрузятся автоматически...' : `id12345\nhttps://vk.com/durov\nclub123456`} 
                    />
                </div>
            </div>

            <CampaignDatabaseImportModal 
                isOpen={isDbImportOpen}
                onClose={() => setIsDbImportOpen(false)}
                onImport={handleDbImport}
            />
        </div>
    );
};
