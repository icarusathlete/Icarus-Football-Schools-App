import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { AcademySettings } from '../types';
import { PageHeader } from './ui/PageHeader';
import { 
  Palette, Shield, Trophy, Layout, 
  Sparkles, Check, CheckCircle2, Type, 
  RefreshCw, Eye, EyeOff, Globe, Zap, Loader2, X, UserCheck
} from 'lucide-react';
import { auth } from '../firebase';
import { multiFactor, TotpMultiFactorGenerator } from 'firebase/auth';

// Gorgeous Pre-rendered Sport SVG Crest templates as base64 or inline SVGs
const LOGO_PRESETS = [
  {
    name: 'Elite Shield Crest',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300C8FF" width="128" height="128"><path d="M12 2L4 5v6c0 5.25 3.42 10.16 8 11 4.58-.84 8-5.75 8-11V5l-8-3zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
  },
  {
    name: 'Dynamic Athletic Ball',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23C3F629" width="128" height="128"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2h2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 1.83-.62 3.5-1.67 4.93z"/></svg>'
  },
  {
    name: 'Academy Gold Trophy',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFD700" width="128" height="128"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9V19H5v2h14v-2h-2v-4.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 9V7h2v2H5zm14 0h-2V7h2v2z"/></svg>'
  },
  {
    name: 'Star Academy Shield',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E2E8F0" width="128" height="128"><path d="M12 2L2 22h20L12 2zm0 5l3.5 7.5-8-2 4.5-5.5z"/></svg>'
  }
];

const BRANDING_PRESETS = [
  {
    name: 'Midnight Cyan (Default)',
    primary: '#00C8FF',
    secondary: '#070b42',
    desc: 'Esports midnight high-contrast stadium feel'
  },
  {
    name: 'Golden Fleet',
    primary: '#FFD700',
    secondary: '#111111',
    desc: 'Ultra premium black and championship gold'
  },
  {
    name: 'Carbon Volt',
    primary: '#C3F629',
    secondary: '#222222',
    desc: 'Electric high-visibility modern training look'
  },
  {
    name: 'Royal Elite',
    primary: '#0066FF',
    secondary: '#0B132A',
    desc: 'Traditional European football academy navy & sky blue'
  }
];

const CURATED_FONTS = [
  { name: 'Outfit', category: 'Geometric Sans (Recommended)', desc: 'Ultra-modern, sleek, geometric curves. Perfect for luxury tech and athletics.' },
  { name: 'Plus Jakarta Sans', category: 'Warm Sans', desc: 'Warm geometric typeface, highly responsive legibility, premium layouts.' },
  { name: 'Inter', category: 'Professional Sans', desc: 'Neutral, mathematically balanced, highly readable, clean SaaS presentation.' },
  { name: 'Space Grotesk', category: 'Tech Display', desc: 'Bold eccentric characters, geometric layout, high contrast headlines.' },
  { name: 'Clash Display', category: 'Editorial Bold', desc: 'Expressive and high-impact headlines, editorial luxury feel.' },
  { name: 'Orbitron', category: 'Esports Display', desc: 'Futuristic gaming display, technical cybernetic style.' }
];

