import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Match, ScheduleEvent } from '../types';
import { 
    PlusCircle, Calendar, Trophy, ChevronDown, Save, X, Youtube, 
    PlayCircle, Filter, MonitorPlay, FileJson, UploadCloud, 
    AlertCircle, Check, Users, Shirt, Activity, Clock, 
    MessageSquare, Award, PieChart, TrendingUp, History,
    Flame, Zap, Target, MapPin, Shield, Trash2
} from 'lucide-react';

export const MatchManager: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
    const [settings, setSettings] = useState(StorageService.getSettings());
    const [activeTab, setActiveTab] = useState<'results' | 'fixtures'>('results');
    
    // Live Match Timer State
    const [matchTime, setMatchTime] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    
    // Goal Entry Modal State
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [goalScorerId, setGoalScorerId] = useState<string>('');
    const [goalAssistantId, setGoalAssistantId] = useState<string>('');
    
    // Console Tabs
    const [consoleTab, setConsoleTab] = useState<'tactical' | 'performance'>('tactical');

    // Time helper
    const getRelativeTime = (dateStr: string) => {
        const target = new Date(dateStr);
        const today = new Date();
        today.setHours(0,0,0,0);
        target.setHours(0,0,0,0);
        const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `In ${diffDays} days`;
        return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    // New Match Form State
    const [newMatch, setNewMatch] = useState({
        date: new Date().toISOString().split('T')[0],
        opponent: '',
        result: 'W' as 'W' | 'L' | 'D',
        scoreFor: 0,
        scoreAgainst: 0,
        highlightsUrl: '',
        scheduledEventId: '',
        isLive: false,
        report: '',
        playerOfTheMatchId: '',
        possession: 50,
        shotsOnTarget: 0
    });
    
    const [starters, setStarters] = useState<Set<string>>(new Set());
    const [playerStats, setPlayerStats] = useState<Record<string, { goals: number, assists: number, rating: number }>>({});

    const loadData = () => {
        const sortedMatches = StorageService.getMatches().sort((a,b) => b.date.localeCompare(a.date));
        setMatches(sortedMatches);
        const allPlayers = StorageService.getPlayers();
        setPlayers(allPlayers);
        setScheduleEvents(StorageService.getSchedule().filter(e => e.type === 'match'));
        
        if (allPlayers.length > 0 && Object.keys(playerStats).length === 0) {
             const initialStats: any = {};
             allPlayers.forEach(p => { initialStats[p.id] = { goals: 0, assists: 0, rating: 6 }; });
             setPlayerStats(initialStats);
        }
    };

    useEffect(() => {
        loadData();
        const handleSettingsChange = () => setSettings(StorageService.getSettings());
        window.addEventListener('settingsChanged', handleSettingsChange);
        window.addEventListener('academy_data_update', loadData);
        return () => {
            window.removeEventListener('settingsChanged', handleSettingsChange);
            window.removeEventListener('academy_data_update', loadData);
        };
    }, [playerStats, players]);

    // Match Timer Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setMatchTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    // Sync timer state with active match if it changes externally
    useEffect(() => {
        const match = matches.find(m => m.id === activeMatchId);
        if (match && match.isLive) {
            if (match.timerState) {
                setMatchTime(match.timerState.currentTime || 0);
                setIsTimerRunning(match.timerState.isRunning || false);
            }
        } else {
            setMatchTime(0);
            setIsTimerRunning(false);
        }
    }, [activeMatchId]);

    const formatMatchTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleTimer = async () => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match) return;

        const newRunning = !isTimerRunning;
        setIsTimerRunning(newRunning);
        
        const updatedMatch = {
            ...match,
            timerState: {
                currentTime: matchTime,
                isRunning: newRunning
            }
        };
        await StorageService.updateMatch(updatedMatch);
    };

    const handleRecordGoal = async () => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match || !goalScorerId) return;

        const currentMinute = Math.floor(matchTime / 60) + 1;
        const newEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'goal' as const,
            minute: currentMinute,
            playerId: goalScorerId,
            assistantId: goalAssistantId || undefined
        };

        const updatedMatch = {
            ...match,
            scoreFor: (match.scoreFor || 0) + 1,
            events: [...(match.events || []), newEvent],
            // Also update player stats directly for consistency
            playerStats: match.playerStats.map(ps => {
                if (ps.playerId === goalScorerId) return { ...ps, goals: (ps.goals || 0) + 1 };
                if (goalAssistantId && ps.playerId === goalAssistantId) return { ...ps, assists: (ps.assists || 0) + 1 };
                return ps;
            })
        };

        await StorageService.updateMatch(updatedMatch);
        setShowGoalModal(false);
        setGoalScorerId('');
        setGoalAssistantId('');
        loadData();
    };

    const updatePlayerPerformance = async (playerId: string, updates: { rating?: number, isMOTM?: boolean }) => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match) return;

        const updatedMatch = {
            ...match,
            playerOfTheMatchId: updates.isMOTM ? playerId : (match.playerOfTheMatchId === playerId ? '' : match.playerOfTheMatchId),
            playerStats: match.playerStats.map(ps => {
                if (ps.playerId === playerId) {
                    return {
                        ...ps,
                        rating: updates.rating !== undefined ? updates.rating : ps.rating
                    };
                }
                return ps;
            })
        };

        await StorageService.updateMatch(updatedMatch);
        loadData();
    };

    const handleScheduleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const eventId = e.target.value;
        if (eventId) {
            const event = scheduleEvents.find(ev => ev.id === eventId);
            if (event) {
                let opp = event.title;
                if (opp.toLowerCase().includes(' vs ')) opp = opp.split(' vs ')[1];
                else if (opp.toLowerCase().includes('match against')) opp = opp.split('match against')[1];
                setNewMatch({ ...newMatch, scheduledEventId: eventId, date: event.date, opponent: opp.trim() });
            }
        } else {
            setNewMatch({ ...newMatch, scheduledEventId: '', date: new Date().toISOString().split('T')[0], opponent: '' });
        }
    };

    const toggleStarter = (playerId: string) => {
        setStarters(prev => {
            const next = new Set(prev);
            if (next.has(playerId)) next.delete(playerId);
            else next.add(playerId);
            return next;
        });
    };

    const handleSaveMatch = async () => {
        const statsArray = players.map(p => ({
            playerId: p.id,
            goals: playerStats[p.id]?.goals || 0,
            assists: playerStats[p.id]?.assists || 0,
            rating: playerStats[p.id]?.rating || 6,
            minutesPlayed: 0,
            isStarter: starters.has(p.id)
        }));
        const matchToSave = {
            ...newMatch,
            playerStats: statsArray,
            result: newMatch.scoreFor > newMatch.scoreAgainst ? 'W' : newMatch.scoreFor < newMatch.scoreAgainst ? 'L' : 'D'
        } as any;
        const saved = await StorageService.addMatch(matchToSave);
        if (newMatch.isLive && saved) setActiveMatchId(saved.id);
        setShowForm(false);
        resetForm();
    };

    const resetForm = () => {
        setNewMatch({ 
            date: new Date().toISOString().split('T')[0], opponent: '', result: 'W', 
            scoreFor: 0, scoreAgainst: 0, highlightsUrl: '', scheduledEventId: '',
            isLive: false, report: '', playerOfTheMatchId: '', possession: 50, shotsOnTarget: 0
        });
        setStarters(new Set());
        const resetStats: any = {};
        players.forEach(p => { resetStats[p.id] = { goals: 0, assists: 0, rating: 6 }; });
        setPlayerStats(resetStats);
    };

    const updateLiveMatch = async (updatedMatch: Match) => {
        await StorageService.updateMatch(updatedMatch);
        loadData();
    };

    const finalizeMatch = async (match: Match) => {
        const finalized = { ...match, isLive: false };
        await StorageService.updateMatch(finalized);
        setActiveMatchId(null);
        loadData();
    };

    const handleDeleteMatch = async (id: string) => {
        if (confirm('Delete this match record?')) {
            await StorageService.deleteMatch(id);
            loadData();
        }
    };

    const getYouTubeEmbedUrl = (url: string | undefined) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0` : null;
    };

    const activeMatch = matches.find(m => m.id === activeMatchId);

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700 font-display">
            {/* Header */}
            <div className="glass-card p-10 md:p-14 rounded-[3.5rem] border border-white/20 shadow-[0_20px_50px_rgba(13,27,138,0.3)] relative overflow-hidden group ring-1 ring-white/10">
                <div className="green-light-bar" />
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none select-none group-hover:opacity-[0.1] transition-opacity duration-700">
                    <Activity size={320} className="text-white -mr-16 -mt-16" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
                        <div className="space-y-4">
                            <h1 className="text-5xl sm:text-7xl font-black italic text-white uppercase tracking-tighter leading-none">
                                MATCH <span className="premium-gradient-text">CENTER</span>
                            </h1>
                            <div className="flex items-center gap-4">
                                <span className="w-12 h-[1px] bg-brand-accent/40"></span>
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.5em] italic">
                                    OPERATIONAL FIXTURES · PERFORMANCE MONITORING
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowForm(!showForm)}
                            className={`px-10 py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 italic flex items-center gap-3 shadow-2xl ${showForm ? 'bg-white/10 text-white' : 'bg-brand-accent text-brand-950 hover:scale-[1.05]'}`}
                        >
                            {showForm ? <X size={14} /> : <Zap size={14} />} {showForm ? 'CLOSE BRIEFING' : 'NEW MATCH DEPLOYMENT'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Matches', value: matches.length, icon: <Activity size={18} />, color: '#C3F629' },
                    { label: 'Upcoming', value: scheduleEvents.length, icon: <Zap size={18} />, color: '#60a5fa' },
                    { label: 'Avg Rating', value: '7.8', icon: <Target size={18} />, color: '#f59e0b' },
                    { label: 'Live nodes', value: matches.filter(m => m.isLive).length, icon: <Activity size={18} />, color: '#C3F629', pulse: matches.some(m => m.isLive) }
                ].map((k, i) => (
                    <div key={i} className="glass-card p-8 rounded-[2.5rem] group hover:bg-white/10 hover:border-white/30 transition-all duration-500 shadow-xl relative overflow-hidden">
                        {k.pulse && <div className="green-light-bar" />}
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <div style={{ color: k.color }}>{k.icon}</div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-4">{k.label}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black italic leading-none tracking-tighter text-white group-hover:text-brand-accent transition-colors duration-500">{k.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Live Match Console */}
            {activeMatch && (
                <div className="fixed inset-0 z-[100] lg:relative lg:inset-auto glass-card lg:rounded-[3.5rem] border-0 lg:border border-brand-accent/30 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-1000 bg-brand-950 lg:bg-transparent">
                    <div className="green-light-bar lg:block hidden" />
                    <div className="bg-white/5 px-6 lg:px-8 py-4 flex justify-between items-center border-b border-white/10 sticky top-0 z-20 backdrop-blur-md">
                        <div className="flex items-center gap-2 lg:gap-3 text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] text-red-500 italic">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            LIVE CONSOLE
                        </div>
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mx-2">
                            <button onClick={() => setConsoleTab('tactical')} className={`px-4 lg:px-6 py-2 rounded-lg text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all italic ${consoleTab === 'tactical' ? 'bg-brand-accent text-brand-950 shadow-glow' : 'text-white/40'}`}>TACTICAL</button>
                            <button onClick={() => setConsoleTab('performance')} className={`px-4 lg:px-6 py-2 rounded-lg text-[8px] lg:text-[9px] font-black uppercase tracking-widest transition-all italic ${consoleTab === 'performance' ? 'bg-brand-accent text-brand-950 shadow-glow' : 'text-white/40'}`}>PERF</button>
                        </div>
                        <button onClick={() => setActiveMatchId(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/40"><X size={20}/></button>
                    </div>

                    <div className="p-6 lg:p-14 h-[calc(100vh-64px)] lg:h-auto overflow-y-auto custom-scrollbar">
                        {consoleTab === 'tactical' ? (
                            <div className="flex flex-col gap-8 lg:gap-20">
                                {/* Score & Timer Row */}
                                <div className="flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-24 border-b border-white/5 pb-8 lg:pb-12">
                                    {/* Home Team (Mobile Compact) */}
                                    <div className="flex md:flex-col items-center gap-4 lg:gap-5 group w-full md:w-auto px-4 md:px-0">
                                        <div className="w-12 h-12 lg:w-24 lg:h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:border-brand-accent/50 transition-all shadow-2xl order-1 md:order-1">
                                            <Shirt size={24} className="text-brand-accent lg:hidden" />
                                            <Shirt size={48} className="text-brand-accent hidden lg:block" />
                                        </div>
                                        <h4 className="text-[10px] lg:text-sm font-black text-white uppercase italic tracking-widest order-2 md:order-2">{settings.name}</h4>
                                    </div>

                                    {/* Central Score/Time Unit */}
                                    <div className="flex items-center gap-6 lg:gap-10 w-full justify-center">
                                        {/* Score Home */}
                                        <div className="flex flex-col items-center gap-2 lg:gap-4">
                                            <button onClick={() => setShowGoalModal(true)} className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-brand-accent/10 text-brand-accent flex items-center justify-center hover:bg-brand-accent hover:text-brand-950 transition-all border border-brand-accent/20 shadow-glow"><PlusCircle size={20} /></button>
                                            <div className="text-5xl lg:text-9xl font-black text-white italic leading-none tracking-tighter">{activeMatch.scoreFor || 0}</div>
                                            <button onClick={() => updateLiveMatch({ ...activeMatch, scoreFor: Math.max(0, (activeMatch.scoreFor || 0) - 1) })} className="text-white/20 hover:text-white transition-colors"><ChevronDown size={24} /></button>
                                        </div>

                                        {/* Timer Unit */}
                                        <div className="flex flex-col items-center gap-4 lg:gap-6">
                                            <div className="text-4xl lg:text-6xl font-black text-white/10 italic leading-none hidden md:block">:</div>
                                            <div className="bg-black/60 px-4 lg:px-8 py-3 lg:py-5 rounded-2xl lg:rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center gap-2 lg:gap-3 min-w-[120px] lg:min-w-[160px]">
                                                <div className="text-2xl lg:text-4xl font-mono font-black text-brand-accent tabular-nums tracking-tighter">{formatMatchTime(matchTime)}</div>
                                                <button 
                                                    onClick={toggleTimer}
                                                    className={`w-full py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-widest italic transition-all ${isTimerRunning ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-brand-accent text-brand-950 shadow-glow'}`}
                                                >
                                                    {isTimerRunning ? 'PAUSE' : matchTime === 0 ? 'START' : 'RESUME'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Score Away */}
                                        <div className="flex flex-col items-center gap-2 lg:gap-4">
                                            <button onClick={() => updateLiveMatch({ ...activeMatch, scoreAgainst: (activeMatch.scoreAgainst || 0) + 1 })} className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-white hover:text-brand-950 transition-all border border-white/10 shadow-xl"><PlusCircle size={20} /></button>
                                            <div className="text-5xl lg:text-9xl font-black text-white/40 italic leading-none tracking-tighter">{activeMatch.scoreAgainst || 0}</div>
                                            <button onClick={() => updateLiveMatch({ ...activeMatch, scoreAgainst: Math.max(0, (activeMatch.scoreAgainst || 0) - 1) })} className="text-white/10 hover:text-white transition-colors"><ChevronDown size={24} /></button>
                                        </div>
                                    </div>

                                    {/* Away Team (Mobile Compact) */}
                                    <div className="flex md:flex-col items-center gap-4 lg:gap-5 group w-full md:w-auto px-4 md:px-0 justify-end md:justify-center">
                                        <h4 className="text-[10px] lg:text-sm font-black text-white/40 uppercase italic tracking-widest order-1 md:order-2">{activeMatch.opponent}</h4>
                                        <div className="w-12 h-12 lg:w-24 lg:h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-all shadow-2xl order-2 md:order-1">
                                            <Shield size={24} className="text-white/10 lg:hidden" />
                                            <Shield size={48} className="text-white/10 hidden lg:block" />
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics & Feed Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                                    <div className="lg:col-span-1 space-y-4 lg:space-y-6">
                                        <div className="glass-card p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-white/10 bg-black/20">
                                            <div className="flex justify-between items-center mb-4 lg:mb-6">
                                                <p className="text-[8px] lg:text-[10px] font-black text-white/40 uppercase tracking-[0.2rem] italic">Possession</p>
                                                <span className="text-xl lg:text-2xl font-black text-white italic tabular-nums">{activeMatch.possession || 50}%</span>
                                            </div>
                                            <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <input 
                                                    type="range" 
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                                    min="0" max="100" 
                                                    value={activeMatch.possession || 50} 
                                                    onChange={(e) => updateLiveMatch({ ...activeMatch, possession: parseInt(e.target.value) })} 
                                                />
                                                <div 
                                                    className="absolute top-0 left-0 h-full bg-brand-accent transition-all duration-300"
                                                    style={{ width: `${activeMatch.possession || 50}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-3 text-[7px] lg:text-[8px] font-black text-white/20 uppercase italic tracking-widest">
                                                <span>{settings.name}</span>
                                                <span>{activeMatch.opponent}</span>
                                            </div>
                                        </div>

                                        <div className="glass-card p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-white/10 bg-black/20">
                                            <p className="text-[8px] lg:text-[10px] font-black text-white/40 uppercase tracking-[0.2rem] mb-4 lg:mb-6 italic">Shots on Target</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-4xl lg:text-5xl font-black text-white italic tabular-nums">{activeMatch.shotsOnTarget || 0}</span>
                                                <div className="flex gap-2 lg:gap-3">
                                                    <button onClick={() => updateLiveMatch({...activeMatch, shotsOnTarget: Math.max(0, (activeMatch.shotsOnTarget || 0) - 1)})} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/5 border border-white/10 text-white/20 hover:text-red-500 transition-all flex items-center justify-center"><X size={16}/></button>
                                                    <button onClick={() => updateLiveMatch({...activeMatch, shotsOnTarget: (activeMatch.shotsOnTarget || 0) + 1})} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-brand-950 transition-all shadow-glow flex items-center justify-center"><TrendingUp size={16}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Match Feed */}
                                    <div className="lg:col-span-2 bg-black/40 rounded-[2rem] lg:rounded-[3rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                                        <div className="px-6 lg:px-8 py-4 lg:py-5 bg-white/5 border-b border-white/10 text-[9px] lg:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] lg:tracking-[0.3em] italic flex items-center gap-3">
                                            <Activity size={14} className="text-brand-accent" /> MATCH TIMELINE
                                        </div>
                                        <div className="p-4 lg:p-6 max-h-[250px] lg:max-h-[300px] overflow-y-auto custom-scrollbar space-y-3 lg:space-y-4">
                                            {activeMatch.events && activeMatch.events.length > 0 ? (
                                                activeMatch.events.sort((a,b) => b.minute - a.minute).map(event => (
                                                    <div key={event.id} className="flex items-center justify-between bg-white/5 p-4 lg:p-5 rounded-2xl lg:rounded-[2rem] border border-white/5 hover:border-white/10 transition-all animate-in slide-in-from-right-8 duration-700">
                                                        <div className="flex items-center gap-4 lg:gap-6">
                                                            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-brand-accent text-brand-950 flex items-center justify-center text-base lg:text-lg font-black italic shadow-glow">{event.minute}'</div>
                                                            <div>
                                                                <div className="text-xs lg:text-sm font-black text-white uppercase italic tracking-tight">
                                                                    {players.find(p => p.id === event.playerId)?.fullName}
                                                                    <span className="text-brand-accent ml-2 lg:ml-3">GOAL</span>
                                                                </div>
                                                                {event.assistantId && (
                                                                    <div className="text-[8px] lg:text-[10px] font-bold text-white/30 uppercase italic tracking-widest mt-1">
                                                                        ASST: {players.find(p => p.id === event.assistantId)?.fullName}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Award size={18} className="text-brand-accent animate-pulse" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 lg:py-16 flex flex-col items-center gap-4">
                                                    <Activity size={40} className="text-white/5" />
                                                    <p className="text-[9px] lg:text-[11px] font-bold text-white/10 uppercase tracking-[0.3em] lg:tracking-[0.4em] italic text-center">No tactical events recorded</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <button onClick={() => finalizeMatch(activeMatch)} className="w-full py-6 lg:py-8 bg-brand-accent text-brand-950 rounded-2xl lg:rounded-[2rem] font-black uppercase tracking-[0.3em] lg:tracking-[0.4em] text-[10px] lg:text-sm shadow-glow hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 lg:gap-5 italic border border-brand-accent/20"><Check size={20} /> FINALIZE MATCH DATA</button>
                            </div>
                        ) : (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">SQUAD PERFORMANCE</h3>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mt-2 italic">INDIVIDUAL CONTRIBUTION MONITORING</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-[10px] font-black text-brand-accent uppercase italic border border-brand-accent/30 px-4 py-2 rounded-xl bg-brand-accent/5">
                                            {activeMatch.playerStats.length} NODES TRACKED
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 max-h-[450px] lg:max-h-[500px] overflow-y-auto pr-2 lg:pr-4 custom-scrollbar">
                                    {activeMatch.playerStats.map(ps => {
                                        const player = players.find(p => p.id === ps.playerId);
                                        if (!player) return null;
                                        const isMOTM = activeMatch.playerOfTheMatchId === ps.playerId;

                                        return (
                                            <div key={ps.playerId} className={`glass-card p-4 lg:p-6 rounded-2xl lg:rounded-[2.5rem] border transition-all duration-500 flex flex-col lg:flex-row lg:items-center justify-between group gap-4 ${isMOTM ? 'bg-brand-accent/10 border-brand-accent shadow-glow' : 'border-white/10 bg-black/20'}`}>
                                                <div className="flex items-center gap-4 lg:gap-6">
                                                    <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-full flex items-center justify-center border transition-all ${isMOTM ? 'bg-brand-accent border-brand-accent' : 'bg-white/5 border-white/10'}`}>
                                                        <Shirt size={20} className={isMOTM ? 'text-brand-950' : 'text-white/20'} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className={`text-xs lg:text-sm font-black uppercase italic tracking-tight ${isMOTM ? 'text-brand-accent' : 'text-white'}`}>{player.fullName}</h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-[8px] lg:text-[9px] font-bold text-white/20 uppercase italic">{ps.goals}G</span>
                                                            <span className="w-1 h-1 bg-white/10 rounded-full" />
                                                            <span className="text-[8px] lg:text-[9px] font-bold text-white/20 uppercase italic">{ps.assists}A</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between lg:justify-end gap-4 lg:gap-8 border-t lg:border-t-0 border-white/5 pt-3 lg:pt-0">
                                                    <div className="flex flex-col items-center lg:items-center gap-1 lg:gap-2 flex-1 lg:flex-none">
                                                        <p className="text-[7px] lg:text-[8px] font-black text-white/30 uppercase italic tracking-widest">Rating</p>
                                                        <div className="flex items-center gap-2 lg:gap-3 w-full lg:w-auto">
                                                            <input 
                                                                type="range" min="1" max="10" step="0.5" 
                                                                value={ps.rating || 6} 
                                                                onChange={(e) => updatePlayerPerformance(ps.playerId, { rating: parseFloat(e.target.value) })}
                                                                className="flex-1 lg:w-20 accent-brand-accent"
                                                            />
                                                            <span className="text-xs lg:text-sm font-black text-white italic w-6 lg:w-8 text-center">{ps.rating || 6}</span>
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={() => updatePlayerPerformance(ps.playerId, { isMOTM: !isMOTM })}
                                                        className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center transition-all ${isMOTM ? 'bg-brand-accent text-brand-950 shadow-glow' : 'bg-white/5 text-white/20 border border-white/10'}`}
                                                    >
                                                        <Trophy size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button onClick={() => setConsoleTab('tactical')} className="w-full py-4 lg:py-6 bg-white/5 text-white/60 rounded-xl lg:rounded-[2rem] font-black uppercase tracking-[0.2em] lg:tracking-[0.4em] text-[10px] hover:bg-white/10 transition-all border border-white/10 italic">RETURN TO CONSOLE</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Tabs */}
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="bg-white/5 p-2 rounded-[2.5rem] border border-white/10 flex w-fit shadow-2xl backdrop-blur-xl">
                        {['results', 'fixtures'].map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3 italic ${activeTab === tab ? 'bg-brand-accent text-brand-950 shadow-glow' : 'text-white/40 hover:text-white/60'}`}>
                                {tab === 'results' ? <History size={16} /> : <Calendar size={16} />}
                                {tab === 'results' ? 'MATCH RESULTS' : 'UPCOMING FIXTURES'}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 max-w-md space-y-2">
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-[0.3em] flex items-center gap-3">
                            {activeTab === 'results' ? <History className="text-brand-accent" size={24} /> : <Calendar className="text-brand-accent" size={24} />}
                            {activeTab === 'results' ? 'MATCH HISTORY' : 'FIXTURE PIPELINE'}
                        </h2>
                        <div className="h-[2px] w-32 bg-brand-accent/40 rounded-full" />
                    </div>
                </div>

                {/* List Container */}
                <div className="grid grid-cols-1 gap-6">
                    {activeTab === 'results' ? (
                        matches.map(m => (
                            <div key={m.id} className="glass-card p-10 rounded-[3rem] border border-white/10 hover:border-brand-accent/40 transition-all duration-500 group relative overflow-hidden">
                                {m.isLive && <div className="green-light-bar" />}
                                <div className="flex flex-col lg:flex-row items-center gap-12">
                                    <div className="flex flex-col items-center lg:items-start min-w-[140px] border-r border-white/5 lg:pr-12">
                                        <p className="text-[9px] font-black text-brand-accent uppercase tracking-[0.4em] mb-2 italic">#{m.date.split('-')[0]}</p>
                                        <div className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-4">{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                        <div className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.3em] italic border ${m.result === 'W' ? 'bg-brand-accent text-brand-950 border-brand-accent' : m.result === 'L' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-white/40 border-white/10'}`}>{m.result === 'W' ? 'WIN' : m.result === 'L' ? 'LOSS' : 'DRAW'}</div>
                                    </div>

                                    <div className="flex-1 flex flex-col md:flex-row items-center justify-between w-full gap-8">
                                        <div className="flex-1 text-center md:text-right">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] italic mb-3">HOME TEAM</p>
                                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tight truncate">{settings.name}</h3>
                                        </div>

                                        <div className="bg-black/40 px-10 py-6 rounded-[2.5rem] border border-white/10 font-mono text-5xl font-black text-white shadow-2xl flex items-center gap-8 relative overflow-hidden group/score">
                                            <div className="absolute inset-0 bg-brand-accent/5 group-hover/score:bg-brand-accent/10 transition-colors" />
                                            <span className={m.result === 'W' ? 'text-brand-accent italic' : 'text-white'}>{m.scoreFor}</span>
                                            <span className="text-white/10">:</span>
                                            <span className="text-white/40">{m.scoreAgainst}</span>
                                        </div>

                                        <div className="flex-1 text-center md:text-left">
                                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] italic mb-3">AWAY TEAM</p>
                                            <h3 className="text-2xl font-black text-white/40 italic uppercase tracking-tight group-hover:text-white transition-all truncate">{m.opponent}</h3>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        {m.highlightsUrl && (
                                            <button 
                                                onClick={() => setSelectedVideo(getYouTubeEmbedUrl(m.highlightsUrl))} 
                                                className="w-16 h-16 flex items-center justify-center bg-white/5 text-brand-accent border border-white/10 rounded-[1.5rem] hover:bg-brand-accent hover:text-brand-950 transition-all shadow-2xl group/btn"
                                            >
                                                <Youtube size={24} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setActiveMatchId(m.id)} 
                                            className="w-16 h-16 flex items-center justify-center bg-white text-brand-950 rounded-[1.5rem] hover:scale-110 transition-all shadow-glow group/btn"
                                        >
                                            <MonitorPlay size={24} className="group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteMatch(m.id)}
                                            className="w-16 h-16 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-[1.5rem] transition-all"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        scheduleEvents.sort((a,b) => a.date.localeCompare(b.date)).map(ev => (
                            <div key={ev.id} className="glass-card p-8 rounded-[2.5rem] border border-white/10 flex flex-col lg:flex-row items-center justify-between group relative overflow-hidden gap-8 transition-all hover:border-brand-accent/30">
                                <div className="flex items-center gap-10">
                                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex flex-col items-center justify-center border border-white/10 group-hover:border-brand-accent transition-all">
                                        <p className="text-[10px] font-black text-brand-accent uppercase italic leading-none mb-1">{new Date(ev.date).toLocaleDateString(undefined, { month: 'short' })}</p>
                                        <p className="text-3xl font-black text-white italic leading-none">{new Date(ev.date).getDate()}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-4 mb-3">
                                            <span className="px-3 py-1.5 bg-brand-accent text-brand-950 text-[9px] font-black uppercase tracking-widest rounded-lg italic">{getRelativeTime(ev.date)}</span>
                                            <div className="flex items-center gap-2 text-white/40 font-black text-[9px] uppercase tracking-widest italic"><Clock size={14} /> {ev.time}</div>
                                        </div>
                                        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter group-hover:text-brand-accent transition-all">{ev.title}</h3>
                                        <div className="flex items-center gap-3 text-white/20 font-bold text-xs mt-2 italic"><MapPin size={14} /> {ev.location}</div>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    let opp = ev.title;
                                    if (opp.toLowerCase().includes(' vs ')) opp = opp.split(' vs ')[1];
                                    setNewMatch({ ...newMatch, scheduledEventId: ev.id, date: ev.date, opponent: (opp || '').trim(), isLive: true });
                                    setShowForm(true);
                                }} className="px-10 py-5 bg-white text-brand-950 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-glow hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-3 italic"><Zap size={18} fill="currentColor" /> START MATCH</button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Match Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-10 bg-brand-950/90 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-brand-900/40 rounded-[3.5rem] border border-white/10 shadow-3xl overflow-hidden relative my-auto">
                        <div className="green-light-bar" />
                        <div className="px-8 sm:px-14 py-8 sm:py-12 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">NEW_MATCH_DEPLOYMENT</h3>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] mt-2 italic">STRATEGIC PARAMETER SETUP</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white"><X size={24} /></button>
                        </div>

                        <div className="p-8 sm:p-14 space-y-12">
                            <div className="flex items-center justify-between p-6 rounded-[2rem] bg-black/40 border border-white/5">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest italic leading-none">LIVE TRACKING</p>
                                        <p className="text-[9px] font-bold text-white/30 uppercase mt-1">ENABLE REAL-TIME STATS UPDATES</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setNewMatch({...newMatch, isLive: !newMatch.isLive})}
                                    className={`w-16 h-8 rounded-full p-1.5 transition-all flex items-center ${newMatch.isLive ? 'bg-red-500' : 'bg-white/10'}`}
                                >
                                    <div className={`h-5 w-5 rounded-full bg-white transition-all transform ${newMatch.isLive ? 'translate-x-8' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">SCHEDULE SYNC</label>
                                    <select 
                                        className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all appearance-none"
                                        value={newMatch.scheduledEventId}
                                        onChange={handleScheduleSelect}
                                    >
                                        <option value="">-- MANUAL ENTRY --</option>
                                        {scheduleEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">MATCH DATE</label>
                                    <input 
                                        type="date" 
                                        value={newMatch.date} 
                                        onChange={e => setNewMatch({...newMatch, date: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">OPPONENT IDENTITY</label>
                                    <input 
                                        type="text" 
                                        placeholder="TARGET TEAM NAME..." 
                                        value={newMatch.opponent} 
                                        onChange={e => setNewMatch({...newMatch, opponent: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all tracking-widest placeholder:text-white/10"
                                    />
                                </div>
                            </div>

                            <section className="space-y-8">
                                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic flex items-center gap-3">
                                        <Shirt size={18} className="text-brand-accent" /> TACTICAL DEPLOYMENT (11)
                                    </h4>
                                    <span className={`text-[10px] font-black px-6 py-2 rounded-xl transition-all ${starters.size === 11 ? 'bg-brand-accent text-brand-950 shadow-glow' : 'bg-white/5 text-white/40'}`}>
                                        {starters.size} / 11 NOMINATED
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
                                    {players.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => toggleStarter(p.id)}
                                            className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-4 group ${starters.has(p.id) ? 'bg-brand-accent/10 border-brand-accent' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${starters.has(p.id) ? 'bg-brand-accent border-brand-accent' : 'border-white/10 group-hover:border-white/30'}`}>
                                                {starters.has(p.id) && <Check size={12} className="text-brand-950" strokeWidth={4} />}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase italic tracking-tight truncate ${starters.has(p.id) ? 'text-brand-accent' : 'text-white/40 group-hover:text-white'}`}>
                                                {p.fullName}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                <button onClick={() => setShowForm(false)} className="px-10 py-6 text-white/40 font-black hover:text-white hover:bg-white/5 transition-all text-[10px] uppercase tracking-[0.3em] italic rounded-2xl">ABORT OPERATION</button>
                                <button 
                                    onClick={handleSaveMatch}
                                    className={`flex-1 py-6 font-black rounded-2xl transition-all flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.3em] italic ${newMatch.isLive ? 'bg-red-500 text-white shadow-2xl' : 'bg-brand-accent text-brand-950 shadow-glow'}`}
                                >
                                    <Save size={20} /> {newMatch.isLive ? 'COMMENCE LIVE TRACKING' : 'ARCHIVE MATCH DATA'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Goal Entry Modal */}
            {showGoalModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-brand-950/90 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full max-w-2xl bg-brand-900/40 rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden relative">
                        <div className="green-light-bar" />
                        <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">RECORD_GOAL_EVENT</h3>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mt-2 italic">MATCH_TIME: {formatMatchTime(matchTime)}</p>
                            </div>
                            <button onClick={() => setShowGoalModal(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40"><X size={24} /></button>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">SELECT_SCORER</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all appearance-none"
                                    value={goalScorerId}
                                    onChange={e => setGoalScorerId(e.target.value)}
                                >
                                    <option value="">-- SELECT PLAYER --</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">SELECT_ASSISTANT (OPTIONAL)</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all appearance-none"
                                    value={goalAssistantId}
                                    onChange={e => setGoalAssistantId(e.target.value)}
                                >
                                    <option value="">-- NO ASSIST --</option>
                                    {players.filter(p => p.id !== goalScorerId).map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                </select>
                            </div>

                            <button 
                                onClick={handleRecordGoal}
                                disabled={!goalScorerId}
                                className="w-full py-6 bg-brand-accent text-brand-950 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 italic disabled:opacity-30 disabled:hover:scale-100"
                            >
                                <Award size={20} /> CONFIRM GOAL DATA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Player Overlay */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-8 bg-brand-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full max-w-6xl aspect-video bg-black rounded-[4rem] overflow-hidden shadow-[0_0_100px_rgba(0,200,255,0.2)] border border-white/10 relative">
                        <button onClick={() => setSelectedVideo(null)} className="absolute top-10 right-10 z-10 p-5 bg-brand-950/80 text-white rounded-[2rem] hover:bg-brand-accent hover:text-brand-950 transition-all shadow-2xl border border-white/10">
                            <X size={32}/>
                        </button>
                        <iframe src={selectedVideo} className="w-full h-full" title="Match Highlights" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                </div>
            )}
        </div>
    );
};
