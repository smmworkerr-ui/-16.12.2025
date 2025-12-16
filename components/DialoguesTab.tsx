
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Conversation, ChatMessage, Account } from '../types';
import { get, post, del } from '../apiClient';
import { SendIcon, VkIcon, PinIcon, RefreshIcon } from './icons';
import { formatDate } from './utils';

interface DialoguesTabProps {
    conversations: Conversation[];
    accounts: Account[];
    initialSelectedId: string | null;
    onSelectConversation: (id: string | null) => void;
    refreshAll: () => void;
    chatLayout?: string; // 'alternating' | 'linear'
}

export const DialoguesTab: React.FC<DialoguesTabProps> = ({ 
    conversations, 
    accounts, 
    initialSelectedId, 
    onSelectConversation, 
    refreshAll,
    chatLayout = 'alternating'
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
    const [localPinned, setLocalPinned] = useState<Record<string, boolean>>({});
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMsgLen = useRef(0);

    // Sync Unread Logic (Legacy Tab)
    useEffect(() => {
        const syncInterval = setInterval(() => {
            post('conversations/sync', {}).catch(console.error);
        }, 8000);
        return () => clearInterval(syncInterval);
    }, []);

    const accountNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        accounts.forEach(acc => {
            map[String(acc.vk_user_id)] = acc.name;
        });
        return map;
    }, [accounts]);

    useEffect(() => {
        const newLocalPinned: Record<string, boolean> = {};
        conversations.forEach(c => {
            newLocalPinned[c.id] = !!c.pinned;
        });
        setLocalPinned(newLocalPinned);
    }, [conversations]);

    const groupedConversations = useMemo(() => {
        const grouped: Record<string, Conversation[]> = {};
        const sortedConvs = [...conversations].sort((a, b) => {
            const pinA = localPinned[a.id] ? 1 : 0;
            const pinB = localPinned[b.id] ? 1 : 0;
            if (pinA !== pinB) return pinB - pinA;
            return 0; 
        });
        sortedConvs.forEach(c => {
            const key = c.campaign_name || 'Диалоги без кампании';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(c);
        });
        return grouped;
    }, [conversations, localPinned]);

    const handleSelectConversationWithRead = (id: string | null) => {
        if (id) {
            // Mark as read immediately
            post(`conversations/${id}/read`, {}).then(() => {
                refreshAll();
            }).catch(console.error);
        }
        onSelectConversation(id);
    };

    // Fetch messages logic
    useEffect(() => {
        if (!initialSelectedId) { setMessages([]); return; }
        
        // Clear messages to prevent showing old chat
        setMessages([]);
        
        const fetchMsgs = async () => {
            try {
                const res = await get<ChatMessage[]>(`messages/${initialSelectedId}`); 
                setMessages(Array.isArray(res) ? res : []);
            } catch (e) { console.error(e); }
        };
        fetchMsgs();
        const i = setInterval(fetchMsgs, 4000); 
        return () => clearInterval(i);
    }, [initialSelectedId]);

    // Smart Scroll Logic
    useEffect(() => {
        if (messages.length === 0) {
            prevMsgLen.current = 0;
            return;
        }

        const isInitial = prevMsgLen.current === 0 && messages.length > 0;
        const hasNew = messages.length > prevMsgLen.current;
        const lastMsg = messages[messages.length - 1];
        const isMe = lastMsg?.sender === 'me';

        if (isInitial) {
             messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        } else if (hasNew && isMe) {
             messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        
        prevMsgLen.current = messages.length;
    }, [messages]);

    const handleSendMessage = async () => {
        if (!currentMessage.trim() || !initialSelectedId || isSending) return;
        setIsSending(true);
        try {
            await post('send-message', { recipientId: initialSelectedId, message: currentMessage });
            setMessages(prev => [...prev, { id: Date.now(), sender: 'me', text: currentMessage, date: Math.floor(Date.now()/1000) }]);
            setCurrentMessage('');
        } catch (e: any) { alert("Ошибка: " + e.message); }
        finally {
            setIsSending(false);
        }
    };

    const handlePinConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            setLocalPinned(prev => ({...prev, [id]: !prev[id]}));
            await post(`conversations/${id}/pin`, {});
            refreshAll();
        } catch (e: any) { 
            console.error("Ошибка закрепления", e);
            setLocalPinned(prev => ({...prev, [id]: !prev[id]}));
        }
    };
    
    const toggleCampaign = (name: string) => {
        setExpandedCampaigns(prev => ({...prev, [name]: !prev[name]}));
    };

    const getAccountNameSafe = (ownerId: string) => {
        const name = accountNameMap[String(ownerId)];
        return name || `ID ${ownerId}`;
    };
    
    const getProfileLink = (peerId: string) => {
        const pId = String(peerId);
        return `https://vk.com/${pId.startsWith('-') ? 'club' + pId.substring(1) : 'id' + pId}`;
    };

    const selectedConversation = conversations.find(c => c.id === initialSelectedId);

    return (
        <div className="flex w-full h-full bg-main text-text-main">
            <div className="w-1/3 bg-panel border-r border-border-main flex flex-col overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-border-main font-bold text-text-muted text-xs uppercase flex justify-between bg-panel sticky top-0 z-10">
                    <span>Активные чаты ({conversations.length})</span>
                </div>
                
                {Object.entries(groupedConversations).map(([campaignName, convsData]) => {
                    const convs = convsData as Conversation[];
                    const isExpanded = expandedCampaigns[campaignName] ?? true; 
                    return (
                        <div key={campaignName} className="border-b border-border-main">
                            <div 
                                onClick={() => toggleCampaign(campaignName)}
                                className="bg-subpanel p-3 text-xs font-bold text-text-main uppercase cursor-pointer flex justify-between items-center hover:bg-hover transition"
                            >
                                <div className="flex items-center">
                                    <span>{campaignName}</span>
                                    <span className="ml-2 text-text-muted">({convs.length})</span>
                                </div>
                                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                            </div>

                            {isExpanded && convs.map(c => {
                                const isPinned = localPinned[c.id];
                                return (
                                    <div key={c.id} onClick={() => handleSelectConversationWithRead(c.id)} className={`relative p-4 flex gap-3 cursor-pointer border-l-4 transition-colors group border-b border-border-main ${initialSelectedId === c.id ? 'bg-hover border-l-vk-blue' : 'border-l-transparent hover:bg-hover'} ${c.unread_count > 0 ? 'bg-blue-900/10' : ''}`}>
                                        
                                        {c.unread_count > 0 && (
                                            <div className="absolute right-2 top-2 w-3 h-3 bg-vk-blue rounded-full border border-panel shadow-sm animate-pulse"></div>
                                        )}

                                        {(isPinned) && (
                                            <div className="absolute left-1 top-1 text-yellow-500 transform -rotate-45">
                                                <PinIcon className="w-3 h-3 fill-current" />
                                            </div>
                                        )}

                                        <img src={c.avatar || 'https://vk.com/images/camera_200.png'} className="w-10 h-10 rounded-full bg-subpanel object-cover" alt=""/>
                                        <div className="overflow-hidden flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-medium truncate text-sm ${c.unread_count > 0 ? 'text-white font-bold' : 'text-text-main'}`}>{c.name}</span>
                                                <span className="text-[10px] text-text-muted">via: {getAccountNameSafe(c.owner_id)}</span>
                                            </div>
                                            <div className={`text-xs truncate ${c.unread_count > 0 ? 'text-vk-blue' : 'text-text-muted'}`}>
                                                {c.last_message || <span className="italic opacity-50">Вложение...</span>}
                                            </div>
                                        </div>

                                        <div className="absolute right-2 bottom-2 flex gap-1 transition-opacity">
                                             <button 
                                                onClick={(e) => handlePinConversation(e, c.id)}
                                                className={`p-1.5 rounded hover:bg-hover ${isPinned ? 'text-yellow-500' : 'text-text-muted hover:text-text-main'}`}
                                            >
                                                <PinIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <div className="w-2/3 bg-main flex flex-col h-full">
                {selectedConversation ? (
                    <>
                        <div className="p-4 border-b border-border-main bg-panel flex justify-between items-center shadow-sm z-20 shrink-0">
                            <div className="flex items-center gap-3">
                                <img src={selectedConversation.avatar} className="w-10 h-10 rounded-full" alt=""/>
                                <div>
                                    <div className="font-bold text-text-main">{selectedConversation.name}</div>
                                    <div className="text-xs text-text-muted flex items-center gap-1">
                                        <VkIcon className="w-3 h-3" /> 
                                        <span>via {getAccountNameSafe(selectedConversation.owner_id)}</span>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center gap-3">
                                <a href={getProfileLink(selectedConversation.peer_id)} target="_blank" rel="noreferrer" className="text-xs bg-subpanel hover:bg-hover px-3 py-1.5 rounded text-text-main border border-border-main">
                                    Открыть профиль
                                </a>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-main">
                            {messages.map(m => {
                                const isMe = m.sender === 'me';
                                const alignClass = chatLayout === 'linear' 
                                    ? 'justify-start' 
                                    : (isMe ? 'justify-end' : 'justify-start');

                                let bubbleClass = '';
                                if (chatLayout === 'linear') {
                                    bubbleClass = isMe 
                                        ? 'bg-vk-blue text-white border-none rounded-tl-none rounded-tr-2xl' 
                                        : 'bg-panel text-text-main border border-border-main rounded-tl-none';
                                } else {
                                    bubbleClass = isMe 
                                        ? 'bg-vk-blue text-white border-none rounded-tr-none' 
                                        : 'bg-panel text-text-main border border-border-main rounded-tl-none';
                                }

                                return (
                                <div key={m.id} className={`flex ${alignClass}`}>
                                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-md relative ${bubbleClass}`}>
                                        {chatLayout === 'linear' && isMe && (
                                            <div className="text-xs font-bold opacity-100 mb-1 drop-shadow-md">Вы:</div>
                                        )}
                                        <div className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</div>
                                        <div className={`text-xs mt-1 text-right font-bold opacity-100 select-none drop-shadow-sm`}>
                                            {formatDate(m.date)}
                                        </div>
                                    </div>
                                </div>
                            )})}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-panel border-t border-border-main shrink-0">
                            <div className="flex gap-2 items-end">
                                <textarea 
                                    value={currentMessage} 
                                    onChange={e => setCurrentMessage(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    disabled={isSending}
                                    className={`flex-1 bg-subpanel text-text-main rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-vk-blue resize-y border border-border-main placeholder-text-muted custom-scrollbar max-h-60 ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    placeholder="Напишите сообщение..."
                                    rows={2}
                                    style={{minHeight: '44px'}}
                                />
                                <button 
                                    onClick={handleSendMessage} 
                                    disabled={isSending}
                                    className={`bg-vk-blue hover:bg-vk-blue-dark text-white px-4 rounded transition shadow-lg self-end flex items-center justify-center aspect-square h-[44px] mb-[2px] ${isSending ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90'}`}
                                >
                                    {isSending ? <RefreshIcon className="w-5 h-5 animate-spin"/> : <SendIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-text-muted flex-col opacity-50">
                        <div className="text-6xl mb-4 grayscale">💬</div>
                        <p>Выберите диалог слева</p>
                    </div>
                )}
            </div>
        </div>
    );
};
