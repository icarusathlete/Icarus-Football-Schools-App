import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Shield, Search, X, UserCheck, Activity, Brain, Zap } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';

export const SquadComparison: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);

    useEffect(() => {
        setPlayers(StorageService.getPlayers());
    }, []);

    const togglePlayer = (player: Player) => {
        if (selectedPlayers.find(p => p.id === player.id)) {
            setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
        } else {
            if (selectedPlayers.length >= 3) {
                alert('You can compare a maximum of 3 players at once.');
                return;
            }
            setSelectedPlayers([...selectedPlayers, player]);
        }
    };

    const searchResults = players.filter(p => 
        (p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
         p.position.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !selectedPlayers.find(selected => selected.id === p.id)
    ).slice(0, 5);

    const getMetrics = (player: Player) => {
        const base = 50;
        const isFwd = player.position.toLowerCase() === 'forward';
        const isMid = player.position.toLowerCase() === 'midfielder';
        const isDef = player.position.toLowerCase() === 'defender';

        return {
            Pace: base + (isFwd ? 30 : isMid ? 20 : isDef ? 10 : -10) + Math.random() * 10,
            Shooting: base + (isFwd ? 35 : isMid ? 20 : isDef ? 0 : -30) + Math.random() * 10,
            Passing: base + (isMid ? 35 : isFwd ? 10 : isDef ? 15 : 0) + Math.random() * 10,
            Defending: base + (isDef ? 35 : isMid ? 15 : isFwd ? -10 : 20) + Math.random() * 10,
            Physical: base + (isDef ? 30 : isFwd ? 10 : isMid ? 10 : 20) + Math.random() * 10,
            Mental: base + 20 + Math.random() * 10,
        };
    };

    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (selectedPlayers.length === 0) {
            setChartData([]);
            return;
        }

        const metricsList = ['Pace', 'Shooting', 'Passing', 'Defending', 'Physical', 'Mental'];
        const pScores = selectedPlayers.map(p => ({ p, scores: getMetrics(p) }));

        const data = metricsList.map(metric => {
            const dataPoint: any = { subject: metric };
            pScores.forEach(ps => {
                dataPoint[ps.p.fullName] = Math.round(ps.scores[metric as keyof typeof ps.scores]);
            });
            return dataPoint;
        });

        setChartData(data);
    }, [selectedPlayers]);

    // Summer Camp 2026 Comparison Palette: Sky Blue, Lime Punch, Vibrant Violet
    const colors = ['#0EA5E9', '#BEF264', '#8B5CF6'];

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-display">
            <PageHeader 
                title="SQUAD COMPARISON" 
                subtitle="Select up to 3 players for performance comparison."
                extra={
                    <div className="px-5 py-2.5 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/20 text-[#CCFF00] text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 italic animate-pulse">
                        <Brain size={16} className="text-[#CCFF00]"/> Player Analysis
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Col: Selector */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-brand-800 p-8 rounded-[3rem] shadow-2xl border border-white/5 relative overflow-hidden h-full flex flex-col">
                        <div className="relative mb-8">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 w-5 h-5" />
                            <input 
                                type="text"
                                placeholder="Search remaining players..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-brand-950 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-brand-700 outline-none focus:border-brand-500 transition-all font-display italic text-sm"
                            />
                        </div>

                        {/* Search Results */}
                        {searchTerm && (
                            <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto custom-scrollbar">
                                <p className="text-[8px] font-black text-brand-600 uppercase tracking-widest ml-1 mb-2">Available Players</p>
                                {searchResults.map(p => (
                                    <div key={p.id} onClick={() => togglePlayer(p)} className="flex items-center justify-between p-4 rounded-2xl bg-brand-950/50 border border-transparent hover:border-brand-500/30 cursor-pointer transition-all group shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <img src={p.photoUrl} className="w-10 h-10 rounded-full object-cover border-2 border-white/10 group-hover:border-brand-500/50 transition-colors" />
                                            <div>
                                                <div className="text-sm font-black text-white uppercase italic tracking-tight group-hover:text-brand-500 transition-colors">{p.fullName}</div>
                                                <div className="text-[10px] text-brand-500 font-bold uppercase tracking-widest">{p.position}</div>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500"><Zap size={14} fill="currentColor"/></div>
                                    </div>
                                ))}
                                {searchResults.length === 0 && <div className="text-brand-600 text-center text-[10px] font-black uppercase py-8 italic">No matching signals found.</div>}
                            </div>
                        )}

                        <div className="border-t border-white/5 pt-8 flex-1">
                            <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-6 ml-1 italic">SELECTED PLAYERS ({selectedPlayers.length}/3)</h3>
                            <div className="space-y-4">
                                {selectedPlayers.map((p, idx) => (
                                    <div key={p.id} className="relative bg-brand-950 p-5 rounded-2xl border border-white/5 flex items-center gap-5 overflow-hidden group shadow-xl">
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{backgroundColor: colors[idx]}} />
                                        <img src={p.photoUrl} className="w-14 h-14 rounded-full object-cover border-2 border-white/10" />
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-white uppercase italic tracking-tight">{p.fullName}</div>
                                            <div className="text-[10px] text-brand-500 font-bold uppercase tracking-widest">{p.position}</div>
                                        </div>
                                        <button onClick={() => togglePlayer(p)} className="p-3 text-brand-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}
                                {selectedPlayers.length === 0 && (
                                    <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-[2rem] text-brand-700 flex flex-col items-center gap-4 bg-brand-950/20 shadow-inner">
                                        <UserCheck size={32} className="opacity-20" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Compare Players</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Radar Chart */}
                <div className="lg:col-span-8">
                    <div className="bg-brand-800 p-10 rounded-[3rem] shadow-2xl border border-white/5 h-full flex flex-col min-h-[600px] relative overflow-hidden">
                        {/* Tactical Background Effect */}
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px' }} />
                        
                        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 relative z-10">
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                                <Shield className="text-brand-500" size={28}/> 
                                PERFORMANCE <span className="text-brand-500/20">RADAR</span>
                            </h2>
                            <div className="flex flex-wrap items-center justify-center gap-6 bg-brand-950/50 px-6 py-3 rounded-2xl border border-white/10">
                                {selectedPlayers.map((p, i) => (
                                    <div key={p.id} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white italic">
                                        <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{backgroundColor: colors[i], color: colors[i]}} />
                                        {p.fullName.split(' ')[0]}
                                    </div>
                                ))}
                                {selectedPlayers.length === 0 && <span className="text-[10px] font-black text-brand-700 uppercase tracking-widest italic">Awaiting selection...</span>}
                            </div>
                        </div>

                        {selectedPlayers.length > 0 ? (
                            <div className="flex-1 min-h-[450px] relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                        <PolarGrid stroke="#1e293b" strokeWidth={1} />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900, letterSpacing: '0.1em' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#030712', border: '1px solid #1e293b', borderRadius: '16px', padding: '12px', fontSize: '11px', fontWeight: 'bold' }}
                                            itemStyle={{ paddingBottom: '4px' }}
                                        />
                                        {selectedPlayers.map((p, idx) => (
                                            <Radar 
                                                key={p.id}
                                                name={p.fullName} 
                                                dataKey={p.fullName} 
                                                stroke={colors[idx]} 
                                                fill={colors[idx]} 
                                                fillOpacity={0.15} 
                                                strokeWidth={3}
                                            />
                                        ))}
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-brand-700 relative">
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                                     <ResponsiveContainer width="100%" height="100%" id="demo-radar-placeholder">
                                         <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[{subject:'Pace', A:50},{subject:'Shooting', A:60},{subject:'Passing', A:40},{subject:'Physical', A:70},{subject:'Mental', A:50}]}>
                                            <PolarGrid stroke="white" />
                                            <Radar name="Demo" dataKey="A" stroke="white" fill="white" />
                                        </RadarChart>
                                     </ResponsiveContainer>
                                </div>
                                <div className="relative z-10 flex flex-col items-center bg-brand-950/20 p-12 rounded-[3.5rem] backdrop-blur-md border border-white/5 shadow-2xl">
                                    <Activity size={64} className="mb-6 text-brand-500 opacity-20 animate-pulse" />
                                    <p className="font-black text-white text-2xl uppercase italic tracking-tighter">No Comparison Data</p>
                                    <p className="text-sm mt-3 text-brand-600 font-medium uppercase tracking-widest italic">Select players to compare.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
