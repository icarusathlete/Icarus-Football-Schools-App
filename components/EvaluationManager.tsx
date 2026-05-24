
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StorageService } from '../services/storageService';
import { processAndSafeUploadImage } from '../utils/imageUtils';
import { Player, PlayerEvaluation } from '../types';
import { Search, Save, X, Trash2, Shield, Activity, Target, Zap, Ruler, Weight, Timer, Plus, Minus, ChevronRight, Play, Square, RefreshCcw, SaveAll, Loader2, Camera, Award, Eye, Brain, Sparkles, Check, Trash } from 'lucide-react';
import { EvaluationCard } from './EvaluationCard';
import { PageHeader } from './ui/PageHeader';
import { GeminiService } from '../services/geminiService';

// --- SUB-COMPONENTS FOR REAL-TIME TOOLS ---

// 1. Stopwatch Component for Timed Drills
const StopwatchTool: React.FC<{ 
    label: string; 
    value: number; 
    onChange: (val: number) => void;
}> = ({ label, value, onChange }) => {
    const [time, setTime] = useState(0); // in ms
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<any>(null);

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => {
        if (isRunning) {
            clearInterval(intervalRef.current);
        } else {
            const startTime = Date.now() - time;
            intervalRef.current = setInterval(() => {
                setTime(Date.now() - startTime);
            }, 10);
        }
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        clearInterval(intervalRef.current);
        setIsRunning(false);
        setTime(0);
    };

    const applyTime = () => {
        const seconds = parseFloat((time / 1000).toFixed(1));
        onChange(seconds);
    };

    // Clean up
    useEffect(() => {
        return () => clearInterval(intervalRef.current);
    }, []);

    return (
        <div className="glass-card border border-white/20 rounded-[2rem] p-5 md:p-8 flex flex-col gap-4 md:gap-6 shadow-xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-brand-primary opacity-[0.05]" />
             <div className="flex justify-between items-center relative z-10">
                 <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] italic">{label}</label>
                 <span className="text-[8px] font-black text-brand-accent bg-brand-accent/10 px-4 py-1.5 rounded-full border border-brand-accent/20 italic tracking-widest">PREVIOUS: {value}s</span>
             </div>
             
             <div className="flex items-center gap-4 bg-white/10 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 shadow-inner justify-between border border-white/10 relative group/timer">
                 <div className="font-mono text-4xl md:text-5xl font-black text-white tracking-tighter w-32 md:w-40 text-center italic" style={{ fontFamily: 'Orbitron' }}>
                     {formatTime(time)}<span className="text-xs text-brand-accent ml-2 uppercase opacity-50">sec</span>
                 </div>
                 <div className="flex gap-4 relative z-10">
                     <button 
                        onClick={toggleTimer}
                        type="button"
                        className={`w-16 h-16 rounded-2xl text-brand-950 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-2xl ${isRunning ? 'bg-red-500 shadow-red-500/20 text-white' : 'bg-brand-accent shadow-brand-accent/20'}`}
                     >
                         {isRunning ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                     </button>
                     <button 
                        onClick={resetTimer}
                        type="button"
                        className="w-16 h-16 rounded-2xl bg-white/10 text-white/40 hover:text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/10"
                     >
                         <RefreshCcw size={24} />
                     </button>
                 </div>
             </div>
             <button 
                type="button"
                onClick={applyTime}
                className="w-full py-5 bg-white/20 text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl hover:bg-white/30 transition-all shadow-xl italic border border-white/10"
             >
                 APPLY TO PROFILE
             </button>
        </div>
    );
};

