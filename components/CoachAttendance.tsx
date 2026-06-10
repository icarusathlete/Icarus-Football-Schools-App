import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch, AttendanceRecord, User, AttendanceStatus } from '../types';
import { 
    Search, MapPin, Layers, Check, X, Calendar, 
    Save, Filter, Users, Zap, Trophy, Lock, RotateCcw, Radio
} from 'lucide-react';
import { PageHeader } from './ui/PageHeader';

export const CoachAttendance: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus | 'none'>>({});
  const [motmId, setMotmId] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    const user = StorageService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      const allVenues = StorageService.getVenues();
      const isAdmin = user.role === 'admin';
      
      const assignedVenues = isAdmin ? allVenues : allVenues.filter(v => (user.assignedVenues || []).includes(v.name));
      setVenues(assignedVenues);
      if (assignedVenues.length > 0) {
        const defaultVenue = assignedVenues.find(v => v.name.toLowerCase() === 'gaur city') || assignedVenues[0];
        setSelectedVenue(defaultVenue.name);
      }

      const allBatches = StorageService.getBatches();
      const assignedBatches = isAdmin ? allBatches : allBatches.filter(b => (user.assignedBatches || []).includes(b.name));
      setBatches(assignedBatches);
      if (assignedBatches.length > 0) {
        const defaultBatch = assignedBatches.find(b => b.name.toLowerCase() === '6-7 pm') || assignedBatches[0];
        setSelectedBatch(defaultBatch.name);
      }
    }
  }, []);

  const loadSessionData = () => {
    if (selectedVenue && selectedBatch) {
      const allPlayers = StorageService.getPlayers();
      const filtered = allPlayers.filter(p => p.venue === selectedVenue && p.batch === selectedBatch);
      setPlayers(filtered);
      
      const records = StorageService.getAttendance();
      const dayRecords = records.filter(r => r.date === selectedDate && r.venue === selectedVenue && r.batch === selectedBatch);
      
      const initialAttendance: Record<string, AttendanceStatus | 'none'> = {};
      filtered.forEach(p => {
        const record = dayRecords.find(r => r.playerId === p.id);
        let status: AttendanceStatus | 'none' = 'none';
        if (record) {
            const s = String(record.status).toUpperCase();
            if (s === 'PRESENT') status = AttendanceStatus.PRESENT;
            else if (s === 'ABSENT') status = AttendanceStatus.ABSENT;
        }
        initialAttendance[p.id] = status;
      });
      setAttendance(initialAttendance);

      const motm = StorageService.getMOTM(selectedDate, selectedVenue, selectedBatch);
      setMotmId(motm?.playerId || null);
      
      const finalized = StorageService.isRollcallFinalized(selectedDate, selectedVenue, selectedBatch);
      setIsFinalized(finalized);
    }
  };

  // Load session data when filters change (date/venue/batch).
  // We intentionally do NOT subscribe to 'academy_data_update' here because
  // that event fires on every storage write (including MOTM saves) and would
  // reset the in-memory attendance state, wiping unsaved coaching work.
  useEffect(() => {
    loadSessionData();
  }, [selectedDate, selectedVenue, selectedBatch]);

  const toggleAttendance = (playerId: string, status: AttendanceStatus) => {
    const newStatus = attendance[playerId] === status ? 'none' : status;
    
    setAttendance(prev => ({
      ...prev,
      [playerId]: newStatus
    }));

    // If status is no longer PRESENT, they cannot be MOTM
    if (newStatus !== AttendanceStatus.PRESENT && motmId === playerId) {
        setMotmId(null);
        StorageService.setMOTM(null, selectedDate, selectedVenue, selectedBatch)
            .catch(err => console.error('Failed to clear MOTM:', err));
    }
    
    setSaveStatus('idle');
  };

  const toggleMOTM = (playerId: string) => {
    if (isFinalized) return;
    
    // Only PRESENT players can be nominated
    if (attendance[playerId] !== AttendanceStatus.PRESENT) {
        alert("Only players marked as Present can be nominated for Star of the Match.");
        return;
    }

    const newMotmId = motmId === playerId ? null : playerId;
    // Update local state immediately — no await, no reload
    setMotmId(newMotmId);
    // Persist in the background without blocking or resetting state
    if (newMotmId) {
      StorageService.setMOTM(newMotmId, selectedDate, selectedVenue, selectedBatch)
        .catch(err => console.error('Failed to save MOTM:', err));
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm("Finalize this session? This will lock attendance and MOTM selection.")) return;
    setIsFinalizing(true);
    try {
        await StorageService.finalizeRollcall(selectedDate, selectedVenue, selectedBatch);
        setIsFinalized(true);
    } catch (error) {
        console.error("Finalization failed", error);
    } finally {
        setIsFinalizing(false);
    }
  };

  const handleUnfinalize = async () => {
    if (currentUser?.role !== 'admin') {
        alert("Only administrators can unfinalize sessions.");
        return;
    }
    if (!window.confirm("Admin: Unfinalize this session?")) return;
    try {
        await StorageService.unfinalizeRollcall(selectedDate, selectedVenue, selectedBatch);
        setIsFinalized(false);
    } catch (error) {
        console.error("Unfinalization failed", error);
    }
  };

  const handleSave = async () => {
    if (isFinalized) return;
    setIsSaving(true);
    try {
      const recordsToSave: AttendanceRecord[] = players
        .filter(p => attendance[p.id] !== 'none')
        .map(p => ({
          id: `${p.id}-${selectedDate}-${selectedVenue.replace(/\s+/g, '_')}-${selectedBatch.replace(/\s+/g, '_')}`,
          playerId: p.id,
          playerName: p.fullName,
          date: selectedDate,
          status: attendance[p.id] as AttendanceStatus,
          venue: selectedVenue,
          batch: selectedBatch,
          markedBy: currentUser?.username || 'unknown',
          timestamp: Date.now()
        }));
      
      await StorageService.saveAttendanceBatch(recordsToSave);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPlayers = players.filter(p => 
    (p.memberId?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getAgeCategory = (dob: string) => {
    const age = calculateAge(dob);
    if (age <= 8) return 'U-8';
    if (age <= 10) return 'U-10';
    if (age <= 12) return 'U-12';
    return 'OTHERS';
  };

  const groupedPlayers = filteredPlayers.reduce((acc, player) => {
    const category = getAgeCategory(player.dateOfBirth);
    if (!acc[category]) acc[category] = [];
    acc[category].push(player);
    return acc;
  }, {} as Record<string, Player[]>);

  const categoryOrder = ['U-12', 'U-10', 'U-8', 'OTHERS'];
  const sortedCategories = Object.keys(groupedPlayers).sort((a, b) => 
    categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  const stats = {
    total: players.length,
    present: Object.values(attendance).filter(s => s === AttendanceStatus.PRESENT).length,
    absent: Object.values(attendance).filter(s => s === AttendanceStatus.ABSENT).length,
    pending: players.length - Object.values(attendance).filter(s => s !== 'none').length
  };

  const presentPct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="space-y-8 pb-32">

      {/* ═══════════════════════════════
          HERO HEADER
      ═══════════════════════════════ */}
      {/* ═══════════════════════════════
          HERO HEADER
      ═══════════════════════════════ */}
      <PageHeader 
        title="SESSION ROLLCALL" 
        extra={
          <div className="grid grid-cols-2 sm:flex gap-4 w-full lg:w-auto">
            <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 text-center min-w-[110px] transition-all hover:bg-white/10 hover:border-brand-500/30 group/stat">
              <p className="text-[9px] font-black text-brand-300 uppercase tracking-widest mb-2 opacity-60">Present</p>
              <p className="text-3xl font-black text-emerald-400 italic leading-none group-hover:scale-110 transition-transform">{stats.present}</p>
              <p className="text-[8px] text-white/30 font-black mt-2">PRESENT</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 text-center min-w-[110px] transition-all hover:bg-white/10 hover:border-red-500/30 group/stat">
              <p className="text-[9px] font-black text-brand-300 uppercase tracking-widest mb-2 opacity-60">Absent</p>
              <p className="text-3xl font-black text-red-400 italic leading-none group-hover:scale-110 transition-transform">{stats.absent}</p>
              <p className="text-[8px] text-white/30 font-black mt-2">ABSENT</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 text-center min-w-[110px] transition-all hover:bg-white/10 hover:border-brand-400/30 group/stat relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-brand-500/10 blur-xl" />
              <p className="text-[9px] font-black text-brand-300 uppercase tracking-widest mb-2 opacity-60">Attendance Rate</p>
              <div className="flex items-baseline justify-center gap-0.5">
                  <p className="text-3xl font-black text-brand-400 italic leading-none group-hover:scale-110 transition-transform">{presentPct}</p>
                  <span className="text-sm font-black text-brand-300/40 italic">%</span>
              </div>
              <p className="text-[8px] text-white/30 font-black mt-2">RATE</p>
            </div>

            {isFinalized && (
              <div className="bg-emerald-500/20 backdrop-blur-xl p-5 rounded-2xl border border-emerald-500/30 flex flex-col items-center justify-center gap-1 min-w-[110px]">
                <Lock size={18} className="text-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">LOCKED</span>
              </div>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest -mt-4 mb-8">
        <span className="flex items-center gap-2 text-brand-400 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
          <Radio size={10} className="animate-pulse text-brand-500"/> {selectedDate}
        </span>
        {selectedVenue && (
          <span className="flex items-center gap-2 text-brand-400 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <MapPin size={10} className="text-brand-500"/> {selectedVenue}
          </span>
        )}
        {selectedBatch && (
          <span className="flex items-center gap-2 text-brand-400 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <Layers size={10} className="text-brand-500"/> {selectedBatch}
          </span>
        )}
      </div>

      {/* ═══════════════════════════════
          SESSION CONFIGURATION
      ═══════════════════════════════ */}
      <div className="flex items-center gap-3 px-4">
        <Filter size={16} className="text-brand-400" />
        <h2 className="text-[10px] font-black text-white/40 uppercase italic tracking-[0.3em]">Session Details</h2>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="glass-card p-6 md:p-8 flex flex-col xl:flex-row gap-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-brand-primary opacity-[0.02] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row gap-4 flex-1 relative z-10">
          {/* Date */}
          <div className="relative group flex-1">
            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 group-hover:text-brand-400 transition-colors pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none text-white font-black text-[11px] uppercase tracking-widest cursor-pointer hover:border-brand-400/30 transition-all focus:bg-white/10 focus:ring-4 focus:ring-brand-400/5 hover:bg-white/10"
            />
          </div>

          {/* Venue */}
          <div className="relative group flex-1">
            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 group-hover:text-brand-400 transition-colors z-10 pointer-events-none" />
            <select
              value={selectedVenue}
              onChange={e => setSelectedVenue(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none text-white font-black text-[11px] uppercase tracking-widest appearance-none cursor-pointer hover:border-brand-400/30 transition-all focus:bg-brand-bg focus:ring-4 focus:ring-brand-400/5 hover:bg-white/10"
            >
              {venues.map(v => <option key={v.id} value={v.name} className="bg-brand-bg">{v.name}</option>)}
            </select>
          </div>

          {/* Batch */}
          <div className="relative group flex-1">
            <Layers className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 group-hover:text-brand-400 transition-colors z-10 pointer-events-none" />
            <select
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none text-white font-black text-[11px] uppercase tracking-widest appearance-none cursor-pointer hover:border-brand-400/30 transition-all focus:bg-brand-bg focus:ring-4 focus:ring-brand-400/5 hover:bg-white/10"
            >
              {batches.map(b => <option key={b.id} value={b.name} className="bg-brand-bg">{b.name}</option>)}
            </select>
          </div>

          {/* Search */}
          <div className="relative group flex-[1.5]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-brand-400 transition-colors w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search athlete list..."
              className="w-full pl-12 pr-5 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none text-white placeholder:text-white/10 font-bold text-[11px] uppercase tracking-widest focus:bg-white/10 focus:border-brand-400/40 focus:ring-4 focus:ring-brand-400/5 transition-all hover:bg-white/10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 shrink-0 relative z-10">
          {!isFinalized ? (
            <button
              onClick={handleFinalize}
              disabled={isFinalizing || stats.pending > 0}
              className="px-6 py-4 bg-[#CCFF00] text-brand-950 rounded-2xl flex items-center gap-3 hover:scale-105 transition-all active:scale-95 shadow-xl shadow-[#CCFF00]/20 disabled:opacity-30 disabled:cursor-not-allowed group/final"
            >
              {isFinalizing ? <Zap className="animate-spin" size={16} /> : <Check size={16} strokeWidth={3} className="group-hover/final:rotate-12 transition-transform" />}
              <span className="text-[10px] font-black uppercase tracking-[0.2em] italic whitespace-nowrap">Finalize Session</span>
            </button>
          ) : (
            currentUser?.role === 'admin' && (
              <button
                onClick={handleUnfinalize}
                className="px-6 py-4 bg-white/10 border border-white/10 text-white/40 rounded-2xl flex items-center gap-3 hover:bg-white/20 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                <RotateCcw size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] italic whitespace-nowrap">Unlock Attendance</span>
              </button>
            )
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || isFinalized}
            className={`px-8 py-4 rounded-2xl flex items-center gap-3 transition-all active:scale-95 shadow-xl relative overflow-hidden group ${
              isFinalized ? 'bg-white/5 text-white/10 cursor-not-allowed border border-white/10' :
              saveStatus === 'success' ? 'bg-[#CCFF00] text-brand-950 shadow-[#CCFF00]/20' :
              saveStatus === 'error' ? 'bg-red-500 text-white' :
              'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-brand-400/40 hover:-translate-y-0.5 disabled:opacity-40'
            }`}
          >
            {/* Shimmer Effect */}
            {!isSaving && !isFinalized && saveStatus === 'idle' && (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
            )}
            
            {isSaving ? <Zap className="animate-spin" size={16} /> :
             saveStatus === 'success' ? <Check size={16} strokeWidth={3} /> :
             isFinalized ? <Lock size={16} /> :
             <Save size={16} />}
            <span className="text-[10px] font-black uppercase tracking-[0.3em] italic relative z-10 whitespace-nowrap">
              {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : isFinalized ? 'Attendance Locked' : 'Save Attendance'}
            </span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════
          ROSTER
      ═══════════════════════════════ */}
      <div className="flex items-center gap-3 px-4">
        <Users size={16} className="text-brand-400" />
        <h2 className="text-[10px] font-black text-white/40 uppercase italic tracking-[0.3em]">Active Roster</h2>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {players.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center p-12 text-center space-y-8 glass-card border-dashed border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-brand-primary opacity-[0.02] pointer-events-none" />
          <div className="w-24 h-24 bg-white/5 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] flex items-center justify-center text-white/10 border border-white/10 relative group/icon">
             <div className="absolute inset-0 bg-brand-400/5 blur-2xl group-hover/icon:blur-3xl transition-all" />
            <Users size={48} className="relative z-10" />
          </div>
          <div className="space-y-4 relative z-10">
            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">NO PLAYERS <br/><span className="text-brand-400">FOUND</span></h3>
            <p className="text-white/30 text-[10px] max-w-sm font-black uppercase tracking-[0.4em] italic leading-relaxed mx-auto">
              No players are assigned to <b className="text-white">{selectedVenue}</b> in batch <b className="text-white">{selectedBatch}</b>. <br/>Please check your settings.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {sortedCategories.map(category => (
            <div key={category} className="space-y-6">

              {/* Category Header */}
              <div className="flex items-center gap-4 px-2">
                <div className="bg-[#CCFF00] text-brand-950 px-6 py-2.5 rounded-2xl text-[10px] font-black italic tracking-[0.25em] flex items-center gap-3 shadow-xl shadow-[#CCFF00]/10">
                  <span className="opacity-40">//</span> {category}
                  <span className="text-brand-950/60 ml-1">[{groupedPlayers[category].length}]</span>
                </div>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              {/* Player Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
                {groupedPlayers[category].map((player) => {
                  const isPresent = attendance[player.id] === AttendanceStatus.PRESENT;
                  const isAbsent = attendance[player.id] === AttendanceStatus.ABSENT;
                  const isMotm = motmId === player.id;

                  return (
                    <div
                      key={player.id}
                      className={`glass-card p-6 !rounded-[2.5rem] relative overflow-hidden group transition-all duration-500 hover:-translate-y-1.5 
                        ${isPresent 
                          ? '!border-emerald-500/40 shadow-[0_10px_30px_rgba(16,185,129,0.1)] bg-emerald-500/[0.02]' 
                          : isAbsent 
                          ? '!border-red-500/40 shadow-[0_10px_30px_rgba(239,68,68,0.1)] bg-red-500/[0.02]' 
                          : 'border-white/10 hover:!border-white/20'
                        }`}
                    >
                      {/* Decorative elements */}
                      {isPresent && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[40px] pointer-events-none" />}
                      {isAbsent && <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-[40px] pointer-events-none" />}
                      
                      {/* LED Status Indicator */}
                      <div className="absolute top-5 right-5 z-20">
                          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 
                            ${isPresent ? 'bg-emerald-500 shadow-[0_0_10px_3px_rgba(16,185,129,0.5)] animate-pulse' : 
                              isAbsent ? 'bg-red-500 shadow-[0_0_10px_3px_rgba(239,68,68,0.5)] animate-pulse' : 
                              'bg-white/10 ring-1 ring-white/10 shadow-inner'}`} 
                          />
                      </div>

                      <div className="flex flex-col items-center text-center relative z-10">
                        {/* Avatar Section */}
                        <div className="relative mb-4 group/avatar">
                          <div className={`absolute -inset-1 rounded-2xl opacity-10 blur-sm group-hover/avatar:opacity-30 transition-opacity
                            ${isPresent ? 'bg-emerald-500' : isAbsent ? 'bg-red-500' : 'bg-brand-400'}`} />
                          
                          <img 
                            src={player.photoUrl} 
                            className={`w-24 h-24 rounded-2xl bg-brand-bg object-cover border-2 transition-all duration-500 relative z-10
                              ${isPresent ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 
                                isAbsent ? 'border-red-500 shadow-lg shadow-red-500/20' : 
                                'border-white/10 grayscale-[100%] opacity-40 group-hover:grayscale-0 group-hover:opacity-100'}`} 
                          />
                          
                          {/* Award Badges */}
                          {isMotm && (
                            <div className="absolute -top-3 -left-3 bg-amber-500 text-brand-950 w-8 h-8 rounded-xl flex items-center justify-center shadow-xl shadow-amber-500/20 ring-4 ring-brand-bg z-20 rotate-[-12deg]">
                              <Trophy size={14} fill="currentColor" />
                            </div>
                          )}
                          
                          {/* Mini status indicator */}
                          <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-xl border-2 ring-4 ring-brand-bg z-20 transition-all scale-0 group-hover:scale-100 duration-300
                            ${isPresent ? 'bg-emerald-500 text-brand-950 border-emerald-400 scale-100' : 
                              isAbsent ? 'bg-red-500 text-white border-red-400 scale-100' : 
                              'bg-white/20 text-white border-white/40'}`}>
                            {isPresent ? <Check size={12} strokeWidth={4} /> : isAbsent ? <X size={12} strokeWidth={4} /> : <Zap size={12} />}
                          </div>
                        </div>

                        <div className="space-y-1 mb-6 px-1">
                          <h3 className="text-sm font-black text-white uppercase italic tracking-tight leading-none truncate w-full">
                            {player.fullName}
                          </h3>
                          <div className="flex items-center justify-center gap-2">
                             <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] italic">#{player.memberId}</span>
                             <span className="w-1 h-1 bg-white/10 rounded-full" />
                             <span className="text-[9px] font-black text-brand-400 uppercase italic tracking-widest">{player.position || 'RESERVE'}</span>
                          </div>
                        </div>

                        {/* Attendance Switch & Star of the Match */}
                        <div className="flex flex-col gap-3 w-full">
                          {/* Attendance Switch Row */}
                          <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/10 rounded-[1.25rem] w-full">
                            <div className="flex flex-col items-start text-left">
                              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Attendance</span>
                              <span className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                                isPresent ? 'text-emerald-400' :
                                isAbsent ? 'text-red-400' :
                                'text-white/30'
                              }`}>
                                {isPresent ? 'Present' : isAbsent ? 'Absent' : 'Unmarked'}
                              </span>
                            </div>
                            
                            {/* Switch Container */}
                            <button
                              onClick={() => {
                                if (isFinalized) return;
                                if (isPresent) {
                                  toggleAttendance(player.id, AttendanceStatus.ABSENT);
                                } else if (isAbsent) {
                                  toggleAttendance(player.id, AttendanceStatus.ABSENT);
                                } else {
                                  toggleAttendance(player.id, AttendanceStatus.PRESENT);
                                }
                              }}
                              disabled={isFinalized}
                              className={`w-14 h-7 rounded-full p-0.5 border transition-all duration-300 relative ${
                                isPresent ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                isAbsent ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                'bg-white/5 border-white/10 text-white/20'
                              } ${isFinalized ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                            >
                              {/* Switch Thumb */}
                              <div className={`w-5.5 h-5.5 rounded-full transition-all duration-300 flex items-center justify-center absolute top-0.5 shadow-md ${
                                isPresent 
                                  ? 'left-[calc(100%-24px)] bg-emerald-500 text-brand-950' 
                                  : isAbsent 
                                  ? 'left-0.5 bg-red-500 text-white' 
                                  : 'left-[calc(50%-11px)] bg-white/25 text-white/40'
                              }`}>
                                {isPresent ? <Check size={10} strokeWidth={4} /> :
                                 isAbsent ? <X size={10} strokeWidth={4} /> :
                                 <div className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                              </div>
                            </button>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); toggleMOTM(player.id); }}
                            disabled={isFinalized || !isPresent}
                            className={`py-3 rounded-xl border transition-all duration-300 flex items-center justify-center gap-3 w-full
                              ${isMotm 
                                ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                                : 'bg-white/5 border-white/10 text-white/10 hover:text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30'
                              } ${isFinalized || !isPresent ? 'opacity-20 cursor-not-allowed' : 'active:scale-95'}`}
                          >
                            <Trophy size={14} fill={isMotm ? "currentColor" : "none"} />
                            <span className="text-[9px] font-black tracking-[0.2em] uppercase italic">Star of the Match</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
