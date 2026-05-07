import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Player, AttendanceRecord, AttendanceStatus, User, Match, ScheduleEvent, FeeRecord, AcademySettings, EventType, Drill, Certificate, CoachMessage, WeeklyTip } from '../types';
import { Trophy, Star, Calendar, Brain, DollarSign, Clock, Activity, Shield, CheckCircle2, XCircle, MapPin, Coffee, Zap, PartyPopper, PlayCircle, Download, Phone, Mail, Globe, X, Shirt, Wand2, Sparkles, Target, ArrowRight, UserCheck, ClipboardList, ChevronDown, ChevronUp, ChevronRight, Dumbbell, Play, Youtube, Loader2, Users, Command, Receipt, Medal, Crown, Award } from 'lucide-react';
import { auth } from '../firebase';
import { EvaluationCard } from './EvaluationCard';
import html2canvas from 'html2canvas';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  LineChart,
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
} from 'recharts';

interface PlayerPortalProps {
    user: User;
    initialSection?: 'progress' | 'overview';
}

const numberToWords = (num: number): string => {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    if ((num = num.toString().length > 9 ? parseFloat(num.toString().slice(0, 9)) : num) === 0) return 'Zero';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (parseInt(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (parseInt(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (parseInt(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (parseInt(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (parseInt(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str + 'Only';
};

export const PlayerPortal: React.FC<PlayerPortalProps> = ({ user, initialSection }) => {
    const [player, setPlayer] = useState<Player | null>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [viewMode, setViewMode] = useState<'overview' | 'scout'>('overview');
    const [matchAnalysis, setMatchAnalysis] = useState<string | null>(null);
    const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);
    const [feeStatus, setFeeStatus] = useState<FeeRecord | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
    const [allSchedule, setAllSchedule] = useState<ScheduleEvent[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [coaches, setCoaches] = useState<User[]>([]);
    const [eventFilter, setEventFilter] = useState<EventType>('training');
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    const [isAttendanceModalOpen, setAttendanceModalOpen] = useState(false);
    const [selectedAttendanceDetail, setSelectedAttendanceDetail] = useState<{date: string, record?: AttendanceRecord, event?: ScheduleEvent} | null>(null);
    const [viewingSessionPlan, setViewingSessionPlan] = useState<ScheduleEvent | null>(null);
    const [motmToday, setMotmToday] = useState<{playerId: string, timestamp: number} | null>(null);
    const [checkedInToday, setCheckedInToday] = useState(false);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [academyRank, setAcademyRank] = useState<{ rank: number, total: number, pts: number } | null>(null);
    const [isCertificatesModalOpen, setCertificatesModalOpen] = useState(false);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [weeklyTip, setWeeklyTip] = useState<WeeklyTip | null>(null);
    const invoiceHiddenRef = useRef<HTMLDivElement>(null);
    const idCardRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialSection === 'progress' && progressRef.current) {
            progressRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [initialSection, player]);

    useEffect(() => {
        if (!user?.linkedPlayerId) return;
        
        const refreshData = () => {
            const allPlayers = StorageService.getPlayers();
            const p = allPlayers.find(pl => pl.id === user.linkedPlayerId);
            setPlayer(p || null);
            if (p) {
                const allAttendance = StorageService.getAttendance();
                const myAttendance = allAttendance.filter(a => a.playerId === user?.linkedPlayerId);
                setAttendance(myAttendance);
                
                const today = new Date().toISOString().split('T')[0];
                const checkedIn = myAttendance.some(a => a.date === today && a.status === AttendanceStatus.PRESENT);
                setCheckedInToday(checkedIn);
                
                setMotmToday(StorageService.getMOTM(today));
                
                const allMatches = StorageService.getMatches();
                setMatches(allMatches.filter(m => m.playerStats.some(s => s.playerId === user?.linkedPlayerId)));
                
                const currentMonth = new Date().toISOString().slice(0, 7);
                const fees = StorageService.getFees();
                const myFee = fees.find(f => f.playerId === p.id && f.month === currentMonth);
                setFeeStatus(myFee || null);
                
                loadSchedule();
                loadDrills();
                loadCoaches();
                loadCertificates();
                loadWeeklyTip();

                // Calculate Rank
                const allMs = StorageService.getMatches();
                const allPs = StorageService.getPlayers();
                const mvpData = JSON.parse(localStorage.getItem('icarus_session_motm') || '{}');
                
                const rankings = allPs.map(player => {
                    const tCount = Object.entries(mvpData).filter(([key, val]) => {
                        const entryId = typeof val === 'object' ? (val as any).playerId : val;
                        return entryId === player.id && key.startsWith(currentMonth);
                    }).length;
                    const mCount = allMs.filter(m => m.date.startsWith(currentMonth) && m.playerOfTheMatchId === player.id).length;
                    const rPts = allMs.filter(m => m.date.startsWith(currentMonth))
                        .reduce((acc, m) => {
                            const s = m.playerStats?.find(ps => ps.playerId === player.id);
                            return acc + ((s?.rating || 0) / 2);
                        }, 0);
                    const total = parseFloat((tCount * 1 + mCount * 5 + rPts).toFixed(1));
                    return { id: player.id, pts: total };
                }).sort((a, b) => b.pts - a.pts);

                const myIdx = rankings.findIndex(r => r.id === p.id);
                if (myIdx !== -1 && rankings[myIdx].pts > 0) {
                    setAcademyRank({ rank: myIdx + 1, total: rankings.length, pts: rankings[myIdx].pts });
                } else {
                    setAcademyRank(null);
                }
            }
        };

        refreshData();
        window.addEventListener('academy_data_update', refreshData);
        const handleSettingsChange = () => setSettings(StorageService.getSettings());
        window.addEventListener('settingsChanged', handleSettingsChange);
        
        return () => {
            window.removeEventListener('academy_data_update', refreshData);
            window.removeEventListener('settingsChanged', handleSettingsChange);
        };
    }, [user]);

    const loadSchedule = () => {
        const schedule = StorageService.getSchedule();
        const now = new Date();
        setAllSchedule(schedule);
        const upcoming = schedule
            .filter(e => new Date(`${e.date}T${e.time}`) > now)
            .sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
        setUpcomingEvents(upcoming);
    };
    const loadDrills = () => setDrills(StorageService.getDrills());
    const loadCoaches = () => {
        const allUsers = StorageService.getUsers();
        setCoaches(allUsers.filter(u => u.role === 'coach'));
    };

    const loadCertificates = () => {
        if (!user?.linkedPlayerId) return;
        const allCerts = StorageService.getCertificates();
        setCertificates(allCerts.filter(c => c.playerId === user.linkedPlayerId));
    };

    const loadWeeklyTip = () => {
        if (!player) return;
        const allTips = StorageService.getWeeklyTips();
        const batchTip = allTips
            .filter(t => t.batchId === player.batch)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        setWeeklyTip(batchTip || null);
    };

    const getNextEventCountdown = () => {
        if (!player || allSchedule.length === 0) return null;
        const now = new Date();
        const nextEvent = allSchedule
            .filter(e => {
                // If player has a venue/batch, try to match it. 
                // If not assigned yet, show global events.
                const venueMatch = !e.location || !player.venue || e.location === player.venue;
                const batchMatch = !e.batch || !player.batch || e.batch === player.batch;
                return venueMatch && batchMatch;
            })
            .filter(e => new Date(`${e.date}T${e.time}`) > now)
            .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())[0];

        if (!nextEvent) return null;

        const eventDate = new Date(`${nextEvent.date}T${nextEvent.time}`);
        const diffMs = eventDate.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        const isToday = nextEvent.date === now.toISOString().split('T')[0];
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const isTomorrow = nextEvent.date === tomorrow.toISOString().split('T')[0];
        
        if (isToday) return { text: `SESSION TODAY // ${nextEvent.time}`, type: nextEvent.type };
        if (isTomorrow) return { text: `${nextEvent.type === 'match' ? 'MATCH DAY' : 'SESSION'} TOMORROW`, type: nextEvent.type };
        
        return { text: `NEXT ${nextEvent.type === 'match' ? 'MATCH' : 'SESSION'} IN ${diffDays}D ${diffHours}H`, type: nextEvent.type };
    };

    const countdown = getNextEventCountdown();

    const handleSelfCheckIn = async () => {
        if (!user?.linkedPlayerId || isCheckingIn) return;
        setIsCheckingIn(true);
        const today = new Date().toISOString().split('T')[0];
        try {
            await StorageService.savePlayerSelfCheckIn(user.linkedPlayerId, today);
            setCheckedInToday(true);
        } catch (error) {
            alert('Check-in failed. Please try again.');
        } finally {
            setIsCheckingIn(false);
        }
    };
    const handleDayClick = (date: string, record?: AttendanceRecord) => {
        const event = allSchedule.find(e => e.date === date);
        setSelectedAttendanceDetail({ date, record, event });
    };
    const getYouTubeEmbedUrl = (url: string | undefined) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0` : null;
    };
    const handleDownloadInvoice = async () => {
        if (!invoiceHiddenRef.current || !feeStatus?.invoice) return;
        try {
            const canvas = await html2canvas(invoiceHiddenRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `Invoice_${feeStatus.invoice.invoiceNo}.png`;
            link.click();
        } catch (e) { alert('Could not generate invoice download.'); }
    };
    const handleDownloadIDCard = async () => {
        if (!idCardRef.current) return;
        try {
            const canvas = await html2canvas(idCardRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', allowTaint: true });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `ID_Card_${player?.memberId}.png`;
            link.click();
        } catch (e) { alert('Could not generate ID Card.'); }
    };

    const calculateTaxes = (total: number) => {
      const base = total / 1.18;
      const cgst = base * 0.09;
      const sgst = base * 0.09;
      return { base: Math.round(base), cgst: Math.round(cgst), sgst: Math.round(sgst), total: total };
    };
    const getKitRequirement = (dateStr: string) => {
        const day = new Date(dateStr).getDay();
        if (day === 1 || day === 3 || day === 5) return { color: 'Blue Kit', style: 'bg-blue-500/5 text-blue-600 border-blue-500/10' };
        if (day === 2 || day === 4) return { color: 'White Kit', style: 'bg-slate-50 text-slate-400 border-slate-200' };
        return { color: 'Training Bib', style: 'bg-orange-500/5 text-orange-600 border-orange-500/10' };
    };

    if (user?.linkedPlayerId && !player) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000 min-h-[60vh]">
                <div className="glass-card p-12 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden group max-w-md w-full">
                    <div className="relative w-32 h-32 mb-12 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-brand-primary animate-spin-slow" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Shield size={32} className="text-brand-primary animate-pulse-slow" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-4">
                        LOADING <span className="text-brand-primary">PROFILE</span>
                    </h2>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-6">
                        <div className="h-full bg-brand-primary animate-progress w-full" />
                    </div>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] italic leading-relaxed">Connecting to Secure Server<br/>Fetching Athlete Data</p>
                </div>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="flex items-center justify-center p-6 min-h-[60vh]">
                <div className="glass-card p-12 max-w-md w-full text-center space-y-8 relative overflow-hidden group rounded-[3rem]">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity text-white"><Users size={120} /></div>
                    <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20 shadow-2xl">
                        <Shield size={32} className="text-red-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">LINKAGE <span className="text-red-500">REQUIRED</span></h2>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Athlete Profile Not Found</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-sm text-white/40 leading-relaxed italic">
                        Your account is currently <span className="text-white font-bold">Unlinked</span>. Please contact an Administrator to link your login to your Player ID.
                    </div>
                    <button 
                        onClick={() => auth.signOut()}
                        className="w-full py-4 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/20 transition-all italic active:scale-95"
                    >
                        LOG OUT
                    </button>
                </div>
            </div>
        );
    }

    const presentCount = attendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;
    const myMatchStats = matches.map(m => {
        const stats = m.playerStats.find(s => s.playerId === player.id);
        return { ...m, myStats: stats };
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastMatch = myMatchStats[0];
    const totalGoals = myMatchStats.reduce((acc, m) => acc + (m.myStats?.goals || 0), 0);
    const totalAssists = myMatchStats.reduce((acc, m) => acc + (m.myStats?.assists || 0), 0);
    const totalStarts = myMatchStats.reduce((acc, m) => acc + (m.myStats?.isStarter ? 1 : 0), 0);
    const avgRating = myMatchStats.length ? (myMatchStats.reduce((acc, m) => acc + (m.myStats?.rating || 0), 0) / myMatchStats.length).toFixed(1) : '0';

    const handleAnalyzeMatch = async () => {
        if (!lastMatch || !player) return;
        setIsAnalyzingMatch(true);
        const analysis = await GeminiService.analyzeMatchPerformance(player, lastMatch, settings.name);
        setMatchAnalysis(analysis);
        setIsAnalyzingMatch(false);
    };

    const filteredEvents = upcomingEvents.filter(e => e.type === eventFilter);
    const taxes = feeStatus?.invoice ? calculateTaxes(feeStatus.invoice.amount) : { base: 0, cgst: 0, sgst: 0, total: 0 };

    return (
        <div className="min-h-[calc(100vh-80px)] selection:bg-brand-primary/20 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto space-y-10 relative z-10">

            {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ ID Card Generator (Hidden) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
            <div className="fixed left-[-9999px] top-0">
                <div ref={idCardRef} className="w-[400px] h-[600px] bg-white relative overflow-hidden flex flex-col items-center p-8 text-brand-950 border-[6px] rounded-[3rem] border-brand-950/90">
                    <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg,#0D1B8A 0,#0D1B8A 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,#0D1B8A 0,#0D1B8A 1px,transparent 1px,transparent 20px)' }} />
                    
                    <div className="relative z-10 flex flex-col items-center w-full h-full">
                        <div className="mt-6 mb-8 text-center">
                            {settings.logoUrl ? <img src={settings.logoUrl} className="w-16 h-16 object-contain mx-auto mb-3" /> : <Shield className="w-16 h-16 text-brand-500 mx-auto mb-3" />}
                            <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{settings.name}</h2>
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-500 mt-1">OFFICIAL PLAYER PASS</p>
                        </div>
                        
                        <div className="relative mb-10">
                            <div className="absolute -inset-2 bg-brand-500/10 rounded-full blur-xl" />
                            <img src={player.photoUrl} className="relative w-48 h-48 object-cover rounded-full border-[6px] border-white shadow-2xl" />
                        </div>

                        <div className="text-center space-y-2 mb-auto">
                            <h1 className="text-3xl font-black uppercase tracking-tight leading-none text-brand-950">{player.fullName}</h1>
                            <p className="text-sm text-brand-500 font-mono font-black italic tracking-widest">{player.memberId}</p>
                        </div>

                        <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 flex justify-between items-center mt-6">
                            <div className="text-center"><p className="text-[9px] text-slate-300 uppercase font-black tracking-widest mb-1">Position</p><p className="text-sm font-black text-brand-950 italic">{player.position}</p></div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="text-center"><p className="text-[9px] text-slate-300 uppercase font-black tracking-widest mb-1">Batch</p><p className="text-sm font-black text-brand-950 italic">{player.batch}</p></div>
                        </div>
                        
                        <div className="mt-8 text-[8px] font-black text-slate-300 uppercase tracking-[0.5em] italic">ICARUS FOOTBALL SCHOOLS</div>
                    </div>
                </div>
            </div>

            {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Navigation HUD ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex p-1 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl gap-1 shadow-2xl overflow-x-auto w-full lg:w-auto no-scrollbar">
                    {( [['overview', 'DASHBOARD'], ['scout', 'SCOUT REPORT']] as const).map(([m, label]) => (
                        <button key={m} onClick={() => setViewMode(m as any)}
                            className={`flex-1 lg:flex-none px-4 lg:px-6 xl:px-10 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-2.5 italic whitespace-nowrap
                                ${viewMode === m
                                    ? 'bg-brand-primary text-brand-950 shadow-[0_0_20px_rgba(0,200,255,0.4)] border border-brand-primary/30'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                            {m === 'scout' ? <Target size={14} className={viewMode === m ? 'text-brand-accent' : ''} /> : <Command size={14} className={viewMode === m ? 'text-brand-accent' : ''} />}
                            {label}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {coaches.slice(0, 3).map((c, i) => (
                            <div key={c.id} className="w-10 h-10 rounded-full border-4 border-brand-950 bg-white/5 overflow-hidden shadow-sm" style={{ zIndex: 3-i }}>
                                <img src={c.photoUrl} className="w-full h-full object-cover" alt="Coach" />
                            </div>
                        ))}
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">HEAD COACH</p>
                        <p className="text-[11px] font-black text-white italic uppercase">{coaches[0]?.username || 'Coaching Team'}</p>
                    </div>
                </div>
            </div>


            {viewMode === 'scout' ? (
              <div className="animate-in slide-in-from-right-8 duration-500">
                <EvaluationCard player={player} settings={settings} attendance={attendance} matches={matches} />
              </div>
            ) : (
                <div className="space-y-10 animate-in slide-in-from-left-8 duration-500">
                    {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Athlete Hero HUD (Digital Stadium Elite) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
                    <div className="relative rounded-[3rem] p-10 md:p-16 border border-white/5 shadow-2xl overflow-hidden group bg-brand-900/40 backdrop-blur-3xl">
                        <div className="green-light-bar" />
                        {/* Background Elements */}
                        <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
                             style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 21px)' }} />
                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                            <Shield size={400} className="text-white" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12 xl:gap-16 text-white">
                            {/* Left Zone (60%): Identity */}
                            <div className="xl:w-[60%] flex flex-col md:flex-row items-center gap-8 md:gap-12">
                                <div className="relative shrink-0">
                                    <div className="absolute -inset-4 bg-brand-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-[2.5rem] p-1.5 bg-white/5 border border-white/10 shadow-2xl overflow-hidden">
                                        <img src={player.photoUrl} className="w-full h-full rounded-[2rem] object-cover filter saturate-[1.2] contrast-[1.05]" />
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 bg-brand-secondary text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl border-2 border-brand-accent/50 italic">
                                        {player.position}
                                    </div>
                                </div>
                                
                                <div className="text-center md:text-left">
                                    <div className="flex flex-wrap items-center gap-4 mb-6 justify-center md:justify-start">
                                        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-brand-accent/10 border border-brand-accent/20 backdrop-blur-md">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse shadow-[0_0_12px_rgba(195,246,41,0.6)]" />
                                            <span className="text-[8px] font-black text-brand-accent uppercase tracking-[0.2em] italic">Active Status</span>
                                        </div>
                                        
                                        {countdown && (
                                            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 backdrop-blur-md">
                                                <Clock size={10} className="text-brand-primary" />
                                                <span className="text-[8px] font-black text-brand-primary uppercase tracking-[0.2em] italic">{countdown.text}</span>
                                            </div>
                                        )}

                                        <span className="text-white/20 text-[10px] font-black tracking-[0.4em] uppercase italic">ID: {player.memberId}</span>
                                    </div>
                                    
                                    <h1 className="text-3xl sm:text-5xl md:text-6xl xl:text-7xl font-black text-white tracking-tighter uppercase leading-[0.9] mb-8 italic" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                        {player.fullName.split(' ')[0]}<br/>
                                        <span className="text-brand-primary drop-shadow-[0_0_15px_rgba(0,200,255,0.3)]">{player.fullName.split(' ').slice(1).join(' ')}</span>
                                    </h1>
                                    
                                    <div className="flex flex-wrap items-center gap-8 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] italic">
                                        <span className="flex items-center gap-3"><MapPin size={16} className="text-brand-primary" /> {player.venue || 'CENTRAL HUB'}</span>
                                        <span className="flex items-center gap-3"><Calendar size={16} className="text-brand-primary" /> 2024 SEASON</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Zone (40%): Quick-Stats Grid */}
                            <div className="xl:w-[40%] w-full grid grid-cols-2 gap-4">
                                <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-xl group/stat hover:bg-white/10 transition-all">
                                    <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 group-hover/stat:text-brand-accent transition-colors italic">ATTENDANCE</div>
                                    <div className="text-3xl font-black text-white font-mono tracking-tighter italic">{attendanceRate}<span className="text-brand-accent text-sm ml-1">%</span></div>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-xl group/stat hover:bg-white/10 transition-all">
                                    <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 group-hover/stat:text-brand-primary transition-colors italic">RANK</div>
                                    <div className="text-3xl font-black text-white font-mono tracking-tighter italic">{academyRank ? `#${academyRank.rank}` : '--'}</div>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-xl group/stat hover:bg-white/10 transition-all">
                                    <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 group-hover/stat:text-brand-primary transition-colors italic">RATING</div>
                                    <div className="text-3xl font-black text-white font-mono tracking-tighter italic">{avgRating}</div>
                                </div>
                                <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-xl group/stat hover:bg-white/10 transition-all">
                                    <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 group-hover/stat:text-brand-accent transition-colors italic">SESSIONS</div>
                                    <div className="text-3xl font-black text-white font-mono tracking-tighter italic">{presentCount}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Achievement Badge System (Digital Stadium Elite) ────────── */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-4">
                            <h2 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] italic">Achievements</h2>
                            <span className="text-[9px] font-black text-brand-primary uppercase tracking-[0.2em] italic">
                                {([
                                    presentCount > 0,
                                    parseFloat(attendanceRate) >= 80,
                                    false, // Leader
                                    matches.some(m => m.result === 'W'),
                                    presentCount >= 100,
                                    academyRank && academyRank.rank <= 3
                                ].filter(Boolean).length)} / 6 UNLOCKED
                            </span>
                        </div>
                        
                        <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar px-2">
                            {[
                                { id: 'first_boot', name: 'FIRST BOOT', icon: Zap, req: 'Attend first session', earned: presentCount > 0 },
                                { id: 'iron_will', name: 'IRON WILL', icon: Activity, req: '80%+ Attendance', earned: parseFloat(attendanceRate) >= 80 },
                                { id: 'leader', name: 'LEADER', icon: Crown, req: 'Become Captain', earned: false },
                                { id: 'undefeated', name: 'UNDEFEATED', icon: Shield, req: 'Win a Match', earned: matches.some(m => m.result === 'W') },
                                { id: 'century', name: 'CENTURY', icon: Medal, req: '100 Sessions', earned: presentCount >= 100 },
                                { id: 'rising_star', name: 'RISING STAR', icon: Star, req: 'Rank Top 3', earned: !!(academyRank && academyRank.rank <= 3) }
                            ].map((badge) => (
                                <div key={badge.id} className="flex flex-col items-center gap-4 shrink-0 group cursor-help">
                                    <div className={`relative w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-2xl
                                        ${badge.earned 
                                            ? 'bg-brand-secondary/40 border-brand-accent/50 shadow-brand-accent/20 scale-110' 
                                            : 'bg-white/5 border-white/10 grayscale opacity-40 hover:opacity-60'}`}>
                                        <badge.icon size={28} className={badge.earned ? 'text-brand-accent' : 'text-white/40'} />
                                        {!badge.earned && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-brand-950/40 rounded-full">
                                                <Command size={14} className="text-white/20" />
                                            </div>
                                        )}
                                        {badge.earned && (
                                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-brand-accent flex items-center justify-center border-2 border-brand-950 shadow-lg animate-bounce">
                                                <CheckCircle2 size={12} className="text-brand-950" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <span className={`block text-[9px] font-black uppercase tracking-[0.2em] italic ${badge.earned ? 'text-white' : 'text-white/20'}`}>
                                            {badge.name}
                                        </span>
                                        <div className="h-0 overflow-hidden group-hover:h-auto transition-all duration-500">
                                            <span className="block text-[8px] font-bold text-brand-primary uppercase tracking-widest mt-1 italic whitespace-nowrap">
                                                {badge.earned ? 'UNLOCKED' : badge.req}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ─── Recent Sessions Recap Feed (Digital Stadium Elite) ────────── */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        <div className="xl:col-span-12">
                            <div className="glass-card rounded-[3rem] p-10 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden bg-brand-900/20 backdrop-blur-3xl">
                                <div className="flex items-center justify-between mb-10">
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">
                                            RECENT <span className="text-brand-primary">SESSIONS</span>
                                        </h2>
                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mt-2 italic">Training History // Tactical Recap</p>
                                    </div>
                                    <div className="hidden md:block px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-[0.2em] italic">
                                        Last 5 Evaluations
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {(() => {
                                        const recentAtt = [...attendance]
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .slice(0, 5);
                                        
                                        if (recentAtt.length === 0) {
                                            return (
                                                <div className="py-20 text-center">
                                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/10">
                                                        <Calendar size={32} />
                                                    </div>
                                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic">No session history found yet</p>
                                                </div>
                                            );
                                        }

                                        const motmData = JSON.parse(localStorage.getItem('icarus_session_motm') || '{}');

                                        return recentAtt.map((att) => {
                                            const session = allSchedule.find(s => s.date === att.date);
                                            const isMOTM = Object.entries(motmData).some(([key, val]) => {
                                                const entryId = typeof val === 'object' ? (val as any).playerId : val;
                                                return entryId === player.id && key.startsWith(att.date);
                                            });

                                            return (
                                                <div key={att.id} className="group relative flex flex-col md:flex-row items-center justify-between p-6 md:p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-500 gap-6 md:gap-12">
                                                    <div className="flex items-center gap-8 w-full md:w-auto">
                                                        {/* Status Dot */}
                                                        <div className={`shrink-0 w-3 h-3 rounded-full shadow-[0_0_12px] ${att.status === 'PRESENT' ? 'bg-brand-accent shadow-brand-accent/50' : 'bg-red-500 shadow-red-500/50'}`} />
                                                        
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic mb-1">
                                                                {new Date(att.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                                                            </span>
                                                            <div className="flex items-center gap-4">
                                                                <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">
                                                                    {session?.title || 'REGULAR TRAINING'}
                                                                </h4>
                                                                {isMOTM && (
                                                                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-brand-accent/20 border border-brand-accent/30">
                                                                        <Trophy size={12} className="text-brand-accent" />
                                                                        <span className="text-[8px] font-black text-brand-accent uppercase italic">MOTM</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-start md:justify-end">
                                                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-brand-950/40 border border-white/5">
                                                            <MapPin size={12} className="text-brand-primary" />
                                                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest italic">{session?.location || player.venue || 'CENTRAL HUB'}</span>
                                                        </div>
                                                        
                                                        <div className="flex flex-wrap gap-2">
                                                            {session?.drillIds?.map(drillId => {
                                                                const drill = drills.find(d => d.id === drillId);
                                                                if (!drill) return null;
                                                                return (
                                                                    <span key={drillId} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black text-white/40 uppercase tracking-widest italic group-hover:border-brand-primary/30 group-hover:text-white transition-all">
                                                                        #{drill.title}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Row below Hero */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <button onClick={handleDownloadIDCard} className="flex items-center justify-between p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-brand-secondary hover:border-brand-accent/30 transition-all shadow-xl group/btn backdrop-blur-xl">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover/btn:bg-brand-accent transition-colors">
                                    <Download size={22} className="text-brand-accent group-hover/btn:text-brand-950 transition-colors" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[10px] font-black text-white/40 group-hover/btn:text-white uppercase tracking-[0.25em] italic">OFFICIAL ID</span>
                                    <span className="block text-xl font-black text-white uppercase tracking-tighter italic">DOWNLOAD CARD</span>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-white/20 group-hover/btn:text-brand-accent group-hover/btn:translate-x-2 transition-all" />
                        </button>

                        <button onClick={handleDownloadInvoice} disabled={!feeStatus?.invoice} className={`flex items-center justify-between p-8 rounded-[2.5rem] border transition-all shadow-xl group/btn backdrop-blur-xl ${feeStatus?.status === 'PAID' ? 'bg-white/5 border-white/5 hover:bg-brand-primary hover:border-brand-primary/30' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className="flex items-center gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${feeStatus?.status === 'PAID' ? 'bg-white/5 group-hover/btn:bg-brand-950' : 'bg-red-500/20'}`}>
                                    <Receipt size={22} className={`${feeStatus?.status === 'PAID' ? 'text-brand-primary group-hover/btn:text-brand-950' : 'text-red-500'}`} />
                                </div>
                                <div className="text-left">
                                    <span className={`block text-[10px] font-black uppercase tracking-[0.25em] italic ${feeStatus?.status === 'PAID' ? 'text-white/40 group-hover/btn:text-brand-950' : 'text-red-400'}`}>FEE RECEIPT</span>
                                    <span className={`block text-xl font-black uppercase tracking-tighter italic ${feeStatus?.status === 'PAID' ? 'text-white group-hover/btn:text-brand-950' : 'text-red-500'}`}>INVOICE PORTAL</span>
                                </div>
                            </div>
                            <ChevronRight size={20} className={`group-hover/btn:translate-x-2 transition-all ${feeStatus?.status === 'PAID' ? 'text-white/20 group-hover/btn:text-brand-950' : 'text-red-500/20'}`} />
                        </button>

                        <div className="flex items-center justify-between p-8 rounded-[2.5rem] bg-brand-accent border-2 border-brand-950 shadow-xl group/btn backdrop-blur-xl">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-brand-950/10 flex items-center justify-center">
                                    <Activity size={22} className="text-brand-950" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[10px] font-black text-brand-950/40 uppercase tracking-[0.25em] italic">CURRENT SCALE</span>
                                    <span className="block text-xl font-black text-brand-950 uppercase tracking-tighter italic leading-none">ATTENDANCE RATE</span>
                                </div>
                            </div>
                            <span className="text-3xl font-black text-brand-950 italic tracking-tighter">{attendanceRate}%</span>
                        </div>

                        <button onClick={() => setCertificatesModalOpen(true)} className="flex items-center justify-between p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:bg-brand-accent hover:border-brand-accent/30 transition-all shadow-xl group/btn backdrop-blur-xl">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover/btn:bg-brand-950 transition-colors">
                                    <Medal size={22} className="text-brand-accent group-hover/btn:text-brand-950 transition-colors" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[10px] font-black text-white/40 group-hover/btn:text-brand-950 uppercase tracking-[0.25em] italic">ACCOLADES</span>
                                    <span className="block text-xl font-black text-white group-hover/btn:text-brand-950 uppercase tracking-tighter italic">CERTIFICATES</span>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-white/20 group-hover/btn:text-brand-950 group-hover/btn:translate-x-2 transition-all" />
                        </button>
                    </div>

                    {/* ─── My Progress: Skill Timeline (Digital Stadium Elite) ────────── */}
                    <div ref={progressRef} className="glass-card rounded-[3rem] p-10 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden bg-brand-900/40 backdrop-blur-3xl">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none transition-transform duration-1000">
                            <Activity size={200} className="text-white" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter">
                                        MY <span className="text-brand-primary">PROGRESS</span>
                                    </h2>
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mt-2 italic">Skill Evolution // Performance Timeline</p>
                                </div>
                                
                                {player.evaluationHistory && player.evaluationHistory.length > 0 ? (
                                    <div className="flex gap-4">
                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_#00C8FF]" />
                                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest italic">Technical</span>
                                        </div>
                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_8px_#C3F629]" />
                                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest italic">Tactical</span>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {(() => {
                                const allEvals = [...(player.evaluationHistory || [])];
                                if (player.evaluation) {
                                    const exists = allEvals.some(e => e.evaluationDate === player.evaluation?.evaluationDate);
                                    if (!exists) allEvals.push(player.evaluation);
                                }
                                allEvals.sort((a, b) => new Date(a.evaluationDate).getTime() - new Date(b.evaluationDate).getTime());

                                if (allEvals.length < 2) {
                                    return (
                                        <div className="h-[300px] flex flex-col items-center justify-center text-center p-8 bg-white/5 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
                                            <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 flex items-center justify-center mb-6 border border-brand-primary/20">
                                                <Target size={40} className="text-brand-primary" />
                                            </div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight italic">First Step Taken!</h3>
                                            <p className="text-sm text-white/40 max-w-md mt-4 font-medium italic">
                                                {allEvals.length === 1 
                                                    ? "You've got your first evaluation! Add more evaluations to see your skill levels trend up over time."
                                                    : "No evaluation data yet. Once you complete your first technical assessment, your progress will be tracked here."}
                                            </p>
                                            <div className="mt-8 px-8 py-3 rounded-xl bg-brand-primary text-brand-950 font-black text-[10px] uppercase tracking-[0.2em] italic shadow-2xl shadow-brand-primary/20 animate-pulse">
                                                ADD MORE EVALUATIONS TO SEE TREND
                                            </div>
                                        </div>
                                    );
                                }

                                const chartData = allEvals.map(ev => ({
                                    date: new Date(ev.evaluationDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase(),
                                    Passing: ev.metrics.passing,
                                    Shooting: ev.metrics.shooting,
                                    Control: ev.metrics.juggling,
                                    WeakFoot: ev.metrics.weakFoot,
                                    LongPass: ev.metrics.longPass,
                                    rawDate: ev.evaluationDate
                                }));

                                return (
                                    <div className="h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="lineGradPassing" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#00C8FF" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#00C8FF" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis 
                                                    dataKey="date" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900, fontFamily: 'Space Grotesk' }}
                                                    dy={15}
                                                />
                                                <YAxis 
                                                    domain={[0, 100]} 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 900, fontFamily: 'Space Grotesk' }}
                                                    dx={-10}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#0A0A0A', 
                                                        border: '1px solid rgba(255,255,255,0.1)', 
                                                        borderRadius: '16px',
                                                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                                        fontFamily: 'Space Grotesk',
                                                        fontWeight: 900,
                                                        fontSize: '10px',
                                                        textTransform: 'uppercase',
                                                        padding: '16px'
                                                    }}
                                                    itemStyle={{ padding: '4px 0' }}
                                                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                                />
                                                <Line type="monotone" dataKey="Passing" stroke="#00C8FF" strokeWidth={4} dot={{ r: 6, strokeWidth: 0, fill: '#00C8FF' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#00C8FF', shadow: '0 0 20px #00C8FF' }} animationDuration={2000} />
                                                <Line type="monotone" dataKey="Shooting" stroke="#C3F629" strokeWidth={4} dot={{ r: 6, strokeWidth: 0, fill: '#C3F629' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#C3F629', shadow: '0 0 20px #C3F629' }} animationDuration={2000} animationDelay={200} />
                                                <Line type="monotone" dataKey="Control" stroke="#FF0080" strokeWidth={4} dot={{ r: 6, strokeWidth: 0, fill: '#FF0080' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#FF0080', shadow: '0 0 20px #FF0080' }} animationDuration={2000} animationDelay={400} />
                                                <Line type="monotone" dataKey="WeakFoot" stroke="#8A2BE2" strokeWidth={4} dot={{ r: 6, strokeWidth: 0, fill: '#8A2BE2' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#8A2BE2', shadow: '0 0 20px #8A2BE2' }} animationDuration={2000} animationDelay={600} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* ─── Command Modules grid ────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        {/* Highlights Row */}
                        <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Self Check-In Card */}
                            <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group flex flex-col items-center justify-between gap-6 text-center">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000"><UserCheck size={100} className="text-white" /></div>
                                <div className="relative z-10">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 mx-auto mb-4 ${checkedInToday ? 'bg-brand-accent border-brand-accent text-brand-950' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <Activity size={28} />
                                    </div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                                        {checkedInToday ? <>CHECK-IN <span className="text-brand-accent">SUCCESS</span></> : <>SESSION <span className="text-brand-primary">CHECK-IN</span></>}
                                    </h3>
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1 italic">
                                        {checkedInToday ? 'Your attendance recorded' : 'Mark your arrival now'}
                                    </p>
                                </div>
                                <button 
                                    onClick={handleSelfCheckIn}
                                    disabled={checkedInToday || isCheckingIn}
                                    className={`relative z-10 w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl ${checkedInToday ? 'bg-white/5 text-white/20 border border-white/5' : 'bg-brand-primary text-brand-950 hover:bg-white shadow-brand-primary/20 active:scale-95'}`}
                                >
                                    {isCheckingIn ? <Loader2 size={14} className="animate-spin" /> : checkedInToday ? <CheckCircle2 size={14} /> : <Zap size={14} fill="currentColor" />}
                                    {checkedInToday ? 'PRESENT' : 'CHECK IN'}
                                </button>
                            </div>

                             {/* MOTM Showcase */}
                            <div className={`glass-card rounded-[2.5rem] p-8 border shadow-2xl relative overflow-hidden group transition-all duration-700 flex flex-col items-center justify-between gap-6 text-center ${motmToday?.playerId === player.id ? 'border-brand-accent/30 bg-brand-accent/5' : 'border-white/5'}`}>
                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Trophy size={120} className="text-white" /></div>
                                <div className="relative z-10">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 mx-auto mb-4 ${motmToday?.playerId === player.id ? 'bg-brand-accent border-brand-accent text-brand-950 shadow-[0_0_20px_rgba(200,255,0,0.3)]' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <Trophy size={28} />
                                    </div>
                                    <h3 className={`text-xl font-black italic uppercase tracking-tighter ${motmToday?.playerId === player.id ? 'text-brand-accent' : 'text-white'}`}>
                                        PLAYER OF <span className={motmToday?.playerId === player.id ? 'text-white' : 'text-brand-primary'}>THE DAY</span>
                                    </h3>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] mt-1 italic text-white/30">
                                        {motmToday?.playerId === player.id ? 'Excellent performance' : 'Top performer recognition'}
                                    </p>
                                </div>
                                {motmToday?.playerId === player.id && (
                                    <div className="relative z-10 w-full py-3 bg-brand-accent text-brand-950 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl animate-pulse">ELITE STATUS</div>
                                )}
                            </div>

                             {/* Academy Ranking Card */}
                            <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group flex flex-col items-center justify-between gap-6 bg-brand-900/40 text-center">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Medal size={100} className="text-white" /></div>
                                <div className="relative z-10">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 mx-auto mb-4 ${academyRank ? 'bg-amber-400 border-amber-400 text-brand-950 shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <Crown size={28} />
                                    </div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
                                        {academyRank ? <>ACADEMY <span className="text-amber-400">RANK #{academyRank.rank}</span></> : <>RANKING <span className="text-white/20">PENDING</span></>}
                                    </h3>
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1 italic">
                                        {academyRank ? `${academyRank.pts} Performance Pts` : 'Establishing establish rank'}
                                    </p>
                                </div>
                                {academyRank && (
                                    <div className="relative z-10 w-full py-3 bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10">
                                        TOP {Math.round((academyRank.rank / academyRank.total) * 100)}%
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Large Modules Row */}
                        <div className="xl:col-span-7 space-y-8">
                            {/* Operational Schedule */}
                            <div className="glass-card rounded-[3rem] p-10 sm:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-[6px] h-full bg-brand-primary" />
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                                    <div>
                                        <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-4">
                                            <Calendar className="text-brand-primary" size={28} /> Schedule
                                        </h3>
                                        <p className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-2 italic">Upcoming Academy Sessions</p>
                                    </div>
                                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
                                        {(['training', 'match'] as const).map(t => (
                                            <button key={t} onClick={() => setEventFilter(t as any)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all ${eventFilter === t ? 'bg-brand-primary text-brand-950 shadow-xl' : 'text-white/40 hover:text-white'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="space-y-5">
                                    {filteredEvents.length > 0 ? filteredEvents.map(event => (
                                        <div key={event.id} className="group p-8 rounded-[2.5rem] border border-white/5 bg-white/5 hover:bg-white/10 hover:border-brand-primary/50 transition-all flex flex-col md:flex-row items-center justify-between gap-10 hover:-translate-y-1">
                                            <div className="flex items-center gap-10">
                                                <div className="w-20 h-20 bg-brand-950 rounded-3xl flex flex-col items-center justify-center font-black border border-white/10 text-brand-primary shadow-sm transform group-hover:rotate-6 transition-transform">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] opacity-40">{new Date(event.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                                    <span className="text-3xl leading-none font-mono mt-1">{new Date(event.date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <div className="font-black text-2xl text-white italic uppercase tracking-tight group-hover:text-brand-primary transition-colors">{event.title}</div>
                                                    <div className="flex flex-wrap gap-8 mt-3 text-white/40 text-[11px] font-black uppercase italic tracking-widest">
                                                        <span className="flex items-center gap-3"><Clock size={16} className="text-brand-primary" /> {event.time}</span>
                                                        <span className="flex items-center gap-3"><MapPin size={16} className="text-brand-primary" /> {event.location}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 w-full md:w-auto">
                                                <button onClick={() => StorageService.toggleRSVP(event.id, user.linkedPlayerId!, 'attending')} 
                                                    className={`flex-1 md:px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-3 border ${event.rsvps?.[player.id] === 'attending' ? 'bg-brand-accent text-brand-950 border-brand-accent shadow-xl shadow-brand-accent/20' : 'bg-white/5 text-white/40 border-white/5 hover:border-brand-accent hover:text-brand-accent'}`}>
                                                    <CheckCircle2 size={18} /> Confirm
                                                </button>
                                                <button onClick={() => StorageService.toggleRSVP(event.id, user.linkedPlayerId!, 'declined')} 
                                                    className={`flex-1 md:px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-3 border ${event.rsvps?.[player.id] === 'declined' ? 'bg-red-500 text-white border-red-500 shadow-xl' : 'bg-white/5 text-white/40 border-white/5 hover:border-red-500 hover:text-red-500'}`}>
                                                    <XCircle size={18} /> Decline
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-32 text-center border-4 border-dashed border-white/5 rounded-[3rem] font-black text-white/10 uppercase tracking-[0.5em] italic">
                                            NO UPCOMING SESSIONS
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Match Performance Tracker */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="glass-card rounded-[3rem] p-6 border border-white/5 shadow-2xl flex flex-col min-h-[450px] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 -rotate-12"><Activity size={300} className="text-white" /></div>
                                    <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-4 mb-10 text-white">
                                        <Activity className="text-brand-primary" size={28} /> Match History
                                    </h3>
                                    {myMatchStats.length > 0 ? (
                                        <div className="space-y-6 flex-1">
                                        {myMatchStats.slice(0,3).map(m => (
                                            <div key={m.id} className="p-6 bg-white/5 rounded-3xl border border-white/10 group/item hover:bg-white/10 transition-all">
                                                <div className="flex justify-between items-center mb-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] font-black text-white/20 uppercase tracking-widest italic">{new Date(m.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                                        {m.playerOfTheMatchId === player.id && (
                                                            <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-500 text-[8px] font-black px-2 py-0.5 rounded-lg">
                                                                <Trophy size={10} className="fill-amber-500" /> MOTM
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {m.myStats?.rating && (
                                                            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-brand-primary text-brand-950 shadow-[0_0_15px_rgba(0,200,255,0.3)]">
                                                                <span className="text-[8px] font-black uppercase leading-none opacity-60">RTG</span>
                                                                <span className="text-xl font-black leading-none italic">{m.myStats.rating}</span>
                                                            </div>
                                                        )}
                                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black italic uppercase tracking-widest border h-fit ${m.result === 'W' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>{m.result === 'W' ? 'WON' : 'LOST'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="font-black text-xl text-white italic uppercase tracking-tighter">vs {m.opponent}</div>
                                                    <div className="text-3xl font-black text-brand-primary font-mono tracking-tighter">{m.scoreFor}<span className="text-white/20 mx-1">:</span>{m.scoreAgainst}</div>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-white/5 font-black italic uppercase tracking-[0.5em] py-12 text-center">
                                            NO MATCH DATA
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card rounded-[3rem] p-8 border border-white/5 shadow-2xl space-y-10 relative overflow-hidden flex flex-col justify-center bg-brand-950/20 backdrop-blur-3xl">
                                    <div className="flex justify-between items-center group gap-6 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white/5 text-brand-primary rounded-2xl border border-white/10 group-hover:rotate-12 transition-transform shadow-lg"><Star size={20} /></div>
                                            <div className="text-left font-black italic uppercase leading-none">
                                                <span className="text-[8px] text-white/20 uppercase tracking-widest mb-1 block">RATING</span>
                                                <span className="text-lg text-white">AVG PERFORMANCE</span>
                                            </div>
                                        </div>
                                        <div className="text-4xl font-black text-brand-primary font-mono tracking-tighter shrink-0 drop-shadow-[0_0_15px_rgba(0,200,255,0.3)]">{avgRating}</div>
                                    </div>
                                    
                                    {/* Sparkline of last 10 ratings */}
                                    {myMatchStats.length > 1 && (
                                        <div className="h-16 w-full mb-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={[...myMatchStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10).map(m => ({ r: m.myStats?.rating || 0 }))}>
                                                    <Line 
                                                        type="monotone" 
                                                        dataKey="r" 
                                                        stroke="var(--brand-primary)" 
                                                        strokeWidth={3} 
                                                        dot={false}
                                                        isAnimationActive={true}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] italic text-center mt-2">TREND: LAST 10 MATCHES</p>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-center pt-8 border-t border-white/5 group gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white/5 text-brand-primary rounded-2xl border border-white/10 group-hover:rotate-12 transition-transform shadow-lg"><Shirt size={20} /></div>
                                            <div className="text-left font-black italic uppercase leading-none">
                                                <span className="text-[8px] text-white/20 uppercase tracking-widest mb-1 block">STARTS</span>
                                                <span className="text-lg text-white">MATCH STARTS</span>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-black text-white font-mono tracking-tighter shrink-0">{totalStarts}</div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-8 border-t border-white/5 group gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white/5 text-brand-primary rounded-2xl border border-white/10 group-hover:rotate-12 transition-transform shadow-lg"><Activity size={20} /></div>
                                            <div className="text-left font-black italic uppercase leading-none">
                                                <span className="text-[8px] text-white/20 uppercase tracking-widest mb-1 block">MATCHES</span>
                                                <span className="text-lg text-white">PLAYED</span>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-black text-white font-mono tracking-tighter shrink-0">{myMatchStats.length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Side-Bar (Telemetry) */}
                        <div className="xl:col-span-5 space-y-8">
                            <div className="bg-brand-900/50 backdrop-blur-2xl p-8 rounded-[3.5rem] shadow-2xl flex flex-col items-center group text-white relative overflow-hidden border border-white/5">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Trophy size={160} /></div>
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 mb-8 transform group-hover:rotate-12 transition-transform shadow-2xl">
                                    <Trophy className="text-brand-accent" size={48} />
                                </div>
                                <div className="text-center relative z-10">
                                    <div className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 mb-2 italic">Career Stats</div>
                                    <div className="text-6xl md:text-7xl font-black italic leading-none font-mono tracking-tighter text-brand-accent drop-shadow-[0_0_15px_rgba(195,246,41,0.3)]">{totalGoals}</div>
                                    <div className="h-1.5 w-20 bg-brand-accent/20 rounded-full mt-6 mx-auto overflow-hidden">
                                        <div className="h-full bg-brand-accent animate-progress" style={{ width: '70%' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Tactical Gear Brief */}
                            <div className="glass-card rounded-[3.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className="green-light-bar" />
                                <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000"><Shirt size={140} className="text-white" /></div>
                                <h4 className="text-[11px] font-black text-brand-accent uppercase tracking-[0.4em] mb-10 italic">Equipment Checklist</h4>
                                {upcomingEvents[0] ? (
                                    <div className="space-y-8 relative z-10">
                                        <div className="flex items-center gap-8">
                                            <div className={`p-6 rounded-[2rem] border shadow-2xl transition-all duration-500 group-hover:rotate-6 ${getKitRequirement(upcomingEvents[0].date).style.replace('bg-slate-50', 'bg-white/5').replace('text-slate-400', 'text-white/40').replace('border-slate-200', 'border-white/10')}`}>
                                                <Shirt size={28} className="animate-pulse" />
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">REQUIRED UNIFORM</div>
                                                <div className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">{getKitRequirement(upcomingEvents[0].date).color}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all">
                                                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-3">FOOTWEAR</div>
                                                <div className="flex items-center gap-3">
                                                    <Dumbbell size={14} className="text-brand-accent" />
                                                    <span className="text-[10px] font-black text-white uppercase italic">Firm Ground</span>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all">
                                                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-3">HYDRATION</div>
                                                <div className="flex items-center gap-3">
                                                    <Coffee size={14} className="text-brand-accent" />
                                                    <span className="text-[10px] font-black text-white uppercase italic">Water (1.5L)</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-brand-accent" />
                                                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">EQUIPMENT READINESS: VERIFIED</span>
                                            </div>
                                            <Zap size={14} className="text-brand-accent animate-pulse" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] italic">NO UPCOMING EVENTS</div>
                                    </div>
                                )}
                            </div>

                            {/* Weekly Training Tip (Coach Assigned) */}
                            {weeklyTip && (
                                <div className="bg-brand-primary rounded-[3rem] p-8 border-2 border-brand-950 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.1] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Wand2 size={120} className="text-brand-950" /></div>
                                    <div className="flex items-center gap-4 mb-6 relative z-10">
                                        <div className="p-3 bg-brand-950 rounded-2xl flex items-center justify-center text-brand-primary">
                                            <Sparkles size={20} />
                                        </div>
                                        <h4 className="text-[11px] font-black text-brand-950 uppercase tracking-[0.3em] italic">This Week's Focus</h4>
                                    </div>
                                    
                                    <div className="relative z-10 space-y-4">
                                        <p className="text-2xl font-black text-brand-950 uppercase italic tracking-tighter leading-tight">
                                            "{weeklyTip.tip}"
                                        </p>
                                        <div className="pt-6 border-t border-brand-950/20 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-brand-950/10 flex items-center justify-center border border-brand-950/20 overflow-hidden">
                                                    <span className="text-[10px] font-black text-brand-950">{weeklyTip.setByCoach[0]}</span>
                                                </div>
                                                <span className="text-[9px] font-black text-brand-950/60 uppercase tracking-widest italic">Coach {weeklyTip.setByCoach}</span>
                                            </div>
                                            <div className="px-3 py-1 rounded-lg bg-brand-950/10 border border-brand-950/20">
                                                <span className="text-[8px] font-black text-brand-950 uppercase italic tracking-widest">WEEK {weeklyTip.week}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
{/* Hidden invoice template for download */}
            {feeStatus?.invoice && (
                <div className="fixed left-[-9999px] top-0">
                    <div ref={invoiceHiddenRef} className="bg-white w-[800px] min-h-[1000px] text-brand-950 p-12">
                         <div className="flex justify-between items-start border-b-4 border-brand-950 pb-12 mb-12">
                             <div className="flex items-center gap-6">
                                 {settings.logoUrl ? <img src={settings.logoUrl} className="h-20 object-contain" /> : <Shield className="h-20 w-20" />}
                                 <div>
                                     <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none">{settings.name}</h1>
                                     <p className="text-sm font-black uppercase tracking-widest">Official Receipt</p>
                                 </div>
                             </div>
                             <div className="text-right font-black uppercase italic italic text-xs tracking-widest text-brand-300">
                                 <p>Invoice #: {feeStatus.invoice.invoiceNo}</p>
                                 <p>Date: {new Date(feeStatus.invoice.date).toLocaleDateString()}</p>
                             </div>
                         </div>
                         <div className="mb-12">
                             <h3 className="text-xl font-black uppercase italic mb-4">Member Details</h3>
                             <div className="grid grid-cols-2 gap-8 text-sm font-black uppercase italic tracking-widest text-brand-300">
                                 <div><p className="opacity-50 font-bold">NAME</p><p className="text-brand-950">{player.fullName}</p></div>
                                 <div><p className="opacity-50 font-bold">IDENTIFIER</p><p className="text-brand-950">{player.memberId}</p></div>
                                 <div><p className="opacity-50 font-bold">PROGRAM</p><p className="text-brand-950">Academy Training</p></div>
                                 <div><p className="opacity-50 font-bold">VENUE</p><p className="text-brand-950">{player.venue}</p></div>
                             </div>
                         </div>
                         <div className="border-2 border-brand-950 rounded-3xl overflow-hidden mb-12">
                             <table className="w-full text-left font-black uppercase italic">
                                 <thead className="bg-brand-950 text-white">
                                     <tr><th className="p-6">Description</th><th className="p-6 text-right">Amount</th></tr>
                                 </thead>
                                 <tbody className="text-sm">
                                     <tr className="border-b border-brand-100"><td className="p-6">Service Fee (Base)</td><td className="p-6 text-right">ÃÂ¢ÃÂÃÂ¹ {taxes.base}</td></tr>
                                     <tr className="border-b border-brand-100"><td className="p-6">Tax Element</td><td className="p-6 text-right">ÃÂ¢ÃÂÃÂ¹ {taxes.cgst + taxes.sgst}</td></tr>
                                     <tr className="bg-brand-50"><td className="p-6 text-lg font-black italic">Total Settled</td><td className="p-6 text-2xl font-black italic text-right">ÃÂ¢ÃÂÃÂ¹ {taxes.total}</td></tr>
                                 </tbody>
                             </table>
                         </div>
                         <div className="pt-20 border-t border-brand-100 flex justify-between items-end">
                             <div className="text-[10px] font-black uppercase italic tracking-[0.3em] text-brand-300">Automated verification record. No physical signature required.</div>
                             <div className="text-right">
                                 <div className="text-2xl font-black italic text-brand-500 mb-2">{settings.name}</div>
                                 <div className="text-[8px] font-black uppercase tracking-widest text-brand-300">Management Authorization</div>
                             </div>
                         </div>
                    </div>
                </div>
            )}
            </div>
            {isCertificatesModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    <div className="absolute inset-0 bg-brand-950/90 backdrop-blur-2xl" onClick={() => setCertificatesModalOpen(false)} />
                    <div className="relative w-full max-w-4xl bg-brand-900 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">My <span className="text-brand-accent">Accolades</span></h2>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mt-2 italic">Earned Certificates // Academy Achievements</p>
                            </div>
                            <button onClick={() => setCertificatesModalOpen(false)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-10 max-h-[60vh] overflow-y-auto no-scrollbar">
                            {certificates.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto mb-8 text-white/10 border border-white/5">
                                        <Medal size={40} />
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight">No Certificates Yet</h3>
                                    <p className="text-sm text-white/30 max-w-sm mx-auto mt-4 font-medium italic uppercase tracking-wider">Complete terms, win MOTM awards, or rank in the Top 3 to earn your official academy accolades.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {certificates.map((cert) => (
                                        <div key={cert.id} className="glass-card rounded-[2.5rem] p-8 border border-white/5 hover:border-brand-accent/30 transition-all group/cert">
                                            <div className="flex items-start justify-between mb-8">
                                                <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
                                                    {cert.type === 'motm' ? <Trophy className="text-brand-accent" size={28} /> : 
                                                     cert.type === 'ranking' ? <Star className="text-brand-accent" size={28} /> : 
                                                     <Award className="text-brand-accent" size={28} />}
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[8px] font-black text-white/20 uppercase tracking-[0.3em] italic mb-1">ISSUED ON</span>
                                                    <span className="block text-[10px] font-black text-white uppercase italic tracking-widest">{new Date(cert.date).toLocaleDateString().toUpperCase()}</span>
                                                </div>
                                            </div>
                                            
                                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">{cert.title}</h3>
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic mb-8">{cert.type.toUpperCase()} RECOGNITION</p>
                                            
                                            <a 
                                                href={cert.pdfUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-full flex items-center justify-between p-4 rounded-xl bg-brand-accent text-brand-950 font-black text-[10px] uppercase tracking-widest italic hover:scale-[1.02] transition-transform active:scale-[0.98]"
                                            >
                                                DOWNLOAD PDF
                                                <Download size={16} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const History = ({ size, className }: { size?: number, className?: string }) => (
    <svg 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
);
