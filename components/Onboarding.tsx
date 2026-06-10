import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Shield, Users, UploadCloud, ChevronRight, Check, Trophy, Zap } from 'lucide-react';
import Papa from 'papaparse';
import { db } from '../firebase';
import { doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { User } from '../types';

interface OnboardingProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<string>('coach');
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleRoleSelect = (selectedRole: string) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          let count = 0;
          
          results.data.forEach((row: any) => {
            if (row.name) {
              const newPlayerRef = doc(collection(db, 'players'));
              batch.set(newPlayerRef, {
                id: newPlayerRef.id,
                fullName: row.fullName || row.name,
                squadId: row.squadId || 'unassigned',
                position: row.position || 'Unknown',
                createdAt: new Date().toISOString(),
              });
              count++;
            }
          });
          
          await batch.commit();
          setImportedCount(count);
          setLoading(false);
          setStep(3);
        } catch (error) {
          console.error("Error importing squad:", error);
          setLoading(false);
        }
      }
    });
  };

  const finishSetup = async () => {
    setLoading(true);
    try {
      const updatedUser: User = { 
        ...user, 
        role: (role === 'academy_director' ? 'admin' : 'coach') as any,
        fullName: user.fullName || user.username,
        memberId: user.memberId || `M-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        onboardingComplete: true, 
        specificRole: role 
      };
      
      await setDoc(doc(db, 'users', user.id), updatedUser, { merge: true });
      
      // Artificial delay for "moment of success"
      setTimeout(() => {
        onComplete(updatedUser);
      }, 1500);
    } catch (error) {
      console.error("Error finishing setup:", error);
      alert("Failed to save profile. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-display">
      {/* Background layers - matching PendingApproval/Login style */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div className="absolute top-0 right-0 -mt-32 -mr-32 w-[700px] h-[700px] bg-brand-500/10 rounded-full blur-[180px] animate-pulse-slow" />
      <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-[500px] h-[500px] bg-[#CCFF00]/5 rounded-full blur-[140px]" />

      <div className="glass-card max-w-2xl w-full p-12 relative overflow-hidden border-white/10 shadow-2xl ring-1 ring-white/5">
        {/* Refined Progress Indicator */}
        <div className="absolute top-0 left-0 right-0 flex h-1 gap-1.5 px-2 pt-2">
            {[1,2,3].map(i => (
                <div key={i} className={`flex-1 transition-all duration-700 rounded-full ${step >= i ? 'bg-[#CCFF00]' : 'bg-white/5'}`} />
            ))}
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="animate-fade-in space-y-10 pt-4">
             <div className="text-center">
               <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                 CREATE YOUR <span className="text-[#CCFF00]">PROFILE</span>
               </h2>
               <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">Select primary academy designation</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => handleRoleSelect('head_coach')} 
                  className={`glass-card p-8 border-white/5 transition-all flex flex-col gap-5 group text-left relative overflow-hidden active:scale-[0.98] ${
                    role === 'head_coach' ? 'ring-2 ring-[#CCFF00]/40 bg-white/10' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className={`p-3.5 rounded-lg w-fit transition-all ${
                    role === 'head_coach' ? 'bg-[#CCFF00] text-brand-950' : 'bg-white/5 text-white/40 group-hover:bg-[#CCFF00]/10 group-hover:text-[#CCFF00]'
                  }`}>
                    <Shield size={24} />
                  </div>
                  <div>
                     <h3 className={`font-black uppercase tracking-tight text-sm ${role === 'head_coach' ? 'text-[#CCFF00]' : 'text-white'}`}>HEAD COACH</h3>
                     <p className="text-[10px] text-white/40 font-bold leading-relaxed mt-2 uppercase tracking-wide">Squad training, fixtures, and performance metrics.</p>
                  </div>
                  {role === 'head_coach' && <div className="absolute top-6 right-6 text-[#CCFF00]"><Check size={18} strokeWidth={3} /></div>}
                </button>

                <button 
                  onClick={() => handleRoleSelect('academy_director')} 
                  className={`glass-card p-8 border-white/5 transition-all flex flex-col gap-5 group text-left relative overflow-hidden active:scale-[0.98] ${
                    role === 'academy_director' ? 'ring-2 ring-[#CCFF00]/40 bg-white/10' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className={`p-3.5 rounded-lg w-fit transition-all ${
                    role === 'academy_director' ? 'bg-[#CCFF00] text-brand-950' : 'bg-white/5 text-white/40 group-hover:bg-[#CCFF00]/10 group-hover:text-[#CCFF00]'
                  }`}>
                    <Users size={24} />
                  </div>
                  <div>
                     <h3 className={`font-black uppercase tracking-tight text-sm ${role === 'academy_director' ? 'text-[#CCFF00]' : 'text-white'}`}>DIRECTOR</h3>
                     <p className="text-[10px] text-white/40 font-bold leading-relaxed mt-2 uppercase tracking-wide">Oversight, registry management, and system logs.</p>
                  </div>
                  {role === 'academy_director' && <div className="absolute top-6 right-6 text-[#CCFF00]"><Check size={18} strokeWidth={3} /></div>}
                </button>
             </div>
             <div className="flex justify-center">
                <button onClick={() => setStep(2)} className="text-[9px] font-black text-white/20 hover:text-[#CCFF00] uppercase tracking-[0.25em] transition-all">SKIP FOR NOW</button>
             </div>
          </div>
        )}

        {/* Step 2: Squad Import */}
        {step === 2 && (
          <div className="animate-fade-in space-y-10 pt-4">
             <div className="text-center">
               <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                 IMPORT <span className="text-[#CCFF00]">PLAYERS</span>
               </h2>
               <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">Import player records from a CSV file</p>
             </div>
             
             <div className="glass-card border-dashed border-2 border-white/10 p-16 text-center hover:border-[#CCFF00]/40 transition-all bg-white/[0.02] relative group cursor-pointer">
               <input type="file" accept=".csv" onChange={handleFileUpload} disabled={loading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
               <div className="w-16 h-16 bg-white/10 text-[#CCFF00] rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#CCFF00]/10 group-hover:shadow-[0_0_30px_rgba(204,255,0,0.2)] transition-all">
                 <UploadCloud size={28} />
               </div>
               <h3 className="font-black text-lg text-white uppercase tracking-tight mb-2">UPLOAD CSV FILE</h3>
               <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">Expected: name, squadId, position</p>
               {loading && <div className="absolute inset-0 bg-brand-950/90 backdrop-blur-md flex flex-col items-center justify-center rounded-[inherit] z-20">
                  <div className="w-10 h-10 border-2 border-[#CCFF00]/20 border-t-[#CCFF00] rounded-full animate-spin mb-4" />
                  <p className="text-[9px] font-black text-[#CCFF00] uppercase tracking-[0.2em]">Processing Roster Data...</p>
               </div>}
             </div>
             
             <button onClick={() => setStep(3)} className="w-full py-4 text-white/20 hover:text-white font-black text-[9px] uppercase tracking-[0.25em] flex items-center justify-center gap-2 transition-all">
                ADD PLAYERS MANUALLY <ChevronRight size={14}/>
             </button>
          </div>
        )}

        {/* Step 3: Complete Moment */}
        {step === 3 && (
            <div className="animate-fade-in text-center space-y-10 py-8 pt-12">
                {loading ? (
                    <div className="flex flex-col items-center space-y-8">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center relative">
                            <div className="absolute inset-0 border-2 border-[#CCFF00]/10 border-t-[#CCFF00] rounded-full animate-spin" />
                            <Trophy className="text-[#CCFF00]" size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                SAVING <span className="text-[#CCFF00]">PROFILE</span>
                            </h2>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mt-3">Saving settings...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-24 h-24 bg-[#CCFF00]/10 text-[#CCFF00] rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(204,255,0,0.15)] ring-1 ring-[#CCFF00]/20">
                            <Check size={40} strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                SETUP <span className="text-[#CCFF00]">COMPLETED</span>
                            </h2>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em]">
                                {importedCount > 0 ? `${importedCount} PLAYERS IMPORTED` : 'SETUP COMPLETED SUCCESSFULLY'}
                            </p>
                        </div>
                        <button 
                            onClick={finishSetup}
                            className="w-full bg-[#CCFF00] text-brand-950 font-black px-10 py-5 rounded-2xl shadow-[0_20px_50px_rgba(204,255,0,0.2)] hover:bg-[#d4ff33] transition-all uppercase tracking-[0.25em] text-[10px] flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            <Zap size={14} fill="currentColor" /> ENTER DASHBOARD
                        </button>
                    </>
                )}
            </div>
        )}
      </div>
    </div>

  );
};
