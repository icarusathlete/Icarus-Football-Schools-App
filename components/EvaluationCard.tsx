import React, { useRef, useState, useEffect } from 'react';
import { Player, AcademySettings, PlayerEvaluation, AttendanceRecord, Match } from '../types';
import { Shield, Download, Loader2, Award, X, Camera, RefreshCcw, Edit2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';

interface EvaluationCardProps {
  player: Player;
  settings: AcademySettings;
  attendance?: AttendanceRecord[];
  matches?: Match[];
  onClose?: () => void;
  isCoach?: boolean;
}

// Format date strictly according to professional standards
const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return 'UNKNOWN';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
};

const getFirstName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(' ');
};

const getLastName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    if (parts.length === 1) return '';
    return parts[parts.length - 1];
};

const toTitleCase = (str: string) => {
    return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

// V4 Progress Bar for stats
// For time-based metrics (inverse=true): lower time = better = more fill.
// fill% = (max - value) / max * 100, clamped 0-100.
const V4ProgressBar = ({ label, value, max = 100, inverse = false, unit = '', color = '#C8FF00' }: { label: string, value: number, max?: number, inverse?: boolean, unit?: string, color?: string }) => {
    const percentage = inverse
        ? Math.max(0, Math.min(100, ((max - value) / max) * 100))
        : Math.max(0, Math.min(100, (value / max) * 100));

    return (
        <div className="flex items-center justify-between mb-[12px]">
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontFamily: 'Inter,sans-serif', maxWidth: '44%', lineHeight: 1.2 }}>{label}</span>
            <div className="flex items-center gap-3 flex-1 justify-end">
                <div style={{ height: '8px', flex: 1, maxWidth: '140px', background: 'rgba(30,60,160,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '4px', width: `${percentage}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}66` }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'white', fontFamily: 'Oswald,sans-serif', width: '36px', textAlign: 'right' }}>{value}{unit}</span>
            </div>
        </div>
    );
};

export const EvaluationCard: React.FC<EvaluationCardProps> = ({ player, settings, attendance = [], matches = [], onClose, isCoach }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(player?.evaluation?.aiReport || null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [editedRemarks, setEditedRemarks] = useState<string>(player?.evaluation?.coachRemarks || player?.evaluation?.aiReport || '');
  const evalData = player?.evaluation;
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (wrapperRef.current) {
        const containerWidth = wrapperRef.current.clientWidth;
        const newScale = Math.min(1, containerWidth / 1600);
        setScale(newScale);
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);
  
  useEffect(() => {
    if (evalData?.aiReport) {
      setAiReport(evalData.aiReport);
      if (!editedRemarks) setEditedRemarks(evalData.coachRemarks || evalData.aiReport || '');
    } else if (evalData && !aiReport && player?.id && !isLoadingAI) {
      handleGenerateAIReport();
    }
  }, [player?.id, evalData?.aiReport]);

  const handleGenerateAIReport = async (manual = false) => {
    if (isLoadingAI) return;
    setIsLoadingAI(true);
    try {
      const report = await GeminiService.generateReportCard(player, attendance, matches);
      setAiReport(report);
      
      if (manual || !player.evaluation?.coachRemarks) {
        setEditedRemarks(report);
      }

      if (player.evaluation) {
        const updatedPlayer: Player = {
          ...player,
          evaluation: { ...player.evaluation, aiReport: report }
        };
        await StorageService.updatePlayer(updatedPlayer);
        window.dispatchEvent(new CustomEvent('academy_data_update'));
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSaveRemarks = async () => {
    if (!player.evaluation) return;
    
    try {
      const updatedPlayer: Player = {
        ...player,
        evaluation: { 
          ...player.evaluation, 
          coachRemarks: editedRemarks 
        }
      };
      await StorageService.updatePlayer(updatedPlayer);
      setIsEditingRemarks(false);
      window.dispatchEvent(new CustomEvent('academy_data_update'));
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleDownloadPDF = async () => {
    const element = cardRef.current;
    if (!element) return;
    setIsGenerating(true);

    try {
        const canvas = await html2canvas(element, {
            scale: 3, 
            useCORS: true,
            backgroundColor: '#080C28',
            logging: false,
            width: 1600,
            height: 1000,
            windowWidth: 1600,
            windowHeight: 1000,
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.querySelector('[data-report-container="true"]') as HTMLElement;
                if (clonedElement) {
                    clonedElement.style.transform = 'none';
                    clonedElement.style.position = 'relative';
                    clonedElement.style.margin = '0';
                    clonedElement.style.border = 'none';
                    
                    const elements = clonedElement.querySelectorAll('*');
                    elements.forEach((el) => {
                        (el as HTMLElement).style.opacity = '1';
                    });
                }
            }
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [1600, 1000],
            hotfixes: ['px_scaling']
        });

        pdf.addImage(imgData, 'PNG', 0, 0, 1600, 1000);
        pdf.save(`${player?.fullName?.replace(/\s+/g, '_')}_SCOUT_DOSSIER.pdf`);
    } catch (error) {
        console.error("PDF Generation failed:", error);
    } finally {
        setIsGenerating(false);
    }
  };

  if (!player || !evalData) return null;

  return (
    <div className="space-y-6">
        {/* Controls Header (Not part of PDF) */}
        <div className="flex justify-between items-center bg-[#07102A]/80 backdrop-blur-2xl p-6 rounded-[1.5rem] border border-white/10 shadow-2xl">
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    <Shield className="text-[#C8FF00]" size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Premium Dossier Render</h2>
                    <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Export Management</p>
                </div>
            </div>
            <div className="flex gap-4">
                {isCoach && (
                    <button onClick={() => handleGenerateAIReport(true)} disabled={isLoadingAI} className="bg-white/5 text-white/70 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 hover:bg-white/10 transition-all border border-white/5">
                        {isLoadingAI ? <Loader2 className="animate-spin" size={16}/> : <RefreshCcw size={16} />} REGENERATE AI
                    </button>
                )}
                {isCoach && (
                    <button 
                        onClick={() => setIsEditingRemarks(!isEditingRemarks)} 
                        className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all border ${isEditingRemarks ? 'bg-white text-black border-white' : 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10'}`}
                    >
                        {isEditingRemarks ? <X size={16}/> : <Edit2 size={16} />} 
                        {isEditingRemarks ? 'CANCEL EDIT' : 'EDIT VERDICT'}
                    </button>
                )}
                <button onClick={handleDownloadPDF} disabled={isGenerating} className="bg-[#C8FF00] text-[#050E25] px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 hover:opacity-90 transition-all shadow-lg">
                    {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Download size={18}/>} EXPORT PDF
                </button>
                {onClose && (
                    <button onClick={onClose} className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all ml-2">
                        <X size={24} />
                    </button>
                )}
            </div>
        </div>

        {/* --- THE DOSSIER (1600x1000 LANDSCAPE AREA) --- */}
        <div ref={wrapperRef} className="w-full flex justify-center overflow-hidden rounded-[1.5rem] border" style={{ height: `${1000 * scale}px`, background: '#080C28', borderColor: 'rgba(60,100,255,0.25)' }}>
            <div style={{ width: `${1600 * scale}px`, height: `${1000 * scale}px`, position: 'relative' }}>
                <style>
                    {`
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Oswald:wght@400;500;600;700&display=swap');
                        .v4-dossier {
                            font-family: 'Inter', sans-serif;
                            background: linear-gradient(140deg, #080C28 0%, #0D1545 55%, #0A1235 100%);
                        }
                        .v4-noise {
                            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                            opacity: 0.04;
                            mix-blend-mode: overlay;
                        }
                        .v4-pitch-lines {
                            background-image: url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' viewBox='0 0 100 65' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='100' height='65' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cline x1='50' y1='0' x2='50' y2='65' stroke='white' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='32.5' r='9.15' fill='none' stroke='white' stroke-width='0.5'/%3E%3Crect x='0' y='13.84' width='16.5' height='37.32' fill='none' stroke='white' stroke-width='0.5'/%3E%3Crect x='83.5' y='13.84' width='16.5' height='37.32' fill='none' stroke='white' stroke-width='0.5'/%3E%3Crect x='0' y='24.84' width='5.5' height='15.32' fill='none' stroke='white' stroke-width='0.5'/%3E%3Crect x='94.5' y='24.84' width='5.5' height='15.32' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E");
                            background-repeat: no-repeat;
                            background-size: cover;
                        }
                    `}
                </style>
                <div 
                    ref={cardRef} 
                    data-report-container="true"
                    className="w-[1600px] min-w-[1600px] h-[1000px] v4-dossier overflow-hidden relative"
                    style={{ 
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                >
                    {/* LAYER 1: Base color applied via v4-dossier class */}

                    {/* LAYER 2: Pitch texture — 11% opacity, clearly visible as design element */}
                    <div className="absolute w-[60%] h-[80%] bottom-[-10%] right-[-10%] v4-pitch-lines opacity-[0.11] pointer-events-none z-[1]" style={{ transform: 'rotate(12deg)' }} />

                    {/* LAYER 3: Atmospheric lighting */}
                    {/* Blue-royal bloom — fills center of card */}
                    <div className="absolute w-[1100px] h-[1100px] rounded-full pointer-events-none z-[1]" style={{ background: 'radial-gradient(circle, rgba(40,80,220,0.22) 0%, transparent 60%)', top: '50%', left: '45%', transform: 'translate(-50%, -50%)' }} />
                    {/* Lime accent bloom — sits behind photo bottom edge */}
                    <div className="absolute w-[700px] h-[700px] rounded-full pointer-events-none z-[1]" style={{ background: 'radial-gradient(circle, rgba(200,255,0,0.1) 0%, transparent 60%)', top: '75%', left: '45%', transform: 'translate(-50%, -50%)' }} />
                    {/* Cyan bloom — right data panel */}
                    <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-[1]" style={{ background: 'radial-gradient(circle, rgba(0,150,255,0.12) 0%, transparent 70%)', top: '30%', left: '88%', transform: 'translate(-50%, -50%)' }} />

                    {/* LAYER 4: Vignette */}
                    <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: 'radial-gradient(ellipse at center, transparent 25%, rgba(4,6,20,0.65) 110%)' }} />

                    {/* LAYER 5: Grain */}
                    <div className="absolute inset-0 v4-noise pointer-events-none z-[1]" />


                    {/* ═══ LEFT COLUMN — FIFA card + identity + stat circles (Z:8-9) ═══ */}
                    {/* Thin vertical separator — blue tint */}
                    <div className="absolute z-[3] pointer-events-none" style={{ left: '22%', top: '64px', bottom: '52px', width: '1px', background: 'linear-gradient(180deg, transparent 0%, rgba(60,100,255,0.2) 20%, rgba(60,100,255,0.15) 80%, transparent 100%)' }} />

                    {/* Player name + metadata block — directly below FIFA card */}
                    <div className="absolute left-[1.5%] flex flex-col z-[8]" style={{ top: '450px', width: '340px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ padding: '4px 12px', background: '#C8FF00', color: '#050E25', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', borderRadius: '4px', fontFamily: 'Inter,sans-serif', letterSpacing: '0.08em' }}>{player.position || 'TBD'}</span>
                            <div style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,0.15)' }} />
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter,sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>#{player.memberId || '—'}</span>
                        </div>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter,sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>{toTitleCase(getFirstName(player.fullName))}</span>
                        <span style={{ fontSize: '30px', color: 'white', fontFamily: 'Oswald,sans-serif', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', lineHeight: 1.05 }}>{toTitleCase(getLastName(player.fullName))}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                            <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter,sans-serif' }}>HT: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{evalData.height || '--'}cm</strong></span>
                            <span style={{ color: 'rgba(200,255,0,0.5)', fontSize: '10px' }}>·</span>
                            <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter,sans-serif' }}>WT: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{evalData.weight || '--'}kg</strong></span>
                            <span style={{ color: 'rgba(200,255,0,0.5)', fontSize: '10px' }}>·</span>
                            <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter,sans-serif' }}>DOB: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{formatDate(player.dateOfBirth)}</strong></span>
                        </div>
                    </div>

                    {/* 6 STAT CIRCLE BADGES — blue-tinted 3-col grid in left column */}
                    <div className="absolute z-[8] pointer-events-none" style={{ left: '1.5%', bottom: '64px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '348px' }}>
                        {[
                            { label: 'PASSING',  value: evalData.metrics?.passing || 0,   color: '#C8FF00' },
                            { label: 'JUGGLING', value: evalData.metrics?.juggling || 0,  color: '#C8FF00' },
                            { label: 'SHOOTING', value: evalData.metrics?.shooting || 0,  color: '#C8FF00' },
                            { label: 'BEEP TEST',value: evalData.metrics?.beepTest || 0,  color: '#00D4FF' },
                            { label: 'WEAK FOOT',value: evalData.metrics?.weakFoot || 0,  color: '#00D4FF' },
                            { label: 'DRIBBLING',value: evalData.timeTrials?.dribbling || 0, color: '#00D4FF' },
                        ].map((s, i) => (
                            <div key={i} style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                aspectRatio: '1',
                                borderRadius: '50%',
                                background: `radial-gradient(circle at 38% 32%, ${s.color}18 0%, rgba(8,14,50,0.7) 70%)`,
                                border: `1.5px solid ${s.color}45`,
                                boxShadow: `0 0 20px ${s.color}20, inset 0 0 16px rgba(20,40,120,0.3)`,
                            }}>
                                <span style={{ fontSize: '30px', fontWeight: 800, color: s.color, fontFamily: 'Oswald,sans-serif', lineHeight: 1 }}>{s.value}</span>
                                <span style={{ fontSize: '8px', color: 'rgba(180,200,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center', fontFamily: 'Inter,sans-serif', marginTop: '5px' }}>{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Vertical watermark (Z:2) */}
                    <div className="absolute pointer-events-none z-[2]" style={{
                        right: '0.5%', top: '50%', transform: 'translateY(-50%) rotate(90deg)',
                        transformOrigin: 'center center', whiteSpace: 'nowrap',
                        fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.05)',
                        textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', fontWeight: 600,
                    }}>ICARUS FOOTBALL SCHOOLS</div>

                    {/* GLASS DATA PANEL (Z: 7) — royal blue glassmorphism */}
                    <div className="absolute right-[2%] top-[72px] w-[28%] backdrop-blur-[16px] rounded-[16px] p-[24px] flex flex-col gap-[14px] z-[7]" style={{ bottom: '60px', background: 'rgba(10,18,60,0.6)', border: '1px solid rgba(60,100,255,0.2)', boxShadow: 'inset 0 0 40px rgba(20,50,180,0.08), 0 8px 32px rgba(0,0,0,0.4)' }}>
                        {/* Technical Profile */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-[16px] h-[2px] bg-[#C8FF00]" />
                                <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,255,0,0.7)', fontFamily: 'Inter,sans-serif' }}>TECHNICAL PROFILE</span>
                            </div>
                            <div className="flex flex-col">
                                <V4ProgressBar label="PASSING ACCURACY" value={evalData.metrics?.passing || 0} />
                                <V4ProgressBar label="SHOOTING" value={evalData.metrics?.shooting || 0} />
                                <V4ProgressBar label="TECHNICAL CONTROL" value={evalData.metrics?.juggling || 0} />
                                <V4ProgressBar label="WEAK FOOT" value={evalData.metrics?.weakFoot || 0} />
                                <V4ProgressBar label="FIRST TOUCH" value={Math.round(((evalData.metrics?.passing||0) + (evalData.metrics?.juggling||0))/2)} />
                                <V4ProgressBar label="TACTICAL AWARENESS" value={Math.round((evalData.metrics?.passing||0) * 0.9)} />
                            </div>
                        </div>
                        <div className="h-[1px] w-full" style={{ background: 'rgba(60,100,255,0.15)' }} />

                        {/* Physical Metrics */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-[16px] h-[2px] bg-[#00D4FF]" />
                                <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.7)', fontFamily: 'Inter,sans-serif' }}>PHYSICAL METRICS</span>
                            </div>
                            <div className="flex flex-col">
                                <V4ProgressBar label="SPRINT SPEED" value={evalData.timeTrials?.speed || 0} max={35} inverse unit="s" color="#00D4FF" />
                                <V4ProgressBar label="AGILITY" value={evalData.timeTrials?.agility || 0} max={30} inverse unit="s" color="#00D4FF" />
                                <V4ProgressBar label="DRIBBLING" value={evalData.timeTrials?.dribbling || 0} max={40} inverse unit="s" color="#00D4FF" />
                                <V4ProgressBar label="ENDURANCE" value={evalData.metrics?.beepTest || 0} max={100} unit="" color="#00D4FF" />
                            </div>
                        </div>
                        <div className="h-[1px] w-full" style={{ background: 'rgba(60,100,255,0.15)' }} />

                        {/* Development Priorities — compact */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-[16px] h-[2px] bg-[#C8FF00]" />
                                <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,255,0,0.7)', fontFamily: 'Inter,sans-serif' }}>DEVELOPMENT AREAS</span>
                            </div>
                            <ul className="flex flex-col gap-[7px] mb-3">
                                {(evalData.developmentAreas?.length ? evalData.developmentAreas : ['Requires tactical maturation', 'Positional discipline']).slice(0, 3).map((area, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span style={{ color: '#C8FF00', fontSize: '10px', lineHeight: 1.4, marginTop: '1px' }}>▸</span>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, fontFamily: 'Inter,sans-serif' }}>{area}</span>
                                    </li>
                                ))}
                            </ul>
                            {/* Progression dots */}
                            <div className="flex items-center gap-3">
                                <span style={{ fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter,sans-serif' }}>LEVEL</span>
                                <div className="flex gap-[5px]">
                                    {[1,2,3,4,5].map(i => (
                                        <div key={i} style={{ width: '22px', height: '5px', borderRadius: '3px', background: i <= 3 ? '#C8FF00' : 'rgba(255,255,255,0.1)', boxShadow: i <= 3 ? '0 0 6px #C8FF0066' : 'none' }} />
                                    ))}
                                </div>
                                <span style={{ fontSize: '8px', fontWeight: 700, color: '#C8FF00', fontFamily: 'Oswald,sans-serif' }}>3/5</span>
                            </div>
                        </div>
                        <div className="h-[1px] w-full" style={{ background: 'rgba(60,100,255,0.15)' }} />

                        {/* ABILITY RADAR CHART — fills empty space */}
                        {(() => {
                            const cx = 100, cy = 100, r = 78;
                            const attrs = [
                                { label: 'PASSING',  value: Math.min(100, evalData.metrics?.passing  || 0) },
                                { label: 'SHOOTING', value: Math.min(100, evalData.metrics?.shooting || 0) },
                                { label: 'CONTROL',  value: Math.min(100, evalData.metrics?.juggling || 0) },
                                { label: 'WEAK FOOT',value: Math.min(100, evalData.metrics?.weakFoot || 0) },
                                { label: 'PHYSICAL', value: Math.min(100, evalData.metrics?.beepTest  || 0) },
                            ];
                            const n = attrs.length;
                            const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
                            const pt = (i: number, radius: number) => ({
                                x: cx + radius * Math.cos(angle(i)),
                                y: cy + radius * Math.sin(angle(i)),
                            });
                            const rings = [0.25, 0.5, 0.75, 1.0];
                            const dataPath = attrs.map((a, i) => {
                                const p = pt(i, (a.value / 100) * r);
                                return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                            }).join(' ') + 'Z';
                            return (
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-[16px] h-[2px]" style={{ background: 'linear-gradient(90deg, #C8FF00, #00D4FF)' }} />
                                        <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter,sans-serif' }}>ABILITY RADAR</span>
                                    </div>
                                    <div className="flex items-center justify-center flex-1" style={{ minHeight: '220px' }}>
                                        <svg width="200" height="200" viewBox="0 0 200 200">
                                            {/* Grid rings */}
                                            {rings.map((ring, ri) => {
                                                const pts = attrs.map((_, i) => pt(i, r * ring));
                                                const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
                                                return <path key={ri} d={d} fill="none" stroke={ri === 3 ? 'rgba(200,255,0,0.2)' : 'rgba(255,255,255,0.07)'} strokeWidth={ri === 3 ? 1.5 : 1} />;
                                            })}
                                            {/* Axis lines */}
                                            {attrs.map((_, i) => {
                                                const p = pt(i, r);
                                                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
                                            })}
                                            {/* Data fill */}
                                            <path d={dataPath} fill="rgba(200,255,0,0.1)" stroke="#C8FF00" strokeWidth="1.5" strokeLinejoin="round" />
                                            {/* Data dots */}
                                            {attrs.map((a, i) => {
                                                const p = pt(i, (a.value / 100) * r);
                                                return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#C8FF00" stroke="#080C28" strokeWidth="1.5" />;
                                            })}
                                            {/* Axis labels with values */}
                                            {attrs.map((a, i) => {
                                                const lp = pt(i, r + 16);
                                                return (
                                                    <g key={i}>
                                                        <text x={lp.x} y={lp.y - 5} textAnchor="middle"
                                                            style={{ fontSize: '7px', fill: 'rgba(255,255,255,0.5)', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                            {a.label}
                                                        </text>
                                                        <text x={lp.x} y={lp.y + 7} textAnchor="middle"
                                                            style={{ fontSize: '9px', fill: '#C8FF00', fontFamily: 'Oswald,sans-serif', fontWeight: 700 }}>
                                                            {a.value}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                            {/* Center label */}
                                            <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: '18px', fill: 'white', fontFamily: 'Oswald,sans-serif', fontWeight: 700 }}>{evalData.overallRating}</text>
                                            <text x={cx} y={cy + 9} textAnchor="middle" style={{ fontSize: '7px', fill: 'rgba(255,255,255,0.35)', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>OVERALL</text>
                                        </svg>
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="h-[1px] w-full" style={{ background: 'rgba(255,255,255,0.1)' }} />

                        {/* Evaluator's Assessment — flex-1 fills remainder */}
                        <div className="rounded-[10px] p-[14px] flex flex-col border" style={{ flex: 1, minHeight: '100px', background: 'rgba(6,14,50,0.6)', borderColor: 'rgba(60,100,255,0.18)' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-[16px] h-[2px] bg-[#00D4FF]" />
                                <span style={{ fontSize: '8px', color: 'rgba(0,212,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, fontFamily: 'Inter,sans-serif' }}>EVALUATOR'S ASSESSMENT</span>
                            </div>
                            <div className="flex-1 overflow-hidden" style={{ fontSize: '11.5px', fontStyle: 'italic', lineHeight: 1.65, color: 'rgba(255,255,255,0.78)', fontFamily: 'Inter,sans-serif' }}>
                                {isEditingRemarks ? (
                                    <div className="space-y-3 h-full flex flex-col">
                                        <textarea
                                            className="w-full flex-1 bg-black/30 border border-white/20 rounded-lg p-2 text-[11px] text-white/90 focus:border-[#C8FF00] outline-none resize-none transition-all"
                                            value={editedRemarks}
                                            onChange={(e) => setEditedRemarks(e.target.value)}
                                            placeholder="Enter professional assessment..."
                                        />
                                        <button
                                            onClick={handleSaveRemarks}
                                            className="w-full py-2 bg-[#C8FF00] text-[#050E25] rounded-lg text-[10px] font-bold uppercase hover:bg-white transition-all"
                                        >
                                            Save Assessment
                                        </button>
                                    </div>
                                ) : evalData.coachRemarks ? (
                                    <span>{evalData.coachRemarks}</span>
                                ) : (
                                    <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No assessment recorded for this evaluation.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* HEADER BAR (Z: 6) — royal blue gradient */}
                    <div className="absolute top-0 left-0 right-0 h-[64px] px-8 flex justify-between items-center z-[6]" style={{ background: 'linear-gradient(90deg, #060A22 0%, #0D1545 40%, #091030 100%)', borderBottom: '1.5px solid rgba(60,120,255,0.35)' }}>
                        <div className="flex items-center gap-4">
                            <div style={{ width: '3px', height: '28px', background: 'linear-gradient(180deg, #00D4FF, #0044FF)', borderRadius: '2px' }} />
                            <Shield className="text-[#00D4FF] h-[22px] w-[22px]" />
                            <div>
                                <div style={{ fontSize: '13px', color: 'white', fontFamily: 'Oswald,sans-serif', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>ICARUS FOOTBALL SCHOOLS</div>
                                <div style={{ fontSize: '9px', color: 'rgba(0,212,255,0.7)', fontFamily: 'Inter,sans-serif', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '1px' }}>PLAYER SCOUTING REPORT</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-5">
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter,sans-serif', letterSpacing: '0.12em' }}>DOC REF: ICR-{player.memberId || '0000'}-{new Date().getFullYear()}</span>
                            <div style={{ padding: '4px 12px', background: 'rgba(139,0,0,0.8)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: '20px' }}>
                                <span style={{ fontSize: '8px', color: 'white', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>CONFIDENTIAL</span>
                            </div>
                        </div>
                    </div>

                    {/* BIO STRIP BAR (Z: 5) — royal blue tint */}
                    <div className="absolute bottom-0 left-0 right-0 h-[52px] backdrop-blur-[12px] border-t px-8 flex justify-between items-center z-[5]" style={{ background: 'rgba(6,10,35,0.85)', borderColor: 'rgba(60,100,255,0.25)' }}>
                        <div className="flex items-center gap-5">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">HT:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{evalData.height || '--'}CM</span>
                            </div>
                            <span className="text-[#C8FF00] text-[10px]">·</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">WT:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{evalData.weight || '--'}KG</span>
                            </div>
                            <span className="text-[#C8FF00] text-[10px]">·</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">DATE OF BIRTH:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{formatDate(player.dateOfBirth)}</span>
                            </div>
                            <span className="text-[#C8FF00] text-[10px]">·</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">ACADEMY:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{settings.name || 'ICARUS FOOTBALL SCHOOLS'}</span>
                            </div>
                            <span className="text-[#C8FF00] text-[10px]">·</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">BATCH:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{player.dateOfBirth ? `U-${new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear()}` : 'U-12'}</span>
                            </div>
                            <span className="text-[#C8FF00] text-[10px]">·</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">LOCATION:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">GAUR CITY, NOIDA</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">ASSESSING COACH:</span>
                            <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{evalData.coachName || 'STAFF'}</span>
                            <span className="text-[#C8FF00] text-[10px] mx-1">·</span>
                            <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{formatDate(evalData.evaluationDate || new Date())}</span>
                        </div>
                    </div>

                    {/* PLAYER PHOTO — true center zone (Z: 4) */}
                    <div className="absolute z-[4] pointer-events-none flex justify-center items-end" style={{ left: '22%', right: '30%', top: '64px', bottom: '52px' }}>
                        {/* Ground glow — blue+lime dual */}
                        <div className="absolute bottom-0 left-1/2 pointer-events-none" style={{ transform: 'translateX(-50%) scaleY(0.2) translateY(60%)', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(40,80,255,0.35) 0%, transparent 55%)', borderRadius: '50%' }} />
                        <div className="absolute bottom-0 left-1/2 pointer-events-none" style={{ transform: 'translateX(-50%) scaleY(0.15) translateY(65%)', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(200,255,0,0.2) 0%, transparent 60%)', borderRadius: '50%' }} />
                        {player.actionPhotoUrl || player.scoutPhoto || evalData.actionPhotoUrl || evalData.actionImageUrl ? (
                            <img
                                src={player.actionPhotoUrl || player.scoutPhoto || evalData.actionPhotoUrl || evalData.actionImageUrl}
                                style={{ height: '100%', width: '100%', objectFit: 'contain', objectPosition: 'bottom center', position: 'relative', zIndex: 10, filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.6))' }}
                            />
                        ) : (
                            <div style={{ height: '60%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.18)', marginBottom: '20%' }}>
                                <Camera size={72} style={{ marginBottom: '16px' }} />
                                <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>NO ACTION PHOTO</span>
                            </div>
                        )}
                    </div>

                    {/* FIFA CARD — moved to top-left under header (Z: 9) */}
                    <div 
                        className="absolute w-[230px] h-[370px] overflow-hidden flex flex-col items-center z-[9]"
                        style={{ left: '2%', top: '64px', borderRadius: '14px', border: '1.5px solid rgba(0,212,255,0.5)', background: 'linear-gradient(160deg, rgba(0,30,80,0.85) 0%, rgba(0,8,30,0.95) 100%)', boxShadow: '0 0 40px rgba(0,212,255,0.25), inset 0 0 40px rgba(0,40,120,0.2)' }}
                    >
                        {/* Top section — rating + position */}
                        <div className="w-full relative flex flex-col px-[14px] pt-[12px] z-10" style={{ height: '42%' }}>
                            {/* Blue top accent bar */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #00D4FF, #0066FF)' }} />
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col items-start leading-none">
                                    <span style={{ fontSize: '64px', fontWeight: 700, color: '#C8FF00', fontFamily: 'Oswald,sans-serif', lineHeight: 1 }}>{evalData.overallRating}</span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#00D4FF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>{player.position || 'TBD'}</span>
                                </div>
                                <Shield className="text-[#00D4FF] h-[20px] w-[20px] absolute top-[14px] right-[14px]" />
                            </div>
                        </div>

                        {/* Middle Profile Photo */}
                        <div className="w-full h-[45%] absolute top-[30%] left-0">
                            <img src={player.headshotUrl || player.photoUrl || '/default-avatar.png'} className="w-full h-full object-cover object-top filter contrast-125" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        </div>

                        {/* Bottom info */}
                        <div className="w-full absolute bottom-0 left-0 flex flex-col justify-end items-center px-3 pb-3 pt-6" style={{ background: 'linear-gradient(to top, rgba(0,8,30,0.98) 60%, transparent)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.06em', lineHeight: 1.2 }}>{player.fullName}</span>
                            <div style={{ display: 'flex', gap: '2px', width: '100%', marginTop: '10px' }}>
                                {[{l:'PAC',v:Math.max(0,evalData.timeTrials?.speed?Math.round((35-evalData.timeTrials.speed)/35*99):0)},{l:'DRI',v:Math.max(0,evalData.metrics?.juggling||0)},{l:'SHO',v:Math.max(0,evalData.metrics?.shooting||0)},{l:'PAS',v:Math.max(0,evalData.metrics?.passing||0)}].map((s,i)=>(
                                    <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', background:'rgba(0,212,255,0.08)', borderRadius:'4px', padding:'4px 2px' }}>
                                        <span style={{ fontSize:'7px', color:'rgba(0,212,255,0.7)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.l}</span>
                                        <span style={{ fontSize:'13px', fontWeight:700, color:'white', fontFamily:'Oswald,sans-serif' }}>{s.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default EvaluationCard;
