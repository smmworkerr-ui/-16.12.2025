
import React from 'react';
import { MegaphoneIcon, RobotIcon, TemplateIcon, UsersIcon, GearIcon, LogsIcon, RomanOneIcon, ChartBarIcon, UserGroupIcon } from './icons';

interface WelcomeTabProps {
    onNavigate: (mode: 'campaign' | 'database' | 'templates' | 'accounts' | 'settings' | 'logs' | 'recipients' | 'analytics') => void;
}

export const WelcomeTab: React.FC<WelcomeTabProps> = ({ onNavigate }) => {
    
    const cards = [
        {
            id: 'campaign',
            title: 'Запуск рассылки',
            desc: 'Создание кампаний, настройка аудитории и массовая отправка.',
            icon: MegaphoneIcon,
            color: 'text-green-500',
            bg: 'bg-green-500/10 border-green-500/20'
        },
        {
            id: 'database',
            title: 'База диалогов',
            desc: 'Активные чаты, быстрые ответы и сортировка сообщений.',
            icon: RobotIcon,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10 border-blue-500/20'
        },
        {
            id: 'recipients',
            title: 'CRM Клиенты',
            desc: 'Канбан-доска, воронка продаж и карточки клиентов.',
            icon: UserGroupIcon,
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10 border-indigo-500/20'
        },
        {
            id: 'analytics',
            title: 'Аналитика',
            desc: 'Дашборд эффективности, статистика ошибок и отчеты.',
            icon: ChartBarIcon,
            color: 'text-pink-500',
            bg: 'bg-pink-500/10 border-pink-500/20'
        },
        {
            id: 'templates',
            title: 'Шаблоны',
            desc: 'Конструктор сообщений, спинтакс и управление текстами.',
            icon: TemplateIcon,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10 border-purple-500/20'
        },
        {
            id: 'accounts',
            title: 'Аккаунты',
            desc: 'Управление токенами, проверка статусов и ротация.',
            icon: UsersIcon,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10 border-orange-500/20'
        }
    ];

    return (
        <div className="w-full h-full bg-main text-text-main overflow-y-auto custom-scrollbar flex flex-col items-center justify-center p-8 animate-fade-in">
            <div className="max-w-6xl w-full">
                {/* Hero Section */}
                <div className="text-center mb-12 space-y-4">
                    <div className="inline-block p-4 rounded-2xl bg-panel border border-border-main shadow-2xl mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-vk-blue to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <RomanOneIcon className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-2">
                        VK Messenger <span className="text-transparent bg-clip-text bg-gradient-to-r from-vk-blue to-purple-500">AI</span>
                    </h1>
                    <p className="text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
                        Мощная система для автоматизации коммуникации ВКонтакте. 
                        Управляйте диалогами, ведите клиентов по воронке и анализируйте результаты.
                    </p>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {cards.map((card) => (
                        <button
                            key={card.id}
                            onClick={() => onNavigate(card.id as any)}
                            className="group relative overflow-hidden bg-panel border border-border-main p-6 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-vk-blue/30 flex flex-col h-full"
                        >
                            <div className={`absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 group-hover:scale-125 duration-500 ${card.color}`}>
                                <card.icon className="w-32 h-32" />
                            </div>
                            
                            <div className="relative z-10 flex items-start gap-4 mb-4">
                                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                                    <card.icon className="w-8 h-8" />
                                </div>
                            </div>
                            
                            <div className="relative z-10 mt-auto">
                                <h3 className="text-xl font-bold text-text-main mb-2 group-hover:text-vk-blue transition-colors">
                                    {card.title}
                                </h3>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    {card.desc}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer Links */}
                <div className="flex justify-center gap-4 text-sm font-medium">
                    <button 
                        onClick={() => onNavigate('logs')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-subpanel text-text-muted hover:text-text-main hover:bg-hover transition border border-transparent hover:border-border-main"
                    >
                        <LogsIcon className="w-4 h-4" />
                        Системные логи
                    </button>
                    <button 
                        onClick={() => onNavigate('settings')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-subpanel text-text-muted hover:text-text-main hover:bg-hover transition border border-transparent hover:border-border-main"
                    >
                        <GearIcon className="w-4 h-4" />
                        Настройки
                    </button>
                </div>
                
                <div className="mt-12 text-center opacity-50 hover:opacity-100 transition-opacity">
                    <span className="px-3 py-1 bg-panel border border-border-main rounded-full text-[10px] text-text-muted uppercase tracking-widest font-bold">
                        v 1.2.0 Beta (CRM + Analytics)
                    </span>
                </div>
            </div>
        </div>
    );
};
