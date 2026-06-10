import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Smartphone, Zap } from 'lucide-react';

export const PerformanceHUD: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for Firebase sync events (custom event if emitted)
        const handleSyncStart = () => setIsSyncing(true);
        const handleSyncEnd = () => setIsSyncing(false);
        
        window.addEventListener('firebase_sync_start', handleSyncStart);
        window.addEventListener('firebase_sync_end', handleSyncEnd);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('firebase_sync_start', handleSyncStart);
            window.removeEventListener('firebase_sync_end', handleSyncEnd);
        };
    }, []);

    return (
        <div className="flex items-center gap-4 px-5 py-3 rounded-xl border border-brand-900/5 bg-brand-900/5 shadow-inner transition-all hover:bg-brand-900/10">

            <div className="flex items-center gap-2.5">
                {isSyncing ? (
                    <div className="w-3 h-3 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                ) : (
                    <Zap size={10} className={isOnline ? 'text-brand-500' : 'text-brand-900/10'} fill={isOnline ? 'currentColor' : 'none'} />
                )}
                <span className="text-[8px] font-black text-brand-900/30 uppercase tracking-[0.25em]">
                    {isSyncing ? 'SYNCING DATA' : 'SECURE'}
                </span>
            </div>
        </div>
    );
};
