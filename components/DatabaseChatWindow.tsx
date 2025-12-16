

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Conversation, ChatMessage, Recipient, CrmStatus, Template } from '../types';
import { SendIcon, ArrowLeftIcon, RefreshIcon, VkIcon, ExclamationIcon, FolderIcon, BookOpenIcon, UsersIcon, PaperClipIcon, FaceSmileIcon, LightningIcon, ClockIcon, PaperIcon, XIcon } from './icons';
import { StatusBadge, CRM_STATUS_LABELS } from './StatusBadge';
import { API_BASE_URL } from '../config';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatAttachmentsDrawer } from './database/ChatAttachmentsDrawer';
import { ChatReminderModal } from './database/ChatReminderModal';

interface DatabaseChatWindowProps {
    activeConversation: Conversation;
    messages: ChatMessage[];
    senderInfo: { name: string; id: number };
    profileLink: string;
    recipientData: Recipient | undefined; 
    templates?: Template[]; 
    isRefreshing: boolean;
    isSending: boolean;
    chatLayout: string;
    onBack: () => void;
    onRefresh: () => void;
    onSendMessage: (text: string, attachments?: {id: string, name: string}[]) => void;
    onStatusChange: (status: CrmStatus) => void;
    onUpdateNotes: (notes: string) => void;
    onOpenProfile?: () => void; 
}

const EMOJI_LIST = [ "👋", "👍", "🔥", "😊", "🙏", "✅", "❌", "💰", "📈", "📉", "🚀", "⭐", "❤️", "🤔", "👀", "📞", "📩", "🎁", "🎉", "🛑", "⚠️", "⚡", "💼", "🤝", "🕐", "📍" ];

