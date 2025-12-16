
import React, { useState, useRef, useEffect } from 'react';
import { MegaphoneIcon, BarsArrowDownIcon } from '../icons';

interface CampaignNameBlockProps {
    campaignName: string;
    setCampaignName: (name: string) => void;
    campaignSuggestions: string[];
    error?: boolean;
}

export const CampaignNameBlock: React.FC<CampaignNameBlockProps> = ({
    campaignName,
    setCampaignName,
    campaignSuggestions,
    error
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter logic: 
    // 1. If input is empty, show ALL suggestions.
    // 2. If input has text, show matching suggestions (case-insensitive).
    const filteredSuggestions = campaignSuggestions.filter(c => 
        !campaignName || c.toLowerCase().includes(campaignName.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className="relative z-[50] space-y-2">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <MegaphoneIcon className="w-4 h-4" /> Название кампании
            </label>
            <div className="relative group">
                <input 
                    value={campaignName} 
                    onChange={e => {
                        setCampaignName(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onClick={() => setShowSuggestions(true)}
                    className={`w-full bg-panel p-4 pr-10 text-lg font-bold rounded-xl border focus:ring-2 outline-none transition-all ${error ? 'border-red-500 ring-red-500/20' : 'border-border-main focus:border-vk-blue focus:ring-vk-blue/20'}`}
                    placeholder="Введите название..." 
                />
                
                {/* Arrow Icon indicator */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <BarsArrowDownIcon className={`w-4 h-4 transition-transform duration-200 ${showSuggestions ? 'rotate-180 text-vk-blue' : ''}`} />
                </div>

                {showSuggestions && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-panel border border-border-main rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar z-[60] animate-fade-in">
                        {filteredSuggestions.length > 0 ? (
                            filteredSuggestions.map(c => (
                                <div 
                                    key={c} 
                                    onMouseDown={(e) => {
                                        // Use onMouseDown to prevent blur before click
                                        e.preventDefault(); 
                                        setCampaignName(c); 
                                        setShowSuggestions(false); 
                                    }}
                                    className="px-4 py-3 text-sm font-medium hover:bg-hover cursor-pointer border-b border-border-main last:border-0 text-text-main flex justify-between items-center"
                                >
                                    <span>{c}</span>
                                    {c === campaignName && <span className="text-vk-blue text-[10px] font-bold">Текущее</span>}
                                </div>
                            ))
                        ) : (
                            <div className="p-3 text-xs text-text-muted text-center italic">
                                "{campaignName}" — будет создана новая
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
