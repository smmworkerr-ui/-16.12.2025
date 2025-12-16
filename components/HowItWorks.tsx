
import React from 'react';
import { RomanOneIcon, XIcon, MegaphoneIcon, RobotIcon, UserGroupIcon, ChartBarIcon, HeartIcon, GearIcon } from './icons';

interface HowItWorksProps {
    onClose: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-panel w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl border border-border-main flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-border-main flex justify-between items-center bg-subpanel/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-vk-blue to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <RomanOneIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-text-main">Справка VK Messenger AI</h2>
                            <p className="text-xs text-text-muted">Руководство по использованию системы</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-hover text-text-muted hover:text-text-main transition">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
                    
                    {/* Section 1: Intro */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-vk-blue uppercase tracking-wide">🚀 Быстрый старт</h3>
                        <p className="text-sm text-text-main leading-relaxed bg-subpanel/50 p-4 rounded-xl border border-border-main">
                            Это приложение позволяет автоматизировать общение ВКонтакте. Вы можете управлять множеством аккаунтов, 
                            создавать умные рассылки с вариативными шаблонами и вести клиентов через CRM-воронку.
                        </p>
                    </div>

                    {/* Section 2: Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-panel border border-border-main rounded-xl p-5 hover:border-vk-blue/30 transition-colors">
                            <div className="flex items-center gap-2 mb-3 text-green-500">
                                <MegaphoneIcon className="w-5 h-5" />
                                <h4 className="font-bold">Рассылка (Запуск)</h4>
                            </div>
                            <ul className="text-xs text-text-muted space-y-2 list-disc pl-4">
                                <li><b>Конструктор:</b> Собирайте сообщения из блоков (Приветствие + Суть + Оффер).</li>
                                <li><b>Inline-редактор:</b> Нажмите на шестеренку в конструкторе, чтобы добавить варианты текста через <code>///</code>.</li>
                                <li><b>Фильтры:</b> Включите "Не писать, если есть диалог", чтобы не спамить тем, с кем уже общались.</li>
                                <li><b>Правая колонка:</b> Здесь находится "Технический пульт" с настройками задержек и монитор логов.</li>
                            </ul>
                        </div>

                        <div className="bg-panel border border-border-main rounded-xl p-5 hover:border-blue-500/30 transition-colors">
                            <div className="flex items-center gap-2 mb-3 text-blue-500">
                                <RobotIcon className="w-5 h-5" />
                                <h4 className="font-bold">База Диалогов</h4>
                            </div>
                            <ul className="text-xs text-text-muted space-y-2 list-disc pl-4">
                                <li><b>Чаты:</b> Все диалоги со всех аккаунтов в одном окне.</li>
                                <li><b>Кампании:</b> Диалоги автоматически группируются по названию кампании.</li>
                                <li><b>Быстрые ответы:</b> Используйте шаблоны прямо в чате.</li>
                                <li><b>CRM:</b> Меняйте статус клиента (Лид, Клиент, Отказ) через контекстное меню (ПКМ по чату).</li>
                            </ul>
                        </div>

                        <div className="bg-panel border border-border-main rounded-xl p-5 hover:border-indigo-500/30 transition-colors">
                            <div className="flex items-center gap-2 mb-3 text-indigo-500">
                                <UserGroupIcon className="w-5 h-5" />
                                <h4 className="font-bold">CRM & Клиенты</h4>
                            </div>
                            <ul className="text-xs text-text-muted space-y-2 list-disc pl-4">
                                <li><b>Канбан:</b> Перетаскивайте карточки клиентов между этапами воронки.</li>
                                <li><b>Карточка клиента:</b> Кликните на имя в логах или в списке, чтобы открыть досье с заметками и тегами.</li>
                                <li><b>Экспорт:</b> Выгружайте базу в CSV/JSON.</li>
                            </ul>
                        </div>

                        <div className="bg-panel border border-border-main rounded-xl p-5 hover:border-pink-500/30 transition-colors">
                            <div className="flex items-center gap-2 mb-3 text-pink-500">
                                <ChartBarIcon className="w-5 h-5" />
                                <h4 className="font-bold">Аналитика</h4>
                            </div>
                            <ul className="text-xs text-text-muted space-y-2 list-disc pl-4">
                                <li><b>Дашборд:</b> Следите за отправленными сообщениями и конверсией.</li>
                                <li><b>Пульс аккаунтов:</b> Реальные данные из ВК о количестве друзей и входящих заявок.</li>
                                <li><b>Тепловая карта:</b> Узнайте, в какое время вам чаще всего отвечают.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 3: FAQ */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-vk-blue uppercase tracking-wide">❓ Частые вопросы</h3>
                        
                        <div className="space-y-3">
                            <details className="bg-subpanel/30 rounded-lg border border-border-main open:bg-subpanel/50 transition">
                                <summary className="p-4 cursor-pointer text-sm font-bold flex items-center gap-2 select-none">
                                    Как работает Авто-Секретарь?
                                </summary>
                                <div className="px-4 pb-4 text-xs text-text-muted leading-relaxed">
                                    Авто-секретарь — это фоновый процесс. Включить его можно в <b>Карточке Аккаунта</b> (вкладка Аккаунты -> клик по аккаунту). 
                                    Он автоматически принимает заявки в друзья и отправляет приветственное сообщение (с задержкой).
                                </div>
                            </details>

                            <details className="bg-subpanel/30 rounded-lg border border-border-main open:bg-subpanel/50 transition group" open>
                                <summary className="p-4 cursor-pointer text-sm font-bold flex items-center gap-2 select-none text-green-500">
                                    <HeartIcon className="w-4 h-4" />
                                    Как работает "Здоровье" (Token Health) и Адаптивная скорость?
                                </summary>
                                <div className="px-4 pb-4 text-xs text-text-muted leading-relaxed space-y-3">
                                    <p>В системе работает защита аккаунтов. У каждого токена есть шкала HP (0-100%).</p>
                                    <ul className="space-y-2 bg-main/50 p-3 rounded-lg border border-border-main">
                                        <li className="flex gap-2">
                                            <span className="font-bold text-red-400 min-w-[100px]">Урон:</span>
                                            <span>Отправка сообщения (-1 HP), ошибка API (-5 HP), капча (-30 HP).</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="font-bold text-green-400 min-w-[100px]">Лечение:</span>
                                            <span>Автоматически +5 HP за каждый час простоя.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="font-bold text-vk-blue min-w-[100px]">Режимы:</span>
                                            <div className="space-y-1">
                                                <div><b>🤖 АВТО:</b> Система сама увеличивает задержку, если здоровье аккаунта падает. Это безопасный режим.</div>
                                                <div><b>🛠️ ВРУЧНУЮ:</b> Вы задаете жесткие рамки (например, 5-10 сек). Система будет соблюдать их, игнорируя "усталость" аккаунта. Ответственность за баны лежит на вас.</div>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </details>

                            <details className="bg-subpanel/30 rounded-lg border border-border-main open:bg-subpanel/50 transition">
                                <summary className="p-4 cursor-pointer text-sm font-bold flex items-center gap-2 select-none">
                                    Как использовать Spintax (Рандомизацию)?
                                </summary>
                                <div className="px-4 pb-4 text-xs text-text-muted leading-relaxed">
                                    Используйте фигурные скобки и разделители. Поддерживаются оба формата:<br/>
                                    1. <code>&#123;Привет|Здравствуй&#125;</code> (Вертикальная черта)<br/>
                                    2. <code>&#123;Привет/Здравствуй&#125;</code> (Косая черта)<br/>
                                    В Inline-редакторе (шестеренка в конструкторе) используйте разделитель <code>///</code> для целых блоков текста.
                                </div>
                            </details>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
