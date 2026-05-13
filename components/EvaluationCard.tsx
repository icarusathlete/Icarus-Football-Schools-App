import React, { useRef, useState, useEffect } from 'react';
import { Player, AcademySettings, PlayerEvaluation, AttendanceRecord, Match } from '../types';
import { Shield, Download, Loader2, Award, X, Camera, RefreshCcw, Edit2, Zap, Target, Timer, Activity } from 'lucide-react';
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
        <div className="flex items-center justify-between mb-[12px] group/bar">
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontFamily: 'Inter,sans-serif', maxWidth: '44%', lineHeight: 1.2, letterSpacing: '0.05em' }}>{label}</span>
            <div className="flex items-center gap-3 flex-1 justify-end">
                <div style={{ height: '6px', flex: 1, maxWidth: '140px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ height: '100%', borderRadius: '3px', width: `${percentage}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}88`, transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)' }} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'white', fontFamily: 'Oswald,sans-serif', width: '42px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}{unit}</span>
            </div>
        </div>
    );
};

export const EvaluationCard: React.FC<EvaluationCardProps> = ({ player, settings, attendance = [], matches = [], onClose, isCoach }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(player?.evaluation?.aiReport || null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [editedRemarks, setEditedRemarks] = useState<string>(player?.evaluation?.coachRemarks || player?.evaluation?.aiReport || '');
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const evalData = player?.evaluation;
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    
    // Initial check
    onChange(mql);
    
    mql.addEventListener('change', onChange);
    
    const updateScale = () => {
      if (wrapperRef.current) {
        const containerWidth = wrapperRef.current.clientWidth;
        const isMobileDevice = window.innerWidth < 768;
        // Set a minimum scale so the report remains readable on mobile
        const minScale = isMobileDevice ? 0.45 : 0; 
        const newScale = Math.max(minScale, Math.min(1, containerWidth / 1600));
        setScale(newScale);
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', updateScale);
    };
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

  const [isSavingRemarks, setIsSavingRemarks] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveRemarks = async () => {
    if (!player.evaluation || isSavingRemarks) return;
    
    setIsSavingRemarks(true);
    try {
      const updatedPlayer: Player = {
        ...player,
        evaluation: { 
          ...player.evaluation, 
          coachRemarks: editedRemarks 
        }
      };
      await StorageService.updatePlayer(updatedPlayer);
      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditingRemarks(false);
        setSaveSuccess(false);
      }, 1000);
      window.dispatchEvent(new CustomEvent('academy_data_update'));
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSavingRemarks(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = pdfRef.current;
    if (!element) return;
    
    // Ensure the element is scrolled to top before capturing to avoid cutting/blank regions
    const originalScrollPos = window.scrollY;
    window.scrollTo(0, 0);

    setIsGenerating(true);

    try {
        // Wait for all images in the element to load
        const images = Array.from(element.querySelectorAll('img'));
        await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        }));

        // Allow some time for fonts to settle and animations to finish
        await new Promise(r => setTimeout(r, 1200));

        // Adjust scale based on screen size to prevent memory crashes on mobile
        const isMobile = window.innerWidth < 768;
        const canvasScale = isMobile ? 1.2 : 2;

        const canvas = await html2canvas(element, {
            scale: canvasScale,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#080C28',
            logging: false,
            windowWidth: 1600,
            windowHeight: 1000,
            width: 1600,
            height: 1000,
            x: 0,
            y: 0,
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.getElementById('premium-dossier-capture');
                if (clonedElement) {
                    clonedElement.style.transform = 'none';
                    clonedElement.style.opacity = '1';
                    clonedElement.style.display = 'block';
                    clonedElement.style.visibility = 'visible';
                    clonedElement.style.position = 'relative';
                    clonedElement.style.left = '0';
                    clonedElement.style.top = '0';
                    clonedElement.style.width = '1600px';
                    clonedElement.style.height = '1000px';
                }
            }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [1600, 1000]
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, 1600, 1000, undefined, 'FAST');
        const fileName = `${player?.fullName?.replace(/\s+/g, '_') || 'Player'}_SCOUT_REPORT.pdf`;

        // Use Blob approach for mobile compatibility (prevents base64 URL too large issues)
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        
        // Trigger download
        a.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 1000);

    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Failed to generate PDF. Please ensure all assets are loaded and try again.");
    } finally {
        setIsGenerating(false);
        window.scrollTo(0, originalScrollPos);
    }
  };

  if (!player || !evalData) return null;

  // --- MOBILE SCOUT VIEW (PORTRAIT OPTIMIZED) ---
  // --- PREMIUM DOSSIER CONTENT (Shared between On-Screen and PDF) ---
  const renderDossierContent = (isExport = false) => (
    <>
        <style>
            {`
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
                @keyframes scanline-subtle {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                .live-edit-scan {
                    position: relative;
                    overflow: hidden;
                }
                .live-edit-scan::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 100%;
                    background: linear-gradient(to bottom, transparent, rgba(204, 255, 0, 0.2), transparent);
                    animation: scanline-subtle 3s linear infinite;
                    pointer-events: none;
                }
            `}
        </style>
        <div 
            className="w-[1600px] min-w-[1600px] h-[1000px] v4-dossier overflow-hidden relative"
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

            {/* LAYER 6: HUD Scanning Line */}
            <div className="scout-hud-line" style={{ top: '15%', animation: 'scanline-subtle 8s linear infinite' }} />
            <div className="scout-hud-line" style={{ top: '85%', animation: 'scanline-subtle 12s linear infinite reverse' }} />


            {/* ═══ LEFT COLUMN — FIFA card + identity + stat circles (Z:8-9) ═══ */}
            {/* Thin vertical separator — blue tint */}
            <div className="absolute z-[3] pointer-events-none" style={{ left: '22%', top: '64px', bottom: '52px', width: '1px', background: 'linear-gradient(180deg, transparent 0%, rgba(60,100,255,0.2) 20%, rgba(60,100,255,0.15) 80%, transparent 100%)' }} />

            {/* Player name + metadata block — directly below FIFA card */}
            <div className="absolute left-[1.5%] flex flex-col z-[8]" style={{ top: '450px', width: '340px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ padding: '4px 12px', background: '#C8FF00', color: '#050E25', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', borderRadius: '4px', fontFamily: 'Inter,sans-serif', letterSpacing: '0.08em' }}>{player.position || 'TBD'}</span>
                    <div style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,0.15)' }} />
                    <span className="rank-badge" style={{ fontSize: '11px', fontWeight: 900, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.1em' }}>
                        {evalData.overallRating >= 90 ? 'LEGEND' : 
                         evalData.overallRating >= 85 ? 'ELITE PROSPECT' : 
                         evalData.overallRating >= 75 ? 'GOLD TALENT' : 'RISING STAR'}
                    </span>
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
                        <V4ProgressBar label="SPRINT SPEED" value={evalData.timeTrials?.speed || 0} max={10} inverse unit="s" color="#00D4FF" />
                        <V4ProgressBar label="AGILITY" value={evalData.timeTrials?.agility || 0} max={18} inverse unit="s" color="#00D4FF" />
                        <V4ProgressBar label="DRIBBLING" value={evalData.timeTrials?.dribbling || 0} max={22} inverse unit="s" color="#00D4FF" />
                        <V4ProgressBar label="ENDURANCE" value={evalData.metrics?.beepTest || 0} max={20} unit="" color="#00D4FF" />
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
                                        const lp = pt(i, r + 22);
                                        return (
                                            <g key={i}>
                                                <text x={lp.x} y={lp.y - 4} textAnchor="middle"
                                                    style={{ fontSize: '8px', fontWeight: 700, fill: 'rgba(255,255,255,0.85)', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    {a.label}
                                                </text>
                                                <text x={lp.x} y={lp.y + 8} textAnchor="middle"
                                                    style={{ fontSize: '11px', fill: '#C8FF00', fontFamily: 'Oswald,sans-serif', fontWeight: 800 }}>
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
                <div className={`rounded-[12px] p-[16px] flex flex-col border transition-all duration-500 ${isEditingRemarks ? 'ring-1 ring-[#00D4FF]/30 shadow-[0_0_30px_rgba(0,212,255,0.1)]' : ''}`} style={{ flex: 1, minHeight: '120px', background: 'rgba(6,14,50,0.65)', borderColor: isEditingRemarks ? 'rgba(0,212,255,0.4)' : 'rgba(60,100,255,0.18)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-[16px] h-[2px] transition-colors ${isEditingRemarks ? 'bg-[#00D4FF]' : 'bg-[#00D4FF]/60'}`} />
                            <span style={{ fontSize: '9px', color: isEditingRemarks ? '#00D4FF' : 'rgba(0,212,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>COACH'S ASSESSMENT</span>
                        </div>
                        {isEditingRemarks && !isExport && (
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] text-white/30 font-mono tracking-tighter uppercase">CHARACTER COUNT: {editedRemarks.length}</span>
                                <div className="w-[1px] h-3 bg-white/10" />
                                <div className="flex items-center gap-1.5 live-edit-scan px-2.5 py-1 rounded bg-[#CCFF00]/10 border border-[#CCFF00]/20 shadow-[0_0_10px_rgba(204,255,0,0.1)]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
                                    <span className="text-[8px] text-[#CCFF00] font-black tracking-[0.2em] uppercase">SAVING CHANGES</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden" style={{ fontSize: '14px', fontStyle: isEditingRemarks ? 'normal' : 'italic', lineHeight: 1.8, color: 'rgba(255,255,255,0.95)', fontFamily: 'Inter,sans-serif' }}>
                        {isEditingRemarks && !isExport ? (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="relative flex-1 group">
                                    <textarea
                                        className="w-full h-full bg-black/50 border border-white/10 rounded-xl p-5 text-[11.5px] text-white/95 focus:border-[#00D4FF]/60 focus:ring-2 focus:ring-[#00D4FF]/10 outline-none resize-none transition-all font-medium leading-relaxed placeholder:text-white/10 custom-scrollbar-tactical"
                                        value={editedRemarks}
                                        onChange={(e) => setEditedRemarks(e.target.value)}
                                        placeholder="Analyze player performance, tactical discipline, and growth trajectory..."
                                        spellCheck={false}
                                    />
                                    {/* Corner Accents for Textarea */}
                                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00D4FF]/40 rounded-tl-lg" />
                                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00D4FF]/40 rounded-tr-lg" />
                                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00D4FF]/40 rounded-bl-lg" />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00D4FF]/40 rounded-br-lg" />
                                </div>
                                <button
                                    onClick={handleSaveRemarks}
                                    disabled={isSavingRemarks || saveSuccess}
                                    className={`relative w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] transition-all overflow-hidden group/btn ${
                                        saveSuccess 
                                        ? 'bg-[#CCFF00] text-[#050E25]' 
                                        : 'bg-[#00D4FF] text-white hover:bg-white hover:text-[#050E25]'
                                    }`}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"></div>
                                    <div className="flex items-center justify-center gap-3">
                                        {isSavingRemarks ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : saveSuccess ? (
                                            <Zap size={14} fill="currentColor" />
                                        ) : (
                                            <Shield size={14} />
                                        )}
                                        {isSavingRemarks ? 'SAVING DATA...' : saveSuccess ? 'REPORT SAVED' : 'SAVE ASSESSMENT'}
                                    </div>
                                </button>
                            </div>
                        ) : (evalData.coachRemarks || editedRemarks) ? (
                            <span className="relative">
                                <span className="text-[#00D4FF] font-black mr-2">/</span>
                                {evalData.coachRemarks || editedRemarks}
                            </span>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-3 py-6 opacity-30">
                                <Activity size={32} />
                                <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Awaiting tactical debrief...</span>
                            </div>
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
            <div className="absolute z-[4] pointer-events-none flex justify-center items-end overflow-hidden" style={{ left: '22%', right: '30%', top: '64px', bottom: '52px' }}>
                {/* HUD Scanline Overlay */}
                <div className="absolute inset-0 pointer-events-none z-[11] opacity-[0.15]" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />
                
                {/* Tactical Corner Markers */}
                <div className="absolute top-[10%] left-[10%] w-12 h-12 border-t-2 border-l-2 border-[#00D4FF]/30 z-[12]" />
                <div className="absolute top-[10%] right-[10%] w-12 h-12 border-t-2 border-r-2 border-[#00D4FF]/30 z-[12]" />
                <div className="absolute bottom-[10%] left-[10%] w-12 h-12 border-b-2 border-l-2 border-[#00D4FF]/30 z-[12]" />
                <div className="absolute bottom-[10%] right-[10%] w-12 h-12 border-b-2 border-r-2 border-[#00D4FF]/30 z-[12]" />

                {/* Ground glow — blue+lime dual */}
                <div className="absolute bottom-0 left-1/2 pointer-events-none" style={{ transform: 'translateX(-50%) scaleY(0.2) translateY(60%)', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(40,80,255,0.4) 0%, transparent 60%)', borderRadius: '50%' }} />
                <div className="absolute bottom-0 left-1/2 pointer-events-none" style={{ transform: 'translateX(-50%) scaleY(0.15) translateY(65%)', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(200,255,0,0.25) 0%, transparent 65%)', borderRadius: '50%' }} />
                
                {player.actionPhotoUrl || evalData.actionPhotoUrl || player.scoutPhoto ? (
                    <div className="relative w-full h-full flex items-end justify-center">
                        <img
                            src={player.actionPhotoUrl || evalData.actionPhotoUrl || player.scoutPhoto}
                            crossOrigin="anonymous"
                            className="h-[102%] w-auto object-contain object-bottom relative z-10"
                            style={{ filter: 'drop-shadow(0 0 50px rgba(0,0,0,0.9)) contrast(1.15) saturate(1.15) brightness(1.05)' }}
                        />
                        {/* Shadow mask to blend feet with floor */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#080C28] to-transparent z-[11] opacity-60" />
                    </div>
                ) : (
                    <div style={{ height: '60%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.18)', marginBottom: '20%' }}>
                        <Camera size={72} style={{ marginBottom: '16px' }} />
                        <span style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>PHOTO NOT FOUND</span>
                    </div>
                )}

                {/* Target Lock UI */}
                <div className="absolute top-[25%] left-[20%] z-[15] flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#00D4FF] animate-pulse" />
                        <span className="text-[8px] text-white font-black tracking-widest uppercase">ID: {player.memberId || 'UNKNOWN'}</span>
                    </div>
                    <div className="w-16 h-[1px] bg-white/20" />
                    <span className="text-[7px] text-white/40 font-mono">X: 42.12 | Y: 88.04</span>
                </div>
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
                    <img 
                        src={player.headshotUrl || player.photoUrl || '/default-avatar.png'} 
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover object-top filter contrast-125" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Bottom info */}
                <div className="w-full absolute bottom-0 left-0 flex flex-col justify-end items-center px-3 pb-3 pt-6" style={{ background: 'linear-gradient(to top, rgba(0,8,30,0.98) 60%, transparent)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.06em', lineHeight: 1.2 }}>{player.fullName}</span>
                    <div style={{ display: 'flex', gap: '2px', width: '100%', marginTop: '10px' }}>
                        {[
                            {l:'PAC', v: Math.max(0, evalData.timeTrials?.speed ? Math.round((10 - evalData.timeTrials.speed) / 10 * 99) : 0)},
                            {l:'DRI', v: Math.max(0, Math.round(((evalData.metrics?.juggling || 0) + (evalData.timeTrials?.dribbling ? Math.round((22 - evalData.timeTrials.dribbling) / 22 * 99) : 0)) / 2))},
                            {l:'SHO', v: Math.max(0, evalData.metrics?.shooting || 0)},
                            {l:'PAS', v: Math.max(0, evalData.metrics?.passing || 0)}
                        ].map((s, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0, 212, 255, 0.12)', border: '1px solid rgba(0, 212, 255, 0.15)', borderRadius: '6px', padding: '6px 2px' }}>
                                <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(0, 212, 255, 0.9)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.l}</span>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: 'white', fontFamily: 'Oswald,sans-serif', textShadow: '0 0 10px rgba(0,212,255,0.3)' }}>{s.v}</span>
                            </div>
                        ))}
                    </div>
            </div>
        </div>
    </div>
</>
);


  return (
    <div className="space-y-6">
        {/* Controls Header - Elite Command Console */}
        {/* Controls Header - Elite Tactical Command Center */}
        <div className="flex justify-between items-center bg-slate-900/40 backdrop-blur-3xl p-3 px-6 rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
            {/* Left: System Status & Identity */}
            <div className="flex items-center gap-6">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#00C8FF] to-[#0044FF] rounded-xl blur opacity-25 group-hover:opacity-50 transition-all duration-500"></div>
                    <div className="relative w-11 h-11 bg-[#0A1535] rounded-xl flex items-center justify-center border border-white/10">
                        <Shield className="text-[#00C8FF]" size={22} />
                    </div>
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[12px] font-black text-white uppercase tracking-[0.3em] leading-tight font-heading">SCOUT REPORT</h2>
                        <span className="px-2 py-0.5 rounded-md bg-[#00C8FF]/10 border border-[#00C8FF]/20 text-[#00C8FF] text-[8px] font-black tracking-widest">LIVE</span>
                    </div>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-[0.15em] mt-1.5 flex items-center gap-2 font-mono">
                        <span className="w-1.5 h-1.5 bg-[#CCFF00] rounded-full animate-pulse shadow-[0_0_8px_#CCFF00]" />
                        PERFORMANCE ANALYSIS <span className="opacity-30">|</span> {player.fullName?.split(' ')[0]} ANALYSIS
                    </p>
                </div>
            </div>
            
            {/* Center: Action Console (Coach Controls) */}
            <div className="flex items-center gap-4">
                {isCoach && (
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-xl">
                        <button 
                            onClick={() => handleGenerateAIReport(true)} 
                            disabled={isLoadingAI} 
                            className="flex items-center gap-2.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] text-white/60 hover:text-[#00C8FF] hover:bg-white/5 transition-all disabled:opacity-30 active:scale-95 group"
                        >
                            {isLoadingAI ? <Loader2 className="animate-spin" size={14}/> : <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />} 
                            REFRESH ANALYSIS
                        </button>
                        <div className="w-[1px] h-4 bg-white/10 mx-1" />
                        <button 
                            onClick={() => setIsEditingRemarks(!isEditingRemarks)} 
                            className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95 ${
                                isEditingRemarks 
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                : 'text-white/60 hover:text-[#00C8FF] hover:bg-white/5'
                            }`}
                        >
                            {isEditingRemarks ? <X size={14}/> : <Edit2 size={14} />} 
                            {isEditingRemarks ? 'CANCEL' : 'EDIT ASSESSMENT'}
                        </button>
                    </div>
                )}

                {/* Primary Action: Export */}
                <button 
                    onClick={handleDownloadPDF} 
                    disabled={isGenerating} 
                    className="group relative flex items-center gap-3 bg-[#CCFF00] text-[#050E25] px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(204,255,0,0.2)] disabled:opacity-50 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    {isGenerating ? <Loader2 className="animate-spin" size={15}/> : <Download size={15} className="group-hover:-translate-y-0.5 transition-transform" />} 
                    GENERATE PDF REPORT
                </button>

        {/* Close Button */}
                {onClose && (
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 flex items-center justify-center text-white/20 hover:text-white hover:bg-red-500/10 rounded-xl transition-all active:scale-90 border border-transparent hover:border-red-500/20"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Processing Overlay */}
            {isGenerating && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#080C28]/80 backdrop-blur-md rounded-2xl border border-white/10 animate-fade-in">
                    <div className="relative">
                        <div className="absolute -inset-4 bg-gradient-to-r from-[#00C8FF] to-[#CCFF00] rounded-full blur-xl opacity-20 animate-pulse"></div>
                        <Loader2 className="text-[#00C8FF] animate-spin mb-6" size={48} />
                    </div>
                    <h3 className="text-white font-black tracking-[0.4em] uppercase text-[14px] mb-2 font-heading">PREPARING REPORT</h3>
                    <p className="text-[#00C8FF]/60 text-[10px] font-mono tracking-widest uppercase animate-pulse">GENERATING REPORT ASSETS...</p>
                    
                    {/* Scanning Line */}
                    <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00C8FF] to-transparent animate-scan-line opacity-50" />
                </div>
            )}
        </div>

        {/* --- THE DOSSIER (1600x1000 LANDSCAPE AREA) --- */}
        <div ref={wrapperRef} className="w-full flex md:justify-center justify-start overflow-x-auto overflow-y-hidden rounded-2xl border custom-scrollbar" style={{ height: `${1000 * scale}px`, background: '#080C28', borderColor: 'rgba(60,100,255,0.2)' }}>
            <div style={{ width: `${1600 * scale}px`, height: `${1000 * scale}px`, position: 'relative', flexShrink: 0 }}>
                {/* Securely positioned export container directly behind the visible one, sharing the exact same standard viewport context to prevent html2canvas black/blank generation */}
                <div 
                    ref={pdfRef} 
                    id="premium-dossier-capture"
                    style={{ 
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '1600px', 
                        height: '1000px', 
                        background: '#080C28',
                        zIndex: 0,
                        opacity: 0.001,
                        pointerEvents: 'none'
                    }}
                >
                    {renderDossierContent(true)}
                </div>

                <div 
                    ref={cardRef} 
                    data-report-container="true"
                    style={{ 
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 1
                    }}
                >
                    {renderDossierContent(false)}
                </div>
            </div>
        </div>
    </div>
  );
};

export default EvaluationCard;
