
import React, { useState, useEffect } from 'react';
import { GearIcon, DatabaseIcon, RefreshIcon, ClockIcon, FolderIcon, TrashIcon } from './icons';
import { post, get } from '../apiClient';
import { formatDate } from './utils';

interface SettingsTabProps {
    settings: {
        autoCollapseColumns: boolean;
        autoCollapseTemplates: boolean;
        chatLayout: string;
        disableDeleteConfirm: boolean;
    };
    onUpdateSettings: (newSettings: any) => void;
}

interface BackupFile {
    filename: string;
    size: number;
    created_at: number;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onUpdateSettings }) => {
    const [isRepairing, setIsRepairing] = useState(false);
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        try {
            const data = await get<BackupFile[]>('backups');
            setBackups(data || []);
        } catch (e) { console.error(e); }
    };

    const toggleAutoCollapse = () => {
        onUpdateSettings({ ...settings, autoCollapseColumns: !settings.autoCollapseColumns });
    };

    const toggleAutoCollapseTemplates = () => {
        onUpdateSettings({ ...settings, autoCollapseTemplates: !settings.autoCollapseTemplates });
    };

    const toggleChatLayout = () => {
        onUpdateSettings({ ...settings, chatLayout: settings.chatLayout === 'linear' ? 'alternating' : 'linear' });
    };

    const toggleDeleteConfirm = () => {
        onUpdateSettings({ ...settings, disableDeleteConfirm: !settings.disableDeleteConfirm });
    };

    const handleRepairCrm = async () => {
        if (!confirm("Это просканирует все диалоги и восстановит потерянные карточки клиентов в CRM. Продолжить?")) return;
        setIsRepairing(true);
        try {
            const res = await post<{status: string, restored: number}>('repair-crm', {});
            alert(`Готово! Восстановлено клиентов: ${res.restored}`);
        } catch (e: any) {
            alert("Ошибка: " + e.message);
        } finally {
            setIsRepairing(false);
        }
    };

    const handleCreateBackup = async () => {
        setIsCreatingBackup(true);
        try {
            await post('backups/create', {});
            await fetchBackups();
        } catch (e: any) {
            alert("Ошибка создания бэкапа: " + e.message);
        } finally {
            setIsCreatingBackup(false);
        }
    };

    const handleRestoreBackup = async (filename: string) => {
        if (!confirm(`⚠️ ВНИМАНИЕ! \n\nВы собираетесь восстановить базу данных из файла "${filename}". \n\nВСЕ текущие данные, которые были добавлены ПОСЛЕ создания этого бэкапа, будут УТЕРЯНЫ.\n\nПродолжить?`)) return;
        
        setIsRestoring(true);
        try {
            await post('backups/restore', { filename });
            alert("База данных успешно восстановлена. Страница будет перезагружена.");
            window.location.reload();
        } catch (e: any) {
            alert("Ошибка восстановления: " + e.message);
            setIsRestoring(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="w-full h-full bg-main text-text-main font-sans overflow-y-auto custom-scrollbar p-6 md:p-10">
            <div className="max-w-3xl mx-auto pb-10">
                {/* HERO HEADER */}
                <div className="flex items-center gap-6 mb-10 pb-8 border-b border-border-main">
                    <div className="p-4 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl shadow-xl">
                        <GearIcon className="w-12 h-12 text-white" />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black tracking-tight mb-2">Настройки</h2>
                        <p className="text-text-muted text-lg">Управление поведением системы</p>
                    </div>
                </div>

                {/* SECTION: BEHAVIOR */}
                <div className="bg-panel rounded-2xl p-8 border border-border-main shadow-sm flex flex-col gap-6 mb-6">
                    <h3 className="text-xl font-bold text-vk-blue flex items-center gap-2">
                        <span>⚙️</span> Основные параметры
                    </h3>
                    
                    {[
                        {
                            title: "Вид сообщений",
                            desc: "Выбор стиля отображения пузырей чата (Линейный или Классический).",
                            action: (
                                <button 
                                    onClick={toggleChatLayout}
                                    className="bg-subpanel hover:bg-hover text-text-main px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition border border-border-main flex items-center gap-2 shadow-sm"
                                >
                                    <span>{settings.chatLayout === 'linear' ? '⬇ Линейно' : '⇄ Диалог'}</span>
                                </button>
                            )
                        },
                        {
                            title: "Быстрое удаление",
                            desc: "Отключить подтверждение 'Вы уверены?' при удалении объектов. Будьте осторожны.",
                            action: (
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.disableDeleteConfirm} 
                                        onChange={toggleDeleteConfirm}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-12 h-7 bg-subpanel peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 border border-border-main"></div>
                                </label>
                            )
                        },
                        {
                            title: "Компактная 'База'",
                            desc: "Автоматически сворачивать списки кампаний и отправителей при открытии диалога.",
                            action: (
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.autoCollapseColumns} 
                                        onChange={toggleAutoCollapse}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-12 h-7 bg-subpanel peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 border border-border-main"></div>
                                </label>
                            )
                        },
                        {
                            title: "Компактные 'Шаблоны'",
                            desc: "Сворачивать колонки навигации при редактировании текста шаблона.",
                            action: (
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.autoCollapseTemplates} 
                                        onChange={toggleAutoCollapseTemplates}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-12 h-7 bg-subpanel peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 border border-border-main"></div>
                                </label>
                            )
                        }
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-xl hover:bg-subpanel/30 transition-colors border border-transparent hover:border-border-main">
                            <div>
                                <div className="font-bold text-base text-text-main">{item.title}</div>
                                <div className="text-sm text-text-muted mt-1 max-w-md leading-relaxed opacity-80">
                                    {item.desc}
                                </div>
                            </div>
                            <div className="ml-4">
                                {item.action}
                            </div>
                        </div>
                    ))}
                </div>

                {/* SECTION: BACKUPS */}
                <div className="bg-panel rounded-2xl p-8 border border-border-main shadow-sm flex flex-col gap-6 mb-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-green-500 flex items-center gap-2">
                            <DatabaseIcon className="w-5 h-5" /> Резервные копии
                        </h3>
                        <button 
                            onClick={handleCreateBackup}
                            disabled={isCreatingBackup}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition shadow flex items-center gap-2 disabled:opacity-50"
                        >
                            {isCreatingBackup ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <FolderIcon className="w-4 h-4"/>}
                            {isCreatingBackup ? 'Создание...' : 'Создать копию'}
                        </button>
                    </div>
                    
                    <div className="bg-subpanel/30 border border-border-main rounded-xl overflow-hidden">
                        {backups.length === 0 ? (
                            <div className="p-6 text-center text-text-muted text-sm">Нет доступных бэкапов</div>
                        ) : (
                            <div className="divide-y divide-border-main">
                                {backups.map((b, idx) => (
                                    <div key={b.filename} className="p-4 flex items-center justify-between hover:bg-subpanel/50 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-500/10 rounded-lg">
                                                <DatabaseIcon className="w-5 h-5 text-green-500" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-text-main">{idx === 0 ? 'Последняя копия' : `Копия #${backups.length - idx}`}</div>
                                                <div className="text-xs text-text-muted font-mono mt-0.5 flex items-center gap-2">
                                                    <ClockIcon className="w-3 h-3"/> {formatDate(b.created_at)} 
                                                    <span className="opacity-50">|</span> 
                                                    {formatBytes(b.size)}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRestoreBackup(b.filename)}
                                            disabled={isRestoring}
                                            className="px-3 py-1.5 bg-subpanel hover:bg-red-500 hover:text-white border border-border-main hover:border-red-600 rounded text-xs font-bold text-text-muted transition"
                                        >
                                            {isRestoring ? 'Wait...' : 'Восстановить'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-text-muted opacity-70">
                        * Бэкап создается автоматически при каждом запуске сервера. Хранится 5 последних копий.
                    </div>
                </div>

                {/* SECTION: SERVICE */}
                <div className="bg-panel rounded-2xl p-8 border border-border-main shadow-sm flex flex-col gap-6">
                    <h3 className="text-xl font-bold text-orange-500 flex items-center gap-2">
                        <RefreshIcon className="w-5 h-5" /> Обслуживание базы
                    </h3>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                        <div>
                            <div className="font-bold text-base text-text-main">Восстановление CRM</div>
                            <div className="text-sm text-text-muted mt-1 max-w-md leading-relaxed">
                                Если клиенты пропали из списка, но переписка осталась — эта кнопка вернет их в базу.
                            </div>
                        </div>
                        <button 
                            onClick={handleRepairCrm}
                            disabled={isRepairing}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {isRepairing ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <RefreshIcon className="w-4 h-4" />}
                            {isRepairing ? 'Сканирование...' : 'Восстановить'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
