import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Match, ScheduleEvent, MatchEvent, AttendanceRecord, AttendanceStatus } from '../types';
import { 
    PlusCircle, Calendar, Trophy, ChevronDown, Save, X, Youtube, 
    PlayCircle, Filter, MonitorPlay, FileJson, UploadCloud, 
    AlertCircle, Check, Users, Shirt, Activity, Clock, 
    MessageSquare, Award, PieChart, TrendingUp, History,
    Flame, Zap, Target, MapPin, Shield, Trash2, RefreshCw, ArrowRight,
    Star, Plus, Minus, Search, Play
} from 'lucide-react';
import { PageHeader } from './ui/PageHeader';

const HUDCircularGauge: React.FC<{ rating: number, size?: number }> = ({ rating, size = 120 }) => {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (rating / 10) * circumference;
    
    const getColor = (r: number) => {
        if (r >= 8.5) return '#C3F629';
        if (r >= 7.0) return '#FFFFFF';
        if (r >= 5.5) return 'rgba(255,255,255,0.6)';
        return '#F87171';
    };

    const color = getColor(rating);

    return (
        <div className="relative flex items-center justify-center group/gauge transition-all duration-500" style={{ width: size, height: size }}>
            {/* Background Ring */}
            <svg className="absolute inset-0 -rotate-90 w-full h-full overflow-visible">
                <circle
                    cx={size/2}
                    cy={size/2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={strokeWidth}
                />
                {/* Decorative Segmented Ring */}
                <circle
                    cx={size/2}
                    cy={size/2}
                    r={radius + 4}
                    fill="none"
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth={1}
                    strokeDasharray="2, 4"
                />
                {/* Progress Ring */}
                <circle
                    cx={size/2}
                    cy={size/2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: rating >= 8.5 ? `drop-shadow(0 0 8px ${color})` : 'none' }}
                />
            </svg>
            
            {/* Center Rating */}
            <div className="flex flex-col items-center justify-center z-10">
                <span className={`text-4xl font-black italic tracking-tighter transition-all duration-500 ${rating >= 8.5 ? 'scale-110' : ''}`} style={{ color }}>
                    {rating.toFixed(1)}
                </span>
                <div className="h-[1px] w-8 bg-white/10 my-1" />
                <span className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em]">SCORE</span>
            </div>

            {/* Tactical Hexagon Overlay (Subtle) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover/gauge:opacity-[0.08] transition-opacity">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="white" />
                </svg>
            </div>
        </div>
    );
};

export const MatchManager: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
    const [settings, setSettings] = useState(StorageService.getSettings());
    const [activeTab, setActiveTab] = useState<'results' | 'fixtures'>('results');
    const [searchTerm, setSearchTerm] = useState('');
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    
    // Live Match Timer State
    const [matchTime, setMatchTime] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    
    // Goal Entry Modal State
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [showCardModal, setShowCardModal] = useState<{type: 'yellow_card' | 'red_card'} | null>(null);
    const [showSubModal, setShowSubModal] = useState(false);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedGoalScorer, setSelectedGoalScorer] = useState('');
    const [selectedAssistant, setSelectedAssistant] = useState('');
    const [selectedCardPlayer, setSelectedCardPlayer] = useState('');
    const [selectedSubOut, setSelectedSubOut] = useState('');
    const [selectedSubIn, setSelectedSubIn] = useState('');
    
    // Console State
    const [consoleTab, setConsoleTab] = useState<'tactical' | 'performance'>('tactical');
    const [selectedRatingPlayerId, setSelectedRatingPlayerId] = useState<string | null>(null);
    const [selectedMatchDetails, setSelectedMatchDetails] = useState<Match | null>(null);
    const [editingHighlightsUrl, setEditingHighlightsUrl] = useState('');
    const [isUpdatingHighlights, setIsUpdatingHighlights] = useState(false);
    const [matrixSort, setMatrixSort] = useState<'rating' | 'name' | 'impact'>('name');
    const [flashPlayerId, setFlashPlayerId] = useState<string | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        setAttendance(StorageService.getAttendance());
        
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
    }, []);

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

    const handleAddGoal = () => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match || !selectedGoalScorer) return;
        const newEvent: MatchEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'goal',
            minute: Math.floor(matchTime / 60) + 1,
            playerId: selectedGoalScorer,
            assistantId: selectedAssistant || undefined
        };
        const updatedEvents = [...(match.events || []), newEvent];
        const updatedStats = match.playerStats.map(ps => {
            if (ps.playerId === selectedGoalScorer) return { ...ps, goals: (ps.goals || 0) + 1 };
            if (ps.playerId === selectedAssistant) return { ...ps, assists: (ps.assists || 0) + 1 };
            return ps;
        });
        updateLiveMatch({ ...match, scoreFor: (match.scoreFor || 0) + 1, events: updatedEvents, playerStats: updatedStats });
        setShowGoalModal(false); setSelectedGoalScorer(''); setSelectedAssistant('');
    };

    const handleAddCard = (type: 'yellow_card' | 'red_card') => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match || !selectedCardPlayer) return;
        const newEvent: MatchEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            minute: Math.floor(matchTime / 60) + 1,
            playerId: selectedCardPlayer
        };
        updateLiveMatch({ ...match, events: [...(match.events || []), newEvent] });
        setShowCardModal(null); setSelectedCardPlayer('');
    };

    const handleAddSub = () => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match || !selectedSubOut || !selectedSubIn) return;
        const newEvent: MatchEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'substitution',
            minute: Math.floor(matchTime / 60) + 1,
            playerId: selectedSubOut,
            subOutId: selectedSubOut,
            subInId: selectedSubIn
        };
        updateLiveMatch({ ...match, events: [...(match.events || []), newEvent] });
        setShowSubModal(false); setSelectedSubOut(''); setSelectedSubIn('');
    };

    const updatePlayerPerformance = (playerId: string, updates: { rating?: number, isMOTM?: boolean }) => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match) return;

        // Check attendance if trying to set as MOTM
        if (updates.isMOTM) {
            const date = new Date(match.date).toISOString().split('T')[0];
            const isAbsent = attendance.find(a => a.playerId === playerId && a.date === date)?.status === 'ABSENT';
            if (isAbsent) {
                // Flash the player row or show a subtle notification would be better than an alert, 
                // but alert is effective for immediate feedback
                alert("ACTION_DENIED: CANNOT_AWARD_MOTM_TO_ABSENT_PLAYER");
                return;
            }
        }

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

        // Optimistic UI Update
        setMatches(prev => prev.map(m => m.id === activeMatchId ? updatedMatch : m));

        // Debounced Storage Update
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        if (updates.rating !== undefined) {
            setFlashPlayerId(playerId);
            setTimeout(() => setFlashPlayerId(null), 400);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            await StorageService.updateMatch(updatedMatch);
        }, 1000);
    };

    const batchUpdateRatings = (rating: number) => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match) return;

        const updatedMatch = {
            ...match,
            playerStats: match.playerStats.map(ps => ({ ...ps, rating }))
        };

        setMatches(prev => prev.map(m => m.id === activeMatchId ? updatedMatch : m));

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            await StorageService.updateMatch(updatedMatch);
        }, 1000);
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

    const handleAddAttendance = async (playerId: string, status: AttendanceStatus) => {
        if (!activeMatch) return;
        
        const date = new Date(activeMatch.date).toISOString().split('T')[0];
        const record: AttendanceRecord = {
            id: `${date}_${playerId}`,
            playerId,
            date,
            status,
            notes: `Recorded during match vs ${activeMatch.opponent}`
        };

        try {
            await StorageService.saveAttendanceBatch([record]);
            setShowAttendanceModal(false);
        } catch (error) {
            console.error('Failed to record attendance:', error);
        }
    };

    const handleUpdateHighlights = async () => {
        if (!selectedMatchDetails) return;
        
        setIsUpdatingHighlights(true);
        try {
            const updatedMatch = {
                ...selectedMatchDetails,
                highlightsUrl: editingHighlightsUrl
            };
            await StorageService.updateMatch(updatedMatch);
            setSelectedMatchDetails(updatedMatch);
            // Show a temporary success state or notification would be good here
        } catch (error) {
            console.error("Failed to update highlights:", error);
            alert("FAILED_TO_UPDATE_HIGHLIGHTS");
        } finally {
            setIsUpdatingHighlights(false);
        }
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

    // Effect to sync editing state when match details are selected
    useEffect(() => {
        if (selectedMatchDetails) {
            setEditingHighlightsUrl(selectedMatchDetails.highlightsUrl || '');
        }
    }, [selectedMatchDetails]);

    const getYouTubeEmbedUrl = (url: string | undefined) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0` : null;
    };

    const activeMatch = matches.find(m => m.id === activeMatchId);

    const sortedStats = useMemo(() => {
        if (!activeMatch) return [];
        return [...activeMatch.playerStats].sort((a, b) => {
            if (matrixSort === 'rating') return (b.rating || 0) - (a.rating || 0);
            if (matrixSort === 'name') {
                const pA = players.find(p => p.id === a.playerId)?.fullName || '';
                const pB = players.find(p => p.id === b.playerId)?.fullName || '';
                return pA.localeCompare(pB);
            }
            if (matrixSort === 'impact') {
                const impactA = (a.goals || 0) * 3 + (a.assists || 0) * 2 + (activeMatch.playerOfTheMatchId === a.playerId ? 5 : 0);
                const impactB = (b.goals || 0) * 3 + (b.assists || 0) * 2 + (activeMatch.playerOfTheMatchId === b.playerId ? 5 : 0);
                return impactB - impactA;
            }
            return 0;
        });
    }, [activeMatch, matrixSort, players]);

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700 font-display">
            {/* Header */}
            <PageHeader 
                title="MATCH CENTER"
                subtitle="Operational fixtures and strategic performance monitoring"
                extra={
                    <button 
                        onClick={() => setShowForm(!showForm)}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 italic flex items-center gap-3 shadow-2xl ${showForm ? 'bg-white/10 text-white' : 'bg-brand-accent text-brand-950 hover:scale-[1.05]'}`}
                    >
                        {showForm ? <X size={14} /> : <Zap size={14} />} {showForm ? 'CLOSE BRIEFING' : 'NEW MATCH DEPLOYMENT'}
                    </button>
                }
            />

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

            {/* Tactical Search & Filter Row */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500/40 group-focus-within:text-brand-accent transition-colors" />
                    <input 
                        type="text" 
                        placeholder={activeTab === 'results' ? "FILTER MATCH RECORDS..." : "SCAN FIXTURE PIPELINE..."}
                        className="w-full pl-14 pr-6 py-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl outline-none focus:bg-brand-500/10 focus:border-brand-accent/30 transition-all text-[10px] font-black uppercase tracking-[0.2em] text-white placeholder:text-white/20 shadow-2xl italic"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/5 border border-brand-500/10">
                    <Filter size={12} className="text-brand-accent" />
                    <span className="text-[9px] font-black text-brand-500/60 uppercase tracking-widest italic">
                        {activeTab === 'results' ? 'ARCHIVE_ACCESS_GRANTE' : 'PIPELINE_SYNCHRONIZED'}
                    </span>
                </div>
            </div>

            {/* Live Match Console */}
            {activeMatch && (
                <div className="fixed inset-0 z-[100] lg:relative lg:inset-auto glass-card lg:rounded-[3.5rem] border-0 lg:border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in slide-in-from-bottom-12 duration-1000 bg-brand-950 lg:bg-[#0A0D14]/80 backdrop-blur-3xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 via-transparent to-brand-primary/5 pointer-events-none" />
                    <div className="green-light-bar lg:block hidden" />
                    
                    <div className="bg-white/5 px-6 lg:px-10 py-6 flex justify-between items-center border-b border-white/5 sticky top-0 z-20 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-500 italic">
                                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                                LIVE_FEED
                            </div>
                            <span className="h-4 w-[1px] bg-white/10 hidden sm:block" />
                            <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">
                                STATUS: <span className="text-brand-accent">OPERATIONAL</span>
                            </div>
                        </div>

                        {/* Desktop Tab Switcher */}
                        <div className="hidden md:flex bg-black/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-2xl shadow-inner">
                            {['tactical', 'performance'].map((tab) => (
                                <button 
                                    key={tab} 
                                    onClick={() => setConsoleTab(tab as any)}
                                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 italic flex items-center gap-3 ${consoleTab === tab ? 'bg-brand-accent text-brand-950 shadow-[0_0_25px_rgba(195,246,41,0.4)] scale-105' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                                >
                                    {tab === 'tactical' ? <Activity size={14} /> : <Award size={14} />}
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="hidden xl:flex flex-col items-end">
                                <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{settings.name}</h2>
                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest italic">ACADEMY_NODE_01</p>
                            </div>
                            <button onClick={() => setActiveMatchId(null)} className="p-3 hover:bg-red-500/20 hover:text-red-400 rounded-2xl transition-all duration-300 text-white/20 border border-transparent hover:border-red-500/20">
                                <X size={20}/>
                            </button>
                        </div>
                    </div>

                    <div className="p-6 lg:p-14 h-[calc(100vh-80px)] lg:h-auto overflow-y-auto custom-scrollbar relative z-10">
                        <div className="flex flex-col gap-10 lg:gap-16 max-w-6xl mx-auto">
                            {/* Score & Timer Row - Always Visible */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-10 lg:gap-20 relative">
                                {/* Home Team */}
                                <div className="flex md:flex-col items-center gap-6 group w-full md:w-1/3 px-4 md:px-0">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-brand-accent/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                        <div className="w-16 h-16 lg:w-28 lg:h-28 bg-[#1A1F26] rounded-3xl flex items-center justify-center border border-white/10 group-hover:border-brand-accent/50 transition-all duration-500 shadow-3xl relative z-10 rotate-3 group-hover:rotate-0">
                                            {settings.logoUrl ? (
                                                <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 lg:w-16 lg:h-16 object-contain" />
                                            ) : (
                                                <Shirt size={48} className="text-brand-accent" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-left md:text-center space-y-1 flex-1 min-w-0">
                                        <h4 className="text-[11px] lg:text-xs font-black text-white uppercase italic tracking-[0.3em] group-hover:text-brand-accent transition-colors truncate">{settings.name}</h4>
                                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest italic">HOME_SQUAD</p>
                                    </div>
                                </div>

                                {/* Score/Time Unit */}
                                <div className="flex items-center gap-4 lg:gap-14 w-full md:w-auto justify-center">
                                    <div className="flex flex-col items-center gap-4 group">
                                        <div className="text-5xl lg:text-9xl font-black text-white italic leading-none tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all group-hover:scale-110">{activeMatch.scoreFor || 0}</div>
                                        <button 
                                            onClick={() => updateLiveMatch({ ...activeMatch, scoreFor: Math.max(0, (activeMatch.scoreFor || 0) - 1) })} 
                                            className="p-2 hover:bg-white/10 rounded-full text-white/10 hover:text-white transition-all"
                                        >
                                            <ChevronDown size={24} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-center gap-6 min-w-[120px] lg:min-w-[220px]">
                                        <div className="relative group/timer">
                                            <div className="absolute -inset-4 bg-brand-accent/5 blur-2xl rounded-full opacity-0 group-hover/timer:opacity-100 transition-opacity" />
                                            <div className="text-3xl lg:text-6xl font-mono font-black text-brand-accent tabular-nums tracking-tight drop-shadow-[0_0_20px_rgba(195,246,41,0.3)]">
                                                {formatMatchTime(matchTime)}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={toggleTimer} 
                                            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] italic transition-all duration-500 flex items-center justify-center gap-3 border shadow-2xl ${isTimerRunning ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' : 'bg-brand-accent text-brand-950 border-brand-accent/20 shadow-[0_10px_30px_rgba(195,246,41,0.2)] hover:scale-[1.05]'}`}
                                        >
                                            {isTimerRunning ? <X size={14} /> : <Zap size={14} />}
                                            {isTimerRunning ? 'HALT_TIME' : matchTime === 0 ? 'START_CLOCK' : 'RESUME_CLOCK'}
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-center gap-4 group">
                                        <div className="text-5xl lg:text-9xl font-black text-white/20 italic leading-none tracking-tighter transition-all group-hover:text-white/40 group-hover:scale-110">{activeMatch.scoreAgainst || 0}</div>
                                        <button 
                                            onClick={() => updateLiveMatch({ ...activeMatch, scoreAgainst: Math.max(0, (activeMatch.scoreAgainst || 0) - 1) })} 
                                            className="p-2 hover:bg-white/10 rounded-full text-white/10 hover:text-white transition-all"
                                        >
                                            <ChevronDown size={24} />
                                        </button>
                                    </div>
                                </div>

                                {/* Away Team */}
                                <div className="flex md:flex-col items-center gap-6 group w-full md:w-1/3 px-4 md:px-0 justify-end md:justify-center">
                                    <div className="text-right md:text-center space-y-1 order-1 md:order-2 flex-1 min-w-0">
                                        <h4 className="text-[11px] lg:text-xs font-black text-white/40 uppercase italic tracking-[0.3em] group-hover:text-white/70 transition-colors truncate">{activeMatch.opponent}</h4>
                                        <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest italic">VISITING_SIDE</p>
                                    </div>
                                    <div className="w-16 h-16 lg:w-28 lg:h-28 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-all duration-500 shadow-xl order-2 md:order-1 -rotate-3 group-hover:rotate-0">
                                        <Shield size={48} className="text-white/10 group-hover:text-white/20 transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Tab Switcher */}
                            <div className="flex md:hidden bg-black/60 p-1.5 rounded-[2rem] border border-white/10 backdrop-blur-2xl w-full">
                                {['tactical', 'performance'].map((tab) => (
                                    <button 
                                        key={tab} 
                                        onClick={() => setConsoleTab(tab as any)}
                                        className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 italic flex items-center justify-center gap-3 ${consoleTab === tab ? 'bg-brand-accent text-brand-950 shadow-glow' : 'text-white/40'}`}
                                    >
                                        {tab === 'tactical' ? <Activity size={16} /> : <Award size={16} />}
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {consoleTab === 'tactical' ? (
                                <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                                    {/* Unified Action Grid - Broadcast Switcher Style */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                        <button 
                                            onClick={() => setShowGoalModal(true)} 
                                            className="group relative overflow-hidden bg-brand-accent/5 hover:bg-brand-accent transition-all duration-500 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-brand-accent/20 hover:border-brand-accent flex flex-col items-center gap-4 shadow-2xl"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-brand-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="w-14 h-14 rounded-2xl bg-brand-950/40 flex items-center justify-center text-brand-accent group-hover:bg-brand-950 group-hover:scale-110 transition-all duration-500 shadow-glow relative z-10">
                                                <PlusCircle size={28} />
                                            </div>
                                            <div className="text-center relative z-10">
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] italic group-hover:text-brand-950 transition-colors">RECORD_GOAL</p>
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1 group-hover:text-brand-950/40 transition-colors">UNIT_STRIKE_CONFIRM</p>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => setShowCardModal({type: 'yellow_card'})} 
                                            className="group relative overflow-hidden bg-amber-500/5 hover:bg-amber-500 transition-all duration-500 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-amber-500/20 hover:border-amber-500 flex flex-col items-center gap-4 shadow-2xl"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="w-14 h-14 rounded-2xl bg-brand-950/40 flex items-center justify-center text-amber-500 group-hover:bg-white group-hover:scale-110 transition-all duration-500 relative z-10">
                                                <div className="w-5 h-7 bg-amber-500 rounded-sm shadow-xl" />
                                            </div>
                                            <div className="text-center relative z-10">
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] italic group-hover:text-white transition-colors">YELLOW_CARD</p>
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1 group-hover:text-white/40 transition-colors">DISCIPLINARY_LOG_01</p>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => setShowCardModal({type: 'red_card'})} 
                                            className="group relative overflow-hidden bg-red-500/5 hover:bg-red-500 transition-all duration-500 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-red-500/20 hover:border-red-500 flex flex-col items-center gap-4 shadow-2xl"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="w-14 h-14 rounded-2xl bg-brand-950/40 flex items-center justify-center text-red-500 group-hover:bg-white group-hover:scale-110 transition-all duration-500 relative z-10">
                                                <div className="w-5 h-7 bg-red-500 rounded-sm shadow-xl" />
                                            </div>
                                            <div className="text-center relative z-10">
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] italic group-hover:text-white transition-colors">RED_CARD</p>
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1 group-hover:text-white/40 transition-colors">DISCIPLINARY_LOG_02</p>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => setShowSubModal(true)} 
                                            className="group relative overflow-hidden bg-brand-primary/5 hover:bg-brand-primary transition-all duration-500 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-brand-primary/20 hover:border-brand-primary flex flex-col items-center gap-4 shadow-2xl"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="w-14 h-14 rounded-2xl bg-brand-950/40 flex items-center justify-center text-brand-primary group-hover:bg-brand-950 group-hover:scale-110 transition-all duration-500 shadow-glow relative z-10">
                                                <RefreshCw size={28} />
                                            </div>
                                            <div className="text-center relative z-10">
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] italic group-hover:text-brand-950 transition-colors">EXECUTE_SUB</p>
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1 group-hover:text-brand-950/40 transition-colors">TACTICAL_ROTATION</p>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => setShowAttendanceModal(true)} 
                                            className="col-span-2 lg:col-span-4 group relative overflow-hidden bg-white/5 hover:bg-white transition-all duration-500 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-white/10 hover:border-white flex flex-col items-center gap-4 shadow-2xl"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="w-14 h-14 rounded-2xl bg-brand-950/40 flex items-center justify-center text-white group-hover:bg-brand-950 group-hover:scale-110 transition-all duration-500 relative z-10">
                                                <Users size={28} />
                                            </div>
                                            <div className="text-center relative z-10">
                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] italic group-hover:text-brand-950 transition-colors">RECORD_ATTENDANCE</p>
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1 group-hover:text-brand-950/40 transition-colors">MATCHDAY_ROLLCALL</p>
                                            </div>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        {/* Refined Timeline */}
                                        <div className="bg-black/40 rounded-[3rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl relative">
                                            <div className="absolute top-24 bottom-10 left-12 w-[1px] bg-gradient-to-b from-brand-accent/40 via-white/5 to-transparent hidden sm:block" />
                                            
                                            <div className="px-10 py-8 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Activity size={18} className="text-brand-accent" />
                                                    <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">EVENT_CHRONICLE</p>
                                                </div>
                                                <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest italic">REAL_TIME_FEED</div>
                                            </div>

                                            <div className="p-8 max-h-[500px] overflow-y-auto custom-scrollbar space-y-6 relative z-10">
                                                {activeMatch.events && activeMatch.events.length > 0 ? (
                                                    activeMatch.events.sort((a,b) => b.minute - a.minute).map(event => (
                                                        <div key={event.id} className="flex items-center gap-8 group animate-in slide-in-from-right-4 duration-500">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black italic relative z-10 shrink-0 border transition-all duration-500 ${
                                                                event.type === 'goal' ? 'bg-brand-accent text-brand-950 border-brand-accent shadow-glow' : 
                                                                event.type === 'yellow_card' ? 'bg-amber-500 text-white border-amber-500' : 
                                                                event.type === 'red_card' ? 'bg-red-500 text-white border-red-500' : 
                                                                'bg-brand-primary text-brand-950 border-brand-primary'
                                                            }`}>
                                                                {event.minute}'
                                                            </div>
                                                            
                                                            <div className="flex-1 bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all group/card relative overflow-hidden">
                                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-20 transition-opacity">
                                                                    {event.type === 'goal' && <Trophy size={40} />}
                                                                    {event.type === 'substitution' && <RefreshCw size={40} />}
                                                                    {(event.type === 'yellow_card' || event.type === 'red_card') && <Shield size={40} />}
                                                                </div>
                                                                
                                                                <div className="flex items-center justify-between relative z-10">
                                                                    <div>
                                                                        <h5 className="text-[10px] font-black text-white uppercase tracking-wider italic mb-1">
                                                                            {players.find(p => p.id === event.playerId)?.fullName}
                                                                        </h5>
                                                                        <div className={`text-[8px] font-bold uppercase tracking-[0.2em] italic ${
                                                                            event.type === 'goal' ? 'text-brand-accent' : 
                                                                            event.type === 'yellow_card' ? 'text-amber-500' : 
                                                                            event.type === 'red_card' ? 'text-red-500' : 
                                                                            'text-brand-primary'
                                                                        }`}>
                                                                            {event.type.split('_').join(' ')} RECORDED
                                                                        </div>
                                                                    </div>
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <ArrowRight size={14} className="text-white/20" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-24 opacity-10">
                                                        <Activity size={64} strokeWidth={1} className="mb-6" />
                                                        <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">NO_OPERATIONAL_DATA</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Premium Archive Section */}
                                        <div className="flex flex-col gap-6">
                                            <div className="glass-card p-12 rounded-[3.5rem] border border-brand-accent/10 bg-brand-accent/5 flex flex-col items-center justify-center gap-10 text-center relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                                <div className="w-24 h-24 bg-brand-accent/10 rounded-full flex items-center justify-center shadow-glow relative z-10 border border-brand-accent/20">
                                                    <Check size={48} className="text-brand-accent" />
                                                </div>
                                                <div className="relative z-10">
                                                    <h4 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-3">ARCHIVE_PROTOCOL</h4>
                                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest italic max-w-[240px] mx-auto leading-relaxed">
                                                        SYNC ALL TACTICAL EVENTS AND PERFORMANCE METRICS TO SECURE DATABASE.
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => finalizeMatch(activeMatch)} 
                                                    className="w-full py-8 bg-brand-accent text-brand-950 rounded-2xl font-black uppercase tracking-[0.5em] text-xs shadow-glow hover:scale-[1.02] active:scale-95 transition-all italic border border-brand-accent/20 relative z-10"
                                                >
                                                    EXECUTE FINAL_SYNC
                                                </button>
                                            </div>

                                            <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                        <Shield size={18} className="text-white/20" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">SECURITY_STATUS</p>
                                                        <p className="text-[10px] font-black text-emerald-400 uppercase italic">ENCRYPTED</p>
                                                    </div>
                                                </div>
                                                <div className="h-8 w-[1px] bg-white/5" />
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">NODE_ID</p>
                                                    <p className="text-[10px] font-black text-white uppercase italic">ATHLETE_CRM_01</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                                    {/* Matrix Header & Batch Controls */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-10 bg-brand-accent rounded-full shadow-glow" />
                                            <div>
                                                <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic leading-none mb-2">TACTICAL_PERFORMANCE_MATRIX</p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{activeMatch.playerStats.length} SQUAD NODES ACTIVE</span>
                                                    <div className="w-1 h-1 bg-white/10 rounded-full" />
                                                    <span className="text-[8px] font-bold text-brand-accent uppercase tracking-widest italic animate-pulse">MONITORING_LIVE</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4">
                                            {/* Sort Selectors */}
                                            <div className="bg-black/40 p-1 rounded-xl border border-white/10 flex items-center">
                                                {[
                                                    { id: 'name', label: 'NAME', icon: <Users size={12}/> },
                                                    { id: 'rating', label: 'RATING', icon: <TrendingUp size={12}/> },
                                                    { id: 'impact', label: 'IMPACT', icon: <Zap size={12}/> }
                                                ].map(s => (
                                                    <button 
                                                        key={s.id}
                                                        onClick={() => setMatrixSort(s.id as any)}
                                                        className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${matrixSort === s.id ? 'bg-brand-accent text-brand-950 shadow-glow' : 'text-white/30 hover:text-white/60'}`}
                                                    >
                                                        {s.icon} {s.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="h-6 w-[1px] bg-white/10 mx-2 hidden md:block" />

                                            {/* Mood Presets */}
                                            <div className="flex items-center gap-2">
                                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic mr-2">PRESETS:</p>
                                                {[
                                                    { val: 6.0, label: 'SOLID', color: 'hover:bg-white/10' },
                                                    { val: 7.5, label: 'DOMINANT', color: 'hover:bg-brand-accent/20 hover:text-brand-accent' },
                                                    { val: 8.5, label: 'ELITE', color: 'hover:bg-brand-accent hover:text-brand-950 shadow-glow' }
                                                ].map(p => (
                                                    <button 
                                                        key={p.val}
                                                        onClick={() => batchUpdateRatings(p.val)}
                                                        className={`px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black text-white/40 uppercase tracking-widest italic transition-all ${p.color}`}
                                                    >
                                                        {p.label} {p.val}
                                            </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Matrix Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
                                        {sortedStats.map(ps => {
                                            const player = players.find(p => p.id === ps.playerId);
                                            if (!player) return null;
                                            
                                            // Check if player is absent for this match date
                                            const matchDate = activeMatch.date;
                                            const isAbsent = attendance.some(a => 
                                                a.playerId === ps.playerId && 
                                                a.date === matchDate && 
                                                a.status === AttendanceStatus.ABSENT
                                            );

                                            const isMOTM = activeMatch.playerOfTheMatchId === ps.playerId;
                                            const rating = ps.rating || 6.0;
                                            
                                            const getRatingGlow = (r: number) => {
                                                if (isAbsent) return 'border-red-500/20 bg-red-500/[0.02] opacity-60';
                                                if (r >= 8.5) return 'performance-pulse shadow-[0_0_40px_rgba(195,246,41,0.2)] border-brand-accent/50';
                                                if (r >= 7.0) return 'shadow-[0_0_20px_rgba(255,255,255,0.05)] border-white/20';
                                                if (r < 5) return 'shadow-[0_0_30px_rgba(239,68,68,0.1)] border-red-500/20';
                                                return 'border-white/10';
                                            };

                                            return (
                                                <div 
                                                    key={ps.playerId}
                                                    className={`glass-card p-6 rounded-[2.5rem] border bg-white/5 transition-all duration-500 flex flex-col gap-5 group relative overflow-hidden ${getRatingGlow(rating)} ${isMOTM ? 'bg-brand-accent/5 border-brand-accent/40 shadow-[0_0_50px_rgba(195,246,41,0.1)]' : 'hover:bg-white/10'}`}
                                                >
                                                    {/* Neon Flash Overlay */}
                                                    <div className={`neon-flash-overlay ${flashPlayerId === ps.playerId ? 'animate-neon-flash' : ''}`} />

                                                    {/* Background ID Pattern */}
                                                    <div className="absolute -top-4 -right-4 text-[40px] font-black text-white/[0.02] italic tracking-tighter pointer-events-none group-hover:text-white/[0.05] transition-colors">
                                                        {player.fullName.split(' ').map(n => n[0]).join('')}
                                                    </div>

                                                    <div className="flex justify-between items-start relative z-10">
                                                        <div className="flex items-center gap-4">
                                                            {/* Player Avatar with HUD Reticles */}
                                                            <div className="hud-reticle-container">
                                                                <div className="hud-reticle-corner corner-tl" />
                                                                <div className="hud-reticle-corner corner-tr" />
                                                                <div className="hud-reticle-corner corner-bl" />
                                                                <div className="hud-reticle-corner corner-br" />
                                                                
                                                                {player.photoUrl ? (
                                                                    <img 
                                                                        src={player.photoUrl} 
                                                                        alt={player.fullName}
                                                                        className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-2xl relative z-10"
                                                                    />
                                                                ) : (
                                                                    <div className="w-14 h-14 rounded-2xl avatar-fallback text-xl relative z-10">
                                                                        {player.fullName.split(' ').map(n => n[0]).join('')}
                                                                    </div>
                                                                )}
                                                                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-brand-accent text-brand-950 text-[7px] font-black rounded-md shadow-glow italic border border-brand-accent/50 z-20">
                                                                    {player.position || 'N/A'}
                                                                </div>
                                                            </div>
                                                            
                                                            <div>
                                                                <p className="text-[11px] font-black text-white uppercase italic tracking-tight leading-tight mb-1">{player.fullName}</p>
                                                                <div className="flex items-center gap-2">
                                                                    {(ps.goals || 0) > 0 && (
                                                                        <div className="stats-badge stats-badge-goal">
                                                                            <Target size={8} /> {ps.goals}G
                                                                        </div>
                                                                    )}
                                                                    {(ps.assists || 0) > 0 && (
                                                                        <div className="stats-badge stats-badge-assist">
                                                                            <Zap size={8} /> {ps.assists}A
                                                                        </div>
                                                                    )}
                                                                    {(ps.goals || 0) === 0 && (ps.assists || 0) === 0 && (
                                                                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest italic">STEADY_SYNC</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button 
                                                            onClick={() => {
                                                                if (isAbsent) return;
                                                                updateLiveMatch({ ...activeMatch, playerOfTheMatchId: isMOTM ? null : ps.playerId });
                                                            }}
                                                            disabled={isAbsent}
                                                            className={`p-2.5 rounded-xl transition-all duration-500 border ${isMOTM ? 'bg-brand-accent text-brand-950 border-brand-accent shadow-glow' : isAbsent ? 'bg-red-500/10 text-red-500/40 border-red-500/20 cursor-not-allowed' : 'bg-white/5 text-white/20 border-white/10 hover:text-brand-accent hover:border-brand-accent/40'}`}
                                                        >
                                                            {isAbsent ? <X size={14} /> : <Star size={14} fill={isMOTM ? "currentColor" : "none"} />}
                                                        </button>
                                                    </div>

                                                    {/* Cyber-HUD Circular Gauge */}
                                                    <div className="flex flex-col items-center py-2 relative group/rating">
                                                        <HUDCircularGauge rating={rating} />
                                                        <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.4em] italic mt-4 group-hover:text-brand-accent/40 transition-colors">LIVE_PERFORMANCE_HUD</p>
                                                    </div>

                                                    {/* Interaction Row */}
                                                    <div className="grid grid-cols-2 gap-3 relative z-10">
                                                        <button 
                                                            onClick={() => updatePlayerPerformance(ps.playerId, { rating: Math.max(1, rating - 0.5) })}
                                                            className="flex items-center justify-center py-4 bg-black/40 hover:bg-red-500/20 border border-white/5 hover:border-red-500/40 rounded-2xl text-white/40 hover:text-red-400 transition-all active:scale-90 group/btn"
                                                        >
                                                            <Minus size={18} className="group-hover/btn:scale-125 transition-transform" />
                                                        </button>
                                                        <button 
                                                            onClick={() => updatePlayerPerformance(ps.playerId, { rating: Math.min(10, rating + 0.5) })}
                                                            className="flex items-center justify-center py-4 bg-black/40 hover:bg-brand-accent/20 border border-white/5 hover:border-brand-accent/40 rounded-2xl text-white/40 hover:text-brand-accent transition-all active:scale-90 group/btn"
                                                        >
                                                            <Plus size={18} className="group-hover/btn:scale-125 transition-transform" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
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
                        matches.length === 0 ? (
                            <div className="glass-card p-20 rounded-[3rem] border border-white/5 text-center flex flex-col items-center gap-6">
                                <Trophy size={60} className="text-white/5" />
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] italic">No strategic records found</p>
                            </div>
                        ) : (
                            matches
                                .filter(m => 
                                    m.opponent.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    m.date.includes(searchTerm)
                                )
                                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                                <div 
                                    key={m.id} 
                                    onClick={() => setSelectedMatchDetails(m)}
                                    className="glass-card p-4 lg:p-6 rounded-2xl lg:rounded-[2rem] border border-white/5 hover:border-brand-accent/30 transition-all duration-300 group cursor-pointer flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-6"
                                >
                                    <div className="flex items-center gap-4 lg:gap-10 w-full lg:w-auto">
                                        <div className="flex flex-col items-center min-w-[60px] lg:min-w-[90px] border-r border-white/5 pr-4 lg:pr-6 shrink-0">
                                            <p className="text-[7px] font-black text-brand-accent uppercase tracking-widest italic mb-1">{m.date.split('-')[0]}</p>
                                            <div className="text-sm lg:text-xl font-black text-white italic uppercase tracking-tighter leading-none">{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                        </div>
                                        
                                        <div className="flex-1 flex items-center gap-2 lg:gap-8 overflow-hidden min-w-0">
                                            <div className="text-right flex-1 min-w-0">
                                                <h4 className="text-[9px] lg:text-[10px] font-black text-white/60 uppercase tracking-tight truncate">{settings.name}</h4>
                                            </div>
                                            <div className="flex items-center gap-1.5 lg:gap-3 shrink-0 font-mono font-black italic shadow-2xl px-3 py-1.5 bg-white/5 rounded-lg text-white/80">
                                                <span>{m.scoreFor}</span>
                                                <span className="opacity-20">-</span>
                                                <span>{m.scoreAgainst}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[9px] lg:text-[10px] font-black text-white/30 uppercase tracking-tight truncate group-hover:text-white/60 transition-colors">{m.opponent}</h4>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                                        {m.highlightsUrl && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedVideo(getYouTubeEmbedUrl(m.highlightsUrl)); }} 
                                                className="h-9 lg:h-10 px-3 lg:px-4 flex items-center justify-center bg-white/5 text-brand-accent border border-white/10 rounded-xl hover:bg-brand-accent hover:text-brand-950 transition-all group/btn"
                                            >
                                                <Play size={16} fill="currentColor" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setActiveMatchId(m.id); }} 
                                            className="h-9 lg:h-10 px-3 lg:px-4 flex items-center justify-center bg-white/5 text-white/40 border border-white/5 rounded-xl hover:bg-brand-accent hover:text-brand-950 transition-all group/btn text-[8px] font-black uppercase tracking-widest italic"
                                        >
                                            <MonitorPlay size={16} className="mr-2" /> RE-OPEN
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteMatch(m.id); }}
                                            className="h-9 lg:h-10 px-3 lg:px-4 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        scheduleEvents
                            .filter(ev => 
                                ev.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                ev.location.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .sort((a,b) => a.date.localeCompare(b.date)).map(ev => (
                            <div key={ev.id} className="glass-card p-8 rounded-[2.5rem] border border-white/10 flex flex-col lg:flex-row items-center justify-between group relative overflow-hidden gap-8 transition-all hover:border-brand-accent/30">
                                <div className="flex items-center gap-10">
                                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/5 rounded-2xl lg:rounded-3xl flex flex-col items-center justify-center border border-white/10 group-hover:border-brand-accent transition-all shrink-0">
                                        <p className="text-[8px] lg:text-[10px] font-black text-brand-accent uppercase italic leading-none mb-1">{new Date(ev.date).toLocaleDateString(undefined, { month: 'short' })}</p>
                                        <p className="text-2xl lg:text-3xl font-black text-white italic leading-none">{new Date(ev.date).getDate()}</p>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-3 lg:gap-4 mb-2 lg:mb-3">
                                            <span className="px-2 py-1 lg:px-3 lg:py-1.5 bg-brand-accent text-brand-950 text-[8px] lg:text-[9px] font-black uppercase tracking-widest rounded-lg italic shrink-0">{getRelativeTime(ev.date)}</span>
                                            <div className="flex items-center gap-1.5 text-white/40 font-black text-[8px] lg:text-[9px] uppercase tracking-widest italic shrink-0"><Clock size={12} /> {ev.time}</div>
                                        </div>
                                        <h3 className="text-xl lg:text-3xl font-black text-white italic uppercase tracking-tighter group-hover:text-brand-accent transition-all truncate">{ev.title}</h3>
                                        <div className="flex items-center gap-2 lg:gap-3 text-white/20 font-bold text-[10px] lg:text-xs mt-1 lg:mt-2 italic truncate"><MapPin size={12} /> {ev.location}</div>
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
                                    {players.filter(p => {
                                        const date = new Date(newMatch.date).toISOString().split('T')[0];
                                        return !attendance.some(a => a.playerId === p.id && a.date === date && a.status === AttendanceStatus.ABSENT);
                                    }).map(p => (
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
                                    value={selectedGoalScorer}
                                    onChange={e => setSelectedGoalScorer(e.target.value)}
                                >
                                    <option value="">-- SELECT PLAYER --</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">SELECT_ASSISTANT (OPTIONAL)</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all appearance-none"
                                    value={selectedAssistant}
                                    onChange={e => setSelectedAssistant(e.target.value)}
                                >
                                    <option value="">-- NO ASSIST --</option>
                                    {players.filter(p => p.id !== selectedGoalScorer).map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                </select>
                            </div>

                            <button 
                                onClick={handleAddGoal}
                                disabled={!selectedGoalScorer}
                                className="w-full py-6 bg-brand-accent text-brand-950 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 italic disabled:opacity-30 disabled:hover:scale-100"
                            >
                                <Award size={20} /> CONFIRM GOAL DATA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedVideo && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 sm:p-6 bg-brand-950/98 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full max-w-[100vw] sm:max-w-screen-2xl aspect-video bg-black rounded-none sm:rounded-3xl overflow-hidden shadow-[0_0_150px_rgba(0,200,255,0.3)] border-0 sm:border border-white/10 relative group">
                        <button 
                            onClick={() => setSelectedVideo(null)} 
                            className="absolute top-4 right-4 sm:top-8 sm:right-8 z-20 p-3 sm:p-5 bg-brand-950/80 text-white rounded-2xl hover:bg-brand-accent hover:text-brand-950 transition-all shadow-2xl border border-white/10 hover:scale-110 active:scale-95"
                        >
                            <X size={20} className="sm:hidden" />
                            <X size={32} className="hidden sm:block" />
                        </button>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <iframe 
                            src={`${selectedVideo}?autoplay=1&rel=0&modestbranding=1`} 
                            className="w-full h-full relative z-10" 
                            title="Match Highlights" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen 
                        />
                    </div>
                </div>
            )}

            {/* Attendance Modal */}
            {showAttendanceModal && activeMatch && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-brand-950/90 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full max-w-2xl bg-brand-900/60 rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden relative">
                        <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">ATTENDANCE_LOG</h3>
                                <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.4em] mt-2 italic">MATCHDAY_ROLLCALL</p>
                            </div>
                            <button onClick={() => setShowAttendanceModal(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40"><X size={24} /></button>
                        </div>

                        <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                            {players.map(player => {
                                const date = new Date(activeMatch.date).toISOString().split('T')[0];
                                const record = attendance.find(a => a.playerId === player.id && a.date === date);
                                const isAbsent = record?.status === 'ABSENT';

                                return (
                                    <div key={player.id} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                                        <div>
                                            <p className="text-sm font-black text-white uppercase italic">{player.fullName}</p>
                                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">ID: {player.memberId}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleAddAttendance(player.id, AttendanceStatus.PRESENT)}
                                                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${!isAbsent ? 'bg-emerald-500 text-white shadow-glow' : 'bg-white/5 text-white/40 border border-white/10'}`}
                                            >
                                                PRESENT
                                            </button>
                                            <button 
                                                onClick={() => handleAddAttendance(player.id, AttendanceStatus.ABSENT)}
                                                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${isAbsent ? 'bg-red-500 text-white shadow-glow' : 'bg-white/5 text-white/40 border border-white/10'}`}
                                            >
                                                ABSENT
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            {/* Card Modal */}
            {showCardModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-brand-950/90 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className={`w-full max-w-md rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden relative ${showCardModal.type === 'yellow_card' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full ${showCardModal.type === 'yellow_card' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        
                        <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">DISCIPLINARY_LOG</h3>
                                <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic ${showCardModal.type === 'yellow_card' ? 'text-amber-500' : 'text-red-500'}`}>
                                    {showCardModal.type.replace('_', ' ')}
                                </p>
                            </div>
                            <button onClick={() => setShowCardModal(null)} className="p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40"><X size={24} /></button>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="flex justify-center py-6">
                                <div className={`w-20 h-28 rounded-xl shadow-2xl rotate-12 transition-transform duration-700 group-hover:rotate-0 ${showCardModal.type === 'yellow_card' ? 'bg-amber-500' : 'bg-red-500'}`} />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">SELECT_OPERATIVE</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all appearance-none"
                                    value={selectedCardPlayer}
                                    onChange={(e) => setSelectedCardPlayer(e.target.value)}
                                >
                                    <option value="">-- SELECT PLAYER --</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                </select>
                            </div>

                            <button 
                                onClick={() => handleAddCard(showCardModal.type)}
                                disabled={!selectedCardPlayer}
                                className={`w-full py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-4 italic shadow-2xl ${
                                    !selectedCardPlayer ? 'bg-white/5 text-white/20 border-white/5' : 
                                    showCardModal.type === 'yellow_card' ? 'bg-amber-500 text-white hover:scale-[1.02]' : 
                                    'bg-red-500 text-white hover:scale-[1.02]'
                                }`}
                            >
                                <Shield size={20} /> CONFIRM_DISCIPLINE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Substitution Modal */}
            {showSubModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-brand-950/90 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full max-w-2xl bg-brand-900/40 rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary/40" />
                        
                        <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">TACTICAL_SEQUENCE_SWAP</h3>
                                <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.4em] mt-2 italic">PERSONNEL_RECONFIGURATION</p>
                            </div>
                            <button onClick={() => setShowSubModal(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40"><X size={24} /></button>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative">
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-brand-950 border border-white/10 flex items-center justify-center z-10 hidden md:flex">
                                    <RefreshCw size={20} className="text-brand-primary animate-spin-slow" />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] italic ml-1">EXIT_OPERATIVE</label>
                                    <select 
                                        className="w-full bg-red-500/5 border border-red-500/20 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-red-500 transition-all appearance-none"
                                        value={selectedSubOut}
                                        onChange={(e) => setSelectedSubOut(e.target.value)}
                                    >
                                        <option value="">-- SELECT OUT --</option>
                                        {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] italic ml-1">ENTRY_OPERATIVE</label>
                                    <select 
                                        className="w-full bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-emerald-500 transition-all appearance-none"
                                        value={selectedSubIn}
                                        onChange={(e) => setSelectedSubIn(e.target.value)}
                                    >
                                        <option value="">-- SELECT IN --</option>
                                        {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button 
                                onClick={handleAddSub}
                                disabled={!selectedSubOut || !selectedSubIn}
                                className="w-full py-6 bg-brand-primary text-brand-950 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 italic disabled:opacity-30 disabled:hover:scale-100"
                            >
                                <RefreshCw size={20} /> EXECUTE_SUBSTITUTION
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Match Highlights Detail Modal */}
            {selectedMatchDetails && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-brand-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full max-w-2xl bg-brand-900/60 rounded-[2rem] sm:rounded-[3.5rem] border border-white/10 shadow-3xl overflow-hidden relative flex flex-col max-h-[90vh]">
                        <div className="green-light-bar" />
                        <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent border border-brand-accent/20">
                                    <Activity size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">TACTICAL_BREAKDOWN</h3>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mt-2 italic">
                                        {new Date(selectedMatchDetails.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMatchDetails(null)} className="p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white"><X size={24} /></button>
                        </div>

                        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12">
                            {/* Score Overview */}
                             <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] items-center gap-6 sm:gap-10 py-10 sm:py-12 px-6 sm:px-14 rounded-[2.5rem] sm:rounded-[4rem] bg-black/40 border border-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 via-transparent to-brand-primary/5 opacity-50" />
                                
                                <div className="text-center sm:text-left relative z-10 w-full min-w-0">
                                    <p className="text-[9px] font-black text-brand-primary uppercase tracking-[0.3em] mb-2 sm:mb-4 italic">HOME_SQUAD</p>
                                    <h4 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight leading-none break-words sm:line-clamp-2">{settings.name}</h4>
                                </div>

                                <div className="flex flex-col items-center gap-3 relative z-10 shrink-0">
                                    <div className="text-5xl sm:text-7xl font-black text-white italic tracking-tighter flex items-center gap-5">
                                        <span className={selectedMatchDetails.scoreFor > selectedMatchDetails.scoreAgainst ? 'text-brand-accent drop-shadow-[0_0_15px_rgba(195,246,41,0.5)]' : 'text-white'}>{selectedMatchDetails.scoreFor}</span>
                                        <span className="text-white/10 text-3xl sm:text-5xl">:</span>
                                        <span className={selectedMatchDetails.scoreAgainst > selectedMatchDetails.scoreFor ? 'text-brand-accent drop-shadow-[0_0_15px_rgba(195,246,41,0.5)]' : 'text-white'}>{selectedMatchDetails.scoreAgainst}</span>
                                    </div>
                                    <div className="px-5 py-1.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.5em] italic">FINAL_SCORE</span>
                                    </div>
                                </div>
                                
                                <div className="text-center sm:text-right relative z-10 w-full min-w-0">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 sm:mb-4 italic">VISITING_SIDE</p>
                                    <h4 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight leading-none break-words sm:line-clamp-2 px-6 sm:px-0 bg-white/5 sm:bg-transparent py-3 sm:py-0 rounded-2xl sm:rounded-none border sm:border-0 border-white/5">{selectedMatchDetails.opponent}</h4>
                                </div>
                            </div>

                            {/* Timeline Feed */}
                            <div className="space-y-8">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-4">
                                        <Zap size={18} className="text-brand-accent animate-pulse" />
                                        <p className="text-[11px] font-black text-white uppercase tracking-[0.4em] italic">MATCH_CHRONICLE</p>
                                    </div>
                                    <div className="h-[1px] flex-1 bg-white/5 mx-6 hidden sm:block" />
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic">HISTORICAL_FEED</p>
                                </div>

                                <div className="space-y-4">
                                    {selectedMatchDetails.events && selectedMatchDetails.events.length > 0 ? (
                                        selectedMatchDetails.events.sort((a,b) => a.minute - b.minute).map(event => (
                                            <div key={event.id} className="group flex items-center gap-6 bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all relative overflow-hidden">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black italic shrink-0 z-10 border transition-all duration-500 ${
                                                    event.type === 'goal' ? 'bg-brand-accent text-brand-950 border-brand-accent shadow-glow' : 
                                                    event.type === 'yellow_card' ? 'bg-amber-500 text-white border-amber-500' : 
                                                    event.type === 'red_card' ? 'bg-red-500 text-white border-red-500' : 
                                                    'bg-brand-primary text-brand-950 border-brand-primary'
                                                }`}>
                                                    {event.minute}'
                                                </div>
                                                
                                                <div className="flex-1 z-10">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[11px] font-black text-white uppercase italic tracking-wider mb-1">
                                                                {players.find(p => p.id === event.playerId)?.fullName}
                                                            </p>
                                                            <div className={`text-[9px] font-black uppercase tracking-[0.2em] italic ${
                                                                event.type === 'goal' ? 'text-brand-accent' : 
                                                                event.type === 'yellow_card' ? 'text-amber-500' : 
                                                                event.type === 'red_card' ? 'text-red-500' : 
                                                                'text-brand-primary'
                                                            }`}>
                                                                {event.type.split('_').join(' ')} RECORDED
                                                            </div>
                                                        </div>
                                                        {event.type === 'goal' && <Trophy size={18} className="text-brand-accent group-hover:scale-110 transition-transform" />}
                                                    </div>
                                                    
                                                    {event.type === 'substitution' && (
                                                        <div className="flex items-center gap-3 mt-3 px-4 py-2 bg-black/40 rounded-xl border border-white/5 w-fit">
                                                            <span className="text-[8px] font-black text-red-400 uppercase italic">OUT: {players.find(p => p.id === event.subOutId)?.fullName}</span>
                                                            <ArrowRight size={10} className="text-white/20" />
                                                            <span className="text-[8px] font-black text-emerald-400 uppercase italic">IN: {players.find(p => p.id === event.subInId)?.fullName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 opacity-10">
                                            <Activity size={48} strokeWidth={1} className="mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.5em] italic text-center">NO_TACTICAL_DATA_ARCHIVED</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* MOTM recognition */}
                            {selectedMatchDetails.playerOfTheMatchId && (
                                <div className="bg-brand-accent/5 p-10 rounded-[3rem] border border-brand-accent/20 flex flex-col items-center gap-6 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                    <div className="w-20 h-20 bg-brand-accent/20 rounded-2xl flex items-center justify-center text-brand-accent shadow-glow relative z-10">
                                        <Trophy size={40} className="animate-bounce" />
                                    </div>
                                    <div className="text-center relative z-10">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.5em] mb-2 italic">ELITE_PERFORMANCE_AWARD</p>
                                        <h4 className="text-3xl font-black text-brand-accent italic uppercase tracking-tighter">
                                            {players.find(p => p.id === selectedMatchDetails.playerOfTheMatchId)?.fullName}
                                        </h4>
                                    </div>
                                </div>
                            )}

                            {/* Media & Highlights Management */}
                            <div className="space-y-6 pt-4">
                                <div className="flex items-center gap-4 px-2">
                                    <Youtube size={18} className="text-red-500" />
                                    <p className="text-[11px] font-black text-white uppercase tracking-[0.4em] italic">MEDIA_VAULT</p>
                                    <div className="h-[1px] flex-1 bg-white/5 mx-4" />
                                </div>

                                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                                    <div className="flex flex-col gap-4">
                                        <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-2">YOUTUBE_REPLAY_LINK</label>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="flex-1 relative">
                                                <input 
                                                    type="text"
                                                    value={editingHighlightsUrl}
                                                    onChange={(e) => setEditingHighlightsUrl(e.target.value)}
                                                    placeholder="PASTE_MATCH_REPLAY_URL"
                                                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-xs outline-none focus:border-brand-accent transition-all placeholder:text-white/10"
                                                />
                                                {editingHighlightsUrl && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                        <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse shadow-glow" />
                                                    </div>
                                                )}
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    await handleUpdateHighlights();
                                                    // Flash success state visually
                                                    const btn = document.activeElement as HTMLButtonElement;
                                                    if (btn) {
                                                        const originalText = btn.innerText;
                                                        btn.innerText = 'SYNC_COMPLETE';
                                                        btn.style.backgroundColor = '#C3F629';
                                                        btn.style.color = '#000';
                                                        setTimeout(() => {
                                                            btn.innerText = originalText;
                                                            btn.style.backgroundColor = '';
                                                            btn.style.color = '';
                                                        }, 2000);
                                                    }
                                                }}
                                                disabled={isUpdatingHighlights || editingHighlightsUrl === (selectedMatchDetails.highlightsUrl || '')}
                                                className="px-8 py-5 bg-white/5 hover:bg-brand-accent hover:text-brand-950 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white/40 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 hover:border-brand-accent italic shrink-0"
                                            >
                                                {isUpdatingHighlights ? 'SYNCING...' : 'UPDATE_LINK'}
                                            </button>
                                        </div>
                                    </div>

                                    {selectedMatchDetails.highlightsUrl && (
                                        <button 
                                            onClick={() => setSelectedVideo(getYouTubeEmbedUrl(selectedMatchDetails.highlightsUrl!))}
                                            className="w-full py-6 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] border border-red-500/20 transition-all flex items-center justify-center gap-4 italic group"
                                        >
                                            <Play size={18} className="fill-current group-hover:scale-110 transition-transform" />
                                            LAUNCH_MATCH_HIGHLIGHTS
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-10 border-t border-white/5 bg-black/20">
                            <button 
                                onClick={() => setSelectedMatchDetails(null)}
                                className="w-full py-7 bg-white/5 text-white/60 rounded-2xl font-black uppercase tracking-[0.5em] text-[10px] border border-white/10 hover:bg-white/10 hover:text-white transition-all italic shadow-2xl"
                            >
                                CLOSE_TACTICAL_FEED
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
