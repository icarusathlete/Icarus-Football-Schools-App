import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { AttendanceStatus, Player, Venue, Batch, AttendanceRecord, Match, FeeRecord, SupportTicket, InventoryItem } from '../types';
import {
  Users, Activity, Command, Star, Clock, Receipt,
  UserPlus, Trophy, AlertTriangle, Timer, XCircle,
  ChevronLeft, Shield, Radio, TrendingUp, Zap,
  ArrowUp, ArrowDown, Minus, CalendarPlus, Medal,
  MapPin, Layers, ChevronDown, Truck, LifeBuoy,
  Settings, Plus, Edit2, Trash2, Check, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from './ui/PageHeader';
import { ConfirmModal } from './ConfirmModal';
import { 
  CentreStat, PlayerRow, ChartPoint, AgePoint, LeagueRanking, DashboardAlert,
  LogisticsStats, SupportStats,
  computeCompositeScore, groupDataByPlayer, getAgeGroup, getDateOffset, getDayLabel, isPresent,
  initials, nameColor, rateColor, computeLogisticsStats, computeSupportStats
} from '../utils/dashboardHelpers';

// Ring Meter Component moved to separate UI or kept here if small

// ─── Ring Meter ───────────────────────────────────────────────────────────────

const Ring: React.FC<{ value: number; size?: number; stroke?: number }> = ({ value, size = 56, stroke = 5 }) => {
  const v = Math.min(Math.max(value, 0), 100);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - v / 100);
  const c = rateColor(v);
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        {v > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        )}
      </svg>
      <span className="relative z-10 text-[10px] font-black italic leading-none" style={{ color: v > 0 ? c : 'rgba(255,255,255,0.2)' }}>
        {v > 0 ? `${v}%` : '—'}
      </span>
    </div>
  );
};

// ─── Centre Card ──────────────────────────────────────────────────────────────

