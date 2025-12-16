
import React, { useState, useMemo } from 'react';
import { AppLogEntry } from '../types';
import { LogsIcon, SearchIcon } from './icons';

interface LogsTabProps {
    logs: AppLogEntry[];
}

type LogLevelFilter = 'ALL' | 'INFO' | 'WARNING' | 'ERROR';

export const LogsTab: React.FC<LogsTabProps> = ({ logs }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState<LogLevelFilter>('ALL');

    const filteredLogs = useMemo(() => {
        // 1. Filter
        const filtered = logs.filter(log => {
            const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
            return matchesSearch && matchesLevel;
        });
        
        // 2. Sort Descending (Newest -> Oldest)
        return filtered.sort((a, b) => b.id - a.id);
    }, [logs, searchTerm, levelFilter]);

    const getLevelColor = (level: string) => {
        switch(level) {
            case 'ERROR': return 'text-red-500';
            case 'WARNING': return 'text-yellow-500';
            case 'INFO': return 'text-green-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-main font-mono text-xs relative overflow-hidden">
            
            {/* TERMINAL HEADER (Glassmorphism) */}
            <div className="px-6 py-4 border-b border-border-main bg-panel/80 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-4 z-10 shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg border border-gray-700 shadow-inner">
                        <LogsIcon className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-green-500 text-shadow-sm">System Terminal</h2>
                        <div className="text-[10px] text-text-muted flex gap-2">
                            <span className="opacity-50">STATUS:</span> <span className="text-green-500 font-bold">ONLINE</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* FILTER TABS */}
                    <div className="flex bg-subpanel rounded-lg p-1 border border-border-main">
                        {(['ALL', 'INFO', 'WARNING', 'ERROR'] as LogLevelFilter[]).map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setLevelFilter(lvl)}
                                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${levelFilter === lvl ? 'bg-panel shadow text-text-main' : 'text-text-muted hover:text-text-main'}`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>

                    {/* SEARCH */}
                    <div className="relative flex-1 md:w-64 group">
                        <SearchIcon className="absolute left-3 top-2 w-3.5 h-3.5 text-text-muted group-focus-within:text-vk-blue transition-colors" />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="grep logs..."
                            className="w-full bg-subpanel pl-9 pr-3 py-1.5 rounded-lg border border-border-main focus:border-vk-blue focus:ring-1 focus:ring-vk-blue/50 outline-none transition-all placeholder-text-muted text-text-main"
                        />
                    </div>
                </div>
            </div>

            {/* LOGS CONTENT */}
            {/* FORCE LIGHT TEXT COLORS HERE because bg is hardcoded dark */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1 bg-[#0d1117] text-gray-200 relative">
                {/* Background Grid Line Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                     style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-30 select-none">
                        <div className="text-4xl mb-4 font-bold font-sans">_NO_DATA</div>
                        <p className="font-mono text-sm">Waiting for system events...</p>
                    </div>
                ) : (
                    filteredLogs.map(l => ( 
                        <div key={l.id} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors group">
                            <span className="text-gray-500 shrink-0 opacity-40 select-none w-32 text-right text-[10px] pt-0.5 font-mono">{l.timestamp}</span> 
                            <span className={`font-bold shrink-0 w-16 text-right ${getLevelColor(l.level)}`}>[{l.level}]</span>
                            <span className="opacity-90 break-all whitespace-pre-wrap flex-1 group-hover:text-white transition-colors border-l border-gray-700/50 pl-3">
                                <span className="text-green-500 opacity-50 mr-2">$</span>
                                {l.message}
                            </span>
                        </div>
                    ))
                )}
            </div>
            
            {/* FOOTER STATS */}
            <div className="px-6 py-2 bg-panel border-t border-border-main text-[10px] text-text-muted flex justify-between uppercase tracking-wider font-bold">
                <div>Total Entries: {logs.length}</div>
                <div>Filter Match: {filteredLogs.length}</div>
            </div>
        </div>
    );
};
