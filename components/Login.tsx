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
            setError(err.message || 'Failed to sign in with Google.');
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 font-sans select-none relative overflow-hidden">
            {/* Subtle Modern Glow Backdrop */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Clean Centered login Card */}
            <div className="w-full max-w-md bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10 flex flex-col items-center text-center">
                
                {/* Minimal Academy Logo container */}
                <div className="w-16 h-16 bg-slate-800/40 rounded-2xl flex items-center justify-center border border-slate-700/50 mb-6 p-3 shadow-inner">
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                    ) : (
                        <Trophy className="w-8 h-8 text-brand-primary animate-pulse" />
                    )}
                </div>
                
                {/* Headings */}
                <h1 className="text-2xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: settings.fontFamily || 'Inter, sans-serif' }}>
                    {settings.name || 'Academy Portal'}
                </h1>
                <p className="text-slate-400 text-sm mb-8">
                    Welcome back! Please sign in to access your portal.
                </p>

                {error && (
                    <div className="w-full mb-6 p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-center gap-3 text-left animate-in fade-in duration-200">
                        <AlertTriangle size={16} className="shrink-0 text-red-500" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Simplified Google login button */}
                <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 active:scale-[0.98] transition-all rounded-xl font-semibold flex items-center justify-center gap-3 px-6 shadow-md disabled:opacity-50 disabled:grayscale cursor-pointer text-sm"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                            <span>Signing in...</span>
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <span>Sign in with Google</span>
                        </>
                    )}
                </button>
            </div>

            <footer className="mt-8 text-slate-500 text-xs relative z-10">
                &copy; {new Date().getFullYear()} {settings.name || 'Academy'}. All rights reserved.
            </footer>

        </div>
    );
};
