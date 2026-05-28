
import React, { useState, useEffect } from 'react';
import { Trophy, ClipboardCheck, Users, BarChart3, LogOut, Shield, LayoutDashboard, Calendar, FileText, Megaphone, DollarSign, Menu, X, MoreHorizontal, Medal, Gauge, Database, Download, CheckCircle2, UserCog, Shirt, Dumbbell, Swords, LifeBuoy, ChevronDown, ChevronRight, Package, Palette } from 'lucide-react';
import { User, Role, AcademySettings } from '../types';
import { StorageService } from '../services/storageService';


interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
  currentUser: User;
  onLogout: () => void;
  breadcrumbSegments?: string[];
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
}

interface NavItemComponentProps {
  item: NavItem;
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const SidebarItem: React.FC<NavItemComponentProps> = ({ item, activeTab, onTabChange }) => (
  <button
    onClick={() => onTabChange(item.id)}
    className={`w-full flex items-center space-x-3 px-5 py-3 rounded-xl transition-all duration-300 group relative ${
      activeTab === item.id 
        ? 'bg-brand-500/10 text-white shadow-lg shadow-brand-500/10 border border-brand-500/20' 
        : 'text-white/40 hover:bg-white/5 hover:text-white'
    }`}
  >
    <item.icon className={`w-4 h-4 transition-all duration-300 ${activeTab === item.id ? 'text-white scale-110' : 'text-white/60 group-hover:text-white group-hover:scale-110'}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
    <span className={`text-[9px] uppercase tracking-[0.2em] transition-all ${activeTab === item.id ? 'font-black text-white' : 'font-bold'}`}>{item.label}</span>
    {activeTab === item.id && (
      <div className="absolute right-4 w-1 h-1 rounded-full bg-brand-500 animate-pulse" />
    )}
  </button>
);

interface SidebarSectionProps {
  section: { id: string; title: string; items: NavItem[]; isPinned?: boolean };
  activeTab: string;
  onTabChange: (tab: any) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ section, activeTab, onTabChange, isExpanded, onToggle }) => {
  if (section.isPinned) {
    return (
      <div className="space-y-1 mb-6">
        {section.items.map(item => (
          <SidebarItem key={item.id} item={item} activeTab={activeTab} onTabChange={onTabChange} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 mb-2">
      <button 
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-2 group cursor-pointer transition-all ${isExpanded ? 'border-b border-brand-accent/30 mb-2 pb-3' : 'mb-2'}`}
      >
        <h3 className={`text-[8px] font-black uppercase tracking-[0.35em] transition-colors ${isExpanded ? 'text-brand-accent' : 'text-brand-500/40 group-hover:text-brand-500/70'}`}>
          {section.title}
        </h3>
        <div className="p-1 rounded-md group-hover:bg-white/5 transition-colors">
            {isExpanded ? (
              <ChevronDown size={10} className="text-brand-accent/50 group-hover:text-brand-accent" />
            ) : (
              <ChevronRight size={10} className="text-brand-500/30 group-hover:text-brand-500/60" />
            )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="space-y-1 mt-1 animate-in slide-in-from-top-2 duration-200">
          {section.items.map(item => (
            <SidebarItem key={item.id} item={item} activeTab={activeTab} onTabChange={onTabChange} />
          ))}
        </div>
      )}
    </div>
  );
};

const getShortLabel = (label: string) => {
  const mapping: Record<string, string> = {
    'Academy Hub': 'Hub',
    'Squad Management': 'Squad',
    'New Athlete': 'New',
    'Finance Hub': 'Finance',
    'Access Control': 'Access',
    'Rankings': 'Rank',
    'Match Center': 'Match',
    'Scout Reports': 'Reports',
    'Pro Analytics': 'Analytics'
  };
  return mapping[label] || label.split(' ')[0];
};

