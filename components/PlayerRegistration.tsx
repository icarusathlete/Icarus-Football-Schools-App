import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from './ui/PageHeader';
import {
  Upload, Save, X, User, Phone, Shield, Camera, Check, RefreshCw,
  AlertCircle, Calendar, Briefcase, Trash2, MapPin, Settings, Map,
  Layers, Plus, Edit2, Key, UserCheck, FileText, Zap, UserPlus,
  Command, Activity, Radio, ChevronDown, ChevronRight, Award,
  ArrowRight
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch } from '../types';
import { compressImage, processAndSafeUploadImage } from '../utils/imageUtils';
import { ConfirmModal } from './ConfirmModal';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  accent: string;
  subtitle: string;
  iconGlow?: string;
  accentClass?: string;
}> = ({ icon, title, accent, subtitle, iconGlow = 'shadow-[#C3F629]/20', accentClass = 'text-[#C3F629]' }) => (
  <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-10 pb-6 sm:pb-8 border-b border-white/10 relative">
    <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 text-white shadow-xl ${iconGlow} relative z-10 border border-white/10 flex items-center justify-center`}>
      {React.cloneElement(icon as React.ReactElement<any>, { 
        size: typeof window !== 'undefined' && window.innerWidth < 640 ? 16 : 18, 
        className: (icon as any).props?.className || '' 
      })}
      <div className="absolute inset-0 bg-white/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-[10px] sm:text-sm font-black text-white uppercase tracking-widest italic leading-tight font-display truncate">
        {title} <span className={accentClass}>{accent}</span>
      </h3>
      <p className="text-[8px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.25em] mt-1 sm:mt-1.5 italic opacity-80 truncate">{subtitle}</p>
    </div>
    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] scale-110 sm:scale-150 pointer-events-none text-white">
      {icon}
    </div>
  </div>
);

const FieldLabel: React.FC<{ icon?: React.ReactNode; label: string; required?: boolean }> = ({
  icon, label, required
}) => (
  <div className="flex items-center gap-2 mb-2.5">
    {icon && <span className="text-white/20">{icon}</span>}
    <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.15em] italic">
      {label}
      {required && <span className="text-[#C3F629] ml-2">*</span>}
    </label>
  </div>
);

const INITIAL_COACH_FORM = {
  username: '',
  fullName: '',
  contactNumber: '',
  email: '',
  dateOfBirth: '',
  address: '',
  password: '',
  employeeNumber: '',
  photoUrl: '',
  role: 'coach' as const,
  assignedVenues: [] as string[],
  assignedBatches: [] as string[]
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

export const PlayerRegistration: React.FC = () => {
  const [mode, setMode] = useState<'player' | 'coach'>('player');
  const [nextId, setNextId] = useState('');

  // Player Form State
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    parentName: '',
    contactNumber: '',
    address: '',
    position: 'POSITION' as Player['position'],
    photoUrl: '',
    venue: '',
    batch: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Coach Form State
  const [coachForm, setCoachForm] = useState({
    username: '',
    fullName: '',
    contactNumber: '',
    email: '',
    dateOfBirth: '',
    address: '',
    password: '',
    employeeNumber: '',
    photoUrl: '',
    role: 'coach' as const,
    assignedVenues: [] as string[],
    assignedBatches: [] as string[]
  });
  const [coachFile, setCoachFile] = useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coachPreviewUrl, setCoachPreviewUrl] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configTab, setConfigTab] = useState<'venues' | 'batches'>('venues');
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: string; name: string } | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'player' | 'venue' | 'batch'; id: string; name: string
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadAcademyConfig();
    const handleDataUpdate = () => { loadAcademyConfig(); refreshData(); };
    window.addEventListener('academy_data_update', handleDataUpdate);
    return () => window.removeEventListener('academy_data_update', handleDataUpdate);
  }, []);

  const loadAcademyConfig = () => {
    try {
      const v = StorageService.getVenues() || [];
      const b = StorageService.getBatches() || [];
      setVenues(Array.isArray(v) ? v : []);
      setBatches(Array.isArray(b) ? b : []);
    } catch (error) {
      console.error("Failed to load academy config:", error);
      setVenues([]);
      setBatches([]);
    }
  };

  const refreshData = async () => {
    try {
      const allPlayers = StorageService.getPlayers() || [];
      setPlayers(Array.isArray(allPlayers) ? allPlayers : []);
      
      const v = StorageService.getVenues() || [];
      const b = StorageService.getBatches() || [];
      setVenues(Array.isArray(v) ? v : []);
      setBatches(Array.isArray(b) ? b : []);

      updateNextIdPreview(Array.isArray(allPlayers) ? allPlayers : []);

      setFormData(prev => ({
        ...prev,
        venue: prev.venue || (v.length > 0 ? v[0].name : ''),
        batch: prev.batch || (b.length > 0 ? b[0].name : '')
      }));
    } catch (error) {
      console.error("Refresh data failed:", error);
    }
  };

  const updateNextIdPreview = (currentPlayers: Player[]) => {
    if (!Array.isArray(currentPlayers) || currentPlayers.length === 0) { 
      setNextId('ICR-0001'); 
      return; 
    }
    const ids = currentPlayers
      .map(p => { 
        const m = p.memberId?.match(/ICR-(\d+)/); 
        return m ? parseInt(m[1], 10) : 0; 
      })
      .filter(id => !isNaN(id));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    setNextId(`ICR-${(maxId + 1).toString().padStart(4, '0')}`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const tempUrl = URL.createObjectURL(file);
        setPreviewUrl(tempUrl);
        setSelectedFile(file);
      } catch (err) {
        console.error("Error processing image:", err);
      }
    }
  };

  const handleCoachFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const tempUrl = URL.createObjectURL(file);
        setCoachPreviewUrl(tempUrl);
        setCoachFile(file);
      } catch (err) {
        console.error("Error processing image:", err);
      }
    }
  };

  const validatePlayer = () => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim()) e.fullName = 'Required';
    if (!formData.dateOfBirth) e.dateOfBirth = 'Required';
    if (!formData.parentName.trim()) e.parentName = 'Required';
    if (!formData.contactNumber.trim()) e.contactNumber = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateCoach = () => {
    const e: Record<string, string> = {};
    if (!coachForm.fullName.trim()) e.fullName = 'Required';
    if (!coachForm.username.trim()) e.username = 'Required';
    if (!coachForm.employeeNumber.trim()) e.employeeNumber = 'Required';
    if (!coachForm.password.trim()) e.password = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePlayer()) { setStatus('error'); setStatusMsg('Please fill in all required fields.'); setTimeout(() => setStatus('idle'), 3000); return; }
    setStatus('submitting');
    
    setTimeout(async () => {
      try {
        let finalPhotoUrl = formData.photoUrl;
        
        if (selectedFile) {
          finalPhotoUrl = await processAndSafeUploadImage(
            selectedFile,
            'profile_photos/players',
            800,
            0.7,
            'profile'
          );
        }

        await StorageService.addPlayer({
          ...formData,
          photoUrl: finalPhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName)}&background=0ea5e9&color=fff`
        });
        window.dispatchEvent(new CustomEvent('academy_data_update'));
        setStatus('success');
        setStatusMsg('Athlete registered successfully.');
        setFormData({ fullName: '', dateOfBirth: '', parentName: '', contactNumber: '', address: '', position: 'POSITION', photoUrl: '', venue: venues.length > 0 ? venues[0].name : '', batch: batches.length > 0 ? batches[0].name : '' });
        setPreviewUrl(null);
        setSelectedFile(null);
        refreshData();
      } catch (err) {
        console.error("Registration error:", err);
        setStatus('error');
        setStatusMsg('Failed to save profile. Please try again.');
      }
    }, 800);
  };

  const handleCoachSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCoach()) { setStatus('error'); setStatusMsg('Please fill in all required fields.'); setTimeout(() => setStatus('idle'), 3000); return; }
    setStatus('submitting');
    
    setTimeout(async () => {
      try {
        let finalPhotoUrl = coachForm.photoUrl;

        if (coachFile) {
          finalPhotoUrl = await processAndSafeUploadImage(
            coachFile,
            'profile_photos/coaches',
            800,
            0.7,
            'coach_profile'
          );
        }

        await StorageService.addUser({
          ...coachForm,
          photoUrl: finalPhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(coachForm.fullName)}&background=0ea5e9&color=fff`
        });

        window.dispatchEvent(new CustomEvent('academy_data_update'));
        setStatus('success');
        setStatusMsg('Coach account created successfully.');
        setCoachForm(INITIAL_COACH_FORM);
        setCoachPreviewUrl(null);
        setCoachFile(null);
        refreshData();
      } catch (err: any) {
        console.error("Coach registration error:", err);
        setStatus('error');
        setStatusMsg(err.message || 'Failed to create account.');
      }
    }, 800);
  };

  const handleSecureDelete = (type: 'player' | 'venue' | 'batch', id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'player') await StorageService.deletePlayer(itemToDelete.id);
      else if (itemToDelete.type === 'venue') await StorageService.deleteVenue(itemToDelete.id);
      else if (itemToDelete.type === 'batch') await StorageService.deleteBatch(itemToDelete.id);
      refreshData(); setDeleteModalOpen(false); setItemToDelete(null);
    } catch { alert('An error occurred.'); }
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    if (configTab === 'venues') StorageService.addVenue(newItemName.trim());
    else StorageService.addBatch(newItemName.trim());
    setNewItemName(''); refreshData();
  };

  const handleUpdateItem = () => {
    if (!editingItem || !newItemName.trim()) return;
    if (configTab === 'venues') StorageService.updateVenue(editingItem.id, newItemName.trim());
    else StorageService.updateBatch(editingItem.id, newItemName.trim());
    setEditingItem(null); setNewItemName(''); refreshData();
  };

  const toggleCoachAssignment = (type: 'venue' | 'batch', value: string) => {
    if (type === 'venue') {
      setCoachForm(prev => ({
        ...prev, assignedVenues: prev.assignedVenues.includes(value)
          ? prev.assignedVenues.filter(v => v !== value)
          : [...prev.assignedVenues, value]
      }));
    } else {
      setCoachForm(prev => ({
        ...prev, assignedBatches: prev.assignedBatches.includes(value)
          ? prev.assignedBatches.filter(b => b !== value)
          : [...prev.assignedBatches, value]
      }));
    }
  };

  /* ── Styled Input Helpers ── */
  const inputBase = 'w-full rounded-lg sm:rounded-xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-bold text-white outline-none transition-all duration-300 border backdrop-blur-md';
  const inputNormal = `${inputBase} bg-white/5 border-white/10 placeholder:text-white/20 focus:border-brand-500 focus:bg-white/10 focus:ring-4 focus:ring-brand-500/5 shadow-inner`;
  const inputError = `${inputBase} bg-red-500/10 border-red-500/20 placeholder:text-red-500/30 text-red-400 focus:border-red-500/40 focus:ring-4 focus:ring-red-500/5`;
  const selectBase = `${inputBase} bg-white/5 border-white/10 appearance-none cursor-pointer hover:bg-white/10 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 shadow-inner`;

  const inp = (field: string) => errors[field] ? inputError : inputNormal;
  const sel = (field: string) => errors[field] ? `${inputError} appearance-none cursor-pointer` : selectBase;

  /* ── Positions ── */
  const positions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

  /* ─────────────────────────────────────────────────────────────────────── */
  /*  Render                                                                  */
  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-10 md:p-16 font-['Manrope'] selection:bg-brand-500/20 relative overflow-hidden">
      {/* Subtle Background Accents */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,#ffffff 0,#ffffff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#ffffff 0,#ffffff 1px,transparent 1px,transparent 40px)' }} />

      {/* ─── Success Overlay ────────────────────────────────────────────── */}
      {status === 'success' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
          <div className="relative bg-[#C3F629] p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl flex flex-col items-center text-center max-w-sm w-full">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-brand-950 rounded-full flex items-center justify-center mb-6 sm:mb-8 shadow-inner">
              <Check size={32} className="text-[#C3F629] sm:hidden" />
              <Check size={48} className="text-[#C3F629] hidden sm:block" />
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-brand-950 uppercase tracking-tighter mb-3 sm:mb-4 font-display italic leading-none">Protocol Complete</h2>
            <p className="text-brand-950/70 text-[10px] sm:text-sm font-bold uppercase tracking-widest mb-6 sm:mb-8 leading-relaxed">
              {statusMsg}
            </p>
            <button onClick={() => setStatus('idle')}
              className="w-full py-4 rounded-xl sm:rounded-2xl bg-brand-950 text-[#C3F629] font-black text-[10px] sm:text-[11px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/20 italic">
              Acknowledge & Continue
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-12 relative z-10 animate-fade-in">

        {/* ─── Page Header HUD ────────────────────────────────────────────── */}
        <PageHeader 
          title="ACADEMY ONBOARDING" 
          subtitle="SYSTEM NODE // ONBOARDING // OPERATIONAL DATASET INTAKE"
          extra={
            <>
              <div className="flex gap-2 bg-black/40 p-1.5 sm:p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
                {( [['player', User, 'Athletes'], ['coach', Shield, 'Coaches']] as const).map(([m, Icon, label]) => (
                  <button 
                    key={m} 
                    type="button"
                    onClick={() => { setMode(m as any); setErrors({}); }}
                    className={`flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-all duration-500 italic whitespace-nowrap
                      ${mode === m
                        ? 'bg-brand-accent text-brand-950 shadow-lg shadow-brand-accent/20 border-brand-accent scale-[1.02]'
                        : 'text-white/40 hover:text-brand-accent hover:bg-white/10'}`}
                  >
                    <Icon size={14} className="sm:w-4 sm:h-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {mode === 'player' && (
                  <div className="px-5 sm:px-8 py-2 sm:py-2.5 rounded-xl bg-brand-950 border border-white/10 flex flex-col items-center min-w-[100px] sm:min-w-[120px] shadow-2xl">
                    <p className="text-[7px] sm:text-[8px] font-black text-white/40 uppercase tracking-widest mb-0.5 italic">NEXT ASSIGNMENT</p>
                    <p className="text-sm sm:text-base font-black text-brand-accent italic tracking-tighter leading-none">{nextId}</p>
                  </div>
                )}

                <button onClick={() => setShowConfigModal(true)}
                  className="p-3 sm:p-3.5 rounded-xl bg-white/5 hover:bg-brand-accent hover:text-brand-950 text-white/40 border border-white/10 transition-all duration-300 group shadow-2xl">
                  <Settings size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>
            </>
          }
        />

        {/* ─── Forms ─────────────────────────────────────────────────────── */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          {mode === 'player' ? (
            <form onSubmit={handlePlayerSubmit} className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-4 space-y-6">
                  <div className="glass-card p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-[#C3F629] opacity-40" />
                    <SectionHeader
                      icon={<Camera size={16} className="text-[#C3F629]" />}
                      title="Athlete" accent="Photo"
                      subtitle="Profile identity capture"
                    />
                    <div className="flex flex-col items-center">
                      <div className="relative group/photo mb-6">
                        <div className={`w-32 h-40 sm:w-44 sm:h-52 rounded-2xl sm:rounded-[2rem] overflow-hidden border-2 border-dashed transition-all duration-500 flex items-center justify-center
                          ${previewUrl ? 'border-[#C3F629]/40 shadow-lg shadow-[#C3F629]/5' : 'border-white/10 group-hover/photo:border-white/20'}`}>
                          {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 sm:gap-3 text-white/20 group-hover/photo:text-white/40 transition-colors">
                              <Camera size={32} className="sm:w-10 sm:h-10" strokeWidth={1.5} />
                              <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-center">Upload Profile</span>
                            </div>
                          )}
                        </div>
                        <label className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 cursor-pointer bg-brand-accent text-brand-950 p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl shadow-[0_8px_24px_rgba(195,246,41,0.4)] hover:scale-110 active:scale-95 transition-all z-10">
                          <Upload size={14} className="sm:w-4 sm:h-4" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-8 space-y-6 sm:space-y-10">
                  <div className="glass-card p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-[#C3F629] opacity-40" />
                    <SectionHeader
                      icon={<User size={16} className="text-white" />}
                      title="Personal" accent="Information"
                      subtitle="Core identity details"
                      accentClass="text-white"
                    />
                    <div className="space-y-4 sm:space-y-5">
                      <div>
                        <FieldLabel icon={<User size={11} />} label="Full Name" required />
                        <input type="text" className={inp('fullName')} value={formData.fullName}
                          onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="Athlete's full name" />
                      </div>
                      <div>
                        <FieldLabel icon={<Calendar size={11} />} label="Date of Birth" required />
                        <input type="date" className={inp('dateOfBirth')} value={formData.dateOfBirth}
                          onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 sm:p-10 rounded-3xl sm:rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-[#C3F629] opacity-40" />
                    <FieldLabel icon={<Briefcase size={11} />} label="Player Position" required />
                    <div className="relative">
                      <select
                        className={sel('position')}
                        value={formData.position}
                        onChange={e => setFormData({ ...formData, position: e.target.value as Player['position'] })}
                      >
                        <option value="POSITION" className="bg-brand-950 text-white/40">Select Position</option>
                        {positions.map(p => <option key={p} value={p} className="bg-brand-950 text-white">{p}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-10">
                  <div className="glass-card p-6 sm:p-10 rounded-[2rem] sm:rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-[#C3F629] opacity-40" />
                  <SectionHeader
                    icon={<MapPin className="text-[#C3F629]" />}
                    title="Academy"
                    accent="Deployment"
                    subtitle="Venue & Cluster Assignment"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    <div className="group/input">
                      <FieldLabel icon={<MapPin size={12} />} label="Assigned Venue" required />
                      <div className="relative">
                        <select
                          className={sel('venue')}
                          value={formData.venue}
                          onChange={e => setFormData({ ...formData, venue: e.target.value })}
                        >
                          <option value="" className="bg-brand-950 text-white/40">Select Venue</option>
                          {venues.map(v => <option key={v.id} value={v.name} className="bg-brand-950 text-white">{v.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                      </div>
                    </div>

                    <div className="group/input">
                      <FieldLabel icon={<Layers size={12} />} label="Assigned Batch" required />
                      <div className="relative">
                        <select
                          className={sel('batch')}
                          value={formData.batch}
                          onChange={e => setFormData({ ...formData, batch: e.target.value })}
                        >
                          <option value="" className="bg-brand-950 text-white/40">Select Batch</option>
                          {batches.map(b => <option key={b.id} value={b.name} className="bg-brand-950 text-white">{b.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 sm:p-10 rounded-3xl sm:rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                  <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-orange-500 opacity-40" />
                  <SectionHeader
                    icon={<Phone className="text-orange-400" />}
                    title="Guardian"
                    accent="Protocol"
                    subtitle="Emergency Contact Structure"
                    accentClass="text-orange-400"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    <div className="group/input">
                      <FieldLabel icon={<User size={12} />} label="Primary Guardian" required />
                      <input
                        type="text"
                        className={inp('parentName')}
                        value={formData.parentName}
                        onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                        placeholder="Parent Name"
                      />
                    </div>

                    <div className="group/input">
                      <FieldLabel icon={<Phone size={12} />} label="Contact Number" required />
                      <input
                        type="tel"
                        className={inp('contactNumber')}
                        value={formData.contactNumber}
                        onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                        placeholder="+91"
                      />
                    </div>

                    <div className="group/input col-span-1 md:col-span-2">
                      <FieldLabel icon={<MapPin size={12} />} label="Residential Residence" />
                      <input
                        type="text"
                        className={inp('address')}
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Full Address"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-emerald-500 opacity-40" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Check size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h4 className="text-[11px] sm:text-sm font-black text-white uppercase italic tracking-widest font-display">Enrolment Phase Ready</h4>
                      <p className="text-[8px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5 sm:mt-1 italic">Status: Operational</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full sm:w-auto sm:min-w-[300px] h-14 sm:h-20 bg-[#C3F629] text-brand-950 font-black uppercase italic tracking-[0.15em] sm:tracking-[0.25em] text-[10px] sm:text-sm rounded-xl sm:rounded-[1.5rem] shadow-2xl shadow-[#C3F629]/30 hover:shadow-[#C3F629]/50 hover:scale-[1.02] active:scale-95 transition-all duration-500 flex items-center justify-center gap-3 sm:gap-4 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                    {status === 'submitting' ? (
                      <><RefreshCw size={18} className="sm:w-6 sm:h-6 animate-spin" /> Finalizing Protocol</>
                    ) : (
                      <><Save size={18} className="sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" /> Authenticate & Enroll</>
                    )}
                  </button>
                </div>
              </div>
            </form>

          ) : (
            <form onSubmit={handleCoachSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-4 space-y-6">
                  <div className="glass-card p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-[#C3F629] opacity-40" />
                    <SectionHeader
                      icon={<Camera size={16} />}
                      title="Coach" accent="Protocol"
                      subtitle="Personnel Identity Capture"
                    />
                    <div className="flex flex-col items-center">
                      <div className="relative group/photo mb-6">
                        <div className={`w-32 h-40 sm:w-44 sm:h-52 rounded-2xl overflow-hidden border-2 border-dashed transition-all duration-500 flex items-center justify-center
                          ${coachPreviewUrl ? 'border-[#C3F629]/40 shadow-lg shadow-[#C3F629]/5' : 'border-white/10 group-hover/photo:border-white/20'}`}>
                          {coachPreviewUrl ? (
                            <img src={coachPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 sm:gap-3 text-white/20 group-hover/photo:text-white/40 transition-colors">
                              <User size={32} className="sm:w-10 sm:h-10" strokeWidth={1.5} />
                              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40 text-center">Upload Bio Photo</span>
                            </div>
                          )}
                        </div>
                        <label className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 cursor-pointer bg-[#C3F629] text-brand-950 p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl shadow-[0_8px_24px_rgba(204,255,0,0.4)] hover:scale-110 active:scale-95 transition-all z-10">
                          <Upload size={14} className="sm:w-4 sm:h-4" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleCoachFileChange} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-[#C3F629] opacity-40" />
                    <SectionHeader
                      icon={<Shield size={16} className="text-white" />}
                      title="Personnel" accent="Metrics"
                      subtitle="Official coach credentials"
                      accentClass="text-white"
                    />
                    <div className="grid grid-cols-1 gap-5 sm:gap-6">
                      <div>
                        <FieldLabel icon={<UserCheck size={11} />} label="Full Display Name" required />
                        <input type="text" className={inp('fullName')} value={coachForm.fullName}
                          onChange={e => setCoachForm({ ...coachForm, fullName: e.target.value })}
                          placeholder="Coach's full name" />
                      </div>
                      <div>
                        <FieldLabel icon={<Award size={11} />} label="System Username" required />
                        <input type="text" className={inp('username')} value={coachForm.username}
                          onChange={e => setCoachForm({ ...coachForm, username: e.target.value })}
                          placeholder="e.g. coach_john" />
                      </div>
                      <div>
                        <FieldLabel icon={<FileText size={11} />} label="Employee Number" required />
                        <input type="text" className={inp('employeeNumber')} value={coachForm.employeeNumber}
                          onChange={e => setCoachForm({ ...coachForm, employeeNumber: e.target.value })}
                          placeholder="ICR-XXXX" />
                      </div>
                      <div>
                        <FieldLabel icon={<Key size={11} />} label="Access Password" required />
                        <input type="password" className={inp('password')} value={coachForm.password}
                          onChange={e => setCoachForm({ ...coachForm, password: e.target.value })}
                          placeholder="Secure password" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-8 space-y-6">
                  <div className="glass-card p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-[#C3F629] opacity-40" />
                    <SectionHeader
                      icon={<MapPin size={16} className="text-[#C3F629]" />}
                      title="Zone" accent="Assignment"
                      subtitle="Operational venue reach"
                    />
                    <div className="space-y-6">
                      <div>
                        <FieldLabel label="Select Assigned Venues" />
                        <div className="flex flex-wrap gap-2">
                          {venues.map(v => (
                            <button key={v.id} type="button" onClick={() => toggleCoachAssignment('venue', v.name)}
                              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 border
                                ${coachForm.assignedVenues.includes(v.name)
                                  ? 'bg-[#C3F629] text-brand-950 border-[#C3F629] shadow-lg shadow-[#C3F629]/20'
                                  : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}>
                              {v.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <FieldLabel label="Select Assigned Batches" />
                        <div className="flex flex-wrap gap-2">
                          {batches.map(b => (
                            <button key={b.id} type="button" onClick={() => toggleCoachAssignment('batch', b.name)}
                              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 border
                                ${coachForm.assignedBatches.includes(b.name)
                                  ? 'bg-[#C3F629] text-brand-950 border-[#C3F629] shadow-lg shadow-[#C3F629]/20'
                                  : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}>
                              {b.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-orange-500 opacity-40" />
                    <SectionHeader
                      icon={<Key size={16} className="text-orange-400" />}
                      title="Contact &" accent="Security"
                      subtitle="Login credentials & contact info"
                      accentClass="text-orange-400"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                      <div>
                        <FieldLabel icon={<Phone size={11} />} label="Phone Number" />
                        <input type="tel" className={inp('contactNumber')} value={coachForm.contactNumber}
                          onChange={e => setCoachForm({ ...coachForm, contactNumber: e.target.value })}
                          placeholder="+91 XXXXX XXXXX" />
                      </div>
                      <div>
                        <FieldLabel icon={<Radio size={11} />} label="Email Address" />
                        <input type="email" className={inp('email')} value={coachForm.email}
                          onChange={e => setCoachForm({ ...coachForm, email: e.target.value })}
                          placeholder="coach@icarus.com" />
                      </div>
                      <div>
                        <FieldLabel icon={<Key size={11} />} label="Password" required />
                        <input type="password" className={inp('password')} value={coachForm.password}
                          onChange={e => setCoachForm({ ...coachForm, password: e.target.value })}
                          placeholder="Choose a strong password" />
                      </div>
                      <div>
                        <FieldLabel icon={<Calendar size={11} />} label="Date of Birth" />
                        <input type="date" className={inp('dateOfBirth')} value={coachForm.dateOfBirth}
                          onChange={e => setCoachForm({ ...coachForm, dateOfBirth: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <FieldLabel icon={<MapPin size={11} />} label="Address" />
                        <input type="text" className={inp('address')} value={coachForm.address}
                          onChange={e => setCoachForm({ ...coachForm, address: e.target.value })}
                          placeholder="Residential address" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 pt-2">
                    <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-white/10 bg-white/5">
                      <div className="w-2 h-2 rounded-full bg-[#C3F629] animate-pulse" />
                      <div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">Registration Status</p>
                        <p className="text-xs font-black text-white italic uppercase font-display leading-none">Initial Entry Mode</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                        <button type="button" onClick={() => setCoachForm(INITIAL_COACH_FORM)}
                          className="px-6 sm:px-8 py-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-black text-white/40 uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all italic">
                          Reset Protocol
                        </button>
                        <button type="submit" disabled={status === 'submitting'}
                          className="px-8 sm:px-12 py-4 rounded-xl sm:rounded-2xl bg-[#C3F629] text-brand-950 font-black text-[10px] sm:text-[11px] uppercase tracking-widest hover:scale-[1.02] shadow-xl shadow-[#C3F629]/20 transition-all flex items-center justify-center gap-3 italic group">
                          {status === 'submitting' ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <><span>Authenticate & Create</span> <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                          )}
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
          </div>
        </div>

      {/* ─── Config Modal ───────────────────────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-xl glass-card rounded-3xl sm:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 ring-1 ring-white/5 max-h-[90vh] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 sm:h-1.5 bg-[#C3F629] opacity-40" />
            
            <div className="flex justify-between items-center p-5 sm:p-8 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#C3F629]/10 border border-[#C3F629]/20 text-[#C3F629]">
                  <Settings size={20} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight italic font-display leading-none">Academy <span className="text-[#C3F629]">Config</span></h3>
                  <p className="text-[8px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Venues & Batch Management</p>
                </div>
              </div>
              <button onClick={() => setShowConfigModal(false)}
                className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10">
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="px-8 pt-6">
              <div className="flex gap-1.5 p-1.5 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                {(['venues', 'batches'] as const).map(t => (
                  <button key={t} onClick={() => setConfigTab(t)}
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
                onKeyDown={e => e.key === 'Enter' && (editingItem ? handleUpdateItem() : handleAddItem())} />
              <div className="flex gap-2 shrink-0">
                <button onClick={editingItem ? handleUpdateItem : handleAddItem}
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
              {(configTab === 'venues' ? venues : batches).map(item => (
                <div key={item.id}
                  className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 group/item hover:border-[#C3F629]/30 hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-md ring-1 ring-white/5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#C3F629]/40 group-hover/item:bg-[#C3F629] transition-colors" />
                    <span className="text-[11px] sm:text-sm font-bold text-white group-hover/item:text-[#C3F629] transition-colors italic font-display truncate max-w-[150px] sm:max-w-none">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 opacity-100 sm:opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                    <button onClick={() => { setEditingItem(item); setNewItemName(item.name); }}
                      className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-white/40 hover:text-[#C3F629] hover:bg-white/5 transition-all">
                      <Edit2 size={14} className="sm:w-[15px] sm:h-[15px]" />
                    </button>
                    <button onClick={() => handleSecureDelete(configTab === 'venues' ? 'venue' : 'batch', item.id, item.name)}
                      className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={14} className="sm:w-[15px] sm:h-[15px]" />
                    </button>
                  </div>
                </div>
              ))}
              {(configTab === 'venues' ? venues : batches).length === 0 && (
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
              <button onClick={() => setShowConfigModal(false)}
                className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black text-white/40 uppercase tracking-widest hover:text-white hover:bg-white/10 shadow-sm transition-all italic tracking-[0.2em]">
                Close Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Modal ──────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete ${itemToDelete?.type}`}
        message={`Are you sure you want to permanently delete "${itemToDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        requireTypeToConfirm="delete"
      />
    </div>
  );
};

export default PlayerRegistration;
