
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Template, TemplateSubtype } from '../types';
import { post, put, del } from '../apiClient';
import { TrashIcon, PlusIcon, ArrowLeftIcon, TemplateIcon, FolderIcon, BarsArrowDownIcon, FaceSmileIcon, RocketIcon } from './icons';
import { ConfirmModal } from './ConfirmModal';
import { countSpintaxVariations } from './utils';

interface TemplatesTabProps {
    templates: Template[];
    refreshAll: () => void;
    highlightId: number | null;
    autoCollapseColumns?: boolean;
    targetCampaign?: string | null;
    disableDeleteConfirm?: boolean;
}

const COMMON_SUBTYPES: Record<string, string> = {
    'greeting': '👋 Приветствие',
    'body': '📝 Основная часть',
    'closing': '🏁 Финал',
    'mixed': '⭐ Обычный'
};

const EMOJI_LIST = [
    "👋", "👍", "🔥", "😊", "🙏", "✅", "❌", "💰", "📈", "📉", "🚀", 
    "⭐", "❤️", "🤔", "👀", "📞", "📩", "🎁", "🎉", "🛑", "⚠️", "⚡",
    "💼", "🤝", "🕐", "📍"
];

export const TemplatesTab: React.FC<TemplatesTabProps> = ({ 
    templates, 
    refreshAll, 
    highlightId, 
    autoCollapseColumns = true,
    targetCampaign,
    disableDeleteConfirm = false 
}) => {
    // === Selection State ===
    const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
    const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Editor State
    const [editorName, setEditorName] = useState('');
    const [editorText, setEditorText] = useState('');
    const [editorSubtype, setEditorSubtype] = useState<string>('mixed'); 
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Stats
    const [uniquenessScore, setUniquenessScore] = useState<number>(1);
    const [isSendingTest, setIsSendingTest] = useState(false);

    // Search State
    const [campaignSearch, setCampaignSearch] = useState('');

    const [phantomCampaign, setPhantomCampaign] = useState<string | null>(null);
    const editorRef = useRef<HTMLInputElement>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // New Campaign Folder Modal State
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, targetName: string, type: 'campaign' | 'subtype' } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Close context menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // === Derived Data ===
    const campaigns = useMemo(() => {
        const campaignMaxIds = new Map<string, number>();
        templates.forEach(t => {
            const name = t.campaign_name || 'Общее';
            const currentMax = campaignMaxIds.get(name) || 0;
            if (t.id > currentMax) {
                campaignMaxIds.set(name, t.id);
            }
        });
        if (!campaignMaxIds.has('Общее') && campaignMaxIds.size === 0) campaignMaxIds.set('Общее', 0);
        if (phantomCampaign && !campaignMaxIds.has(phantomCampaign)) campaignMaxIds.set(phantomCampaign, Number.MAX_SAFE_INTEGER);

        let result = Array.from(campaignMaxIds.keys()).sort((a, b) => {
             const idA = campaignMaxIds.get(a) || 0;
             const idB = campaignMaxIds.get(b) || 0;
             return idB - idA;
        });

        if (campaignSearch) {
            result = result.filter(c => c.toLowerCase().includes(campaignSearch.toLowerCase()));
        }
        return result;
    }, [templates, phantomCampaign, campaignSearch]);

    const availableSubtypes = useMemo(() => {
        if (!selectedCampaign) return [];
        const types = new Set<string>();
        templates.forEach(t => {
            if ((t.campaign_name || 'Общее') === selectedCampaign) types.add(t.subtype || 'mixed');
        });
        return Array.from(types).sort();
    }, [templates, selectedCampaign]);

    const getCampaignCount = (cName: string) => templates.filter(t => (t.campaign_name || 'Общее') === cName).length;
    const getSubtypeCount = (subtype: string) => {
        if (!selectedCampaign) return 0;
        return templates.filter(t => (t.campaign_name || 'Общее') === selectedCampaign && (t.subtype || 'mixed') === subtype).length;
    };

    const filteredTemplates = useMemo(() => {
        if (!selectedCampaign || !selectedSubtype) return [];
        return templates.filter(t => 
            (t.campaign_name || 'Общее') === selectedCampaign && 
            (t.subtype || 'mixed') === selectedSubtype
        );
    }, [templates, selectedCampaign, selectedSubtype]);

    // Calculate Uniqueness Score
    useEffect(() => {
        if (editorText) {
            const score = countSpintaxVariations(editorText);
            setUniquenessScore(score);
        } else {
            setUniquenessScore(1);
        }
    }, [editorText]);

    // Handle Jump from Campaign Tab
    useEffect(() => {
        if (targetCampaign) {
            setPhantomCampaign(targetCampaign);
            setSelectedCampaign(targetCampaign);
            setSelectedSubtype(null); 
            setSelectedTemplate(null);
            setIsCreating(false);
        }
    }, [targetCampaign]);

    // Highlight specific ID
    useEffect(() => {
        if (highlightId) {
            const t = templates.find(temp => temp.id === highlightId);
            if (t) {
                setSelectedCampaign(t.campaign_name || 'Общее');
                setSelectedSubtype(t.subtype || 'mixed');
                setSelectedTemplate(t);
                setEditorName(t.name);
                setEditorText(t.text);
                setEditorSubtype(t.subtype || 'mixed');
                setIsCreating(false);
            }
        }
    }, [highlightId, templates]);

    const handleEmojiSelect = (emoji: string) => {
        const textarea = textAreaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newText = editorText.substring(0, start) + emoji + editorText.substring(end);
            setEditorText(newText);
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + emoji.length, start + emoji.length);
            }, 0);
        } else {
            setEditorText(prev => prev + emoji);
        }
        setShowEmojiPicker(false);
    };

    const handleSaveTemplate = async () => {
        if (!editorName.trim() || !editorText.trim()) return alert("Заполните название и текст");
        if (!selectedCampaign) return alert("Кампания не выбрана");
        
        const finalSubtype = editorSubtype.trim() || 'mixed';

        try {
            if (isCreating) {
                await post('templates', {
                    name: editorName,
                    text: editorText,
                    campaign_name: selectedCampaign,
                    subtype: finalSubtype
                });
                setIsCreating(false);
                if (phantomCampaign === selectedCampaign) setPhantomCampaign(null);
                setSelectedSubtype(finalSubtype);
            } else if (selectedTemplate) {
                await put(`templates/${selectedTemplate.id}`, {
                    name: editorName,
                    text: editorText,
                    campaign_name: selectedCampaign,
                    subtype: finalSubtype
                });
                if (selectedSubtype !== finalSubtype) setSelectedSubtype(finalSubtype);
            }
            refreshAll();
        } catch (e: any) { alert(e.message); }
    };

    const handleTestSend = async () => {
        if (!editorText.trim()) return;
        setIsSendingTest(true);
        try {
            const res = await post<{status: string, message: string}>('templates/test-send', { text: editorText });
            alert(`✅ ${res.message}`);
        } catch (e: any) {
            alert(`Ошибка отправки: ${e.message}`);
        } finally {
            setIsSendingTest(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedTemplate && !isCreating) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSaveTemplate();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedTemplate(null);
                setIsCreating(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedTemplate, isCreating, editorName, editorText, editorSubtype]); 

    const handleSelectCampaign = (campaign: string | null) => {
        if (selectedCampaign === campaign) return;
        setSelectedCampaign(campaign);
        setSelectedSubtype(null);
        setSelectedTemplate(null);
        setIsCreating(false);
    };

    const handleSelectSubtype = (subtype: string | null) => {
        if (selectedSubtype === subtype) return;
        setSelectedSubtype(subtype);
        setSelectedTemplate(null);
        setIsCreating(false);
    };

    const handleSelectTemplate = (t: Template) => {
        setSelectedTemplate(t);
        setEditorName(t.name);
        setEditorText(t.text);
        setEditorSubtype(t.subtype || 'mixed');
        setIsCreating(false);
    };

    const handleCreateClick = () => {
        setIsCreating(true);
        setSelectedTemplate(null);
        setEditorName('');
        setEditorText('');
        setEditorSubtype(selectedSubtype || 'mixed'); 
        setTimeout(() => editorRef.current?.focus(), 100);
    };

    const handleContextMenu = (e: React.MouseEvent, name: string, type: 'campaign' | 'subtype') => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, targetName: name, type });
    };

    const requestDeleteTemplate = (id: number) => {
        if (disableDeleteConfirm) executeDelete(id);
        else { setTemplateToDelete(id); setDeleteModalOpen(true); }
    };

    const executeDelete = async (id: number) => {
        setIsDeleting(true);
        try {
            await del(`templates/${id}`);
            setSelectedTemplate(null);
            setIsCreating(false);
            refreshAll();
            setDeleteModalOpen(false);
            setTemplateToDelete(null);
        } catch (e: any) { alert(e.message); }
        finally { setIsDeleting(false); }
    };

    // Auto-collapse logic
    let depth = 0;
    if (selectedCampaign) depth = 1;
    if (selectedSubtype) depth = 2;
    if (selectedTemplate || isCreating) depth = 3;

    const isCol1Collapsed = autoCollapseColumns && depth > 0; 
    const isCol2Collapsed = autoCollapseColumns && depth > 1; 
    const isCol3Collapsed = autoCollapseColumns && depth > 2; 

    return (
        <div className="flex h-full w-full bg-main text-text-main font-sans overflow-hidden">
             {/* Column 1: Campaigns */}
             <div className={`relative flex flex-col border-r border-border-main bg-panel transition-all duration-300 ease-in-out flex-none ${isCol1Collapsed ? 'w-16' : 'w-72'}`}>
                {/* Header ... */}
                <div className="relative border-b border-border-main flex items-center bg-panel z-10 shrink-0 h-16 w-full overflow-hidden">
                    {!isCol1Collapsed ? (
                        <div className="w-full px-4 flex justify-between items-center gap-2">
                            <div className="flex items-center gap-3 font-bold text-text-main text-sm tracking-wide">
                                <div className="w-8 h-8 rounded-lg bg-vk-blue/10 flex items-center justify-center text-vk-blue"><FolderIcon className="w-5 h-5" /></div>
                                Кампании
                            </div>
                            <button onClick={() => setIsCreateFolderModalOpen(true)} className="p-2 rounded-lg hover:bg-hover transition text-vk-blue"><PlusIcon className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <button onClick={() => handleSelectCampaign(null)} className="w-full h-full flex items-center justify-center hover:bg-hover transition text-text-muted hover:text-vk-blue"><FolderIcon className="w-6 h-6" /></button>
                    )}
                </div>
                {/* List ... */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                    {campaigns.map(c => (
                        <div key={c} onClick={() => handleSelectCampaign(c)} onContextMenu={(e) => handleContextMenu(e, c, 'campaign')} className={`group relative cursor-pointer transition-all duration-200 ${isCol1Collapsed ? 'mx-2 my-1 rounded-xl p-2 flex justify-center items-center h-12' : 'mx-3 my-1 rounded-xl p-3'} ${selectedCampaign === c ? 'bg-vk-blue text-white shadow-md' : 'hover:bg-hover text-text-main'}`}>
                            {isCol1Collapsed ? <div className="font-bold text-xs uppercase">{c.substring(0, 1)}</div> : <div className="font-semibold text-sm truncate">{c} <span className="float-right opacity-50 text-xs">{getCampaignCount(c)}</span></div>}
                        </div>
                    ))}
                </div>
             </div>

             {/* Column 2: Subtypes */}
             {depth >= 1 && (
                 <div className={`relative flex flex-col border-r border-border-main bg-subpanel transition-all duration-300 ease-in-out flex-none ${isCol2Collapsed ? 'w-16' : 'w-72'}`}>
                    <div className="relative border-b border-border-main flex items-center bg-subpanel z-10 shrink-0 h-16 w-full overflow-hidden justify-between px-2">
                        {!isCol2Collapsed ? (
                             <div className="flex items-center gap-2 pl-2 font-bold text-text-main text-sm"><button onClick={() => handleSelectCampaign(null)}><ArrowLeftIcon className="w-4 h-4" /></button> Тип шаблона</div>
                        ) : (
                            <button onClick={() => handleSelectSubtype(null)} className="w-full h-full flex items-center justify-center hover:bg-hover transition text-text-muted hover:text-vk-blue"><BarsArrowDownIcon className="w-6 h-6" /></button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                        {availableSubtypes.map(st => (
                            <div key={st} onClick={() => handleSelectSubtype(st)} className={`cursor-pointer transition-all duration-200 ${isCol2Collapsed ? 'mx-2 my-1 rounded-xl p-1 flex justify-center items-center h-12' : 'mx-3 my-1 rounded-xl p-3'} ${selectedSubtype === st ? 'bg-vk-blue text-white shadow-md' : 'hover:bg-panel text-text-main'}`}>
                                {isCol2Collapsed ? <div className="font-bold">{st[0].toUpperCase()}</div> : <div className="font-medium text-sm flex justify-between">{COMMON_SUBTYPES[st] || st} <span className="opacity-50 text-xs">{getSubtypeCount(st)}</span></div>}
                            </div>
                        ))}
                    </div>
                 </div>
             )}

             {/* Column 3: Templates */}
             {depth >= 2 && (
                 <div className={`relative flex flex-col border-r border-border-main bg-main transition-all duration-300 ease-in-out flex-none ${isCol3Collapsed ? 'w-16' : 'w-80'}`}>
                    <div className="relative border-b border-border-main flex items-center bg-main z-10 shrink-0 h-16 w-full overflow-hidden justify-between px-2">
                         {!isCol3Collapsed ? (
                             <>
                                <div className="flex items-center gap-2 pl-2 font-bold text-text-main text-sm"><button onClick={() => handleSelectSubtype(null)}><ArrowLeftIcon className="w-4 h-4" /></button> Шаблоны</div>
                                <button onClick={handleCreateClick} className="p-2 bg-vk-blue text-white rounded-lg hover:bg-vk-blue-dark"><PlusIcon className="w-4 h-4" /></button>
                             </>
                        ) : (
                            <button onClick={() => { setSelectedTemplate(null); setIsCreating(false); }} className="w-full h-full flex items-center justify-center hover:bg-hover transition text-text-muted hover:text-vk-blue"><TemplateIcon className="w-6 h-6" /></button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                        {filteredTemplates.map(t => (
                            <div key={t.id} onClick={() => handleSelectTemplate(t)} className={`cursor-pointer transition-all duration-200 group relative ${isCol3Collapsed ? 'mx-2 my-1 rounded-xl p-1 flex justify-center items-center h-12' : 'mx-3 my-1 rounded-xl p-3'} ${selectedTemplate?.id === t.id ? 'bg-vk-blue text-white shadow-md' : 'hover:bg-hover/50 text-text-main'}`}>
                                {isCol3Collapsed ? <div className="font-bold">{t.name[0]}</div> : (
                                    <>
                                        <div className="font-bold text-sm truncate pr-6">{t.name}</div>
                                        <div className="text-xs truncate opacity-70">{t.text}</div>
                                        <button onClick={(e) => { e.stopPropagation(); requestDeleteTemplate(t.id); }} className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 ${selectedTemplate?.id === t.id ? 'text-white' : 'text-red-500'}`}><TrashIcon className="w-4 h-4" /></button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                 </div>
             )}

             {/* Column 4: Editor */}
             {depth >= 3 && (selectedTemplate || isCreating) ? (
                 <div className="flex-1 flex flex-col h-full bg-main relative min-w-0 border-l border-border-main shadow-inner">
                    <div className="shrink-0 h-auto border-b border-border-main bg-panel/50 backdrop-blur-sm flex flex-col px-6 py-4 sticky top-0 z-20 gap-3">
                        <input ref={editorRef} value={editorName} onChange={e => setEditorName(e.target.value)} className="w-full bg-transparent text-xl font-bold text-text-main outline-none" placeholder="Название шаблона..." />
                        <div className="flex items-center gap-3 text-xs">
                            <span className="text-text-muted uppercase font-bold tracking-wider">Тип:</span>
                            <input list="subtype-options" value={editorSubtype} onChange={e => setEditorSubtype(e.target.value)} className="bg-subpanel border border-border-main rounded px-2 py-1 text-text-main outline-none w-40 font-mono" placeholder="mixed" />
                            <datalist id="subtype-options"><option value="mixed" /><option value="greeting" /><option value="body" /><option value="closing" /></datalist>
                            <div className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-lg border ${uniquenessScore > 1 ? (uniquenessScore > 50 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20') : 'bg-subpanel text-text-muted border-border-main'}`}>
                                <span className="font-bold">✨ Уникальность:</span>
                                <span className="font-mono">{uniquenessScore}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-6 relative min-h-0 bg-main flex flex-col gap-4">
                        <textarea 
                            ref={textAreaRef}
                            value={editorText}
                            onChange={e => setEditorText(e.target.value)}
                            className="w-full flex-1 bg-subpanel/30 border border-border-main rounded-xl p-6 text-sm text-text-main resize-none focus:border-vk-blue focus:bg-subpanel/50 outline-none transition-all font-mono leading-relaxed custom-scrollbar shadow-inner"
                            placeholder="Текст сообщения... Используйте {A|B} для рандомизации."
                        />
                        
                        <div className="absolute bottom-8 right-8 flex gap-2">
                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-text-muted hover:text-orange-500 hover:bg-orange-500/10 rounded transition bg-panel border border-border-main shadow-sm"><FaceSmileIcon className="w-5 h-5" /></button>
                        </div>
                        {showEmojiPicker && (
                            <div className="absolute bottom-20 right-8 bg-panel border border-border-main shadow-xl rounded-lg p-2 z-50 grid grid-cols-6 gap-1 w-64 animate-fade-in">
                                {EMOJI_LIST.map(emoji => (<button key={emoji} onClick={() => handleEmojiSelect(emoji)} className="text-xl hover:bg-white/10 rounded p-1 transition">{emoji}</button>))}
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 p-4 border-t border-border-main bg-panel flex justify-between items-center z-20">
                        <button onClick={handleTestSend} disabled={isSendingTest} className={`px-4 py-2.5 rounded-xl border font-bold text-xs transition uppercase flex items-center gap-2 ${isSendingTest ? 'bg-gray-700 text-gray-400 cursor-wait' : 'border-purple-500/30 bg-purple-500/5 text-purple-500 hover:bg-purple-500 hover:text-white'}`}>
                            <RocketIcon className="w-4 h-4" /> {isSendingTest ? 'Отправка...' : 'Тест мне'}
                        </button>
                        <button onClick={handleSaveTemplate} className="px-8 py-3 bg-vk-blue text-white rounded-xl hover:bg-vk-blue-dark shadow-lg shadow-vk-blue/20 font-bold text-sm transition uppercase">Сохранить</button>
                    </div>
                 </div>
             ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-30 select-none bg-main border-l border-border-main">
                    <TemplateIcon className="w-32 h-32 mb-6 text-text-muted/50" />
                    <p className="text-xl font-medium">Выберите шаблон</p>
                 </div>
             )}

            <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={() => templateToDelete && executeDelete(templateToDelete)} title="Удаление" message="Удалить шаблон?" />
            <ConfirmModal isOpen={isCreateFolderModalOpen} onClose={() => setIsCreateFolderModalOpen(false)} onConfirm={() => { if(newFolderName.trim()) { setPhantomCampaign(newFolderName.trim()); setSelectedCampaign(newFolderName.trim()); setIsCreating(true); setIsCreateFolderModalOpen(false); }}} title="Новая папка" message=""><input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="w-full bg-subpanel p-3 rounded-lg border border-border-main text-text-main" placeholder="Название..." autoFocus /></ConfirmModal>
        </div>
    );
};
