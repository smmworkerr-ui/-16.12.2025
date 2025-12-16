
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Template, ConstructorPart } from '../../types';
import { TemplateIcon, PaperClipIcon, LinkIcon, SparklesIcon, FaceSmileIcon, RefreshIcon, CheckIcon, XIcon, GearIcon, PlusIcon, TrashIcon, KeyboardIcon, EyeIcon } from '../icons';
import { CampaignInlineEditor } from '../CampaignInlineEditor';
import { processSpintax, countSpintaxVariations, analyzeSpintax } from '../utils';
import { API_BASE_URL } from '../../config';
import { post, del } from '../../apiClient';

// Constants
const WHOLE_MODE_PART_ID = 'whole_mode_part';
const EMOJI_LIST = [ "👋", "👍", "🔥", "😊", "🙏", "✅", "❌", "💰", "📈", "📉", "🚀", "⭐", "❤️", "🤔", "👀", "📞", "📩", "🎁", "🎉", "🛑", "⚠️", "⚡", "💼", "🤝", "🕐", "📍" ];

interface CampaignMessageBlockProps {
    templates: Template[];
    messageMode: 'template' | 'custom' | 'constructor';
    setMessageMode: (m: 'template' | 'custom' | 'constructor') => void;
    customText: string;
    setCustomText: React.Dispatch<React.SetStateAction<string>>;
    uploadedAttachments: {id: string, name: string}[];
    setUploadedAttachments: React.Dispatch<React.SetStateAction<{id: string, name: string}[]>>;
    // Whole Mode
    wholeCampaignName: string;
    setWholeCampaignName: (val: string) => void;
    wholeSubtype: string;
    setWholeSubtype: (val: string) => void;
    isSpecificTemplateSelectionEnabled: boolean;
    setIsSpecificTemplateSelectionEnabled: (val: boolean) => void;
    selectedTemplateIds: number[];
    setSelectedTemplateIds: React.Dispatch<React.SetStateAction<number[]>>;
    // Constructor Mode
    sourceCampaignName: string;
    setSourceCampaignName: (val: string) => void;
    constructorParts: ConstructorPart[];
    setConstructorParts: React.Dispatch<React.SetStateAction<ConstructorPart[]>>;
    constructorNoNewlines: boolean;
    setConstructorNoNewlines: (val: boolean) => void;
    // Shared
    handleCreateTemplateCampaign: () => void;
    refreshAll: () => void;
    totalCombinations: number;
    error?: boolean;
}

