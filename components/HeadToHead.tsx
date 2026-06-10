import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Match, Player } from '../types';
import { 
    Search, Target, Trophy, TrendingUp, History, 
    ArrowRight, Activity, Users, Shield, Zap, Flame, 
    BarChart3, PieChart, Star, Swords, X
} from 'lucide-react';

export const HeadToHead: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [opponents, setOpponents] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const allMatches = StorageService.getMatches();
        setMatches(allMatches);
        setPlayers(StorageService.getPlayers());
        
        // Extract unique opponents from matches
        const matchOpps = allMatches.map(m => m.opponent);
        
        // Extract unique opponents from schedule
        const scheduleOpps = StorageService.getSchedule()
            .filter(e => e.type === 'match')
            .map(e => {
                let opp = e.title;
                if (opp.toLowerCase().includes(' vs ')) return opp.split(' vs ')[1].trim();
                if (opp.toLowerCase().includes('against')) return opp.split('against')[1].trim();
                return opp.trim();
            });

        const uniqueOpps = Array.from(new Set([...matchOpps, ...scheduleOpps])).sort();
        setOpponents(uniqueOpps);
    }, []);

    useEffect(() => {
        if (!selectedOpponent) {
            setStats(null);
            return;
        }

        const h2hMatches = matches.filter(m => m.opponent === selectedOpponent).sort((a,b) => b.date.localeCompare(a.date));
        const wins = h2hMatches.filter(m => m.result === 'W').length;
        const draws = h2hMatches.filter(m => m.result === 'D').length;
        const losses = h2hMatches.filter(m => m.result === 'L').length;
        const goalsFor = h2hMatches.reduce((sum, m) => sum + m.scoreFor, 0);
        const goalsAgainst = h2hMatches.reduce((sum, m) => sum + m.scoreAgainst, 0);

        // Calculate Goal Scorers vs this opponent
        const scorers: Record<string, number> = {};
        h2hMatches.forEach(m => {
            m.playerStats.forEach(ps => {
                if (ps.goals > 0) {
                    scorers[ps.playerId] = (scorers[ps.playerId] || 0) + ps.goals;
                }
            });
        });

        const topScorerId = Object.keys(scorers).reduce((a, b) => scorers[a] > scorers[b] ? a : b, '');
        const topScorer = players.find(p => p.id === topScorerId);

        setStats({
            matches: h2hMatches,
            wins, draws, losses,
            goalsFor, goalsAgainst,
            winRate: ((wins / (h2hMatches.length || 1)) * 100).toFixed(1),
            topScorer: topScorer ? { ...topScorer, goals: scorers[topScorerId] } : null
        });
    }, [selectedOpponent, matches, players]);

    const filteredOpponents = opponents.map(opp => {
        const isHistorical = matches.some(m => m.opponent === opp);
        return { name: opp, isHistorical };
    }).filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-display">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase flex items-center gap-3">
                        H2H <span className="text-brand-500">History</span>
                        <Swords size={32} className="text-brand-500 opacity-50" />
                    </h2>
                    <p className="text-brand-400 font-medium mt-1 tracking-tight">Match history and records against other clubs.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Search Opponents..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-brand-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-sm outline-none focus:border-brand-500 transition-all shadow-xl font-display italic"
                    />
                    
                    {searchTerm && !selectedOpponent && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-brand-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto custom-scrollbar">
                            <div className="px-5 py-3 border-b border-white/5 bg-black/20 text-[8px] font-black text-brand-500 uppercase tracking-widest italic">Available Opponents</div>
                            {filteredOpponents.map(opp => (
                                <div 
                                    key={opp.name} 
                                    onClick={() => { setSelectedOpponent(opp.name); setSearchTerm(''); }}
                                    className="px-6 py-4 hover:bg-brand-500/10 hover:text-brand-500 flex items-center justify-between group cursor-pointer transition-all border-b border-white/5 last:border-none"
                                >
                                    <span className="font-black uppercase text-xs text-white group-hover:text-brand-500 font-display italic">{opp.name}</span>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest ${opp.isHistorical ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-500/10 text-brand-400'}`}>
                                        {opp.isHistorical ? 'HISTORY' : 'SCHEDULED'}
                                    </span>
                                </div>
                            ))}
                            {filteredOpponents.length === 0 && <div className="px-6 py-6 text-brand-600 text-xs italic text-center">No opponents found.</div>}
                        </div>
                    )}
                </div>
            </div>

            {selectedOpponent && stats && stats.matches.length > 0 ? (
                <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                    {/* Hero Section: Last Result */}
                    <section className="bg-brand-800 rounded-[3rem] border border-white/5 p-1 relative overflow-hidden shadow-2xl">
                        <div className="bg-brand-950/40 rounded-[2.8rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="text-center md:text-left">
                                <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] mb-4 italic">LATEST MATCH</h3>
                                <div className="flex items-center gap-6">
                                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Icarus <span className="text-brand-500 opacity-20">vs</span> {selectedOpponent}</h2>
                                </div>
                            </div>

                            <div className="flex items-center gap-10">
                                <div className="flex flex-col items-center">
                                    <div className="font-mono text-6xl font-black text-white flex items-center gap-4">
                                        <span className={stats.matches[0].result === 'W' ? 'text-brand-500' : 'text-white'}>{stats.matches[0].scoreFor}</span>
                                        <span className="text-brand-900 opacity-30">:</span>
                                        <span className="text-brand-400">{stats.matches[0].scoreAgainst}</span>
                                    </div>
                                    <div className={`mt-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${stats.matches[0].result === 'W' ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20' : 'bg-brand-900 text-brand-500 border border-white/5'}`}>
                                        {stats.matches[0].result === 'W' ? 'WIN' : 'LOSS'}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedOpponent(null)} className="p-4 bg-brand-900 border border-white/5 text-brand-600 hover:text-white rounded-[1.25rem] transition-all"><X size={20}/></button>
                            </div>
                        </div>
                    </section>

                    {/* Stats Layout: Side by Side Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Summary Cluster */}
                        <div className="lg:col-span-8 space-y-10">
                            <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2 italic">
                                <BarChart3 size={14} className="text-brand-500" /> MATCH STATISTICS
                            </h4>

                            <div className="bg-brand-800 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                                <div className="p-10 space-y-8">
                                    {[
                                        { label: 'Win Rate', icarus: `${stats.winRate}%`, opp: `${(100 - stats.winRate).toFixed(0)}%`, highlight: stats.winRate > 50 },
                                        { label: 'Average Goals Scored', icarus: (stats.goalsFor / stats.matches.length).toFixed(1), opp: (stats.goalsAgainst / stats.matches.length).toFixed(1), highlight: stats.goalsFor > stats.goalsAgainst },
                                        { label: 'Average Goals Conceded', icarus: (stats.goalsAgainst / stats.matches.length).toFixed(1), opp: (stats.goalsFor / stats.matches.length).toFixed(1), highlight: stats.goalsAgainst < stats.goalsFor },
                                        { label: 'Total Matches', icarus: stats.matches.length, opp: stats.matches.length, highlight: false },
                                    ].map((metric, i) => (
                                        <div key={i} className="flex items-center gap-8">
                                            <div className={`flex-1 p-5 rounded-[1.5rem] text-right font-black text-xl transition-all ${metric.highlight ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20' : 'bg-brand-950 text-white border border-white/5'}`}>
                                                {metric.icarus}
                                            </div>
                                            <div className="min-w-[150px] text-center">
                                                <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest italic">{metric.label}</p>
                                            </div>
                                            <div className="flex-1 p-5 bg-brand-950 border border-white/5 rounded-[1.5rem] text-left font-black text-xl text-brand-400">
                                                {metric.opp}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-brand-950/50 p-6 flex justify-between items-center px-12 border-t border-white/5">
                                    <div className="flex items-center gap-3 text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] italic">
                                        <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse shadow-[0_0_10px_rgba(14,165,233,0.5)]" /> ICARUS ACADEMY
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] italic">
                                        <div className="w-2.5 h-2.5 rounded-full bg-brand-800" /> OPPONENT
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Performers Sidebar */}
                        <div className="lg:col-span-4 space-y-10">
                            <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                                <Flame size={14} className="text-lime" /> KEY PLAYER
                            </h4>
                            
                            {stats.topScorer ? (
                                <div className="bg-brand-800 p-10 rounded-[3rem] border border-brand-500/20 shadow-2xl relative overflow-hidden flex flex-col items-center text-center group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={100} className="text-brand-500" /></div>
                                    <div className="relative mb-10">
                                        <img src={stats.topScorer.photoUrl} className="w-32 h-32 rounded-full border-4 border-brand-500 shadow-[0_0_50px_rgba(14,165,233,0.3)] object-cover" />
                                        <div className="absolute -bottom-3 right-0 bg-lime text-brand-950 px-4 py-1.5 rounded-xl text-[10px] font-black shadow-2xl uppercase tracking-tighter italic">TOP FORM</div>
                                    </div>
                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight font-display">{stats.topScorer.fullName}</h3>
                                    <p className="text-[11px] font-bold text-brand-500 uppercase tracking-[0.3em] mt-3 italic">{stats.topScorer.position}</p>
                                    
                                    <div className="w-full grid grid-cols-2 gap-4 mt-12">
                                        <div className="bg-brand-950 p-6 rounded-[1.5rem] border border-white/5 group-hover:border-brand-500/30 transition-all text-center">
                                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2 italic">Goals</p>
                                            <p className="text-4xl font-black text-brand-500 italic leading-none">{stats.topScorer.goals}</p>
                                        </div>
                                        <div className="bg-brand-950 p-6 rounded-[1.5rem] border border-white/5 text-center">
                                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2 italic">Form</p>
                                            <p className="text-xl font-black text-red-500 uppercase italic">Excellent</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-brand-900/50 p-12 rounded-[3rem] border border-white/5 text-center flex flex-col items-center justify-center min-h-[400px]">
                                    <History size={48} className="text-brand-800 mb-6 opacity-30" />
                                    <p className="text-[11px] font-black text-brand-600 uppercase tracking-widest leading-relaxed">No player data available for this opponent.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : selectedOpponent ? (
                /* Scheduled Rival State (No history yet) */
                <div className="bg-brand-900/50 rounded-[4rem] p-32 border-2 border-dashed border-white/5 text-center flex flex-col items-center animate-in zoom-in-95 duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-500/5" />
                    <div className="w-28 h-28 bg-brand-800 rounded-full flex items-center justify-center border-2 border-white/10 shadow-2xl mb-12 relative z-10">
                         <Swords size={48} className="text-brand-500 animate-pulse" />
                    </div>
                    <h3 className="text-4xl font-black text-white italic uppercase tracking-tight relative z-10 leading-none">Awaiting Match: <span className="text-brand-500">{selectedOpponent}</span></h3>
                    <p className="text-brand-400 mt-6 max-w-sm font-medium text-base leading-relaxed relative z-10 tracking-tight">This opponent is in the upcoming schedule. Match statistics will populate automatically once match records are saved.</p>
                    
                    <div className="mt-16 flex gap-4 relative z-10">
                        <button 
                            onClick={() => setSelectedOpponent(null)}
                            className="px-10 py-5 bg-brand-950 border border-white/10 text-brand-500 font-black rounded-full text-[11px] uppercase tracking-[0.3em] hover:text-white transition-all shadow-2xl italic font-display"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-brand-900/50 rounded-[4rem] p-32 border-2 border-dashed border-white/5 text-center flex flex-col items-center animate-in zoom-in-95 duration-500 group">
                    <div className="w-32 h-32 bg-brand-800 rounded-full flex items-center justify-center border-2 border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] mb-12 group-hover:border-brand-500/30 transition-all duration-700">
                         <Swords size={56} className="text-brand-700 group-hover:text-brand-500 transition-all duration-700 group-hover:scale-110" />
                    </div>
                    <h3 className="text-4xl font-black text-white italic uppercase tracking-tight leading-none">Rivalry <span className="text-brand-500">History</span></h3>
                    <p className="text-brand-400 mt-6 max-w-sm font-medium text-base leading-relaxed tracking-tight">Select an opponent below to view match history and head-to-head statistics.</p>
                    
                    <div className="mt-16 flex flex-wrap justify-center gap-4">
                        {opponents.slice(0, 10).map(opp => (
                            <button 
                                key={opp} onClick={() => setSelectedOpponent(opp)}
                                className="px-8 py-4 bg-brand-950 border border-white/10 rounded-2xl text-[11px] font-black text-brand-500 uppercase tracking-widest hover:border-brand-500 hover:bg-brand-500/5 hover:text-white transition-all shadow-xl italic font-display"
                            >
                                {opp}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
