import React, { useState, useEffect } from 'react';
import { Trophy, ArrowRight, AlertTriangle, Shield, Database, Sparkles, Zap, Loader2, UserCheck, X } from 'lucide-react';
import { User, AcademySettings } from '../types';
import { loginWithGoogle, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType, StorageService } from '../services/storageService';
import { getMultiFactorResolver, TotpMultiFactorGenerator } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginProps {
    onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());

    // TOTP MFA login challenge state
    const [showMfaChallenge, setShowMfaChallenge] = useState(false);
    const [mfaResolver, setMfaResolver] = useState<any | null>(null);
    const [totpHint, setTotpHint] = useState<any | null>(null);
    const [mfaCode, setMfaCode] = useState('');
    const [mfaError, setMfaError] = useState('');
    const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

    useEffect(() => {
        // Attempt to fetch latest settings from Firestore for public branding
        const fetchSettings = async () => {
            try {
                const settingsDoc = await getDoc(doc(db, 'settings', 'academy'));
                if (settingsDoc.exists()) {
                    setSettings(settingsDoc.data() as AcademySettings);
                }
            } catch (e) {
                console.warn("Could not fetch remote settings for branding, using local defaults.");
            }
        };
        fetchSettings();
    }, []);

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            const firebaseUser = await loginWithGoogle();
            
            // Check if user exists in Firestore
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            let appUser: User;
            
            if (userDoc.exists()) {
                appUser = { id: userDoc.id, ...userDoc.data() } as User;
            } else {
                // Create new user — only the bootstrap admin gets immediate access.
                // Everyone else starts as 'pending' and must be approved by an admin.
                const isDefaultAdmin = firebaseUser.email === 'negidevender19@gmail.com' && firebaseUser.emailVerified;
                
                appUser = {
                    id: firebaseUser.uid,
                    username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    password: '', // Not used for Google Login
                    role: isDefaultAdmin ? 'admin' : 'pending',
                    photoUrl: firebaseUser.photoURL || undefined,
                    email: firebaseUser.email || undefined,
                };
                
                const userData: any = {
                    username: appUser.username,
                    role: appUser.role,
                    email: firebaseUser.email,
                };
                if (appUser.photoUrl) userData.photoUrl = appUser.photoUrl;
                
                try {
                    await setDoc(userDocRef, userData);
                } catch (error) {
                    handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
                }
            }
            
            onLogin(appUser);
        } catch (err: any) {
            console.error("Login error:", err);
            if (err.code === 'auth/multi-factor-auth-required') {
                try {
                    const resolver = getMultiFactorResolver(auth, err);
                    const hint = resolver.hints.find(h => h.factorId === 'totp');
                    if (hint) {
                        setMfaResolver(resolver);
                        setTotpHint(hint);
                        setShowMfaChallenge(true);
                    } else {
                        setError("Multi-factor authentication is required, but no TOTP authentication method was found.");
                    }
                } catch (resErr: any) {
                    console.error("Failed to extract MFA resolver:", resErr);
                    setError("Failed to initialize 2FA verification challenge.");
                }
            } else {
                setError(err.message || 'Failed to sign in with Google.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolveMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mfaResolver || !totpHint) return;
        
        setMfaError('');
        setIsVerifyingMfa(true);
        try {
            if (mfaCode.trim().length !== 6) {
                throw new Error("Verification code must be exactly 6 digits.");
            }
            
            // 1. Create assertion
            const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, mfaCode.trim());
            
            // 2. Resolve sign-in
            const userCredential = await mfaResolver.resolveSignIn(assertion);
            const firebaseUser = userCredential.user;
            
            // 3. Complete dashboard sign-in (same as normal Google success)
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            let appUser: User;
            
            if (userDoc.exists()) {
                appUser = { id: userDoc.id, ...userDoc.data() } as User;
            } else {
                const isDefaultAdmin = firebaseUser.email === 'negidevender19@gmail.com' && firebaseUser.emailVerified;
                
                appUser = {
                    id: firebaseUser.uid,
                    username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    password: '',
                    role: isDefaultAdmin ? 'admin' : 'pending',
                    photoUrl: firebaseUser.photoURL || undefined,
                    email: firebaseUser.email || undefined,
                };
                
                const userData: any = {
                    username: appUser.username,
                    role: appUser.role,
                    email: firebaseUser.email,
                };
                if (appUser.photoUrl) userData.photoUrl = appUser.photoUrl;
                
                try {
                    await setDoc(userDocRef, userData);
                } catch (error) {
                    handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
                }
            }
            
            // Complete Login!
            setShowMfaChallenge(false);
            setMfaResolver(null);
            setTotpHint(null);
            setMfaCode('');
            onLogin(appUser);
        } catch (err: any) {
            console.error("Failed to verify TOTP code:", err);
            setMfaError(err.message || "Invalid authentication code. Please check your authenticator and try again.");
        } finally {
            setIsVerifyingMfa(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden font-display selection:bg-brand-500/30">
            
            {/* Tactical Pro Grid Layer */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            
            {/* Professional Radial Spotlights (Cyan & Lime) */}
            <div className="absolute top-0 right-0 -mt-24 -mr-24 w-[800px] h-[800px] bg-brand-500/10 rounded-full blur-[160px] animate-pulse-slow" />
            <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-[600px] h-[600px] bg-[#C3F629]/5 rounded-full blur-[140px] animate-pulse-slow" style={{ animationDelay: '1s' }} />

            {/* Premium Center-Focus Branding */}
            <div className="mb-14 text-center relative z-10 animate-fade-in">
                <div className="w-36 h-36 bg-white/5 rounded-[2.5rem] inline-flex items-center justify-center border border-white/10 mb-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative group overflow-hidden transition-all duration-700 hover:scale-105 backdrop-blur-xl p-8">
                    {/* Glowing background inside badge */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-transparent opacity-50" />
                    <div className="absolute inset-0 border border-brand-primary/20 rounded-[2.5rem] scale-95 group-hover:scale-100 transition-all duration-500" />
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} className="w-full h-full object-contain relative z-10 logo-glow-effect animate-float" alt="Logo" />
                    ) : (
                        <Trophy className="w-16 h-16 text-brand-primary relative z-10 animate-pulse" />
                    )}
                </div>
                
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-7xl font-black tracking-widest uppercase text-white leading-none flex flex-col md:flex-row items-center justify-center md:gap-4 font-sans" 
                        style={{ fontFamily: settings.fontFamily || 'Space Grotesk', letterSpacing: '0.12em' }}>
                        <span>{settings.name}</span>
                    </h1>
                    <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/5 shadow-xl overflow-hidden group">
                        <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse shadow-[0_0_12px_var(--brand-primary)]" />
                        <p className="text-white uppercase tracking-[0.4em] text-[9px] font-black">Official Academy Portal</p>
                    </div>
                </div>
            </div>

            {/* Professional Management Card */}
            <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] overflow-hidden relative z-10 border border-white/10 animate-slide-up p-1 transition-all hover:shadow-[0_60px_120px_-20px_rgba(0,200,255,0.1)]">
                <div className="bg-slate-50/50 p-12 md:p-16 text-center rounded-[2.3rem] border border-white/40">
                    
                    <div className="max-w-xs mx-auto mb-14 space-y-4">
                        <h2 className="text-4xl font-black text-brand-950 italic uppercase tracking-tighter leading-none" style={{ fontFamily: 'Space Grotesk' }}>Professional <span className="text-brand-500">Access</span></h2>
                        <div className="h-1.5 w-16 bg-brand-500 rounded-full mx-auto" />
                        <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">Secure authentication for coaches, administrators, and athletes.</p>
                    </div>
                    
                    {error && (
                        <div className="mb-10 p-6 bg-red-500/10 border border-red-500/20 text-red-500 text-[12px] font-bold rounded-3xl flex items-center gap-5 animate-in fade-in zoom-in text-left leading-relaxed">
                            <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                                <AlertTriangle size={20} />
                            </div>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-8">
                        <button 
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full bg-brand-950 text-white font-black py-7 rounded-[2.5rem] transition-all flex items-center justify-around px-10 shadow-2xl hover:bg-brand-900 active:scale-[0.98] group disabled:opacity-50 disabled:grayscale uppercase tracking-[0.25em] text-xs italic font-display border border-white/5"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-5 h-5 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                    <span>Syncing Identity...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
                                    </div>
                                    <span className="flex-1 text-center">LOGIN WITH GOOGLE PRO</span>
                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform opacity-30 group-hover:opacity-100" />
                                </>
                            )}
                        </button>
                        
                        <div className="pt-4 flex items-center justify-center gap-10">
                            <div className="flex flex-col items-center gap-2 group cursor-help">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-500 group-hover:text-white transition-all shadow-sm">
                                    <Shield size={18} />
                                </div>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">TLS 1.3</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 group cursor-help">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-[#C3F629] group-hover:text-brand-950 transition-all shadow-sm">
                                    <Database size={18} />
                                 </div>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Realtime</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 group cursor-help">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-500 group-hover:text-white transition-all shadow-sm">
                                    <Sparkles size={18} />
                                </div>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Premium</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-16 flex flex-col gap-6">
                        <div className="h-[1px] w-full bg-slate-100 relative">
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-white text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">ICARUS PLATFORM</div>
                        </div>
                        <p className="text-[9px] font-black text-brand-950/20 uppercase tracking-[0.4em]">Optimized for Professional Football Academy Management</p>
                    </div>
                </div>
            </div>
            
            <footer className="mt-16 flex flex-col items-center gap-6 relative z-10 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                <div className="flex items-center gap-4 text-white/20 text-[10px] font-black uppercase tracking-[0.5em] italic">
                    <span>&copy; 2026 {settings.name}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500/40" />
                    <span>ELITE PORTAL CONTROL</span>
                </div>
                <div className="flex items-center gap-8 opacity-20">
                    <div className="w-24 h-[1px] bg-gradient-to-r from-transparent to-white" />
                    <Zap size={16} className="text-white animate-pulse" />
                    <div className="w-24 h-[1px] bg-gradient-to-l from-transparent to-white" />
                </div>
            </footer>

            {/* 2-Factor Authentication (TOTP MFA) Sign-In Challenge Overlay */}
            {showMfaChallenge && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-950/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-brand-900 rounded-t-[3rem] sm:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 border border-white/10 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                        
                        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center relative bg-brand-secondary">
                            <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">Identity <span className="text-brand-primary">Verification</span></h3>
                            <button 
                                onClick={() => {
                                    setShowMfaChallenge(false);
                                    setMfaResolver(null);
                                    setTotpHint(null);
                                    setMfaCode('');
                                    setMfaError('');
                                }} 
                                className="p-3 hover:bg-white/10 rounded-full text-white/40 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleResolveMfa} className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar text-center">
                            
                            <div className="w-16 h-16 bg-brand-primary/10 border border-brand-primary/20 rounded-[1.25rem] flex items-center justify-center mx-auto text-brand-primary shadow-lg animate-pulse">
                                <Shield size={28} />
                            </div>

                            <div className="space-y-2">
                                <span className="text-[8px] font-black text-brand-primary uppercase tracking-[0.2em] bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                                    Multi-Factor authentication required
                                </span>
                                <h4 className="text-sm font-black text-white uppercase italic tracking-tighter leading-none pt-2">
                                    Enter 2FA Security Pass Code
                                </h4>
                                <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                                    Your account is protected by 2-Factor Authentication. Please enter the 6-digit verification code from your authenticator app below to authorize your session.
                                </p>
                            </div>

                            {mfaError && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold rounded-2xl text-left leading-relaxed animate-in fade-in">
                                    {mfaError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    maxLength={6}
                                    placeholder="000 000"
                                    value={mfaCode}
                                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-center p-4 bg-brand-950 border border-white/10 rounded-xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-primary font-mono text-xl font-bold tracking-[0.5em] text-white shadow-inner uppercase placeholder:text-white/5"
                                    required
                                    autoFocus
                                />
                                
                                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none text-center">
                                    Tip: Ensure your device's date & time settings are set to automatic.
                                </div>
                            </div>

                            <div className="pt-6 flex gap-4 border-t border-white/5">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setShowMfaChallenge(false);
                                        setMfaResolver(null);
                                        setTotpHint(null);
                                        setMfaCode('');
                                        setMfaError('');
                                    }}
                                    className="flex-1 py-4 text-white/30 hover:text-white font-black rounded-xl transition-all text-[9px] uppercase tracking-widest italic cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isVerifyingMfa || mfaCode.trim().length !== 6}
                                    className="flex-[2] py-4 bg-brand-primary text-brand-950 disabled:bg-white/5 disabled:text-white/20 font-black rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-[9px] uppercase tracking-[0.2em] italic flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isVerifyingMfa ? <Loader2 size={12} className="animate-spin text-brand-950" /> : <UserCheck size={14} />}
                                    Verify Pass Code
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
