
import React, { useMemo, useRef } from 'react';
import { XIcon, GearIcon, FaceSmileIcon, RefreshIcon } from './icons';
import { analyzeSpintax } from './utils';

interface CampaignInlineEditorProps {
    partId: string;
    subtype: string;
    value: string;
    onToggle: () => void;
    onChange: (val: string) => void;
    onSave: () => void;
    isSaving: boolean;
    showEmojiPicker: boolean;
    onToggleEmoji: () => void;
    onEmojiSelect: (emoji: string) => void;
    emojiList: string[];
}

export const CampaignInlineEditor: React.FC<CampaignInlineEditorProps> = ({
    partId,
    subtype,
    value,
    onToggle,
    onChange,
    onSave,
    isSaving,
    showEmojiPicker,
    onToggleEmoji,
    onEmojiSelect,
    emojiList
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Analyze text for rendering colors
    const renderedContent = useMemo(() => {
        const blocks = analyzeSpintax(value);
        return blocks.map((block, idx) => {
            if (block.type === 'static') {
                return <span key={idx}>{block.content}</span>;
            }
            return (
                <span key={idx} className="relative inline-block text-vk-blue">
                    <span className="opacity-90">{block.raw}</span>
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-bold px-1 rounded shadow-sm border border-gray-600 select-none whitespace-nowrap z-10 pointer-events-none">
                        ={block.count}
                    </span>
                </span>
            );
        });
    }, [value]);

    return (
        <div className="mt-2 bg-subpanel/50 border border-border-main rounded-lg p-3 shadow-inner relative animate-fade-in">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-bold text-vk-blue uppercase tracking-wider flex items-center gap-2">
                    Редактор вариаций: {subtype}
                </h4>
                <button onClick={onToggle} className="text-text-muted hover:text-text-main text-xs"><XIcon className="w-3 h-3"/></button>
            </div>
            <div className="mb-2 text-[10px] text-text-muted italic opacity-70">
                Используйте Spintax: &#123;Вариант 1/Вариант 2&#125;
            </div>
            
            {/* Editor Area - Auto Growing with Spintax Highlighting */}
            <div className="relative w-full min-h-[192px] bg-panel border border-border-main rounded-lg focus-within:border-vk-blue transition-all overflow-hidden group">
                <div className="grid grid-cols-1 grid-rows-1 relative">
                    {/* BACKDROP (Visuals) */}
                    <div 
                        className="col-start-1 row-start-1 p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words pointer-events-none text-text-main z-0"
                        aria-hidden="true"
                    >
                        {renderedContent}
                        <br />
                    </div>

                    {/* TEXTAREA (Input) */}
                    <textarea 
                        id={`editor-textarea-${partId}`}
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="col-start-1 row-start-1 w-full h-full p-3 bg-transparent text-xs font-mono leading-relaxed whitespace-pre-wrap break-words text-transparent caret-text-main outline-none resize-none z-10 overflow-hidden"
                        placeholder="{Привет/Здорова/Здравствуй/Добрый вечер/доброго времени суток}"
                        spellCheck={false}
                    />
                </div>
            </div>
            
            {/* Emoji Picker for Editor */}
            {showEmojiPicker && (
                <div className="absolute bottom-12 right-2 bg-panel border border-border-main shadow-xl rounded-lg p-2 z-50 grid grid-cols-6 gap-1 w-64 animate-fade-in">
                    {emojiList.map(emoji => (
                        <button key={emoji} onClick={() => onEmojiSelect(emoji)} className="text-xl hover:bg-white/10 rounded p-1 transition">{emoji}</button>
                    ))}
                </div>
            )}

            <div className="flex justify-end mt-2 gap-2">
                <button 
                    onClick={onToggleEmoji} 
                    className={`p-1.5 rounded transition border border-border-main ${showEmojiPicker ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-panel text-text-muted hover:text-orange-500'}`}
                >
                    <FaceSmileIcon className="w-4 h-4" />
                </button>
                <button 
                    onClick={onSave} 
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-vk-blue text-white rounded text-[10px] font-bold hover:bg-vk-blue-dark transition flex items-center gap-2 shadow-sm"
                >
                    {isSaving ? <RefreshIcon className="w-3 h-3 animate-spin"/> : 'Сохранить изменения'}
                </button>
            </div>
        </div>
    );
};
