
import React, { useRef, useState } from 'react';
import { ChatMessage, Attachment } from '../types';
import { DocumentIcon } from './icons';
import { formatDate } from './utils';

interface ChatMessageBubbleProps {
    message: ChatMessage;
    prevMessage?: ChatMessage;
    isMe: boolean;
    chatLayout: string;
    senderAvatar?: string;
}

const AudioMessage: React.FC<{ url?: string; duration?: number; waveform?: number[] }> = ({ url, duration, waveform }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [progress, setProgress] = useState(0);

    const togglePlay = () => {
        if (!audioRef.current || !url) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
    };

    return (
        <div className="flex items-center gap-3 bg-black/10 p-2 rounded-lg min-w-[200px]">
            <audio ref={audioRef} src={url} onTimeUpdate={handleTimeUpdate} onEnded={() => { setIsPlaying(false); setProgress(0); }} />
            <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0 font-bold">
                {isPlaying ? '⏸' : '▶'}
            </button>
            <div className="flex-1 flex flex-col justify-center gap-1">
                <div className="h-1 bg-gray-400/30 rounded-full w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="text-[9px] font-mono opacity-70 flex justify-between">
                    <span>{isPlaying && audioRef.current ? Math.floor(audioRef.current.currentTime) : '0'}s</span>
                    <span>{duration ? Math.floor(duration) : '0'}s</span>
                </div>
            </div>
        </div>
    );
};

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, prevMessage, isMe, chatLayout, senderAvatar }) => {
    const isSequence = prevMessage && prevMessage.sender === message.sender && (message.date - prevMessage.date < 60);
    const alignClass = chatLayout === 'linear' ? 'justify-start' : (isMe ? 'justify-end' : 'justify-start');
    const showAvatar = chatLayout === 'alternating' && !isMe; 

    let bubbleClass = '';
    if (chatLayout === 'linear') {
        bubbleClass = isMe ? 'bg-vk-blue text-white border-none rounded-2xl rounded-tl-none' : 'bg-panel text-text-main border border-border-main rounded-2xl rounded-tl-none';
    } else {
        bubbleClass = isMe ? 'bg-vk-blue text-white border-none rounded-2xl rounded-tr-sm shadow-md shadow-vk-blue/10' : 'bg-panel text-text-main border border-border-main rounded-2xl rounded-tl-sm shadow-sm';
    }

    const renderAttachments = (attachments?: Attachment[]) => {
        if (!attachments || attachments.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-2 mt-2 select-none">
                {attachments.map((att, idx) => {
                    const hasUrl = att.url && att.url.length > 0;
                    if (att.type === 'audio_message') return <AudioMessage key={idx} url={att.url} duration={att.duration} waveform={att.waveform} />;
                    if (att.type === 'video_message') return (<div key={idx} className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-white/20"><video src={att.url} className="w-full h-full object-cover" poster={att.thumb} autoPlay loop muted playsInline /></div>);
                    if (att.type === 'photo' && hasUrl) return (<img key={idx} src={att.thumb || att.url} alt="att" className="max-w-[240px] max-h-[240px] rounded-lg border border-border-main cursor-pointer object-cover" onClick={() => window.open(att.url, '_blank')} />);
                    if (att.type === 'doc') return (<a key={idx} href={hasUrl ? att.url : '#'} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white/10 p-2 rounded-lg border border-white/20 text-sm max-w-full"><DocumentIcon className="w-5 h-5" /><div className="truncate">{att.title || 'Документ'}</div></a>);
                    return null;
                })}
            </div>
        );
    };

    const shouldShowText = (text: string, attachments?: any[]) => {
        if (!text) return false;
        const hasAttachments = attachments && attachments.length > 0;
        // Simple heuristic to hide "[Photo]" style placeholders if attachments exist
        if (hasAttachments && /^\[[a-zA-Z]+(?:, [a-zA-Z]+)*\]$/.test(text)) return false;
        return true;
    };

    return (
        <div className={`flex gap-3 ${alignClass} ${isSequence ? 'mt-1' : 'mt-4'} group`}>
            {showAvatar && (
                <div className={`w-8 flex-shrink-0 flex flex-col justify-end ${isSequence ? 'invisible' : ''}`}>
                    <img src={senderAvatar || 'https://vk.com/images/camera_200.png'} className="w-8 h-8 rounded-full bg-subpanel" alt=""/>
                </div>
            )}
            <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm relative transition-all ${bubbleClass} select-text`}>
                {chatLayout === 'linear' && isMe && !isSequence && (
                    <div className="text-xs font-bold opacity-100 mb-1 drop-shadow-md select-none">Вы</div>
                )}
                {shouldShowText(message.text, message.attachments) && (
                    <div className="whitespace-pre-wrap break-words leading-relaxed select-text cursor-text">
                        {message.text}
                    </div>
                )}
                {renderAttachments(message.attachments)}
                <div className={`text-xs mt-1 text-right font-bold opacity-100 select-none drop-shadow-sm`}>{formatDate(message.date)}</div>
            </div>
        </div>
    );
};
