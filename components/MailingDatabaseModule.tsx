
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Conversation, Account, ChatMessage, Recipient, CrmStatus, Template } from '../types';
import { get, post, put, del } from '../apiClient';
import { DatabaseChatWindow } from './DatabaseChatWindow';
import { CRM_STATUS_LABELS, CRM_STATUS_COLORS } from './StatusBadge';
import { PinIcon, TrashIcon } from './icons';
import { ConfirmModal } from './ConfirmModal';
import { ClientDetailsDrawer } from './ClientDetailsDrawer';

// Sub-components
import { CampaignsList } from './database/CampaignsList';
import { SendersList } from './database/SendersList';
import { ConversationsList } from './database/ConversationsList';

interface MailingDatabaseModuleProps {
    conversations: Conversation[];
    accounts: Account[];
    recipients: Recipient[]; 
    templates: Template[]; 
    refreshAll: () => void;
    externalConversationId?: string | null;
    externalCampaignName?: string | null;
    onGoToAccount: (id: number) => void;
    autoCollapseColumns?: boolean; 
    chatLayout?: string; 
}

type EntityType = 'user' | 'group' | 'all';
const DIRECT_CAMPAIGN_NAME = '📥 Прямые сообщения';
const PAST_CAMPAIGNS_NAME = '🗄️ Прошлые кампании';

