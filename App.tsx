import React, { useState, useEffect, lazy, Suspense, Component } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { StorageService } from './services/storageService';
import { User } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, multiFactor, TotpMultiFactorGenerator } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { LoadingList } from './components/ui/LoadingSkeleton';
import { OrientationGuard } from './components/ui/OrientationGuard';
import { Shield, Zap, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';

// Helper to retry lazy loading on failure (usually due to deployment/version mismatch)
const lazyRetry = (importFn: () => Promise<any>) => 
  lazy(() => 
    importFn().catch((error) => {
      console.error("Chunk load failed, checking for updates...", error);
      const storageKey = 'last-retry-time';
      const lastRetry = sessionStorage.getItem(storageKey);
      const now = Date.now();
      if (!lastRetry || now - parseInt(lastRetry) > 10000) {
        sessionStorage.setItem(storageKey, now.toString());
        window.location.reload();
      }
      return { default: () => <div className="p-8 text-brand-500/20 lowercase font-black text-[10px] tracking-widest italic animate-pulse">Synchronizing Module...</div> };
    })
  );

// Simple Error Boundary to catch absolute rendering crashes
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) return (
        <div className="p-8 text-brand-secondary">
           <h2 className="text-xl font-black uppercase italic mb-4">Application Error</h2>
           <p className="text-sm opacity-70 italic font-medium">Please refresh the page or contact the administrator if the problem persists.</p>
        </div>
    );
    return this.props.children;
  }
}

