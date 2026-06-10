
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, FeeRecord, AcademySettings, Venue, User, Role } from '../types';
import { Check, X, AlertCircle, DollarSign, Search, Calendar, ChevronRight, User as UserIcon, FileText, Download, Loader2, Send, Phone, MapPin, Mail, Globe, Trophy, Filter, Activity, Target, Zap } from 'lucide-react';
import html2canvas from 'html2canvas';
import { PageHeader } from './ui/PageHeader';

import { jsPDF } from 'jspdf';

// Helper to convert number to words (Indian Currency Style)
const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

    if (num === 0) return 'Zero';
    if (isNaN(num)) return '';

    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';

    let str = '';
    str += (parseInt(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
    str += (parseInt(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
    str += (parseInt(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
    str += (parseInt(n[4]) !== 0) ? a[Number(n[4])] + 'Hundred ' : '';
    str += (parseInt(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';

    return str.trim() + ' Only';
};

export const FinanceManager: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [fees, setFees] = useState<FeeRecord[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedVenue, setSelectedVenue] = useState('All');
    const [feeStatusFilter, setFeeStatusFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    const [invoiceTemplate, setInvoiceTemplate] = useState<string | null>(localStorage.getItem('icarus_invoice_template'));

    // Invoice State
    const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [selectedPlayerForInvoice, setSelectedPlayerForInvoice] = useState<Player | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [invoiceForm, setInvoiceForm] = useState({
        invoiceNo: '',
        date: new Date().toISOString().split('T')[0],
        amount: 24000, // Default amount in Rupees
        paymentMode: 'UPI' as 'Cash' | 'UPI' | 'Bank Transfer' | 'Card',
        validTill: '',
    });

    // Mobile Scaling Logic (v18)
    const [previewScale, setPreviewScale] = useState(1);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateScale = () => {
            if (!previewContainerRef.current) return;
            const availableWidth = previewContainerRef.current.clientWidth - 48;
            const scale = Math.min(1, availableWidth / 595);
            setPreviewScale(scale);
        };

        if (isInvoiceModalOpen) {
            const timer = setTimeout(updateScale, 100);
            window.addEventListener('resize', updateScale);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateScale);
            };
        }
    }, [isInvoiceModalOpen]);

    // ── Body scroll lock (iOS-safe) ────────────────────────────────────────
    // Prevents the background page from scrolling while the invoice modal is open.
    useEffect(() => {
        if (!isInvoiceModalOpen) return;
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflowY = 'scroll'; // keep scrollbar width so layout doesn't shift
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflowY = '';
            window.scrollTo(0, scrollY);
        };
    }, [isInvoiceModalOpen]);

    const loadData = () => {
        setPlayers(StorageService.getPlayers());
        setFees(StorageService.getFees());
        setVenues(StorageService.getVenues());
        setSettings(StorageService.getSettings());
    };

    useEffect(() => {
        loadData();
        window.addEventListener('academy_data_update', loadData);
        return () => window.removeEventListener('academy_data_update', loadData);
    }, []);

    const getStatus = (playerId: string) => {
        return fees.find(f => f.playerId === playerId && f.month === month);
    };

    const updateStatus = (playerId: string, status: FeeRecord['status']) => {
        const existing = getStatus(playerId);
        const record: FeeRecord = {
            id: existing ? existing.id : Math.random().toString(36).substr(2, 9),
            playerId,
            month,
            status,
            amount: existing ? existing.amount : 24000,
            datePaid: status === 'PAID' ? new Date().toISOString() : undefined
        };
        StorageService.updateFee(record);
    };

    const getDaysRemaining = (statusRecord?: any) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let targetDate;
        
        if (statusRecord && statusRecord.status === 'PAID') {
            // Next payment is 6 months from the paid date
            const paidDate = statusRecord.datePaid ? new Date(statusRecord.datePaid) : new Date();
            paidDate.setHours(0, 0, 0, 0);
            
            targetDate = new Date(paidDate);
            targetDate.setMonth(targetDate.getMonth() + 6);
        } else {
            const [year, m] = month.split('-').map(Number);
            // Deadline is last day of the selected month
            targetDate = new Date(year, m, 0); // Month is 1-indexed for '0' hack
            targetDate.setHours(23, 59, 59, 999);
        }
        
        const diff = targetDate.getTime() - today.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    // --- Invoice Logic ---
    const openInvoiceGenerator = (player: Player) => {
        setSelectedPlayerForInvoice(player);
        const existing = getStatus(player.id);

        const nextId = existing?.invoice?.invoiceNo || StorageService.getNextInvoiceId();

        // Calculate 'Valid Till'
        const [y, m] = month.split('-');
        const lastDay = new Date(parseInt(y), parseInt(m), 0).toISOString().split('T')[0];

        setInvoiceForm({
            invoiceNo: nextId,
            date: existing?.invoice?.date || new Date().toISOString().split('T')[0],
            amount: existing?.amount || 24000,
            paymentMode: (existing?.invoice?.paymentMode as any) || 'UPI',
            validTill: existing?.invoice?.validTill || lastDay
        });
        setInvoiceModalOpen(true);
    };

    const handleSubmitInvoice = async () => {
        if (!selectedPlayerForInvoice) return;
        setIsSubmitting(true);

        await new Promise(resolve => setTimeout(resolve, 800));

        const existingRecord = getStatus(selectedPlayerForInvoice.id);

        const updatedFee: FeeRecord = {
            id: existingRecord ? existingRecord.id : Math.random().toString(36).substr(2, 9),
            playerId: selectedPlayerForInvoice.id,
            month: month,
            status: 'PAID',
            amount: invoiceForm.amount,
            datePaid: new Date().toISOString(),
            invoice: invoiceForm
        };

        StorageService.updateFee(updatedFee);

        if (!existingRecord?.invoice) {
            StorageService.saveLastInvoiceId(invoiceForm.invoiceNo);
        }

        setIsSubmitting(false);
        setInvoiceModalOpen(false);
    };

    const handleDownloadPDF = async () => {
        if (!invoiceRef.current) return;

        // Ensure the element is scrolled to top before capturing to avoid cutting
        const originalScrollPos = window.scrollY;
        window.scrollTo(0, 0);

        try {
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 3, // Higher scale for better quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                // Use fixed dimensions for the capture viewport to ensure consistency
                windowWidth: 595,
                windowHeight: 842,
                width: 595,
                height: 842,
                y: 0,
                x: 0,
                onclone: (clonedDoc) => {
                    // Reset the scale and centering of the element in the clone
                    // so html2canvas renders it at 100% size without offsets.
                    const el = clonedDoc.getElementById('icarus-invoice-capture');
                    if (el) {
                        el.style.transform = 'none';
                        el.style.left = '0';
                        el.style.marginLeft = '0';
                        el.style.top = '0';
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [595, 842]
            });

            // Since we captured the canvas at scale:3, we render it at the base dimensions
            pdf.addImage(imgData, 'PNG', 0, 0, 595, 842, undefined, 'FAST');
            pdf.save(`Invoice_${selectedPlayerForInvoice?.fullName.replace(/\s+/g, '_')}_${invoiceForm.invoiceNo}.pdf`);
        } catch (error) {
            console.error('Invoice Export Error:', error);
        } finally {
            window.scrollTo(0, originalScrollPos);
        }
    };

    // Tax Calculation Logic (18% GST inclusive: 9% CGST + 9% SGST)
    const calculateTaxes = (total: number) => {
        // CGST = (Total - (Total / 1.18)) / 2
        const gstHalf = Math.round(((total - (total / 1.18)) / 2) * 100) / 100;
        const baseAmount = Math.round((total - (gstHalf * 2)) * 100) / 100;
        
        return {
            base: baseAmount,
            cgst: gstHalf,
            sgst: gstHalf,
            total: total
        };
    };

    const filteredPlayers = players.filter(p => {
        const matchesSearch = p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.memberId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesVenue = selectedVenue === 'All' || p.venue === selectedVenue;
        
        const status = getStatus(p.id);
        const statusVal = status?.status || 'PENDING';
        let matchesStatus = true;
        if (feeStatusFilter === 'Pending') {
            matchesStatus = statusVal === 'PENDING' || statusVal === 'OVERDUE';
        } else if (feeStatusFilter === 'Paid') {
            matchesStatus = statusVal === 'PAID';
        }

        return matchesSearch && matchesVenue && matchesStatus;
    });

    const totalDue = filteredPlayers.length * 24000;
    const totalCollected = filteredPlayers.reduce((sum, p) => {
        const rec = getStatus(p.id);
        return sum + (rec?.status === 'PAID' ? (rec.amount || 24000) : 0);
    }, 0);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-brand-accent/20 text-brand-accent border-brand-accent/30';
            case 'OVERDUE': return 'bg-red-500/20 text-red-500 border-red-500/30';
            default: return 'bg-white/10 text-white/60 border-white/20';
        }
    };

    const taxes = calculateTaxes(invoiceForm.amount);

    const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setInvoiceTemplate(base64String);
                localStorage.setItem('icarus_invoice_template', base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const clearTemplate = () => {
        setInvoiceTemplate(null);
        localStorage.removeItem('icarus_invoice_template');
    };

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700 font-display">
            {/* Student Search & Stats */}
            <div className="flex flex-col space-y-8">
                <>
            {/* Header */}
            <PageHeader 
                title="FINANCE DECK"
                subtitle="High-fidelity revenue tracking and academy transaction records"
                extra={
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest italic mb-1">TOTAL_COLLECTED</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-brand-accent italic tracking-tighter">₹{totalCollected.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-white/20">/ ₹{totalDue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                }
            />

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Revenue', value: `₹${(totalCollected/1000).toFixed(1)}K`, icon: <DollarSign size={18} />, color: '#C3F629' },
                    { label: 'Active Students', value: filteredPlayers.length, icon: <UserIcon size={18} />, color: '#60a5fa' },
                    { label: 'Pending Payments', value: filteredPlayers.filter(p => getStatus(p.id)?.status !== 'PAID').length, icon: <Activity size={18} />, color: '#f59e0b' },
                    { label: 'Collection Rate', value: `${Math.round((totalCollected/totalDue) * 100 || 0)}%`, icon: <Target size={18} />, color: '#C3F629', pulse: true }
                ].map((k, i) => (
                    <div key={i} className="glass-card p-8 rounded-[2.5rem] group hover:bg-white/10 hover:border-white/30 transition-all duration-500 shadow-xl relative overflow-hidden">
                        {k.pulse && <div className="green-light-bar" />}
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <div style={{ color: k.color }}>{k.icon}</div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-4">{k.label}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black italic leading-none tracking-tighter text-white group-hover:text-brand-accent transition-colors duration-500">{k.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tactical Search & Filter Row */}
            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
                <div className="flex flex-col md:flex-row gap-6 w-full xl:w-auto">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500/40 group-focus-within:text-brand-accent transition-colors" />
                        <input 
                            type="text" 
                            placeholder="SEARCH_STUDENT_ATHLETES_..." 
                            className="w-full pl-14 pr-6 py-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl outline-none focus:bg-brand-500/10 focus:border-brand-accent/30 transition-all text-[10px] font-black uppercase tracking-[0.2em] text-white placeholder:text-white/20 shadow-2xl italic"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group/select min-w-[180px]">
                            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-accent/40 group-focus-within/select:text-brand-accent transition-all" />
                            <select
                                value={feeStatusFilter}
                                onChange={e => setFeeStatusFilter(e.target.value)}
                                className="w-full pl-12 pr-10 py-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl outline-none text-white font-black italic text-[10px] uppercase tracking-widest appearance-none cursor-pointer hover:bg-brand-500/10 transition-all focus:border-brand-accent/40"
                            >
                                <option value="All">ALL STATUSES</option>
                                <option value="Pending">PENDING / OVERDUE</option>
                                <option value="Paid">FEES PAID</option>
                            </select>
                        </div>

                        <div className="relative group/select min-w-[180px]">
                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-3 h-3 text-brand-accent/40 group-focus-within/select:text-brand-accent transition-all" />
                            <select
                                value={selectedVenue}
                                onChange={e => setSelectedVenue(e.target.value)}
                                className="w-full pl-12 pr-10 py-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl outline-none text-white font-black italic text-[10px] uppercase tracking-widest appearance-none cursor-pointer hover:bg-brand-500/10 transition-all focus:border-brand-accent/40"
                            >
                                <option value="All">ALL LOCATIONS</option>
                                {venues.map(v => (
                                    <option key={v.id} value={v.name}>{v.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/5 border border-brand-500/10">
                    <Zap size={12} className="text-brand-accent" />
                    <span className="text-[9px] font-black text-brand-500/60 uppercase tracking-widest italic">Payments Secure</span>
                </div>
            </div>

                    {/* Unified Responsive Card Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredPlayers.map(p => {
                            const status = getStatus(p.id);
                            const statusVal = status?.status || 'PENDING';
                            const daysLeft = getDaysRemaining(status);
                            const isDueSoon = statusVal !== 'PAID' && statusVal !== 'OVERDUE' && daysLeft > 0 && daysLeft <= 15;
                            const isOverdue = statusVal === 'OVERDUE' || (statusVal !== 'PAID' && daysLeft <= 0);

                            // Card border tint per status
                            const cardBorder = statusVal === 'PAID'
                                ? '!border-brand-primary/25 hover:!border-brand-primary/50'
                                : isOverdue
                                ? '!border-red-500/25 hover:!border-red-500/50'
                                : isDueSoon
                                ? '!border-orange-500/25 hover:!border-orange-500/50'
                                : 'hover:!border-brand-primary/40 focus-within:!border-brand-primary/40';

                            // LED dot colours
                            const dotColor = statusVal === 'PAID'
                                ? 'bg-brand-primary shadow-[0_0_7px_3px_rgba(195,246,41,0.65)]'
                                : isOverdue
                                ? 'bg-red-500 shadow-[0_0_7px_3px_rgba(239,68,68,0.65)]'
                                : isDueSoon
                                ? 'bg-orange-400 shadow-[0_0_7px_3px_rgba(251,146,60,0.65)]'
                                : 'bg-white/20 shadow-none';

                            return (
                                <div key={p.id} className={`glass-card p-10 !rounded-[3rem] relative overflow-hidden group transition-all duration-700 hover:-translate-y-2 hover:scale-[1.02] shadow-2xl ${cardBorder}`}>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-accent/10 transition-colors"></div>
                                    
                                    {/* ── LED status dot (top-right) ── */}
                                    <div className="absolute top-6 right-6 z-10 scale-125">
                                        <div className={`relative w-2.5 h-2.5 rounded-full ${dotColor} ${statusVal !== 'PENDING' || isDueSoon || isOverdue ? 'animate-pulse' : ''}`}>
                                            <div className="absolute top-[2px] left-[2px] w-[4px] h-[4px] rounded-full bg-white/70" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-center text-center mb-8 pt-2">
                                        <div className="relative mb-6">
                                            <div className="absolute -inset-2 bg-gradient-to-br from-brand-accent to-green-500 rounded-[2.5rem] opacity-0 blur-md group-hover:opacity-40 transition-opacity duration-700"></div>
                                            <img src={p.photoUrl} className="w-24 h-24 rounded-[2rem] bg-brand-950 object-cover border-4 border-white/10 shadow-2xl relative z-10 transition-transform duration-700 group-hover:scale-105" />
                                            {statusVal === 'PAID' && <div className="absolute -bottom-2 -right-2 bg-brand-accent text-brand-950 p-2 rounded-xl shadow-2xl z-20"><Check size={14} strokeWidth={4} /></div>}
                                        </div>
                                        
                                        <h3 className="font-black text-white italic text-2xl uppercase tracking-tighter leading-none mb-2 group-hover:text-brand-accent transition-colors duration-500">{p.fullName}</h3>
                                        <p className="text-[10px] text-white/30 font-black tracking-[0.3em] uppercase italic mb-4">{p.memberId}</p>
                                        
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 shadow-inner">
                                            <MapPin size={10} className="text-brand-accent" />
                                            <span className="text-[10px] font-black text-white/40 uppercase italic tracking-widest">{p.venue || 'NOT ASSIGNED'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-8 py-6 border-y border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">FEES DUE</p>
                                            <p className="font-black text-white italic text-3xl tracking-tighter leading-none group-hover:text-brand-accent transition-colors">₹24K</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">TIME LEFT</p>
                                            <div className="flex items-center justify-end gap-2">
                                                <div className={`w-2 h-2 rounded-full ${getDaysRemaining(status) > 0 ? 'bg-brand-accent' : 'bg-red-500'} animate-pulse shadow-[0_0_10px_rgba(195,246,41,0.5)]`} />
                                                <p className="font-black text-white italic text-[11px] uppercase tracking-widest leading-none">
                                                    {getDaysRemaining(status) > 0 ? `${getDaysRemaining(status)}D` : `${Math.abs(getDaysRemaining(status))}D`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => openInvoiceGenerator(p)} 
                                            className="flex-1 h-14 bg-white/5 flex items-center justify-center gap-3 rounded-2xl shadow-xl active:scale-95 transition-all text-white group/inv border border-white/10 hover:bg-white/10 hover:border-brand-accent/40"
                                        >
                                            <FileText size={18} className="text-brand-accent group-hover/inv:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">RECEIPT</span>
                                        </button>
                                        {statusVal !== 'PAID' && (
                                            <button 
                                                onClick={() => setConfirmPaymentId(p.id)}
                                                className="w-14 h-14 bg-brand-accent text-brand-950 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-brand-accent/20 group/btn"
                                            >
                                                <Check size={24} strokeWidth={4} className="group-hover/btn:scale-125 transition-transform" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {filteredPlayers.length === 0 && (
                            <div className="col-span-full text-center py-24 glass-card border-dashed border-white/10 opacity-50">
                                <Search size={40} className="mx-auto mb-4 text-white/10" />
                                <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] italic">NO RECORDS FOUND</p>
                            </div>
                        )}
                    </div>
                </>
            </div>


            {isInvoiceModalOpen && selectedPlayerForInvoice && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div
                        className="glass-card !rounded-t-[3rem] sm:!rounded-[3.5rem] shadow-[0_32px_120px_-15px_rgba(0,0,0,0.8)] w-full max-w-7xl flex flex-col md:flex-row overflow-y-auto overscroll-y-contain md:overflow-hidden border border-white/20 relative"
                        style={{maxHeight: '92dvh'}}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50"></div>

                         {/* Control Panel */}
                        <div className="w-full md:w-1/3 bg-white/5 p-8 sm:p-12 border-b md:border-b-0 md:border-r border-white/10 md:overflow-y-auto flex-shrink-0 relative">
                            <div className="absolute top-0 left-0 w-full h-full bg-brand-accent/5 blur-[100px] pointer-events-none opacity-20"></div>
                            <div className="flex items-center justify-between mb-10 relative z-10">
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">INVOICE <span className="text-brand-accent">CORE</span></h3>
                                <button onClick={() => setInvoiceModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/10 shadow-lg"><X size={20} /></button>
                            </div>

                            <div className="space-y-6 sm:space-y-8 relative z-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic ml-1">Invoice ID</label>
                                    <input
                                        type="text"
                                        value={invoiceForm.invoiceNo}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })}
                                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-accent/40 focus:bg-white/10 outline-none font-black text-[12px] text-white italic uppercase tracking-widest transition-all shadow-inner"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic ml-1">Registration Date</label>
                                    <input
                                        type="date"
                                        value={invoiceForm.date}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                                        className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-accent/40 focus:bg-white/10 outline-none font-black text-[12px] text-white italic uppercase tracking-widest transition-all shadow-inner [color-scheme:dark]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic ml-1">Valid Until</label>
                                    <input
                                        type="date"
                                        value={invoiceForm.validTill}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, validTill: e.target.value })}
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-accent/40 focus:bg-white/10 outline-none font-black text-xs text-white italic uppercase tracking-widest transition-all shadow-inner [color-scheme:dark]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic ml-1">Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={invoiceForm.amount}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, amount: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-accent/40 focus:bg-white/10 outline-none font-black text-xs text-white italic uppercase tracking-widest transition-all shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic ml-1">Payment Mode</label>
                                        <select
                                            value={invoiceForm.paymentMode}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, paymentMode: e.target.value as any })}
                                            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-accent/40 focus:bg-white/10 outline-none font-black text-xs text-white italic uppercase tracking-widest appearance-none transition-all"
                                        >
                                            <option value="Cash" className="bg-[#0a0f2d]">Cash</option>
                                            <option value="UPI" className="bg-[#0a0f2d]">UPI Payment</option>
                                            <option value="Bank Transfer" className="bg-[#0a0f2d]">Bank Transfer</option>
                                            <option value="Card" className="bg-[#0a0f2d]">Credit Card</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 sm:mt-12 space-y-4">
                                <button
                                    onClick={handleSubmitInvoice}
                                    disabled={isSubmitting}
                                    className="w-full py-5 bg-gradient-to-br from-brand-primary to-[#A3D900] text-brand-secondary font-black rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm italic disabled:opacity-70 disabled:cursor-not-allowed group border border-white/10"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={20} className="group-hover:translate-x-1 transition-transform" />}
                                    {isSubmitting ? 'SENDING...' : 'GENERATE RECEIPT'}
                                </button>

                                <button
                                    onClick={handleDownloadPDF}
                                    className="w-full py-5 bg-white/5 border border-white/10 text-white/60 font-black rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] italic shadow-xl active:scale-95"
                                >
                                    <Download size={18} className="text-brand-accent" />
                                    ARCHIVE AS PDF
                                </button>

                                <p className="text-[9px] text-center text-white/20 font-black uppercase tracking-widest mt-6 italic">Secured transaction active. This will authorize payment and save payment details to the academy database.</p>
                            </div>
                        </div>

                        {/* Right Panel: Live Preview — on mobile the outer container scrolls,
                             on desktop (md+) this panel gets its own scroll. */}
                        <div
                            ref={previewContainerRef}
                            className="w-full md:w-2/3 bg-brand-900 p-6 md:overflow-y-auto flex items-start justify-center"
                        >
                            <div style={{ 
                                width: '595px', 
                                height: `${842 * previewScale}px`, 
                                transition: 'height 0.3s ease-out',
                                position: 'relative'
                            }}>
                                <div
                                    ref={invoiceRef}
                                    id="icarus-invoice-capture"
                                    style={{ 
                                        position: 'absolute', 
                                        top: 0,
                                        left: '50%',
                                        width: '595px', 
                                        height: '842px', 
                                        flexShrink: 0, 
                                        overflow: 'hidden',
                                        transform: `scale(${previewScale})`,
                                        transformOrigin: 'top center',
                                        marginLeft: '-297.5px', // Center the 595px div
                                        transition: 'transform 0.3s ease-out'
                                    }}
                                >
                                    {/* ICARUS branded PNG background */}
                                    <img
                                        src={invoiceTemplate || "/icarus-invoice.png?v=5"}
                                        alt="Invoice Template"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = 'icarus-invoice.png';
                                        }}
                                    />

                                    {/* Absolute-positioned data overlay (v19 GOLDILOCKS "FINAL" CALIBRATION) */}
                                    <div style={{ position: 'absolute', inset: 0, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5px', color: '#111', pointerEvents: 'none', zIndex: 10 }}>

                                        {/* ── HEADER BOX (Top Right) ────────────────── */}
                                        <span style={{ position: 'absolute', top: '133px', left: '412px', fontWeight: 800, color: '#111' }}>
                                            {invoiceForm.invoiceNo.replace('INV-', '')}
                                        </span>

                                        <span style={{ position: 'absolute', top: '133px', left: '504px', fontWeight: 800, color: '#111' }}>
                                            {invoiceForm.date ? new Date(invoiceForm.date).toLocaleDateString('en-GB') : ''}
                                        </span>

                                        {/* BILLED TO section - Corrected Data Mapping */}
                                        <span style={{ position: 'absolute', top: '220px', left: '120px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.parentName || ''}
                                        </span>
                                        <span style={{ position: 'absolute', top: '220px', left: '331px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.email || ''}
                                        </span>

                                        <span style={{ position: 'absolute', top: '245px', left: '120px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.fullName || ''}
                                        </span>
                                        <span style={{ position: 'absolute', top: '245px', left: '331px', fontWeight: 700, maxWidth: '240px', lineHeight: '1.2' }}>
                                            {selectedPlayerForInvoice.address || ''}
                                        </span>

                                        <span style={{ position: 'absolute', top: '271px', left: '120px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.contactNumber?.startsWith('+') 
                                                ? selectedPlayerForInvoice.contactNumber 
                                                : selectedPlayerForInvoice.contactNumber ? `+91 ${selectedPlayerForInvoice.contactNumber}` : ''}
                                        </span>
                                        <span style={{ position: 'absolute', top: '271px', left: '331px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.position ? selectedPlayerForInvoice.position : ''}
                                        </span>

                                        {/* ── PROGRAM DETAILS SECTION ──────────────── */}
                                        <span style={{ position: 'absolute', top: '354px', left: '125px', fontWeight: 700 }}>
                                            {selectedPlayerForInvoice.program || 'Monthly Elite Training'}
                                        </span>
                                        <span style={{ position: 'absolute', top: '354px', left: '335px', fontWeight: 700 }}>
                                            Mon – Fri
                                        </span>

                                        <span style={{ position: 'absolute', top: '380px', left: '125px', fontWeight: 700, maxWidth: '210px' }}>
                                            {selectedPlayerForInvoice.venue || 'Gaur City, Noida'}
                                        </span>
                                        <span style={{ position: 'absolute', top: '380px', left: '335px', fontWeight: 700 }}>
                                            Abhishek Begal
                                        </span>

                                        {/* ── PAYMENT TABLE ───────────────────────── */}
                                        <div style={{ position: 'absolute', top: '490px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 700 }}>
                                            ₹ {taxes.base}
                                        </div>
                                        <div style={{ position: 'absolute', top: '516px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 700 }}>
                                            ₹ {taxes.cgst}
                                        </div>
                                        <div style={{ position: 'absolute', top: '542px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 700 }}>
                                            ₹ {taxes.sgst}
                                        </div>
                                        {/* FINAL TOTAL — flush in text row */}
                                        <div style={{ position: 'absolute', top: '568px', left: '425px', width: '120px', textAlign: 'left', fontWeight: 850, color: '#fff' }}>
                                            ₹ {taxes.total}
                                        </div>
                                        
                                        {/* ── FOOTER BOX (Metadata) ────────────────── */}
                                        <span style={{ position: 'absolute', top: '604px', left: '95px', fontWeight: 700 }}>
                                            {invoiceForm.paymentMode}
                                        </span>
                                        <span style={{ position: 'absolute', top: '604px', left: '275px', fontWeight: 700 }}>
                                            {invoiceForm.date ? new Date(invoiceForm.date).toLocaleDateString('en-GB') : ''}
                                        </span>
                                        <span style={{ position: 'absolute', top: '604px', left: '445px', fontWeight: 700 }}>
                                            {invoiceForm.validTill ? new Date(invoiceForm.validTill).toLocaleDateString('en-GB') : ''}
                                        </span>

                                        {/* AMOUNT IN WORDS */}
                                        <span style={{ position: 'absolute', top: '639px', left: '155px', fontWeight: 700, color: '#1a365d' }}>
                                            {numberToWords(invoiceForm.amount)}
                                        </span>

                                        {/* AUTHORIZED SIGNATORY SECTION (Bottom Left signatures box) */}
                                        <div style={{ position: 'absolute', top: '754px', left: '135px', textAlign: 'left' }}>
                                            <div style={{ fontWeight: 800, fontSize: '11px', color: '#111', textDecoration: 'underline' }}>
                                                ABHISHEK BEGAL
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmPaymentId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="glass-card p-12 max-w-sm w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-500 !rounded-[3.5rem] border border-white/20 text-center shadow-[0_32px_80px_-15px_rgba(0,0,0,0.6)]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50"></div>
                        <div className="flex flex-col items-center relative z-10">
                            <div className="w-24 h-24 bg-brand-accent/10 rounded-[2rem] flex items-center justify-center text-brand-accent mb-8 shadow-2xl border border-brand-accent/20">
                                <Check size={48} strokeWidth={4} />
                            </div>
                            
                            <h3 className="font-black text-white text-3xl tracking-tighter uppercase italic mb-4 leading-none">COMMIT <span className="text-brand-accent">PAYMENT</span></h3>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.25em] italic mb-10 leading-relaxed">
                                Authorize financial transaction? This action cannot be undone and will update the cloud database.
                            </p>
                            
                            <div className="flex gap-4 w-full">
                                <button 
                                    onClick={() => setConfirmPaymentId(null)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] italic py-5 rounded-2xl transition-all border border-white/10 active:scale-95"
                                >
                                    ABORT
                                </button>
                                <button 
                                    onClick={() => {
                                        updateStatus(confirmPaymentId, 'PAID');
                                        setConfirmPaymentId(null);
                                    }}
                                    className="flex-1 bg-brand-accent text-brand-950 font-black uppercase tracking-widest text-[10px] italic py-5 rounded-2xl transition-all shadow-[0_15px_30px_rgba(195,246,41,0.2)] active:scale-105 hover:scale-[1.02]"
                                >
                                    AUTHORIZE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
