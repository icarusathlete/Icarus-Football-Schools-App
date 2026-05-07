
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, User } from '../types';
import { ChevronLeft, ChevronRight, Shield, User as UserIcon, Star, MapPin, Layers, Lock, Mail, Zap } from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { PlayerPerformanceModal } from './PlayerPerformanceModal';

interface TeamProps {
    currentUser: User;
}

const PlayerCard: React.FC<{ player: Player; onViewProfile: (p: Player) => void }> = ({ player, onViewProfile }) => (
    <div className="flex-shrink-0 w-72 h-96 relative rounded-[2.5rem] overflow-hidden group snap-center shadow-2xl transition-all duration-500 hover:scale-[1.02] border border-white/5 hover:border-brand-primary/50 bg-brand-950">
        {/* Background Image */}
        <img 
            src={player.photoUrl} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => { e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/166/166344.png"; }}
            alt={player.fullName}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/40 to-transparent opacity-90" />

        {/* Card Content */}
        <div className="absolute inset-0 p-8 flex flex-col justify-end">
            <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center justify-between mb-2">
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                        {player.position}
                    </span>
                    <span className="text-4xl font-black text-white/5 font-mono tracking-tighter group-hover:text-white/10 transition-colors">
                        SQUAD
                    </span>
                </div>
                
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-1 leading-none">
                    {player.fullName}
                </h3>
                
                <div className="flex items-center gap-3 text-xs font-bold text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Layers size={12} className="text-brand-500" /> {player.batch || 'Academy'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                    <span className="flex items-center gap-1"><MapPin size={12} className="text-brand-500" /> {player.venue || 'General'}</span>
                </div>

                {/* Mini Stats (v2 Tactical Overhaul) */}
                <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-6 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                    <div className="text-center">
                        <div className="text-[8px] text-brand-primary/40 uppercase font-black tracking-widest italic">Rating</div>
                        <div className="text-xl font-black text-brand-primary italic">{player.evaluation?.overallRating || '-'}</div>
                    </div>
                    <div className="text-center border-l border-white/5">
                        <div className="text-[8px] text-brand-primary/40 uppercase font-black tracking-widest italic">Age</div>
                        <div className="text-xl font-black text-white italic">{new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear()}</div>
                    </div>
                    <div className="text-center border-l border-white/5">
                        <div className="text-[8px] text-brand-primary/40 uppercase font-black tracking-widest italic">Form</div>
                        <div className="text-xl font-black text-lime italic">8.5</div>
                    </div>
                </div>
                
                <button 
                    onClick={() => onViewProfile(player)}
                    className="w-full mt-6 py-3 bg-brand-primary text-brand-950 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200 hover:scale-[1.02] active:scale-95 shadow-lg"
                >
                    VIEW PROFILE
                </button>
            </div>
        </div>
    </div>
);

const CoachCard: React.FC<{ user: User }> = ({ user }) => (
    <div className="flex-shrink-0 w-72 bg-brand-950 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 group relative hover:border-brand-primary/30 transition-all duration-500 snap-center flex flex-col">
        {/* Background Pattern / Header */}
        <div className="h-32 bg-brand-900 relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand-primary/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            {/* Staff Badge */}
            <div className="absolute top-6 right-6 bg-brand-950/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl italic">
                <Shield size={12} className="text-brand-primary" /> STAFF
            </div>
        </div>

        {/* Profile Image - Floating */}
        <div className="relative -mt-16 px-8 flex justify-between items-end">
            <div className="relative">
                <div className="w-28 h-28 rounded-3xl p-1 bg-brand-950 shadow-3xl border border-white/5">
                    <img 
                        src={user.photoUrl || `https://ui-avatars.com/api/?name=${user.username}&background=050505&color=fff&size=256`} 
                        className="w-full h-full object-cover rounded-2xl bg-brand-900"
                        alt={user.username}
                        onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${user.username}&background=050505&color=fff&size=256`; }}
                    />
                </div>
                {/* Online/Status Indicator */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-lime border-[4px] border-brand-950 rounded-full shadow-xl"></div>
            </div>
            
            {/* Quick Action */}
            <button className="mb-2 p-3.5 bg-brand-900 text-brand-primary rounded-2xl hover:bg-brand-primary hover:text-brand-950 transition-all border border-white/5 shadow-xl">
                <Mail size={18} />
            </button>
        </div>

        {/* Info Section */}
        <div className="p-8 pt-6 flex-1 bg-brand-950">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-tight mb-1">{user.username}</h3>
            <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] mb-8 italic">OFFICIAL COACH</p>

            {/* Assignments / Specialization */}
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-brand-900 rounded-xl text-brand-primary mt-0.5 border border-white/5 shadow-inner">
                        <MapPin size={14} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 italic">Assigned Venue</p>
                        <p className="text-xs font-black text-white leading-snug italic uppercase">
                            {user.assignedVenues && user.assignedVenues.length > 0 
                                ? user.assignedVenues.join(' // ') 
                                : 'CENTRAL_ROVING'}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-brand-900 rounded-xl text-brand-primary mt-0.5 border border-white/5 shadow-inner">
                        <Layers size={14} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 italic">Academy Information</p>
                        <p className="text-xs font-black text-white leading-snug italic uppercase">
                            {user.assignedBatches && user.assignedBatches.length > 0 
                                ? user.assignedBatches.join(' // ') 
                                : 'FULL_ACADEMY_SYNC'}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-brand-900/50 px-8 py-4 border-t border-white/5 flex justify-between items-center mt-auto backdrop-blur-md">
            <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.2em] italic font-mono">STAFF_ID_{user.id.substring(0,4).toUpperCase()}</span>
            <Zap size={10} className="text-brand-primary opacity-20" />
        </div>
    </div>
);

export const Team: React.FC<TeamProps> = ({ currentUser }) => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [coaches, setCoaches] = useState<User[]>([]);
    const [myPlayerProfile, setMyPlayerProfile] = useState<Player | null>(null);
    const [filter, setFilter] = useState<'MY_BATCH' | 'ALL'>('MY_BATCH');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    const squadScrollRef = useRef<HTMLDivElement>(null);
    const coachScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = () => {
        const allPlayers = StorageService.getPlayers();
        const allUsers = StorageService.getUsers();
        
        // Get Coaches ONLY (Filter out admins)
        const coachUsers = allUsers.filter(u => u.role === 'coach');
        setCoaches(coachUsers);

        if (currentUser.role === 'player' && currentUser.linkedPlayerId) {
            // IF PLAYER: Show only their batch mates (by default)
            const me = allPlayers.find(p => p.id === currentUser.linkedPlayerId);
            setMyPlayerProfile(me || null);
            setPlayers(allPlayers);
        } else if (currentUser.role === 'coach') {
            // IF COACH: Filter based on assigned Venues & Batches
            let visiblePlayers = allPlayers;
            
            // Check if coach has assignments (if undefined/empty, we assume no access or full access depending on policy. Let's strict: no access)
            const hasAssignments = (currentUser.assignedVenues && currentUser.assignedVenues.length > 0) || 
                                   (currentUser.assignedBatches && currentUser.assignedBatches.length > 0);

            if (hasAssignments) {
                visiblePlayers = allPlayers.filter(p => {
                    const venueMatch = !currentUser.assignedVenues?.length || (p.venue && currentUser.assignedVenues.includes(p.venue));
                    const batchMatch = !currentUser.assignedBatches?.length || (p.batch && currentUser.assignedBatches.includes(p.batch));
                    return venueMatch && batchMatch;
                });
            } else {
                // If legacy coach with no assignments, show none to prompt assignment
                visiblePlayers = []; 
            }
            
            setPlayers(visiblePlayers);
            setFilter('ALL');
        } else {
            // IF ADMIN: Show everyone
            setPlayers(allPlayers);
            setFilter('ALL');
        }
    };

    const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
        if (ref.current) {
            const scrollAmount = 320; // Approx card width + gap
            ref.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const displayedPlayers = players.filter(p => {
        if (filter === 'ALL') return true;
        if (filter === 'MY_BATCH' && myPlayerProfile) {
            return p.batch === myPlayerProfile.batch;
        }
        return true;
    });

    return (
        <div className="space-y-12 pb-20 animate-in fade-in duration-500">
            
            <PageHeader
                title="TEAM HUB"
                subtitle={currentUser.role === 'coach' 
                    ? 'Academy Squad Management' 
                    : myPlayerProfile ? `SQUAD ROSTER // ${myPlayerProfile.batch}` : 'Academy Personnel'}
                extra={
                    currentUser.role === 'admin' && (
                        <div className="flex">
                            <button className="px-8 py-3 bg-[#CCFF00] text-brand-950 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(204,255,0,0.4)] italic transition-all">
                                TOTAL SQUAD
                            </button>
                            <button className="px-8 py-3 text-white/40 hover:text-[#CCFF00] rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all italic">
                                REFRESH
                            </button>
                        </div>
                    )
                }
            />

            {/* Coaches Section */}
            <section className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-white uppercase italic tracking-[0.3em] flex items-center gap-3">
                            <Shield className="text-brand-primary" size={20} /> COACHING <span className="text-brand-primary">STAFF</span>
                        </h2>
                        <div className="h-1 w-24 bg-brand-primary/20 rounded-full" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => scroll(coachScrollRef, 'left')} className="p-3 rounded-2xl bg-brand-950 border border-white/5 text-white/40 hover:text-brand-primary hover:border-brand-primary transition-all shadow-xl active:scale-90"><ChevronLeft size={24} /></button>
                        <button onClick={() => scroll(coachScrollRef, 'right')} className="p-3 rounded-2xl bg-brand-950 border border-white/5 text-white/40 hover:text-brand-primary hover:border-brand-primary transition-all shadow-xl active:scale-90"><ChevronRight size={24} /></button>
                    </div>
                </div>
                
                <div 
                    ref={coachScrollRef}
                    className="flex gap-6 overflow-x-auto pb-8 pt-2 px-2 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {coaches.map(coach => (
                        <CoachCard key={coach.id} user={coach} />
                    ))}
                    {coaches.length === 0 && (
                        <div className="w-full py-16 text-center text-white/10 glass-card rounded-[3rem] border-dashed border-white/5 flex flex-col items-center justify-center gap-4 italic uppercase tracking-widest font-black text-xs">
                            <Shield size={48} className="opacity-5" />
                            No coaches assigned.
                        </div>
                    )}
                </div>
            </section>

            {/* Squad Section */}
            <section className="space-y-8 animate-in slide-in-from-bottom-12 duration-1000">
                <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-white uppercase italic tracking-[0.3em] flex items-center gap-3">
                            <UserIcon className="text-brand-primary" size={20} /> 
                            {myPlayerProfile ? 'MY SQUAD' : 'ACADEMY SQUAD'}
                            <span className="bg-brand-950 text-brand-primary px-4 py-1 rounded-xl text-xs font-black ml-4 border border-brand-primary/20 shadow-xl">{displayedPlayers.length} TEAMMATES</span>
                        </h2>
                        <div className="h-1 w-32 bg-brand-primary/20 rounded-full" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => scroll(squadScrollRef, 'left')} className="p-3 rounded-2xl bg-brand-950 border border-white/5 text-white/40 hover:text-brand-primary hover:border-brand-primary transition-all shadow-xl active:scale-90"><ChevronLeft size={24} /></button>
                        <button onClick={() => scroll(squadScrollRef, 'right')} className="p-3 rounded-2xl bg-brand-950 border border-white/5 text-white/40 hover:text-brand-primary hover:border-brand-primary transition-all shadow-xl active:scale-90"><ChevronRight size={24} /></button>
                    </div>
                </div>

                <div 
                    ref={squadScrollRef}
                    className="flex gap-6 overflow-x-auto pb-12 pt-4 px-2 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {displayedPlayers.map(player => (
                        <PlayerCard key={player.id} player={player} onViewProfile={setSelectedPlayer} />
                    ))}
                    {displayedPlayers.length === 0 && (
                        <div className="w-full py-24 text-center flex flex-col items-center justify-center glass-card rounded-[3rem] border-2 border-dashed border-white/5 italic">
                            {currentUser.role === 'coach' ? (
                                <>
                                    <Lock size={64} className="text-white/5 mb-6 animate-pulse" />
                                    <p className="text-white/60 font-black uppercase tracking-[0.3em] text-sm">No players assigned yet.</p>
                                    <p className="text-[10px] text-brand-primary/40 mt-3 font-black uppercase tracking-widest">Awaiting venue assignment from the Academy.</p>
                                </>
                            ) : (
                                <>
                                    <UserIcon size={64} className="text-white/5 mb-6" />
                                    <p className="text-white/60 font-black uppercase tracking-[0.3em] text-sm">Your squad is empty.</p>
                                    <p className="text-[10px] text-brand-primary/40 mt-3 font-black uppercase tracking-widest">No active teammates found in this section.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Player Profile Modal */}
            {selectedPlayer && (
                <PlayerPerformanceModal 
                    player={selectedPlayer} 
                    onClose={() => setSelectedPlayer(null)} 
                    role={currentUser.role}
                />
            )}
        </div>
    );
};