const BottomNavItem: React.FC<NavItemComponentProps> = ({ item, activeTab, onTabChange }) => (
  <button
    onClick={() => onTabChange(item.id)}
    className={`flex flex-col items-center justify-center py-2 px-1 flex-1 min-w-0 transition-all duration-500 overflow-hidden ${
      activeTab === item.id ? 'text-white scale-110' : 'text-white/40 hover:text-white'
    }`}
  >
    <item.icon className={`w-6 h-6 mb-1 ${activeTab === item.id ? 'fill-white/10' : ''}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
    <span className={`text-[9px] font-black uppercase tracking-tight truncate w-full text-center ${activeTab === item.id ? 'opacity-100' : 'opacity-70'}`}>
        {getShortLabel(item.label)}
    </span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, currentUser, onLogout, breadcrumbSegments = [] }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tools: true, // Default open tools
    analytics: false,
    communication: false,
    general: false
  });

  useEffect(() => {
    const handleSettingsChange = () => setSettings(StorageService.getSettings());
    const handleDataUpdate = () => setLastSaved(new Date());
    
    window.addEventListener('settingsChanged', handleSettingsChange);
    window.addEventListener('academy_data_update', handleDataUpdate);
    
    return () => {
        window.removeEventListener('settingsChanged', handleSettingsChange);
        window.removeEventListener('academy_data_update', handleDataUpdate);
    };
  }, []);

  const getNavSections = () => {
    const sections: { id: string; title: string; items: NavItem[]; isPinned?: boolean }[] = [];
    
    const core = [
      { id: 'leaderboard', label: 'Rankings', icon: Medal },
      { id: 'team', label: 'Team', icon: Shirt }, 
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'notices', label: 'Notices', icon: Megaphone },
    ];

    const communication = [
      { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
      { id: 'support', label: 'Support Hub', icon: LifeBuoy },
    ];

    const intelligence = [
      { id: 'squad-comparison', label: 'Performance', icon: BarChart3 },
      { id: 'head-to-head', label: 'Match Analysis', icon: Swords },
      { id: 'evaluations', label: 'Player Reports', icon: Gauge },
    ];

    const operations = [
      { id: 'coach', label: 'Attendance', icon: ClipboardCheck },
      { id: 'matches', label: 'Match Center', icon: Trophy },
      { id: 'training', label: 'Training', icon: Dumbbell },
    ];

    const management = [
      { id: 'admin', label: 'Academy Hub', icon: LayoutDashboard },
      { id: 'players', label: 'Squad Management', icon: UserCog },
      { id: 'register', label: 'New Athlete', icon: Users },
      { id: 'inventory', label: 'Kit & Equipment', icon: Package },
      { id: 'finance', label: 'Finance Hub', icon: DollarSign },
      { id: 'users', label: 'Access Control', icon: Shield },
      { id: 'branding', label: 'School Branding', icon: Palette },
    ];

    if (currentUser.role === 'player') {
      sections.push({ id: 'core', title: 'ACADEMY CORE', items: [
        { id: 'player-dashboard', label: 'Portal', icon: LayoutDashboard }, 
        { id: 'player-progress', label: 'My Progress', icon: BarChart3 },
        ...core
      ] });
      sections.push({ id: 'support', title: 'SUPPORT', items: [
        { id: 'message-coach', label: 'Message Coach', icon: FileText },
        { id: 'support', label: 'Support Hub', icon: LifeBuoy }
      ] });
      return sections;
    }

    if (currentUser.role === 'pending' || currentUser.role === 'rejected') {
      sections.push({ id: 'guest', title: 'GUEST ACCESS', items: [{ id: 'guest', label: 'Home', icon: LayoutDashboard }] });
      return sections;
    }

    const isLevelAdmin = currentUser.role === 'admin';
    const isLevelCoach = currentUser.role === 'coach';

    // 1. PINNED SECTION (Always Visible)
    const pinned: NavItem[] = [];
    if (isLevelAdmin) {
      pinned.push(management[0]); // Hub
      pinned.push(operations[0]); // Attendance
      pinned.push(management[1]); // Squad
    } else if (isLevelCoach) {
      pinned.push(operations[0]); // Attendance
    }
    
    if (pinned.length > 0) {
      sections.push({ id: 'pinned', title: 'QUICK ACCESS', items: pinned, isPinned: true });
    }

    // 2. ACADEMY TOOLS (Collapsible)
    const tools: NavItem[] = [];
    tools.push(operations[1]); // Match Center
    tools.push(operations[2]); // Training
    if (isLevelAdmin) {
      tools.push(management[2]); // New Athlete
      tools.push(management[3]); // Kit & Equipment
      tools.push(management[4]); // Finance
      tools.push(management[5]); // Access
    }
    sections.push({ id: 'tools', title: 'MANAGEMENT', items: tools });

    // 3. ANALYTICS (Collapsible)
    sections.push({ id: 'analytics', title: 'ANALYTICS', items: intelligence });

    // 4. COMMUNICATION (Collapsible)
    sections.push({ id: 'communication', title: 'COMMUNICATION', items: communication });

    // 5. GENERAL (Collapsible)
    sections.push({ id: 'general', title: 'ACADEMY CORE', items: core });

    return sections;
  };

  useEffect(() => {
    const sections = getNavSections();
    const currentSection = sections.find(s => s.items.some(i => i.id === activeTab));
    if (currentSection && !currentSection.isPinned && !expandedSections[currentSection.id]) {
        setExpandedSections(prev => ({ ...prev, [currentSection.id]: true }));
    }
  }, [activeTab]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const navSections = getNavSections();
  const allNavItems = navSections.flatMap(s => s.items);

  // Breadcrumb Logic
  const currentSection = navSections.find(s => s.items.some(i => i.id === activeTab));
  const currentItem = allNavItems.find(i => i.id === activeTab);
  const baseSegments = currentSection ? [currentSection.title] : [];
  if (currentItem) baseSegments.push(currentItem.label);
  const finalSegments = [...baseSegments, ...breadcrumbSegments];

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col lg:flex-row relative overflow-x-hidden">
      <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 z-20 bg-brand-secondary border-r border-white/5 shadow-2xl text-white">
        <div className="p-5 flex flex-col items-center text-center border-b border-white/5 relative overflow-hidden group">
          {/* Subtle glowing brand spotlight background */}
          <div className="absolute top-0 inset-x-0 h-16 bg-brand-primary/5 rounded-full blur-2xl group-hover:bg-brand-primary/10 transition-all duration-700 pointer-events-none" />
          
          {/* Enlarge and beautify the logo container */}
          <div className="shrink-0 p-2 bg-white/5 rounded-2xl shadow-xl flex items-center justify-center w-14 h-14 ring-1 ring-white/10 overflow-hidden mb-3 logo-container-premium transition-transform duration-500 hover:scale-105 backdrop-blur-md">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} className="w-full h-full object-contain rounded-xl logo-glow-effect" alt="Logo" />
            ) : (
              <Trophy className="w-8 h-8 text-brand-primary animate-pulse" />
            )}
          </div>
          <div className="w-full">
            <h1 className="text-[10px] font-black italic uppercase text-white tracking-wider leading-tight drop-shadow-sm">
              {settings.name.split(' ').map((word, i, arr) => (
                <React.Fragment key={i}>
                  <span className={i === arr.length - 1 ? 'text-brand-primary' : ''}>
                    {word}
                  </span>
                  {i < arr.length - 1 && ' '}
                </React.Fragment>
              ))}
            </h1>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5 shadow-inner">
              <span className="w-1 h-1 rounded-full bg-brand-primary animate-pulse shadow-[0_0_8px_var(--brand-primary)]" />
              <span className="text-[6.5px] text-white/40 uppercase tracking-[0.18em] font-black leading-none">
                {(['pending', 'rejected'].includes(currentUser.role) ? 'guest' : currentUser.role).toUpperCase()} PORTAL
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
          {navSections.map((section) => (
            <SidebarSection 
              key={section.id} 
              section={section} 
              activeTab={activeTab} 
              onTabChange={onTabChange} 
              isExpanded={expandedSections[section.id] || false}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>

        {/* Data Persistence Area - Only for Admins */}

        <div className="p-4 border-t border-white/5 bg-white/5">
            <div className="flex items-center gap-2.5 mb-4 px-1">
               <div className="w-7 h-7 rounded-lg bg-brand-primary flex items-center justify-center text-brand-secondary shadow-sm transition-transform hover:scale-110">
                 <span className="text-[9px] font-black">{currentUser?.username?.[0]?.toUpperCase() || 'U'}</span>
               </div>
               <div className="overflow-hidden">
                 <p className="text-[8px] font-black text-white truncate uppercase tracking-wider">{currentUser?.username || 'User'}</p>
                <p className="text-[6.5px] font-bold text-white/30 uppercase tracking-[0.2em] mt-0.5">
                    {(['pending', 'rejected'].includes(currentUser.role) ? 'guest' : currentUser.role).toUpperCase()} PORTAL
                  </p>
              </div>
           </div>
           <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/5 hover:bg-red-500/5 hover:text-red-500 hover:border-red-500/10 transition-all text-[7.5px] font-black uppercase tracking-[0.25em] text-white/20">
             <LogOut size={10} />
             <span>Sign Out</span>
           </button>
        </div>
      </aside>
      <header className="lg:hidden bg-brand-secondary/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm overflow-hidden">
         <div className="flex items-center gap-4 overflow-hidden flex-1">
            <div className="shrink-0 w-12 h-12 rounded-xl shadow-lg border border-white/10 flex items-center justify-center bg-white/5 p-1.5 overflow-hidden ring-1 ring-white/5 active:scale-95 transition-transform backdrop-blur-md">
                {settings.logoUrl ? (
                    <img src={settings.logoUrl} className="w-full h-full object-contain rounded-md" />
                ) : (
                    <div className="p-2 rounded-lg" style={{ background: settings.primaryColor }}><Trophy className="w-5 h-5 text-white" /></div>
                )}
            </div>
            <div className="overflow-hidden flex-1">
                <span className="font-black italic uppercase text-xs block leading-none truncate">
                  {settings.name.split(' ').map((word, i, arr) => (
                    <React.Fragment key={i}>
                      <span className={i === arr.length - 1 ? 'text-brand-primary' : ''}>
                        {word}
                      </span>
                      {i < arr.length - 1 && ' '}
                    </React.Fragment>
                  ))}
                </span>
                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-1.5 block truncate">Official Portal</span>
            </div>
         </div>
         <button onClick={onLogout} className="shrink-0 p-2 bg-white/5 text-white/40 hover:text-red-500 rounded-xl transition-all border border-white/10 ml-2">
            <LogOut size={16} />
         </button>
      </header>
      <main className="flex-1 min-h-[calc(100vh-64px)] lg:h-screen lg:overflow-y-auto pb-24 lg:pb-8 relative custom-scrollbar scroll-smooth box-border transition-colors duration-500">
        <div className="p-4 md:px-10 md:pt-6 md:pb-10 max-w-7xl mx-auto w-full lg:max-w-full xl:max-w-7xl">
          {/* Breadcrumb Bar - Refined Digital Stadium Style */}
          {finalSegments.length > 0 && (
            <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-1 duration-500">
              {finalSegments.map((segment, idx) => (
                <React.Fragment key={idx}>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 whitespace-nowrap">
                    {segment}
                  </span>
                  {idx < finalSegments.length - 1 && (
                    <ChevronRight size={10} className="text-white/10 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          {children}
        </div>
      </main>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe shadow-[0_-10px_40px_rgba(13,27,138,0.3)] bg-brand-secondary border-t border-white/10" >
        <div className="flex justify-around items-center h-20">
          {allNavItems.slice(0, 4).map(item => <BottomNavItem key={item.id} item={item} activeTab={activeTab} onTabChange={onTabChange} />)}
          {allNavItems.length > 4 && (
            <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="flex flex-col items-center justify-center py-2 px-1 flex-1 text-white/50"
            >
                <MoreHorizontal className="w-7 h-7 mb-1" />
                <span className="text-[9px] font-black uppercase tracking-tight opacity-60">More</span>
            </button>
          )}
        </div>
      </nav>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 backdrop-blur-3xl bg-brand-secondary/95 lg:hidden flex flex-col p-8 overflow-y-auto animate-in fade-in duration-300">
           <div className="flex justify-between items-center mb-12">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none">ADMIN <span className="text-brand-500">DASHBOARD</span></h2>
                    <p className="text-[10px] text-brand-500/60 font-black uppercase tracking-[0.3em] mt-3">Academy Management Portal</p>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-white/5 rounded-[2rem] text-white hover:text-brand-500 border border-white/10 shadow-2xl transition-all active:scale-90">
                    <X size={28} />
                </button>
           </div>
           
           <div className="grid grid-cols-2 gap-4 pb-20">
              {allNavItems.map(item => (
                <button 
                    key={item.id} 
                    onClick={() => { onTabChange(item.id); setIsMobileMenuOpen(false); }} 
                    className={`flex flex-col items-center p-6 rounded-[2rem] border transition-all duration-500 ${activeTab === item.id ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-[0_10px_30px_rgba(14,165,233,0.2)] scale-[1.05] z-10' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                >
                    <div className={`p-4 rounded-2xl mb-4 ${activeTab === item.id ? 'bg-brand-950/10' : 'bg-white/5 border border-white/10'}`}>
                        <item.icon size={28} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
                    </div>
                    <span className="font-black text-[10px] uppercase tracking-[0.25em] text-center leading-tight">{item.label}</span>
                </button>
              ))}
           </div>
           
        </div>
      )}
    </div>
  );
};
