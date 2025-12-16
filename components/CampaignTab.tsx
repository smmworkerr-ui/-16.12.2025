




import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Template, Account, Recipient, ConstructorPart, Conversation, AppLogEntry } from '../types';
import { post } from '../apiClient';
import { RocketIcon, RefreshIcon, TrashIcon, UsersIcon, ExclamationIcon } from './icons';
import { countSpintaxVariations, calculateRisk } from './utils';

// Import New Modules
import { CampaignActiveModal } from './CampaignActiveModal';
import { CampaignNameBlock } from './campaign/CampaignNameBlock';
import { CampaignAccountsBlock } from './campaign/CampaignAccountsBlock';
import { CampaignMessageBlock } from './campaign/CampaignMessageBlock';
import { CampaignRecipientsBlock } from './campaign/CampaignRecipientsBlock';
import { CampaignSidebar } from './campaign/CampaignSidebar';
import { AccountDetailsDrawer } from './AccountDetailsDrawer';
import { ConfirmModal } from './ConfirmModal';

interface CampaignTabProps {
    templates: Template[];
    accounts: Account[];
    recipients?: Recipient[]; 
    conversations?: Conversation[]; 
    refreshAll: () => void;
    onJumpToTemplates?: (campaignName: string) => void;
    onGoToChat?: (id: string) => void;
    onGoToAccount?: (id: number) => void;
    appLogs?: AppLogEntry[];
}

