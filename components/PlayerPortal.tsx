import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Player, AttendanceRecord, AttendanceStatus, User, Match, ScheduleEvent, FeeRecord, AcademySettings, EventType, Drill, Certificate, CoachMessage, WeeklyTip } from '../types';
import { Trophy, Star, Calendar, Brain, DollarSign, Clock, Activity, Shield, CheckCircle2, XCircle, MapPin, Coffee, Zap, PartyPopper, PlayCircle, Download, Phone, Mail, Globe, X, Shirt, Wand2, Sparkles, Target, ArrowRight, UserCheck, ClipboardList, ChevronDown, ChevronUp, ChevronRight, Dumbbell, Play, Youtube, Loader2, Users, Command, Receipt, Medal, Crown, Award, Flame, TrendingUp } from 'lucide-react';
import { auth } from '../firebase';
import { multiFactor, TotpMultiFactorGenerator } from 'firebase/auth';
import { EvaluationCard } from './EvaluationCard';
import html2canvas from 'html2canvas';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
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

const ProgressCircle: React.FC<{ progress: number, size?: number, strokeWidth?: number, tierClass?: string, glow?: boolean }> = ({ progress, size = 84, strokeWidth = 3, tierClass = '', glow = false }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="absolute -rotate-90 pointer-events-none overflow-visible">
            {glow && (
                <circle
                    className={`${tierClass} opacity-20 blur-[6px]`}
                    strokeWidth={strokeWidth + 2}
                    strokeDasharray={`${circumference} ${circumference}`}
                    style={{ strokeDashoffset: offset }}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    strokeLinecap="round"
                />
            )}
            <circle
                className="text-white/[0.03]"
                strokeWidth={strokeWidth}
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
            />
            <circle
                className={`progress-ring__circle ${tierClass}`}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset: offset }}
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
                strokeLinecap="round"
            />
        </svg>
    );
};

const getTierData = (value: any, tiers: number[], inverse = false) => {
    // Robust numeric conversion
    const parsed = parseFloat(value);
    const numValue = !isNaN(parsed) ? parsed : (inverse ? 100 : 0);
    
    let currentTier = -1;
    if (inverse) {
        for (let i = 0; i < tiers.length; i++) {
            if (numValue <= tiers[i]) currentTier = i;
            else break;
        }
    } else {
        for (let i = 0; i < tiers.length; i++) {
            if (numValue >= tiers[i]) currentTier = i;
            else break;
        }
    }
    
    const tierNames = ['Bronze', 'Silver', 'Gold', 'Elite'];
    const tierClasses = ['badge-bronze', 'badge-silver', 'badge-gold', 'badge-platinum'];
    const tierColors = ['#cd7f32', '#e2e8f0', '#FFD700', '#00C8FF'];
    
    const nextTierValue = currentTier < tiers.length - 1 ? tiers[currentTier + 1] : null;
    const prevTierValue = currentTier === -1 ? (inverse ? 100 : 0) : tiers[currentTier];
    
    let progress = 0;
    if (currentTier === tiers.length - 1) {
        progress = 100;
    } else if (nextTierValue !== null) {
        const range = Math.abs(nextTierValue - prevTierValue);
        const currentProgress = Math.abs(numValue - prevTierValue);
        progress = (currentProgress / (range || 1)) * 100;
    }

    // Strategic advice generation
    let strategicAdvice = "";
    if (currentTier === tiers.length - 1) {
        strategicAdvice = "Maximum Tier Unlocked. You are a true Academy Legend!";
    } else {
        const nextTier = tierNames[currentTier + 1];
        const diff = nextTierValue !== null ? Math.abs(nextTierValue - numValue) : 0;
        
        if (currentTier === -1) {
            strategicAdvice = `Unlock your ${nextTier} badge by reaching ${nextTierValue}${inverse ? ' or less' : ''}. Keep grinding!`;
        } else {
            strategicAdvice = `You're ${diff.toFixed(0)} units away from ${nextTier}! ${diff <= 5 ? "Almost there!" : "Keep pushing!"}`;
        }
    }

    return {
        level: currentTier + 1, // 0 to 4
        tierName: currentTier === -1 ? 'Initiate' : tierNames[currentTier],
        nextTierName: currentTier < tiers.length - 1 ? tierNames[currentTier + 1] : 'MAX',
        tierClass: currentTier === -1 ? 'badge-locked' : tierClasses[currentTier],
        tierColor: currentTier === -1 ? '#ffffff33' : tierColors[currentTier],
        progress: Math.min(100, Math.max(0, progress)),
        isMaxed: currentTier === tiers.length - 1,
        nextValue: nextTierValue,
        remaining: nextTierValue !== null ? Math.max(0, Math.abs(nextTierValue - numValue)) : 0,
        currentValue: numValue,
        strategicAdvice
    };
};

const getMasteryData = (score: number) => {
    const levels = [
        { min: 0, title: "Unranked Recruit", icon: UserCheck, class: "text-slate-400", bg: "bg-slate-400/5", border: "border-slate-400/10" },
        { min: 500, title: "Rising Prospect", icon: Zap, class: "text-brand-accent", bg: "bg-brand-accent/5", border: "border-brand-accent/10" },
        { min: 1500, title: "Vanguard Sentinel", icon: Shield, class: "text-blue-400", bg: "bg-blue-400/5", border: "border-blue-400/10" },
        { min: 3000, title: "Elite Strategist", icon: Target, class: "text-purple-400", bg: "bg-purple-400/5", border: "border-purple-400/10" },
        { min: 4500, title: "Master Tactician", icon: Crown, class: "text-brand-primary", bg: "bg-brand-primary/5", border: "border-brand-primary/10" },
        { min: 6000, title: "Immortal Titan", icon: Sparkles, class: "text-orange-500", bg: "bg-orange-500/5", border: "border-orange-500/10" }
    ];
    return [...levels].reverse().find(l => score >= l.min) || levels[0];
};

const convertImageToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        if (!url) {
            resolve('/default-avatar.png');
            return;
        }
        if (url.startsWith('data:')) {
            resolve(url);
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                    return;
                }
            } catch (e) {
                console.error('Canvas conversion failed:', e);
            }
            resolve(url);
        };
        img.onerror = () => {
            console.error('Image load failed for base64 conversion:', url);
            resolve('/default-avatar.png');
        };
        img.src = url.includes('?') ? `${url}&cachebust=${Date.now()}` : `${url}?cachebust=${Date.now()}`;
    });
};