export const BrandingSettings: React.FC = () => {
  const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
  const [name, setName] = useState(settings.name);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);

  // MFA 2FA State
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
  }, []);

  const handleStartMfaEnrollment = async () => {
    setMfaError('');
    setMfaSuccessMsg('');
    setIsEnrolling(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("No active authenticated session.");
      
      const session = await multiFactor(firebaseUser).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      setMfaSecret(secret);
      setMfaSecretKey(secret.secretKey);
      
      const email = firebaseUser.email || 'staff';
      const qrUrl = secret.generateQrCodeUrl(email, name || 'Icarus Football Academy');
      setMfaQrUrl(qrUrl);
      
      setShowMfaEnrollModal(true);
    } catch (err: any) {
      console.error("Staff MFA enrollment initiation failed:", err);
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
      
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(mfaSecret, mfaVerifyCode.trim());
      await multiFactor(firebaseUser).enroll(assertion, "Staff Authenticator App");
      
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
      console.error("Staff MFA enrollment confirmation failed:", err);
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
      console.error("Failed to disable Staff MFA:", err);
      alert(err.message || "Failed to disable 2-Factor Authentication.");
    }
  };
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor);
  const [fontFamily, setFontFamily] = useState(settings.fontFamily);
  const [typographyMode, setTypographyMode] = useState<'clean' | 'esports'>(settings.typographyMode || 'clean');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Sync current values if global settings change in real-time
    const current = StorageService.getSettings();
    setSettings(current);
    setName(current.name);
    setLogoUrl(current.logoUrl);
    setPrimaryColor(current.primaryColor);
    setSecondaryColor(current.secondaryColor);
    setFontFamily(current.fontFamily);
    setTypographyMode(current.typographyMode || 'clean');
  }, []);

  const handleApplyPreset = (preset: typeof BRANDING_PRESETS[0]) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
  };

  const handleSelectPresetLogo = (presetLogo: typeof LOGO_PRESETS[0]) => {
    setLogoUrl(presetLogo.url);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedSettings: AcademySettings = {
      name: name.toUpperCase().trim(),
      logoUrl: logoUrl.trim(),
      primaryColor,
      secondaryColor,
      fontFamily,
      typographyMode
    };

    try {
      await StorageService.saveSettings(updatedSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="SCHOOL BRANDING" 
        subtitle="Branding Engine // Establish premium custom typography, colors, logos, and taming modes."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Form Controls */}
        <form onSubmit={handleSave} className="lg:col-span-8 space-y-6">
          
          {/* Section 1: Academy Identity */}
          <div className="glass-card p-6 md:p-8 border border-white/10 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-primary/45" />
            <div className="flex items-center gap-3">
              <Shield className="text-brand-primary" size={18} />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Academy Identity</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-wider text-white/50">Academy Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-primary font-bold uppercase tracking-wider transition-all"
                  placeholder="e.g. ICARUS FOOTBALL SCHOOL"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-wider text-white/50">Custom Logo Image URL</label>
                <input 
                  type="url" 
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-primary transition-all font-mono"
                  placeholder="e.g. https://yourclub.com/logo.png"
                />
              </div>
            </div>

            {/* Quick Logo Presets */}
            <div className="space-y-3 pt-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/30 block">Or Select a Premium Crest Template</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {LOGO_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPresetLogo(p)}
                    className={`flex flex-col items-center p-4 rounded-2xl bg-white/5 border hover:bg-white/10 active:scale-[0.98] transition-all gap-3 ${logoUrl === p.url ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(0,200,255,0.2)]' : 'border-white/5'}`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 p-1.5 overflow-hidden">
                      <img src={p.url} className="w-full h-full object-contain" alt={p.name} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-white/60 text-center leading-tight">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Premium Curated Typography (The Core Fix) */}
          <div className="glass-card p-6 md:p-8 border border-white/10 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-primary/45" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Type className="text-brand-primary" size={18} />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Typography Suite</h3>
              </div>
              <span className="text-[8px] font-black text-brand-primary uppercase bg-brand-primary/15 px-3 py-1 rounded-full border border-brand-primary/20">Google Fonts Hot-Load</span>
            </div>

            {/* Typography Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CURATED_FONTS.map((font, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFontFamily(font.name)}
                  className={`text-left p-4 rounded-2xl bg-white/5 border hover:bg-white/10 active:scale-[0.98] transition-all flex flex-col gap-2 relative overflow-hidden ${fontFamily === font.name ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(0,200,255,0.2)]' : 'border-white/5'}`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-sm font-black text-white" style={{ fontFamily: font.name }}>{font.name}</span>
                    <span className="text-[7px] font-bold text-white/40 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10">{font.category}</span>
                  </div>
                  <p className="text-[9px] text-white/55 font-medium leading-relaxed">{font.desc}</p>
                  
                  {/* Instantly preload the font family for selection preview */}
                  <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.name)}:wght@400;700;900&display=swap`} />
                </button>
              ))}
            </div>

            {/* Typography Style Mode Toggle (Saves from italics!) */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/50">Aesthetic Presentation Style</span>
                <p className="text-[9px] text-white/40 font-medium">Control taming parameters. Select &quot;Clean &amp; Professional&quot; to cancel aggressive italics globally across dashboards and tables for maximum readability.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTypographyMode('clean')}
                  className={`flex items-center gap-3 p-4 rounded-2xl bg-white/5 border hover:bg-white/10 active:scale-[0.98] transition-all text-left ${typographyMode === 'clean' ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(0,200,255,0.15)]' : 'border-white/5'}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${typographyMode === 'clean' ? 'bg-brand-primary text-brand-secondary' : 'bg-white/5 text-white/40'}`}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-white block">Clean &amp; Professional</span>
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider block mt-0.5">Upright Text • Highly Readable</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTypographyMode('esports')}
                  className={`flex items-center gap-3 p-4 rounded-2xl bg-white/5 border hover:bg-white/10 active:scale-[0.98] transition-all text-left ${typographyMode === 'esports' ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(0,200,255,0.15)]' : 'border-white/5'}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${typographyMode === 'esports' ? 'bg-brand-primary text-brand-secondary' : 'bg-white/5 text-white/40'}`}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-white block">Esports Cyber Stadium</span>
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider block mt-0.5">Aggressive Italics • Cyber HUD</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Brand Colors */}
          <div className="glass-card p-6 md:p-8 border border-white/10 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-primary/45" />
            <div className="flex items-center gap-3">
              <Palette className="text-brand-primary" size={18} />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Brand Colors</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-wider text-white/50 block">Primary Brand Accent</label>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-xl border border-white/10 shadow-inner overflow-hidden shrink-0 relative" style={{ background: primaryColor }}>
                    <input 
                      type="color" 
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono uppercase focus:outline-none focus:border-brand-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-wider text-white/50 block">Secondary Brand Base</label>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-xl border border-white/10 shadow-inner overflow-hidden shrink-0 relative" style={{ background: secondaryColor }}>
                    <input 
                      type="color" 
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={secondaryColor}
                    onChange={e => setSecondaryColor(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono uppercase focus:outline-none focus:border-brand-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Quick Color Presets */}
            <div className="space-y-3 pt-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/30 block">Or Apply a Premium Academy Palette</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BRANDING_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`flex items-center justify-between p-4 rounded-2xl bg-white/5 border hover:bg-white/10 active:scale-[0.98] transition-all text-left ${primaryColor === p.primary && secondaryColor === p.secondary ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(0,200,255,0.2)]' : 'border-white/5'}`}
                  >
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-white block">{p.name}</span>
                      <span className="text-[8px] font-medium text-white/40 block mt-0.5 leading-tight">{p.desc}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-3">
                      <div className="w-4 h-8 rounded border border-white/10" style={{ background: p.primary }} />
                      <div className="w-4 h-8 rounded border border-white/10" style={{ background: p.secondary }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Security & 2-Factor Authentication */}
          <div className="glass-card p-6 md:p-8 border border-white/10 space-y-6 relative overflow-hidden mt-6">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-primary/45" />
            <div className="flex items-center gap-3">
              <Shield className="text-brand-primary" size={18} />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Identity Credentials & 2FA</h3>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="space-y-2 text-left">
                <span className="text-[8px] font-black text-brand-primary uppercase tracking-[0.2em] bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                  Time-Based One-Time Passwords (TOTP)
                </span>
                <h4 className="text-sm font-black text-white uppercase italic tracking-tighter leading-none pt-2">
                  {isMfaEnrolled ? '2-Factor Protection: Active (TOTP)' : '2-Factor Protection: Inactive'}
                </h4>
                <p className="text-[9px] text-white/40 leading-relaxed font-medium max-w-lg">
                  Protect staff accounts from unauthorized access. Enabling TOTP MFA challenges all subsequent portal logins with a secure, dynamically generated 6-digit key from your phone.
                </p>
              </div>
              
              <div className="shrink-0 w-full md:w-auto">
                {isMfaEnrolled ? (
                  <button
                    type="button"
                    onClick={handleDisableMfa}
                    className="w-full md:w-auto px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 text-[9px] font-black uppercase tracking-[0.2em] italic transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    Disable 2FA Security
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartMfaEnrollment}
                    disabled={isEnrolling}
                    className="w-full md:w-auto px-6 py-3 bg-brand-primary text-brand-secondary font-black tracking-widest text-[9px] uppercase rounded-xl hover:scale-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/10"
                  >
                    {isEnrolling ? <Loader2 size={12} className="animate-spin text-brand-secondary" /> : <Zap size={12} />}
                    Activate 2FA Security
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end pt-4 gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-4 bg-brand-primary text-brand-secondary font-black tracking-widest text-xs uppercase rounded-2xl hover:scale-105 active:scale-[0.98] shadow-[0_15px_30px_rgba(0,200,255,0.25)] transition-all cursor-pointer flex items-center gap-2 border border-white/10"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>TRANSMITTING BRAND METRICS...</span>
                </>
              ) : (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  <span>SAVE BRANDING ENVIRONMENT</span>
                </>
              )}
            </button>
          </div>

          {saveSuccess && (
            <div className="p-4 bg-brand-primary/15 border border-brand-primary/30 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CheckCircle2 size={16} />
              <span>Identity and visual properties saved successfully!</span>
            </div>
          )}
        </form>

        {/* Right Side: Interactive Real-Time Brand Mockup Sidebar */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
          <div className="glass-card p-6 border border-white/10 relative overflow-hidden space-y-4">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-primary/45" />
            <div className="flex items-center gap-2 text-white/50 text-[9px] font-black uppercase tracking-wider">
              <Eye size={12} />
              <span>Live Brand Environment Mockup</span>
            </div>

            {/* Sidebar Mockup Frame */}
            <div className="w-full bg-[#0a0f1d] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
              
              {/* Fake Sidebar Header Mock */}
              <div className="p-6 flex flex-col items-center text-center border-b border-white/5 relative overflow-hidden bg-brand-secondary/90 transition-colors duration-500" style={{ backgroundColor: secondaryColor }}>
                
                {/* Simulated spotlight */}
                <div className="absolute top-0 inset-x-0 h-10 rounded-full blur-xl pointer-events-none opacity-50" style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 100%)` }} />
                
                <div className="w-16 h-16 rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl flex items-center justify-center overflow-hidden mb-3 transition-transform duration-500 hover:scale-105">
                  {logoUrl ? (
                    <img src={logoUrl} className="w-full h-full object-contain p-1 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]" alt="Mockup Logo" />
                  ) : (
                    <Trophy className="w-8 h-8" style={{ color: primaryColor }} />
                  )}
                </div>

                <h4 className="text-[9px] font-black tracking-widest uppercase text-white leading-tight truncate w-full" style={{ fontFamily, letterSpacing: '0.15em' }}>
                  {name || 'ACADEMY PORTAL'}
                </h4>
                
                <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 scale-90">
                  <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                  <span className="text-[6px] text-white/40 uppercase tracking-[0.2em] font-black leading-none">ADMIN PORTAL</span>
                </div>
              </div>

              {/* Fake Dashboard Body Mock */}
              <div className="p-5 space-y-4">
                {/* Mock Card */}
                <div className={`p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3 relative overflow-hidden transition-all ${typographyMode === 'clean' ? '' : 'italic'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[7px] text-white/40 uppercase tracking-widest font-black" style={{ fontFamily }}>System Stats</span>
                    <span className="text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-md" style={{ color: secondaryColor, backgroundColor: primaryColor }}>Live</span>
                  </div>
                  
                  <div className="space-y-1">
                    <h5 className="text-[13px] font-black text-white uppercase tracking-tight leading-none" style={{ fontFamily }}>
                      {typographyMode === 'clean' ? 'Premium Layout active' : 'Esports Layout active'}
                    </h5>
                    <p className="text-[8px] text-white/50 leading-relaxed font-medium">This represents mock dashboard text showing font styles and taming parameters.</p>
                  </div>

                  {/* Mock progress bar */}
                  <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: '75%', backgroundColor: primaryColor }} />
                  </div>
                </div>

                {/* Typography Test Card */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                  <span className="text-[7px] text-white/30 uppercase tracking-widest font-black block">Legibility Scale</span>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-bold border-b border-white/5 pb-1">
                      <span className="text-white/45 uppercase tracking-wider">Table Item</span>
                      <span className={`text-white uppercase ${typographyMode === 'clean' ? '' : 'italic font-black'}`}>Marcus Rashford</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold border-b border-white/5 pb-1">
                      <span className="text-white/45 uppercase tracking-wider">Coach Rating</span>
                      <span className={`text-white uppercase ${typographyMode === 'clean' ? '' : 'italic font-black'}`} style={{ color: primaryColor }}>9.2 rating</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      {/* Staff 2FA Enrollment Modal */}
      {showMfaEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-brand-900 rounded-t-[3rem] sm:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 border border-white/10 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            
            <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center relative bg-brand-secondary">
              <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">Activate <span className="text-brand-primary">2FA Protection</span></h3>
              <button 
                type="button"
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
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaQrUrl)}`} 
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
                      type="button"
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
                      type="button"
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