// 2. Metric Tracker (20 point progress bar) for Counting Drills
const MetricTracker: React.FC<{
    label: string;
    value: number; // 0-100
    onChange: (val: number) => void;
    colorClass: string;
}> = ({ label, value, onChange, colorClass }) => {
    // Convert 0-100 scale to 0-20 scale for the UI
    const count = Math.round((value / 100) * 20);

    const handleClick = (index: number) => {
        const newCount = index + 1 === count ? index : index + 1;
        const newValue = Math.round((newCount / 20) * 100);
        onChange(newValue);
    };

    const isPrimary = colorClass.includes('brand-primary') || colorClass.includes('brand-500');

    return (
        <div className="space-y-4 md:space-y-5 group/metric bg-white/5 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 hover:border-brand-accent/20 transition-all">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] italic group-hover/metric:text-brand-accent transition-colors">{label}</label>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isPrimary ? 'bg-brand-accent shadow-[0_0_8px_currentColor]' : 'bg-lime-400 shadow-[0_0_8px_currentColor]'}`} />
                        <span className="text-[8px] font-black text-white/30 font-mono tracking-widest uppercase">{count}/20 ACCURACY</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                     <span className={`text-3xl font-black italic tracking-tighter ${isPrimary ? 'text-brand-accent' : 'text-lime-400'} font-mono`} style={{ fontFamily: 'Orbitron' }}>{value}<span className="text-[10px] ml-1 opacity-40">%</span></span>
                </div>
            </div>
            
            <div className="flex gap-1.5 h-6 select-none relative">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i} 
                        onClick={() => handleClick(i)}
                        className={`
                            flex-1 rounded-[1.5px] cursor-pointer transition-all duration-300 hover:scale-y-125
                             ${i < count 
                                ? (isPrimary ? 'bg-brand-accent shadow-[0_0_12px_rgba(195,246,41,0.4)]' : 'bg-lime-400 shadow-[0_0_12px_rgba(191,255,0,0.4)]') 
                                : 'bg-white/10 border border-white/5 hover:bg-white/20'}
                        `}
                    />
                ))}
            </div>
        </div>
    );
};
// 3. Professional Physical Metric Input (Height/Weight)
const PhysicalMetricInput: React.FC<{
    label: string;
    value: number;
    unit: string;
    icon: React.ReactNode;
    min?: number;
    max?: number;
    onChange: (val: number) => void;
}> = ({ label, value, unit, icon, min = 0, max = 300, onChange }) => {
    const handleIncrement = () => {
        if (value < max) onChange(value + 1);
    };

    const handleDecrement = () => {
        if (value > min) onChange(value - 1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
            onChange(Math.max(min, Math.min(max, val)));
        } else if (e.target.value === '') {
            onChange(0);
        }
    };

    return (
        <div className="space-y-4 group/phys">
            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] ml-1 italic group-hover/phys:text-brand-accent transition-colors">{label}</label>
            <div className="relative flex items-center gap-4">
                <div className="relative flex-1 group/input">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within/input:text-brand-accent transition-colors">
                        {icon}
                    </div>
                    <input 
                        type="number" 
                        className="w-full pl-14 pr-16 py-6 bg-white/5 border border-white/10 rounded-2xl text-2xl font-black text-white focus:border-brand-accent/50 outline-none transition-all italic font-mono shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={value || ''}
                        onChange={handleInputChange}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/30 uppercase tracking-widest italic font-mono">{unit}</span>
                </div>
                <div className="flex flex-col gap-2">
                    <button 
                        type="button"
                        onClick={handleIncrement}
                        className="p-3 bg-white/10 hover:bg-brand-accent hover:text-brand-950 text-white/60 rounded-xl border border-white/10 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                    <button 
                        type="button"
                        onClick={handleDecrement}
                        className="p-3 bg-white/10 hover:bg-red-500 hover:text-white text-white/60 rounded-xl border border-white/10 transition-all shadow-lg active:scale-95"
                    >
                        <Minus size={20} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- RATING LOGIC HELPER ---
const calculateOverallRating = (evaluation: PlayerEvaluation): number => {
    if (!evaluation) return 0;

    // 1. Technical Metrics (0-100 each) - Explicitly passing, shooting, longPass, weakFoot
    const techMetrics = [
        evaluation.metrics?.passing || 0,
        evaluation.metrics?.shooting || 0,
        evaluation.metrics?.longPass || 0,
        evaluation.metrics?.weakFoot || 0
    ];
    const avgTechnical = techMetrics.reduce((a, b) => a + b, 0) / techMetrics.length;

    // 2. Physical Time Trials & Endurance
    // Baselines (Targeting typical 10-15 year old ranges)
    const tt = evaluation.timeTrials || { speed: 7.0, agility: 24.0, dribbling: 28.0 };
    const speedScore = Math.max(0, Math.min(100, ( (7.0 - (tt.speed || 7.0)) / (7.0 - 4.2) ) * 100));
    const agilityScore = Math.max(0, Math.min(100, ( (24.0 - (tt.agility || 24.0)) / (24.0 - 16.0) ) * 100));
    const dribblingScore = Math.max(0, Math.min(100, ( (28.0 - (tt.dribbling || 28.0)) / (28.0 - 14.0) ) * 100));
    
    // Beep Test (0-20 scale -> 0-100)
    const beepTestScore = Math.min(100, ((evaluation.metrics?.beepTest || 0) / 20) * 100);

    const avgPhysical = (speedScore + agilityScore + dribblingScore + beepTestScore) / 4;

    // 3. Weighting
    // Technical counts for 60%, Physical for 40% (tweaked weightings slightly since physical is now 4 tests)
    const finalRating = (avgTechnical * 0.6) + (avgPhysical * 0.4);

    return Math.round(finalRating || 0);
};

// --- COACH PHRASE LIBRARY ---
const COACH_PHRASES = [
    { category: 'ELITE', phrases: [
        "Displays exceptional tactical maturity and ball mastery.",
        "A standout performer with professional-grade physical output.",
        "Demonstrates elite decision-making under high-intensity pressure.",
        "Highly influential player with excellent technical range."
    ]},
    { category: 'DEVELOPING', phrases: [
        "Solid technical foundation with consistent work rate.",
        "Shows great potential; focus on sharpening weak-foot precision.",
        "Developing well; needs to improve positional awareness in transition.",
        "A reliable asset to the team with steady physical growth."
    ]},
    { category: 'TACTICAL', phrases: [
        "Excellent spatial awareness and vision on the ball.",
        "Highly disciplined in defensive transitions and recovery.",
        "Creative spark in the final third with precise delivery.",
        "Reads the game effectively, anticipating opponent movements."
    ]},
    { category: 'PHYSICAL', phrases: [
        "Exceptional explosiveness and recovery speed.",
        "Shows dominant aerial presence and physical strength.",
        "Agile and quick in 1v1 situations; high stamina levels.",
        "Improving physical profile; focus on core stability."
    ]}
];

// --- MAIN COMPONENT ---

interface EvaluationManagerProps {
  onBreadcrumbChange?: (segments: string[]) => void;
}

export const EvaluationManager: React.FC<EvaluationManagerProps> = ({ onBreadcrumbChange }) => {
  const [players, setPlayers] = useState<Player[]>(StorageService.getPlayers());
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [previewPlayer, setPreviewPlayer] = useState<Player | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const STEPS = [
    { title: 'PHYSIQUE', icon: <Ruler size={14} /> },
    { title: 'PERFORMANCE', icon: <Timer size={14} /> },
    { title: 'TECHNICAL', icon: <Zap size={14} /> },
    { title: 'VERDICT', icon: <Award size={14} /> }
  ];

  // Fallback image constant
  const FALLBACK_IMAGE = "https://cdn-icons-png.flaticon.com/512/166/166344.png";

  // Form State
  const defaultEval: PlayerEvaluation = {
    level: 30,
    overallRating: 75,
    height: 140,
    weight: 35,
    metrics: {
      passing: 60,
      juggling: 60,
      shooting: 60,
      beepTest: 60,
      weakFoot: 60,
      longPass: 60,
    },
    timeTrials: {
      dribbling: 25.0,
      speed: 20.0,
      agility: 19.0,
    },
    developmentAreas: ['Dribbling', 'Passing'],
    coachName: 'Coach Admin',
    evaluationDate: new Date().toISOString().split('T')[0],
    coachRemarks: '',
    actionImageUrl: '',
    coachSignatureUrl: '',
  };

  const [form, setForm] = useState<PlayerEvaluation>(defaultEval);

  const loadData = () => {
    setPlayers(StorageService.getPlayers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('academy_data_update', loadData);
    return () => window.removeEventListener('academy_data_update', loadData);
  }, []);

  // Auto-calculate rating when form changes
  useEffect(() => {
    const newRating = calculateOverallRating(form);
    if (newRating !== form.overallRating) {
        setForm(prev => ({ ...prev, overallRating: newRating }));
    }

    if (isEditing && selectedPlayerId) {
        const timeoutId = setTimeout(() => {
            StorageService.saveDraft(selectedPlayerId, form);
            setDraftSaved(true);
            setTimeout(() => setDraftSaved(false), 2000);
        }, 1000); // Debounce save by 1s
        
        return () => clearTimeout(timeoutId);
    }
  }, [form.metrics, form.timeTrials, isEditing, selectedPlayerId]);

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayerId(player.id);
    onBreadcrumbChange?.([player.fullName.toUpperCase()]);
    
    // Check for existing draft
    const draft = StorageService.getDraft(player.id);
    
    if (draft) {
        setForm({
            ...defaultEval,
            ...draft,
            metrics: { ...defaultEval.metrics, ...(draft.metrics || {}) },
            timeTrials: { ...defaultEval.timeTrials, ...(draft.timeTrials || {}) },
            developmentAreas: draft.developmentAreas || defaultEval.developmentAreas
        });
    } else if (player.evaluation) {
        setForm({
            ...defaultEval,
            ...player.evaluation,
            metrics: { ...defaultEval.metrics, ...(player.evaluation.metrics || {}) },
            timeTrials: { ...defaultEval.timeTrials, ...(player.evaluation.timeTrials || {}) },
            developmentAreas: player.evaluation.developmentAreas || defaultEval.developmentAreas,
            coachName: player.evaluation.coachName || 'Coach Admin'
        });
    } else {
        setForm({ ...defaultEval, coachName: 'Coach Admin' });
    }
    
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedPlayerId) return;
    StorageService.saveEvaluation(selectedPlayerId, form);
    setIsEditing(false);
    onBreadcrumbChange?.([]);
  };

  const handleDeleteEvaluation = async (playerId: string) => {
    setIsDeleting(true);
    try {
        await StorageService.deleteEvaluation(playerId);
        setShowDeleteConfirm(null);
    } catch (err) {
        console.error("Delete failed", err);
    } finally {
        setIsDeleting(false);
    }
  };

  const resetForm = () => {
      setForm({ ...defaultEval, coachName: 'Coach Admin' });
      setShowResetConfirm(false);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.developmentAreas.includes(tagInput.trim())) {
        setForm(prev => ({ ...prev, developmentAreas: [...prev.developmentAreas, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({ ...prev, developmentAreas: prev.developmentAreas.filter(tag => tag !== tagToRemove) }));
  };

  const handleActionPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation: Size (2MB) and Type
      if (file.size > 2 * 1024 * 1024) {
        alert("Maximum 2MB permitted for photo uploads.");
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert("INVALID_FORMAT: Only image assets are supported.");
        return;
      }

      try {
        // Show instant local feedback
        const tempUrl = URL.createObjectURL(file);
        setForm(prev => ({ ...prev, actionImageUrl: tempUrl }));

        const safeUrl = await processAndSafeUploadImage(
          file,
          `evaluations/${selectedPlayerId || 'general'}`,
          1000,
          0.8,
          'action'
        );
        setForm(prev => ({ ...prev, actionImageUrl: safeUrl }));
      } catch (err) {
        console.error("Action photo upload failed", err);
        alert("Failed to upload action photo. Please try again.");
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation: Size (1MB) and Type
      if (file.size > 1 * 1024 * 1024) {
        alert("FILE_OVERSIZE: Maximum 1MB permitted for authorization signatures.");
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert("INVALID_FORMAT: Only image assets are supported.");
        return;
      }

      try {
        // Show instant local feedback
        const tempUrl = URL.createObjectURL(file);
        setForm(prev => ({ ...prev, coachSignatureUrl: tempUrl }));

        const safeUrl = await processAndSafeUploadImage(
          file,
          `evaluations/${selectedPlayerId || 'general'}`,
          400,
          0.8,
          'signature'
        );
        setForm(prev => ({ ...prev, coachSignatureUrl: safeUrl }));
      } catch (err) {
        console.error("Signature upload failed", err);
        alert("Failed to upload signature. Please try again.");
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleMagicScribe = async () => {
    if (!selectedPlayerId) return;
    setIsAiGenerating(true);
    setAiSuggestions([]);
    
    const player = players.find(p => p.id === selectedPlayerId);
    if (!player) return;

    const playerWithCurrentMetrics = {
        ...player,
        evaluation: form
    };

    try {
        const suggestions = await GeminiService.generateCoachVerdictSuggestion(player, form);
        setAiSuggestions(suggestions);
    } catch (err) {
        console.error("Magic Scribe failed", err);
    } finally {
        setIsAiGenerating(false);
    }
  };

  const pickSuggestion = (suggestion: string) => {
    setForm(prev => ({
        ...prev,
        coachRemarks: prev.coachRemarks ? `${prev.coachRemarks}\n\n${suggestion}` : suggestion
    }));
    setAiSuggestions([]);
  };

  const addPhrase = (phrase: string) => {
    setForm(prev => ({
        ...prev,
        coachRemarks: prev.coachRemarks ? `${prev.coachRemarks} ${phrase}` : phrase
    }));
  };

  const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-yellow-600';
      return 'text-red-600';
  };

  const filteredPlayers = players.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.memberId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPlayerName = players.find(p => p.id === selectedPlayerId)?.fullName;

  return (
    <>
    <div className="space-y-10 pb-20">
      {!isEditing && (
        <div className="space-y-8">
          <PageHeader 
            title="PLAYER EVALUATIONS"
            subtitle="Academy Performance Hub // Technical Assessment"
          />

          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500/40 group-focus-within:text-brand-accent transition-colors" />
              <input 
                type="text" 
                placeholder="SEARCH PLAYERS..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 pl-14 text-sm font-black text-white italic outline-none focus:border-brand-accent/40 focus:ring-1 focus:ring-brand-accent/20 transition-all uppercase tracking-widest placeholder:text-white/20"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/5 border border-brand-500/10">
              <Activity size={12} className="text-brand-accent" />
              <span className="text-[9px] font-black text-brand-500/60 uppercase tracking-widest italic">EVALUATION SYSTEM ACTIVE</span>
            </div>
          </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
                {filteredPlayers.map(p => {
                    const hasDraft = StorageService.getDraft(p.id);
                    return (
                        <div 
                            key={p.id} 
                            onClick={() => handleSelectPlayer(p)}
                            className="glass-card p-6 sm:p-8 md:p-10 rounded-[2.5rem] border border-white/20 hover:border-brand-accent/40 cursor-pointer transition-all duration-500 shadow-xl hover:-translate-y-2 hover:scale-[1.02] flex flex-col gap-6 md:gap-8 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity -mr-8 -mt-8 rotate-12">
                                <Zap size={120} className="text-white" />
                            </div>

                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-x-0 -bottom-2 h-4 bg-brand-accent/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] bg-brand-950 border-2 border-white/20 overflow-hidden relative z-10 transition-transform duration-500 group-hover:scale-105">
                                        <img 
                                            src={p.photoUrl || FALLBACK_IMAGE} 
                                            onError={(e) => {e.currentTarget.src = FALLBACK_IMAGE}}
                                            className="w-full h-full object-cover" 
                                        />
                                    </div>
                                    {hasDraft && <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-accent rounded-full border-2 border-brand-900 flex items-center justify-center z-20 shadow-lg"><Save size={10} className="text-brand-950" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white truncate group-hover:text-brand-accent transition-colors uppercase italic tracking-tighter leading-none mb-1.5 md:mb-2">{p.fullName}</h3>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 md:px-3 md:py-1 rounded-lg bg-white/10 border border-white/10">
                                        <Shield size={9} className="text-white/40" />
                                        <span className="text-[8px] md:text-[9px] font-black text-white/50 uppercase tracking-[0.2em] italic">#{p.memberId}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 md:pt-8 border-t border-white/10 flex flex-col gap-4 md:gap-6">
                                {p.evaluation ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic mb-1">DATA_INDEX</span>
                                            <span className="text-3xl md:text-4xl font-black text-brand-accent italic tracking-tighter font-mono" style={{ fontFamily: 'Orbitron' }}>{p.evaluation.overallRating}<span className="text-[10px] md:text-xs ml-1 opacity-40 font-bold">/100</span></span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewPlayer(p);
                                                }}
                                                className="w-10 h-10 md:w-12 md:h-12 bg-brand-accent/10 text-brand-accent/60 hover:text-brand-950 hover:bg-brand-accent rounded-xl md:rounded-2xl transition-all border border-brand-accent/20 flex items-center justify-center shadow-lg"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteConfirm(p.id);
                                                }}
                                                className="w-10 h-10 md:w-12 md:h-12 bg-red-500/10 text-red-500/60 hover:text-white hover:bg-red-500 rounded-xl md:rounded-2xl transition-all border border-red-500/20 flex items-center justify-center shadow-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic mb-1">DATA_INDEX</span>
                                            <span className="text-3xl md:text-4xl font-black text-white/20 italic tracking-tighter font-mono" style={{ fontFamily: 'Orbitron' }}>--<span className="text-[10px] md:text-xs ml-1 opacity-40 font-bold">/100</span></span>
                                        </div>
                                        <div className="bg-white/10 text-white/40 px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] border border-white/10 italic">AWAITING</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filteredPlayers.length === 0 && (
                    <div className="col-span-full py-48 text-center glass-card rounded-[4rem] border-dashed border-white/20">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-white/5 mb-8">
                            <Activity size={48} className="text-white/10" />
                        </div>
                        <h3 className="text-3xl font-black text-white/10 uppercase tracking-[0.4em] italic leading-tight">NO SIGNAL <br/> RETRIEVED</h3>
                        <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.5em] mt-6 italic">RECALIBRATE SEARCH PARAMETERS</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-0 md:p-12 bg-brand-950 md:bg-black/60 backdrop-blur-3xl animate-in fade-in duration-500">
            <div className="glass-card w-full max-w-7xl h-[100dvh] md:h-full rounded-none md:rounded-[3.5rem] shadow-[0_40px_120px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-700 border-0 md:border border-white/20 uppercase tracking-tight relative">
                <div className="absolute inset-0 bg-brand-bg/40 -z-10" />
                
                {/* Header */}
                {/* Sleeker, Minimalistic Header */}
                <div className="px-4 md:px-8 py-3 md:py-4 border-b border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between shrink-0 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 flex items-center gap-4 w-full">
                        <img 
                            src={players.find(p => p.id === selectedPlayerId)?.photoUrl || FALLBACK_IMAGE} 
                            className="w-10 h-10 rounded-xl border border-white/10 object-cover" 
                        />
                        <div className="flex-1 w-full flex items-center justify-between">
                            <div className="flex flex-col">
                                <h2 className="text-sm md:text-xl font-black text-white italic tracking-widest uppercase">
                                    {selectedPlayerName}
                                </h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[8px] font-black text-brand-accent uppercase tracking-[0.4em] italic flex items-center gap-1.5 shadow-lg shadow-brand-accent/10">
                                        {STEPS[activeStep].icon} {STEPS[activeStep].title}
                                    </span>
                                    {draftSaved && (
                                        <span className="flex items-center gap-1 text-[7px] text-white/40 font-black uppercase italic animate-pulse">
                                            <SaveAll size={8} /> Syncing
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                    <span className="text-[7px] text-brand-accent font-bold italic tracking-[0.2em] mb-0.5">RATING_</span>
                                    <span className="text-2xl md:text-3xl font-black italic font-mono leading-none tracking-tighter text-white" style={{ fontFamily: 'Orbitron' }}>{form.overallRating}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Ultra-thin Step Progress Bar */}
                <div className="flex w-full shrink-0 h-1 md:h-1.5 opacity-80 hover:opacity-100 transition-opacity bg-black/40">
                    {STEPS.map((step, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setActiveStep(idx)}
                            className={`flex-1 cursor-pointer transition-all duration-300 ${
                                activeStep === idx 
                                    ? 'bg-brand-accent shadow-[0_0_15px_rgba(195,246,41,0.8)] z-10 scale-y-150 rounded-full' 
                                    : activeStep > idx 
                                        ? 'bg-white/30' 
                                        : 'bg-transparent hover:bg-white/10'
                            }`}
                            title={step.title}
                        />
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 custom-scrollbar bg-black/20 relative z-0">
                    <div className="max-w-5xl mx-auto w-full">
                        
                        {/* STEP 0: PHYSIQUE */}
                        {activeStep === 0 && (
                        <div className="space-y-6 md:space-y-12 animate-in slide-in-from-right-8 duration-500 w-full mb-6">
                            <section className="bg-brand-950 p-4 sm:p-5 md:p-12 rounded-[1.5rem] md:rounded-[3.5rem] border border-white/5 relative overflow-hidden shadow-2xl group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-brand-primary/20 transition-colors" />
                                 <h4 className="text-[11px] font-black text-brand-accent uppercase tracking-[0.5em] flex items-center gap-4 mb-12 italic relative z-10">
                                    <div className="w-8 h-8 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-accent"><Zap size={18} strokeWidth={3} /></div>
                                    PHYSICAL STATS
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                    <PhysicalMetricInput 
                                        label="Height"
                                        value={form.height}
                                        unit="CM"
                                        icon={<Ruler size={20} />}
                                        min={50}
                                        max={250}
                                        onChange={(val) => setForm({...form, height: val})}
                                    />
                                    <PhysicalMetricInput 
                                        label="Weight"
                                        value={form.weight}
                                        unit="KG"
                                        icon={<Weight size={20} />}
                                        min={10}
                                        max={150}
                                        onChange={(val) => setForm({...form, weight: val})}
                                    />
                                </div>
                            </section>
                        </div>
                        )}

                        {/* STEP 1: PERFORMANCE */}
                        {activeStep === 1 && (
                        <div className="space-y-6 md:space-y-12 animate-in slide-in-from-right-8 duration-500 w-full mb-6">
                            <section className="space-y-6 md:space-y-10">
                                <div className="flex items-center justify-between px-2">
                                     <h4 className="text-[11px] font-black text-white uppercase tracking-[0.5em] flex items-center gap-4 italic">
                                         <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white"><Timer size={18} strokeWidth={3} /></div>
                                        TIME TRIALS
                                    </h4>
                                     <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em] italic font-mono">SYSTEM_READY</span>
                                </div>
                                <div className="space-y-8">
                                    <StopwatchTool 
                                        label="Sprint Test (30m)" 
                                        value={form.timeTrials.speed} 
                                        onChange={(val) => setForm({...form, timeTrials: {...form.timeTrials, speed: val}})} 
                                    />
                                    <StopwatchTool 
                                        label="Agility Test" 
                                        value={form.timeTrials.agility} 
                                        onChange={(val) => setForm({...form, timeTrials: {...form.timeTrials, agility: val}})} 
                                    />
                                    <StopwatchTool 
                                        label="Dribbling Test" 
                                        value={form.timeTrials.dribbling} 
                                        onChange={(val) => setForm({...form, timeTrials: {...form.timeTrials, dribbling: val}})} 
                                    />
                                </div>
                            </section>
                        </div>
                        )}

                        {/* STEP 2: TECHNICAL */}
                        {activeStep === 2 && (
                        <div className="space-y-6 md:space-y-12 animate-in slide-in-from-right-8 duration-500 w-full mb-6">
                            <section className="bg-brand-950 p-4 sm:p-5 md:p-12 rounded-[1.5rem] md:rounded-[3.5rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[120px] -mr-[300px] -mt-[300px] group-hover:bg-brand-primary/15 transition-colors" />
                                <div className="flex justify-between items-center mb-16 relative z-10 w-full">
                                     <h4 className="text-[12px] font-black text-brand-accent uppercase tracking-[0.6em] flex items-center gap-5 italic w-full">
                                        <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-accent shadow-lg shadow-brand-accent/10"><Activity size={20} strokeWidth={3} /></div>
                                        <span className="truncate">TECHNICAL DATA ANALYSIS</span>
                                    </h4>
                                    <div className="hidden md:flex flex-col items-end shrink-0">
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em] italic mb-1 opacity-40 font-mono">TECHNICAL_RATING</span>
                                         <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest italic">PLAYER RATING</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-8 relative z-10 w-full">
                                    <MetricTracker 
                                        label="PASSING" 
                                        value={form.metrics.passing} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, passing: val}})} 
                                        colorClass="bg-brand-primary"
                                    />
                                    <MetricTracker 
                                        label="LONG PASSING" 
                                        value={form.metrics.longPass} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, longPass: val}})} 
                                        colorClass="bg-brand-primary"
                                    />
                                    <MetricTracker 
                                        label="SHOOTING" 
                                        value={form.metrics.shooting} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, shooting: val}})} 
                                        colorClass="bg-brand-primary"
                                    />
                                    <MetricTracker 
                                        label="WEAK FOOT" 
                                        value={form.metrics.weakFoot} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, weakFoot: val}})} 
                                        colorClass="bg-lime-400"
                                    />
                                    
                                    {/* Juggling Focus */}
                                    <div className="pt-8 border-t border-white/5">
                                        <div className="flex justify-between items-center bg-white/5 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 hover:border-brand-accent/20 transition-all">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] italic transition-colors">JUGGLING [MAX REPS]</label>
                                                <div className="text-[8px] font-black text-white/30 italic uppercase tracking-widest font-mono">BALL CONTROL VERIFICATION</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="number" 
                                                    className="w-24 md:w-32 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-2xl md:text-3xl font-black text-brand-accent focus:border-brand-accent/50 outline-none transition-all italic font-mono shadow-inner text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-white/10"
                                                    value={form.metrics.juggling || ''}
                                                    onChange={e => setForm({...form, metrics: {...form.metrics, juggling: parseInt(e.target.value) || 0}})}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Endurance Range */}
                                    <div className="pt-12 border-t border-white/5 space-y-8">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] italic group-hover/metric:text-brand-primary transition-colors">BEEP TEST</label>
                                                <div className="text-[8px] font-black text-brand-primary/40 italic uppercase tracking-widest">Aerobic capacity verification</div>
                                            </div>
                                            <div className="flex items-end gap-3">
                                                <span className="text-4xl font-black text-white font-mono italic tracking-tighter" style={{ fontFamily: 'Orbitron' }}>{form.metrics.beepTest}<span className="text-[12px] ml-2 opacity-30 uppercase">/ 20</span></span>
                                            </div>
                                        </div>
                                        <div className="relative py-6 px-1">
                                            <div className="absolute inset-x-0 h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ width: '200%' }} />
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="20"
                                                className="absolute inset-x-0 h-2 bg-transparent rounded-lg appearance-none cursor-pointer accent-brand-primary z-20 w-full"
                                                value={form.metrics.beepTest}
                                                onChange={e => setForm({...form, metrics: {...form.metrics, beepTest: parseInt(e.target.value)}})}
                                                style={{ left: 0 }}
                                            />
                                            <div 
                                                className="absolute h-2 bg-brand-primary rounded-full shadow-[0_0_25px_rgba(0,200,255,0.6)] z-10 transition-all duration-500 pointer-events-none" 
                                                style={{ width: `${(form.metrics.beepTest / 20) * 100}%`, left: 0 }} 
                                            />
                                        </div>
                                        <div className="flex justify-between text-[8px] text-white/20 font-black uppercase italic tracking-[0.4em] font-mono">
                                            <span>LEVEL_1</span>
                                            <span>LEVEL_20</span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                            
                            {/* Development Areas */}
                            <section className="bg-brand-950 p-4 sm:p-5 md:p-12 rounded-[1.5rem] md:rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-white/10 transition-colors" />
                                <div className="flex justify-between items-center mb-6 md:mb-12 relative z-10">
                                    <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.5em] flex items-center gap-4 italic relative z-10">
                                        <div className="w-8 h-8 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-accent"><Plus size={18} strokeWidth={3} /></div>
                                        STRATEGIC OBJECTIVES
                                    </h4>
                                </div>
                                
                                <div className="space-y-10 relative z-10">
                                    <div className="relative group/input">
                                         <Plus className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 group-focus-within/input:text-brand-accent transition-colors" />
                                        <input 
                                            type="text"
                                            className="w-full pl-14 pr-8 py-6 bg-white/[0.03] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-white focus:border-brand-accent/50 outline-none transition-all placeholder:text-white/10 italic font-mono shadow-inner"
                                            placeholder="SCAN & ADD NEW OBJECTIVE..."
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                        />
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-4 min-h-[80px]">
                                        {form.developmentAreas.map((area, idx) => (
                                            <span key={idx} className="group/tag inline-flex items-center gap-4 px-6 py-4 rounded-xl bg-black/40 text-white text-[9px] font-black uppercase tracking-[0.4em] border border-white/10 hover:border-brand-primary/40 transition-all italic shadow-2xl hover:-translate-y-1">
                                                 <div className="w-2 h-2 rounded-full bg-brand-accent group-hover/tag:animate-ping shadow-[0_0_10px_rgba(204,255,0,0.6)]" />
                                                {area}
                                                <button type="button" onClick={() => removeTag(area)} className="text-white/20 hover:text-red-500 transition-colors ml-3">
                                                    <X size={16} strokeWidth={4} />
                                                </button>
                                            </span>
                                        ))}
                                        {form.developmentAreas.length === 0 && (
                                            <div className="w-full h-24 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl text-[9px] font-black text-white/5 uppercase tracking-[0.4em] italic gap-3">
                                                <Target size={24} className="opacity-10" />
                                                Awaiting strategic directive
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                        )}

                        {/* STEP 3: VERDICT & MEDIA */}
                        {activeStep === 3 && (
                        <div className="space-y-6 md:space-y-12 animate-in slide-in-from-right-8 duration-500 w-full mb-6">
                            {/* Coach Evaluation / Remarks */}
                            <section className="bg-brand-950 p-4 sm:p-5 md:p-12 rounded-[1.5rem] md:rounded-[3.5rem] border border-brand-accent/20 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-brand-accent/20 transition-colors" />
                                <h4 className="text-[11px] font-black text-brand-accent uppercase tracking-[0.5em] flex items-center gap-4 mb-8 italic relative z-10 font-orbitron">
                                    <div className="w-8 h-8 rounded-xl bg-brand-accent/20 flex items-center justify-center text-brand-accent shadow-[0_0_15px_rgba(204,255,0,0.4)]"><Award size={18} strokeWidth={3} /></div>
                                    COACH'S EVALUATION
                                </h4>
                                
                                <div className="relative z-10">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent/20 to-transparent blur-xl opacity-20 pointer-events-none" />
                                    
                                    {/* PHRASE PICKER HUD */}
                                    <div className="mb-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black text-brand-accent uppercase tracking-[0.3em] mb-4 italic">QUICK NOTES</h4>
                                            <button 
                                                onClick={handleMagicScribe}
                                                disabled={isAiGenerating}
                                                className={`flex items-center gap-2 px-5 py-2.5 bg-brand-accent/10 border border-brand-accent/30 rounded-xl text-brand-accent text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 relative overflow-hidden group/magic ${isAiGenerating ? 'performance-pulse' : 'hover:bg-brand-accent/20'}`}
                                            >
                                                {isAiGenerating && (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                                                )}
                                                {isAiGenerating ? <Loader2 size={14} className="animate-spin relative z-10" /> : <Brain size={14} className="relative z-10 group-hover/magic:scale-110 transition-transform" />}
                                                <span className="relative z-10">AI ASSIST</span>
                                            </button>
                                        </div>
                                        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar-hide">
                                            {COACH_PHRASES.map((group) => (
                                                <div key={group.category} className="flex gap-2 shrink-0">
                                                    {group.phrases.map((phrase, i) => (
                                                        <button
                                                            key={`${group.category}-${i}`}
                                                            onClick={() => addPhrase(phrase)}
                                                            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 text-[9px] font-bold italic hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
                                                        >
                                                            {phrase.split(' ').slice(0, 3).join(' ')}...
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* AI SUGGESTION ENGINE UI */}
                                    {aiSuggestions.length > 0 && (
                                        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse shadow-[0_0_8px_#CCFF00]" />
                                                    <span className="text-[9px] font-black text-brand-accent uppercase tracking-[0.4em] italic">AI SUGGESTIONS READY</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button 
                                                        onClick={handleMagicScribe}
                                                        className="text-[8px] font-black text-brand-accent/60 uppercase tracking-widest hover:text-brand-accent transition-colors flex items-center gap-2"
                                                    >
                                                        <RefreshCcw size={10} className={isAiGenerating ? 'animate-spin' : ''} /> REGENERATE
                                                    </button>
                                                    <button 
                                                        onClick={() => setAiSuggestions([])}
                                                        className="text-[8px] font-black text-white/30 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
                                                    >
                                                        <X size={10} /> CLEAR_ALL
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {aiSuggestions.map((suggestion, idx) => (
                                                    <div 
                                                        key={idx}
                                                        onClick={() => pickSuggestion(suggestion)}
                                                        className="group/sugg relative bg-brand-accent/[0.03] border border-brand-accent/10 rounded-2xl p-6 hover:bg-brand-accent/10 hover:border-brand-accent/30 transition-all cursor-pointer overflow-hidden backdrop-blur-sm"
                                                    >
                                                        <div className="absolute top-0 left-0 w-full h-0.5 bg-brand-accent/20 animate-scan-line opacity-20 pointer-events-none" />
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent/20 group-hover/sugg:bg-brand-accent transition-colors shadow-[0_0_15px_rgba(204,255,0,0.4)]" />
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="p-1.5 bg-brand-accent/10 rounded-lg text-brand-accent group-hover/sugg:bg-brand-accent group-hover/sugg:text-brand-950 transition-colors">
                                                                    <Sparkles size={10} />
                                                                </div>
                                                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">VARIATION_0{idx + 1}</span>
                                                            </div>
                                                            <Plus size={12} className="text-brand-accent opacity-0 group-hover/sugg:opacity-100 transition-opacity" />
                                                        </div>
                                                        <p className="text-[11px] font-medium text-white/80 leading-relaxed italic line-clamp-4 group-hover/sugg:text-white transition-colors">
                                                            {suggestion}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <textarea 
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl md:rounded-[2rem] p-6 md:p-8 text-[11px] md:text-sm font-medium text-white focus:border-brand-accent/50 outline-none transition-all placeholder:text-white/10 italic leading-relaxed resize-none shadow-2xl min-h-[200px] md:min-h-[300px]"
                                        placeholder="INPUT PROFESSIONAL VERDICT & PLAYER PROJECTION..."
                                        value={form.coachRemarks || ''}
                                        onChange={e => setForm(prev => ({ ...prev, coachRemarks: e.target.value }))}
                                    ></textarea>
                                    <div className="mt-4 flex justify-between text-[8px] text-white/20 font-black uppercase italic tracking-[0.4em] font-mono">
                                        <span>SYSTEM_HUMAN_INTEL_INPUT</span>
                                        <span>{form.coachRemarks?.length || 0} CHARS</span>
                                    </div>
                                </div>
                            </section>

                            {/* media & verification */}
                            <section className="bg-white/5 p-5 sm:p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-white/10 shadow-xl relative overflow-hidden group">
                                 <h4 className="text-[11px] font-black text-white uppercase tracking-[0.5em] flex items-center gap-4 mb-8 italic relative z-10">
                                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white"><Camera size={18} strokeWidth={3} /></div>
                                    <span className="truncate">MEDIA & AUTHORIZATION</span>
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                         <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] italic block">PERFORMANCE PHOTO</label>
                                        <div className="relative group/upload h-48 rounded-3xl overflow-hidden border-2 border-dashed border-white/10 hover:border-brand-accent transition-all bg-white/5">
                                            {form.actionImageUrl ? (
                                                <>
                                                    <img src={form.actionImageUrl} className="w-full h-full object-cover" />
                                                    <button 
                                                        onClick={() => setForm({...form, actionImageUrl: ''})}
                                                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/upload:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                                     <Camera className="text-white/20" size={32} />
                                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic text-center px-4">UPLOAD PLAYER PHOTO</span>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={handleActionPhotoChange}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                         <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] italic block">COACH SIGNATURE</label>
                                        <div className="relative group/upload h-48 rounded-3xl overflow-hidden border-2 border-dashed border-white/10 hover:border-brand-accent transition-all bg-white/5">
                                            {form.coachSignatureUrl ? (
                                                <>
                                                    <img src={form.coachSignatureUrl} className="w-full h-full object-contain p-4" />
                                                    <button 
                                                        onClick={() => setForm({...form, coachSignatureUrl: ''})}
                                                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/upload:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                                    <Plus className="text-brand-300" size={32} />
                                                    <span className="text-[8px] font-black text-brand-400 uppercase tracking-widest italic text-center px-4">UPLOAD SIGNATURE</span>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={handleSignatureChange}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                        )}
                    </div>
                </div>

                {/* ── MINIMALIST FOOTER ── */}
                <div className="px-3 md:px-12 py-3 md:py-6 bg-brand-950/40 md:bg-white border-t border-brand-50/10 md:border-brand-50 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-6 shrink-0 relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                    <div className="flex gap-4 md:gap-6 w-full md:w-auto overflow-x-auto custom-scrollbar-hide pb-2 md:pb-0">
                        <div className="min-w-[140px]">
                            <label className="block text-[7px] font-black text-white/50 md:text-brand-950/20 uppercase tracking-[0.4em] mb-1 italic leading-none">VERIFIED_COACH</label>
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-b border-white/20 md:border-brand-100 py-1 md:py-2 text-sm font-black text-white md:text-brand-950 focus:border-brand-accent outline-none italic uppercase transition-colors" 
                                value={form.coachName} 
                                onChange={e => setForm({...form, coachName: e.target.value})} 
                            />
                        </div>
                        <div className="min-w-[120px]">
                            <label className="block text-[7px] font-black text-white/50 md:text-brand-950/20 uppercase tracking-[0.4em] mb-1 italic leading-none">DATE_STAMP</label>
                            <input 
                                type="date" 
                                className="w-full bg-transparent border-b border-white/20 md:border-brand-100 py-1 md:py-2 text-sm font-black text-white md:text-brand-950 focus:border-brand-accent outline-none italic uppercase transition-colors" 
                                value={form.evaluationDate} 
                                onChange={e => setForm({...form, evaluationDate: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex flex-1 md:flex-none gap-3">
                            {activeStep > 0 && (
                                <button 
                                    onClick={() => setActiveStep(prev => prev - 1)}
                                    className="px-6 py-4 bg-white border border-brand-100 text-brand-950 font-black rounded-xl transition-all text-[9px] uppercase tracking-widest italic flex items-center justify-center gap-2 hover:bg-brand-50"
                                >
                                    BACK
                                </button>
                            )}
                            {activeStep < STEPS.length - 1 ? (
                                <button 
                                    onClick={() => setActiveStep(prev => prev + 1)}
                                    className="flex-1 md:flex-none px-10 py-4 bg-brand-950 text-white font-black rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-[9px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 italic"
                                >
                                    NEXT
                                    <ChevronRight size={14} />
                                </button>
                            ) : (
                                <button 
                                    onClick={handleSave} 
                                    className="flex-1 md:flex-none px-10 py-4 bg-brand-accent text-brand-950 font-black rounded-xl shadow-[0_10px_30px_rgba(195,246,41,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-[9px] uppercase tracking-[0.4em] flex items-center justify-center gap-3 italic"
                                >
                                    <SaveAll size={16} />
                                    SAVE EVALUATION
                                </button>
                            )}
                        </div>
                        <div className="h-10 w-[1px] bg-brand-100 mx-2 hidden md:block" />
                        <button 
                            onClick={() => {
                                setIsEditing(false);
                                setActiveStep(0);
                            }} 
                            className="p-4 text-brand-950/20 hover:text-brand-950 transition-all font-black text-[9px] uppercase italic tracking-widest"
                        >
                            DISCARD
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>

    {/* MODALS & OVERLAYS */}
    {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 text-left">
            <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-xl" onClick={() => setShowDeleteConfirm(null)} />
            <div className="relative w-full max-w-md bg-white border border-brand-100/50 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mb-8 border border-red-100">
                        <Trash2 size={32} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-brand-950 italic uppercase tracking-tighter mb-4">DELETE_REPORT?</h3>
                    <p className="text-sm text-brand-950/50 leading-relaxed mb-10">
                        This will clear the active metrics and images. Past history remains unless you choose to wipe all.
                    </p>

                    <div className="flex flex-col gap-4 w-full">
                        <button 
                            onClick={() => handleDeleteEvaluation(showDeleteConfirm)}
                            disabled={isDeleting}
                            className="w-full py-5 bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] italic hover:bg-red-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            CONFIRM_DELETE
                        </button>
                        
                        <button 
                            onClick={async () => {
                                setIsDeleting(true);
                                await StorageService.clearEvaluationHistory(showDeleteConfirm);
                                await handleDeleteEvaluation(showDeleteConfirm);
                                setShowDeleteConfirm(null);
                            }}
                            disabled={isDeleting}
                            className="w-full py-5 bg-white border border-red-100 text-red-500 font-black rounded-2xl uppercase tracking-widest text-[10px] italic hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
                        >
                            WIPE_ENTIRE_HISTORY
                        </button>

                        <button 
                            onClick={() => setShowDeleteConfirm(null)}
                            className="w-full py-5 text-brand-950/30 font-black uppercase tracking-widest text-[10px] italic hover:text-brand-950 transition-all"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )}

    {showResetConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 text-left">
            <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-xl" onClick={() => setShowResetConfirm(false)} />
            <div className="relative w-full max-w-md bg-white border border-brand-100/50 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary" />
                
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary mb-8 border border-brand-primary/20">
                        <RefreshCcw size={32} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-brand-950 italic uppercase tracking-tighter mb-4">RESET_FORM?</h3>
                    <p className="text-sm text-brand-950/50 leading-relaxed mb-10">
                        Clear all current fields and images? This cannot be undone.
                    </p>

                    <div className="flex flex-col gap-4 w-full">
                        <button 
                            onClick={resetForm}
                            className="w-full py-5 bg-brand-950 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] italic hover:bg-black transition-all active:scale-95"
                        >
                            YES_START_FRESH
                        </button>
                        
                        <button 
                            onClick={() => setShowResetConfirm(false)}
                            className="w-full py-5 text-brand-950/30 font-black uppercase tracking-widest text-[10px] italic hover:text-brand-950 transition-all"
                        >
                            NO_KEEP_DATA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )}
        {/* SCOUT REPORT PREVIEW MODAL */}
        {previewPlayer && (
            <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 md:p-12 bg-brand-950/90 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto">
                <div className="w-full max-w-7xl min-h-full flex flex-col justify-center animate-in zoom-in-95 duration-500">
                    <EvaluationCard 
                        player={previewPlayer} 
                        settings={StorageService.getSettings()} 
                        attendance={StorageService.getAttendance().filter(a => a.playerId === previewPlayer.id)}
                        matches={StorageService.getMatches()}
                        onClose={() => setPreviewPlayer(null)}
                        isCoach={true}
                    />
                </div>
            </div>
        )}
    </>
  );
};

export default EvaluationManager;