export const MailingDatabaseModule: React.FC<MailingDatabaseModuleProps> = ({ 
    conversations, 
    accounts,
    recipients,
    templates, 
    refreshAll, 
    externalConversationId, 
    externalCampaignName,
    onGoToAccount,
    autoCollapseColumns = true,
    chatLayout = 'alternating'
}) => {
    const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [selectedType, setSelectedType] = useState<EntityType | null>(null); 
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<CrmStatus[]>([]); 
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string, type: 'conv' | 'camp' } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteHistory, setDeleteHistory] = useState(false); 
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    // Profile Drawer State
    const [drawerRecipient, setDrawerRecipient] = useState<Recipient | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const recipientMap = useMemo(() => {
        const map = new Map<string, Recipient>();
        recipients.forEach(r => map.set(r.vk_user_id, r));
        return map;
    }, [recipients]);

    // Calculate all available tags for autocomplete
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        recipients.forEach(r => {
            if (r.tags) {
                r.tags.forEach(t => tags.add(t));
            }
        });
        return Array.from(tags).sort();
    }, [recipients]);

    useEffect(() => {
        const syncInterval = setInterval(() => {
            post('conversations/sync', {}).catch(console.error);
        }, 8000);
        return () => clearInterval(syncInterval);
    }, []);

    const handleSelectConversation = async (id: string | null) => {
        if (id) {
            // Optimistically mark as read in local state is complex without deep cloning, 
            // so we rely on the unreadMap useMemo logic to ignore the active chat count.
            post(`conversations/${id}/read`, {}).then(() => {
                 refreshAll(); 
            }).catch(console.error);
        }
        setSelectedConversationId(id);
    };

    const handleOpenProfile = () => {
        if (selectedConversationId) {
            const conv = conversations.find(c => c.id === selectedConversationId);
            if (conv) {
                let rec = recipients.find(r => r.vk_user_id === conv.peer_id);
                if (!rec) {
                    // Placeholder for unknown recipient
                    rec = {
                        id: 0,
                        vk_user_id: conv.peer_id,
                        name: conv.name,
                        avatar: conv.avatar,
                        status: 'chat',
                        crm_status: 'new',
                        profile_url: `https://vk.com/id${conv.peer_id}`,
                        notes: '',
                        campaign_name: 'Manual'
                    } as Recipient;
                }
                setDrawerRecipient(rec);
            }
        }
    };

    const handleDeleteRecipient = async (id: number) => {
        try {
            await del(`recipients/${id}`);
            setDrawerRecipient(null);
            refreshAll();
        } catch (e: any) {
            alert('Ошибка удаления: ' + e.message);
        }
    };

    const handleConvContextMenu = (e: React.MouseEvent, convId: string) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            id: convId,
            type: 'conv'
        });
    };

    const handleCampContextMenu = (e: React.MouseEvent, campName: string) => {
        e.preventDefault();
        if (campName === DIRECT_CAMPAIGN_NAME || campName === PAST_CAMPAIGNS_NAME) return;
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            id: campName,
            type: 'camp'
        });
    };

    const handlePinConversation = async (convId: string) => {
        try {
            await post(`conversations/${convId}/pin`, {});
            refreshAll();
            setContextMenu(null);
        } catch (e: any) {
            alert("Ошибка: " + e.message);
        }
    };

    const handleDeleteCampaign = async () => {
        if (!campaignToDelete) return;
        setIsDeleting(true);
        try {
            await post('campaigns/cleanup', { 
                campaign_name: campaignToDelete,
                delete_files: deleteHistory,
                archive: true // Explicitly requested removal from list
            });
            refreshAll();
            setSelectedCampaign(null);
            setDeleteModalOpen(false);
            setCampaignToDelete(null);
            setDeleteHistory(false);
        } catch (e: any) {
            alert("Ошибка удаления: " + e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStatusChangeRobust = async (convId: string, newStatus: CrmStatus) => {
        const conv = conversations.find(c => c.id === convId);
        if (!conv) return;
        const peerId = conv.peer_id;
        let rec = recipientMap.get(peerId);
        try {
            let recId = rec?.id;
            if (!recId) {
                const res = await post<{status: string, id: number}>('recipients', { identifier: peerId });
                recId = res.id;
            }
            if (recId) {
                await put(`recipients/${recId}/status`, { status: newStatus });
                refreshAll();
            }
            setContextMenu(null); 
        } catch (e: any) {
            alert("Ошибка смены статуса: " + e.message);
        }
    };

    const handleUpdateNotes = async (convId: string, notes: string) => {
        const conv = conversations.find(c => c.id === convId);
        if (!conv) return;
        const peerId = conv.peer_id;
        let rec = recipientMap.get(peerId);
        try {
            let recId = rec?.id;
            if (!recId) {
                const res = await post<{status: string, id: number}>('recipients', { identifier: peerId });
                recId = res.id;
            }
            if (recId) {
                await put(`recipients/${recId}/notes`, { notes });
                refreshAll();
            }
        } catch (e: any) {
            console.error("Note update error:", e);
        }
    };

    const campaigns = useMemo(() => {
        const set = new Set<string>();
        let hasDirect = false;
        let hasPast = false;
        conversations.forEach(c => {
            if (c.campaign_name && c.campaign_name.trim()) {
                c.campaign_name.split('|').forEach(part => {
                    const clean = part.trim();
                    if (clean) {
                        if (clean === DIRECT_CAMPAIGN_NAME) hasDirect = true;
                        else if (clean === PAST_CAMPAIGNS_NAME) hasPast = true;
                        else set.add(clean);
                    }
                });
            } else {
                hasDirect = true; 
            }
        });
        const arr = Array.from(set).sort();
        const result = [];
        result.push(DIRECT_CAMPAIGN_NAME);
        result.push(...arr);
        if (hasPast) result.push(PAST_CAMPAIGNS_NAME);
        return result;
    }, [conversations]);

    const campaignActivityMap = useMemo(() => {
        const map: Record<string, number> = {};
        recipients.forEach(r => {
            if (r.campaign_name) {
                const cName = r.campaign_name;
                if (!map[cName] || r.id > map[cName]) {
                    map[cName] = r.id;
                }
            }
        });
        return map;
    }, [recipients]);

    // STRICT UNREAD LOGIC: Force 0 for selected chat
    // Ensure strict number casting to avoid string concatenation "1" + "1" = "11"
    const campaignUnreadMap = useMemo(() => {
        const map: Record<string, number> = {};
        conversations.forEach(c => {
            if (c.id === selectedConversationId) return; // IGNORE ACTIVE
            
            const count = Number(c.unread_count) || 0;
            if (count > 0) {
                const names = (c.campaign_name && c.campaign_name.trim()) ? c.campaign_name.split('|').map(s => s.trim()).filter(s => s.length > 0) : [];
                
                if (names.length === 0) {
                    map[DIRECT_CAMPAIGN_NAME] = (map[DIRECT_CAMPAIGN_NAME] || 0) + count;
                } else {
                    names.forEach(name => {
                        map[name] = (map[name] || 0) + count;
                    });
                }
            }
        });
        return map;
    }, [conversations, selectedConversationId]);

    const accountUnreadMap = useMemo(() => {
        const map: Record<number, number> = {};
        if (!selectedCampaign) return map;
        const relevantConvs = conversations.filter(c => {
            const cNames = (c.campaign_name && c.campaign_name.trim()) ? c.campaign_name.split('|').map(s => s.trim()) : [];
            if (selectedCampaign === DIRECT_CAMPAIGN_NAME) return cNames.length === 0 || cNames.includes(DIRECT_CAMPAIGN_NAME);
            return cNames.includes(selectedCampaign);
        });
        relevantConvs.forEach(c => {
            if (c.id === selectedConversationId) return; // IGNORE ACTIVE
            
            const count = Number(c.unread_count) || 0;
            if (count > 0) {
                const acc = accounts.find(a => String(a.id) === String(c.owner_id) || String(a.vk_user_id) === String(c.owner_id));
                if (acc) {
                    map[acc.id] = (map[acc.id] || 0) + count;
                }
            }
        });
        return map;
    }, [conversations, accounts, selectedCampaign, selectedConversationId]);

    const campaignAccounts = useMemo(() => {
        if (!selectedCampaign) return [];
        const relevantConvs = conversations.filter(c => {
            const cNames = (c.campaign_name && c.campaign_name.trim()) ? c.campaign_name.split('|').map(s => s.trim()) : [];
            if (selectedCampaign === DIRECT_CAMPAIGN_NAME) return cNames.length === 0 || cNames.includes(DIRECT_CAMPAIGN_NAME);
            return cNames.includes(selectedCampaign);
        });
        const ownerIdsInConvs = new Set(relevantConvs.map(c => String(c.owner_id)));
        return accounts.filter(a => 
            ownerIdsInConvs.has(String(a.id)) || ownerIdsInConvs.has(String(a.vk_user_id))
        );
    }, [selectedCampaign, conversations, accounts]);

    const isConvOwner = (convOwnerId: string, accountId: number) => {
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) return false;
        return String(convOwnerId) === String(acc.id) || String(convOwnerId) === String(acc.vk_user_id);
    };

    const availableTypes = useMemo(() => {
        if (!selectedCampaign || !selectedAccount) return { hasUsers: false, hasGroups: false, hasAny: false };
        const relevantConvs = conversations.filter(c => {
            const cNames = (c.campaign_name && c.campaign_name.trim()) ? c.campaign_name.split('|').map(s => s.trim()) : [];
            const matchCamp = selectedCampaign === DIRECT_CAMPAIGN_NAME ? (cNames.length === 0 || cNames.includes(DIRECT_CAMPAIGN_NAME)) : cNames.includes(selectedCampaign);
            return matchCamp && isConvOwner(c.owner_id, selectedAccount);
        });
        let hasUsers = false;
        let hasGroups = false;
        relevantConvs.forEach(c => {
            if (c.peer_id.startsWith('-')) hasGroups = true;
            else hasUsers = true;
        });
        return { hasUsers, hasGroups, hasAny: relevantConvs.length > 0 };
    }, [selectedCampaign, selectedAccount, conversations, accounts]);

    const filteredConversations = useMemo(() => {
        if (!selectedCampaign || !selectedAccount || !selectedType) return [];
        return conversations.filter(c => {
            const cNames = (c.campaign_name && c.campaign_name.trim()) ? c.campaign_name.split('|').map(s => s.trim()) : [];
            const matchCamp = selectedCampaign === DIRECT_CAMPAIGN_NAME ? (cNames.length === 0 || cNames.includes(DIRECT_CAMPAIGN_NAME)) : cNames.includes(selectedCampaign);
            const matchAcc = isConvOwner(c.owner_id, selectedAccount);
            const isGroup = c.peer_id.startsWith('-');
            let matchType = true;
            if (selectedType === 'user') matchType = !isGroup;
            if (selectedType === 'group') matchType = isGroup;
            if (selectedType === 'all') matchType = true;
            let matchStatus = true;
            if (statusFilter.length > 0) {
                const rec = recipientMap.get(c.peer_id);
                const currentStatus = rec?.crm_status || 'new';
                if (!statusFilter.includes(currentStatus)) matchStatus = false;
            }
            return matchCamp && matchAcc && matchType && matchStatus;
        });
    }, [selectedCampaign, selectedAccount, selectedType, conversations, accounts, statusFilter, recipientMap]);

    const activeConversation = conversations.find(c => c.id === selectedConversationId);

    const senderInfo = useMemo(() => {
        if (!activeConversation) return { name: 'Unknown', id: 0 };
        const acc = accounts.find(a => String(a.id) === String(activeConversation.owner_id) || String(a.vk_user_id) === String(activeConversation.owner_id));
        return acc ? { name: acc.name, id: acc.id } : { name: 'Unknown', id: 0 };
    }, [activeConversation, accounts]);

    const profileLink = useMemo(() => {
        if (!activeConversation) return '#';
        const pid = activeConversation.peer_id;
        return `https://vk.com/${pid.startsWith('-') ? 'club' + pid.substring(1) : 'id' + pid}`;
    }, [activeConversation]);

    const activeRecipient = useMemo(() => {
        if (!activeConversation) return undefined;
        return recipients.find(r => r.vk_user_id === activeConversation.peer_id);
    }, [activeConversation, recipients]);

    useEffect(() => {
        // --- EXTERNAL NAVIGATION HANDLER ---
        if (externalConversationId) {
            const c = conversations.find(conv => conv.id === externalConversationId);
            if (c) {
                const acc = accounts.find(a => String(a.id) === String(c.owner_id) || String(a.vk_user_id) === String(c.owner_id));
                const accId = acc ? acc.id : null;
                if (accId) {
                    const cNames = c.campaign_name ? c.campaign_name.split('|').map(s => s.trim()) : [];
                    const mainCampaign = cNames.length > 0 ? cNames[0] : DIRECT_CAMPAIGN_NAME;
                    setSelectedCampaign(mainCampaign);
                    setSelectedAccount(accId);
                    setSelectedType('all');
                    handleSelectConversation(c.id);
                }
            }
        }
        if (externalCampaignName) {
            // Check if the campaign exists in our list to avoid dead ends
            const exists = campaigns.includes(externalCampaignName);
            if (exists) {
                setSelectedCampaign(externalCampaignName);
                setSelectedAccount(null);
                setSelectedType(null);
                setSelectedConversationId(null);
            }
        }
    }, [externalConversationId, externalCampaignName, conversations, accounts, campaigns]);

    const fetchMessages = async () => {
        if (!selectedConversationId) return;
        try {
            const res = await get<ChatMessage[]>(`messages/${selectedConversationId}`); 
            setMessages(Array.isArray(res) ? res : []);
        } catch (e) { console.error(e); }
    };

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await fetchMessages();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    useEffect(() => {
        if (!selectedConversationId) { setMessages([]); return; }
        setMessages([]); 
        fetchMessages();
        const i = setInterval(fetchMessages, 3000);
        return () => clearInterval(i);
    }, [selectedConversationId]);

    const handleSendMessage = async (text: string, attachments: {id: string, name: string}[] = []) => {
        if ((!text.trim() && attachments.length === 0) || !selectedConversationId || isSending) return;
        setIsSending(true);
        try {
            await post('send-message', { 
                recipientId: selectedConversationId, 
                message: text,
                attachments: attachments.map(a => a.id) 
            });
            
            const optimisticAttachments = attachments.map(a => {
                const isImage = a.name.match(/\.(jpg|jpeg|png|gif)$/i);
                return {
                    type: isImage ? 'photo' : 'doc',
                    title: a.name,
                    url: '', 
                    ext: a.name.split('.').pop()
                };
            });

            setMessages(prev => [...prev, { 
                id: Date.now(), 
                sender: 'me', 
                text: text, 
                date: Math.floor(Date.now()/1000),
                attachments: optimisticAttachments
            } as any]); 
        } catch (e: any) { alert("Ошибка: " + e.message); }
        finally {
            setIsSending(false);
        }
    };

    // Collapse Calculations
    let depth = 0;
    if (selectedCampaign) depth = 1;
    if (selectedAccount) depth = 2;
    if (selectedType) depth = 3;
    if (selectedConversationId) depth = 4;

    const isCol1Collapsed = autoCollapseColumns && depth > 0;
    const isCol2Collapsed = autoCollapseColumns && depth > 1;
    const isCol3Collapsed = autoCollapseColumns && depth > 3;

    const selectCampaign = (c: string | null) => {
        if (selectedCampaign === c) return;
        setSelectedCampaign(c);
        setSelectedAccount(null);
        setSelectedType(null);
        handleSelectConversation(null);
    };

    const selectAccount = (id: number | null) => {
        if (selectedAccount === id) return;
        setSelectedAccount(id);
        if (id !== null) {
            setSelectedType('all');
        } else {
            setSelectedType(null);
        }
        handleSelectConversation(null);
    };

    const selectType = (t: EntityType | null) => {
        if (selectedType === t) return;
        setSelectedType(t);
        handleSelectConversation(null);
    };

    const toggleStatusFilter = (status: CrmStatus) => {
        setStatusFilter(prev => 
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    const getStatusDotColor = (status: CrmStatus) => {
        const classes = CRM_STATUS_COLORS[status] || CRM_STATUS_COLORS['new'];
        if (classes.includes('bg-red')) return 'bg-red-500';
        if (classes.includes('bg-green')) return 'bg-green-500';
        if (classes.includes('bg-blue')) return 'bg-blue-500';
        if (classes.includes('bg-amber')) return 'bg-amber-500';
        if (classes.includes('bg-yellow')) return 'bg-yellow-500';
        return 'bg-gray-400';
    };

    const contextConv = contextMenu?.type === 'conv' ? conversations.find(c => c.id === contextMenu.id) : null;
    
    return (
        <div className="flex flex-col h-full w-full bg-main text-text-main font-sans">
            <div className="flex-1 flex overflow-x-auto overflow-y-hidden w-full relative">
                
                <CampaignsList 
                    campaigns={campaigns}
                    selectedCampaign={selectedCampaign}
                    unreadMap={campaignUnreadMap}
                    isCollapsed={isCol1Collapsed}
                    onSelect={selectCampaign}
                    directCampaignName={DIRECT_CAMPAIGN_NAME}
                    onContextMenu={handleCampContextMenu}
                    activityMap={campaignActivityMap}
                />

                {depth >= 1 && (
                    <SendersList 
                        accounts={campaignAccounts}
                        selectedAccount={selectedAccount}
                        unreadMap={accountUnreadMap}
                        isCollapsed={isCol2Collapsed}
                        onSelect={selectAccount}
                        onResetCampaign={() => selectCampaign(null)}
                    />
                )}

                {depth >= 2 && (
                    <ConversationsList 
                        conversations={filteredConversations}
                        selectedId={selectedConversationId}
                        selectedType={selectedType}
                        recipientMap={recipientMap}
                        statusFilter={statusFilter}
                        availableTypes={availableTypes}
                        isCollapsed={isCol3Collapsed}
                        onSelect={handleSelectConversation}
                        onSelectType={selectType}
                        onResetAccount={() => selectAccount(null)}
                        onContextMenu={handleConvContextMenu}
                        onToggleStatusFilter={toggleStatusFilter}
                        onResetStatusFilter={() => setStatusFilter([])}
                    />
                )}

                {depth >= 4 && selectedConversationId && activeConversation && (
                    <DatabaseChatWindow 
                        activeConversation={activeConversation}
                        messages={messages}
                        senderInfo={senderInfo}
                        profileLink={profileLink}
                        recipientData={activeRecipient}
                        templates={templates} 
                        isRefreshing={isRefreshing}
                        isSending={isSending}
                        chatLayout={chatLayout}
                        onBack={() => handleSelectConversation(null)}
                        onRefresh={handleManualRefresh}
                        onSendMessage={handleSendMessage}
                        onStatusChange={(newStatus) => handleStatusChangeRobust(selectedConversationId, newStatus)}
                        onUpdateNotes={(notes) => handleUpdateNotes(selectedConversationId, notes)}
                        onOpenProfile={handleOpenProfile}
                    />
                )}

                {depth < 4 && (
                     <div className="flex-1 bg-main flex flex-col items-center justify-center text-text-muted opacity-30 select-none">
                        <div className="text-8xl mb-4 filter grayscale">💬</div>
                        <p className="text-xl font-medium">Выберите диалог слева</p>
                    </div>
                )}
            </div>

            {contextMenu && (
                <div 
                    ref={contextMenuRef}
                    className="fixed z-[9999] w-56 bg-panel border border-border-main rounded-lg shadow-2xl overflow-hidden animate-fade-in text-left text-sm"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.type === 'conv' && contextConv && (
                        <>
                            <button 
                                onClick={() => handlePinConversation(contextMenu.id)}
                                className="w-full text-left px-4 py-3 text-text-main hover:bg-hover border-b border-border-main flex items-center gap-2"
                            >
                                <PinIcon className="w-4 h-4 text-text-muted" />
                                {contextConv.pinned ? 'Открепить диалог' : 'Закрепить диалог'}
                            </button>

                            <div className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase bg-subpanel/50 border-b border-border-main">
                                Изменить статус
                            </div>
                            {Object.entries(CRM_STATUS_LABELS).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => handleStatusChangeRobust(contextMenu.id, key as CrmStatus)}
                                    className="w-full px-4 py-2 text-xs text-text-main hover:bg-hover text-left flex items-center gap-2 border-b border-border-main last:border-0"
                                >
                                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor(key as CrmStatus)}`}></div>
                                    {label}
                                </button>
                            ))}
                        </>
                    )}

                    {contextMenu.type === 'camp' && (
                        <>
                            <div className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase bg-subpanel/50 border-b border-border-main">
                                Управление кампанией
                            </div>
                            <button 
                                onClick={() => {
                                    setCampaignToDelete(contextMenu.id);
                                    setDeleteModalOpen(true);
                                    setContextMenu(null);
                                    setDeleteHistory(false); 
                                }}
                                className="w-full px-4 py-3 text-red-500 hover:bg-red-500/10 text-left flex items-center gap-2 font-bold"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Убрать из списка
                            </button>
                        </>
                    )}
                </div>
            )}

            <ConfirmModal 
                isOpen={isDeleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setCampaignToDelete(null); }}
                onConfirm={handleDeleteCampaign}
                title="Расформировать кампанию?"
                message="Это действие уберет название кампании из всех связанных диалогов."
                isLoading={isDeleting}
            >
                <div className="bg-subpanel/50 p-3 rounded border border-border-main mt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={deleteHistory}
                            onChange={e => setDeleteHistory(e.target.checked)}
                            className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                        />
                        <div className="text-sm">
                            <span className="font-bold text-red-500 block">Удалить историю переписки</span>
                            <span className="text-xs text-text-muted">Если выключено — диалоги сохранятся без тега кампании.</span>
                        </div>
                    </label>
                </div>
            </ConfirmModal>

            {/* Profile Drawer with React Portal happens inside ClientDetailsDrawer component now */}
            {drawerRecipient && (
                <ClientDetailsDrawer 
                    recipient={drawerRecipient} 
                    onClose={() => setDrawerRecipient(null)}
                    onUpdate={refreshAll}
                    onDelete={handleDeleteRecipient}
                    onGoToChat={() => {}} 
                    availableTags={allTags}
                />
            )}
        </div>
    );
};