// --- INTEGRATED SPINTAX EDITOR COMPONENT ---
const IntegratedSpintaxEditor: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}> = ({ value, onChange, placeholder, textareaRef }) => {
    
    // Analyze text for rendering
    const renderedContent = useMemo(() => {
        const blocks = analyzeSpintax(value);
        return blocks.map((block, idx) => {
            if (block.type === 'static') {
                return <span key={idx}>{block.content}</span>;
            }
            // Group block
            return (
                <span key={idx} className="relative inline-block text-vk-blue">
                    {/* The text content of the group */}
                    <span className="opacity-90">{block.raw}</span>
                    
                    {/* The Badge - Positioned absolutely to NOT affect text flow/layout of the parent span 
                        This ensures the visual layer aligns perfectly with the textarea layer */}
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-bold px-1 rounded shadow-sm border border-gray-600 select-none whitespace-nowrap z-10 pointer-events-none">
                        ={block.count}
                    </span>
                </span>
            );
        });
    }, [value]);

    return (
        <div className="relative w-full min-h-[120px] bg-subpanel rounded-xl border border-border-main focus-within:border-vk-blue focus-within:ring-1 focus-within:ring-vk-blue/20 transition-all overflow-hidden group">
            {/* Grid Container to stack Textarea and Backdrop perfectly */}
            <div className="grid grid-cols-1 grid-rows-1 relative">
                
                {/* LAYER 1: BACKDROP (VISUALS) */}
                {/* pointer-events-none ensures clicks pass through to textarea */}
                <div 
                    className="col-start-1 row-start-1 p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words pointer-events-none text-text-main z-0"
                    aria-hidden="true"
                >
                    {/* Render colorized blocks */}
                    {renderedContent}
                    {/* Trailing break to ensure height match if text ends with newline */}
                    <br /> 
                </div>

                {/* LAYER 2: TEXTAREA (INPUT) */}
                {/* color: transparent hides the raw text, caret-color: white keeps cursor visible */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="col-start-1 row-start-1 w-full h-full p-4 bg-transparent text-sm font-mono leading-relaxed whitespace-pre-wrap break-words text-transparent caret-text-main outline-none resize-none z-10 overflow-hidden"
                    placeholder={placeholder}
                    spellCheck={false}
                />
            </div>
            
            {/* Placeholder Visual if empty (since textarea placeholder might be transparent or hard to style) */}
            {!value && (
                <div className="absolute top-4 left-4 text-text-muted text-sm font-mono opacity-50 pointer-events-none">
                    {placeholder}
                </div>
            )}
        </div>
    );
};


export const CampaignMessageBlock: React.FC<CampaignMessageBlockProps> = ({
    templates,
    messageMode, setMessageMode,
    customText, setCustomText,
    uploadedAttachments, setUploadedAttachments,
    wholeCampaignName, setWholeCampaignName,
    wholeSubtype, setWholeSubtype,
    isSpecificTemplateSelectionEnabled, setIsSpecificTemplateSelectionEnabled,
    selectedTemplateIds, setSelectedTemplateIds,
    sourceCampaignName, setSourceCampaignName,
    constructorParts, setConstructorParts,
    constructorNoNewlines, setConstructorNoNewlines,
    handleCreateTemplateCampaign,
    refreshAll,
    totalCombinations,
    error
}) => {
    // Internal UI State
    const [isUploading, setIsUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showConstructorPreview, setShowConstructorPreview] = useState(false);
    const [previewText, setPreviewText] = useState('');
    
    // Inline Editor State
    const [activeEditorIds, setActiveEditorIds] = useState<string[]>([]);
    const [editorValues, setEditorValues] = useState<Record<string, string>>({});
    const [isSavingTemplates, setIsSavingTemplates] = useState(false);
    const [creatingSubtypeForPartId, setCreatingSubtypeForPartId] = useState<string | null>(null);
    const [newSubtypeValues, setNewSubtypeValues] = useState<Record<string, string>>({});
    const [showEmojiPickerForEditor, setShowEmojiPickerForEditor] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // -- Derived --
    const campaignSuggestions = useMemo(() => {
        const campaignMaxIds = new Map<string, number>();
        templates.forEach(t => {
            const name = t.campaign_name || 'Общее';
            if (t.id > (campaignMaxIds.get(name) || 0)) campaignMaxIds.set(name, t.id);
        });
        return Array.from(campaignMaxIds.keys()).sort((a, b) => (campaignMaxIds.get(b) || 0) - (campaignMaxIds.get(a) || 0));
    }, [templates]);

    const availableSubtypes = useMemo(() => {
        const target = messageMode === 'template' ? wholeCampaignName : sourceCampaignName;
        if (!target) return [];
        const types = new Set<string>();
        templates.forEach(t => { if ((t.campaign_name || 'Общее') === target) types.add(t.subtype || 'mixed'); });
        return Array.from(types).sort();
    }, [templates, wholeCampaignName, sourceCampaignName, messageMode]);

    const wholeModeTemplates = useMemo(() => {
        if (!wholeCampaignName) return [];
        return templates.filter(t => 
            (t.campaign_name || 'Общее') === wholeCampaignName && 
            (wholeSubtype ? (t.subtype || 'mixed') === wholeSubtype : true)
        );
    }, [templates, wholeCampaignName, wholeSubtype]);

    // -- Helpers for Spintax Parsing --
    
    // Splits a spintax string like "{A/B/C}" or "A" into ["A", "B", "C"] or ["A"]
    // Respects nested brackets
    const parseSpintaxToParts = (text: string): string[] => {
        const trimmed = text.trim();
        if (!trimmed) return [];

        let inner = trimmed;
        // Strip outer brackets if present (e.g. {A/B})
        if (inner.startsWith('{') && inner.endsWith('}')) {
            // Check if it's a single group covering the whole string
            // We do a balance check to ensure the last } matches the first {
            let balance = 0;
            let isSingleGroup = true;
            for(let i=0; i<inner.length-1; i++) {
                if(inner[i] === '{') balance++;
                if(inner[i] === '}') balance--;
                if(balance === 0 && i > 0) {
                    isSingleGroup = false; 
                    break;
                }
            }
            if(isSingleGroup) {
                inner = inner.substring(1, inner.length - 1);
            }
        }

        const parts: string[] = [];
        let balance = 0;
        let current = "";
        
        for (const char of inner) {
            if (char === '{') balance++;
            if (char === '}') balance--;
            
            // Split at top level only
            if (balance === 0 && (char === '/' || char === '|')) {
                if(current.trim()) parts.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        if (current.trim()) parts.push(current.trim());
        
        return parts;
    };

    // -- Handlers --
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.status === 'ok') setUploadedAttachments(prev => [...prev, { id: data.attachment, name: file.name }]);
                else alert('Ошибка: ' + data.error);
            } catch (err: any) { alert('Network error: ' + err.message); } 
            finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        if (textareaRef.current) {
            const el = textareaRef.current;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            setCustomText(prev => prev.substring(0, start) + emoji + prev.substring(end));
            setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
        } else {
            setCustomText(prev => prev + emoji);
        }
        setShowEmojiPicker(false);
    };

    // Editor Logic
    const handleToggleEditorForPart = (partId: string, subtype: string) => {
        if (activeEditorIds.includes(partId)) {
            setActiveEditorIds(prev => prev.filter(id => id !== partId));
            setShowEmojiPickerForEditor(prev => prev === partId ? null : prev);
        } else {
            const cName = partId === WHOLE_MODE_PART_ID ? wholeCampaignName : sourceCampaignName;
            const filtered = templates.filter(t => (t.campaign_name || 'Общее') === cName && (t.subtype || 'mixed') === subtype);
            
            // CONVERT LIST OF TEMPLATES TO SINGLE SPINTAX STRING
            // ["Hi", "Hello"] -> "{Hi/Hello}"
            let combinedText = "";
            if (filtered.length > 0) {
                const parts = filtered.map(t => t.text);
                // Wrap in braces if there is more than 1 option OR if it looks like we are building a variation set
                // Actually, for consistency, let's always present it as a Spintax block if it's meant to be variants.
                // But simple text "Hello" is also valid.
                // If we want {A/B} format:
                if (parts.length > 1) {
                    combinedText = `{${parts.join('/')}}`;
                } else {
                    combinedText = parts[0]; 
                }
            }
            
            setEditorValues(prev => ({ ...prev, [partId]: combinedText }));
            setActiveEditorIds(prev => [...prev, partId]);
        }
    };

    const handleSaveSubtypeTemplates = async (partId: string, subtype: string) => {
        if (!subtype) return;
        const cName = partId === WHOLE_MODE_PART_ID ? wholeCampaignName : sourceCampaignName;
        setIsSavingTemplates(true);
        try {
            // 1. Delete existing for this subtype
            const existing = templates.filter(t => (t.campaign_name || 'Общее') === cName && (t.subtype || 'mixed') === subtype);
            await Promise.all(existing.map(t => del(`templates/${t.id}`)));
            
            // 2. Parse editor value back to individual texts
            const rawText = editorValues[partId] || "";
            const newTexts = parseSpintaxToParts(rawText);
            
            // 3. Save new
            if (newTexts.length > 0) {
                await Promise.all(newTexts.map((text, idx) => post('templates', { name: `${subtype}_${idx+1}`, text, campaign_name: cName, subtype })));
            }
            refreshAll();
        } catch (e: any) { alert('Ошибка сохранения: ' + e.message); } 
        finally { setIsSavingTemplates(false); }
    };

    const handleConfirmNewSubtype = (id: string) => {
        const val = newSubtypeValues[id]?.trim();
        if (val) {
            if (id === WHOLE_MODE_PART_ID) setWholeSubtype(val);
            else setConstructorParts(prev => prev.map(p => p.id === id ? { ...p, subtype: val } : p));
            
            if (!activeEditorIds.includes(id)) {
                setActiveEditorIds(prev => [...prev, id]);
                if (!editorValues[id]) setEditorValues(prev => ({ ...prev, [id]: '' }));
            }
        }
        setCreatingSubtypeForPartId(null);
    };

    const handleGeneratePreview = () => {
        const parts: string[] = [];
        if (messageMode === 'custom') {
            parts.push(processSpintax(customText));
        } else if (messageMode === 'template') {
            const options = templates.filter(t => (t.campaign_name || 'Общее') === wholeCampaignName && (wholeSubtype ? (t.subtype || 'mixed') === wholeSubtype : true));
            if (options.length === 0) parts.push(`[Нет вариантов]`);
            else parts.push(processSpintax(options[Math.floor(Math.random() * options.length)].text));
        } else {
            constructorParts.forEach(part => {
                if (!part.subtype) return;
                const options = templates.filter(t => (t.campaign_name || 'Общее') === sourceCampaignName && (t.subtype || 'mixed') === part.subtype);
                if (options.length === 0) parts.push(`[Нет вариантов: ${part.subtype}]`);
                else parts.push(processSpintax(options[Math.floor(Math.random() * options.length)].text));
            });
        }
        setPreviewText(parts.join(constructorNoNewlines ? " " : "\n\n"));
        setShowConstructorPreview(true);
    };

    const handleEditorEmojiSelect = (partId: string, emoji: string) => {
        const currentText = editorValues[partId] || '';
        const el = document.getElementById(`editor-textarea-${partId}`) as HTMLTextAreaElement;
        if (el) {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const newText = currentText.substring(0, start) + emoji + currentText.substring(end);
            setEditorValues(prev => ({ ...prev, [partId]: newText }));
            setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
        } else {
            setEditorValues(prev => ({ ...prev, [partId]: currentText + emoji }));
        }
        setShowEmojiPickerForEditor(null);
    };

    const toggleTemplate = (id: number) => { setSelectedTemplateIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
    const selectAllTemplates = () => {
        if (selectedTemplateIds.length === wholeModeTemplates.length) setSelectedTemplateIds([]);
        else setSelectedTemplateIds(wholeModeTemplates.map(t => t.id));
    };

    const showTools = ((messageMode === 'constructor' && sourceCampaignName) || 
                       (messageMode === 'template' && wholeCampaignName) || 
                       (messageMode === 'custom' && customText.length > 0));

    return (
        <div className={`bg-panel rounded-xl border p-5 shadow-sm transition-all relative ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-border-main'}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2"><TemplateIcon className="w-4 h-4" /> Сообщение</label>
                <div className="bg-subpanel p-1 rounded-lg flex border border-border-main">
                    {[{ id: 'template', label: 'Цельные' }, { id: 'constructor', label: 'Конструктор' }, { id: 'custom', label: 'Свой текст' }].map(tab => (
                        <button key={tab.id} onClick={() => setMessageMode(tab.id as any)} className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${messageMode === tab.id ? 'bg-vk-blue text-white shadow' : 'text-text-muted hover:text-text-main'}`}>{tab.label}</button>
                    ))}
                </div>
            </div>

            {/* Attachments List */}
            {uploadedAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 bg-subpanel/50 p-2 rounded-lg border border-border-main">
                    {uploadedAttachments.map((att, idx) => (
                        <div key={idx} className="bg-panel border border-border-main rounded px-2 py-1 flex items-center gap-2 text-xs">
                            <PaperClipIcon className="w-3 h-3 text-vk-blue" /><span className="max-w-[150px] truncate">{att.name}</span>
                            <button onClick={() => setUploadedAttachments(p => p.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-500/10 rounded font-bold px-1">×</button>
                        </div>
                    ))}
                </div>
            )}

            {/* --- CUSTOM TEXT MODE (INTEGRATED) --- */}
            {messageMode === 'custom' && (
                <div className="space-y-2">
                    <div className="relative group">
                        <IntegratedSpintaxEditor 
                            value={customText}
                            onChange={setCustomText}
                            textareaRef={textareaRef}
                            placeholder="Начните печатать... Используйте {Привет|Здравствуй} для рандомизации."
                        />
                        
                        {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-2 bg-panel border border-border-main shadow-xl rounded-lg p-2 z-50 grid grid-cols-6 gap-1 w-64 animate-fade-in">
                                {EMOJI_LIST.map(emoji => <button key={emoji} onClick={() => handleEmojiSelect(emoji)} className="text-xl hover:bg-white/10 rounded p-1 transition">{emoji}</button>)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- TEMPLATE MODE (WHOLE) --- */}
            {messageMode === 'template' && (
                <div className="space-y-4">
                    <div className="flex gap-2 items-start">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-text-muted uppercase block mb-1.5 ml-1">Папка</label>
                            <select value={wholeCampaignName} onChange={e => { if (e.target.value === '__CREATE_NEW__') handleCreateTemplateCampaign(); else { setWholeCampaignName(e.target.value); setSelectedTemplateIds([]); } }} className="w-full bg-subpanel text-text-main p-3 rounded-lg border border-border-main outline-none text-sm focus:border-vk-blue font-medium"><option value="__CREATE_NEW__" className="text-vk-blue font-bold">＋ Создать новую</option><option disabled>──────────────</option><option value="">-- Папка --</option>{campaignSuggestions.map(c => <option key={c} value={c}>{c}</option>)}</select>
                        </div>
                        <div className="w-1/3">
                            <label className="text-[10px] font-bold text-text-muted uppercase block mb-1.5 ml-1">Тип</label>
                            {creatingSubtypeForPartId === WHOLE_MODE_PART_ID ? (
                                <div className="flex items-center gap-1 h-[46px]">
                                    <input autoFocus placeholder="Тип..." value={newSubtypeValues[WHOLE_MODE_PART_ID] || ''} onChange={(e) => setNewSubtypeValues(p => ({...p, [WHOLE_MODE_PART_ID]: e.target.value}))} onKeyDown={(e) => { if(e.key === 'Enter') handleConfirmNewSubtype(WHOLE_MODE_PART_ID); }} className="flex-1 bg-subpanel border border-vk-blue rounded-lg px-3 py-3 text-sm outline-none text-text-main h-full" />
                                    <button onClick={() => handleConfirmNewSubtype(WHOLE_MODE_PART_ID)} className="p-2 h-full bg-green-500/10 text-green-500 rounded-lg"><CheckIcon className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="flex gap-1 h-[46px]">
                                    <select value={wholeSubtype} onChange={e => { if(e.target.value === '__CREATE_NEW__') setCreatingSubtypeForPartId(WHOLE_MODE_PART_ID); else { setWholeSubtype(e.target.value); setSelectedTemplateIds([]); } }} className="flex-1 bg-subpanel text-text-main p-3 rounded-lg border border-border-main outline-none text-sm focus:border-vk-blue font-medium h-full" disabled={!wholeCampaignName}>
                                        <option value="__CREATE_NEW__" className="text-vk-blue font-bold">＋ Новый</option><option disabled>──────────────</option><option value="">-- Все --</option>{availableSubtypes.map(st => <option key={st} value={st}>{st || '(пусто)'}</option>)}
                                    </select>
                                    {wholeSubtype && (
                                        <button onClick={() => handleToggleEditorForPart(WHOLE_MODE_PART_ID, wholeSubtype)} className={`p-2 h-full transition rounded-lg border border-border-main ${activeEditorIds.includes(WHOLE_MODE_PART_ID) ? 'bg-vk-blue text-white border-vk-blue' : 'bg-subpanel text-text-muted hover:text-vk-blue'}`}><GearIcon className="w-5 h-5" /></button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {activeEditorIds.includes(WHOLE_MODE_PART_ID) && wholeSubtype ? (
                        <CampaignInlineEditor
                            partId={WHOLE_MODE_PART_ID}
                            subtype={wholeSubtype}
                            value={editorValues[WHOLE_MODE_PART_ID] || ''}
                            onToggle={() => handleToggleEditorForPart(WHOLE_MODE_PART_ID, wholeSubtype)}
                            onChange={(val) => setEditorValues(p => ({ ...p, [WHOLE_MODE_PART_ID]: val }))}
                            onSave={() => handleSaveSubtypeTemplates(WHOLE_MODE_PART_ID, wholeSubtype)}
                            isSaving={isSavingTemplates}
                            showEmojiPicker={showEmojiPickerForEditor === WHOLE_MODE_PART_ID}
                            onToggleEmoji={() => setShowEmojiPickerForEditor(p => p === WHOLE_MODE_PART_ID ? null : WHOLE_MODE_PART_ID)}
                            onEmojiSelect={(emoji) => handleEditorEmojiSelect(WHOLE_MODE_PART_ID, emoji)}
                            emojiList={EMOJI_LIST}
                        />
                    ) : (
                        wholeCampaignName && (
                            <div>
                                <div className="flex justify-between items-center mb-2"><label className="flex items-center gap-2 cursor-pointer group"><div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSpecificTemplateSelectionEnabled ? 'bg-vk-blue border-vk-blue' : 'border-text-muted group-hover:border-text-main'}`}>{isSpecificTemplateSelectionEnabled && <div className="w-2 h-2 bg-white rounded-sm"></div>}</div><input type="checkbox" checked={isSpecificTemplateSelectionEnabled} onChange={e => setIsSpecificTemplateSelectionEnabled(e.target.checked)} className="hidden" /><span className="text-xs font-medium text-text-main">Выбрать конкретные сообщения</span></label>{isSpecificTemplateSelectionEnabled && (<button onClick={selectAllTemplates} className="text-xs font-bold text-vk-blue hover:text-text-main transition">{selectedTemplateIds.length === wholeModeTemplates.length ? 'Снять все' : 'Выбрать все'}</button>)}</div>
                                {isSpecificTemplateSelectionEnabled ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar border border-border-main rounded-xl p-2 bg-subpanel">{wholeModeTemplates.length === 0 && <div className="text-xs text-text-muted col-span-full text-center py-4">Нет шаблонов выбранного типа</div>}{wholeModeTemplates.map(t => (<div key={t.id} onClick={() => toggleTemplate(t.id)} className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${selectedTemplateIds.includes(t.id) ? 'bg-vk-blue/10 border-vk-blue' : 'bg-panel border-border-main hover:border-vk-blue/30'}`}><div className="font-bold text-xs truncate mb-1">{t.name} <span className="text-[9px] opacity-50 ml-1 border border-border-main px-1 rounded">{t.subtype || 'mixed'}</span></div><div className="text-[10px] text-text-muted line-clamp-2 leading-relaxed">{t.text}</div></div>))}</div>
                                ) : (<div className="bg-subpanel/50 border border-border-main rounded-xl p-3 text-xs text-text-muted text-center">Будет отправлен случайный шаблон из папки <b>{wholeCampaignName}</b>{wholeSubtype ? <span> типа <b>{wholeSubtype}</b></span> : <span> (любого типа)</span>}</div>)}
                            </div>
                        )
                    )}
                </div>
            )}

            {/* --- CONSTRUCTOR MODE --- */}
            {messageMode === 'constructor' && (
                <div className="space-y-4">
                    <div><label className="text-[10px] font-bold text-text-muted uppercase block mb-1.5 ml-1">Источник</label><select value={sourceCampaignName} onChange={e => { if(e.target.value === '__CREATE_NEW__') handleCreateTemplateCampaign(); else setSourceCampaignName(e.target.value) }} className="w-full bg-subpanel text-text-main p-3 rounded-lg border border-border-main outline-none text-sm focus:border-vk-blue"><option value="__CREATE_NEW__" className="text-vk-blue font-bold">＋ Создать новую</option><option disabled>──────────────</option><option value="">-- Выберите папку --</option>{campaignSuggestions.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    {sourceCampaignName && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-text-muted uppercase block">Части сообщения</label>
                                <button onClick={() => setConstructorParts(p => [...p, { id: Date.now().toString(), subtype: '' }])} className="text-xs text-vk-blue hover:text-vk-blue-dark font-bold flex items-center gap-1"><PlusIcon className="w-3 h-3" /> Добавить блок</button>
                            </div>
                            <div className="bg-subpanel rounded-xl border border-border-main p-2 space-y-2">
                                {constructorParts.map((part, idx) => (
                                    <div key={part.id} className="flex flex-col gap-2 bg-panel p-2 rounded-lg border border-border-main">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-text-muted w-6 text-center">{idx+1}.</span>
                                            {creatingSubtypeForPartId === part.id ? (
                                                <div className="flex-1 flex items-center gap-1">
                                                    <input autoFocus placeholder="Название..." value={newSubtypeValues[part.id] || ''} onChange={(e) => setNewSubtypeValues(p => ({...p, [part.id]: e.target.value}))} onKeyDown={(e) => { if(e.key === 'Enter') handleConfirmNewSubtype(part.id); }} className="flex-1 bg-subpanel border border-vk-blue rounded px-2 py-1 text-xs outline-none text-text-main" />
                                                    <button onClick={() => handleConfirmNewSubtype(part.id)} className="p-1.5 bg-green-500/10 text-green-500 rounded border border-green-500/20"><CheckIcon className="w-3 h-3" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex items-center gap-1">
                                                    <select value={part.subtype} onChange={e => { if (e.target.value === '__CREATE_NEW__') setCreatingSubtypeForPartId(part.id); else setConstructorParts(p => p.map(x => x.id === part.id ? { ...x, subtype: e.target.value } : x)); }} className="flex-1 bg-subpanel text-text-main text-xs p-2 rounded border border-border-main outline-none focus:border-vk-blue">
                                                        <option value="__CREATE_NEW__" className="text-vk-blue font-bold">＋ Создать новую</option><option disabled>──────────────</option><option value="">-- Выберите тип --</option>{availableSubtypes.map(st => <option key={st} value={st}>{st}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            {part.subtype && (<button onClick={() => handleToggleEditorForPart(part.id, part.subtype)} className={`p-1.5 transition rounded ${activeEditorIds.includes(part.id) ? 'bg-vk-blue text-white' : 'text-text-muted hover:text-vk-blue hover:bg-subpanel'}`}><GearIcon className="w-4 h-4" /></button>)}
                                            <button onClick={() => setConstructorParts(p => p.filter(x => x.id !== part.id))} className="p-1.5 text-text-muted hover:text-red-500 transition"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                        {activeEditorIds.includes(part.id) && (
                                            <CampaignInlineEditor
                                                partId={part.id} subtype={part.subtype} value={editorValues[part.id] || ''} onToggle={() => handleToggleEditorForPart(part.id, part.subtype)}
                                                onChange={(val) => setEditorValues(p => ({ ...p, [part.id]: val }))} onSave={() => handleSaveSubtypeTemplates(part.id, part.subtype)}
                                                isSaving={isSavingTemplates} showEmojiPicker={showEmojiPickerForEditor === part.id} onToggleEmoji={() => setShowEmojiPickerForEditor(p => p === part.id ? null : part.id)}
                                                onEmojiSelect={(emoji) => handleEditorEmojiSelect(part.id, emoji)} emojiList={EMOJI_LIST}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Footer / Tools */}
            <div className="mt-4 flex gap-2 pt-4 border-t border-border-main items-center relative">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition ${isUploading ? 'bg-subpanel text-text-muted border-border-main animate-pulse' : 'bg-subpanel text-vk-blue border-vk-blue/30 hover:bg-vk-blue hover:text-white'}`}><PaperClipIcon className="w-4 h-4" /> {isUploading ? 'Загрузка...' : 'Прикрепить файл'}</button>
                
                {showTools && (
                    <>
                        {messageMode !== 'custom' && (
                            <button onClick={() => setConstructorNoNewlines(!constructorNoNewlines)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition ${constructorNoNewlines ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-subpanel text-text-muted border-border-main hover:text-text-main'}`} title="Сплошной текст (без абзацев)"><LinkIcon className="w-4 h-4" /> Сплошной</button>
                        )}
                        <div className="flex items-center gap-3 ml-auto">
                            <div className="flex flex-col items-end leading-tight"><div className="text-2xl font-black text-vk-blue">{totalCombinations}</div><div className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Всего вариантов</div></div>
                            <button onClick={handleGeneratePreview} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition ${showConstructorPreview ? 'bg-purple-500 text-white border-purple-500' : 'bg-purple-500/10 text-purple-500 border-purple-500/30 hover:bg-purple-500 hover:text-white'}`}><SparklesIcon className="w-4 h-4" /> Пример</button>
                        </div>
                    </>
                )}
                {messageMode === 'custom' && (<button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition bg-subpanel text-text-muted border-border-main hover:text-yellow-500 hover:border-yellow-500/50"><FaceSmileIcon className="w-4 h-4" /> Смайлы</button>)}
            </div>

            {/* Preview Modal Inline */}
            {showConstructorPreview && (
                <div className="mt-4 bg-subpanel/30 border-t border-border-main pt-4 animate-fade-in">
                    <div className="bg-panel rounded-xl shadow-lg border border-border-main w-full p-6 relative">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-text-main flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-purple-500" /> Предпросмотр генерации</h3>
                            <button onClick={() => setShowConstructorPreview(false)} className="text-text-muted hover:text-text-main text-xl leading-none">&times;</button>
                        </div>
                        <div className="bg-subpanel rounded-xl border border-border-main p-5 text-sm text-text-main leading-relaxed font-sans max-h-[300px] overflow-y-auto whitespace-pre-wrap shadow-inner relative">
                            <div className="absolute top-2 right-2 text-[10px] font-bold text-text-muted opacity-50 uppercase tracking-widest pointer-events-none">Random Sample</div>
                            {previewText}
                        </div>
                        <div className="mt-4 flex justify-between items-center text-xs text-text-muted">
                            <p>Это один из {totalCombinations} возможных вариантов.</p>
                            <button onClick={handleGeneratePreview} className="text-vk-blue hover:underline font-bold flex items-center gap-1"><RefreshIcon className="w-3 h-3" /> Сгенерировать другой</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
    