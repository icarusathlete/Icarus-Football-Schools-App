import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { X, Activity, Image as ImageIcon, Video, Paperclip, Target, TrendingUp, Check } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface Props {
  player: Player;
  onClose: () => void;
  onUpdate?: (updatedPlayer: Player) => void;
  role?: string;
}

export const PlayerPerformanceModal: React.FC<Props> = ({ player, onClose, onUpdate, role }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'kpis' | 'attachments'>('timeline');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentNote, setNewAttachmentNote] = useState('');
  const [newAttachmentType, setNewAttachmentType] = useState<'image' | 'video'>('image');

  // ── Body scroll lock (iOS-safe) ──────────────────────────────────────────
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.cssText = `position:fixed;top:-${scrollY}px;left:0;right:0;overflow-y:scroll`;
    return () => {
      document.body.style.cssText = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────────
  const milestones = [
    { date: player.registeredAt, title: 'Joined Academy', desc: 'Completed orientation and technical baseline.', color: '#CCFF00' },
    { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), title: 'First Month Review', desc: 'Showed great improvement in stamina.', color: '#38bdf8' },
    { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), title: 'Match Debut', desc: 'Played 45 mins, 1 assist in friendly.', color: '#a78bfa' },
  ];

  const getKPIs = () => {
    switch (player.position.toLowerCase()) {
      case 'forward': return [
        { label: 'Shot Accuracy', val: '68%', icon: <Target size={18} />, color: '#CCFF00' },
        { label: 'Conversion Rate', val: '22%', icon: <Activity size={18} />, color: '#38bdf8' },
        { label: 'Attacking Runs', val: '14/match', icon: <TrendingUp size={18} />, color: '#a78bfa' },
      ];
      case 'midfielder': return [
        { label: 'Pass Completion', val: '84%', icon: <Check size={18} />, color: '#CCFF00' },
        { label: 'Key Passes', val: '3.2/match', icon: <Activity size={18} />, color: '#38bdf8' },
        { label: 'Distance Covered', val: '6.8 km', icon: <TrendingUp size={18} />, color: '#a78bfa' },
      ];
      case 'defender': return [
        { label: 'Tackle Success', val: '76%', icon: <Target size={18} />, color: '#CCFF00' },
        { label: 'Interceptions', val: '5/match', icon: <Activity size={18} />, color: '#38bdf8' },
        { label: 'Aerial Duels', val: '62% won', icon: <TrendingUp size={18} />, color: '#a78bfa' },
      ];
      case 'goalkeeper': return [
        { label: 'Save %', val: '71%', icon: <Target size={18} />, color: '#CCFF00' },
        { label: 'Clean Sheets', val: '4', icon: <Check size={18} />, color: '#38bdf8' },
        { label: 'Distribution', val: '88%', icon: <Activity size={18} />, color: '#a78bfa' },
      ];
      default: return [
        { label: 'General Fitness', val: 'Good', icon: <Activity size={18} />, color: '#CCFF00' },
        { label: 'Match Rating', val: '7.2', icon: <Target size={18} />, color: '#38bdf8' },
      ];
    }
  };

  const handleAddAttachment = () => {
    if (!newAttachmentUrl) return;
    const updated = {
      ...player,
      attachments: [...(player.attachments || []), {
        url: newAttachmentUrl,
        type: newAttachmentType,
        note: newAttachmentNote,
        date: new Date().toISOString(),
      }],
    };
    StorageService.updatePlayer(updated);
    onUpdate?.(updated);
    setNewAttachmentUrl('');
    setNewAttachmentNote('');
  };

  const tabs = [
    { id: 'timeline', label: 'Progress' },
    { id: 'kpis',     label: 'Performance' },
    { id: 'attachments', label: 'Media' },
  ] as const;

  return (
    /* ── Backdrop ── */
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      {/* ── Modal shell — bottom sheet on mobile, centred dialog on sm+ ── */}
      <div className="bg-brand-900 w-full sm:max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_-24px_80px_-8px_rgba(0,0,0,0.6)] sm:shadow-[0_32px_80px_-8px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col border border-white/[0.07]"
        style={{ height: '88vh', maxHeight: '88vh' }}>

        {/* ── Drag handle (mobile) ── */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-br from-[#00054e] via-brand-900 to-brand-900 px-6 py-5 flex justify-between items-center relative overflow-hidden border-b border-white/[0.06]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 blur-3xl -z-10 rounded-full" />
          <div className="flex items-center gap-4 relative z-10 min-w-0">
            <img
              src={player.photoUrl}
              className="w-14 h-14 rounded-2xl border-2 border-white/15 shadow-xl object-cover bg-brand-950 flex-shrink-0"
            />
            <div className="min-w-0">
              <h3 className="font-black text-xl text-white italic uppercase tracking-tight leading-none mb-2 truncate">
                {player.fullName}
              </h3>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-[9px] bg-brand-500 text-brand-950 px-3 py-1 rounded-full uppercase tracking-widest font-black italic">
                  {player.position}
                </span>
                <span className="text-[9px] text-white/40 font-black tracking-widest uppercase italic bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  {player.memberId}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/10 shadow-lg relative z-10 flex-shrink-0 ml-3"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── TABS ── */}
        <div className="flex bg-brand-950/60 px-6 border-b border-white/[0.06] gap-6 backdrop-blur-sm">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-4 pt-5 text-[10px] font-black uppercase tracking-[0.2em] italic border-b-2 transition-all relative whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-white/35 hover:text-white/60'
              }`}
            >
              {t.label}
              {activeTab === t.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 shadow-[0_-4px_10px_rgba(14,165,233,0.6)]" />
              )}
            </button>
          ))}
        </div>

        {/* ── CONTENT (scrollable, non-leaking) ── */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain p-6 sm:p-8 space-y-6">

          {/* ── TIMELINE TAB ── */}
          {activeTab === 'timeline' && (
            <div className="animate-in slide-in-from-left-4 duration-300 relative">
              {/* vertical line */}
              <div className="absolute left-[7px] top-3 bottom-3 w-[2px] bg-white/[0.06] rounded-full" />
              <div className="space-y-8">
                {milestones.map((m, i) => (
                  <div key={i} className="relative pl-8">
                    {/* dot */}
                    <div
                      className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-brand-900"
                      style={{ background: m.color, boxShadow: `0 0 10px ${m.color}80` }}
                    />
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest italic mb-1">
                      {new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <h4 className="text-[15px] font-black text-white uppercase italic tracking-tight leading-tight"
                      style={{ color: m.color }}>
                      {m.title}
                    </h4>
                    <p className="text-white/50 text-[12px] font-bold mt-1 leading-relaxed italic">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PERFORMANCE (KPIs) TAB ── */}
          {activeTab === 'kpis' && (
            <div className="animate-in slide-in-from-right-4 duration-300 space-y-4">
              {/* Position banner */}
              <div className="flex items-center gap-3 p-4 rounded-[1.5rem] border border-white/[0.06] bg-brand-950/50">
                <div className="p-2.5 bg-brand-500/15 rounded-xl border border-brand-500/20">
                  <Target size={18} className="text-brand-500" />
                </div>
                <div>
                  <div className="text-white font-black italic uppercase tracking-tight text-[13px]">
                    {player.position} KPIs
                  </div>
                  <div className="text-[9px] text-white/40 font-black uppercase tracking-widest mt-0.5">
                    Key performance indicators
                  </div>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {getKPIs().map((kpi, i) => (
                  <div
                    key={i}
                    className="bg-brand-950/60 p-6 rounded-[1.5rem] border border-white/[0.06] flex flex-col items-center text-center group hover:border-white/15 transition-all"
                  >
                    <div className="mb-3 p-2 rounded-xl" style={{ background: `${kpi.color}15`, color: kpi.color }}>
                      {kpi.icon}
                    </div>
                    <div className="text-3xl font-black italic tracking-tighter leading-none" style={{ color: kpi.color }}>
                      {kpi.val}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-2.5 font-black italic">
                      {kpi.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MEDIA / ATTACHMENTS TAB ── */}
          {activeTab === 'attachments' && (
            <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
              {/* Grid of existing attachments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {player.attachments?.map((att, i) => (
                  <div
                    key={i}
                    className="bg-brand-950/60 border border-white/[0.06] rounded-[1.5rem] overflow-hidden group hover:border-white/15 transition-all"
                  >
                    {att.type === 'image' ? (
                      <div className="h-36 bg-brand-950 relative overflow-hidden">
                        <img src={att.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute top-3 right-3 p-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
                          <ImageIcon size={12} className="text-white/70" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-36 bg-brand-950 flex items-center justify-center relative">
                        <div className="w-12 h-12 rounded-full bg-brand-500/15 flex items-center justify-center border border-brand-500/25">
                          <Video className="text-brand-500" size={20} />
                        </div>
                        <div className="absolute top-3 right-3 p-1.5 bg-white/5 rounded-xl border border-white/10">
                          <Video size={12} className="text-white/50" />
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="text-[12px] font-black text-white italic uppercase tracking-tight truncate mb-1">
                        {att.note || 'Untitled Note'}
                      </div>
                      <div className="text-[9px] text-white/30 font-black uppercase tracking-widest italic">
                        {new Date(att.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}

                {(!player.attachments || player.attachments.length === 0) && (
                  <div className="col-span-2 p-10 border border-dashed border-white/10 rounded-[2rem] text-center text-white/20 font-black uppercase tracking-widest flex flex-col items-center italic">
                    <Paperclip className="mb-3 opacity-20" size={36} />
                    No photos or videos yet
                  </div>
                )}
              </div>

              {/* Add attachment form — ONLY FOR COACH/ADMIN */}
              {(role === 'admin' || role === 'coach') && (
                <div className="bg-brand-950/50 p-6 rounded-[2rem] border border-white/[0.06]">
                  <h4 className="text-white font-black italic uppercase tracking-tight mb-5 flex items-center gap-2.5 text-[13px]">
                    <Paperclip size={16} className="text-brand-500" /> Add Record
                  </h4>
                  <div className="space-y-4">
                    {/* Type toggle */}
                    <div className="flex gap-4">
                      {(['image', 'video'] as const).map(type => (
                        <label key={type} className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest italic cursor-pointer">
                          <input
                            type="radio"
                            checked={newAttachmentType === type}
                            onChange={() => setNewAttachmentType(type)}
                            className="w-4 h-4 accent-brand-500"
                          />
                          <span className={newAttachmentType === type ? 'text-brand-500' : ''}>
                            {type.toUpperCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder={newAttachmentType === 'image' ? 'IMAGE URL' : 'VIDEO URL'}
                      value={newAttachmentUrl}
                      onChange={e => setNewAttachmentUrl(e.target.value)}
                      className="w-full bg-brand-900 border border-white/10 rounded-xl p-4 text-white text-[11px] font-black italic uppercase tracking-widest outline-none focus:border-brand-500 transition-colors placeholder:text-white/20"
                    />
                    <input
                      type="text"
                      placeholder="NOTES (OPTIONAL)"
                      value={newAttachmentNote}
                      onChange={e => setNewAttachmentNote(e.target.value)}
                      className="w-full bg-brand-900 border border-white/10 rounded-xl p-4 text-white text-[11px] font-black italic uppercase tracking-widest outline-none focus:border-brand-500 transition-colors placeholder:text-white/20"
                    />
                    <button
                      onClick={handleAddAttachment}
                      className="w-full py-4 bg-brand-500 text-brand-950 font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-brand-500/90 active:scale-95 shadow-xl shadow-brand-500/20 italic"
                    >
                      SAVE TO PROFILE
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
