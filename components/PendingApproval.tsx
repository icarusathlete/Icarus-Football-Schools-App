import React, { useState } from 'react';
import { Clock, ShieldOff, Trophy, LogOut, ChevronRight, CheckCircle2, Users, Flag, Activity, ArrowLeft, Mail } from 'lucide-react';
import { User } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface PendingApprovalProps {
    user: User;
    onLogout: () => void;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ user, onLogout }) => {
    const [requestedRole, setRequestedRole] = useState<'coach' | 'player' | ''>('');
    const [requestReason, setRequestReason] = useState('');
    const [submitted, setSubmitted] = useState(!!user.requestedRole);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!requestedRole) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, 'users', user.id), {
                requestedRole,
                requestReason: requestReason.trim() || null,
            });
            setSubmitted(true);
        } catch (err) {
            console.error('Failed to submit role request:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isRejected = user.role === 'rejected';

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-display">
            {/* Background layers */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            <div className={`absolute top-0 right-0 -mt-32 -mr-32 w-[700px] h-[700px] rounded-full blur-[180px] animate-pulse-slow ${isRejected ? 'bg-red-500/10' : 'bg-brand-500/10'}`} />
            <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-[500px] h-[500px] bg-[#CCFF00]/5 rounded-full blur-[140px]" />

            <div className="glass-card max-w-lg w-full p-1 relative overflow-hidden border-white/10 shadow-2xl ring-1 ring-white/5">
                <div className={`p-10 md:p-12 text-center space-y-10 relative z-10 ${isRejected ? 'bg-red-950/20' : 'bg-white/[0.02]'}`}>
                    
                    {/* Header Icon */}
                    <div className="flex flex-col items-center">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center relative shadow-lg ring-1 transition-all ${
                            isRejected ? 'bg-red-500/10 ring-red-500/20' : 'bg-white/5 ring-white/10'
                        }`}>
                            {!isRejected && submitted && <div className="absolute inset-0 border-2 border-[#CCFF00]/20 border-t-[#CCFF00] rounded-full animate-spin" />}
                            {isRejected ? (
                                <ShieldOff className="text-red-500" size={40} />
                            ) : (
                                <Activity className="text-[#CCFF00]" size={40} />
                            )}
                        </div>
                    </div>

                    {/* Content Section */}
                    {isRejected ? (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <span className="text-[9px] font-black tracking-[0.25em] text-red-500 uppercase">Access Denied</span>
                                </div>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-tight mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                    ACCESS <span className="text-red-500">BLOCKED</span>
                                </h2>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.15em] leading-relaxed max-w-[280px] mx-auto">
                                    Your access request was not approved. Please contact the academy admin directly for more information.
                                </p>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">
                                    Contact: negidevender19@gmail.com
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {submitted ? (
                                <div className="space-y-6 animate-fade-in">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/20 mb-6">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse shadow-[0_0_10px_rgba(204,255,0,0.8)]" />
                                            <span className="text-[9px] font-black tracking-[0.25em] text-[#CCFF00] uppercase">Awaiting Review</span>
                                        </div>
                                        <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-tight mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                            ATHLETE <span className="text-[#CCFF00]">PENDING</span>
                                        </h2>
                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.15em] leading-relaxed max-w-[280px] mx-auto">
                                            Your profile is currently undergoing profile verification. Access will be granted upon academy director approval.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 pt-2">
                                        <div className="flex items-center gap-5 p-5 glass-card border-white/5 bg-white/[0.02] text-left group">
                                            <div className="p-3 bg-white/5 rounded-lg text-white/30 group-hover:bg-[#CCFF00]/10 group-hover:text-[#CCFF00] transition-colors">
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-white uppercase tracking-widest mb-1">Status</p>
                                                <p className="text-sm font-bold text-white/60 tracking-tight">Awaiting admin approval</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-5 p-5 glass-card border-white/5 bg-white/[0.02] text-left group">
                                            <div className="p-3 bg-white/5 rounded-lg text-white/30 group-hover:bg-[#CCFF00]/10 group-hover:text-[#CCFF00] transition-colors">
                                                <Mail size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-white uppercase tracking-widest mb-1">Requested as</p>
                                                <p className="text-sm font-bold text-white/60 tracking-tight uppercase">{user.requestedRole || requestedRole}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-fade-in text-left">
                                    <div className="text-center">
                                        <h2 className="text-4xl font-black text-white uppercase tracking-tight leading-tight mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                            REQUEST <span className="text-[#CCFF00]">ACCESS</span>
                                        </h2>
                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.15em] leading-relaxed">
                                            Select your role to complete setup.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setRequestedRole('coach')}
                                            className={`p-6 glass-card border-white/10 flex flex-col items-center gap-3 transition-all text-center relative overflow-hidden active:scale-[0.98] ${
                                                requestedRole === 'coach' ? 'ring-2 ring-[#CCFF00]/40 bg-white/10' : 'bg-white/5 hover:bg-white/10'
                                            }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                                                requestedRole === 'coach' ? 'bg-[#CCFF00] text-brand-950' : 'bg-white/5 text-white/30'
                                            }`}>
                                                <Flag size={24} />
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${requestedRole === 'coach' ? 'text-[#CCFF00]' : 'text-white'}`}>Coach</span>
                                        </button>
                                        <button
                                            onClick={() => setRequestedRole('player')}
                                            className={`p-6 glass-card border-white/10 flex flex-col items-center gap-3 transition-all text-center relative overflow-hidden active:scale-[0.98] ${
                                                requestedRole === 'player' ? 'ring-2 ring-[#CCFF00]/40 bg-white/10' : 'bg-white/5 hover:bg-white/10'
                                            }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                                                requestedRole === 'player' ? 'bg-[#CCFF00] text-brand-950' : 'bg-white/5 text-white/30'
                                            }`}>
                                                <Users size={24} />
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${requestedRole === 'player' ? 'text-[#CCFF00]' : 'text-white'}`}>Player</span>
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-3">Optional Note</label>
                                        <textarea
                                            rows={2}
                                            placeholder="e.g. U12 Head Coach at Saket..."
                                            value={requestReason}
                                            onChange={e => setRequestReason(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm font-medium outline-none transition-all resize-none placeholder:text-white/20 focus:border-[#CCFF00]/40"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSubmit}
                                        disabled={!requestedRole || isSubmitting}
                                        className="w-full bg-[#CCFF00] text-brand-950 font-black py-5 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(204,255,0,0.2)] hover:bg-[#d4ff33] active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none uppercase tracking-[0.25em] text-[10px]"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-4 h-4 border-2 border-brand-950/20 border-t-brand-950 rounded-full animate-spin" />
                                        ) : (
                                            <>Submit Request <ChevronRight size={14} strokeWidth={3} /></>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Universal Logout Button */}
                    <button 
                        onClick={onLogout}
                        className="w-full py-5 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 border-t border-white/5 hover:bg-white/5 group mt-8"
                    >
                        <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> LOG OUT
                    </button>
                </div>
            </div>

            {/* Footer */}
            <p className="absolute bottom-8 text-white/10 text-[9px] font-black uppercase tracking-[0.5em] italic">
                © 2026 Icarus Football Schools • Academy Portal
            </p>
        </div>
    );
};
