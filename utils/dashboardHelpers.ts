import { Player, AttendanceRecord, FeeRecord, Match, AttendanceStatus, SupportTicket, InventoryItem } from '../types';

export interface CentreStat {
  name: string;
  players: number;
  presentToday: number;
  attendanceRate: number;
  avgRating: number;
  pendingFees: number;
}

export interface PlayerRow {
  name: string;
  memberId: string;
  sessions: number;
  present: number;
  rate: number;
  rating: number;
}

export interface ChartPoint {
  name: string;
  present: number;
  absent: number;
}

export interface AgePoint {
  name: string;
  value: number;
  color: string;
}

export interface LeagueRanking {
  rank: number;
  prevRank: number; // 0 = new entry
  name: string;
  venue: string;
  memberId: string;
  compositeScore: number;
  attendanceRate: number;
  overallRating: number;
  scoutScore: number;
  developmentAreas: string[];
  trend: 'up' | 'down' | 'stable' | 'new';
  posChange: number;
}

export interface DashboardAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  label: string;
  detail: string;
}

export interface LogisticsStats {
  lowStockItems: number;
  criticalItems: string[];
  totalValue?: number;
}

export interface SupportStats {
  activeTickets: number;
  urgentTickets: number;
  avgResolutionTime?: string;
}

/**
 * Calculates logistics health based on inventory levels
 */
export const computeLogisticsStats = (inventory: InventoryItem[]): LogisticsStats => {
  // Use item-specific minStock if defined, otherwise fallback to 5
  const lowStock = inventory.filter(item => {
    const threshold = item.minStock !== undefined ? item.minStock : 5;
    return item.quantity <= threshold;
  });

  // Critical items are those with quantity 0 or significantly below threshold
  const critical = inventory.filter(item => {
    const threshold = item.minStock !== undefined ? item.minStock : 5;
    return item.quantity === 0 || item.quantity <= Math.ceil(threshold / 3);
  });

  return {
    lowStockItems: lowStock.length,
    criticalItems: critical.map(item => item.name),
    totalValue: inventory.reduce((acc, item) => acc + (item.quantity * (item.unitCost || 0)), 0)
  };
};

/**
 * Calculates support workload and urgency
 */
export const computeSupportStats = (tickets: SupportTicket[]): SupportStats => {
  const active = tickets.filter(t => t.status === 'open' || t.status === 'in-progress');
  const urgent = active.filter(t => t.priority === 'high');
  return {
    activeTickets: active.length,
    urgentTickets: urgent.length
  };
};

/**
 * Normalizes attendance status to uppercase for safe comparison
 */
export const isPresent = (status: AttendanceStatus | string) => 
  String(status).toUpperCase() === AttendanceStatus.PRESENT;

/**
 * Calculates the Composite Score (40% Rating, 35% Attendance, 25% Skill Metrics)
 */
export const computeCompositeScore = (
  overallRating: number,
  attRate: number,
  metrics?: Partial<{ passing: number; juggling: number; shooting: number; beepTest: number; weakFoot: number; longPass: number }>
): number => {
  const ratingPart = (overallRating / 10) * 40;
  const attPart = (attRate / 100) * 35;
  
  const m = metrics || {};
  const skillValues = [
    m.passing || 0,
    m.juggling || 0,
    m.shooting || 0,
    m.beepTest || 0,
    m.weakFoot || 0,
    m.longPass || 0
  ];
  const avgMetric = skillValues.reduce((a, b) => a + b, 0) / 6;

  const metricPart = (avgMetric / 10) * 25;
  return Math.round((ratingPart + attPart + metricPart) * 10) / 10;
};

/**
 * Utility to group data by player ID for O(1) lookups
 */
export const groupDataByPlayer = <T extends { playerId: string }>(data: T[]): Record<string, T[]> => {
  return data.reduce((acc, item) => {
    if (!acc[item.playerId]) acc[item.playerId] = [];
    acc[item.playerId].push(item);
    return acc;
  }, {} as Record<string, T[]>);
};

export const getAgeGroup = (dob: string) => {
  if (!dob) return 'U12';
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  if (age <= 8) return 'U8';
  if (age <= 10) return 'U10';
  return 'U12';
};

export const getDateOffset = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

export const getDayLabel = (iso: string) => {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
};

/**
 * UI Helpers moved from AdminDashboard for reuse
 */
export function initials(name: string) {
  const p = name.trim().split(' ');
  return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}

export function nameColor(name: string) {
  const palette = ['#CCFF00', '#60a5fa', '#f59e0b', '#4ade80', '#a78bfa', '#f87171', '#22d3ee'];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

export function rateColor(r: number) {
  return r >= 75 ? '#CCFF00' : r >= 50 ? '#f59e0b' : r > 0 ? '#f87171' : 'rgba(255,255,255,0.15)';
}