const CentreCard: React.FC<{ stat: CentreStat; onClick: () => void }> = ({ stat, onClick }) => {
  const empty = stat.players === 0;
  return (
    <button
      onClick={empty ? undefined : onClick}
      disabled={empty}
      className={`text-left p-6 rounded-[2rem] border transition-all duration-300 w-full group relative overflow-hidden ${
        empty
          ? 'bg-brand-bg/20 border-white/[0.04] opacity-40 cursor-default'
          : 'glass-card border-white/[0.07] hover:border-[#CCFF00]/30 hover:shadow-[0_0_30px_rgba(204,255,0,0.1)] active:scale-[0.98]'
      }`}
    >
      {/* Corner Accent */}
      {!empty && <div className="absolute top-0 right-0 w-8 h-8 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-px bg-[#CCFF00]" />
        <div className="absolute top-0 right-0 h-full w-px bg-[#CCFF00]" />
      </div>}

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Radio size={10} className={empty ? 'text-white/20' : 'text-[#CCFF00] animate-pulse'} />
            <p className="text-[8px] font-black uppercase italic tracking-[0.3em] text-white/30">{empty ? 'DEACTIVATED' : 'LIVE NODE'}</p>
          </div>
          <h3 className="text-[15px] font-black italic uppercase text-white tracking-tight leading-tight line-clamp-2 drop-shadow-sm">{stat.name}</h3>
        </div>
        <Ring value={stat.attendanceRate} size={56} stroke={5} />
      </div>

      {/* Big number */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-6xl font-black italic text-white leading-none tracking-tighter">{stat.players}</span>
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase italic text-[#CCFF00]/60 -mb-1">Fleet</span>
          <span className="text-[9px] font-black uppercase italic text-white/20">Athletes</span>
        </div>
      </div>

      {/* Attendance bar */}
      <div className="space-y-2 mb-5">
        <div className="flex justify-between text-[9px] font-black italic text-white/40 uppercase tracking-wider">
          <span>Daily Payload</span>
          <span className="text-[#CCFF00]">{stat.presentToday} / {stat.players}</span>
        </div>
        <div className="h-[4px] bg-white/[0.05] rounded-full overflow-hidden p-[1px]">
          <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(204,255,0,0.5)]"
            style={{ width: `${stat.attendanceRate}%`, background: '#CCFF00' }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
        <div className="flex items-center gap-2">
          <Star size={10} className="text-[#CCFF00]/40" />
          <span className="text-[9px] font-black italic text-white/30 uppercase tracking-tighter">
            {stat.avgRating > 0 ? <><span className="text-white">{stat.avgRating.toFixed(1)}</span> SCORE</> : 'UNRANKED'}
          </span>
        </div>
        
        {stat.pendingFees > 0 ? (
          <div className="flex items-center gap-1.5 text-red-400">
             <AlertTriangle size={10} />
             <span className="text-[9px] font-black italic uppercase tracking-tighter">{stat.pendingFees} OVERDUE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[#CCFF00]/30">
             <Shield size={10} />
             <span className="text-[9px] font-black italic uppercase tracking-tighter">SECURE</span>
          </div>
        )}
      </div>
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [rankingMetric, setRankingMetric] = useState<'composite' | 'rating' | 'attendance' | 'skills'>('composite');
  const [rankingLimit, setRankingLimit] = useState<number>(10);
  const [activityTypeFilter, setActivityTypeFilter] = useState<'all' | 'player' | 'match' | 'fee'>('all');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'rankings' | 'analytics' | 'operations'>('overview');

  // Academy Config State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTab, setConfigTab] = useState<'venues' | 'batches'>('venues');
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: string; name: string } | null>(null);
  const [configDeleteModalOpen, setConfigDeleteModalOpen] = useState(false);
  const [configItemToDelete, setConfigItemToDelete] = useState<{
    type: 'venue' | 'batch'; id: string; name: string
  } | null>(null);

  const handleAddConfigItem = () => {
    if (!newItemName.trim()) return;
    if (configTab === 'venues') StorageService.addVenue(newItemName.trim());
    else StorageService.addBatch(newItemName.trim());
    setNewItemName('');
    window.dispatchEvent(new CustomEvent('academy_data_update'));
  };

  const handleUpdateConfigItem = () => {
    if (!editingItem || !newItemName.trim()) return;
    if (configTab === 'venues') StorageService.updateVenue(editingItem.id, newItemName.trim());
    else StorageService.updateBatch(editingItem.id, newItemName.trim());
    setEditingItem(null);
    setNewItemName('');
    window.dispatchEvent(new CustomEvent('academy_data_update'));
  };

  const handleSecureConfigDelete = (type: 'venue' | 'batch', id: string, name: string) => {
    setConfigItemToDelete({ type, id, name });
    setConfigDeleteModalOpen(true);
  };

  const confirmConfigDelete = async () => {
    if (!configItemToDelete) return;
    try {
      if (configItemToDelete.type === 'venue') await StorageService.deleteVenue(configItemToDelete.id);
      else await StorageService.deleteBatch(configItemToDelete.id);
      setConfigDeleteModalOpen(false);
      setConfigItemToDelete(null);
      window.dispatchEvent(new CustomEvent('academy_data_update'));
    } catch {
      alert('An error occurred.');
    }
  };

  // Raw Data State
  const [rawData, setRawData] = useState<{
    players: Player[];
    venues: Venue[];
    batches: Batch[];
    attendance: AttendanceRecord[];
    matches: Match[];
    fees: FeeRecord[];
    tickets: SupportTicket[];
    inventory: InventoryItem[];
  }>({
    players: [],
    venues: [],
    batches: [],
    attendance: [],
    matches: [],
    fees: [],
    tickets: [],
    inventory: []
  });

  useEffect(() => {
    const loadData = () => {
      setRawData({
        players: StorageService.getPlayers(),
        venues: StorageService.getVenues(),
        batches: StorageService.getBatches(),
        attendance: StorageService.getAttendance(),
        matches: StorageService.getMatches(),
        fees: StorageService.getFees(),
        tickets: StorageService.getTickets(),
        inventory: StorageService.getInventory(),
      });
    };
    loadData();
    window.addEventListener('academy_data_update', loadData);
    return () => window.removeEventListener('academy_data_update', loadData);
  }, []);

  const AGE_GROUPS = ['U12', 'U10', 'U8'];
  const AGE_COLORS = ['#CCFF00', '#a3e635', '#4ade80'];

  // ── Derivations ────────────────────────────────────────────────────────────
  const today = useMemo(() => getDateOffset(0), []);
  const ago30 = useMemo(() => getDateOffset(-30), []);
  const in30 = useMemo(() => getDateOffset(30), []);

  // ── Indexed Data ───────────────────────────────────────────────────────────
  const indexedData = useMemo(() => {
    const playersById: Record<string, Player> = {};
    const playersByVenue: Record<string, Player[]> = {};
    rawData.players.forEach(p => {
      playersById[p.id] = p;
      if (!playersByVenue[p.venue]) playersByVenue[p.venue] = [];
      playersByVenue[p.venue].push(p);
    });

    const attendanceByPlayer = groupDataByPlayer(rawData.attendance);
    const attendanceByDateVenue: Record<string, Record<string, { records: AttendanceRecord[], present: number, absent: number }>> = {};
    const globalAttendanceByDate: Record<string, { present: number, absent: number }> = {};
    
    rawData.attendance.forEach(r => {
      if (!attendanceByDateVenue[r.date]) attendanceByDateVenue[r.date] = {};
      if (!attendanceByDateVenue[r.date][r.venue]) {
        attendanceByDateVenue[r.date][r.venue] = { records: [], present: 0, absent: 0 };
      }
      if (!globalAttendanceByDate[r.date]) {
        globalAttendanceByDate[r.date] = { present: 0, absent: 0 };
      }
      
      const entry = attendanceByDateVenue[r.date][r.venue];
      entry.records.push(r);
      const isP = isPresent(r.status);
      const isA = String(r.status).toUpperCase() === AttendanceStatus.ABSENT;
      
      if (isP) {
        entry.present++;
        globalAttendanceByDate[r.date].present++;
      } else if (isA) {
        entry.absent++;
        globalAttendanceByDate[r.date].absent++;
      }
    });

    const feesByPlayer = groupDataByPlayer(rawData.fees);
    const feesByVenue: Record<string, FeeRecord[]> = {};
    const feesByBatch: Record<string, FeeRecord[]> = {};
    const pendingFeesCountByVenue: Record<string, number> = {};
    
    rawData.fees.forEach(f => {
      const pl = playersById[f.playerId];
      if (pl) {
        if (!feesByVenue[pl.venue]) feesByVenue[pl.venue] = [];
        feesByVenue[pl.venue].push(f);
        
        if (!feesByBatch[pl.batch]) feesByBatch[pl.batch] = [];
        feesByBatch[pl.batch].push(f);

        if (f.status === 'PENDING' || f.status === 'OVERDUE') {
          pendingFeesCountByVenue[pl.venue] = (pendingFeesCountByVenue[pl.venue] || 0) + 1;
        }
      }
    });

    // Advanced Indexing for KPIs
    const recentAttendanceStats: Record<string, { rate30d: number, presentCount: number, totalCount: number }> = {};
    const activeFeeSummaries: Record<string, { hasOverdue: boolean, hasExpiring: boolean }> = {};
    
    rawData.players.forEach(p => {
      const recs = (attendanceByPlayer[p.id] || []).filter(r => r.date >= ago30);
      const present = recs.filter(r => isPresent(r.status)).length;
      recentAttendanceStats[p.id] = {
        rate30d: recs.length > 0 ? Math.round((present / recs.length) * 100) : 0,
        presentCount: present,
        totalCount: recs.length
      };
      
      const pFees = feesByPlayer[p.id] || [];
      activeFeeSummaries[p.id] = {
        hasOverdue: pFees.some(f => f.status === 'OVERDUE'),
        hasExpiring: pFees.some(f => f.invoice?.validTill && f.status === 'PAID' && f.invoice.validTill >= today && f.invoice.validTill <= in30)
      };
    });

    const sortedMatches = [...rawData.matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sortedPlayersByRegistrationDate = [...rawData.players].sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());

    return {
      playersById,
      playersByVenue,
      attendanceByPlayer,
      attendanceByDateVenue,
      globalAttendanceByDate,
      feesByPlayer,
      feesByVenue,
      feesByBatch,
      pendingFeesCountByVenue,
      recentAttendanceStats,
      activeFeeSummaries,
      sortedMatches,
      sortedPlayersByRegistrationDate
    };
  }, [rawData.players, rawData.attendance, rawData.fees, rawData.matches, today, ago30, in30]);

  // ── Available Filters ──────────────────────────────────────────────────────
  const availableVenues = useMemo(() => rawData.venues.map(v => v.name), [rawData.venues]);
  const availableBatches = useMemo(() => rawData.batches.map(b => b.name), [rawData.batches]);

  // ── Filtered Players ───────────────────────────────────────────────────────
  const filteredPlayers = useMemo(() => {
    let p = rawData.players;
    if (selectedVenue !== 'all') p = p.filter(x => x.venue === selectedVenue);
    if (selectedBatch !== 'all') p = p.filter(x => x.batch === selectedBatch);
    return p;
  }, [rawData.players, selectedVenue, selectedBatch]);


  // Centres
  const centres = useMemo(() => {
    return rawData.venues
      .filter(v => selectedVenue === 'all' || v.name === selectedVenue)
      .map(v => {
        const vp = indexedData.playersByVenue[v.name] || [];
        const vAttendance = (indexedData.attendanceByDateVenue[today] || {})[v.name] || { records: [], present: 0, absent: 0 };
        const vPresent = vAttendance.present;
        
        const evaluated = vp.filter(p => p.evaluation?.overallRating);
        const avgR = evaluated.length > 0 
          ? Math.round((evaluated.reduce((s, p) => s + (p.evaluation?.overallRating ?? 0), 0) / evaluated.length) * 10) / 10 
          : 0;

        const vPendingFeesCount = indexedData.pendingFeesCountByVenue[v.name] || 0;

        return { 
          name: v.name, 
          players: vp.length, 
          presentToday: vPresent, 
          attendanceRate: vp.length > 0 ? Math.round((vPresent / vp.length) * 100) : 0, 
          avgRating: avgR, 
          pendingFees: vPendingFeesCount 
        };
      });
  }, [rawData.venues, indexedData, today, selectedVenue]);

  // Global Stats & Alerts
  const { globalStats, alertItems, logisticsStats, supportStats } = useMemo(() => {
    let overdueCount = 0;
    let expiringCount = 0;
    let lowAttCount = 0;
    let lowAttPlayerNames: string[] = [];
    let globalPresent = 0;
    
    const thisMonth = today.substring(0, 7);
    let newThisMonth = 0;

    filteredPlayers.forEach(p => {
      const feeSum = indexedData.activeFeeSummaries[p.id];
      if (feeSum?.hasOverdue) overdueCount++;
      if (feeSum?.hasExpiring) expiringCount++;

      const attSum = indexedData.recentAttendanceStats[p.id];
      if (attSum && attSum.totalCount >= 3 && attSum.rate30d < 60) {
        lowAttCount++;
        if (lowAttPlayerNames.length < 2) lowAttPlayerNames.push(p.fullName.split(' ')[0]);
      }

      if ((p.registeredAt || '').startsWith(thisMonth)) newThisMonth++;
    });

    // Attendance today
    const attendanceTodayByVenue = indexedData.attendanceByDateVenue[today] || {};
    if (selectedVenue === 'all') {
      Object.values(attendanceTodayByVenue).forEach(v => {
        globalPresent += v.present;
      });
    } else {
      globalPresent = attendanceTodayByVenue[selectedVenue]?.present || 0;
    }

    const underCentres = centres.filter(v => v.players > 0 && v.players < 3);
    const logStats = computeLogisticsStats(rawData.inventory);
    const supStats = computeSupportStats(rawData.tickets);

    const alerts: (DashboardAlert & { icon: React.ReactNode })[] = [];
    if (overdueCount > 0) alerts.push({ id: 'ov', severity: 'critical', icon: <XCircle size={13} />, label: `${overdueCount} Overdue Fee${overdueCount > 1 ? 's' : ''}`, detail: 'Needs immediate collection' });
    if (expiringCount > 0) alerts.push({ id: 'ex', severity: 'warning', icon: <Timer size={13} />, label: `${expiringCount} Package${expiringCount > 1 ? 's' : ''} Expiring`, detail: 'Within next 30 days' });
    if (lowAttCount > 0) alerts.push({ id: 'la', severity: 'warning', icon: <Activity size={13} />, label: `${lowAttCount} Low Attendance`, detail: lowAttPlayerNames.join(', ') + (lowAttCount > 2 ? ` +${lowAttCount - 2}` : '') });
    if (underCentres.length > 0) alerts.push({ id: 'uc', severity: 'info', icon: <Users size={13} />, label: `${underCentres.length} Centre${underCentres.length > 1 ? 's' : ''} Under-Enrolled`, detail: underCentres.map(v => v.name.split(',')[0]).join(', ') });
    
    if (logStats.lowStockItems > 0) {
      alerts.push({ id: 'ls', severity: 'warning', icon: <Truck size={13} />, label: `${logStats.lowStockItems} Low Stock Items`, detail: logStats.criticalItems.length > 0 ? `Critical: ${logStats.criticalItems.join(', ')}` : 'Check inventory' });
    }
    if (supStats.urgentTickets > 0) {
      alerts.push({ id: 'ut', severity: 'critical', icon: <LifeBuoy size={13} />, label: `${supStats.urgentTickets} Urgent Ticket${supStats.urgentTickets > 1 ? 's' : ''}`, detail: 'Immediate action required' });
    }

    const stats = {
      players: filteredPlayers.length,
      presentToday: globalPresent,
      rate: filteredPlayers.length > 0 ? Math.round((globalPresent / filteredPlayers.length) * 100) : 0,
      alerts: alerts.length,
      overdueCount,
      expiringCount,
      newThisMonth
    };

    return { globalStats: stats, alertItems: alerts, logisticsStats: logStats, supportStats: supStats };
  }, [filteredPlayers, indexedData, centres, today, rawData.inventory, rawData.tickets]);

  // Chart
  const chartAll = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = getDateOffset(i - 6);
      
      let present = 0;
      let absent = 0;

      if (selectedVenue === 'all') {
        const globalStats = indexedData.globalAttendanceByDate[date];
        if (globalStats) {
          present = globalStats.present;
          absent = globalStats.absent;
        }
      } else {
        const vData = (indexedData.attendanceByDateVenue[date] || {})[selectedVenue];
        if (vData) {
          present = vData.present;
          absent = vData.absent;
        }
      }

      return { 
        name: getDayLabel(date), 
        present, 
        absent 
      };
    });
  }, [indexedData.globalAttendanceByDate, indexedData.attendanceByDateVenue, selectedVenue]);

  // Age Distribution
  const ageAll = useMemo(() => {
    const ac: Record<string, number> = {};
    AGE_GROUPS.forEach(g => ac[g] = 0);
    filteredPlayers.forEach(p => { const g = getAgeGroup(p.dateOfBirth); ac[g] = (ac[g] || 0) + 1; });
    return AGE_GROUPS.map((g, i) => ({ name: g, value: ac[g] || 0, color: AGE_COLORS[i] }));
  }, [filteredPlayers]);

  // Activity Feed
  const activityFeed = useMemo(() => {
    const feed: { id: string; type: 'player' | 'match' | 'fee'; label: string; sub: string; ts: number }[] = [];
    
    // New Players (Using pre-sorted index)
    if (activityTypeFilter === 'all' || activityTypeFilter === 'player') {
      indexedData.sortedPlayersByRegistrationDate
        .filter(p => (selectedVenue === 'all' || p.venue === selectedVenue) && (selectedBatch === 'all' || p.batch === selectedBatch))
        .slice(0, activityTypeFilter === 'player' ? 8 : 3)
        .forEach(p => feed.push({ id: `p-${p.id}`, type: 'player', label: `${p.fullName} joined`, sub: p.venue || 'No centre', ts: new Date(p.registeredAt).getTime() }));
    }

    // Matches (Pre-sorted index)
    if (activityTypeFilter === 'all' || activityTypeFilter === 'match') {
      indexedData.sortedMatches
        .slice(0, activityTypeFilter === 'match' ? 8 : 3)
        .forEach(m => feed.push({ id: `m-${m.id}`, type: 'match', label: `${m.result === 'W' ? 'Won' : m.result === 'L' ? 'Lost' : 'Drew'} vs ${m.opponent}`, sub: `${m.scoreFor}–${m.scoreAgainst} · ${new Date(m.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, ts: new Date(m.date).getTime() }));
    }

    // Fees (Using pre-grouped index)
    if (activityTypeFilter === 'all' || activityTypeFilter === 'fee') {
      let filteredFees: FeeRecord[] = [];
      if (selectedVenue !== 'all') {
        filteredFees = indexedData.feesByVenue[selectedVenue] || [];
        if (selectedBatch !== 'all') {
          filteredFees = filteredFees.filter(f => {
            const p = indexedData.playersById[f.playerId];
            return p && p.batch === selectedBatch;
          });
        }
      } else if (selectedBatch !== 'all') {
        filteredFees = indexedData.feesByBatch[selectedBatch] || [];
      } else {
        filteredFees = rawData.fees;
      }
      
      [...filteredFees]
        .filter(f => f.invoice)
        .sort((a, b) => new Date(b.invoice?.date || 0).getTime() - new Date(a.invoice?.date || 0).getTime())
        .slice(0, activityTypeFilter === 'fee' ? 8 : 3)
        .forEach(f => { 
          const pl = indexedData.playersById[f.playerId]; 
          if (pl && f.invoice) {
            feed.push({ 
              id: `f-${f.id}`, 
              type: 'fee', 
              label: `₹${f.invoice.amount.toLocaleString('en-IN')} collected`, 
              sub: `${pl.fullName} · Invoice ${f.invoice.invoiceNo}`, 
              ts: new Date(f.invoice.date).getTime() 
            }); 
          }
        });
    }

    return feed.sort((a, b) => b.ts - a.ts).slice(0, 8);
  }, [indexedData.sortedPlayersByRegistrationDate, indexedData.sortedMatches, indexedData.feesByVenue, indexedData.feesByBatch, indexedData.playersById, rawData.fees, selectedVenue, selectedBatch, activityTypeFilter]);

  // League Rankings
  const leagueRankings = useMemo(() => {
    const evaluated = filteredPlayers.filter(p => p.evaluation?.overallRating);
    const playerScores = evaluated.map(p => {
      const attSum = indexedData.recentAttendanceStats[p.id] || { rate30d: 0, presentCount: 0, totalCount: 0 };
      const attRate = attSum.rate30d;
      const m: any = p.evaluation?.metrics || {};
      const scoutScore = Math.round((
        ((m.passing || 0) + (m.juggling || 0) + (m.shooting || 0) + (m.beepTest || 0) + (m.weakFoot || 0) + (m.longPass || 0)) / 6
      ) * 10) / 10;

      return {
        id: p.id,
        name: p.fullName,
        venue: p.venue || '—',
        memberId: p.memberId || '',
        overallRating: p.evaluation?.overallRating || 0,
        attRate,
        scoutScore,
        compositeScore: computeCompositeScore(p.evaluation?.overallRating || 0, attRate, m),
        developmentAreas: p.evaluation?.developmentAreas || [],
        prevEval: p.evaluationHistory && p.evaluationHistory.length > 0
          ? p.evaluationHistory[p.evaluationHistory.length - 1]
          : null,
      };
    }).sort((a, b) => {
      if (rankingMetric === 'rating') return b.overallRating - a.overallRating;
      if (rankingMetric === 'attendance') return b.attRate - a.attRate;
      if (rankingMetric === 'skills') return b.scoutScore - a.scoutScore;
      return b.compositeScore - a.compositeScore;
    });

    const prevScores = playerScores
      .filter(ps => ps.prevEval)
      .map(ps => {
        const prevE = ps.prevEval!;
        const m2 = prevE.metrics || {};
        let val = computeCompositeScore(prevE.overallRating || 0, ps.attRate, m2);
        if (rankingMetric === 'rating') val = prevE.overallRating || 0;
        else if (rankingMetric === 'attendance') val = ps.attRate;
        else if (rankingMetric === 'skills') {
          val = Math.round((
            ((m2.passing || 0) + (m2.juggling || 0) + (m2.shooting || 0) + (m2.beepTest || 0) + (m2.weakFoot || 0) + (m2.longPass || 0)) / 6
          ) * 10) / 10;
        }
        return { id: ps.id, prevScore: val };
      })
      .sort((a, b) => b.prevScore - a.prevScore);

    const prevRankMap: Record<string, number> = {};
    prevScores.forEach((ps, idx) => { prevRankMap[ps.id] = idx + 1; });

    return playerScores.slice(0, rankingLimit).map((ps, idx) => {
      const currentRank = idx + 1;
      const prevRank = prevRankMap[ps.id] ?? 0;
      let trend: LeagueRanking['trend'] = 'new';
      let posChange = 0;
      if (prevRank > 0) {
        posChange = prevRank - currentRank;
        trend = posChange > 0 ? 'up' : posChange < 0 ? 'down' : 'stable';
      }
      return {
        rank: currentRank,
        prevRank,
        name: ps.name,
        venue: ps.venue,
        memberId: ps.memberId,
        compositeScore: ps.compositeScore,
        attendanceRate: ps.attendanceRate,
        overallRating: ps.overallRating,
        scoutScore: ps.scoutScore,
        developmentAreas: ps.developmentAreas,
        trend,
        posChange: Math.abs(posChange),
      } as LeagueRanking;
    });
  }, [filteredPlayers, indexedData.recentAttendanceStats, rankingMetric, rankingLimit]);

  // Player Roster
  const playerRoster = useMemo(() => {
    return filteredPlayers.map(p => {
      const attSum = indexedData.recentAttendanceStats[p.id] || { rate30d: 0, presentCount: 0, totalCount: 0 };
      return { 
        name: p.fullName, 
        memberId: p.memberId || '', 
        sessions: attSum.totalCount, 
        present: attSum.presentCount, 
        rate: attSum.rate30d, 
        rating: p.evaluation?.overallRating ?? 0 
      };
    }).sort((a, b) => a.rate - b.rate);
  }, [filteredPlayers, indexedData.recentAttendanceStats]);


  // ── Render helpers ────────────────────────────────────────────────────────

  const alertStyle = {
    critical: 'border-red-500/20 bg-red-500/8 text-red-400',
    warning: 'border-amber-400/20 bg-amber-400/6 text-amber-400',
    info: 'border-blue-400/20 bg-blue-400/6 text-blue-400',
  } as const;

  const feedColor = { player: '#CCFF00', match: '#f59e0b', fee: '#a78bfa' } as const;
  const feedIcon = { player: <UserPlus size={11} />, match: <Trophy size={11} />, fee: <Receipt size={11} /> } as const;

  const activeCentres = centres.filter(c => c.players > 0);
  const emptyCentres = centres.filter(c => c.players === 0);

  // ── Chart shared props ────────────────────────────────────────────────────
  const renderChart = (data: ChartPoint[]) => {
    const hasData = data.some(d => d.present > 0 || d.absent > 0);
    if (!hasData) return (
      <div className="h-full flex flex-col items-center justify-center gap-2 opacity-10">
        <Activity size={24} className="text-brand-900" />
        <p className="text-[9px] font-black text-brand-900 uppercase italic tracking-widest">No attendance records yet</p>
      </div>
    );
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#CCFF00" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 900 }} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 900 }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0D1B8A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', fontSize: 11, color: 'white' }} 
            labelStyle={{ color: 'rgba(255,255,255,0.6)', fontWeight: 900, fontSize: 9 }} 
            itemStyle={{ fontWeight: 900, color: 'white' }} 
          />
          <Area type="monotone" dataKey="present" name="Present" stroke="#CCFF00" strokeWidth={3} fill="url(#g1)" dot={false} />
          <Area type="monotone" dataKey="absent" name="Absent" stroke="#ffffff" strokeWidth={1} strokeDasharray="4 3" fill="url(#g2)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OVERVIEW VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-32 font-display animate-in fade-in duration-500 text-left">

      <PageHeader 
        title="ACADEMY HUB" 
        subtitle="System Node: Dashboard // Operations · Intelligence · Management"
        extra={
          <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
            <div className="flex flex-col sm:flex-row w-full md:w-auto glass-card p-2 rounded-2xl border border-white/10 gap-2 shadow-lg backdrop-blur-xl">
              <div className="relative">
                <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <select
                  value={selectedVenue}
                  onChange={e => {
                    setSelectedVenue(e.target.value);
                    setSelectedBatch('all');
                  }}
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 active:bg-white/20 text-white font-bold text-[10px] uppercase tracking-widest pl-8 pr-8 py-2.5 rounded-xl border-none outline-none cursor-pointer appearance-none sm:min-w-[140px] transition-all"
                >
                  <option value="all" className="bg-[#0D1B8A]">ALL LOCATIONS</option>
                  {availableVenues.map(v => (
                    <option key={v} value={v} className="bg-[#0D1B8A]">{v}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 border-l border-white/10 pl-2">
                  <ChevronDown size={12} />
                </div>
              </div>

              <div className="relative">
                <Layers size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <select
                  value={selectedBatch}
                  onChange={e => setSelectedBatch(e.target.value)}
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 active:bg-white/20 text-white font-bold text-[10px] uppercase tracking-widest pl-8 pr-8 py-2.5 rounded-xl border-none outline-none cursor-pointer appearance-none sm:min-w-[140px] transition-all"
                >
                  <option value="all" className="bg-[#0D1B8A]">ALL BATCHES</option>
                  {availableBatches.map(b => (
                    <option key={b} value={b} className="bg-[#0D1B8A]">{b}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 border-l border-white/10 pl-2">
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>
            <button onClick={() => setShowConfigModal(true)}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-[#C3F629] hover:text-brand-950 text-white/40 border border-white/10 hover:border-transparent transition-all duration-300 group shadow-2xl flex items-center justify-center shrink-0 self-stretch sm:self-auto"
                title="Manage Venues & Batches"
            >
                <Settings size={16} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>
          </div>
        }
      />

      {/* Sleek Segmented Pill Navigation Tab Bar */}
      <div className="flex flex-wrap sm:flex-nowrap gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl w-full sm:max-w-3xl">
        {[
          { id: 'overview', label: 'Overview & Centres', count: activeCentres.length, countColor: 'text-[#C3F629]' },
          { id: 'rankings', label: 'Athlete Rankings', count: leagueRankings.length, countColor: 'text-[#00C8FF]' },
          { id: 'analytics', label: 'Analytics & Feed', count: 0, countColor: '' },
          { id: 'operations', label: 'Operations HUD', count: alertItems.length, countColor: alertItems.length > 0 ? 'text-red-400 font-bold' : 'text-white/40' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDashboardTab(t.id as any)}
            className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 italic relative flex items-center justify-center gap-2 whitespace-nowrap
              ${dashboardTab === t.id
                ? 'bg-[#C3F629] text-brand-950 shadow-lg shadow-[#C3F629]/20'
                : 'text-white/40 hover:text-white'}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono leading-none ${dashboardTab === t.id ? 'bg-brand-950 text-[#C3F629]' : 'bg-white/10 ' + t.countColor}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT: OVERVIEW & CENTRES ───────────────────────────────── */}
      {dashboardTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* Re-organized decluttered top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Enrolled', value: globalStats.players, sub: 'Active Athletes', icon: <Users size={18} />, color: '#C3F629', accent: 'glass-card border-white/10 shadow-[0_15px_30px_rgba(13,27,138,0.2)]', showBar: true },
              { label: "Daily Attendance", value: `${globalStats.rate}%`, sub: `${globalStats.presentToday} Present Today`, icon: <Activity size={18} />, color: '#C3F629', accent: 'glass-card border-white/10 shadow-[0_15px_30px_rgba(13,27,138,0.2)]', showBar: true },
              { label: 'New This Month', value: globalStats.newThisMonth, sub: new Date().toLocaleString('en-IN', { month: 'long' }), icon: <CalendarPlus size={18} />, color: '#ffffff', accent: 'glass-card border-white/10', showBar: false },
              { label: 'Active Venues', value: activeCentres.length, sub: `${emptyCentres.length} Inactive / Empty`, icon: <MapPin size={18} />, color: '#ffffff', accent: 'glass-card border-white/10', showBar: false },
            ].map((k, i) => (
              <div key={i} className={`rounded-[2rem] border p-6 group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden ${k.accent}`}>
                {k.showBar && <div className="green-light-bar" />}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[9px] font-black uppercase italic tracking-[0.2em] text-white/40">{k.label}</p>
                  <span style={{ color: k.color }} className="opacity-60 group-hover:opacity-100 transition-opacity icon-glow-lime">{k.icon}</span>
                </div>
                <p className="text-4xl font-black italic leading-none tracking-tighter text-white">
                  <span className="text-white group-hover:text-[#C3F629] transition-colors">{k.value}</span>
                </p>
                <p className="text-[10px] font-black italic text-white/30 mt-3">{k.sub}</p>
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-[#00C8FF]/5 rounded-full blur-2xl group-hover:bg-[#00C8FF]/10 transition-all duration-700" />
              </div>
            ))}
          </div>

          {/* Active Centres */}
          {selectedBatch === 'all' && activeCentres.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Radio size={12} className="text-[#C3F629] animate-pulse" />
                <p className="text-[10px] font-black text-white/60 uppercase italic tracking-[0.35em]">
                  {selectedVenue === 'all' ? 'OPERATIONAL TRAINING NODES' : `${selectedVenue.toUpperCase()} OVERVIEW`}
                </p>
              </div>
              <div className={`grid gap-5 ${activeCentres.length === 1 ? 'grid-cols-1 max-w-sm' : activeCentres.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                {activeCentres.map(c => (
                  <CentreCard key={c.name} stat={c} onClick={() => { setSelectedVenue(c.name); setSelectedBatch('all'); }} />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Centres */}
          {emptyCentres.length > 0 && (
            <div className="glass-card rounded-[2rem] border border-white/10 px-6 py-5 ring-1 ring-white/5 opacity-40">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <p className="text-[9px] font-black text-white/40 uppercase italic tracking-[0.3em]">
                  {emptyCentres.length} INACTIVE NODE{emptyCentres.length > 1 ? 'S' : ''} (ZERO ENROLMENT)
                </p>
                <p className="text-[9px] font-bold italic text-white/20 ml-auto">{emptyCentres.map(c => c.name).join(' · ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT: ATHLETE LEAGUE & RANKINGS ─────────────────────────── */}
      {dashboardTab === 'rankings' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* Roster (Specific venue roster if filters are active) */}
          {(selectedVenue !== 'all' || selectedBatch !== 'all') && playerRoster.length > 0 && (
            <div className="glass-card rounded-[2.5rem] border border-white/10 shadow-xl overflow-hidden ring-1 ring-white/5">
              <div className="px-5 sm:px-8 py-5 border-b border-white/10 flex items-center gap-3 bg-black/5">
                <Users size={14} className="text-[#C3F629]" />
                <h3 className="text-[11px] font-black italic uppercase text-white tracking-[0.25em]">ATTENDANCE & EVALUATION ROSTER</h3>
                <span className="ml-auto text-[9px] font-black text-[#C3F629] bg-[#C3F629]/10 border border-[#C3F629]/20 px-2.5 py-1 rounded-lg">{playerRoster.length} PLAYERS</span>
              </div>
              <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto custom-scrollbar-tactical">
                {playerRoster.map((p, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 sm:px-8 py-4 hover:bg-black/20 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black text-brand-950 flex-shrink-0"
                      style={{ background: nameColor(p.name) }}>
                      {initials(p.name)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[12px] font-black italic text-white truncate">{p.name}</p>
                      <p className="text-[9px] font-bold text-white/25 italic">{p.memberId || 'No ID'}</p>
                    </div>
                    <div className="flex-1 max-w-[120px] space-y-1 hidden sm:block">
                      <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.rate}%`, background: rateColor(p.rate) }} />
                      </div>
                      <p className="text-[8px] font-black italic text-white/20 text-left">
                        {p.sessions > 0 ? `${p.present}/${p.sessions} sessions` : 'No records'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 w-12">
                      {p.sessions > 0
                        ? <p className="text-[13px] font-black italic" style={{ color: rateColor(p.rate) }}>{p.rate}%</p>
                        : <p className="text-[11px] font-black italic text-white/15">—</p>}
                    </div>
                    <div className="text-right flex-shrink-0 w-10 hidden sm:block">
                      {p.rating > 0
                        ? <p className="text-[11px] font-black italic text-white/40">⭐ {p.rating}</p>
                        : <p className="text-[10px] font-black italic text-white/12">—</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table rankings */}
          {leagueRankings.length > 0 ? (
            <div className="glass-card rounded-[2.5rem] border border-white/10 shadow-xl overflow-hidden ring-1 ring-white/5">
              <div className="px-5 sm:px-8 py-5 border-b border-white/10 flex flex-col lg:flex-row lg:items-center gap-4 bg-black/5 justify-between">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-2xl bg-[#C3F629]/10 border border-[#C3F629]/20 flex items-center justify-center flex-shrink-0">
                    <Medal size={14} className="text-[#C3F629]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-black italic uppercase text-white tracking-tight leading-none">PERFORMANCE RANKINGS</h3>
                    <p className="text-[8px] font-black italic text-white/45 uppercase tracking-[0.3em] mt-1.5">
                      TOP {rankingLimit === 1000 ? 'ALL' : rankingLimit} PLAYERS · {selectedBatch !== 'all' ? selectedBatch : selectedVenue !== 'all' ? selectedVenue : 'ALL CENTRES COMBINED'}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="relative">
                    <select
                      value={rankingMetric}
                      onChange={e => setRankingMetric(e.target.value as any)}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-xl border border-white/10 outline-none cursor-pointer appearance-none pr-7"
                    >
                      <option value="composite" className="bg-[#0D1B8A]">SORT: COMPOSITE</option>
                      <option value="rating" className="bg-[#0D1B8A]">SORT: COACH RATING</option>
                      <option value="attendance" className="bg-[#0D1B8A]">SORT: ATTENDANCE</option>
                      <option value="skills" className="bg-[#0D1B8A]">SORT: SKILL METRICS</option>
                    </select>
                    <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
                  </div>
                  <div className="relative">
                    <select
                      value={rankingLimit}
                      onChange={e => setRankingLimit(Number(e.target.value))}
                      className="bg-white/5 hover:bg-white/10 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-xl border border-white/10 outline-none cursor-pointer appearance-none pr-7"
                    >
                      <option value={5} className="bg-[#0D1B8A]">TOP 5</option>
                      <option value={10} className="bg-[#0D1B8A]">TOP 10</option>
                      <option value={25} className="bg-[#0D1B8A]">TOP 25</option>
                      <option value={1000} className="bg-[#0D1B8A]">ALL</option>
                    </select>
                    <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
                  </div>
                  {[
                    { dot: 'bg-[#C3F629]', label: 'Coach 40%' },
                    { dot: 'bg-brand-500', label: 'Att 35%' },
                    { dot: 'bg-brand-accent', label: 'Skills 25%' },
                  ].map((l, i) => (
                    <span key={i} className="flex items-center gap-1 text-[8px] font-black italic text-white/50 bg-black/20 border border-white/5 px-2 py-1 rounded-lg">
                      <span className={`w-1 h-1 rounded-full ${l.dot} shadow-[0_0_8px_currentColor]`} />{l.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Table Rankings */}
              <div className="overflow-x-auto custom-scrollbar-tactical">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-brand-950/20">
                      {['RANK', 'PLAYER PROFILE', 'COMPOSITE', 'RATING', 'ATTENDANCE', 'SKILLS', 'TREND', 'DEVELOPMENT'].map((h, i) => (
                        <th key={i} className={`px-6 py-4 text-[9px] font-black italic text-white/60 uppercase tracking-[0.2em] ${
                          i === 0 ? 'w-20 text-center' : i === 1 ? 'text-left' : 'text-center'
                        }`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {leagueRankings.map((r) => {
                      const trendConfig = {
                        up: { icon: <ArrowUp size={11} />, color: '#4ade80', label: `+${r.posChange}`, bg: 'bg-emerald-500/10 border-emerald-500/20' },
                        down: { icon: <ArrowDown size={11} />, color: '#f87171', label: `-${r.posChange}`, bg: 'bg-red-500/10 border-red-500/20' },
                        stable: { icon: <Minus size={11} />, color: 'rgba(255,255,255,0.25)', label: '—', bg: 'bg-brand-950 border-white/10' },
                        new: { icon: <Zap size={11} />, color: '#f59e0b', label: 'NEW', bg: 'bg-amber-500/10 border-amber-500/20' },
                      }[r.trend];
                      const medalColors = ['#C3F629', '#C0C0C0', '#CD7F32'];
                      const isTop3 = r.rank <= 3;
                      return (
                        <tr key={r.name} className="hover:bg-black/10 transition-colors group">
                          <td className="px-4 py-4 text-center">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black italic mx-auto ${
                              isTop3 ? 'shadow-lg' : ''
                            }`} style={{
                              background: isTop3 ? `${medalColors[r.rank - 1]}20` : 'rgba(255,255,255,0.05)',
                              color: isTop3 ? medalColors[r.rank - 1] : 'rgba(255,255,255,0.3)',
                              border: isTop3 ? `1px solid ${medalColors[r.rank - 1]}30` : '1px solid rgba(255,255,255,0.06)',
                            }}>{r.rank}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
                                style={{ background: nameColor(r.name), color: '#0D1B8A' }}>
                                {initials(r.name)}
                              </div>
                              <div className="min-w-0 text-left">
                                <p className="text-[12px] font-black italic text-white truncate">{r.name}</p>
                                <p className="text-[8px] font-bold italic text-white/50 truncate">{r.venue}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-[16px] font-black italic leading-none" style={{ color: r.compositeScore >= 70 ? '#C3F629' : r.compositeScore >= 50 ? '#f59e0b' : '#f87171' }}>
                                {r.compositeScore}
                              </span>
                              <span className="text-[7px] font-black italic text-white/40">/100</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-[13px] font-black italic text-[#C3F629]">{r.overallRating}</span>
                            <span className="text-[8px] font-black italic text-white/20">/10</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[12px] font-black italic" style={{ color: rateColor(r.attendanceRate) }}>{r.attendanceRate}%</span>
                              <div className="w-10 h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${r.attendanceRate}%`, background: rateColor(r.attendanceRate) }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-[12px] font-black italic text-purple-400">{r.scoutScore}</span>
                            <span className="text-[8px] font-black italic text-white/20">/10</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[9px] font-black italic ${trendConfig.bg}`}
                              style={{ color: trendConfig.color }}>
                              {trendConfig.icon}
                              {trendConfig.label}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-left">
                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                              {r.developmentAreas.slice(0, 2).map((a, i) => (
                                <span key={i} className="text-[7px] font-black italic text-white/40 bg-brand-950 border border-white/10 px-2 py-0.5 rounded-lg">{a}</span>
                              ))}
                              {r.developmentAreas.length > 2 && (
                                <span className="text-[7px] font-black italic text-white/20">+{r.developmentAreas.length - 2}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend Footer */}
              <div className="px-5 sm:px-8 py-3.5 border-t border-white/[0.04] flex flex-wrap gap-4 bg-black/5">
                {[
                  { icon: <ArrowUp size={9} className="text-emerald-400" />, label: 'Climbing vs last evaluation', color: 'text-emerald-400' },
                  { icon: <ArrowDown size={9} className="text-red-400" />, label: 'Dropped vs last evaluation', color: 'text-red-400' },
                  { icon: <Zap size={9} className="text-amber-400" />, label: 'First time ranked', color: 'text-amber-400' },
                ].map((l, i) => (
                  <span key={i} className={`flex items-center gap-1 text-[8px] font-black italic ${l.color} opacity-80`}>{l.icon}{l.label}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-32 glass-card flex flex-col items-center justify-center gap-4 text-white/10">
              <Medal size={64} strokeWidth={1.5} />
              <p className="text-sm font-black uppercase tracking-[0.3em] text-white/30 italic">No player rankings available</p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT: ANALYTICS & RECENT FEED ───────────────────────────── */}
      {dashboardTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* Trend Chart */}
          <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-xl overflow-hidden ring-1 ring-white/5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-[#C3F629]" />
                <h3 className="text-[11px] font-black italic uppercase text-white tracking-[0.25em]">ATTENDANCE TREND (7 DAYS)</h3>
              </div>
              <div className="flex gap-3 text-[9px] font-black italic text-white/40">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#C3F629] inline-block rounded" /> Present</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-white inline-block rounded opacity-20" /> Absent</span>
              </div>
            </div>
            <div className="h-[200px] sm:h-[240px]">{renderChart(chartAll)}</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Age Distribution */}
            <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-xl ring-1 ring-white/5">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={13} className="text-[#C3F629]" />
                <h3 className="text-[11px] font-black italic uppercase text-white tracking-[0.25em]">DEMOGRAPHIC DISTRIBUTION</h3>
              </div>
              {ageAll.length > 0 ? (
                <div className="space-y-2.5">
                  {ageAll.map(g => {
                    const max = Math.max(...ageAll.map(x => x.value));
                    const total = ageAll.reduce((s, x) => s + x.value, 0);
                    return (
                      <div key={g.name} className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase italic text-white/40 w-8 flex-shrink-0 text-left">{g.name}</span>
                        <div className="flex-1 h-6 bg-black/20 rounded-xl overflow-hidden">
                          <div className="h-full rounded-xl flex items-center px-2.5 transition-all duration-1000"
                            style={{ width: `${(g.value / max) * 100}%`, background: g.color, minWidth: '2rem' }}>
                            <span className="text-[10px] font-black italic text-brand-950">{g.value}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-black italic text-white/20 w-7 text-right">{Math.round((g.value / total) * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center opacity-25">
                  <p className="text-[9px] font-black italic text-white/25 uppercase">No player data yet</p>
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-xl ring-1 ring-white/5 text-left">
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="flex items-center gap-2">
                  <Radio size={13} className="text-[#C3F629] animate-pulse" />
                  <h3 className="text-[11px] font-black italic uppercase text-white tracking-[0.25em]">RECENT ACTIVITY</h3>
                </div>
                <div className="relative">
                  <select
                    value={activityTypeFilter}
                    onChange={e => setActivityTypeFilter(e.target.value as any)}
                    className="bg-white/5 hover:bg-white/10 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-xl border border-white/10 outline-none cursor-pointer appearance-none pr-7"
                  >
                    <option value="all" className="bg-[#0D1B8A]">ALL TYPES</option>
                    <option value="player" className="bg-[#0D1B8A]">PLAYERS</option>
                    <option value="match" className="bg-[#0D1B8A]">MATCHES</option>
                    <option value="fee" className="bg-[#0D1B8A]">FEES</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" />
                </div>
              </div>
              {activityFeed.length > 0 ? (
                <div className="space-y-0.5 max-h-[220px] overflow-y-auto custom-scrollbar-tactical">
                  {activityFeed.map(item => (
                    <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                      <div className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ background: `${feedColor[item.type]}12`, color: feedColor[item.type] }}>
                        {feedIcon[item.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black italic text-white truncate">{item.label}</p>
                        <p className="text-[8px] font-bold italic text-white/25">{item.sub}</p>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: feedColor[item.type], opacity: 0.5 }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center opacity-25">
                  <p className="text-[9px] font-black italic text-white/25 uppercase">No activity yet</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: OPERATIONS & SYSTEM ALERTS HUD ────────────────────── */}
      {dashboardTab === 'operations' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* Critical Alerts */}
          {alertItems.length > 0 ? (
            <div className="glass-card rounded-[2rem] border border-white/10 overflow-hidden ring-1 ring-white/5 text-left">
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center gap-2 bg-black/5">
                <AlertTriangle size={12} className="text-amber-400 font-bold" />
                <p className="text-[9px] font-black text-white/60 uppercase italic tracking-[0.3em]">CRITICAL NODE ALERTS</p>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {alertItems.map(a => (
                  <div key={a.id} className={`flex items-center gap-3 px-5 py-3.5 rounded-[1.5rem] border backdrop-blur-md ${alertStyle[a.severity]}`}>
                    <div className="flex-shrink-0">{a.icon}</div>
                    <div className="text-left">
                      <p className="text-[11px] font-black italic leading-tight text-white">{a.label}</p>
                      <p className="text-[9px] font-bold italic opacity-60 text-white/80 mt-1">{a.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card py-16 flex flex-col items-center justify-center gap-4 text-white/10 border border-white/10">
              <CheckCircle2 size={48} className="text-[#C3F629] animate-bounce" />
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40 italic">ALL STATIONS SECURE · NO CRITICAL ALERTS</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Logistics Widget */}
            <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-xl ring-1 ring-white/5 text-left">
              <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                <Truck size={14} className="text-[#C3F629]" />
                <h3 className="text-[11px] font-black italic uppercase text-white tracking-[0.25em]">LOGISTICS & ASSETS</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">VALUATION</p>
                  <p className="text-xl sm:text-2xl font-black text-[#C3F629] mt-1">₹{(logisticsStats.totalValue || 0).toLocaleString('en-IN')}</p>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-1">Active Kit Assets</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">LOW STOCK</p>
                  <p className={`text-xl sm:text-2xl font-black mt-1 ${logisticsStats.lowStockItems > 0 ? 'text-red-400' : 'text-[#C3F629]'}`}>
                    {logisticsStats.lowStockItems} ITEMS
                  </p>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-1">Below Safety Limit</p>
                </div>
              </div>

              {logisticsStats.criticalItems.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
                  <p className="text-[8px] font-black text-red-400 uppercase tracking-widest italic mb-2 flex items-center gap-1.5"><AlertTriangle size={10} /> CRITICAL RE-ORDER NEEDED</p>
                  <div className="flex flex-wrap gap-2">
                    {logisticsStats.criticalItems.map((item, idx) => (
                      <span key={idx} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase rounded-lg italic">{item}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Support Desk Widget */}
            <div className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-xl ring-1 ring-white/5 text-left">
              <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                <LifeBuoy size={14} className="text-[#C3F629]" />
                <h3 className="text-[11px] font-black italic uppercase text-white tracking-[0.25em]">SUPPORT DESK HUD</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">OPEN TICKETS</p>
                  <p className="text-xl sm:text-2xl font-black text-white mt-1">{supportStats.activeTickets}</p>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-1">Pending Resolution</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-red-400/60 uppercase tracking-widest italic">CRITICAL SLAS</p>
                  <p className={`text-xl sm:text-2xl font-black mt-1 ${supportStats.urgentTickets > 0 ? 'text-red-400' : 'text-[#C3F629]'}`}>
                    {supportStats.urgentTickets} TICKETS
                  </p>
                  <p className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-1">Requires Direct Attention</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div>
                  <p className="text-xs font-black italic text-white uppercase tracking-wider leading-none">Global Desk Health</p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mt-1.5">Resolution efficiency</p>
                </div>
                <span className="text-xs font-black italic px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">98.4% SAFE</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── Config Modal ───────────────────────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-xl glass-card rounded-3xl sm:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 ring-1 ring-white/5 max-h-[90vh] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-[#C3F629] opacity-40" />
            
            <div className="flex justify-between items-center p-5 sm:p-8 border-b border-[#ffffff12] bg-[#ffffff03]">
              <div className="flex items-center gap-3 sm:gap-4 font-display">
                <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#C3F629]/10 border border-[#C3F629]/20 text-[#C3F629]">
                  <Settings size={20} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <div className="text-left">
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight italic font-display leading-none">Academy <span className="text-[#C3F629]">Config</span></h3>
                  <p className="text-[8px] sm:text-[10px] font-bold text-white/45 uppercase tracking-widest mt-1">Venues & Batch Management</p>
                </div>
              </div>
              <button onClick={() => { setShowConfigModal(false); setEditingItem(null); setNewItemName(''); }}
                className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10">
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="px-8 pt-6">
              <div className="flex gap-1.5 p-1.5 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                {(['venues', 'batches'] as const).map(t => (
                  <button key={t} onClick={() => { setConfigTab(t); setEditingItem(null); setNewItemName(''); }}
                    className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 italic
                      ${configTab === t ? 'bg-[#C3F629] text-brand-950 shadow-lg shadow-[#C3F629]/20' : 'text-white/40 hover:text-white'}`}>
                    {t === 'venues' ? 'Venues' : 'Batches'}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 sm:px-8 pt-6 flex flex-col sm:flex-row gap-3">
              <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-bold text-white placeholder:text-white/20 focus:border-[#C3F629] outline-none transition-all shadow-inner"
                value={newItemName} onChange={e => setNewItemName(e.target.value)}
                placeholder={editingItem ? 'Update name…' : `Add new ${configTab === 'venues' ? 'venue' : 'batch'}…`}
                onKeyDown={e => e.key === 'Enter' && (editingItem ? handleUpdateConfigItem() : handleAddConfigItem())} />
              <div className="flex gap-2 shrink-0">
                <button onClick={editingItem ? handleUpdateConfigItem : handleAddConfigItem}
                  className="flex-1 sm:flex-none px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-[#C3F629] text-brand-950 font-black text-[10px] sm:text-[11px] uppercase tracking-widest hover:scale-[1.05] shadow-lg shadow-[#C3F629]/20 transition-all flex items-center justify-center gap-2 italic">
                  {editingItem ? <Check size={14} className="sm:w-4 sm:h-4" /> : <Plus size={14} className="sm:w-4 sm:h-4" />}
                  {editingItem ? 'Save' : 'Add'}
                </button>
                {editingItem && (
                  <button onClick={() => { setEditingItem(null); setNewItemName(''); }}
                    className="px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center">
                    <X size={14} className="sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="px-6 sm:px-8 py-6 max-h-[320px] overflow-y-auto space-y-3">
              {(configTab === 'venues' ? rawData.venues : rawData.batches).map(item => (
                <div key={item.id}
                  className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 group/item hover:border-[#C3F629]/30 hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-md ring-1 ring-white/5">
                  <div className="flex items-center gap-3 sm:gap-4 font-display">
                    <div className="w-2 h-2 rounded-full bg-[#C3F629]/40 group-hover/item:bg-[#C3F629] transition-colors" />
                    <span className="text-[11px] sm:text-sm font-bold text-white group-hover/item:text-[#C3F629] transition-colors italic font-display truncate max-w-[150px] sm:max-w-none">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                    <button onClick={() => { setEditingItem(item); setNewItemName(item.name); }}
                      className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-white/40 hover:text-[#C3F629] hover:bg-white/5 transition-all">
                      <Edit2 size={14} className="sm:w-[15px] sm:h-[15px]" />
                    </button>
                    <button onClick={() => handleSecureConfigDelete(configTab === 'venues' ? 'venue' : 'batch', item.id, item.name)}
                      className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={14} className="sm:w-[15px] sm:h-[15px]" />
                    </button>
                  </div>
                </div>
              ))}
              {(configTab === 'venues' ? rawData.venues : rawData.batches).length === 0 && (
                <div className="py-20 flex flex-col items-center gap-4 text-white/10">
                  <Layers size={40} strokeWidth={1.5} />
                  <p className="text-[11px] font-black uppercase tracking-widest italic opacity-50">
                    No {configTab === 'venues' ? 'venues' : 'batches'} added
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-white/5 border-t border-white/10 flex justify-end">
              <button onClick={() => { setShowConfigModal(false); setEditingItem(null); setNewItemName(''); }}
                className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black text-white/40 uppercase tracking-widest hover:text-white hover:bg-white/10 shadow-sm transition-all italic tracking-[0.2em]">
                Close Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Config Modal ───────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={configDeleteModalOpen}
        title={`Delete ${configItemToDelete?.type}`}
        message={`Are you sure you want to permanently delete "${configItemToDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmConfigDelete}
        onCancel={() => { setConfigDeleteModalOpen(false); setConfigItemToDelete(null); }}
        requireTypeToConfirm="delete"
      />
    </div>
  );
};