// Lazy Loaded Components
// Lazy Loaded Components with Retry Logic
const Schedule = lazyRetry(() => import('./components/Schedule').then(m => ({ default: m.Schedule })));
const NoticeBoard = lazyRetry(() => import('./components/NoticeBoard').then(m => ({ default: m.NoticeBoard })));
const Leaderboard = lazyRetry(() => import('./components/Leaderboard').then(m => ({ default: m.Leaderboard })));
const Team = lazyRetry(() => import('./components/Team').then(m => ({ default: m.Team })));
const CoachAttendance = lazyRetry(() => import('./components/CoachAttendance').then(m => ({ default: m.CoachAttendance })));
const MatchManager = lazyRetry(() => import('./components/MatchManager').then(m => ({ default: m.MatchManager })));
const SquadComparison = lazyRetry(() => import('./components/SquadComparison').then(m => ({ default: m.SquadComparison })));
const HeadToHead = lazyRetry(() => import('./components/HeadToHead').then(m => ({ default: m.HeadToHead })));
const EvaluationManager = lazyRetry(() => import('./components/EvaluationManager').then(m => ({ default: m.EvaluationManager })));
const TrainingManager = lazyRetry(() => import('./components/TrainingManager').then(m => ({ default: m.TrainingManager })));
const AdminDashboard = lazyRetry(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UserManagement = lazyRetry(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const PlayerRegistration = lazyRetry(() => import('./components/PlayerRegistration').then(m => ({ default: m.PlayerRegistration })));
const FinanceManager = lazyRetry(() => import('./components/FinanceManager').then(m => ({ default: m.FinanceManager })));
const PlayerManager = lazyRetry(() => import('./components/PlayerManager').then(m => ({ default: m.PlayerManager })));
const PlayerPortal = lazyRetry(() => import('./components/PlayerPortal').then(m => ({ default: m.PlayerPortal })));
const MessagingManager = lazyRetry(() => import('./components/MessagingManager').then(m => ({ default: m.MessagingManager })));
const SupportManager = lazyRetry(() => import('./components/SupportManager').then(m => ({ default: m.SupportManager })));
const KitInventory = lazyRetry(() => import('./components/KitInventory').then(m => ({ default: m.KitInventory })));
const GuestDashboard = lazyRetry(() => import('./components/GuestDashboard').then(m => ({ default: m.GuestDashboard })));
const CoachMessageManager = lazyRetry(() => import('./components/CoachMessageManager').then(m => ({ default: m.CoachMessageManager })));
const BrandingSettings = lazyRetry(() => import('./components/BrandingSettings').then(m => ({ default: m.BrandingSettings })));

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [breadcrumbSegments, setBreadcrumbSegments] = useState<string[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [settings, setSettings] = useState(StorageService.getSettings());

  // 2FA Global Enforcer States
  const [isMfaEnrolled, setIsMfaEnrolled] = useState(true);
  const [mfaSecret, setMfaSecret] = useState<any>(null);
  const [mfaQrUrl, setMfaQrUrl] = useState('');
  const [mfaSecretKey, setMfaSecretKey] = useState('');
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);

  const initializeMfaEnrollment = async () => {
    setMfaError('');
    setIsEnrollingMfa(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("No active authenticated session.");
      
      const session = await multiFactor(firebaseUser).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      setMfaSecret(secret);
      setMfaSecretKey(secret.secretKey);
      
      const email = firebaseUser.email || 'user';
      const qrUrl = secret.generateQrCodeUrl(email, settings.name || 'Icarus Football Academy');
      setMfaQrUrl(qrUrl);
    } catch (err: any) {
      console.error("MFA mandatory enrollment initiation failed:", err);
      setMfaError(err.message || "Failed to initialize 2FA enrollment.");
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  useEffect(() => {
    if (currentUser && !isMfaEnrolled && !mfaSecret && !isEnrollingMfa) {
      initializeMfaEnrollment();
    }
  }, [currentUser, isMfaEnrolled]);

  const handleConfirmMfaEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    setIsEnrollingMfa(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !mfaSecret) throw new Error("Missing active enrollment session.");
      
      if (mfaVerifyCode.trim().length !== 6) {
        throw new Error("Verification code must be exactly 6 digits.");
      }
      
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(mfaSecret, mfaVerifyCode.trim());
      await multiFactor(firebaseUser).enroll(assertion, "Authenticator App");
      
      setIsMfaEnrolled(true);
      setMfaSecret(null);
      setMfaQrUrl('');
      setMfaSecretKey('');
      setMfaVerifyCode('');
    } catch (err: any) {
      console.error("MFA mandatory enrollment confirmation failed:", err);
      setMfaError(err.message || "Invalid verification code. Please check your authenticator and try again.");
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  useEffect(() => {
    StorageService.init();
    
    // Immediate settings loading
    const handleSettingsChange = () => setSettings(StorageService.getSettings());
    window.addEventListener('settingsChanged', handleSettingsChange);

    // Safety timeout: If Firebase doesn't signal readiness in 5s, proceed regardless
    const safetyTimeout = setTimeout(() => {
      setIsAuthReady(true);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(safetyTimeout);
      setIsAuthReady(true); 

      if (firebaseUser) {
        setIsUserLoading(true);
        
        // Enforce 2-Factor Authentication state
        const enrolled = multiFactor(firebaseUser).enrolledFactors.length > 0;
        setIsMfaEnrolled(enrolled);

        // Fetch user role and subscribe to real-time metadata updates
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubUser = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = { id: snapshot.id, ...snapshot.data() } as User;
            setCurrentUser(userData);
            StorageService.startFirebaseSync(userData);
            
            // Set default tab based on role
            if (activeTab === '' || activeTab === 'guest') {
              if (userData.role === 'admin') setActiveTab('admin');
              else if (userData.role === 'coach') setActiveTab('schedule');
              else if (userData.role === 'player') setActiveTab('player-dashboard');
              else setActiveTab('guest'); // pending or rejected
            }
            setIsUserLoading(false);
          } else {
            // User authenticated but no document exists (e.g. registration interrupted)
            setCurrentUser(null);
            setIsUserLoading(false);
          }
        }, (error) => {
          console.error("User metadata sync error:", error);
          StorageService.stopFirebaseSync();
          setIsUserLoading(false);
        });
        
        return; 
      } else {
        setCurrentUser(null);
        setIsMfaEnrolled(true); // reset state
        setIsUserLoading(false);
        StorageService.stopFirebaseSync();
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
      window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, []);

  useEffect(() => {
    const applySettings = (settingsData: any) => {
      const root = document.documentElement;
      if (settingsData.primaryColor) root.style.setProperty('--brand-primary', settingsData.primaryColor);
      if (settingsData.secondaryColor) root.style.setProperty('--brand-secondary', settingsData.secondaryColor);
      
      // Dynamic Google Font Injection & Tailwind variable assignment
      if (settingsData.fontFamily) {
         root.style.setProperty('--font-sans', `"${settingsData.fontFamily}", ui-sans-serif, system-ui, sans-serif`);
         root.style.setProperty('--font-heading', `"${settingsData.fontFamily}", sans-serif`);
         root.style.setProperty('--font-display', `"${settingsData.fontFamily}", sans-serif`);
         root.style.fontFamily = `"${settingsData.fontFamily}", ui-sans-serif, system-ui, sans-serif`;

         // Dynamically append the Google Font link if it does not already exist
         const fontId = `google-font-${settingsData.fontFamily.toLowerCase().replace(/\s+/g, '-')}`;
         if (!document.getElementById(fontId)) {
            const link = document.createElement('link');
            link.id = fontId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(settingsData.fontFamily)}:wght@300;400;500;600;700;800;900&display=swap`;
            document.head.appendChild(link);
         }
      }

      // Handle taming excessive italic typography
      if (settingsData.typographyMode === 'clean') {
         root.classList.add('style-clean-typography');
      } else {
         root.classList.remove('style-clean-typography');
      }
    };

    applySettings(settings);
  }, [settings]);

  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      if (user.role === 'admin') setActiveTab('admin');
      else if (user.role === 'coach') setActiveTab('schedule');
      else if (user.role === 'player') setActiveTab('player-dashboard');
      else setActiveTab('guest'); // pending or rejected
  };

  const handleLogout = async () => {
      await auth.signOut();
      setCurrentUser(null);
      setActiveTab('');
      StorageService.stopFirebaseSync();
  };

  const renderContent = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case 'schedule': return <Schedule currentUser={currentUser} />;
      case 'notices': return <NoticeBoard role={currentUser.role} />;
      case 'leaderboard': return <Leaderboard role={currentUser.role} currentUser={currentUser} />;
      case 'team': return <Team currentUser={currentUser} />;
      case 'coach': return <CoachAttendance />;
      case 'matches': return <MatchManager />;
      case 'squad-comparison': return <SquadComparison />;
      case 'head-to-head': return <HeadToHead />;
      case 'evaluations': return <EvaluationManager onBreadcrumbChange={setBreadcrumbSegments} />;
      case 'training': return <TrainingManager />;
      case 'admin': return <AdminDashboard />;
      case 'branding': return <BrandingSettings />;
      case 'users': return <UserManagement />;
      case 'register': return <PlayerRegistration />;
      case 'finance': return <FinanceManager />;
      case 'players': return <PlayerManager onBreadcrumbChange={setBreadcrumbSegments} />;
      case 'inventory': return <KitInventory />;
      case 'player-dashboard': return <PlayerPortal user={currentUser} />;
      case 'player-progress': return <PlayerPortal user={currentUser} initialSection="progress" />;
      case 'broadcast': return <MessagingManager />;
      case 'support': return <SupportManager />;
      case 'message-coach': return <CoachMessageManager currentUser={currentUser} />;
      case 'guest': return <GuestDashboard user={currentUser} onLogout={handleLogout} />;
      default: return <GuestDashboard user={currentUser} onLogout={handleLogout} />;
    }
  };

  if (!isAuthReady || isUserLoading) {
    return (
      <>
        <OrientationGuard />
        <div className="min-h-screen bg-brand-950 flex flex-col items-center justify-center p-12 overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.03]" 
               style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
            <div className="w-24 h-24 mb-12 relative">
              <div className="absolute inset-0 border-4 border-white/5 rounded-[2rem] scale-110" />
              <div className="absolute inset-0 border-t-4 border-brand-500 rounded-[2rem] animate-spin-slow shadow-[0_0_20px_rgba(0,200,255,0.3)]" />
              <div className="absolute inset-4 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-4 text-center w-full">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">System Initialization</h2>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-brand-500 to-[#CCFF00] animate-progress-flow rounded-full w-2/3" />
              </div>
              <div className="flex justify-between items-center px-1">
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest italic">Node Status: Online</p>
                <p className="text-[8px] font-black text-brand-500 uppercase tracking-widest italic animate-pulse">Syncing Identity...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <OrientationGuard />
        <Login onLogin={handleLoginSuccess} />
      </>
    );
  }

  // Pending/rejected users go straight to the Layout with the guest tab — skip Onboarding
  const isGuest = currentUser.role === 'pending' || currentUser.role === 'rejected';

  // Global Mandatory 2-Factor Authentication (TOTP MFA) Enrollment Enforcer
  if (!isMfaEnrolled) {
    return (
      <>
        <OrientationGuard />
        <div className="min-h-screen bg-brand-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-display selection:bg-brand-500/30">
            {/* Tactical Grid Background */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            
            <div className="absolute top-0 right-0 -mt-24 -mr-24 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[140px] animate-pulse-slow" />
            <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] animate-pulse-slow" />

            <div className="w-full max-w-md bg-brand-900 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative z-10 p-8 sm:p-10 text-center animate-slide-up">
                
                <div className="w-16 h-16 bg-brand-primary/10 border border-brand-primary/20 rounded-[1.25rem] flex items-center justify-center mx-auto text-brand-primary shadow-lg animate-pulse mb-6">
                    <Shield size={28} />
                </div>

                <div className="space-y-2 mb-8">
                    <span className="text-[8px] font-black text-brand-primary uppercase tracking-[0.2em] bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                        Global Security Enforcement
                    </span>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter pt-2">
                        Mandatory 2FA Setup
                    </h2>
                    <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                        To maintain high athletic data security, all staff, coaches, and athletes are required to enroll in 2-Factor Authentication before accessing their dashboards.
                    </p>
                </div>

                {mfaError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold rounded-2xl text-left leading-relaxed animate-in fade-in">
                        {mfaError}
                    </div>
                )}

                <form onSubmit={handleConfirmMfaEnrollment} className="space-y-6">
                    
                    <div className="space-y-2">
                        <div className="text-[9px] font-black text-brand-primary uppercase tracking-[0.25em] italic">Step 1: Scan QR Code</div>
                        <p className="text-[9px] text-white/40 leading-relaxed font-medium">Scan this QR code with Google Authenticator, Authy, or any security app.</p>
                    </div>

                    {mfaQrUrl ? (
                        <div className="relative inline-block group">
                            <div className="absolute inset-0 bg-brand-primary/10 rounded-3xl blur-xl group-hover:bg-brand-primary/20 transition-all duration-700 pointer-events-none" />
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mfaQrUrl)}`} 
                                className="w-40 h-40 mx-auto bg-white p-3 rounded-[2rem] shadow-2xl relative z-10 border-4 border-white/10" 
                                alt="MFA QR Code" 
                            />
                        </div>
                    ) : (
                        <div className="w-40 h-40 mx-auto bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center animate-pulse">
                            <Loader2 size={24} className="animate-spin text-brand-primary/30" />
                        </div>
                    )}

                    {mfaSecretKey && (
                        <div className="space-y-2 pt-2">
                            <div className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none">Can't scan? Use manual secret key:</div>
                            <div className="p-3 bg-brand-950 border border-white/5 rounded-xl text-[10px] font-mono font-bold tracking-widest text-brand-primary break-all select-all shadow-inner">
                                {mfaSecretKey}
                            </div>
                        </div>
                    )}

                    <div className="h-[1px] bg-white/5 w-full my-6" />

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="text-[9px] font-black text-brand-primary uppercase tracking-[0.25em] italic">Step 2: Confirm Code</div>
                            <p className="text-[9px] text-white/40 leading-relaxed font-medium">Enter the 6-digit confirmation code from your authenticator app below.</p>
                        </div>

                        <input 
                            type="text" 
                            maxLength={6}
                            placeholder="000 000"
                            value={mfaVerifyCode}
                            onChange={e => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full text-center p-4 bg-brand-950 border border-white/10 rounded-xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-primary font-mono text-xl font-bold tracking-[0.5em] text-white shadow-inner uppercase placeholder:text-white/5"
                            required
                        />
                    </div>

                    <div className="pt-6 flex gap-4 border-t border-white/5">
                        <button 
                            type="button"
                            onClick={handleLogout}
                            className="flex-1 py-4 text-white/30 hover:text-white font-black rounded-xl transition-all text-[9px] uppercase tracking-widest italic cursor-pointer"
                        >
                            Cancel / Log Out
                        </button>
                        <button 
                            type="submit"
                            disabled={isEnrollingMfa || mfaVerifyCode.trim().length !== 6}
                            className="flex-[2] py-4 bg-brand-primary text-brand-950 disabled:bg-white/5 disabled:text-white/20 font-black rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-[9px] uppercase tracking-[0.2em] italic flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isEnrollingMfa ? <Loader2 size={12} className="animate-spin text-brand-950" /> : <Zap size={14} />}
                            Activate 2FA
                        </button>
                    </div>

                </form>
            </div>
        </div>
      </>
    );
  }

  // Intercept if profile is incomplete (admin/coach/player only)
  if (!isGuest && window.location.hostname !== 'localhost' && (!currentUser.fullName || !currentUser.memberId)) {
    return (
      <>
        <OrientationGuard />
        <Onboarding user={currentUser} onComplete={(updated: any) => setCurrentUser(updated)} />
      </>
    );
  }

  return (
    <>
      <OrientationGuard />
      <Layout currentUser={currentUser} activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setBreadcrumbSegments([]); }} onLogout={handleLogout} breadcrumbSegments={breadcrumbSegments}>
        <Suspense fallback={
          <div className="p-8 animate-in fade-in duration-500">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-brand-800 rounded-xl animate-pulse" />
                <div className="space-y-2">
                   <div className="h-4 w-32 bg-brand-800 rounded animate-pulse" />
                   <div className="h-3 w-48 bg-brand-800/50 rounded animate-pulse" />
                </div>
             </div>
             <LoadingList count={3} />
          </div>
        }>
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </Suspense>
      </Layout>
    </>
  );
};

export default App;
