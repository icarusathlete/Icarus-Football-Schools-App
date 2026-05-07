import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch, User } from '../types';
import { 
    Search, Edit2, Trash2, Save, X, User as UserIcon, 
    Phone, MapPin, Layers, Map, Filter, Camera, 
    Shield, Check, Key, Activity, Users, History, 
    Zap, ChevronRight, MoreVertical, Target,
    Database, CheckCircle2, Download, ChevronDown
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { PlayerPerformanceModal } from './PlayerPerformanceModal';
import { PageHeader } from './ui/PageHeader';

// ─── Design Helpers (Elite Standard) ──────────────────────────────────────────

function ageGroup(dob: string) {
  if (!dob) return 'U12';
  const a = new Date().getFullYear() - new Date(dob).getFullYear();
  if (a <= 8) return 'U8';
  if (a <= 10) return 'U10';
  return 'U12';
}

function initials(name: string) {
  const p = name.trim().split(' ');
  return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}

function nameColor(name: string) {
  const palette = ['#CCFF00', '#60a5fa', '#f59e0b', '#4ade80', '#a78bfa', '#f87171', '#22d3ee'];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

export const PlayerManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'players' | 'coaches'>('players');

  // Helper classes for consistent styling
  const getInputClass = (type?: string) => `w-full p-6 bg-white/5 border border-white/10 rounded-2xl text-[13px] font-black text-white italic outline-none focus:border-brand-accent/40 focus:bg-white/10 transition-all placeholder:text-white/20 uppercase tracking-[0.1em] shadow-inner ${type === 'newItem' ? 'h-[60px]' : ''}`;
  const getSelectClass = () => "w-full p-6 bg-white/5 border border-white/10 rounded-2xl text-[13px] font-black text-white italic outline-none focus:border-brand-accent/40 focus:bg-white/10 transition-all appearance-none uppercase tracking-[0.1em] cursor-pointer";

  
  const [players, setPlayers] = useState<Player[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [filteredCoaches, setFilteredCoaches] = useState<User[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVenue, setFilterVenue] = useState('ALL');
  const [filterBatch, setFilterBatch] = useState('ALL');

  // Edit State
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewingPerformance, setViewingPerformance] = useState<Player | null>(null);
  const [editingCoach, setEditingCoach] = useState<User | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scoutPreviewUrl, setScoutPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scoutPhotoInputRef = useRef<HTMLInputElement>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{item: Player | User, type: 'player' | 'coach'} | null>(null);

  // Stats for Hero Grid
  const [stats, setStats] = useState({
    totalPlayers: 0,
    newThisMonth: 0,
    activeCoaches: 0,
    venuesCount: 0
  });

  useEffect(() => {
    loadData();
    
    // Listen for data updates from other components
    window.addEventListener('academy_data_update', loadData);
    return () => window.removeEventListener('academy_data_update', loadData);
  }, []);

  useEffect(() => {
    filterData();
  }, [players, coaches, searchTerm, filterVenue, filterBatch, activeTab]);

  const loadData = async () => {
    const allPlayers = StorageService.getPlayers();
    setPlayers(allPlayers);
    const allUsers = await StorageService.getUsers();
    const activeStaff = allUsers.filter(u => u.role?.toLowerCase() === 'coach');
    setCoaches(activeStaff);
    const currentVenues = StorageService.getVenues();
    setVenues(currentVenues);
    setBatches(StorageService.getBatches());

    // Calculate Hero Stats
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const newJoiners = allPlayers.filter(p => (p.registeredAt || '').startsWith(thisMonth)).length;

    setStats({
        totalPlayers: allPlayers.length,
        newThisMonth: newJoiners,
        activeCoaches: activeStaff.length,
        venuesCount: currentVenues.length
    });
  };

  const filterData = () => {
    const lower = searchTerm.toLowerCase();

    if (activeTab === 'players') {
        let result = players;
        if (searchTerm) {
            result = result.filter(p => 
                p.fullName.toLowerCase().includes(lower) || 
                p.memberId.toLowerCase().includes(lower)
            );
        }
        if (filterVenue !== 'ALL') result = result.filter(p => p.venue === filterVenue);
        if (filterBatch !== 'ALL') result = result.filter(p => p.batch === filterBatch);
        setFilteredPlayers(result);
    } else {
        let result = [...coaches];
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(c => 
                (c.fullName?.toLowerCase().includes(lower)) ||
                (c.username?.toLowerCase().includes(lower)) ||
                (c.email?.toLowerCase().includes(lower))
            );
        }
        
        if (filterVenue !== 'ALL') {
            result = result.filter(c => c.assignedVenues?.includes(filterVenue));
        }
        
        if (filterBatch !== 'ALL') {
            result = result.filter(c => c.assignedBatches?.includes(filterBatch));
        }
        
        // Prioritize Abhishek Begal
        const prioritized = [...result].sort((a, b) => {
            const nameA = (a.fullName || a.username || '').toLowerCase();
            const nameB = (b.fullName || b.username || '').toLowerCase();
            
            const isAAbhishek = nameA.includes('abhishek') && nameA.includes('begal');
            const isBAbhishek = nameB.includes('abhishek') && nameB.includes('begal');
            
            if (isAAbhishek && !isBAbhishek) return -1;
            if (!isAAbhishek && isBAbhishek) return 1;
            
            return nameA.localeCompare(nameB);
        });
        
        setFilteredCoaches(prioritized);
    }
};

  const handleSecureDelete = (item: Player | User, type: 'player' | 'coach') => {
      setItemToDelete({ item, type });
      setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!itemToDelete) return;
      const { item, type } = itemToDelete;
      try {
          if (type === 'player') await StorageService.deletePlayer(item.id);
          else await StorageService.deleteUser(item.id);
          loadData();
          setDeleteModalOpen(false);
          setItemToDelete(null);
      } catch (error: any) { alert(`Failed to delete: ${error.message}`); }
  };

  const openEditModal = (item: Player | User, type: 'player' | 'coach') => {
      setPreviewUrl(item.photoUrl || null);
      if (type === 'player') {
          const p = item as Player;
          setScoutPreviewUrl(p.scoutPhoto || null);
          setEditingPlayer({ ...p });
      } else {
          setEditingCoach({ ...item as User });
      }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setPreviewUrl(reader.result as string);
              if (editingPlayer) setEditingPlayer({ ...editingPlayer, photoUrl: reader.result as string });
              if (editingCoach) setEditingCoach({ ...editingCoach, photoUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleScoutPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setScoutPreviewUrl(reader.result as string);
              if (editingPlayer) setEditingPlayer({ ...editingPlayer, scoutPhoto: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const savePlayerChanges = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingPlayer) {
          StorageService.updatePlayer(editingPlayer);
          loadData();
          setEditingPlayer(null);
          setPreviewUrl(null);
          setScoutPreviewUrl(null);
      }
  };

  const saveCoachChanges = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingCoach) {
          StorageService.updateUser(editingCoach);
          loadData();
          setEditingCoach(null);
          setPreviewUrl(null);
      }
  };

  const toggleCoachAssignment = (type: 'venue' | 'batch', value: string) => {
      if (!editingCoach) return;
      if (type === 'venue') {
          const current = editingCoach.assignedVenues || [];
          const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
          setEditingCoach({ ...editingCoach, assignedVenues: updated });
      } else {
          const current = editingCoach.assignedBatches || [];
          const updated = current.includes(value) ? current.filter(b => b !== value) : [...current, value];
          setEditingCoach({ ...editingCoach, assignedBatches: updated });
      }
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-700 font-display">
      {/* Functional Header */}
      <PageHeader 
        title="PLAYER MANAGEMENT" 
        subtitle="ACADEMY ROSTER · SQUAD COORDINATION"
        extra={
          <>
            <button 
                onClick={() => setActiveTab('players')}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 italic flex items-center gap-2 ${activeTab === 'players' ? 'bg-brand-accent text-brand-950 shadow-[0_10px_25px_rgba(195,246,41,0.2)]' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
            >
                <Users size={12} /> PLAYERS
            </button>
            <button 
                onClick={() => setActiveTab('coaches')}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 italic flex items-center gap-2 ${activeTab === 'coaches' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
            >
                <Shield size={12} /> COACHING STAFF
            </button>
          </>
        }
      />

      {/* ── Strategic Filters ────────────────────────────────────────────────── */}
      <div className="glass-card-alt p-3 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-3 sm:gap-4 items-center mx-0 sm:mx-1">
        <div className="green-light-bar" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-accent/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-brand-accent transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search roster..." 
            className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 pl-14 text-[11px] sm:text-[13px] font-black italic text-white placeholder:text-white/20 outline-none focus:border-brand-accent/40 focus:ring-1 focus:ring-brand-accent/20 transition-all uppercase tracking-widest"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-48 group">
            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-brand-accent transition-colors" size={14} />
            <select 
              className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 pl-12 text-[10px] sm:text-[12px] font-black italic text-white appearance-none outline-none focus:border-brand-accent/40 transition-all uppercase tracking-widest cursor-pointer"
              value={filterVenue}
              onChange={(e) => setFilterVenue(e.target.value)}
            >
              <option value="ALL">All Venues</option>
              {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                <ChevronRight className="rotate-90" size={14} />
            </div>
          </div>

          <div className="relative flex-1 sm:flex-none sm:w-48 group">
            <Layers className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-brand-accent transition-colors" size={14} />
            <select 
              className="w-full bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 pl-12 text-[10px] sm:text-[12px] font-black italic text-white appearance-none outline-none focus:border-brand-accent/40 transition-all uppercase tracking-widest cursor-pointer"
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
            >
              <option value="ALL">All Batches</option>
              {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                <ChevronRight className="rotate-90" size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid Integration (Moved below filters) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mx-1">
        {[
          { label: 'Total Players', value: stats.totalPlayers, sub: 'Active Members', icon: <Users size={18} />, color: '#C3F629' },
          { label: 'New Joiners', value: stats.newThisMonth, sub: 'This Month', icon: <Zap size={18} />, color: stats.newThisMonth > 0 ? '#C3F629' : 'rgba(255,255,255,0.4)' },
          { label: 'Command staff', value: stats.activeCoaches, sub: 'Active Personnel', icon: <Shield size={18} />, color: '#60a5fa' },
          { label: 'TRAINING VENUES', value: stats.venuesCount, sub: 'Active Locations', icon: <MapPin size={18} />, color: '#f59e0b' }
        ].map((k, i) => (
          <div key={i} className="glass-card-alt p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] group/kpi hover:bg-white/10 hover:border-white/30 transition-all duration-500 shadow-xl relative overflow-hidden border border-white/5">
            <div className="green-light-bar" />
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/kpi:scale-110 transition-transform duration-700">
                <div style={{ color: k.color }}>{k.icon}</div>
            </div>
            <div className="relative z-10">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-2">{k.label}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-xl sm:text-3xl font-black italic leading-none tracking-tighter text-white group-hover:text-brand-accent transition-colors duration-500">{k.value}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <span className="w-4 h-[1px] bg-white/10"></span>
                    <p className="text-[8px] font-black italic text-white/20 uppercase tracking-widest">{k.sub}</p>
                </div>
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'players' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 sm:gap-8">
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map(player => (
              <div key={player.id} className="glass-card p-4 sm:p-6 rounded-[1.25rem] sm:rounded-[2.5rem] border border-white/10 hover:border-white/20 transition-all duration-500 group relative overflow-hidden hover:shadow-2xl hover:shadow-brand-accent/5">
                <div className="green-light-bar" />
                
                <div className="flex items-center gap-4 sm:gap-6 mb-6">
                  <div className="relative group/photo shrink-0">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-[1.5rem] overflow-hidden border border-white/10 group-hover/photo:border-brand-accent/40 transition-colors shadow-2xl">
                      {player.photoUrl ? (
                        <img src={player.photoUrl} alt="" className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center font-black italic text-xl sm:text-2xl text-white/20">
                          {initials(player.fullName)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2">
                        <span className="text-[8px] sm:text-[9px] font-black text-brand-accent uppercase tracking-widest italic">{player.memberId}</span>
                    </div>
                    <h3 className="text-sm sm:text-lg md:text-xl font-black text-white italic uppercase tracking-tight leading-tight truncate group-hover:text-brand-accent transition-colors">
                      {player.fullName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-3">
                        <div className="px-2.5 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-lg">
                            <span className="text-[8px] sm:text-[9px] font-black text-brand-accent uppercase italic tracking-widest">{player.position}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[8px] sm:text-[10px] font-bold text-white/40 uppercase italic tracking-widest">
                            <MapPin size={10} className="text-brand-accent/40" />
                            {player.venue}
                        </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:gap-3 mb-6">
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <Layers size={12} className="text-white/20" />
                            <span className="text-[9px] sm:text-[11px] font-black text-white/40 uppercase italic tracking-widest">Program</span>
                        </div>
                        <span className="text-[10px] sm:text-[12px] font-black text-white italic uppercase">{player.batch}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <Phone size={12} className="text-white/20" />
                            <span className="text-[9px] sm:text-[11px] font-black text-white/40 uppercase italic tracking-widest">Guardian</span>
                        </div>
                        <span className="text-[10px] sm:text-[12px] font-black text-white italic uppercase">{player.contactNumber}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 pt-2">
                  <button 
                    onClick={() => setViewingPerformance(player)}
                    className="flex-1 py-3 sm:py-4 bg-brand-accent/10 border border-brand-accent/20 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black text-brand-accent uppercase italic tracking-[0.15em] hover:bg-brand-accent hover:text-brand-950 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-brand-accent/20"
                  >
                    <Activity size={12} /> <span className="hidden sm:inline">Tactical</span> Performance
                  </button>
                  <button 
                    onClick={() => openEditModal(player, 'player')}
                    className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white/40 hover:bg-brand-accent hover:text-brand-950 hover:border-brand-accent transition-all duration-300 shadow-xl"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleSecureDelete(player, 'player')}
                    className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white/40 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all duration-300 shadow-xl"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-40 text-center">
              <div className="flex flex-col items-center gap-4 opacity-10">
                <Users size={64} className="text-white" />
                <p className="text-sm font-black uppercase tracking-[0.5em] text-white italic">NO PLAYERS FOUND</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Coaching Staff ────────────────────────────────────────────────── */}
      {activeTab === 'coaches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredCoaches.length > 0 ? filteredCoaches.map((coach) => (
            <div key={coach.id} className="glass-card rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 overflow-hidden group hover:scale-[1.02] hover:-translate-y-2 transition-all duration-700 shadow-2xl relative flex flex-col h-full">
              <div className="green-light-bar" />
              
              {/* Card Top HUD */}
              <div className="px-6 sm:px-8 py-4 sm:py-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse shadow-[0_0_8px_#C3F629]" />
                  <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest italic">{coach.role || 'STAFF'}</span>
                </div>
                <span className="text-[9px] font-mono text-white/40">{coach.employeeNumber || 'STAFF'}</span>
              </div>

              <div className="p-6 sm:p-8 relative z-10 flex-1 flex flex-col">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-8 group/avatar">
                    <div className="absolute -inset-4 bg-brand-primary/10 rounded-full blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-700" />
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-[2.2rem] border-2 border-white/10 group-hover/avatar:border-brand-primary/40 overflow-hidden relative z-10 transition-all duration-500 shadow-2xl group-hover/avatar:-rotate-2 group-hover/avatar:scale-105">
                      {coach.photoUrl ? (
                        <img src={coach.photoUrl} alt={coach.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-black italic bg-gradient-to-br from-brand-primary/20 to-brand-900 text-white">
                          {initials(coach.fullName || coach.username)}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-brand-950 border border-white/10 flex items-center justify-center text-brand-primary shadow-xl z-20 group-hover/avatar:scale-110 transition-transform">
                      <Shield size={16} />
                    </div>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tighter leading-none mb-6 group-hover:text-brand-primary transition-colors duration-500">
                    {coach.fullName || coach.username}
                  </h3>
                </div>

                <div className="space-y-6 flex-1">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] italic text-white/30 px-1">
                      <span>VENUE ASSIGNMENT</span>
                      <MapPin size={10} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {coach.assignedVenues && coach.assignedVenues.length > 0 ? coach.assignedVenues.map(v => (
                        <span key={v} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white/70 uppercase italic tracking-wider">
                          {v}
                        </span>
                      )) : (
                        <div className="w-full py-3 border border-dashed border-white/10 rounded-xl text-center text-[10px] font-bold text-white/20 uppercase tracking-widest italic">UNASSIGNED</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] italic text-white/30 px-1">
                      <span>BATCH REACH</span>
                      <Layers size={10} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {coach.assignedBatches && coach.assignedBatches.length > 0 ? coach.assignedBatches.map(b => (
                        <span key={b} className="px-4 py-2 bg-brand-accent/10 border border-brand-accent/20 rounded-xl text-[10px] font-black text-brand-accent uppercase italic tracking-wider">
                          {b}
                        </span>
                      )) : (
                        <div className="w-full py-3 border border-dashed border-white/10 rounded-xl text-center text-[10px] font-bold text-white/20 uppercase tracking-widest italic">NO ASSIGNMENTS</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 flex gap-3">
                  <button 
                    onClick={() => openEditModal(coach, 'coach')}
                    className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white/40 uppercase tracking-widest italic hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} /> EDIT PROFILE
                  </button>
                  <button 
                    onClick={() => handleSecureDelete(coach, 'coach')}
                    className="w-12 h-12 bg-red-500/5 border border-red-500/10 rounded-xl text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-40 text-center">
              <div className="flex flex-col items-center gap-6 opacity-20">
                <Shield size={80} className="text-white" />
                <p className="text-sm font-black uppercase tracking-[0.5em] text-white italic">NO COACHING STAFF FOUND</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SYSTEM MODALS ── */}
      {editingPlayer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
              <div className="absolute inset-0 bg-[#050714]/80 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => setEditingPlayer(null)}></div>
              <div className="w-full max-w-[95vw] sm:max-w-2xl glass-card rounded-[1.5rem] sm:rounded-[3rem] border border-white/20 shadow-[0_40px_100px_rgba(13,27,138,0.5)] overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-in zoom-in slide-in-from-bottom-5 duration-500">
                  <div className="green-light-bar" />
                  <div className="p-8 md:p-10 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                      <div>
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">PLAYER <span className="premium-gradient-text">PROFILE</span></h3>
                        <p className="text-[8px] sm:text-[9px] font-black text-white/50 uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2"><Zap size={10} className="text-brand-accent" /> EDIT PLAYER PROFILE</p>
                      </div>
                      <button onClick={() => setEditingPlayer(null)} className="w-14 h-14 bg-white/10 rounded-2xl text-white/60 hover:text-brand-accent hover:bg-brand-accent/10 flex items-center justify-center border border-white/10 hover:border-brand-accent/20 transition-all duration-300 group">
                          <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                      </button>
                  </div>
                  
                  <form onSubmit={savePlayerChanges} className="p-6 sm:p-8 md:p-12 space-y-8 md:space-y-10 overflow-y-auto custom-scrollbar text-left flex-1">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          {/* Profile Photo */}
                          <div className="space-y-4">
                              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] italic ml-1 text-center block">Headshot Profile</label>
                              <div className="relative group cursor-pointer mx-auto w-32 h-32" onClick={() => fileInputRef.current?.click()}>
                                  <div className="absolute -inset-2 bg-gradient-to-br from-brand-accent to-brand-primary rounded-[2.5rem] opacity-20 group-hover:opacity-40 transition-opacity blur-xl"></div>
                                  <div className="relative w-full h-full rounded-[2rem] overflow-hidden border-2 border-white/20 z-10">
                                      <img src={previewUrl || editingPlayer.photoUrl || '/default-avatar.png'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                      <div className="absolute inset-0 bg-brand-950/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                          <Camera className="text-brand-accent" size={24} />
                                      </div>
                                  </div>
                                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
                              </div>
                          </div>

                          {/* Scout Action Photo */}
                          <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] italic">Action Photo (No Background)</label>
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-0.5 bg-brand-accent/10 border border-brand-accent/20 rounded-md">
                                    <span className="text-[8px] font-black text-brand-accent uppercase tracking-widest italic">PRO TIP</span>
                                  </div>
                                </div>
                              </div>
                              <div className="relative group cursor-pointer mx-auto w-full h-40" onClick={() => scoutPhotoInputRef.current?.click()}>
                                  <div className="absolute -inset-2 bg-gradient-to-br from-brand-primary to-brand-accent rounded-[2rem] opacity-10 group-hover:opacity-20 transition-opacity blur-xl"></div>
                                  <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden border-2 border-white/10 group-hover:border-brand-accent/40 z-10 bg-white/5 flex flex-col items-center justify-center transition-all duration-500">
                                      {scoutPreviewUrl || editingPlayer.scoutPhoto ? (
                                          <div className="relative w-full h-full p-4">
                                            <img src={scoutPreviewUrl || editingPlayer.scoutPhoto} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-brand-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Camera className="text-brand-accent" size={24} />
                                            </div>
                                          </div>
                                      ) : (
                                          <div className="flex flex-col items-center justify-center gap-3">
                                              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-brand-accent group-hover:bg-brand-accent/10 transition-all">
                                                <Camera size={24} />
                                              </div>
                                              <div className="text-center">
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">No Profile Photo</span>
                                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1 block">Click to upload action shot</span>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                                  <input type="file" ref={scoutPhotoInputRef} className="hidden" accept="image/*" onChange={handleScoutPhotoChange} />
                              </div>
                              <p className="text-[9px] font-medium text-white/30 italic text-center px-4 leading-relaxed">
                                Use transparent PNGs or cutouts for the best results in the Scout Report export.
                              </p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                          {[
                            { label: 'MEMBER ID (UID)', val: editingPlayer.memberId, key: 'memberId', type: 'text', readOnly: true },
                            { label: 'PLAYER NAME', val: editingPlayer.fullName, key: 'fullName', type: 'text', readOnly: false },
                            { label: 'TRAINING BATCH', val: editingPlayer.batch, key: 'batch', type: 'select', opts: batches, readOnly: false },
                            { label: 'TRAINING VENUE', val: editingPlayer.venue, key: 'venue', type: 'select', opts: venues, readOnly: false },
                            { label: 'PLAYER POSITION', val: editingPlayer.position, key: 'position', type: 'select', opts: ['Forward','Midfielder','Defender','Goalkeeper'], readOnly: false },
                            { label: 'CONTACT NUMBER', val: editingPlayer.contactNumber, key: 'contactNumber', type: 'text', readOnly: false },
                            { label: 'EMAIL ADDRESS', val: editingPlayer.email || '', key: 'email', type: 'email', readOnly: false },
                            { label: 'DATE OF BIRTH', val: editingPlayer.dateOfBirth, key: 'dateOfBirth', type: 'date', readOnly: false },
                            { label: 'PRIMARY GUARDIAN', val: editingPlayer.parentName, key: 'parentName', type: 'text', readOnly: false }
                          ].map((field: any, idx) => (
                            <div key={idx} className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] italic ml-1">{field.label}</label>
                                {field.type === 'select' ? (
                                  <div className="relative group">
                                    <select 
                                      className={getSelectClass()}
                                      value={field.val}
                                      onChange={e => setEditingPlayer({...editingPlayer, [field.key]: e.target.value})}
                                    >
                                      <option value="" className="bg-brand-950">UNASSIGNED</option>
                                      {field.opts.map((opt:any) => <option key={typeof opt === 'string' ? opt : opt.id} value={typeof opt === 'string' ? opt : opt.name} className="bg-brand-950">{typeof opt === 'string' ? opt : opt.name}</option>)}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 group-hover:text-brand-accent transition-colors">
                                        <ChevronRight className="rotate-90" size={16} />
                                    </div>
                                  </div>
                                ) : (
                                  <input 
                                    type={field.type}
                                    readOnly={field.readOnly}
                                    placeholder={`ENTER ${field.label.split('(')[0].trim()}`}
                                    className={`${getInputClass()} ${field.readOnly ? 'opacity-40 cursor-not-allowed bg-transparent' : ''}`}
                                    value={field.val}
                                    onChange={e => !field.readOnly && setEditingPlayer({...editingPlayer, [field.key]: e.target.value})}
                                  />
                                )}
                            </div>
                          ))}
                          <div className="space-y-3 md:col-span-2">
                              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] italic ml-1">RESIDENTIAL ADDRESS</label>
                              <textarea 
                                className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl text-[13px] font-black text-white italic outline-none focus:border-brand-accent/40 focus:bg-white/10 transition-all min-h-[100px] uppercase tracking-widest placeholder:text-white/20" 
                                placeholder="ENTER FULL ADDRESS DETAILS"
                                value={editingPlayer.address || ''} 
                                onChange={e => setEditingPlayer({...editingPlayer, address: e.target.value})} 
                              />
                          </div>
                      </div>
                  </form>
                  
                  <div className="p-6 sm:p-8 md:p-10 border-t border-white/10 bg-white/5 shrink-0">
                      <button onClick={savePlayerChanges} className="w-full py-6 bg-gradient-to-r from-brand-accent to-green-400 text-brand-950 font-black rounded-2xl uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(195,246,41,0.2)] hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(195,246,41,0.3)] active:scale-[0.98] transition-all duration-300 text-xs italic">SAVE PLAYER DETAILS</button>
                  </div>
              </div>
          </div>
      )}

      {editingCoach && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
               <div className="absolute inset-0 bg-[#050714]/80 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => setEditingCoach(null)}></div>
               <div className="w-full max-w-[95vw] sm:max-w-2xl glass-card rounded-[1.5rem] sm:rounded-[3rem] border border-white/20 shadow-[0_40px_100px_rgba(13,27,138,0.5)] overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-in zoom-in slide-in-from-bottom-5 duration-500">
                  <div className="green-light-bar" />
                  <div className="p-8 md:p-10 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl flex items-center justify-center text-brand-accent shadow-glow">
                           <Shield size={28} />
                        </div>
                        <div>
                          <h3 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter leading-none">COACH <span className="premium-gradient-text">PROFILE</span></h3>
                          <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.4em] mt-2 italic">OFFICIAL ACADEMY CREDENTIALS</p>
                        </div>
                      </div>
                      <button onClick={() => setEditingCoach(null)} className="w-14 h-14 bg-white/10 rounded-2xl text-white/60 hover:text-brand-accent hover:bg-brand-accent/10 flex items-center justify-center border border-white/10 hover:border-brand-accent/20 transition-all duration-300 group">
                          <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                      </button>
                  </div>

                  <form onSubmit={saveCoachChanges} className="p-6 sm:p-8 md:p-12 space-y-8 md:space-y-12 overflow-y-auto custom-scrollbar text-left flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] italic ml-1">LOGIN IDENTIFIER</label>
                           <input required className={getInputClass()} value={editingCoach.username} onChange={e => setEditingCoach({...editingCoach, username: e.target.value})} />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-red-500/50 uppercase tracking-[0.25em] italic ml-1">PASSWORD</label>
                           <input required className="w-full p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-white font-mono text-xs outline-none focus:border-red-500/40 transition-all" value={editingCoach.password} onChange={e => setEditingCoach({...editingCoach, password: e.target.value})} />
                        </div>
                      </div>

                      <div className="space-y-12">
                        <div className="space-y-6">
                           <div className="flex items-center justify-between">
                              <label className="text-[11px] font-black text-white/80 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                  <MapPin size={18} className="text-brand-accent" /> VENUE ASSIGNMENTS
                              </label>
                              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.1em]">{editingCoach.assignedVenues?.length || 0} ACTIVE</span>
                           </div>
                           <div className="flex flex-wrap gap-3">
                              {venues.map(v => (
                                <button key={v.id} type="button" onClick={() => toggleCoachAssignment('venue', v.name)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic border-2 transition-all duration-300 ${editingCoach.assignedVenues?.includes(v.name) ? 'bg-brand-accent text-brand-950 border-brand-accent shadow-[0_15px_30px_rgba(195,246,41,0.2)] scale-[1.05]' : 'bg-white/10 text-white/40 border-white/10 hover:border-white/20'}`}>{v.name}</button>
                              ))}
                           </div>
                        </div>

                        <div className="space-y-6">
                           <div className="flex items-center justify-between">
                              <label className="text-[11px] font-black text-white/80 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                  <Layers size={18} className="text-brand-accent" /> BATCH ASSIGNMENTS
                              </label>
                              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.1em]">{editingCoach.assignedBatches?.length || 0} ACTIVE</span>
                           </div>
                           <div className="flex flex-wrap gap-3">
                              {batches.map(b => (
                                <button key={b.id} type="button" onClick={() => toggleCoachAssignment('batch', b.name)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic border-2 transition-all duration-300 ${editingCoach.assignedBatches?.includes(b.name) ? 'bg-brand-primary text-white border-brand-primary shadow-[0_15px_30px_rgba(59,130,246,0.2)] scale-[1.05]' : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}>{b.name}</button>
                              ))}
                           </div>
                        </div>
                      </div>
                  </form>

                  <div className="p-6 sm:p-8 md:p-10 border-t border-white/10 bg-white/5 shrink-0">
                    <button onClick={saveCoachChanges} className="w-full py-6 bg-gradient-to-r from-brand-accent to-green-400 text-brand-950 font-black rounded-2xl uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(195,246,41,0.2)] hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(195,246,41,0.3)] active:scale-[0.98] transition-all duration-300 text-xs italic">SAVE COACH CREDENTIALS</button>
                  </div>
               </div>
           </div>
      )}

      {viewingPerformance && <PlayerPerformanceModal player={viewingPerformance} onCancel={() => setViewingPerformance(null)} onUpdate={() => loadData()} />}
      
      <ConfirmModal isOpen={deleteModalOpen} title={`DELETE PLAYER`} message={`Are you sure you want to permanently delete this player? This action cannot be undone.`} onConfirm={confirmDelete} onCancel={() => {setDeleteModalOpen(false); setItemToDelete(null);}} requireTypeToConfirm="delete" />
    </div>
  );
};