export const DatabaseChatWindow: React.FC<DatabaseChatWindowProps> = ({
    activeConversation, messages, senderInfo, profileLink, recipientData, templates = [], isRefreshing, isSending, chatLayout,
    onBack, onRefresh, onSendMessage, onStatusChange, onUpdateNotes, onOpenProfile
}) => {
    const [currentMessage, setCurrentMessage] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);
    const [showReminders, setShowReminders] = useState(false);
    const [notesText, setNotesText] = useState('');
    const [uploadedAttachments, setUploadedAttachments] = useState<{id: string, name: string}[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    // Quick Response State
    const [quickMenuOpen, setQuickMenuOpen] = useState(false);
    const [quickMenuFolder, setQuickMenuFolder] = useState<string | null>(null);
    const quickMenuRef = useRef<HTMLDivElement>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevMsgLen = useRef(0);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
                setQuickMenuOpen(false);
                setQuickMenuFolder(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (messages.length === 0) { prevMsgLen.current = 0; return; }
        const isInitial = prevMsgLen.current === 0 && messages.length > 0;
        const hasNew = messages.length > prevMsgLen.current;
        const lastMsg = messages[messages.length - 1];
        const isMe = lastMsg?.sender === 'me';

        if (isInitial) messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        else if (hasNew && isMe) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        prevMsgLen.current = messages.length;
    }, [messages]);

    useEffect(() => {
        setNotesText(recipientData?.notes || '');
        setUploadedAttachments([]); 
        setCurrentMessage('');
    }, [recipientData?.id]); 

    // Derived quick menu data
    const quickFolders = useMemo(() => {
        const folders = new Set<string>();
        templates.forEach(t => folders.add(t.campaign_name || 'Общее'));
        return Array.from(folders).sort();
    }, [templates]);

    const quickTemplates = useMemo(() => {
        if (!quickMenuFolder) return [];
        return templates.filter(t => (t.campaign_name || 'Общее') === quickMenuFolder);
    }, [templates, quickMenuFolder]);

    const handleSendClick = () => {
        if ((!currentMessage.trim() && uploadedAttachments.length === 0) || isSending || isUploading) return;
        onSendMessage(currentMessage, uploadedAttachments);
        setCurrentMessage('');
        setUploadedAttachments([]);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('owner_id', String(senderInfo.id)); 
            try {
                const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.status === 'ok') setUploadedAttachments(prev => [...prev, { id: data.attachment, name: file.name }]);
            } catch (err) { alert('Upload error'); } 
            finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
        }
    };

    const insertTemplate = (text: string) => {
        setCurrentMessage(prev => prev + text);
        setQuickMenuOpen(false);
        setQuickMenuFolder(null);
    };

    return (
        <div className="flex-1 bg-main flex flex-col min-w-[350px] animate-fade-in border-l border-border-main z-0 shadow-2xl h-full relative">
            {/* HEADER */}
            <div className="px-6 py-4 border-b border-border-main bg-panel/80 backdrop-blur-md flex justify-between items-center z-10 sticky top-0 shrink-0 h-20 shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={onBack} className="md:hidden"><ArrowLeftIcon className="w-6 h-6" /></button>
                    <img src={activeConversation.avatar} className="w-12 h-12 rounded-full border border-border-main object-cover" />
                    <div className="flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-3">
                            <a href={profileLink} target="_blank" className="font-bold text-text-main text-lg hover:text-vk-blue hover:underline truncate">{activeConversation.name}</a>
                            <StatusBadge status={recipientData?.crm_status || 'new'} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                            <VkIcon className="w-3 h-3 text-vk-blue" />
                            <span>via: <span className="font-medium text-text-main">{senderInfo.name}</span></span>
                            <button onClick={onRefresh} className={`hover:text-vk-blue transition ${isRefreshing ? 'animate-spin text-vk-blue' : ''}`}><RefreshIcon className="w-3 h-3" /></button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowReminders(true)} 
                        className="p-2.5 rounded-xl border border-border-main hover:bg-hover text-text-muted hover:text-vk-blue transition" 
                        title="Напоминания"
                    >
                        <ClockIcon className="w-5 h-5" />
                    </button>
                    
                    <div className="h-6 w-px bg-border-main mx-1"></div>

                    <button 
                        onClick={() => { setShowAttachments(!showAttachments); setShowNotes(false); }} 
                        className={`p-2.5 rounded-xl border border-border-main transition ${showAttachments ? 'bg-vk-blue text-white' : 'hover:bg-hover'}`}
                        title="Вложения"
                    >
                        <FolderIcon className="w-5 h-5" />
                    </button>
                    
                    <button 
                        onClick={() => { setShowNotes(!showNotes); setShowAttachments(false); }} 
                        className={`p-2.5 rounded-xl border border-border-main transition ${showNotes ? 'bg-vk-blue text-white' : 'hover:bg-hover'}`}
                        title="Заметки"
                    >
                        <BookOpenIcon className="w-5 h-5" />
                    </button>
                    
                    {onOpenProfile && (
                        <button onClick={onOpenProfile} className="p-2.5 hover:bg-hover rounded-xl border border-border-main" title="Профиль клиента">
                            <UsersIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* BODY */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 flex flex-col min-w-0 bg-main relative">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar relative z-0">
                        {messages.map((m, idx) => (
                            <ChatMessageBubble 
                                key={m.id} 
                                message={m} 
                                prevMessage={messages[idx - 1]} 
                                isMe={m.sender === 'me'} 
                                chatLayout={chatLayout} 
                                senderAvatar={activeConversation.avatar}
                            />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* INPUT AREA */}
                    <div className="p-4 sm:p-5 bg-panel border-t border-border-main shrink-0 z-10 relative">
                        {uploadedAttachments.length > 0 && <div className="flex flex-wrap gap-2 mb-2">{uploadedAttachments.map((a, i) => <div key={i} className="text-xs bg-subpanel p-1 rounded border border-border-main">{a.name}</div>)}</div>}
                        
                        <div className="bg-subpanel rounded-2xl border border-border-main flex items-end shadow-inner relative">
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                            <button onClick={() => fileInputRef.current?.click()} disabled={isSending} className="p-3 m-1 rounded-xl text-text-muted hover:text-vk-blue"><PaperClipIcon className="w-6 h-6" /></button>
                            
                            <textarea 
                                ref={textareaRef}
                                value={currentMessage} 
                                onChange={(e) => setCurrentMessage(e.target.value)} 
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendClick(); } }}
                                className="flex-1 bg-transparent text-text-main p-3.5 text-sm focus:outline-none resize-none custom-scrollbar max-h-60 leading-relaxed" 
                                placeholder="Напишите сообщение..." 
                                rows={1} 
                                style={{ minHeight: '52px' }} 
                            />
                            
                            {/* QUICK RESPONSE BUTTON */}
                            <div className="relative" ref={quickMenuRef}>
                                <button 
                                    onClick={() => { setQuickMenuOpen(!quickMenuOpen); setQuickMenuFolder(null); }} 
                                    className={`p-3 m-1 rounded-xl text-text-muted hover:text-yellow-500 transition ${quickMenuOpen ? 'text-yellow-500 bg-yellow-500/10' : ''}`}
                                    title="Быстрые ответы"
                                >
                                    <LightningIcon className="w-5 h-5" />
                                </button>

                                {quickMenuOpen && (
                                    <div className="absolute bottom-14 right-0 w-64 bg-panel border border-border-main rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col max-h-80">
                                        {!quickMenuFolder ? (
                                            // LEVEL 1: FOLDERS
                                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                <div className="p-3 border-b border-border-main text-[10px] font-bold text-text-muted uppercase tracking-wider bg-subpanel/50">
                                                    Выберите папку
                                                </div>
                                                {quickFolders.length === 0 ? (
                                                    <div className="p-4 text-xs text-text-muted text-center italic">Нет шаблонов</div>
                                                ) : (
                                                    quickFolders.map(folder => (
                                                        <button 
                                                            key={folder}
                                                            onClick={() => setQuickMenuFolder(folder)}
                                                            className="w-full text-left px-4 py-3 text-sm text-text-main hover:bg-hover border-b border-border-main last:border-0 flex items-center justify-between group"
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                <FolderIcon className="w-4 h-4 text-text-muted group-hover:text-vk-blue" />
                                                                <span className="truncate">{folder}</span>
                                                            </div>
                                                            <span className="text-xs text-text-muted">›</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        ) : (
                                            // LEVEL 2: TEMPLATES
                                            <div className="flex-1 flex flex-col h-full overflow-hidden">
                                                <div className="p-2 border-b border-border-main bg-subpanel/50 flex items-center gap-2">
                                                    <button 
                                                        onClick={() => setQuickMenuFolder(null)}
                                                        className="p-1 hover:bg-hover rounded text-text-muted hover:text-text-main"
                                                    >
                                                        <ArrowLeftIcon className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-xs font-bold text-text-main truncate">{quickMenuFolder}</span>
                                                </div>
                                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                    {quickTemplates.map(tpl => (
                                                        <button 
                                                            key={tpl.id}
                                                            onClick={() => insertTemplate(tpl.text)}
                                                            className="w-full text-left px-4 py-3 hover:bg-hover border-b border-border-main last:border-0 group"
                                                        >
                                                            <div className="text-xs font-bold text-text-main truncate group-hover:text-vk-blue mb-1">{tpl.name}</div>
                                                            <div className="text-[10px] text-text-muted truncate opacity-70">{tpl.text}</div>
                                                        </button>
                                                    ))}
                                                    {quickTemplates.length === 0 && (
                                                        <div className="p-4 text-xs text-text-muted text-center italic">Пусто</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-3 m-1 rounded-xl text-text-muted hover:text-orange-500"><FaceSmileIcon className="w-6 h-6" /></button>
                            <button onClick={handleSendClick} disabled={isSending} className={`m-1.5 p-3 rounded-xl transition ${currentMessage.trim() ? 'bg-vk-blue text-white' : 'text-text-muted'}`}>
                                {isSending ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <SendIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        {showEmojiPicker && (
                            <div className="absolute bottom-20 right-4 bg-panel border border-border-main shadow-2xl rounded-xl p-3 z-50 grid grid-cols-6 gap-2 w-72">
                                {EMOJI_LIST.map(emoji => <button key={emoji} onClick={() => { setCurrentMessage(p => p + emoji); setShowEmojiPicker(false); }} className="text-2xl hover:bg-subpanel rounded-lg p-2">{emoji}</button>)}
                            </div>
                        )}
                    </div>
                </div>

                {/* NOTES DRAWER */}
                {showNotes && (
                    <div className="w-80 bg-panel border-l border-border-main flex flex-col animate-fade-in-left shadow-2xl relative z-20">
                        <div className="p-5 border-b border-border-main bg-subpanel/50 backdrop-blur font-bold text-sm text-text-main flex justify-between items-center">
                            <span>Заметки</span>
                            <button onClick={() => setShowNotes(false)}><XIcon className="w-4 h-4 text-text-muted hover:text-text-main"/></button>
                        </div>
                        <textarea value={notesText} onChange={e => { setNotesText(e.target.value); onUpdateNotes(e.target.value); }} className="flex-1 bg-panel p-6 text-sm text-text-main resize-none outline-none" placeholder="Заметки о клиенте..." />
                    </div>
                )}

                {/* ATTACHMENTS DRAWER */}
                {showAttachments && (
                    <ChatAttachmentsDrawer 
                        conversationId={activeConversation.id} 
                        onClose={() => setShowAttachments(false)} 
                    />
                )}
            </div>

            {/* REMINDERS MODAL */}
            {showReminders && (
                <ChatReminderModal 
                    conversationId={activeConversation.id} 
                    onClose={() => setShowReminders(false)} 
                />
            )}
        </div>
    );
};