export const CampaignTab: React.FC<CampaignTabProps> = ({ 
    templates, 
    accounts, 
    recipients = [],
    conversations = [],
    refreshAll, 
    onJumpToTemplates,
    onGoToChat,
    onGoToAccount,
    appLogs = []
}) => {
    // --- STATE MANAGEMENT ---
    
    // 1. Name & Errors
    const [campaignName, setCampaignName] = useState('');
    const [errors, setErrors] = useState({ block1: false, block2: false, block3: false, block4: false });

    // 2. Accounts
    const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
    const [isSpecificAccountSelectionEnabled, setIsSpecificAccountSelectionEnabled] = useState(false);
    const [tagFilter, setTagFilter] = useState('all');

    // 3. Message
    const [messageMode, setMessageMode] = useState<'template' | 'custom' | 'constructor'>('template');
    const [customText, setCustomText] = useState('');
    const [uploadedAttachments, setUploadedAttachments] = useState<{id: string, name: string}[]>([]);
    
    const [wholeCampaignName, setWholeCampaignName] = useState('');
    const [wholeSubtype, setWholeSubtype] = useState('');
    const [isSpecificTemplateSelectionEnabled, setIsSpecificTemplateSelectionEnabled] = useState(false);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);

    const [sourceCampaignName, setSourceCampaignName] = useState('');
    const [constructorParts, setConstructorParts] = useState<ConstructorPart[]>([
        { id: '1', subtype: 'greeting' }, { id: '2', subtype: 'body' }, { id: '3', subtype: 'closing' }
    ]);
    const [constructorNoNewlines, setConstructorNoNewlines] = useState(false);

    // 4. Recipients
    const [recipientSource, setRecipientSource] = useState<'manual' | 'campaign'>('manual');
    const [recipientMode, setRecipientMode] = useState<'auto' | 'users' | 'groups'>('auto');
    const [bulkIds, setBulkIds] = useState('');
    const [sourceRecipientCampaign, setSourceRecipientCampaign] = useState('');

    // 5. Tech Settings
    const [executionMode, setExecutionMode] = useState<'sequential' | 'parallel'>('sequential'); // NEW
    const [delayMode, setDelayMode] = useState<'manual' | 'auto'>('manual');
    const [delayMin, setDelayMin] = useState(5);
    const [delayMax, setDelayMax] = useState(15);
    const [workStart, setWorkStart] = useState(0);
    const [workEnd, setWorkEnd] = useState(24);
    const [skipIfDialogExists, setSkipIfDialogExists] = useState(false);
    const [resetStatusNew, setResetStatusNew] = useState(false);
    const [addFriends, setAddFriends] = useState(false); 
    
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const [showActiveCampaigns, setShowActiveCampaigns] = useState(false);
    const [isSendingRequest, setIsSendingRequest] = useState(false);

    // Reset Modal
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    
    // Safety Warning Modal
    const [isSafetyWarningOpen, setIsSafetyWarningOpen] = useState(false);
    const [safetyRiskLevel, setSafetyRiskLevel] = useState(0);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, accountId: number } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Local Account Drawer State (No navigation)
    const [viewingAccountId, setViewingAccountId] = useState<number | null>(null);

    // --- DERIVED DATA & CALCULATIONS ---

    const totalWholeCombinations = useMemo(() => {
        if (messageMode !== 'template' || !wholeCampaignName) return 0;
        const relevantTemplates = templates.filter(t => 
            (t.campaign_name || 'Общее') === wholeCampaignName && 
            (wholeSubtype ? (t.subtype || 'mixed') === wholeSubtype : true)
        );
        return relevantTemplates.reduce((acc, t) => acc + countSpintaxVariations(t.text), 0);
    }, [templates, wholeCampaignName, wholeSubtype, messageMode]);

    const totalConstructorCombinations = useMemo(() => {
        if (messageMode !== 'constructor') return 0;
        let total = 1;
        let hasData = false;
        constructorParts.forEach(part => {
            if (!part.subtype) return;
            const relevantTemplates = templates.filter(t => (t.campaign_name || 'Общее') === sourceCampaignName && (t.subtype || 'mixed') === part.subtype);
            if (relevantTemplates.length === 0) total = 0; 
            else {
                hasData = true;
                total *= relevantTemplates.reduce((acc, t) => acc + countSpintaxVariations(t.text), 0);
            }
        });
        return hasData ? total : 0;
    }, [constructorParts, templates, sourceCampaignName, messageMode]);

    const activeSpintaxScore = useMemo(() => {
        if (messageMode === 'custom') return countSpintaxVariations(customText);
        if (messageMode === 'constructor') return totalConstructorCombinations;
        if (messageMode === 'template') return totalWholeCombinations;
        return 1; 
    }, [messageMode, customText, totalConstructorCombinations, totalWholeCombinations]);

    // Recipient Calculation Logic
    const { totalRecipientsCount, riskyRecipientsCount } = useMemo(() => {
        // 1. Get raw candidates
        let candidates: string[] = [];
        if (recipientSource === 'campaign' && sourceRecipientCampaign) {
            candidates = bulkIds.split('\n')
                .map(s => s.trim())
                .filter(s => s)
                .map(s => s.replace('https://vk.com/', '').replace('vk.com/', '').replace('/', ''));
        } else if (bulkIds) {
            candidates = bulkIds.split('\n')
                .map(s => s.trim())
                .filter(s => s)
                .map(s => s.replace('https://vk.com/', '').replace('vk.com/', '').replace('/', ''));
        }

        // 2. Prepare Set of Existing Peer IDs for O(1) lookup
        const normalizeId = (id: string) => String(id).replace(/^(id|club|public)/, '').replace('-', '');
        
        const existingPeerIds = new Set<string>();
        conversations.forEach(c => existingPeerIds.add(normalizeId(c.peer_id)));
        recipients.forEach(r => { if (r.status === 'chat') existingPeerIds.add(normalizeId(r.vk_user_id)); });

        // 3. Count
        let total = 0;
        let risky = 0;

        candidates.forEach(id => {
            const normId = normalizeId(id);
            const exists = existingPeerIds.has(normId);

            if (skipIfDialogExists) {
                if (!exists) total++;
            } else {
                total++; // We message everyone
            }

            // Logic for RISKY (Health) - Only new contacts count as risk
            if (!exists) {
                risky++;
            }
        });

        return { totalRecipientsCount: total, riskyRecipientsCount: risky };
    }, [recipientSource, sourceRecipientCampaign, bulkIds, recipients, skipIfDialogExists, conversations]);

    // Data lists
    const campaignSuggestions = useMemo(() => {
        const set = new Set<string>();
        templates.forEach(t => set.add(t.campaign_name || 'Общее'));
        conversations.forEach(c => {
            if (c.campaign_name) {
                c.campaign_name.split('|').forEach(part => {
                    const clean = part.trim();
                    if (clean && clean !== '📥 Прямые сообщения' && clean !== '🗄️ Прошлые кампании') set.add(clean);
                });
            }
        });
        recipients.forEach(r => {
            if (r.campaign_name && r.campaign_name !== 'Manual' && r.campaign_name !== '📥 Прямые сообщения') {
                set.add(r.campaign_name);
            }
        });
        return Array.from(set).sort();
    }, [templates, conversations, recipients]);

    const accountTags = useMemo(() => {
        const tags = new Set<string>();
        accounts.forEach(a => { if (a.tags) a.tags.forEach(t => tags.add(t)); });
        return Array.from(tags).sort();
    }, [accounts]);

    const activeAccountsList = useMemo(() => {
        if (isSpecificAccountSelectionEnabled) return accounts.filter(a => selectedAccountIds.includes(a.id));
        return accounts.filter(a => a.status === 'OK');
    }, [isSpecificAccountSelectionEnabled, selectedAccountIds, accounts]);

    const pastCampaigns = useMemo(() => {
        const set = new Set<string>();
        recipients.forEach(r => { if(r.campaign_name && r.campaign_name !== 'Manual' && r.campaign_name !== '📥 Прямые сообщения') set.add(r.campaign_name); });
        conversations.forEach(c => {
            if (c.campaign_name) {
                c.campaign_name.split('|').forEach(part => {
                    const clean = part.trim();
                    if (clean && clean !== '📥 Прямые сообщения' && clean !== '🗄️ Прошлые кампании') set.add(clean);
                });
            }
        });
        return Array.from(set).sort();
    }, [recipients, conversations]);

    const viewingAccount = useMemo(() => {
        if (!viewingAccountId) return null;
        return accounts.find(a => a.id === viewingAccountId);
    }, [viewingAccountId, accounts]);

    useEffect(() => {
        if (recipientSource === 'campaign' && sourceRecipientCampaign) {
            const collectedIds = new Set<string>();
            recipients.forEach(r => {
                if (r.campaign_name === sourceRecipientCampaign) collectedIds.add(r.vk_user_id);
            });
            conversations.forEach(c => {
                if (c.campaign_name) {
                    const cNames = c.campaign_name.split('|').map(s => s.trim());
                    if (cNames.includes(sourceRecipientCampaign)) collectedIds.add(c.peer_id);
                }
            });
            setBulkIds(Array.from(collectedIds).join('\n'));
        }
    }, [recipientSource, sourceRecipientCampaign, recipients, conversations]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- ACTIONS ---

    const handleCreateTemplateCampaign = () => {
        if (!campaignName.trim()) { alert("Введите название кампании"); return; }
        if (onJumpToTemplates) onJumpToTemplates(campaignName);
    };

    const handleResetForm = () => {
        setIsResetModalOpen(true);
    };

    const executeReset = () => {
        setCampaignName(''); setBulkIds(''); setCustomText(''); setUploadedAttachments([]);
        setConstructorParts([{ id: '1', subtype: 'greeting' }, { id: '2', subtype: 'body' }, { id: '3', subtype: 'closing' }]);
        setWholeCampaignName(''); setSourceCampaignName(''); setSourceRecipientCampaign(''); 
        setSelectedAccountIds([]); setIsSpecificAccountSelectionEnabled(false);
        setResetStatusNew(false);
        setAddFriends(false);
        setIsResetModalOpen(false);
    };

    const executeLaunch = async () => {
        setIsSafetyWarningOpen(false);
        setIsSendingRequest(true);
        try {
            const consOptions = { no_newlines: constructorNoNewlines, parts: constructorParts.map(p => p.subtype) };
            let startAtTimestamp = isScheduled && scheduledTime ? new Date(scheduledTime).getTime() / 1000 : null;

            await post('start-bulk-campaign', { 
                ids_text: bulkIds, campaign_name: campaignName,
                specific_account_ids: isSpecificAccountSelectionEnabled && selectedAccountIds.length > 0 ? selectedAccountIds : null,
                specific_template_ids: (messageMode === 'template' && isSpecificTemplateSelectionEnabled) ? selectedTemplateIds : null,
                custom_text: messageMode === 'custom' ? customText : null,
                source_campaign_name: messageMode === 'constructor' ? sourceCampaignName : (messageMode === 'template' ? wholeCampaignName : null),
                source_subtype: messageMode === 'template' ? wholeSubtype : null,
                constructor_options: messageMode === 'constructor' ? consOptions : null,
                message_mode: messageMode, recipient_mode: recipientMode,
                attachments: uploadedAttachments.map(a => a.id),
                execution_mode: executionMode, // PASS MODE
                delay_mode: delayMode,
                delay_min: delayMin, delay_max: delayMax, work_start: workStart, work_end: workEnd,
                skip_if_dialog_exists: skipIfDialogExists, reset_status_new: resetStatusNew,
                add_friends: addFriends, 
                start_at: startAtTimestamp
            });
            setBulkIds(''); setUploadedAttachments([]); refreshAll();
        } catch (e: any) { alert("Ошибка запуска: " + e.message); } 
        finally { setIsSendingRequest(false); }
    };

    const handleStartCampaign = async () => {
        const newErrors = {
            block1: !campaignName.trim(),
            block2: isSpecificAccountSelectionEnabled && selectedAccountIds.length === 0,
            block3: false,
            block4: !bulkIds.trim()
        };
        if (messageMode === 'custom' && !customText.trim() && uploadedAttachments.length === 0) newErrors.block3 = true;
        if (messageMode === 'template' && (!wholeCampaignName || (isSpecificTemplateSelectionEnabled && selectedTemplateIds.length === 0))) newErrors.block3 = true;
        if (messageMode === 'constructor' && (!sourceCampaignName || constructorParts.length === 0 || constructorParts.some(p => !p.subtype))) newErrors.block3 = true;
        
        setErrors(newErrors);
        if (Object.values(newErrors).some(v => v)) return;

        const accCount = activeAccountsList.length;
        if (accCount > 0) {
            const loadPerAcc = Math.ceil(riskyRecipientsCount / accCount);
            const avgDelay = delayMode === 'auto' ? 60 : (delayMin + delayMax) / 2;
            let minHealth = 100;
            
            for (const acc of activeAccountsList) {
                const limit = acc.day_limit || 20;
                const risk = calculateRisk(loadPerAcc, avgDelay, activeSpintaxScore, limit);
                const health = Math.max(0, 100 - risk);
                if (health < minHealth) minHealth = health;
            }
            
            if (minHealth < 50) {
                setSafetyRiskLevel(Math.floor(minHealth));
                setIsSafetyWarningOpen(true);
                return;
            }
        }

        await executeLaunch();
    };

    const handleAccountContextMenu = (e: React.MouseEvent, accountId: number) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, accountId });
    };

    const handleGoToCard = () => {
        if (contextMenu) {
            setViewingAccountId(contextMenu.accountId);
            setContextMenu(null);
        }
    };

    return (
        <div className="w-full h-full flex overflow-hidden bg-main text-text-main font-sans relative">
            {/* LEFT COLUMN: CONTENT */}
            <div className="w-7/12 flex flex-col overflow-y-auto custom-scrollbar p-6 pb-24 border-r border-border-main">
                <div className="w-full space-y-6">
                    <CampaignNameBlock 
                        campaignName={campaignName} setCampaignName={setCampaignName}
                        campaignSuggestions={campaignSuggestions} error={errors.block1}
                    />
                    
                    <CampaignAccountsBlock 
                        accounts={accounts} selectedAccountIds={selectedAccountIds} setSelectedAccountIds={setSelectedAccountIds}
                        isSpecific={isSpecificAccountSelectionEnabled} setIsSpecific={setIsSpecificAccountSelectionEnabled}
                        accountTags={accountTags} tagFilter={tagFilter} setTagFilter={setTagFilter} error={errors.block2}
                        recipientsCount={riskyRecipientsCount} 
                        delayMin={delayMin} delayMax={delayMax} spintaxScore={activeSpintaxScore}
                        onContextMenu={handleAccountContextMenu}
                    />

                    <CampaignMessageBlock 
                        templates={templates} messageMode={messageMode} setMessageMode={setMessageMode}
                        customText={customText} setCustomText={setCustomText}
                        uploadedAttachments={uploadedAttachments} setUploadedAttachments={setUploadedAttachments}
                        wholeCampaignName={wholeCampaignName} setWholeCampaignName={setWholeCampaignName}
                        wholeSubtype={wholeSubtype} setWholeSubtype={setWholeSubtype}
                        isSpecificTemplateSelectionEnabled={isSpecificTemplateSelectionEnabled} setIsSpecificTemplateSelectionEnabled={setIsSpecificTemplateSelectionEnabled}
                        selectedTemplateIds={selectedTemplateIds} setSelectedTemplateIds={setSelectedTemplateIds}
                        sourceCampaignName={sourceCampaignName} setSourceCampaignName={setSourceCampaignName}
                        constructorParts={constructorParts} setConstructorParts={setConstructorParts}
                        constructorNoNewlines={constructorNoNewlines} setConstructorNoNewlines={setConstructorNoNewlines}
                        handleCreateTemplateCampaign={handleCreateTemplateCampaign} refreshAll={refreshAll}
                        totalCombinations={activeSpintaxScore}
                        error={errors.block3}
                    />

                    <CampaignRecipientsBlock 
                        recipientSource={recipientSource} setRecipientSource={setRecipientSource}
                        recipientMode={recipientMode} setRecipientMode={setRecipientMode}
                        bulkIds={bulkIds} setBulkIds={setBulkIds}
                        sourceRecipientCampaign={sourceRecipientCampaign} setSourceRecipientCampaign={setSourceRecipientCampaign}
                        pastCampaigns={pastCampaigns} error={errors.block4}
                    />
                </div>
            </div>

            {/* FLOATING ACTION BAR */}
            <div className="absolute bottom-6 left-6 w-[55%] max-w-2xl z-40 flex gap-3">
                <button onClick={() => setShowActiveCampaigns(true)} className="px-6 py-4 rounded-xl font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-95 bg-panel border border-border-main text-text-main hover:bg-hover flex items-center gap-2">
                    <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                    <span className="hidden sm:inline">Активные миссии</span>
                </button>
                <button onClick={handleResetForm} className="px-4 py-4 rounded-xl font-bold uppercase tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-95 bg-panel border border-border-main text-text-muted hover:text-text-main hover:text-red-500 hover:border-red-500/30" title="Сбросить все настройки">
                    <TrashIcon className="w-6 h-6" />
                </button>
                <button onClick={handleStartCampaign} disabled={isSendingRequest} className={`flex-1 py-4 rounded-xl font-black text-lg uppercase tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-[0.99] flex items-center justify-center gap-3 ${isSendingRequest ? 'bg-gray-700 cursor-wait text-gray-400' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border border-green-500/20'}`}>
                    {isSendingRequest ? <><RefreshIcon className="w-5 h-5 animate-spin" /> Обработка...</> : <><RocketIcon className="w-6 h-6" /> {isScheduled ? 'ЗАПЛАНИРОВАТЬ' : 'ЗАПУСТИТЬ РАССЫЛКУ'}</>}
                </button>
            </div>

            {/* RIGHT COLUMN: SIDEBAR */}
            <CampaignSidebar 
                recipientsCount={totalRecipientsCount} 
                riskyRecipientsCount={riskyRecipientsCount}
                selectedAccounts={activeAccountsList} spintaxScore={activeSpintaxScore}
                minDelay={delayMin} maxDelay={delayMax}
                isScheduled={isScheduled} setIsScheduled={setIsScheduled} scheduledTime={scheduledTime} setScheduledTime={setScheduledTime}
                delayMode={delayMode} setDelayMode={setDelayMode}
                executionMode={executionMode} setExecutionMode={setExecutionMode} // PASS EXECUTION MODE
                delayMin={delayMin} setDelayMin={setDelayMin} delayMax={delayMax} setDelayMax={setDelayMax}
                workStart={workStart} setWorkStart={setWorkStart} workEnd={workEnd} setWorkEnd={setWorkEnd}
                skipIfDialogExists={skipIfDialogExists} setSkipIfDialogExists={setSkipIfDialogExists}
                resetStatusNew={resetStatusNew} setResetStatusNew={setResetStatusNew}
                addFriends={addFriends} setAddFriends={setAddFriends}
                appLogs={appLogs} onGoToChat={onGoToChat} recipients={recipients}
                onAccountContextMenu={handleAccountContextMenu}
            />

            {showActiveCampaigns && <CampaignActiveModal onClose={() => setShowActiveCampaigns(false)} onRefresh={refreshAll} />}

            <ConfirmModal 
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={executeReset}
                title="Сброс конструктора"
                message="Вы уверены, что хотите полностью очистить форму? Все введенные данные, выбранные аккаунты и настройки будут сброшены."
            />

            <ConfirmModal 
                isOpen={isSafetyWarningOpen}
                onClose={() => setIsSafetyWarningOpen(false)}
                onConfirm={executeLaunch}
                title="⚠️ ОБНАРУЖЕН ВЫСОКИЙ РИСК"
                message=""
            >
                <div className="space-y-4">
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                        <ExclamationIcon className="w-6 h-6 text-red-500 shrink-0" />
                        <div className="text-sm">
                            <p className="font-bold text-red-500 mb-1">Прогнозируемое здоровье упадет до {safetyRiskLevel}%</p>
                            <p className="text-text-muted">Запуск с такими параметрами значительно повышает вероятность блокировки аккаунтов.</p>
                        </div>
                    </div>
                    <p className="text-center text-xs font-bold text-text-main mt-2">Вы все равно хотите продолжить?</p>
                </div>
            </ConfirmModal>

            {contextMenu && (
                <div 
                    ref={contextMenuRef}
                    className="fixed z-[9999] bg-panel border border-border-main rounded-xl shadow-2xl py-1 w-48 overflow-hidden animate-fade-in"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button onClick={handleGoToCard} className="w-full text-left px-4 py-3 text-sm font-bold text-text-main hover:bg-hover flex items-center gap-2"><UsersIcon className="w-4 h-4 text-text-muted" /> Перейти к карточке</button>
                </div>
            )}

            {viewingAccount && <AccountDetailsDrawer account={viewingAccount} onClose={() => setViewingAccountId(null)} onUpdate={refreshAll} onGoToChat={onGoToChat} />}
        </div>
    );
};
