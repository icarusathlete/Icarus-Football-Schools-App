import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Match, AcademySettings, Role } from '../types';
import {
    Trophy, Calendar, Crown, Shield, Award, Sparkles, Zap,
    Medal, Printer, Loader2, Star, X, Activity, Users, Target
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface LeaderboardProps { role?: Role; currentUser?: User; }

const PTS_TRAINING = 1;
const PTS_MATCH    = 5;
const LS_MOTM_KEY  = 'icarus_session_motm';

function getTrainingMvps(): Record<string, string> {
    try { 
        const val = JSON.parse(localStorage.getItem(LS_MOTM_KEY) || '{}');
        return val && typeof val === 'object' ? val : {};
    }
    catch { return {}; }
}

interface MvpEntry {
    id: string; fullName: string; photoUrl: string; position?: string;
    trainingMvps: number; matchMvps: number; ratingPts: number; totalPts: number;
}

type Tab = 'mvp' | 'stats';

// ── Rank badge colours ────────────────────────────────────────────
const RANK_STYLE: Record<number, { bg: string; text: string; ring: string; label: string }> = {
    0: { bg: 'bg-gradient-to-br from-amber-400 to-yellow-500', text: 'text-white', ring: 'ring-amber-400/40', label: 'bg-amber-400 text-white' },
    1: { bg: 'bg-gradient-to-br from-slate-300 to-slate-400',  text: 'text-white',      ring: 'ring-slate-400/30', label: 'bg-slate-300 text-white' },
    2: { bg: 'bg-gradient-to-br from-amber-700 to-amber-900',  text: 'text-white',      ring: 'ring-amber-700/30', label: 'bg-amber-700 text-white' },
};

export const Leaderboard: React.FC<LeaderboardProps> = ({ role, currentUser }) => {
    const [tab, setTab] = useState<Tab>('mvp');
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    const [potmData, setPotmData] = useState<{ playerId: string; timestamp: number } | null>(null);
    const [potmModalOpen, setPotmModalOpen] = useState(false);
    const [potmAction, setPotmAction] = useState<{ playerId: string; playerName: string; month: string; monthName: string } | null>(null);
    const [viewingEntry, setViewingEntry] = useState<MvpEntry | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const loadData = () => {
        setPlayers(StorageService.getPlayers());
        setMatches(StorageService.getMatches());
        setPotmData(StorageService.getMOTM(month));
    };
    useEffect(() => {
        loadData();
        const onSettings = () => setSettings(StorageService.getSettings());
        window.addEventListener('settingsChanged', onSettings);
        window.addEventListener('academy_data_update', loadData);
        return () => { window.removeEventListener('settingsChanged', onSettings); window.removeEventListener('academy_data_update', loadData); };
    }, [month]);

    const monthName = new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const mvpLeaderboard: MvpEntry[] = useMemo(() => {
        const mvps = getTrainingMvps();
        return players.map(p => {
            const tCount = Object.entries(mvps).filter(([key, val]) => {
                const entryId = typeof val === 'object' ? (val as any).playerId : val;
                return entryId === p.id && key.startsWith(month);
            }).length;
            const mCount = matches.filter(m => m.date.startsWith(month) && m.playerOfTheMatchId === p.id).length;
            const rPts = matches.filter(m => m.date.startsWith(month))
                .reduce((acc, m) => {
                    const s = m.playerStats?.find(ps => ps.playerId === p.id);
                    return acc + ((s?.rating || 0) / 2);
                }, 0);
            
            const total = parseFloat((tCount * PTS_TRAINING + mCount * PTS_MATCH + rPts).toFixed(1));
            
            return { 
                id: p.id, 
                fullName: p.fullName, 
                photoUrl: p.photoUrl, 
                position: p.position, 
                trainingMvps: tCount, 
                matchMvps: mCount, 
                ratingPts: parseFloat(rPts.toFixed(1)),
                totalPts: total 
            };
        }).sort((a, b) => b.totalPts - a.totalPts || b.matchMvps - a.matchMvps || b.trainingMvps - a.trainingMvps);
    }, [players, matches, month]);
    
    const myRankEntry = useMemo(() => {
        if (!currentUser?.linkedPlayerId) return null;
        const index = mvpLeaderboard.findIndex(e => e.id === currentUser.linkedPlayerId);
        if (index === -1) return null;
        return { rank: index + 1, entry: mvpLeaderboard[index] };
    }, [mvpLeaderboard, currentUser]);

    const statsLeaderboard = useMemo(() => players.map(p => {
        const pm = matches.filter(m => m.date && m.date.startsWith(month) && m.playerStats?.some(s => s.playerId === p.id))
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const agg = pm.reduce((acc, m) => {
            const s = m.playerStats?.find(ps => ps.playerId === p.id);
            if (s) { acc.goals += s.goals; acc.assists += s.assists; acc.ratings.push(s.rating); acc.points += s.rating; }
            return acc;
        }, { goals: 0, assists: 0, ratings: [] as number[], points: 0 });
        const avg = agg.ratings.length ? agg.ratings.reduce((a, b) => a + b, 0) / agg.ratings.length : 0;
        return { ...p, goals: agg.goals, assists: agg.assists, avgRating: parseFloat(avg.toFixed(1)), totalPoints: parseFloat(agg.points.toFixed(1)), matchCount: agg.ratings.length };
    }).filter(p => p.matchCount > 0).sort((a, b) => b.totalPoints - a.totalPoints || b.goals - a.goals), [players, matches, month]);

    const [savingPotm, setSavingPotm] = useState(false);

    const confirmAwardPotm = async () => {
        if (!potmAction?.playerId) return;
        setSavingPotm(true);
        await StorageService.setMOTM(potmAction.playerId, potmAction.month);
        const w = mvpLeaderboard.find(p => p.id === potmAction.playerId);
        if (w) StorageService.addNotice({ title: `🏆 PLAYER OF THE MONTH: ${potmAction.playerName.toUpperCase()}`, content: `${potmAction.playerName} has been awarded Player of the Month for ${potmAction.monthName}!\n\n${w.trainingMvps} Session MVP${w.trainingMvps !== 1 ? 's' : ''} + ${w.matchMvps} Match MVP${w.matchMvps !== 1 ? 's' : ''} + ${w.ratingPts} Performance Pts = ${w.totalPts} points.`, priority: 'high', author: 'Academy Staff', imageUrl: w.photoUrl });
        loadData(); setPotmModalOpen(false); setSavingPotm(false);
    };

    const exportToPDF = async () => {
        if (!printRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
            pdf.save(`${settings.name}_Leaderboard_${month}.pdf`);
        } finally { setIsExporting(false); }
    };

    const leader = mvpLeaderboard[0];
    const top3   = mvpLeaderboard.slice(0, 3);

    return (
        <div className="space-y-6 pb-32 font-display">
            {/* Persistent Rank Banner for Players */}
            {role === 'player' && currentUser?.linkedPlayerId && (
                <div className="bg-brand-accent h-[44px] flex items-center justify-center px-8 border-b border-brand-950 shadow-xl relative z-[15] shrink-0 -mx-6 md:-mx-12 -mt-6">
                    <div className="flex items-center gap-6">
                        <Trophy size={16} className="text-brand-950" />
                        <span className="text-[11px] font-black text-brand-950 uppercase tracking-[0.25em] italic">
                            {myRankEntry && myRankEntry.entry.totalPts > 0 ? (
                                <>YOU ARE RANKED <span className="text-lg">#{myRankEntry.rank}</span> THIS MONTH &mdash; {myRankEntry.entry.totalPts} PTS</>
                            ) : (
                                <>YOU ARE CURRENTLY <span className="text-lg text-brand-950/40">NOT RANKED</span> &mdash; 0 PTS</>
                            )}
                        </span>
                        <div className="h-4 w-px bg-brand-950/20" />
                        <span className="text-[9px] font-black text-brand-950/60 uppercase tracking-widest italic">
                            {myRankEntry && myRankEntry.entry.totalPts > 0 ? 'KEEP GRINDING FOR THE TOP SPOT' : 'ATTEND SESSIONS TO START CLIMBING'}
                        </span>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                HERO HEADER — dark, dramatic, high contrast
            ══════════════════════════════════════════════ */}
            {/* ══════════════════════════════════════════════
                HERO HEADER — Restructured into Two Zones
            ══════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-brand-900/60 backdrop-blur-xl border-white/10 border border-white/10 shadow-2xl group min-h-[300px]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,_rgba(0,200,255,0.05),_transparent)] opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-12">
                    <Trophy size={200} className="text-white" />
                </div>
                
                <div className="relative z-10 flex flex-col xl:grid xl:grid-cols-10 h-full">
                    {/* Left Zone: 60% — Identity & Context */}
                    <div className="xl:col-span-6 p-8 md:p-12 border-b xl:border-b-0 xl:border-r border-white/5 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-6 transition-transform duration-500 hover:translate-x-1">
                            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center shadow-lg shadow-brand-500/5">
                                <Trophy size={18} className="text-brand-primary fill-brand-primary" />
                            </div>
                            <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.4em] italic leading-none">Monthly Points Race</span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl xl:text-6xl font-black text-white italic uppercase tracking-tighter leading-[0.9]">
                            ACADEMY <span className="text-brand-accent">MVP</span>
                        </h1>
                        <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em] mt-6 italic">Academy Leaderboard // Monthly Performance Rankings</p>

                        <div className="mt-8 flex flex-wrap gap-4 items-center">
                            {leader && (
                                <div className="inline-flex items-center gap-2.5 bg-brand-accent/10 border border-brand-accent/30 px-5 py-2.5 rounded-full backdrop-blur-sm group/leader transition-all hover:bg-brand-accent/20">
                                    <Crown size={12} className="text-brand-accent fill-brand-accent" />
                                    <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] italic">Leading: {leader.fullName} · {leader.totalPts} pts</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 bg-brand-950/60 border border-white/10 px-4 py-2.5 rounded-2xl hover:border-brand-primary transition-all">
                                <Calendar size={14} className="text-brand-primary" />
                                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                                    className="bg-transparent text-white text-xs font-black uppercase tracking-widest outline-none cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    {/* Right Zone: 40% — Performance Telemetry (Quick Stats) */}
                    <div className="xl:col-span-4 p-8 md:p-10 bg-white/5 flex flex-col justify-center gap-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-4">
                            <div className="p-5 rounded-3xl bg-brand-950/40 border border-white/5 flex flex-col gap-2 group/tile hover:bg-brand-primary/10 hover:border-brand-primary/20 transition-all duration-500">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] italic">Session MVP</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white italic">{PTS_TRAINING}</span>
                                    <span className="text-[10px] font-bold text-brand-primary uppercase">pt</span>
                                </div>
                            </div>
                            <div className="p-5 rounded-3xl bg-brand-950/40 border border-white/5 flex flex-col gap-2 group/tile hover:bg-brand-accent/10 hover:border-brand-accent/20 transition-all duration-500">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] italic">Match MVP</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white italic">{PTS_MATCH}</span>
                                    <span className="text-[10px] font-bold text-brand-accent uppercase">pts</span>
                                </div>
                            </div>
                            <div className="p-5 rounded-3xl bg-brand-950/40 border border-white/5 flex flex-col gap-2 group/tile hover:bg-brand-primary/10 hover:border-brand-primary/20 transition-all duration-500">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] italic">Performance</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white italic">0.5</span>
                                    <span className="text-[10px] font-bold text-brand-primary uppercase">pts</span>
                                </div>
                            </div>
                            <div className="p-5 rounded-3xl bg-brand-accent text-brand-950 flex flex-col gap-2 shadow-lg shadow-brand-accent/20">
                                <p className="text-[9px] font-black text-brand-950/50 uppercase tracking-[0.2em] italic">On Board</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black italic leading-none">{mvpLeaderboard.length}</span>
                                    <Users size={12} className="opacity-40" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-Header Actions: Tab Switcher & Export */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-1 bg-brand-950/40 border border-white/10 p-1 rounded-2xl w-full md:w-auto">
                    <button onClick={() => setTab('mvp')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 italic ${tab === 'mvp' ? 'bg-brand-accent text-brand-950 shadow-lg shadow-brand-accent/20' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
                        <Trophy size={12} /> MVP Points
                    </button>
                    <button onClick={() => setTab('stats')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 italic ${tab === 'stats' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
                        <Activity size={12} /> Match Stats
                    </button>
                </div>

                <button onClick={exportToPDF} disabled={isExporting}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-brand-950 border border-white/10 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-800 hover:border-brand-primary transition-all shadow-xl italic group">
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} className="text-brand-primary group-hover:scale-110 transition-transform" />} Export Performance Report
                </button>
            </div>

            {/* ══════════════════════════════════════════════
                MVP LADDER TAB
            ══════════════════════════════════════════════ */}
            {tab === 'mvp' && (
                <div ref={printRef} className="space-y-6 animate-in fade-in duration-400">



                    {mvpLeaderboard.length > 0 ? (<>

                        {/* ─── PODIUM ─── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end pt-10 px-4">
                            {/* P2 — Silver */}
                            <div className="order-2 lg:order-1">
                                {top3[1] && (
                                    <div onClick={() => setViewingEntry(top3[1])}
                                        className="glass-card-alt p-6 md:p-8 flex flex-col items-center cursor-pointer hover:scale-[1.05] transition-all duration-500 group min-h-[260px] md:min-h-[300px] border-slate-400/20">
                                        <div className="relative mb-4 md:mb-6">
                                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl overflow-hidden border-2 border-slate-300 shadow-[0_10px_30px_rgba(148,163,184,0.3)] group-hover:rotate-3 transition-transform duration-500">
                                                <img src={top3[1].photoUrl} alt={top3[1].fullName} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center text-[10px] md:text-xs font-black text-brand-950 border-2 border-white/20 shadow-lg">2</div>
                                        </div>
                                        <h3 className="text-white font-black text-base md:text-lg italic uppercase tracking-tighter text-center leading-none">{top3[1].fullName}</h3>
                                        <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[9px] mt-2 mb-4 md:mb-6 italic">{top3[1].position || 'PLAYER'}</p>
                                        
                                        <div className="w-full grid grid-cols-2 gap-4 mt-auto">
                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
                                                <p className="text-[8px] font-black text-white/30 uppercase mb-1">Total Pts</p>
                                                <p className="font-black text-white text-xl italic leading-none">{top3[1].totalPts}</p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
                                                <p className="text-[8px] font-black text-white/30 uppercase mb-1">Match MVP</p>
                                                <p className="font-black text-white text-xl italic leading-none">{top3[1].matchMvps}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* P1 — Champion (The Gold Standard) */}
                            <div className="order-1 lg:order-2">
                                {top3[0] && (
                                    <div onClick={() => setViewingEntry(top3[0])}
                                        className="relative glass-card p-8 md:p-10 flex flex-col items-center cursor-pointer hover:scale-[1.08] transition-all duration-700 shadow-[0_30px_70px_rgba(195,246,41,0.15)] group min-h-[340px] md:min-h-[380px] overflow-hidden border-brand-accent/30 ring-4 ring-brand-accent/10">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(195,246,41,0.1),_transparent)] pointer-events-none" />
                                        <div className="absolute top-0 left-0 right-0 h-1 md:h-1.5 bg-gradient-to-r from-transparent via-brand-accent to-transparent" />
                                        
                                        <div className="relative mb-6 md:mb-8">
                                            <div className="absolute -inset-3 md:-inset-4 bg-brand-accent/20 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-1000" />
                                            <div className="w-28 h-28 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-4 border-brand-accent shadow-[0_0_40px_rgba(195,246,41,0.4)] group-hover:-rotate-3 transition-transform duration-700 relative z-10">
                                                <img src={top3[0].photoUrl} alt={top3[0].fullName} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-brand-accent flex items-center justify-center text-brand-950 border-2 md:border-4 border-brand-900 shadow-2xl z-20 group-hover:scale-110 transition-transform">
                                                <Crown size={20} className="fill-brand-950" />
                                            </div>
                                        </div>
                                        
                                        <h2 className="font-black text-white text-xl md:text-2xl italic uppercase tracking-tighter text-center leading-none mb-2">{top3[0].fullName}</h2>
                                        <p className="text-[9px] md:text-[10px] font-black text-brand-accent uppercase tracking-[0.3em] mb-4 md:mb-6 italic text-center">ELITE PERFORMANCE LEADER</p>
                                        
                                        {potmData?.playerId === top3[0].id && (
                                            <div className="mb-6 flex items-center gap-2 bg-brand-accent text-brand-950 text-[10px] font-black px-5 py-2 rounded-full italic uppercase tracking-widest shadow-lg shadow-brand-accent/20 animate-bounce">
                                                <Sparkles size={12} /> PLAYER OF THE MONTH
                                            </div>
                                        )}

                                        <div className="w-full grid grid-cols-2 gap-4 mt-auto">
                                            <div className="p-4 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 text-center">
                                                <p className="text-[9px] font-black text-brand-accent uppercase mb-1 italic">Total Score</p>
                                                <p className="font-black text-white text-2xl italic leading-none">{top3[0].totalPts}</p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                                                <p className="text-[9px] font-black text-white/30 uppercase mb-1 italic">Session MVPs</p>
                                                <p className="font-black text-white text-2xl italic leading-none">{top3[0].trainingMvps}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* P3 — Bronze */}
                            <div className="order-3">
                                {top3[2] && (
                                    <div onClick={() => setViewingEntry(top3[2])}
                                        className="glass-card-alt p-6 md:p-8 flex flex-col items-center cursor-pointer hover:scale-[1.05] transition-all duration-500 group min-h-[260px] md:min-h-[300px] border-amber-700/20">
                                        <div className="relative mb-4 md:mb-6">
                                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl overflow-hidden border-2 border-amber-700 shadow-[0_10px_30px_rgba(180,83,9,0.2)] group-hover:-rotate-3 transition-transform duration-500">
                                                <img src={top3[2].photoUrl} alt={top3[2].fullName} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-[10px] md:text-xs font-black text-white border-2 border-white/20 shadow-lg">3</div>
                                        </div>
                                        <h3 className="text-white font-black text-base md:text-lg italic uppercase tracking-tighter text-center leading-none">{top3[2].fullName}</h3>
                                        <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[9px] mt-2 mb-4 md:mb-6 italic">{top3[2].position || 'PLAYER'}</p>
                                        
                                        <div className="w-full grid grid-cols-2 gap-4 mt-auto">
                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
                                                <p className="text-[8px] font-black text-white/30 uppercase mb-1">Total Pts</p>
                                                <p className="font-black text-white text-xl italic leading-none">{top3[2].totalPts}</p>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-center">
                                                <p className="text-[8px] font-black text-white/30 uppercase mb-1">Match MVP</p>
                                                <p className="font-black text-white text-xl italic leading-none">{top3[2].matchMvps}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── FULL RANKINGS TABLE ─── */}
                        <div className="bg-brand-900/60 backdrop-blur-xl border-white/10 rounded-[2rem] border border-white/10 shadow-md overflow-hidden">
                            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-brand-950/40/50">
                                <h3 className="font-black text-white italic uppercase tracking-tight flex items-center gap-2 text-lg">
                                    <Star size={18} className="text-amber-500 fill-amber-500" /> Full Rankings
                                </h3>
                                <p className="text-[9px] font-bold text-brand-400 uppercase tracking-widest">Click any row to view detail</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[7px] md:text-[9px] font-black text-brand-400 uppercase tracking-[0.1em] md:tracking-[0.2em] border-b border-white/10 bg-brand-950/40/30">
                                            <th className="px-2 md:px-6 py-4 text-center w-10 md:w-16">Rank</th>
                                            <th className="px-2 md:px-6 py-4">Player</th>
                                            <th className="px-2 py-4 text-center">
                                                <span className="flex flex-col items-center gap-0.5">Session<span className="text-brand-500 font-black">×{PTS_TRAINING}pt</span></span>
                                            </th>
                                            <th className="px-2 py-4 text-center">
                                                <span className="flex flex-col items-center gap-0.5">Match<span className="text-amber-500 font-black">×{PTS_MATCH}pts</span></span>
                                            </th>
                                            <th className="px-2 py-4 text-center">
                                                <span className="flex flex-col items-center gap-0.5">Rating<span className="text-rose-400 font-black">×0.5pts</span></span>
                                            </th>
                                            <th className="px-4 md:px-6 py-4 text-center bg-amber-50/5">
                                                <span className="text-amber-600">Total</span>
                                            </th>
                                            {(role === 'admin' || role === 'coach') && <th className="px-4 py-4 text-center">POTM</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-100">
                                        {mvpLeaderboard.map((entry, idx) => {
                                            const isMe = entry.id === currentUser?.linkedPlayerId;
                                            return (
                                                <tr key={entry.id} onClick={() => setViewingEntry(entry)}
                                                    className={`group cursor-pointer transition-colors ${isMe ? 'bg-brand-accent/10 border-l-[6px] border-brand-accent hover:bg-brand-accent/20' : idx === 0 ? 'bg-amber-50/60 hover:bg-amber-50' : 'bg-brand-900/60 backdrop-blur-xl border-white/10 hover:bg-brand-950/40/50'}`}>
                                                <td className="px-6 py-4 text-center">
                                                    {idx < 3
                                                        ? <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center text-[11px] font-black ${RANK_STYLE[idx].label}`}>{idx + 1}</span>
                                                        : <span className="text-brand-400 font-black text-sm">{idx + 1}</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={entry.photoUrl} alt={entry.fullName} className="w-10 h-10 rounded-full object-cover border-2 border-white/10 group-hover:border-brand-300 transition-colors" />
                                                        <div>
                                                            <p className="text-sm font-black text-white italic uppercase tracking-tight">{entry.fullName}</p>
                                                            <p className="text-[8px] font-bold text-brand-400 uppercase tracking-widest">{entry.position || '—'}</p>
                                                        </div>
                                                        {potmData?.playerId === entry.id && (
                                                            <span className="ml-1 flex items-center gap-1 bg-amber-100 text-amber-700 text-[8px] font-black px-2.5 py-1 rounded-full border border-amber-200">
                                                                <Trophy size={9} className="fill-amber-500 text-amber-500" /> POTM
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex flex-col items-center">
                                                        <span className="text-white font-black text-xl">{entry.trainingMvps}</span>
                                                        <span className="text-[8px] text-brand-400">{entry.trainingMvps * PTS_TRAINING} pt</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex flex-col items-center">
                                                        <span className="text-white font-black text-xl">{entry.matchMvps}</span>
                                                        <span className="text-[8px] text-brand-400">{entry.matchMvps * PTS_MATCH} pts</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex flex-col items-center">
                                                        <span className="text-white font-black text-xl">{entry.ratingPts}</span>
                                                        <span className="text-[8px] text-brand-400">Perf pts</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center bg-amber-50/60">
                                                    <span className={`text-2xl font-black ${idx === 0 ? 'text-amber-500' : 'text-white'}`}>{entry.totalPts}</span>
                                                </td>
                                                {(role === 'admin' || role === 'coach') && (
                                                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                        {potmData?.playerId === entry.id
                                                            ? <span className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-1 justify-center"><Trophy size={10} className="fill-amber-500" /> Awarded</span>
                                                            : <button onClick={() => { setPotmAction({ playerId: entry.id, playerName: entry.fullName, month, monthName }); setPotmModalOpen(true); }}
                                                                className="bg-brand-950 text-brand-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-brand-800 hover:bg-amber-400 hover:text-white hover:border-amber-400 transition-all active:scale-95">
                                                                Award
                                                            </button>
                                                        }
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                </table>
                            </div>
                        </div>

                    </>) : (
                        <div className="bg-brand-900/60 backdrop-blur-xl border-white/10 rounded-[2.5rem] border-2 border-dashed border-brand-200 p-24 text-center flex flex-col items-center">
                            <div className="w-20 h-20 rounded-3xl bg-brand-950/40 flex items-center justify-center mb-6"><Trophy size={36} className="text-brand-200" /></div>
                            <h3 className="text-2xl font-black text-white italic uppercase">No MVP Awards Yet</h3>
                            <p className="text-brand-400 mt-2 text-[10px] font-bold uppercase tracking-widest max-w-sm">Award session MVPs from the Attendance page and match MVPs from Match Centre to build the leaderboard.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                MATCH STATS TAB
            ══════════════════════════════════════════════ */}
            {tab === 'stats' && (
                <div className="animate-in fade-in duration-400">
                    {statsLeaderboard.length > 0 ? (
                        <div className="bg-brand-900/60 backdrop-blur-xl border-white/10 rounded-[2rem] border border-white/10 shadow-md overflow-hidden">
                            <div className="px-6 py-5 border-b border-white/10 bg-brand-950/40/50 flex items-center gap-3">
                                <Activity size={18} className="text-brand-500" />
                                <h3 className="font-black text-white italic uppercase tracking-tight text-lg">Match Performance · {monthName}</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[9px] font-black text-brand-400 uppercase tracking-[0.2em] border-b border-white/10 bg-brand-950/40/30">
                                            <th className="px-6 py-4 text-center w-16">Rank</th>
                                            <th className="px-6 py-4">Player</th>
                                            <th className="px-4 py-4 text-center">MP</th>
                                            <th className="px-4 py-4 text-center">Goals</th>
                                            <th className="px-4 py-4 text-center">Assists</th>
                                            <th className="px-4 py-4 text-center">Avg Rtg</th>
                                            <th className="px-6 py-4 text-center bg-brand-950/40">Total Pts</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-100">
                                        {statsLeaderboard.map((p, idx) => (
                                            <tr key={p.id} className={`group transition-colors ${idx === 0 ? 'bg-brand-primary/5 hover:bg-brand-primary/10' : 'bg-brand-900/60 backdrop-blur-xl border-white/10 hover:bg-brand-950/40/50'}`}>
                                                <td className="px-6 py-4 text-center">
                                                    {idx < 3
                                                        ? <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center text-[11px] font-black ${RANK_STYLE[idx].label}`}>{idx + 1}</span>
                                                        : <span className="text-brand-400 font-black text-sm">{idx + 1}</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={p.photoUrl} alt={p.fullName} className="w-10 h-10 rounded-full object-cover border-2 border-white/10" />
                                                        <div>
                                                            <p className="text-sm font-black text-white italic uppercase tracking-tight">{p.fullName}</p>
                                                            <p className="text-[8px] font-bold text-brand-400 uppercase tracking-widest">{p.position || '—'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center font-black text-white">{p.matchCount}</td>
                                                <td className="px-4 py-4 text-center font-black text-white">{p.goals}</td>
                                                <td className="px-4 py-4 text-center font-black text-white">{p.assists}</td>
                                                <td className="px-4 py-4 text-center font-black text-white">{p.avgRating}</td>
                                                <td className={`px-6 py-4 text-center font-black text-2xl bg-brand-950/40/60 ${idx === 0 ? 'text-brand-500' : 'text-white'}`}>{p.totalPoints}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-brand-900/60 backdrop-blur-xl border-white/10 rounded-[2.5rem] border-2 border-dashed border-brand-200 p-24 text-center flex flex-col items-center">
                            <div className="w-20 h-20 rounded-3xl bg-brand-950/40 flex items-center justify-center mb-6"><Activity size={36} className="text-brand-200" /></div>
                            <h3 className="text-2xl font-black text-white italic uppercase">No Match Data</h3>
                            <p className="text-brand-400 mt-2 text-[10px] font-bold uppercase tracking-widest">No match telemetry for the selected period.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                PLAYER DETAIL MODAL
            ══════════════════════════════════════════════ */}
            {viewingEntry && (
                <div className="fixed inset-0 z-[100] bg-brand-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingEntry(null)}>
                    <div className="relative w-80 bg-brand-900/60 backdrop-blur-xl border-white/10 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Gold header strip */}
                        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
                        <button onClick={() => setViewingEntry(null)} className="absolute top-4 right-4 text-brand-300 hover:text-white transition-colors z-10"><X size={20} /></button>

                        <div className="p-8 flex flex-col items-center gap-5">
                            <div className="relative">
                                <img src={viewingEntry.photoUrl} alt={viewingEntry.fullName} className="w-24 h-24 rounded-2xl object-cover border-2 border-white/10" />
                                <div className="absolute -top-3 -right-3 w-9 h-9 bg-amber-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/30">
                                    <Trophy size={16} className="text-white fill-brand-950" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-white italic uppercase">{viewingEntry.fullName}</h3>
                                <p className="text-[9px] font-bold text-brand-400 uppercase tracking-widest mt-1">{viewingEntry.position || 'PLAYER'}</p>
                            </div>
                            <div className="w-full grid grid-cols-2 gap-3">
                                <div className="bg-brand-950/40 rounded-2xl p-4 text-center border border-white/10">
                                    <p className="text-[8px] font-black text-brand-400 uppercase mb-1">SESSION</p>
                                    <p className="text-2xl font-black text-white">{viewingEntry.trainingMvps}</p>
                                    <p className="text-[8px] text-brand-400">×{PTS_TRAINING} pt</p>
                                </div>
                                <div className="bg-brand-950/40 rounded-2xl p-4 text-center border border-white/10">
                                    <p className="text-[8px] font-black text-brand-400 uppercase mb-1">MATCH MOTM</p>
                                    <p className="text-2xl font-black text-white">{viewingEntry.matchMvps}</p>
                                    <p className="text-[8px] text-brand-400">×{PTS_MATCH} pts</p>
                                </div>
                                <div className="bg-brand-950/40 rounded-2xl p-4 text-center border border-white/10">
                                    <p className="text-[8px] font-black text-brand-400 uppercase mb-1">PERFORMANCE</p>
                                    <p className="text-2xl font-black text-white">{viewingEntry.ratingPts}</p>
                                    <p className="text-[8px] text-brand-400">rating pts</p>
                                </div>
                                <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-200">
                                    <p className="text-[8px] font-black text-amber-600 uppercase mb-1">TOTAL</p>
                                    <p className="text-2xl font-black text-amber-600">{viewingEntry.totalPts}</p>
                                    <p className="text-[8px] text-amber-400">pts</p>
                                </div>
                            </div>
                            {(role === 'admin' || role === 'coach') && potmData?.playerId !== viewingEntry.id && (
                                <button onClick={() => { setViewingEntry(null); setPotmAction({ playerId: viewingEntry.id, playerName: viewingEntry.fullName, month, monthName }); setPotmModalOpen(true); }}
                                    className="w-full bg-brand-950 text-amber-400 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-400 hover:text-white active:scale-95 transition-all">
                                    <Crown size={14} /> Award Player of the Month
                                </button>
                            )}
                            {potmData?.playerId === viewingEntry.id && (
                                <div className="w-full bg-amber-50 border border-amber-200 py-3 rounded-2xl text-center">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center justify-center gap-2"><Sparkles size={12} /> Player of the Month</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={potmModalOpen} onCancel={() => setPotmModalOpen(false)} onConfirm={confirmAwardPotm}
                title="Award Player of the Month"
                message={`Officially award ${potmAction?.playerName} as Player of the Month for ${potmAction?.monthName}? An announcement will be posted to the academy board.`}
                confirmText="AWARD POTM" type="danger"
            />
        </div>
    );
};
