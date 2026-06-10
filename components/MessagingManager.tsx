
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { BroadcastMessage, Role, Venue, Batch, MessageType } from '../types';
import { Send, Users, MapPin, Layers, Clock, CheckCircle2, AlertCircle, X, Search, Filter, Mail, MessageSquare, Bell, Sparkles, Zap, ShieldCheck, Plus } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';

const QUICK_TEMPLATES = {
    rainout: {
        title: '⚽ RAINOUT NOTICE: SESSIONS CANCELLED',
        content: 'Due to heavy rain and unplayable pitch conditions, all coaching sessions for today are CANCELLED. Stay safe and we will see you at the next scheduled session!'
    },
    schedule: {
        title: '📅 SCHEDULE UPDATE: VENUE CHANGE',
        content: 'Please note that the upcoming session has been moved to [New Venue] at [New Time]. Please adjust your travel plans accordingly. See you on the pitch!'
    },
    fees: {
        title: '💳 PAYMENT REMINDER: MONTHLY FEES',
        content: 'A friendly reminder that monthly academy fees for [Month] are now due. Please ensure payment is completed by [Date] to maintain active enrollment. Thank you!'
    }
};

export const MessagingManager: React.FC = () => {
    const [messages, setMessages] = useState<BroadcastMessage[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [sendingProgress, setSendingProgress] = useState(0);
    const [showCompose, setShowCompose] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [newMessage, setNewMessage] = useState({
        title: '',
        content: '',
        type: 'push' as MessageType,
        targetAudience: 'all' as 'all' | 'venue' | 'batch',
        targetId: ''
    });

    const currentUser = StorageService.getCurrentUser();

    useEffect(() => {
        setMessages(StorageService.getMessages());
        setVenues(StorageService.getVenues());
        setBatches(StorageService.getBatches());

        const handleUpdate = () => {
            setMessages(StorageService.getMessages());
        };
        window.addEventListener('academy_data_update', handleUpdate);
        return () => window.removeEventListener('academy_data_update', handleUpdate);
    }, []);

    const applyTemplate = (key: keyof typeof QUICK_TEMPLATES) => {
        const template = QUICK_TEMPLATES[key];
        setNewMessage(prev => ({
            ...prev,
            title: template.title,
            content: template.content,
            type: key === 'fees' ? 'email' : 'push'
        }));
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsSending(true);
        setSendingProgress(0);

        // Simulate bulk sending progress
        const duration = 2000;
        const interval = 50;
        const steps = duration / interval;
        let currentStep = 0;

        const progressInterval = setInterval(() => {
            currentStep++;
            setSendingProgress(Math.min(95, Math.floor((currentStep / steps) * 100)));
        }, interval);

        try {
            await new Promise(resolve => setTimeout(resolve, duration));
            
            await StorageService.sendBroadcast({
                senderId: currentUser.id,
                senderName: currentUser.fullName || currentUser.username,
                title: newMessage.title,
                content: newMessage.content,
                type: newMessage.type,
                targetAudience: newMessage.targetAudience,
                targetId: newMessage.targetId || undefined
            });
            
            clearInterval(progressInterval);
            setSendingProgress(100);
            
            setTimeout(() => {
                setShowCompose(false);
                setIsSending(false);
                setSendingProgress(0);
                setNewMessage({
                    title: '',
                    content: '',
                    type: 'push',
                    targetAudience: 'all',
                    targetId: ''
                });
            }, 500);
        } catch (error) {
            clearInterval(progressInterval);
            setIsSending(false);
            setSendingProgress(0);
            console.error("Failed to send broadcast", error);
            alert("Error sending message. Please try again.");
        }
    };

    const getTargetLabel = (msg: BroadcastMessage) => {
        if (msg.targetAudience === 'all') return 'All Athletes';
        if (msg.targetAudience === 'venue') {
            const v = venues.find(venue => venue.id === msg.targetId);
            return v ? `Venue: ${v.name}` : 'Unknown Venue';
        }
        if (msg.targetAudience === 'batch') {
            const b = batches.find(batch => batch.id === msg.targetId);
            return b ? `Batch: ${b.name}` : 'Unknown Batch';
        }
        return 'Broadcast';
    };

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700">
            <PageHeader 
                title="BROADCAST CENTER"
                subtitle="Send announcements and alerts to rosters and coaches."
                extra={
                    <button 
                        onClick={() => setShowCompose(true)}
                        className="bg-brand-accent text-brand-secondary px-8 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest italic flex items-center gap-3 group/btn"
                    >
                        <Plus size={16} className="group-hover/btn:rotate-90 transition-transform" />
                        NEW_BROADCAST
                    </button>
                }
            />

            {/* Tactical Search & Filter Row */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500/40 group-focus-within:text-brand-accent transition-colors" />
                    <input 
                        type="text" 
                        placeholder="SCAN TRANSMISSION LOGS..." 
                        className="w-full pl-14 pr-6 py-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl outline-none focus:bg-brand-500/10 focus:border-brand-accent/30 transition-all text-[10px] font-black uppercase tracking-[0.2em] text-white placeholder:text-white/20 shadow-2xl italic"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/5 border border-brand-500/10">
                    <Zap size={12} className="text-brand-accent" />
                    <span className="text-[9px] font-black text-brand-500/60 uppercase tracking-widest italic">Messaging Ready</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-[1600px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Statistics / Sidebar */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-accent/50 via-brand-accent to-brand-accent/50" />
                        <h3 className="text-[10px] font-black text-brand-accent uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                             <ShieldCheck size={12} /> ANNOUNCEMENT STATS
                        </h3>
                        
                        <div className="space-y-6">
                            {[
                                { label: 'Active Streams', value: messages.length, icon: CheckCircle2, color: 'text-brand-accent' },
                                { label: 'Queue Depth', value: '0', icon: Clock, color: 'text-white/20' },
                                { label: 'Service Status', value: '100%', icon: Zap, color: 'text-[#CCFF00]' }
                            ].map((stat, i) => (
                                <div key={i} className="group p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-accent/20 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{stat.label}</span>
                                            <span className="text-3xl font-black text-white italic tracking-tighter group-hover:text-brand-accent transition-colors font-mono" style={{ fontFamily: 'Orbitron' }}>{stat.value}</span>
                                        </div>
                                        <stat.icon className={stat.color} size={24} strokeWidth={2.5} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-xl">
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-6">Stream Filters</h3>
                        <div className="space-y-2">
                             {[
                                { label: 'All History', icon: Layers },
                                { label: 'Push Direct', icon: Bell },
                                { label: 'Email Batch', icon: Mail },
                                { label: 'SMS Stream', icon: MessageSquare }
                             ].map((f, i) => (
                                 <button key={i} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${i === 0 ? 'bg-brand-accent text-brand-secondary border-brand-accent shadow-lg shadow-brand-accent/20' : 'text-white/40 hover:bg-white/5 border-transparent hover:border-white/10'}`}>
                                     <f.icon size={14} />
                                     {f.label}
                                 </button>
                             ))}
                        </div>
                    </div>
                </div>

                {/* History List */}
                <div className="lg:col-span-9 space-y-8">
                    <div className="flex items-center justify-between mb-2">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Transmission <span className="text-brand-accent">Logs</span></h3>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Reviewing global academy communications</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 flex items-center gap-3">
                                <Filter size={14} className="text-brand-accent" />
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Sort: Latest First</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {messages.length === 0 ? (
                            <div className="py-32 text-center bg-white/5 rounded-[3rem] border-4 border-dashed border-white/10 flex flex-col items-center">
                                <Search size={64} className="text-white/10 mb-6" />
                                <p className="text-[12px] font-black text-white/20 uppercase tracking-widest italic">No Transmission Logs Found</p>
                            </div>
                        ) : (
                            messages
                                .filter(msg => 
                                    msg.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    msg.content.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                .map(msg => (
                                <div key={msg.id} className="group glass-card p-8 rounded-[2.5rem] border border-white/10 hover:scale-[1.01] transition-all relative overflow-hidden shadow-xl">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.15] transition-all transform group-hover:scale-125 group-hover:rotate-12 pointer-events-none">
                                        {msg.type === 'email' ? <Mail size={120} className="text-white" /> : msg.type === 'sms' ? <MessageSquare size={120} className="text-white" /> : <Bell size={120} className="text-white" />}
                                    </div>

                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                                            <div className="space-y-6 flex-1">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic flex items-center gap-2 border bg-white/10 text-white border-white/20`}>
                                                        {msg.type === 'email' ? <Mail size={12} /> : msg.type === 'sms' ? <MessageSquare size={12} /> : <Bell size={12} />}
                                                        {msg.type}
                                                    </span>
                                                    <span className="px-4 py-1.5 bg-white text-brand-secondary text-[9px] font-black uppercase tracking-widest italic rounded-full shadow-lg">
                                                        {getTargetLabel(msg)}
                                                    </span>
                                                    <div className="hidden sm:block h-1 w-1 rounded-full bg-white/20" />
                                                    <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest italic">
                                                        {new Date(msg.timestamp).toLocaleString()}
                                                    </span>
                                                </div>

                                            <div className="space-y-3">
                                                <h4 className="text-2xl font-black text-white italic uppercase tracking-tight">
                                                    {msg.title}
                                                </h4>
                                                <div className="p-6 bg-white/5 border-l-4 border-white/30 rounded-2xl italic font-medium text-white/90 text-[13px] leading-relaxed shadow-inner">
                                                    {msg.content}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex md:flex-col items-center md:items-end gap-4 shrink-0">
                                            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-2xl border border-white/20">
                                                <CheckCircle2 size={14} />
                                                <span className="text-[9px] font-black uppercase tracking-widest italic">Transmission_Success</span>
                                            </div>
                                            <button 
                                                onClick={() => StorageService.deleteMessage(msg.id)}
                                                className="p-4 bg-white/10 text-white/40 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-white/10"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Compose Modal - High Contrast Midnight */}
            {showCompose && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-3xl animate-in fade-in duration-300">
                    <div className="glass-card rounded-t-[3rem] sm:rounded-[3rem] shadow-3xl w-full max-w-4xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-500 border border-white/20 flex flex-col max-h-[95vh] sm:max-h-[85vh] relative">
                        <div className="absolute inset-0 bg-brand-bg/40 -z-10" />
                        <div className="px-12 py-10 bg-white/5 backdrop-blur-md flex justify-between items-center relative overflow-hidden border-b border-white/10">
                             <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none -mr-10">
                                <Send size={120} className="text-brand-accent" />
                            </div>
                            <div className="space-y-2 relative z-10">
                                <h3 className="font-black text-3xl text-white italic uppercase tracking-tighter">Compose <span className="text-brand-accent">Broadcast</span></h3>
                                <p className="text-[10px] text-brand-accent font-black uppercase tracking-[0.3em] italic">Deploy High-Impact Communication</p>
                            </div>
                            <button onClick={() => !isSending && setShowCompose(false)} className="p-4 hover:bg-white/10 rounded-3xl text-white/20 transition-all"><X size={24} /></button>
                        </div>

                        <div className="px-12 py-6 bg-white/5 border-b border-white/10 flex items-center gap-4 overflow-x-auto no-scrollbar">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic shrink-0">Quick Templates:</span>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => applyTemplate('rainout')} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/60 hover:border-brand-accent transition-all shadow-sm">⚽ Rainout</button>
                                <button type="button" onClick={() => applyTemplate('schedule')} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/60 hover:border-brand-accent transition-all shadow-sm">📅 Schedule</button>
                                <button type="button" onClick={() => applyTemplate('fees')} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/60 hover:border-brand-accent transition-all shadow-sm">💳 Fee Reminder</button>
                            </div>
                        </div>

                        <form onSubmit={handleSend} className="p-12 space-y-10 flex-1 overflow-y-auto bg-black/20 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Target Audience</label>
                                    <div className="relative group">
                                        <select 
                                            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent font-black text-white text-xs uppercase italic tracking-widest appearance-none transition-all"
                                            value={newMessage.targetAudience}
                                            onChange={e => setNewMessage({...newMessage, targetAudience: e.target.value as any, targetId: ''})}
                                        >
                                            <option value="all">Global (All Players)</option>
                                            <option value="venue">Specific Venue</option>
                                            <option value="batch">Specific Batch</option>
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-brand-accent">
                                            <Filter size={14} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Delivery Channel</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'push', icon: Bell, label: 'App Push' },
                                            { id: 'email', icon: Mail, label: 'E-Mail' },
                                            { id: 'sms', icon: MessageSquare, label: 'SMS' }
                                        ].map(chan => (
                                            <button
                                                key={chan.id}
                                                type="button"
                                                onClick={() => setNewMessage({...newMessage, type: chan.id as MessageType})}
                                                className={`py-5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                                    newMessage.type === chan.id 
                                                        ? 'bg-brand-accent border-brand-accent text-brand-secondary shadow-xl shadow-brand-accent/20' 
                                                        : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white'
                                                }`}
                                            >
                                                <chan.icon size={18} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">{chan.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {newMessage.targetAudience !== 'all' && (
                                <div className="space-y-3 animate-in slide-in-from-top duration-500">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Identify Selection</label>
                                    <select 
                                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent font-black text-white text-xs uppercase italic tracking-widest appearance-none transition-all"
                                        value={newMessage.targetId}
                                        onChange={e => setNewMessage({...newMessage, targetId: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Target...</option>
                                        {newMessage.targetAudience === 'venue' ? (
                                            venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                                        ) : (
                                            batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                                        )}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Transmission Subject</label>
                                <input 
                                    className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent font-black text-white transition-all placeholder:text-white/10 uppercase italic text-sm"
                                    placeholder="e.g. URGENT BROADCAST: VENUE_UPDATE"
                                    value={newMessage.title}
                                    onChange={e => setNewMessage({...newMessage, title: e.target.value})}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Log Content</label>
                                <textarea 
                                    className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-accent/10 focus:border-brand-accent font-medium text-white shadow-sm transition-all h-52 placeholder:text-white/10 text-sm leading-relaxed italic"
                                    placeholder="Draft your professional communication dispatch here..."
                                    value={newMessage.content}
                                    onChange={e => setNewMessage({...newMessage, content: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="pt-10 flex flex-col gap-6 border-t border-white/10">
                                {isSending && (
                                    <div className="space-y-3 px-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic text-white/40">
                                            <span>Processing Bulk Transmission...</span>
                                            <span>{sendingProgress}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                                            <div 
                                                className="h-full bg-brand-accent transition-all duration-300 ease-out shadow-[0_0_15px_rgba(204,255,0,0.5)]"
                                                style={{ width: `${sendingProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <button 
                                        type="button" 
                                        disabled={isSending}
                                        onClick={() => setShowCompose(false)} 
                                        className="flex-1 py-5 text-white/40 font-black hover:text-white rounded-3xl transition-all text-xs uppercase tracking-widest italic border border-transparent hover:border-white/10"
                                    >
                                        Discard_Draft
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSending}
                                        className={`flex-[2] py-5 font-black rounded-3xl shadow-2xl transition-all text-xs uppercase tracking-[0.2em] italic flex items-center justify-center gap-4 ${
                                            isSending ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-brand-accent text-brand-secondary hover:scale-[1.02] active:scale-95 shadow-brand-accent/20'
                                        }`}
                                    >
                                        {isSending ? (
                                            <Clock size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Zap size={20} className={newMessage.title ? 'animate-pulse' : ''} />
                                                EXECUTE_BROADCAST
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
