
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { User, CoachMessage, Player } from '../types';
import { Send, User as UserIcon, Clock, ChevronLeft, ShieldCheck, MessageSquare } from 'lucide-react';

interface CoachMessageManagerProps {
    currentUser: User;
}

export const CoachMessageManager: React.FC<CoachMessageManagerProps> = ({ currentUser }) => {
    const [messages, setMessages] = useState<CoachMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [coach, setCoach] = useState<User | null>(null);
    const [player, setPlayer] = useState<Player | null>(null);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const refreshData = () => {
            const allPlayers = StorageService.getPlayers();
            const p = allPlayers.find(pl => pl.id === currentUser.linkedPlayerId);
            setPlayer(p || null);

            if (p) {
                // Find coach assigned to this player's venue/batch or a default coach
                const allUsers = StorageService.getUsers();
                const academyCoaches = allUsers.filter(u => u.role === 'coach');
                
                // Try to find a coach assigned to the player's venue
                const assignedCoach = academyCoaches.find(u => u.assignedVenues?.includes(p.venue || '')) || academyCoaches[0];
                setCoach(assignedCoach || null);

                const allMessages = StorageService.getCoachMessages();
                const myMessages = allMessages.filter(m => 
                    m.playerId === p.id && (assignedCoach ? m.coachId === assignedCoach.id : true)
                ).sort((a, b) => a.timestamp - b.timestamp);
                
                setMessages(myMessages);
            }
        };

        refreshData();
        window.addEventListener('academy_data_update', refreshData);
        return () => window.removeEventListener('academy_data_update', refreshData);
    }, [currentUser]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !player || !coach || isSending) return;

        setIsSending(true);
        try {
            await StorageService.sendCoachMessage({
                playerId: player.id,
                coachId: coach.id,
                sender: 'player',
                text: newMessage.trim()
            });
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };

    if (!player) {
        return (
            <div className="p-8 text-center">
                <p className="text-white/40 italic uppercase tracking-widest text-[10px]">Synchronizing Player Data...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] bg-brand-950/20 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-hidden">
            {/* Chat Header */}
            <div className="p-6 md:p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                        <UserIcon className="text-brand-primary" size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white italic uppercase tracking-tight leading-none">
                            {coach?.fullName || 'Academy Coach'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">Direct Channel // Secure</span>
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                    <ShieldCheck size={14} className="text-brand-accent" />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">Official Communication</span>
                </div>
            </div>

            {/* Message Area */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 no-scrollbar"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <MessageSquare size={64} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Start the conversation</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex ${msg.sender === 'player' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[80%] md:max-w-[60%] space-y-2`}>
                                <div className={`p-4 md:p-6 rounded-[1.5rem] ${
                                    msg.sender === 'player' 
                                        ? 'bg-brand-primary text-brand-950 rounded-tr-none' 
                                        : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
                                } shadow-xl`}>
                                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                </div>
                                <div className={`flex items-center gap-2 px-2 ${msg.sender === 'player' ? 'justify-end' : 'justify-start'}`}>
                                    <Clock size={10} className="text-white/20" />
                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <form 
                onSubmit={handleSendMessage}
                className="p-6 md:p-8 bg-white/5 border-t border-white/5"
            >
                <div className="relative flex items-center">
                    <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="TYPE YOUR MESSAGE HERE..."
                        className="w-full bg-brand-950/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-black uppercase tracking-widest italic focus:outline-none focus:border-brand-primary transition-all pr-16"
                    />
                    <button 
                        type="submit"
                        disabled={!newMessage.trim() || isSending}
                        className="absolute right-2 w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center text-brand-950 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <p className="mt-4 text-center text-[8px] font-black text-white/20 uppercase tracking-[0.3em] italic">
                    All messages are monitored for quality and safety by the Academy Hub
                </p>
            </form>
        </div>
    );
};
