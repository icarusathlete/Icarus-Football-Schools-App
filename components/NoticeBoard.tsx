
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Announcement, Role, AcademySettings } from '../types';
import { Bell, Megaphone, Clock, Plus, X, Image as ImageIcon, Download, Share2, Calendar, User, Shield, AlertCircle, Loader2, QrCode, ChevronRight } from 'lucide-react';
import html2canvas from 'html2canvas';
import { ConfirmModal } from './ConfirmModal';
import { PageHeader } from './ui/PageHeader';

interface NoticeBoardProps {
    role: Role;
}

const convertImageToBase64 = (url: string, fallback = ''): Promise<string> => {
    return new Promise((resolve) => {
        if (!url) {
            resolve(fallback);
            return;
        }
        if (url.startsWith('data:')) {
            if (url.startsWith('data:image/svg+xml') && !url.includes(';base64')) {
                try {
                    const svgContent = url.split(',').slice(1).join(',');
                    const decoded = decodeURIComponent(svgContent);
                    const base64 = btoa(unescape(encodeURIComponent(decoded)));
                    resolve(`data:image/svg+xml;base64,${base64}`);
                    return;
                } catch (e) {
                    console.error('Failed to convert SVG to base64:', e);
                }
            }
            resolve(url);
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                    return;
                }
            } catch (e) {
                console.error('Canvas conversion failed:', e);
            }
            resolve(url);
        };
        img.onerror = () => {
            console.error('Image load failed for base64 conversion:', url);
            resolve(url); // fallback to raw URL if conversion fails
        };
        img.src = url.includes('?') ? `${url}&cachebust=${Date.now()}` : `${url}?cachebust=${Date.now()}`;
    });
};

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ role }) => {
    const [notices, setNotices] = useState<Announcement[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [newNotice, setNewNotice] = useState<{
        title: string,
        content: string,
        priority: 'normal' | 'high',
        author: string,
        imageUrl: string,
        qrCodeUrl: string
    }>({
        title: '', content: '', priority: 'normal', author: '', imageUrl: '', qrCodeUrl: ''
    });
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const [logoBase64, setLogoBase64] = useState<string>('');
    const [qrBase64, setQrBase64] = useState<string>('');
    const [brochureImageBase64, setBrochureImageBase64] = useState<string>('');

    // Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);

    // Ref for the hidden brochure container
    const brochureRef = useRef<HTMLDivElement>(null);
    // State to hold the specific notice being rendered into the brochure template
    const [brochureData, setBrochureData] = useState<Announcement | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const qrInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setNotices(StorageService.getNotices());
        const handleSettings = () => setSettings(StorageService.getSettings());
        window.addEventListener('settingsChanged', handleSettings);
        return () => window.removeEventListener('settingsChanged', handleSettings);
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewNotice(prev => ({ ...prev, imageUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewNotice(prev => ({ ...prev, qrCodeUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePost = (e: React.FormEvent) => {
        e.preventDefault();
        StorageService.addNotice({
            ...newNotice,
            author: newNotice.author || (role === 'admin' ? 'Academy Management' : 'Coach')
        });
        setNotices(StorageService.getNotices());
        setShowForm(false);
        setNewNotice({ title: '', content: '', priority: 'normal', author: '', imageUrl: '', qrCodeUrl: '' });
    };

    const handleDeleteClick = (id: string) => {
        setNoticeToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (noticeToDelete) {
            try {
                await StorageService.deleteNotice(noticeToDelete);
                setNotices(StorageService.getNotices());
            } catch (err: any) {
                console.error("Error deleting notice:", err);
                alert("Failed to delete notice.");
            } finally {
                setDeleteModalOpen(false);
                setNoticeToDelete(null);
            }
        }
    };

    // Trigger the download process
    const initiateDownload = async (notice: Announcement) => {
        setDownloadingId(notice.id);

        try {
            // Convert logo, qr and flyer image to base64 in parallel for speed!
            const [logoB64, qrB64, imageB64] = await Promise.all([
                convertImageToBase64(settings.logoUrl, ''),
                convertImageToBase64(notice.qrCodeUrl, ''),
                convertImageToBase64(notice.imageUrl, '')
            ]);

            setLogoBase64(logoB64);
            setQrBase64(qrB64);
            setBrochureImageBase64(imageB64);

            // Trigger off-screen brochure template rendering with base64 data
            const base64Notice = {
                ...notice,
                imageUrl: imageB64,
                qrCodeUrl: qrB64
            };
            setBrochureData(base64Notice);

            // Wait for React to render the brochure template
            setTimeout(async () => {
                if (brochureRef.current) {
                    try {
                        const canvas = await html2canvas(brochureRef.current, {
                            scale: 2, // High resolution
                            useCORS: true,
                            backgroundColor: '#ffffff'
                        });

                        const link = document.createElement('a');
                        link.download = `Brochure_${notice.title.replace(/\s+/g, '_')}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                    } catch (err) {
                        console.error("Brochure generation failed", err);
                        alert("Could not generate brochure.");
                    } finally {
                        setDownloadingId(null);
                        setBrochureData(null);
                        setLogoBase64('');
                        setQrBase64('');
                        setBrochureImageBase64('');
                    }
                } else {
                    setDownloadingId(null);
                    setBrochureData(null);
                }
            }, 500);
        } catch (error) {
            console.error("Error preloading brochure assets:", error);
            alert("Could not generate brochure.");
            setDownloadingId(null);
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">

            {/* Hidden Brochure Template - Rendered off-screen */}
            <div className="fixed left-[-9999px] top-0">
                {brochureData && (
                    <div
                        ref={brochureRef}
                        className="w-[800px] h-[1132px] bg-white relative flex flex-col overflow-hidden"
                    >
                        {/* SCENARIO A: Full Image Poster Mode */}
                        {brochureData.imageUrl ? (
                            <div className="absolute inset-0 w-full h-full">
                                <img
                                    src={brochureData.imageUrl}
                                    className="w-full h-full object-cover"
                                    alt="Full Poster"
                                    crossOrigin="anonymous"
                                />

                                {/* Branding Overlay (Top Right) */}
                                <div className="absolute top-8 right-8 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl flex items-center gap-3">
                                    {logoBase64 ? (
                                        <img src={logoBase64} className="w-12 h-12 rounded-full object-contain" crossOrigin="anonymous" />
                                    ) : (
                                        <Shield className="w-12 h-12 text-white" />
                                    )}
                                    <div>
                                        <h1 className="text-xl font-black text-white italic leading-none">{settings.name.split(' ')[0]}</h1>
                                        <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest">{settings.name.split(' ').slice(1).join(' ') || 'Portal'}</p>
                                    </div>
                                </div>

                                {/* QR Code Overlay (Bottom Right) */}
                                {qrBase64 && (
                                    <div className="absolute bottom-8 right-8 bg-white p-3 rounded-2xl shadow-2xl border-4 border-white/20 backdrop-blur-sm">
                                        <img src={qrBase64} className="w-32 h-32 object-contain" crossOrigin="anonymous" />
                                        <p className="text-center text-xs font-bold text-gray-900 mt-2 uppercase tracking-wide">Scan Me</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* SCENARIO B: Clean & Beautiful Text-Based Brochure */
                            <div className="flex flex-col h-full font-sans text-gray-900 bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                                {/* Decorative Header */}
                                <div className="h-64 bg-brand-950 relative overflow-hidden flex-shrink-0">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,200,255,0.1),transparent_70%)] opacity-20"></div>

                                    <div className="relative z-10 h-full flex flex-col justify-center px-16">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                                {logoBase64 ? (
                                                    <img src={logoBase64} className="w-10 h-10 rounded-full object-contain" crossOrigin="anonymous" />
                                                ) : (
                                                    <Shield className="w-10 h-10 text-brand-500" />
                                                )}
                                            </div>
                                            <div>
                                                <h1 className="text-4xl font-black text-white italic tracking-tighter">{settings.name.split(' ')[0]}</h1>
                                                <p className="text-brand-500 font-bold uppercase tracking-[0.3em] text-sm">Official Announcement</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-12 bg-white" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }}></div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 px-16 py-8">
                                    <div className="flex items-center justify-between border-b-2 border-gray-100 pb-6 mb-8">
                                        <div>
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Date</p>
                                            <p className="text-xl font-bold text-gray-800">{new Date(brochureData.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">From</p>
                                            <p className="text-xl font-bold text-gray-800">{brochureData.author}</p>
                                        </div>
                                    </div>

                                    <h2 className="text-5xl font-black text-brand-950 mb-8 leading-tight tracking-tight">{brochureData.title}</h2>

                                    <div className="prose prose-xl prose-brand max-w-none text-brand-900 font-medium leading-relaxed whitespace-pre-wrap">
                                        {brochureData.content}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="bg-brand-50 px-16 py-12 border-t border-brand-100 mt-auto">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h3 className="font-bold text-brand-950 text-lg mb-1">{settings.name}</h3>
                                            <p className="text-gray-500 text-sm">Official Academy Hub</p>
                                            <p className="text-gray-500 text-sm mt-4">{settings.name.toLowerCase().replace(/\s+/g, '')}.com</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 inline-block">
                                                {qrBase64 ? (
                                                    <img src={qrBase64} className="w-24 h-24 object-contain" crossOrigin="anonymous" />
                                                ) : (
                                                    <div className="w-24 h-24 bg-brand-100 flex items-center justify-center text-brand-300">
                                                        <Share2 size={32} />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Scan for details</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <PageHeader 
                title="NOTICE BOARD" 
                subtitle="Official Announcements // Academy Intelligence Stream"
                extra={
                    (role === 'admin' || role === 'coach') && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="w-full lg:w-auto flex items-center justify-center gap-4 bg-brand-primary text-brand-secondary px-10 py-5 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all z-10 font-black text-xs uppercase tracking-widest italic border border-white/10"
                        >
                            <Plus size={18} strokeWidth={3} />
                            CREATE_ANNOUNCEMENT
                        </button>
                    )
                }
            />

            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-950/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-brand-900 rounded-t-[3rem] sm:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 border border-white/10 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center relative bg-brand-secondary">
                            <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">Create <span className="text-brand-primary">Announcement</span></h3>
                            <button onClick={() => setShowForm(false)} className="p-3 hover:bg-white/10 rounded-full text-white/40 transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={handlePost} className="p-6 sm:p-10 space-y-6 sm:space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] ml-1">Title</label>
                                <input
                                    className="w-full p-5 bg-brand-950 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-primary font-black text-white shadow-sm transition-all placeholder:text-white/10 uppercase italic text-sm"
                                    placeholder="e.g. SUMMER CAMP REGISTRATION OPEN"
                                    value={newNotice.title}
                                    onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] ml-1">Detailed Message</label>
                                <textarea
                                    className="w-full p-5 bg-brand-950 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-primary font-medium text-white shadow-sm transition-all h-40 placeholder:text-white/10 text-sm leading-relaxed"
                                    placeholder="Enter the announcement details here..."
                                    value={newNotice.content}
                                    onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] ml-1">Featured Image (Optional)</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-brand-primary hover:bg-white/5 transition-all h-32 relative overflow-hidden group shadow-sm bg-brand-950"
                                    >
                                        {newNotice.imageUrl ? (
                                            <img src={newNotice.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                                        ) : (
                                            <div className="text-center">
                                                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-white/20" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Upload Media</span>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] ml-1">Action Link (QR)</label>
                                        <div
                                            onClick={() => qrInputRef.current?.click()}
                                            className="border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-3 cursor-pointer hover:border-brand-primary hover:bg-white/5 transition-all h-14 bg-brand-950 shadow-sm group"
                                        >
                                            {newNotice.qrCodeUrl ? (
                                                <div className="flex items-center gap-2 text-brand-primary font-black text-[10px] uppercase tracking-widest italic">
                                                    <QrCode size={16} /> QR ATTACHED
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-white/20 text-[10px] font-black uppercase tracking-widest group-hover:text-brand-primary transition-colors italic">
                                                    <QrCode size={16} /> LINK QR CODE
                                                </div>
                                            )}
                                            <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleQrUpload} />
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] ml-1">Priority</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full p-4 bg-brand-950 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-primary font-black text-white shadow-sm appearance-none text-[10px] uppercase italic tracking-widest"
                                                    value={newNotice.priority}
                                                    onChange={e => setNewNotice({ ...newNotice, priority: e.target.value as any })}
                                                >
                                                    <option value="normal">Normal</option>
                                                    <option value="high">High Priority</option>
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-primary rotate-90" size={14} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] ml-1">Posted By</label>
                                        <input
                                            className="w-full p-4 bg-brand-950 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-primary font-black text-white shadow-sm text-[10px] uppercase tracking-widest italic placeholder:text-white/10"
                                            placeholder="e.g. ACADEMY MANAGEMENT"
                                            value={newNotice.author}
                                            onChange={e => setNewNotice({ ...newNotice, author: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 flex justify-end gap-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-white/20 font-black hover:text-white rounded-2xl transition-all text-[10px] uppercase tracking-widest italic">Discard</button>
                                <button type="submit" className="flex-[2] py-4 bg-brand-primary text-brand-secondary font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em] italic">Post Announcement</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Notice Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {notices.map(notice => (
                    <div key={notice.id} className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col group hover:border-brand-primary/20 transition-all duration-500 hover:-translate-y-2 relative">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

                        {/* Card Header Image */}
                        <div className={`h-52 relative overflow-hidden ${!notice.imageUrl ? (notice.priority === 'high' ? 'bg-gradient-to-br from-red-500/20 to-red-800/40' : 'bg-brand-secondary') : 'bg-brand-950'}`}>
                            {notice.imageUrl ? (
                                <img src={notice.imageUrl} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                                    <Shield size={200} className="text-white" />
                                </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-transparent to-transparent" />

                            {/* Badges */}
                            <div className="absolute top-6 left-6 flex gap-2">
                                <span className="px-3 py-1 bg-white/5 backdrop-blur-md text-white/60 text-[8px] font-black uppercase tracking-[0.2em] rounded-lg border border-white/10 shadow-xl italic">
                                    {new Date(notice.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>

                            {notice.priority === 'high' && (
                                <div className="absolute top-6 right-6">
                                    <div className="px-3 py-1 bg-red-500 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg shadow-xl flex items-center gap-2 italic animate-pulse">
                                        <AlertCircle size={10} /> HIGH PRIORITY
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 flex-1 flex flex-col relative">
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-white italic leading-tight mb-3 group-hover:text-brand-primary transition-colors uppercase tracking-tight">{notice.title}</h3>
                                <div className="flex items-center gap-2 text-[9px] text-brand-primary font-black uppercase tracking-[0.2em] italic">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary/50 shadow-glow" />
                                    Posted by <span className="text-white/40 ml-1">{notice.author}</span>
                                </div>
                            </div>

                            <div className="text-white text-[12px] leading-relaxed mb-8 flex-1 line-clamp-4 font-medium italic opacity-40 border-l-2 border-white/10 pl-4">
                                {notice.content}
                            </div>

                            <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                                <button
                                    onClick={() => initiateDownload(notice)}
                                    disabled={downloadingId === notice.id}
                                    className="flex-1 py-4 bg-brand-primary text-brand-secondary font-black text-[9px] uppercase tracking-[0.2em] rounded-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 group/btn shadow-lg italic"
                                >
                                    {downloadingId === notice.id ? (
                                        <Loader2 size={14} className="animate-spin text-brand-secondary" />
                                    ) : (
                                        <>
                                            <Download size={16} className="transition-transform group-hover/btn:translate-y-[-2px]" />
                                            Download Flyer
                                        </>
                                    )}
                                </button>

                                {(role === 'admin' || role === 'coach') && (
                                    <button
                                        onClick={() => handleDeleteClick(notice.id)}
                                        className="p-4 bg-white/5 text-white/20 rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-all border border-transparent italic"
                                        title="Delete Announcement"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {notices.length === 0 && (
                    <div className="col-span-full py-40 text-center flex flex-col items-center justify-center text-white/10 bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5">
                        <Megaphone size={64} className="mb-6 opacity-10" />
                        <h3 className="font-black text-white/20 uppercase tracking-[0.4em] italic leading-tight">No Announcements Found</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-10 italic">The notice board is currently empty.</p>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModalOpen}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setNoticeToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="DELETE ANNOUNCEMENT"
                message="Are you sure you want to remove this message? This action is permanent and cannot be undone."
                confirmText="DELETE"
                type="danger"
            />
        </div>
    );
};