export const PlayerPortal: React.FC<PlayerPortalProps> = ({ user, initialSection }) => {
    const [player, setPlayer] = useState<Player | null>(null);
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    const [playerPhotoBase64, setPlayerPhotoBase64] = useState<string>('');
    const [academyLogoBase64, setAcademyLogoBase64] = useState<string>('');
    const [invoiceTemplate, setInvoiceTemplate] = useState<string | null>(localStorage.getItem('icarus_invoice_template'));

    // MFA Enrollment State
    const [isMfaEnrolled, setIsMfaEnrolled] = useState(false);
    const [showMfaEnrollModal, setShowMfaEnrollModal] = useState(false);
    const [mfaSecret, setMfaSecret] = useState<any | null>(null);
    const [mfaSecretKey, setMfaSecretKey] = useState('');
    const [mfaQrUrl, setMfaQrUrl] = useState('');
    const [mfaVerifyCode, setMfaVerifyCode] = useState('');
    const [mfaError, setMfaError] = useState('');
    const [mfaSuccessMsg, setMfaSuccessMsg] = useState('');
    const [isEnrolling, setIsEnrolling] = useState(false);

    useEffect(() => {
        if (auth.currentUser) {
            const enrolled = multiFactor(auth.currentUser).enrolledFactors.length > 0;
            setIsMfaEnrolled(enrolled);
        }
    }, [user, player]);

    const handleStartMfaEnrollment = async () => {
        setMfaError('');
        setMfaSuccessMsg('');
        setIsEnrolling(true);
        try {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) throw new Error("No active authenticated session.");
            
            // 1. Start enrollment session
            const session = await multiFactor(firebaseUser).getSession();
            
            // 2. Generate secret
            const secret = await TotpMultiFactorGenerator.generateSecret(session);
            setMfaSecret(secret);
            setMfaSecretKey(secret.secretKey);
            
            // 3. Generate QR code URL
            const email = firebaseUser.email || user.username || 'user';
            const qrUrl = secret.generateQrCodeUrl(email, settings.name || 'Icarus Football Academy');
            setMfaQrUrl(qrUrl);
            
            setShowMfaEnrollModal(true);
        } catch (err: any) {
            console.error("MFA enrollment initiation failed:", err);
            setMfaError(err.message || "Failed to initialize 2FA enrollment.");
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleConfirmMfaEnrollment = async () => {
        setMfaError('');
        setIsEnrolling(true);
        try {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser || !mfaSecret) throw new Error("Missing active enrollment session.");
            
            if (mfaVerifyCode.trim().length !== 6) {
                throw new Error("Verification code must be exactly 6 digits.");
            }
            
            // 1. Create enrollment assertion
            const assertion = TotpMultiFactorGenerator.assertionForEnrollment(mfaSecret, mfaVerifyCode.trim());
            
            // 2. Complete enrollment
            await multiFactor(firebaseUser).enroll(assertion, "My Authenticator App");
            
            setIsMfaEnrolled(true);
            setMfaSuccessMsg("2-Factor Authentication successfully enrolled!");
            setTimeout(() => {
                setShowMfaEnrollModal(false);
                setMfaSecret(null);
                setMfaQrUrl('');
                setMfaSecretKey('');
                setMfaVerifyCode('');
                setMfaSuccessMsg('');
            }, 2500);
        } catch (err: any) {
            console.error("MFA enrollment confirmation failed:", err);
            setMfaError(err.message || "Invalid verification code. Please try again.");
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleDisableMfa = async () => {
        if (!confirm("Are you sure you want to disable 2-Factor Authentication? Your account will be less secure.")) return;
        
        setMfaError('');
        try {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) throw new Error("No active authenticated session.");
            
            const mfaUser = multiFactor(firebaseUser);
            const enrolled = mfaUser.enrolledFactors;
            
            // Find the TOTP factor to un-enroll
            const totpFactor = enrolled.find(f => f.factorId === 'totp');
            if (totpFactor) {
                await mfaUser.unenroll(totpFactor);
                setIsMfaEnrolled(false);
                alert("2-Factor Authentication has been disabled.");
            } else if (enrolled.length > 0) {
                await mfaUser.unenroll(enrolled[0]);
                setIsMfaEnrolled(false);
                alert("2-Factor Authentication has been disabled.");
            } else {
                alert("No active 2FA factors found.");
            }
        } catch (err: any) {
            console.error("Failed to disable MFA:", err);
            alert(err.message || "Failed to disable 2-Factor Authentication.");
        }
    };

    useEffect(() => {
        if (player?.photoUrl) {
            convertImageToBase64(player.photoUrl).then(setPlayerPhotoBase64);
        } else {
            setPlayerPhotoBase64('/default-avatar.png');
        }
    }, [player?.photoUrl]);

    useEffect(() => {
        if (settings?.logoUrl) {
            convertImageToBase64(settings.logoUrl).then(setAcademyLogoBase64);
        } else {
            setAcademyLogoBase64('');
        }
    }, [settings?.logoUrl, player]); // 'player' added to re-trigger if player profile changes

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
    const [isAttendanceModalOpen, setAttendanceModalOpen] = useState(false);
    const [selectedAttendanceDetail, setSelectedAttendanceDetail] = useState<{date: string, record?: AttendanceRecord, event?: ScheduleEvent} | null>(null);
    const [viewingSessionPlan, setViewingSessionPlan] = useState<ScheduleEvent | null>(null);
    const [viewingMatch, setViewingMatch] = useState<any | null>(null);
    const [motmToday, setMotmToday] = useState<{playerId: string, timestamp: number} | null>(null);
    const [checkedInToday, setCheckedInToday] = useState(false);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [isCertificatesModalOpen, setCertificatesModalOpen] = useState(false);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [weeklyTip, setWeeklyTip] = useState<WeeklyTip | null>(null);
    const [selectedBadge, setSelectedBadge] = useState<{config: any, tierData: any} | null>(null);
    const [isRecentSessionsOpen, setIsRecentSessionsOpen] = useState(false);
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

    const { monthlyRank: academyRank, allTimeRank, derivedStats } = React.useMemo(() => {
        if (!player) return { monthlyRank: null, allTimeRank: null, derivedStats: null };
        
        const allMs = StorageService.getMatches();
        const allPs = StorageService.getPlayers();
        const mvpData = JSON.parse(localStorage.getItem('icarus_session_motm') || '{}');
        const currentMonth = new Date().toISOString().slice(0, 7);

        const calculateRankings = (filterFn?: (date: string) => boolean) => {
            const mvpDataSafe = typeof mvpData === 'object' && mvpData !== null ? mvpData : {};
            return allPs.map(p => {
                const tCount = Object.entries(mvpDataSafe).filter(([key, val]) => {
                    if (!val) return false;
                    const entryId = (typeof val === 'object' && val !== null) ? (val as any).playerId : val;
                    return entryId === p.id && (!filterFn || filterFn(key));
                }).length;
                
                const mCount = allMs.filter(m => (!filterFn || filterFn(m.date)) && m.playerOfTheMatchId === p.id).length;
                
                const rPts = allMs.filter(m => (!filterFn || filterFn(m.date)))
                    .reduce((acc, m) => {
                        const s = m.playerStats?.find(ps => ps.playerId === p.id);
                        return acc + ((s?.rating || 0) / 2);
                    }, 0);
                
                const total = parseFloat((tCount * 1 + mCount * 5 + rPts).toFixed(1));
                return { id: p.id, pts: total };
            }).sort((a, b) => b.pts - a.pts);
        };

        const mRankings = calculateRankings(date => date.startsWith(currentMonth));
        const aRankings = calculateRankings();

        const getPlayerRank = (rankings: {id: string, pts: number}[], playerId: string) => {
            const idx = rankings.findIndex(r => r.id === playerId);
            if (idx !== -1 && rankings[idx].pts > 0) {
                const percentile = Math.ceil(((idx + 1) / rankings.length) * 100);
                return { rank: idx + 1, total: rankings.length, pts: rankings[idx].pts, percentile };
            }
            return null;
        };

        const mRank = getPlayerRank(mRankings, player.id);
        const aRank = getPlayerRank(aRankings, player.id);

        // --- Derived Stats Logic ---
        const presentCount = attendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;
        
        const myMatches = matches.filter(m => m.playerStats?.some(s => s.playerId === player.id));
        const myMatchStats = myMatches.map(m => ({
            id: m.id,
            date: m.date,
            opponent: m.opponent,
            result: m.result,
            scoreFor: m.scoreFor,
            scoreAgainst: m.scoreAgainst,
            playerOfTheMatchId: m.playerOfTheMatchId,
            events: m.events,
            highlightsUrl: m.highlightsUrl,
            report: m.report,
            myStats: m.playerStats.find(s => s.playerId === player.id)
        })).filter(m => m.myStats);

        const lastMatch = myMatches.length > 0 ? [...myMatches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

        const totalWins = myMatches.filter(m => m.result === 'W').length;
        const totalGoals = myMatchStats.reduce((acc, m) => acc + (m.myStats?.goals || 0), 0);
        const totalAssists = myMatchStats.reduce((acc, m) => acc + (m.myStats?.assists || 0), 0);
        const totalStarts = myMatchStats.reduce((acc, m) => acc + (m.myStats?.isStarter ? 1 : 0), 0);
        const winRate = myMatches.length > 0 ? Math.round((totalWins / myMatches.length) * 100) : 0;
        const avgRating = myMatchStats.length > 0 
            ? parseFloat((myMatchStats.reduce((acc, m) => acc + (m.myStats?.rating || 0), 0) / myMatchStats.length).toFixed(1)) 
            : 0;
        
        const motmCount = myMatches.filter(m => m.playerOfTheMatchId === player.id).length;

        // Badge Generation
        const badgesData = {
            iron_will: getTierData(attendanceRate, [50, 75, 90, 100]),
            century: getTierData(presentCount, [10, 50, 100, 250]),
            victor: getTierData(totalWins, [1, 10, 25, 50]),
            elite: getTierData(aRank?.percentile || 100, [25, 10, 5, 1], true),
            striker: getTierData(totalGoals, [1, 5, 10, 20]),
            architect: getTierData(totalAssists, [1, 5, 10, 20]),
            mainman: getTierData(motmCount, [1, 3, 7, 15])
        };

        const activeBadgeCount = Object.values(badgesData).filter(b => b.level > 0).length;
        const powerScore = Object.values(badgesData).reduce((acc, b) => acc + (b.level * 250) + Math.round(b.progress * 2.5), 0);
        const mastery = getMasteryData(powerScore);
        
        const badgeLabels: {[key: string]: string} = {
            iron_will: 'IRON WILL',
            century: 'CENTURY',
            victor: 'VICTOR',
            elite: 'TOP GUN',
            striker: 'STRIKER',
            architect: 'ARCHITECT',
            mainman: 'MAIN MAN'
        };

        const nextAchievement = Object.entries(badgesData)
            .map(([id, b]) => ({ ...b, id, label: badgeLabels[id] }))
            .filter(b => !b.isMaxed)
            .sort((a, b) => b.progress - a.progress)[0] || null;

        return {
            monthlyRank: mRank,
            allTimeRank: aRank,
            derivedStats: {
                attendanceRate,
                presentCount,
                totalWins,
                totalGoals,
                totalAssists,
                totalStarts,
                winRate,
                avgRating,
                motmCount,
                powerScore,
                badgesData,
                mastery,
                nextAchievement,
                activeBadgeCount,
                maxPossibleXP: 7000,
                myMatchStats,
                lastMatch
            }
        };
    }, [player, attendance, matches]);

    const {
        attendanceRate = 0,
        presentCount = 0,
        totalWins = 0,
        totalGoals = 0,
        totalAssists = 0,
        totalStarts = 0,
        winRate = 0,
        avgRating = 0,
        motmCount = 0,
        powerScore = 0,
        badgesData = {} as any,
        mastery = { title: 'Rookie', icon: Users, class: 'text-slate-400', bg: 'bg-slate-400/5', border: 'border-slate-400/10' },
        nextAchievement = null,
        activeBadgeCount = 0,
        maxPossibleXP = 7000,
        myMatchStats = [],
        lastMatch = null
    } = derivedStats || {};



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

    const nextEvent = React.useMemo(() => {
        if (!player || allSchedule.length === 0) return null;
        const now = new Date();
        return allSchedule
            .filter(e => {
                const venueMatch = !e.location || !player.venue || e.location === player.venue;
                const batchMatch = !(e as any).batch || !player.batch || (e as any).batch === player.batch;
                return venueMatch && batchMatch;
            })
            .filter(e => new Date(`${e.date}T${e.time}`) > now)
            .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())[0];
    }, [allSchedule, player]);

    const countdown = React.useMemo(() => {
        if (!nextEvent) return null;
        const now = new Date();
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
    }, [nextEvent]);


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
        const originalScrollPos = window.scrollY;
        window.scrollTo(0, 0);

        try {
            const canvas = await html2canvas(invoiceHiddenRef.current, {
                scale: 3, // Higher scale for crisp PDF quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 595,
                windowHeight: 842,
                width: 595,
                height: 842,
                y: 0,
                x: 0,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('icarus-invoice-capture-student');
                    if (el) {
                        el.style.transform = 'none';
                        el.style.left = '0';
                        el.style.marginLeft = '0';
                        el.style.top = '0';
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [595, 842]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 595, 842, undefined, 'FAST');
            pdf.save(`Invoice_${player?.fullName.replace(/\s+/g, '_') || 'ATHLETE'}_${feeStatus.invoice.invoiceNo}.pdf`);
        } catch (error) {
            console.error('Invoice Export Error:', error);
            alert('Could not generate invoice download.');
        } finally {
            window.scrollTo(0, originalScrollPos);
        }
    };
    const handleDownloadIDCard = async () => {
        if (!idCardRef.current) {
            console.error('ID Card ref not found');
            return;
        }
        try {
            // Short delay to ensure browser paints any updated state
            await new Promise(r => setTimeout(r, 100));

            // Primary capture method: html-to-image
            const dataUrl = await htmlToImage.toPng(idCardRef.current, {
                quality: 1.0,
                pixelRatio: 3,
                width: 420,
                height: 680,
                style: {
                    display: 'flex',
                    visibility: 'visible',
                    position: 'relative',
                    left: '0',
                    top: '0',
                    transform: 'none'
                }
            });

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `OFFICIAL_PASS_${player?.fullName.replace(/\s+/g, '_') || 'ATHLETE'}_${player?.memberId || 'ID'}.png`;
            link.click();
        } catch (error) {
            console.warn('html-to-image failed, falling back to html2canvas:', error);
            
            // Fallback capture method: html2canvas
            try {
                const canvas = await html2canvas(idCardRef.current, { 
                    scale: 3, 
                    useCORS: true, 
                    width: 420,
                    height: 680,
                    backgroundColor: '#05081E', 
                    logging: false,
                    allowTaint: false,
                    imageTimeout: 10000,
                    onclone: (clonedDoc) => {
                        const el = clonedDoc.querySelector('[ref="idCardRef"]');
                        if (el) (el as HTMLElement).style.display = 'block';
                    }
                });
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png', 1.0);
                link.download = `OFFICIAL_PASS_${player?.fullName.replace(/\s+/g, '_') || 'ATHLETE'}_${player?.memberId || 'ID'}.png`;
                link.click();
            } catch (fallbackError) {
                console.error('ID Card Generation completely failed:', fallbackError);
                alert(`Could not generate ID Card. Error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`); 
            }
        }
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

            <div className="max-w-7xl mx-auto space-y-6 relative z-10">

            {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ ID Card Generator (Hidden) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
            {/* ─── ID Card Generator (Hidden Premium Version) ────────────────── */}
            <div className="fixed left-[-9999px] top-0">
                <div ref={idCardRef} 
                    style={{ 
                        width: '420px', 
                        height: '680px', 
                        backgroundColor: '#05081E', 
                        backgroundImage: 'linear-gradient(135deg, #05081E 0%, #0B1238 100%)',
                        position: 'relative', 
                        overflow: 'hidden', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        color: '#FFFFFF', 
                        border: '2px solid rgba(0, 200, 255, 0.25)', 
                        borderRadius: '2.5rem',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        fontFamily: 'Inter, sans-serif'
                    }}>
                    
                    {/* Atmospheric Lighting Blooms */}
                    <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 200, 255, 0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(195, 246, 41, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    
                    {/* Technical Grid Overlay */}
                    <div style={{ 
                        position: 'absolute', 
                        inset: 0, 
                        opacity: 0.03, 
                        pointerEvents: 'none',
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 15px, #FFFFFF 15px, #FFFFFF 16px), repeating-linear-gradient(90deg, transparent, transparent 15px, #FFFFFF 15px, #FFFFFF 16px)' 
                    }} />

                    {/* Pro Jersey Number Watermark inside Background */}
                    <div style={{
                        position: 'absolute',
                        top: '55%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '220px',
                        fontWeight: 900,
                        fontFamily: 'Oswald, sans-serif',
                        color: 'rgba(255, 255, 255, 0.02)',
                        fontStyle: 'italic',
                        pointerEvents: 'none',
                        zIndex: 1,
                        letterSpacing: '-0.05em'
                    }}>
                        {player.jerseyNumber || '00'}
                    </div>

                    {/* Glowing Accents */}
                    <div style={{ position: 'absolute', top: '24px', left: '24px', width: '12px', height: '12px', borderTop: '2px solid #00C8FF', borderLeft: '2px solid #00C8FF' }} />
                    <div style={{ position: 'absolute', top: '24px', right: '24px', width: '12px', height: '12px', borderTop: '2px solid #00C8FF', borderRight: '2px solid #00C8FF' }} />
                    <div style={{ position: 'absolute', bottom: '24px', left: '24px', width: '12px', height: '12px', borderBottom: '2px solid #00C8FF', borderLeft: '2px solid #00C8FF' }} />
                    <div style={{ position: 'absolute', bottom: '24px', right: '24px', width: '12px', height: '12px', borderBottom: '2px solid #00C8FF', borderRight: '2px solid #00C8FF' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', padding: '36px 28px', boxSizing: 'border-box', justifyContent: 'space-between', zIndex: 10 }}>
                        
                        {/* Header: Academy Branding */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', zIndex: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    border: '1.5px solid rgba(0, 200, 255, 0.3)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#000000',
                                    boxShadow: '0 0 10px rgba(0, 200, 255, 0.2)'
                                }}>
                                    {academyLogoBase64 ? (
                                        <img src={academyLogoBase64} style={{ width: '85%', height: '85%', objectFit: 'contain' }} alt="Logo" />
                                    ) : (
                                        <Shield style={{ width: '20px', height: '20px', color: '#00C8FF' }} />
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#FFFFFF', fontFamily: 'Oswald, sans-serif', lineHeight: 1.1 }}>
                                        {settings.name || 'ICARUS SCHOOLS'}
                                    </span>
                                    <span style={{ fontSize: '7px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '1px' }}>
                                        ATHLETE ACADEMY
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
                                <span style={{ fontSize: '7px', fontWeight: 900, color: '#C3F629', textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'Orbitron, sans-serif', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(195,246,41,0.08)', border: '1px solid rgba(195,246,41,0.2)' }}>
                                    OFFICIAL PASS
                                </span>
                            </div>
                        </div>

                        {/* Profile Image & Role */}
                        <div style={{ position: 'relative', marginTop: '14px', zIndex: 5 }}>
                            {/* Glow behind Avatar */}
                            <div style={{ position: 'absolute', inset: '-14px', background: 'radial-gradient(circle, rgba(0, 200, 255, 0.3) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(6px)' }} />
                            
                            {/* Inner/Outer Border Rings */}
                            <div style={{
                                position: 'relative',
                                width: '150px',
                                height: '150px',
                                borderRadius: '50%',
                                padding: '3px',
                                background: 'linear-gradient(135deg, #00C8FF 0%, #C3F629 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 12px 30px rgba(0,0,0,0.6)'
                            }}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    backgroundColor: '#05081E',
                                    border: '3px solid #05081E'
                                }}>
                                    <img 
                                        src={playerPhotoBase64 || '/default-avatar.png'} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        alt="Profile" 
                                    />
                                </div>
                            </div>

                            {/* Position Pill Overlay */}
                            <div style={{
                                position: 'absolute',
                                bottom: '-8px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#C3F629',
                                color: '#05081E',
                                padding: '5px 16px',
                                borderRadius: '9999px',
                                fontSize: '9px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                fontStyle: 'italic',
                                border: '2.5px solid #05081E',
                                boxShadow: '0 6px 15px rgba(0,0,0,0.4)',
                                whiteSpace: 'nowrap',
                                fontFamily: 'Montserrat, sans-serif'
                            }}>
                                {player.position || 'ATHLETE'}
                            </div>
                        </div>

                        {/* Player Identification */}
                        <div style={{ textAlign: 'center', marginTop: '16px', width: '100%', zIndex: 5 }}>
                            <span style={{ fontSize: '8px', color: 'rgba(0, 200, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.35em', fontFamily: 'Orbitron, sans-serif', display: 'block', marginBottom: '6px' }}>
                                ATHLETE IDENTITY
                            </span>
                            <h1 style={{ 
                                fontSize: '34px', 
                                fontWeight: 900, 
                                textTransform: 'uppercase', 
                                letterSpacing: '-0.02em', 
                                lineHeight: 1.0, 
                                color: '#FFFFFF', 
                                fontStyle: 'italic', 
                                fontFamily: 'Oswald, sans-serif',
                                margin: '0 auto',
                                maxWidth: '340px'
                            }}>
                                {player.fullName.split(' ')[0]}
                                {player.fullName.split(' ').length > 1 && (
                                    <span style={{ display: 'block', color: '#00C8FF', textShadow: '0 0 15px rgba(0,200,255,0.4)', marginTop: '2px' }}>
                                        {player.fullName.split(' ').slice(1).join(' ')}
                                    </span>
                                )}
                            </h1>
                            
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', marginTop: '14px' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#C3F629' }} />
                                    <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Orbitron, sans-serif', fontWeight: 600, letterSpacing: '0.08em' }}>
                                        {player.memberId || 'ID UNKNOWN'}
                                    </span>
                                </div>
                                {player.jerseyNumber && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#00C8FF' }} />
                                        <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Orbitron, sans-serif', fontWeight: 600, letterSpacing: '0.08em' }}>
                                            SQUAD #{player.jerseyNumber}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tactical Detail 2x2 Grid (Immune to bottom clipping) */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            width: '100%', 
                            gap: '10px', 
                            marginTop: '18px',
                            zIndex: 5
                        }}>
                            {/* Batch Panel */}
                            <div style={{ padding: '8px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '6.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '2px', fontFamily: 'Montserrat, sans-serif' }}>BATCH</span>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', fontStyle: 'italic', fontFamily: 'Oswald, sans-serif', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2' }}>
                                    {player.batch || 'GENERAL'}
                                </span>
                            </div>

                            {/* Venue Panel */}
                            <div style={{ padding: '8px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '6.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '2px', fontFamily: 'Montserrat, sans-serif' }}>VENUE</span>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', fontStyle: 'italic', fontFamily: 'Oswald, sans-serif', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2' }}>
                                    {player.venue || 'CENTRAL'}
                                </span>
                            </div>

                            {/* DOB Panel */}
                            <div style={{ padding: '8px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '6.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '2px', fontFamily: 'Montserrat, sans-serif' }}>DATE OF BIRTH</span>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', fontStyle: 'italic', fontFamily: 'Oswald, sans-serif', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2' }}>
                                    {player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'U-12'}
                                </span>
                            </div>

                            {/* Program Panel */}
                            <div style={{ padding: '8px 12px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '6.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '2px', fontFamily: 'Montserrat, sans-serif' }}>PROGRAM</span>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#C3F629', fontStyle: 'italic', fontFamily: 'Oswald, sans-serif', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2' }}>
                                    {player.program || 'PRO TRAINING'}
                                </span>
                            </div>
                        </div>

                        {/* Visual Barcode & Footer Authentication */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '12px', zIndex: 5 }}>
                            {/* Beautiful pure-CSS technical barcode */}
                            <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '22px', opacity: 0.2, justifyContent: 'center', width: '180px', marginBottom: '10px' }}>
                                {[2, 4, 1, 3, 2, 5, 1, 3, 2, 4, 1, 2, 5, 2, 1, 3, 4, 1, 2].map((w, i) => (
                                    <div key={i} style={{ width: `${w}px`, height: '100%', backgroundColor: '#FFFFFF' }} />
                                ))}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '6.5px', fontWeight: 900, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.25em', fontFamily: 'Orbitron, sans-serif' }}>
                                <span>SECURE ACCESS</span>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#C3F629' }} />
                                <span>SYSTEM v4.0</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Premium Invoice Receipt Generator (Hidden) */}
                {feeStatus?.invoice && (
                    <div
                        ref={invoiceHiddenRef}
                        id="icarus-invoice-capture-student"
                        style={{ 
                            position: 'relative', 
                            width: '595px', 
                            height: '842px', 
                            flexShrink: 0, 
                            overflow: 'hidden',
                            backgroundColor: '#ffffff'
                        }}
                    >
                        {/* ICARUS branded PNG background */}
                        <img
                            src={invoiceTemplate || "/icarus-invoice.png?v=5"}
                            alt="Invoice Template"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
                            crossOrigin="anonymous"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = 'icarus-invoice.png';
                            }}
                        />

                        {/* Absolute-positioned data overlay (Identical Admin Calibration) */}
                        <div style={{ position: 'absolute', inset: 0, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5px', color: '#111', pointerEvents: 'none', zIndex: 10 }}>

                            {/* ── HEADER BOX (Top Right) ────────────────── */}
                            <span style={{ position: 'absolute', top: '133px', left: '412px', fontWeight: 800, color: '#111' }}>
                                {feeStatus.invoice.invoiceNo.replace('INV-', '')}
                            </span>

                            <span style={{ position: 'absolute', top: '133px', left: '504px', fontWeight: 800, color: '#111' }}>
                                {feeStatus.invoice.date ? new Date(feeStatus.invoice.date).toLocaleDateString('en-GB') : ''}
                            </span>

                            {/* BILLED TO section - Exact Admin Data Mapping */}
                            <span style={{ position: 'absolute', top: '220px', left: '120px', fontWeight: 700 }}>
                                {player.parentName || ''}
                            </span>
                            <span style={{ position: 'absolute', top: '220px', left: '331px', fontWeight: 700 }}>
                                {player.email || ''}
                            </span>

                            <span style={{ position: 'absolute', top: '245px', left: '120px', fontWeight: 700 }}>
                                {player.fullName || ''}
                            </span>
                            <span style={{ position: 'absolute', top: '245px', left: '331px', fontWeight: 700, maxWidth: '240px', lineHeight: '1.2' }}>
                                {player.address || ''}
                            </span>

                            <span style={{ position: 'absolute', top: '271px', left: '120px', fontWeight: 700 }}>
                                {player.contactNumber?.startsWith('+') 
                                    ? player.contactNumber 
                                    : player.contactNumber ? `+91 ${player.contactNumber}` : ''}
                            </span>
                            <span style={{ position: 'absolute', top: '271px', left: '331px', fontWeight: 700 }}>
                                {player.position ? player.position : ''}
                            </span>

                            {/* ── PROGRAM DETAILS SECTION ──────────────── */}
                            <span style={{ position: 'absolute', top: '354px', left: '125px', fontWeight: 700 }}>
                                {player.program || 'Monthly Elite Training'}
                            </span>
                            <span style={{ position: 'absolute', top: '354px', left: '335px', fontWeight: 700 }}>
                                Mon – Fri
                            </span>

                            <span style={{ position: 'absolute', top: '380px', left: '125px', fontWeight: 700, maxWidth: '210px' }}>
                                {player.venue || 'Gaur City, Noida'}
                            </span>
                            <span style={{ position: 'absolute', top: '380px', left: '335px', fontWeight: 700 }}>
                                Abhishek Begal
                            </span>

                            {/* ── PAYMENT TABLE ───────────────────────── */}
                            <div style={{ position: 'absolute', top: '490px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 700 }}>
                                ₹ {taxes.base}
                            </div>
                            <div style={{ position: 'absolute', top: '516px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 700 }}>
                                ₹ {taxes.cgst}
                            </div>
                            <div style={{ position: 'absolute', top: '542px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 700 }}>
                                ₹ {taxes.sgst}
                            </div>
                            {/* FINAL TOTAL — flush in text row */}
                            <div style={{ position: 'absolute', top: '568px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 850, color: '#fff' }}>
                                ₹ {taxes.total}
                            </div>
                            
                            {/* ── FOOTER BOX (Metadata) ────────────────── */}
                            <span style={{ position: 'absolute', top: '604px', left: '95px', fontWeight: 700 }}>
                                {feeStatus.invoice.paymentMode}
                            </span>
                            <span style={{ position: 'absolute', top: '604px', left: '275px', fontWeight: 700 }}>
                                {feeStatus.invoice.date ? new Date(feeStatus.invoice.date).toLocaleDateString('en-GB') : ''}
                            </span>
                            <span style={{ position: 'absolute', top: '604px', left: '445px', fontWeight: 700 }}>
                                {feeStatus.invoice.validTill ? new Date(feeStatus.invoice.validTill).toLocaleDateString('en-GB') : ''}
                            </span>

                            {/* AMOUNT IN WORDS */}
                            <span style={{ position: 'absolute', top: '639px', left: '155px', fontWeight: 700, color: '#1a365d' }}>
                                {numberToWords(feeStatus.invoice.amount)}
                            </span>

                            {/* AUTHORIZED SIGNATORY SECTION */}
                            <div style={{ position: 'absolute', top: '754px', left: '135px', textAlign: 'left' }}>
                                <div style={{ fontWeight: 800, fontSize: '11px', color: '#111', textDecoration: 'underline' }}>
                                    ABHISHEK BEGAL
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>

            {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Navigation HUD ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                <div className="flex p-1 rounded-xl bg-white/5 border border-white/5 backdrop-blur-xl gap-1 shadow-xl overflow-x-auto w-full lg:w-auto no-scrollbar">
                    {( [['overview', 'DASHBOARD'], ['scout', 'SCOUT REPORT']] as const).map(([m, label]) => (
                        <button key={m} onClick={() => setViewMode(m as any)}
                            className={`flex-1 lg:flex-none px-4 lg:px-8 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-2 italic whitespace-nowrap
                                ${viewMode === m
                                    ? 'bg-brand-primary text-brand-950 shadow-[0_0_15px_rgba(0,200,255,0.3)] border border-brand-primary/30'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                            {m === 'scout' ? <Target size={12} className={viewMode === m ? 'text-brand-accent' : ''} /> : <Command size={12} className={viewMode === m ? 'text-brand-accent' : ''} />}
                            {label}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {coaches.slice(0, 3).map((c, i) => (
                            <div key={c.id} className="w-6 h-6 rounded-full border border-brand-950 bg-white/5 overflow-hidden" style={{ zIndex: 3-i }}>
                                <img src={c.photoUrl} className="w-full h-full object-cover" alt="Coach" />
                            </div>
                        ))}
                    </div>
                    <div className="text-right">
                        <p className="text-[7px] font-black text-white/20 uppercase tracking-widest">HEAD COACH</p>
                        <p className="text-[8px] font-black text-white italic uppercase">{coaches[0]?.username || 'Coaching Team'}</p>
                    </div>
                </div>
            </div>


            {viewMode === 'scout' ? (
              <div className="animate-in slide-in-from-right-8 duration-500">
                <EvaluationCard 
                  player={player} 
                  settings={settings} 
                  attendance={attendance} 
                  matches={matches} 
                  onClose={() => setViewMode('overview')}
                />
              </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-left-8 duration-500">
                    {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Athlete Hero HUD (Digital Stadium Elite) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
                    <div className="relative rounded-[3rem] p-10 md:p-16 border border-white/5 shadow-2xl overflow-hidden group bg-brand-900/40 backdrop-blur-3xl">
                        <div className="green-light-bar" />
                        {/* Background Elements */}
                        <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
                             style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 21px)' }} />
                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                            <Shield size={400} className="text-white" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-6 xl:gap-10 text-white">
                            {/* Left Zone (60%): Identity */}
                            <div className="xl:w-[60%] flex flex-col md:flex-row items-center gap-5 md:gap-8">
                                <div className="relative shrink-0">
                                    <div className="absolute -inset-3 bg-brand-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-[1.5rem] p-1 bg-white/5 border border-white/10 shadow-xl overflow-hidden">
                                        <img src={player.photoUrl} className="w-full h-full rounded-[1.25rem] object-cover filter saturate-[1.2] contrast-[1.05]" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-brand-secondary text-white px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] shadow-xl border border-brand-accent/50 italic">
                                        {player.position}
                                    </div>
                                </div>
                                
                                <div className="text-center md:text-left">
                                    <div className="flex flex-wrap items-center gap-2 mb-3 justify-center md:justify-start">
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-brand-accent/10 border border-brand-accent/20 backdrop-blur-md">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                                            <span className="text-[8px] font-black text-brand-accent uppercase tracking-[0.2em] italic">Active</span>
                                        </div>
                                        
                                        {countdown && (
                                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-brand-primary/10 border border-brand-primary/20 backdrop-blur-md">
                                                <Clock size={9} className="text-brand-primary" />
                                                <span className="text-[8px] font-black text-brand-primary uppercase tracking-[0.15em] italic">{countdown.text}</span>
                                            </div>
                                        )}
                                        <span className="text-white/20 text-[9px] font-black tracking-[0.3em] uppercase italic">{player.memberId}</span>
                                    </div>
                                    
                                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-[0.9] mb-4 italic" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                        {player.fullName.split(' ')[0]}<br/>
                                        {player.fullName.split(' ').length > 1 && (
                                            <span className="text-brand-primary drop-shadow-[0_0_15px_rgba(0,200,255,0.3)]">
                                                {player.fullName.split(' ').slice(1).join(' ')}
                                            </span>
                                        )}
                                    </h1>

                                    {(() => {
                                        const MasteryIcon = mastery.icon;
                                        const isOnFire = attendanceRate >= 95 || (myMatchStats.length >= 3 && myMatchStats.slice(0,3).every(m => (m.myStats?.rating || 0) >= 8.5));
                                        return (
                                            <div className="flex items-center gap-3 mb-4 justify-center md:justify-start flex-wrap">
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${mastery.bg} border ${mastery.border} backdrop-blur-xl transition-all duration-500`}>
                                                    <MasteryIcon size={14} className={`${mastery.class}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter italic leading-none ${mastery.class}`}>{mastery.title}</span>
                                                </div>
                                                {isOnFire && (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 border border-orange-500/40 animate-pulse">
                                                        <Flame size={12} className="text-orange-500 fill-orange-500" />
                                                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest italic">ON FIRE</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    
                                    <div className="flex flex-wrap items-center gap-4 text-white/40 text-[9px] font-black uppercase tracking-[0.2em] italic">
                                        <span className="flex items-center gap-2"><MapPin size={12} className="text-brand-primary" /> {player.venue || 'CENTRAL HUB'}</span>
                                        <span className="flex items-center gap-2"><Calendar size={12} className="text-brand-primary" /> 2024 SEASON</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Zone (40%): Quick-Stats Grid */}
                            <div className="xl:w-[40%] w-full grid grid-cols-4 xl:grid-cols-2 gap-3">
                                <div className="p-4 rounded-[1.25rem] bg-white/5 border border-white/5 backdrop-blur-xl group/stat hover:bg-white/10 transition-all">
                                    <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.15em] mb-1.5 group-hover/stat:text-brand-accent transition-colors italic">ATTENDANCE</div>
                                    <div className="text-2xl font-black text-white font-mono tracking-tighter italic">{attendanceRate}<span className="text-brand-accent text-xs ml-0.5">%</span></div>
                                </div>
                                <div className="p-4 rounded-[1.25rem] bg-white/5 border border-white/5 backdrop-blur-xl group/stat hover:bg-white/10 transition-all">
                                    <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.15em] mb-1.5 group-hover/stat:text-brand-primary transition-colors italic">RANK</div>
                                    <div className="text-2xl font-black text-white font-mono tracking-tighter italic">{academyRank ? `#${academyRank.rank}` : '--'}</div>
                                </div>
                                <div className="p-4 rounded-[1.25rem] bg-white/5 border border-white/5 backdrop-blur-xl group/stat hover:bg-white/10 transition-all">
                                    <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.15em] mb-1.5 group-hover/stat:text-brand-primary transition-colors italic">RATING</div>
                                    <div className="text-2xl font-black text-white font-mono tracking-tighter italic">{avgRating}</div>
                                </div>
                                <div className="p-4 rounded-[1.25rem] bg-white/5 border border-white/5 backdrop-blur-xl group/stat hover:bg-white/10 transition-all">
                                    <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.15em] mb-1.5 group-hover/stat:text-brand-accent transition-colors italic">SESSIONS</div>
                                    <div className="text-2xl font-black text-white font-mono tracking-tighter italic">{presentCount}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Achievement Badge System (Digital Stadium Elite) ────────── */}
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-accent/10 rounded-2xl border border-brand-accent/20">
                                    <Award className="text-brand-accent animate-pulse" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">ACHIEVEMENT <span className="text-brand-accent">PODIUM</span></h2>
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] italic">Tactical Mastery // Tier Progression</p>
                                </div>
                            </div>

                            {/* Next Achievement Prompt */}
                            {nextAchievement && (
                                <div className="flex items-center gap-6 px-8 py-5 bg-brand-primary/10 border border-brand-primary/30 rounded-[2.5rem] backdrop-blur-3xl animate-in slide-in-from-right duration-1000 hover:bg-brand-primary/15 transition-all group/prompt shadow-2xl relative overflow-hidden">
                                    {/* Animated background glow */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/0 via-brand-primary/5 to-transparent -translate-x-full group-hover/prompt:translate-x-full transition-transform duration-1000" />
                                    
                                    <div className="relative p-3 bg-brand-primary/20 rounded-2xl group-hover/prompt:scale-110 group-hover/prompt:rotate-3 transition-all shadow-inner">
                                        <TrendingUp size={20} className="text-brand-primary" />
                                    </div>
                                    <div className="relative flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="text-[9px] font-black text-brand-primary uppercase tracking-[0.3em] italic">NEXT MILESTONE</div>
                                            <div className="h-px flex-1 bg-brand-primary/20" />
                                        </div>
                                        <div className="text-sm font-black text-white uppercase italic tracking-tight">
                                            Advance <span className="text-brand-primary">{nextAchievement.label}</span> to <span className="text-brand-accent">{nextAchievement.nextTierName}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter mt-1 italic leading-tight">
                                            {nextAchievement.strategicAdvice}
                                        </p>
                                    </div>
                                    <div className="relative w-24 h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full bg-gradient-to-r from-brand-primary to-brand-accent shadow-[0_0_15px_rgba(0,200,255,0.8)] transition-all duration-1000" style={{ width: `${nextAchievement.progress}%` }} />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                                    </div>
                                </div>
                            )}


                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">POWER SCORE</span>
                                        <span className="text-xl font-black text-brand-primary italic uppercase tracking-tighter">{powerScore} <span className="text-[10px]">XP</span></span>
                                    </div>
                                    <div className="w-px h-8 bg-white/10" />
                                    <div className="text-right">
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block">ACTIVE</span>
                                        <span className="text-xl font-black text-white italic uppercase tracking-tighter">{activeBadgeCount}<span className="text-white/20">/7</span></span>
                                    </div>
                                </div>
                                <div className="w-32 h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-brand-accent animate-progress transition-all duration-1000" style={{ width: `${(powerScore / maxPossibleXP) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar px-3 pt-3">
                            {(() => {
                                const badgeConfigs = [
                                    { id: 'iron_will', name: 'IRON WILL', icon: Activity, unit: '%', desc: 'Attendance Consistency', data: badgesData.iron_will, tiers: [50, 75, 90, 100] },
                                    { id: 'century', name: 'CENTURY', icon: Medal, unit: '', desc: 'Total Training Sessions', data: badgesData.century, tiers: [10, 50, 100, 250] },
                                    { id: 'victor', name: 'VICTOR', icon: Trophy, unit: '', desc: 'Match Victories', data: badgesData.victor, tiers: [1, 10, 25, 50] },
                                    { id: 'elite', name: 'TOP GUN', icon: Crown, unit: '%', desc: 'All-Time Academy Ranking', inverse: true, data: badgesData.elite, tiers: [25, 10, 5, 1] },
                                    { id: 'striker', name: 'STRIKER', icon: Target, unit: '', desc: 'Total Goals Scored', data: badgesData.striker, tiers: [1, 5, 10, 20] },
                                    { id: 'architect', name: 'ARCHITECT', icon: Zap, unit: '', desc: 'Total Assists Provided', data: badgesData.architect, tiers: [1, 5, 10, 20] },
                                    { id: 'mainman', name: 'MAIN MAN', icon: Star, unit: '', desc: 'Man of the Match Awards', data: badgesData.mainman, tiers: [1, 3, 7, 15] }
                                ];

                                return badgeConfigs.map((config, index) => {
                                    const tierData = config.data || { 
                                        level: 0, 
                                        tierName: 'Locked', 
                                        tierClass: 'badge-locked', 
                                        progress: 0, 
                                        remaining: 1, 
                                        currentValue: 0,
                                        isMaxed: false 
                                    };
                                    const isLocked = tierData.level === 0;
                                    const Icon = config.icon;
                                    
                                    return (
                                        <div key={config.id} 
                                            className={`relative shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700 cursor-pointer group`}
                                            style={{ animationDelay: `${index * 100}ms` }}
                                            onClick={() => setSelectedBadge({ config, tierData })}
                                        >
                                            {tierData.level === 4 && (
                                                <div className="absolute -inset-4 bg-brand-primary/20 rounded-full blur-2xl animate-pulse" />
                                            )}
                                            
                                            <div className={`relative w-20 h-20 flex flex-col items-center justify-center rounded-2xl border transition-all duration-500 overflow-hidden
                                                ${isLocked ? 'bg-white/[0.02] border-white/5 shadow-inner' : 'bg-white/5 hover:bg-white/10 hover:scale-110 active:scale-95 shadow-xl'}
                                                ${tierData.tierClass}
                                                backdrop-blur-md group-hover:border-white/20`}
                                            >
                                                {!isLocked && (
                                                    <div className="absolute inset-0 pointer-events-none">
                                                        <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/0 via-brand-primary/5 to-brand-primary/0 animate-radar-scan opacity-20" />
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,200,255,0.1),transparent_70%)]" />
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                                
                                                <ProgressCircle 
                                                    progress={tierData.progress} 
                                                    tierClass={tierData.tierClass} 
                                                    size={80} 
                                                    strokeWidth={2}
                                                    glow={tierData.level >= 3}
                                                />
                                                
                                                <div className={`z-10 flex flex-col items-center transition-all duration-500 ${isLocked ? 'grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100' : 'group-hover:-translate-y-1'}`}>
                                                    <div className="relative">
                                                        <Icon size={16} className={`${tierData.tierClass} mb-1 drop-shadow-[0_0_8px_currentColor] transition-transform duration-500 group-hover:scale-110`} />
                                                        {tierData.level === 4 && <Sparkles size={12} className="absolute -top-2 -right-2 text-brand-primary animate-pulse" />}
                                                    </div>
                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-0.5">{config.name}</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-tighter italic ${tierData.tierClass} drop-shadow-[0_0_8px_currentColor]`}>
                                                        {isLocked ? 'LOCKED' : tierData.tierName}
                                                    </span>
                                                </div>

                                                {isLocked && (
                                                    <div className="absolute top-2 right-2 p-1 bg-white/5 rounded-lg opacity-40 group-hover:opacity-0 transition-opacity">
                                                        <Shield size={10} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Badge Details Modal */}
                    {selectedBadge && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                            <div 
                                className="absolute inset-0 z-0 bg-black/40 backdrop-blur-sm" 
                                onClick={() => setSelectedBadge(null)}
                            />
                            
                            <div className={`relative z-10 w-full max-w-sm rounded-[3rem] border-2 border-white/10 bg-brand-950/95 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-pop ring-1 ring-white/5
                                ${selectedBadge.tierData.tierClass === 'text-brand-accent' ? 'border-brand-accent/20' : 
                                  selectedBadge.tierData.tierClass === 'text-brand-primary' ? 'border-brand-primary/20' : 
                                  'border-white/20'}`}
                            >
                                {/* Elite Background Effects */}
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                    <div className={`absolute -top-[50%] -left-[50%] w-[200%] h-[200%] opacity-20 animate-glow-spin
                                        bg-[conic-gradient(from_0deg,transparent_0deg,currentColor_120deg,transparent_240deg)]
                                        ${selectedBadge.tierData.tierClass}`} 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-950/50 to-brand-950" />
                                </div>

                                <div className="relative p-8 space-y-6 overflow-hidden">
                                    <div className="absolute inset-0 pointer-events-none">
                                        {[...Array(8)].map((_, i) => (
                                            <div 
                                                key={i}
                                                className={`particle ${selectedBadge.tierData.tierClass.replace('text-', 'bg-')}`}
                                                style={{
                                                    left: `${Math.random() * 100}%`,
                                                    top: `${70 + Math.random() * 30}%`,
                                                    animationDelay: `${Math.random() * 4}s`,
                                                    width: `${2 + Math.random() * 3}px`,
                                                    height: `${2 + Math.random() * 3}px`,
                                                    opacity: 0.2
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <div className="relative group/badge">
                                            <div className={`absolute -inset-6 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 animate-pulse
                                                ${selectedBadge.tierData.tierClass.replace('text-', 'bg-')}`} 
                                            />
                                            
                                            <div className={`relative p-6 rounded-[2.5rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md animate-float shine-effect
                                                transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6`}>
                                                <selectedBadge.config.icon size={48} className={`${selectedBadge.tierData.tierClass} drop-shadow-[0_0_20px_currentColor]`} />
                                                
                                                <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[10px] font-black italic border border-white/20 shadow-lg
                                                    ${selectedBadge.tierData.tierClass.replace('text-', 'bg-')} text-brand-950`}>
                                                    LVL {selectedBadge.tierData.level}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-white/20" />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.4em] italic ${selectedBadge.tierData.tierClass} text-glow`}>
                                                    {selectedBadge.tierData.tierName} RANK
                                                </span>
                                                <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-white/20" />
                                            </div>
                                            <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
                                                {selectedBadge.config.name}
                                            </h3>
                                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest italic">
                                                {selectedBadge.config.desc}
                                            </p>
                                        </div>

                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedBadge(null);
                                            }}
                                            className="absolute top-2 right-2 p-3 hover:bg-white/10 rounded-2xl text-white/20 hover:text-white transition-all group/close"
                                        >
                                            <X size={24} className="transition-transform duration-300 group-hover/close:rotate-90" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="group/stat relative p-5 rounded-[2rem] bg-white/5 border border-white/5 shadow-inner hover:bg-white/10 transition-colors overflow-hidden">
                                            <div className="absolute inset-0 bg-brand-accent/5 translate-y-full group-hover/stat:translate-y-0 transition-transform duration-500" />
                                            <div className="relative">
                                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">XP EARNED</div>
                                                <div className="text-3xl font-black text-brand-accent italic drop-shadow-sm">
                                                    +{selectedBadge.tierData.level * 250}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="group/stat relative p-5 rounded-[2rem] bg-white/5 border border-white/5 shadow-inner hover:bg-white/10 transition-colors overflow-hidden text-right">
                                            <div className="absolute inset-0 bg-brand-primary/5 translate-y-full group-hover/stat:translate-y-0 transition-transform duration-500" />
                                            <div className="relative">
                                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">PERSONAL BEST</div>
                                                <div className="text-3xl font-black text-white italic drop-shadow-sm">
                                                    {selectedBadge.tierData.currentValue}<span className="text-xs opacity-40 ml-1">{selectedBadge.config.unit}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!selectedBadge.tierData.isMaxed ? (
                                        <div className="space-y-4 p-6 rounded-[2.5rem] bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden group/progress">
                                            <div className="absolute inset-0 bg-brand-primary/5 opacity-0 group-hover/progress:opacity-100 transition-opacity duration-500" />
                                            
                                            <div className="relative flex justify-between items-end">
                                                <div>
                                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1">PATH TO LEVEL {selectedBadge.tierData.level + 1}</span>
                                                    <span className="text-sm font-black text-white italic uppercase tracking-tight">TARGET: {selectedBadge.tierData.nextValue}{selectedBadge.config.unit}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-brand-primary italic leading-none block">
                                                        {Math.ceil(selectedBadge.tierData.remaining)}
                                                    </span>
                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest italic">TO GO</span>
                                                </div>
                                            </div>
                                            
                                            <div className="h-3 bg-white/5 rounded-full overflow-hidden relative shadow-inner border border-white/5">
                                                <div 
                                                    className="h-full bg-brand-primary shadow-[0_0_20px_rgba(0,200,255,0.8)] transition-all duration-1000 ease-out relative" 
                                                    style={{ width: `${selectedBadge.tierData.progress}%` }} 
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                                                </div>
                                            </div>

                                            <div className="relative flex items-start gap-3 pt-2">
                                                <div className="mt-1 p-1.5 bg-brand-primary/20 rounded-xl">
                                                    <TrendingUp size={14} className="text-brand-primary" />
                                                </div>
                                                <p className="text-[12px] font-bold text-white/80 uppercase italic tracking-tight leading-relaxed">
                                                    {selectedBadge.tierData.strategicAdvice}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative py-10 px-6 bg-brand-accent/10 border-2 border-brand-accent/30 rounded-[2.5rem] text-lg font-black text-brand-accent uppercase tracking-[0.2em] italic text-center shadow-[0_0_50px_rgba(195,246,41,0.3)] animate-pulse overflow-hidden group/legendary">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                            <div className="relative z-10 flex flex-col items-center gap-2">
                                                <Sparkles className="animate-bounce text-brand-accent" size={24} />
                                                <span className="text-glow">LEGENDARY STATUS</span>
                                                <span className="text-[10px] tracking-[0.5em] text-white/40">ULTIMATE MASTERY</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-white/5">
                                        <div className="flex justify-between gap-3">
                                            {selectedBadge.config.tiers.map((t: number, i: number) => (
                                                <div key={i} className="flex-1 flex flex-col gap-2 group/milestone">
                                                    <div className={`h-2 rounded-full transition-all duration-1000 relative overflow-hidden
                                                        ${selectedBadge.tierData.level > i ? 'bg-brand-accent shadow-[0_0_15px_rgba(195,246,41,0.4)]' : 'bg-white/10'}`}>
                                                        {selectedBadge.tierData.level > i && (
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                                        )}
                                                    </div>
                                                    <span className={`text-[9px] font-black text-center transition-colors duration-500
                                                        ${selectedBadge.tierData.level > i ? 'text-brand-accent' : 'text-white/20'}`}>
                                                        {t}{selectedBadge.config.unit}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Recent Sessions Recap Feed (Digital Stadium Elite) ────────── */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                        <div className="xl:col-span-12">
                            <div className="glass-card rounded-2xl p-5 md:p-6 border border-white/5 shadow-2xl relative overflow-hidden bg-brand-900/20 backdrop-blur-3xl">
                                <div 
                                    className="flex items-center justify-between cursor-pointer group/header"
                                    onClick={() => setIsRecentSessionsOpen(!isRecentSessionsOpen)}
                                >
                                    <div>
                                        <h2 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                            RECENT <span className="text-brand-primary">SESSIONS</span>
                                            <div className={`p-2 rounded-xl bg-white/5 border border-white/10 transition-all duration-500 group-hover/header:border-brand-primary/30 ${isRecentSessionsOpen ? 'rotate-180 bg-brand-primary/10 border-brand-primary/20' : ''}`}>
                                                <ChevronDown size={20} className={`transition-colors duration-500 ${isRecentSessionsOpen ? 'text-brand-primary' : 'text-white/40'}`} />
                                            </div>
                                        </h2>
                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mt-2 italic">Training History // Tactical Recap</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden md:block px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-[0.2em] italic">
                                            Last 5 Evaluations
                                        </div>
                                    </div>
                                </div>

                                <div className={`grid transition-all duration-500 ease-in-out ${isRecentSessionsOpen ? 'grid-rows-[1fr] opacity-100 mt-10' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                                    <div className="overflow-hidden">
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
                                                        <div key={att.id} className="group relative flex flex-col md:flex-row items-center justify-between p-3 md:p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-500 gap-3 md:gap-6">
                                                            <div className="flex items-center gap-8 w-full md:w-auto">
                                                                {/* Status Dot */}
                                                                <div className={`shrink-0 w-3 h-3 rounded-full shadow-[0_0_12px] ${att.status === 'PRESENT' ? 'bg-brand-accent shadow-brand-accent/50' : 'bg-red-500 shadow-red-500/50'}`} />
                                                                
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic mb-1">
                                                                        {new Date(att.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                                                                    </span>
                                                                    <div className="flex items-center gap-4">
                                                                        <h4 className="text-sm font-black text-white uppercase italic tracking-tighter">
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
                        </div>
                    </div>

                    {/* Action Row below Hero */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <button onClick={handleDownloadIDCard} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-brand-secondary hover:border-brand-accent/30 transition-all shadow-lg group/btn backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover/btn:bg-brand-accent transition-colors">
                                    <Download size={16} className="text-brand-accent group-hover/btn:text-brand-950 transition-colors" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[8px] font-black text-white/40 group-hover/btn:text-white uppercase tracking-[0.2em] italic">OFFICIAL ID</span>
                                    <span className="block text-sm font-black text-white uppercase tracking-tighter italic">ID CARD</span>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-white/20 group-hover/btn:text-brand-accent group-hover/btn:translate-x-1 transition-all" />
                        </button>

                        <button onClick={handleDownloadInvoice} disabled={!feeStatus?.invoice} className={`flex items-center justify-between p-4 rounded-2xl border transition-all shadow-lg group/btn backdrop-blur-xl ${feeStatus?.status === 'PAID' ? 'bg-white/5 border-white/5 hover:bg-brand-primary hover:border-brand-primary/30' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${feeStatus?.status === 'PAID' ? 'bg-white/5 group-hover/btn:bg-brand-950' : 'bg-red-500/20'}`}>
                                    <Receipt size={16} className={`${feeStatus?.status === 'PAID' ? 'text-brand-primary group-hover/btn:text-brand-950' : 'text-red-500'}`} />
                                </div>
                                <div className="text-left">
                                    <span className={`block text-[8px] font-black uppercase tracking-[0.2em] italic ${feeStatus?.status === 'PAID' ? 'text-white/40 group-hover/btn:text-brand-950' : 'text-red-400'}`}>FEE RECEIPT</span>
                                    <span className={`block text-sm font-black uppercase tracking-tighter italic ${feeStatus?.status === 'PAID' ? 'text-white group-hover/btn:text-brand-950' : 'text-red-500'}`}>INVOICE</span>
                                </div>
                            </div>
                            <ChevronRight size={14} className={`group-hover/btn:translate-x-1 transition-all ${feeStatus?.status === 'PAID' ? 'text-white/20 group-hover/btn:text-brand-950' : 'text-red-500/20'}`} />
                        </button>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-brand-accent border-2 border-brand-950 shadow-lg group/btn backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-brand-950/10 flex items-center justify-center">
                                    <Activity size={16} className="text-brand-950" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[8px] font-black text-brand-950/40 uppercase tracking-[0.2em] italic">SCALE</span>
                                    <span className="block text-sm font-black text-brand-950 uppercase tracking-tighter italic leading-none">ATTENDANCE</span>
                                </div>
                            </div>
                            <span className="text-2xl font-black text-brand-950 italic tracking-tighter">{attendanceRate}%</span>
                        </div>

                        <button onClick={() => setCertificatesModalOpen(true)} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-brand-accent hover:border-brand-accent/30 transition-all shadow-lg group/btn backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover/btn:bg-brand-950 transition-colors">
                                    <Medal size={16} className="text-brand-accent group-hover/btn:text-brand-950 transition-colors" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[8px] font-black text-white/40 group-hover/btn:text-brand-950 uppercase tracking-[0.2em] italic">ACCOLADES</span>
                                    <span className="block text-sm font-black text-white group-hover/btn:text-brand-950 uppercase tracking-tighter italic">CERTIFICATES</span>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-white/20 group-hover/btn:text-brand-950 group-hover/btn:translate-x-1 transition-all" />
                        </button>
                    </div>

                    {/* ─── My Progress: Skill Timeline (Digital Stadium Elite) ────────── */}
                    <div ref={progressRef} className="glass-card rounded-2xl p-5 md:p-6 border border-white/5 shadow-2xl relative overflow-hidden bg-brand-900/40 backdrop-blur-3xl">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none transition-transform duration-1000">
                            <Activity size={200} className="text-white" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-lg md:text-xl font-black text-white italic uppercase tracking-tighter">
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
                                                <Line type="monotone" dataKey="Passing" stroke="#00C8FF" strokeWidth={4} dot={{ r: 6, strokeWidth: 0, fill: '#00C8FF' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#00C8FF' }} animationDuration={2000} />
                                                <Line type="monotone" dataKey="Shooting" stroke="#C3F629" strokeWidth={4} dot={{ r: 6, strokeWidth: 0, fill: '#C3F629' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#C3F629' }} animationDuration={2000} />
                                                <Line type="monotone" dataKey="Control" stroke="#FF0080" strokeWidth={4} dot={{ r: 6, strokeWidth: 0, fill: '#FF0080' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#FF0080' }} animationDuration={2000} />
                                                <Line type="monotone" dataKey="WeakFoot" stroke="#8A2BE2" strokeWidth={4} dot={{ r: 6, strokeWidth: 0, fill: '#8A2BE2' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#8A2BE2' }} animationDuration={2000} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* ─── Command Modules grid ────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                        {/* Highlights Row */}
                        <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Self Check-In Card */}
                            <div className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden group flex flex-col items-center justify-between gap-4 text-center">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000"><UserCheck size={100} className="text-white" /></div>
                                <div className="relative z-10">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all duration-500 mx-auto mb-3 ${checkedInToday ? 'bg-brand-accent border-brand-accent text-brand-950' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <Activity size={20} />
                                    </div>
                                    <h3 className="text-base font-black italic uppercase tracking-tighter text-white">
                                        {checkedInToday ? <>CHECK-IN <span className="text-brand-accent">SUCCESS</span></> : <>SESSION <span className="text-brand-primary">CHECK-IN</span></>}
                                    </h3>
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1 italic">
                                        {checkedInToday ? 'Your attendance recorded' : 'Mark your arrival now'}
                                    </p>
                                </div>
                                <button 
                                    onClick={handleSelfCheckIn}
                                    disabled={checkedInToday || isCheckingIn}
                                    className={`relative z-10 w-full py-2.5 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg ${checkedInToday ? 'bg-white/5 text-white/20 border border-white/5' : 'bg-brand-primary text-brand-950 hover:bg-white shadow-brand-primary/20 active:scale-95'}`}
                                >
                                    {isCheckingIn ? <Loader2 size={14} className="animate-spin" /> : checkedInToday ? <CheckCircle2 size={14} /> : <Zap size={14} fill="currentColor" />}
                                    {checkedInToday ? 'PRESENT' : 'CHECK IN'}
                                </button>
                            </div>

                             {/* MOTM Showcase */}
                            <div className={`glass-card rounded-2xl p-5 border shadow-xl relative overflow-hidden group transition-all duration-700 flex flex-col items-center justify-between gap-4 text-center ${motmToday?.playerId === player.id ? 'border-brand-accent/30 bg-brand-accent/5' : 'border-white/5'}`}>
                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Trophy size={120} className="text-white" /></div>
                                <div className="relative z-10">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all duration-500 mx-auto mb-3 ${motmToday?.playerId === player.id ? 'bg-brand-accent border-brand-accent text-brand-950 shadow-[0_0_15px_rgba(200,255,0,0.3)]' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <Trophy size={20} />
                                    </div>
                                    <h3 className={`text-base font-black italic uppercase tracking-tighter ${motmToday?.playerId === player.id ? 'text-brand-accent' : 'text-white'}`}>
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
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all duration-500 mx-auto mb-3 ${academyRank ? 'bg-amber-400 border-amber-400 text-brand-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-white/5 border-white/10 text-white/20'}`}>
                                        <Crown size={20} />
                                    </div>
                                    <h3 className="text-base font-black italic uppercase tracking-tighter text-white">
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
                            <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/5 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-[6px] h-full bg-brand-primary" />
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div>
                                        <h3 className="text-base md:text-lg font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                                            <Calendar className="text-brand-primary" size={18} /> Schedule
                                        </h3>
                                        <p className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-2 italic">Upcoming Academy Sessions</p>
                                    </div>
                                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                                        {(['training', 'match'] as const).map(t => (
                                            <button key={t} onClick={() => setEventFilter(t as any)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] italic transition-all ${eventFilter === t ? 'bg-brand-primary text-brand-950 shadow-lg' : 'text-white/40 hover:text-white'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    {filteredEvents.length > 0 ? filteredEvents.map(event => (
                                        <div key={event.id} className="group p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-brand-primary/50 transition-all flex flex-col md:flex-row items-center justify-between gap-4 hover:-translate-y-0.5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-brand-950 rounded-xl flex flex-col items-center justify-center font-black border border-white/10 text-brand-primary shadow-sm transform group-hover:rotate-6 transition-transform">
                                                    <span className="text-[8px] uppercase tracking-[0.15em] opacity-40">{new Date(event.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                                    <span className="text-lg leading-none font-mono mt-0.5">{new Date(event.date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <div className="font-black text-sm text-white italic uppercase tracking-tight group-hover:text-brand-primary transition-colors">{event.title}</div>
                                                    <div className="flex flex-wrap gap-4 mt-1 text-white/40 text-[9px] font-black uppercase italic tracking-widest">
                                                        <span className="flex items-center gap-1.5"><Clock size={10} className="text-brand-primary" /> {event.time}</span>
                                                        <span className="flex items-center gap-1.5"><MapPin size={10} className="text-brand-primary" /> {event.location}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full md:w-auto">
                                                <button onClick={() => StorageService.toggleRSVP(event.id, user.linkedPlayerId!, 'attending')} 
                                                    className={`flex-1 md:px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] italic transition-all flex items-center justify-center gap-2 border ${event.rsvps?.[player.id] === 'attending' ? 'bg-brand-accent text-brand-950 border-brand-accent shadow-lg shadow-brand-accent/20' : 'bg-white/5 text-white/40 border-white/5 hover:border-brand-accent hover:text-brand-accent'}`}>
                                                    <CheckCircle2 size={12} /> Confirm
                                                </button>
                                                <button onClick={() => StorageService.toggleRSVP(event.id, user.linkedPlayerId!, 'declined')} 
                                                    className={`flex-1 md:px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] italic transition-all flex items-center justify-center gap-2 border ${event.rsvps?.[player.id] === 'declined' ? 'bg-red-500 text-white border-red-500 shadow-lg' : 'bg-white/5 text-white/40 border-white/5 hover:border-red-500 hover:text-red-500'}`}>
                                                    <XCircle size={12} /> Decline
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl font-black text-white/10 uppercase tracking-[0.5em] italic">
                                            NO UPCOMING SESSIONS
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Match Performance Tracker */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="glass-card rounded-2xl p-5 border border-white/5 shadow-xl flex flex-col relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 -rotate-12"><Activity size={150} className="text-white" /></div>
                                    <h3 className="text-base md:text-lg font-black italic uppercase tracking-tighter flex items-center gap-3 mb-5 text-white">
                                        <Activity className="text-brand-primary" size={18} /> Match History
                                    </h3>
                                    {myMatchStats.length > 0 ? (
                                        <div className="space-y-2 flex-1">
                                        {[...myMatchStats].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,3).map(m => (
                                            <div key={m.id} onClick={() => setViewingMatch(m)} className="p-3 bg-white/5 rounded-xl border border-white/10 group/item hover:bg-white/10 transition-all cursor-pointer">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">{new Date(m.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                                        {m.playerOfTheMatchId === player.id && (
                                                            <div className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/20 text-amber-500 text-[7px] font-black px-1.5 py-0.5 rounded">
                                                                <Trophy size={8} className="fill-amber-500" /> MOTM
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {m.myStats?.rating && (
                                                            <div className="flex flex-col items-center justify-center w-9 h-9 rounded-xl bg-brand-primary text-brand-950 shadow-[0_0_10px_rgba(0,200,255,0.3)]">
                                                                <span className="text-[7px] font-black uppercase leading-none opacity-60">RTG</span>
                                                                <span className="text-sm font-black leading-none italic">{m.myStats.rating}</span>
                                                            </div>
                                                        )}
                                                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black italic uppercase tracking-widest border h-fit ${m.result === 'W' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/30' : m.result === 'D' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>{m.result === 'W' ? 'WON' : m.result === 'D' ? 'DRAW' : 'LOST'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="font-black text-sm text-white italic uppercase tracking-tighter">vs {m.opponent}</div>
                                                    <div className="text-xl font-black text-brand-primary font-mono tracking-tighter">{m.scoreFor}<span className="text-white/20 mx-1">:</span>{m.scoreAgainst}</div>
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

                                <div className="glass-card rounded-2xl p-5 border border-white/5 shadow-xl space-y-4 relative overflow-hidden flex flex-col justify-center bg-brand-950/20 backdrop-blur-3xl">
                                    <div className="flex justify-between items-center group gap-4 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/5 text-brand-primary rounded-xl border border-white/10 group-hover:rotate-12 transition-transform shadow-md"><Star size={16} /></div>
                                            <div className="text-left font-black italic uppercase leading-none">
                                                <span className="text-[7px] text-white/20 uppercase tracking-widest mb-0.5 block">RATING</span>
                                                <span className="text-sm text-white">AVG PERFORMANCE</span>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-black text-brand-primary font-mono tracking-tighter shrink-0 drop-shadow-[0_0_10px_rgba(0,200,255,0.3)]">{avgRating}</div>
                                    </div>
                                    
                                    {myMatchStats.length > 1 && (
                                        <div className="h-10 w-full mb-1">
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
                            <div className="bg-brand-900/50 backdrop-blur-2xl p-5 rounded-2xl shadow-xl flex flex-col items-center group text-white relative overflow-hidden border border-white/5">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Trophy size={100} /></div>
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 transform group-hover:rotate-12 transition-transform shadow-xl">
                                    <Trophy className="text-brand-accent" size={28} />
                                </div>
                                <div className="text-center relative z-10">
                                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-1 italic">Career Stats</div>
                                    <div className="text-4xl md:text-5xl font-black italic leading-none font-mono tracking-tighter text-brand-accent drop-shadow-[0_0_10px_rgba(195,246,41,0.3)]">{totalGoals}</div>
                                    <div className="h-1 w-16 bg-brand-accent/20 rounded-full mt-3 mx-auto overflow-hidden">
                                        <div className="h-full bg-brand-accent animate-progress" style={{ width: '70%' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Tactical Gear Brief */}
                            <div className="glass-card rounded-2xl p-5 border border-white/5 shadow-xl relative overflow-hidden group">
                                <div className="green-light-bar" />
                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000"><Shirt size={80} className="text-white" /></div>
                                <h4 className="text-[9px] font-black text-brand-accent uppercase tracking-[0.4em] mb-4 italic">Equipment Checklist</h4>
                                {upcomingEvents[0] ? (
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl border shadow-lg transition-all duration-500 group-hover:rotate-6 ${getKitRequirement(upcomingEvents[0].date).style.replace('bg-slate-50', 'bg-white/5').replace('text-slate-400', 'text-white/40').replace('border-slate-200', 'border-white/10')}`}>
                                                <Shirt size={18} className="animate-pulse" />
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none">REQUIRED UNIFORM</div>
                                                <div className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">{getKitRequirement(upcomingEvents[0].date).color}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all">
                                                <div className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1">FOOTWEAR</div>
                                                <div className="flex items-center gap-2">
                                                    <Dumbbell size={12} className="text-brand-accent" />
                                                    <span className="text-[9px] font-black text-white uppercase italic">Firm Ground</span>
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

                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">EQUIPMENT READINESS: VERIFIED</span>
                                            </div>
                                            <Zap size={12} className="text-brand-accent animate-pulse" />
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
                            <div className="bg-brand-primary rounded-2xl p-5 border-2 border-brand-950 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.1] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Wand2 size={80} className="text-brand-950" /></div>
                                    <div className="flex items-center gap-3 mb-3 relative z-10">
                                        <div className="p-2 bg-brand-950 rounded-xl flex items-center justify-center text-brand-primary">
                                            <Sparkles size={14} />
                                        </div>
                                        <h4 className="text-[9px] font-black text-brand-950 uppercase tracking-[0.3em] italic">This Week's Focus</h4>
                                    </div>
                                    <div className="relative z-10 space-y-3">
                                        <p className="text-base font-black text-brand-950 uppercase italic tracking-tighter leading-tight">
                                            "{weeklyTip.tip}"
                                        </p>
                                        <div className="pt-3 border-t border-brand-950/20 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-brand-950/10 flex items-center justify-center border border-brand-950/20 overflow-hidden">
                                                    <span className="text-[9px] font-black text-brand-950">{weeklyTip.setByCoach[0]}</span>
                                                </div>
                                                <span className="text-[8px] font-black text-brand-950/60 uppercase tracking-widest italic">Coach {weeklyTip.setByCoach}</span>
                                            </div>
                                            <div className="px-2 py-0.5 rounded-lg bg-brand-950/10 border border-brand-950/20">
                                                <span className="text-[7px] font-black text-brand-950 uppercase italic tracking-widest">WEEK {weeklyTip.week}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Time-Based One-Time Password (TOTP) MFA Security Widget */}
                            <div className="glass-card rounded-2xl p-5 border border-white/5 shadow-xl relative overflow-hidden group mt-8">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 rotate-12">
                                    <Shield size={80} className="text-white" />
                                </div>
                                <h4 className="text-[9px] font-black text-brand-primary uppercase tracking-[0.4em] mb-4 italic">Security Credentials</h4>
                                
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`p-3 rounded-2xl border shadow-lg transition-all duration-500 group-hover:rotate-6 ${isMfaEnrolled ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 'bg-white/5 text-white/40 border-white/10'}`}>
                                        <Shield size={18} className={isMfaEnrolled ? 'animate-pulse' : ''} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none">2-FACTOR PROTECTION</div>
                                        <div className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">
                                            {isMfaEnrolled ? 'SECURED (TOTP)' : 'UNPROTECTED'}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[10px] text-white/40 leading-relaxed font-medium mb-4 text-left">
                                    {isMfaEnrolled 
                                        ? 'Your account is secured with Time-Based One-Time Passwords (MFA). Sign-ins require a verified authentication pass code.'
                                        : 'Protect your athlete dashboard and scouting records from unauthorized access. Enable TOTP verification to secure your portal.'
                                    }
                                </p>

                                <div className="pt-3 border-t border-white/5">
                                    {isMfaEnrolled ? (
                                        <button 
                                            onClick={handleDisableMfa}
                                            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 text-[9px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            Disable 2-Factor Authentication
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleStartMfaEnrollment}
                                            disabled={isEnrolling}
                                            className="w-full py-3 bg-brand-primary text-brand-950 hover:scale-[1.02] active:scale-[0.98] rounded-xl text-[9px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/10 cursor-pointer"
                                        >
                                            {isEnrolling ? <Loader2 size={12} className="animate-spin text-brand-950" /> : <Zap size={12} />}
                                            Activate 2FA Security
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* Match Details Modal */}
            {viewingMatch && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-8" onClick={() => setViewingMatch(null)}>
                    <div className="absolute inset-0 bg-brand-950/90 backdrop-blur-2xl" />
                    <div className="relative w-full max-w-lg bg-brand-900 rounded-t-[3rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                        {/* Result Banner */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${viewingMatch.result === 'W' ? 'bg-brand-accent' : viewingMatch.result === 'D' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                        
                        {/* Header */}
                        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl text-xs font-black italic tracking-widest uppercase px-3 ${viewingMatch.result === 'W' ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30' : viewingMatch.result === 'D' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
                                    {viewingMatch.result === 'W' ? 'WIN' : viewingMatch.result === 'D' ? 'DRAW' : 'LOSS'}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic">{new Date(viewingMatch.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                    <h2 className="text-lg font-black text-white italic uppercase tracking-tighter leading-none mt-0.5">vs {viewingMatch.opponent}</h2>
                                </div>
                            </div>
                            <button onClick={() => setViewingMatch(null)} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all shrink-0">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                            {/* Score */}
                            <div className="flex items-center justify-center gap-4">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic mb-1">Icarus</p>
                                    <span className="text-6xl font-black text-brand-primary font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(0,200,255,0.4)]">{viewingMatch.scoreFor}</span>
                                </div>
                                <div className="text-3xl font-black text-white/10 italic">—</div>
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic mb-1">{viewingMatch.opponent}</p>
                                    <span className="text-6xl font-black text-white/40 font-mono tracking-tighter">{viewingMatch.scoreAgainst}</span>
                                </div>
                            </div>

                            {/* MOTM Badge */}
                            {viewingMatch.playerOfTheMatchId === player?.id && (
                                <div className="flex items-center justify-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-2xl py-3 px-4">
                                    <Trophy size={16} className="text-amber-400 fill-amber-400" />
                                    <span className="text-amber-400 font-black italic uppercase tracking-widest text-xs">Man of the Match</span>
                                </div>
                            )}

                            {/* My Performance */}
                            {viewingMatch.myStats && (
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic mb-3">My Performance</p>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { label: 'Rating', val: viewingMatch.myStats.rating || '—', highlight: true },
                                            { label: 'Goals', val: viewingMatch.myStats.goals ?? '—' },
                                            { label: 'Assists', val: viewingMatch.myStats.assists ?? '—' },
                                            { label: 'Minutes', val: viewingMatch.myStats.minutesPlayed ?? '—' },
                                        ].map((stat, i) => (
                                            <div key={i} className="text-center">
                                                <div className={`text-2xl font-black tracking-tighter font-mono ${stat.highlight ? 'text-brand-primary drop-shadow-[0_0_10px_rgba(0,200,255,0.3)]' : 'text-white'}`}>{stat.val}</div>
                                                <div className="text-[8px] font-black text-white/30 uppercase tracking-widest italic mt-0.5">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {viewingMatch.myStats.isStarter && (
                                        <div className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-brand-accent/70 uppercase tracking-widest italic">
                                            <Star size={10} className="fill-brand-accent text-brand-accent" /> Starting XI
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Match Events Timeline */}
                            {viewingMatch.events && viewingMatch.events.length > 0 && (
                                <div>
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic mb-3">Match Events</p>
                                    <div className="space-y-2">
                                        {[...viewingMatch.events].sort((a: any, b: any) => a.minute - b.minute).map((ev: any) => {
                                            const isMyEvent = ev.playerId === player?.id || ev.assistantId === player?.id;
                                            const icon = ev.type === 'goal' ? '⚽' : ev.type === 'yellow_card' ? '🟨' : ev.type === 'red_card' ? '🟥' : '🔄';
                                            const label = ev.type === 'goal' ? 'Goal' : ev.type === 'yellow_card' ? 'Yellow Card' : ev.type === 'red_card' ? 'Red Card' : 'Substitution';
                                            return (
                                                <div key={ev.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${isMyEvent ? 'bg-brand-accent/10 border-brand-accent/20' : 'bg-white/5 border-white/5'}`}>
                                                    <span className="text-sm">{icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-black italic uppercase tracking-tight leading-none ${isMyEvent ? 'text-brand-accent' : 'text-white/60'}`}>{label}</p>
                                                    </div>
                                                    <span className="text-[9px] font-black text-white/30 italic shrink-0">{ev.minute}'</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Match Report */}
                            {viewingMatch.report && (
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic mb-2">Match Report</p>
                                    <p className="text-xs text-white/60 leading-relaxed font-medium">{viewingMatch.report}</p>
                                </div>
                            )}

                            {/* Highlights Link */}
                            {viewingMatch.highlightsUrl && (
                                <a href={viewingMatch.highlightsUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 transition-all group">
                                    <PlayCircle size={18} className="text-red-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-black italic uppercase tracking-widest text-red-400">Watch Match Highlights</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

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

            {/* 2-Factor Authentication (TOTP MFA) Enrollment Modal */}
            {showMfaEnrollModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-950/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-brand-900 rounded-t-[3rem] sm:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 border border-white/10 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                        
                        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center relative bg-brand-secondary">
                            <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">Activate <span className="text-brand-primary">2FA Protection</span></h3>
                            <button 
                                onClick={() => {
                                    setShowMfaEnrollModal(false);
                                    setMfaSecret(null);
                                    setMfaQrUrl('');
                                    setMfaSecretKey('');
                                    setMfaVerifyCode('');
                                    setMfaError('');
                                }} 
                                className="p-3 hover:bg-white/10 rounded-full text-white/40 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar text-center">
                            
                            {mfaError && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold rounded-2xl text-left leading-relaxed">
                                    {mfaError}
                                </div>
                            )}

                            {mfaSuccessMsg && (
                                <div className="p-4 bg-brand-accent/15 border border-brand-accent/30 text-brand-accent text-[11px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 justify-center animate-in zoom-in duration-300">
                                    <CheckCircle2 size={16} />
                                    <span>{mfaSuccessMsg}</span>
                                </div>
                            )}

                            {!mfaSuccessMsg && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="text-[9px] font-black text-brand-primary uppercase tracking-[0.25em] italic">Step 1: Scan QR Code</div>
                                        <p className="text-[10px] text-white/40 leading-relaxed font-medium">Scan this QR code with Google Authenticator, Microsoft Authenticator, Apple Passwords, or Authy to configure your secure generator.</p>
                                    </div>

                                    {mfaQrUrl && (
                                        <div className="relative inline-block group">
                                            <div className="absolute inset-0 bg-brand-primary/10 rounded-3xl blur-xl group-hover:bg-brand-primary/20 transition-all duration-700 pointer-events-none" />
                                            <img 
                                                src={`https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(mfaQrUrl)}&choe=UTF-8`} 
                                                className="w-44 h-44 mx-auto bg-white p-3 rounded-[2rem] shadow-2xl relative z-10 border-4 border-white/10" 
                                                alt="MFA QR Code" 
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2 pt-2">
                                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none">Can't scan? Use manual secret key:</div>
                                        <div className="p-3 bg-brand-950 border border-white/5 rounded-xl text-xs font-mono font-bold tracking-widest text-brand-primary break-all select-all shadow-inner">
                                            {mfaSecretKey}
                                        </div>
                                    </div>

                                    <div className="h-[1px] bg-white/5 w-full my-6" />

                                    <div className="space-y-4">
                                        <div className="text-[9px] font-black text-brand-primary uppercase tracking-[0.25em] italic">Step 2: Confirm Code</div>
                                        <p className="text-[10px] text-white/40 leading-relaxed font-medium">Input the 6-digit confirmation code generated by your authenticator app below to complete enrollment.</p>
                                        
                                        <input 
                                            type="text" 
                                            maxLength={6}
                                            placeholder="000 000"
                                            value={mfaVerifyCode}
                                            onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                                            className="w-full text-center p-4 bg-brand-950 border border-white/10 rounded-xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-primary font-mono text-xl font-bold tracking-[0.5em] text-white shadow-inner uppercase placeholder:text-white/5"
                                        />
                                    </div>

                                    <div className="pt-4 flex gap-4 border-t border-white/5">
                                        <button 
                                            onClick={() => {
                                                setShowMfaEnrollModal(false);
                                                setMfaSecret(null);
                                                setMfaQrUrl('');
                                                setMfaSecretKey('');
                                                setMfaVerifyCode('');
                                                setMfaError('');
                                            }}
                                            className="flex-1 py-4 text-white/30 hover:text-white font-black rounded-xl transition-all text-[9px] uppercase tracking-widest italic cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleConfirmMfaEnrollment}
                                            disabled={isEnrolling || mfaVerifyCode.trim().length !== 6}
                                            className="flex-[2] py-4 bg-brand-primary text-brand-950 disabled:bg-white/5 disabled:text-white/20 font-black rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-[9px] uppercase tracking-[0.2em] italic flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {isEnrolling ? <Loader2 size={12} className="animate-spin text-brand-950" /> : <UserCheck size={14} />}
                                            Activate Security Pass
                                        </button>
                                    </div>
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
