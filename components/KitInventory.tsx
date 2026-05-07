import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, InventoryItem } from '../types';
import { 
    Search, Shirt, Package, Plus, Edit2, Trash2, Save, X, 
    CheckCircle2, AlertCircle, PackageCheck, ClipboardList,
    TrendingUp, Calendar, Hash, Ruler, Users, Activity
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { PageHeader } from './ui/PageHeader';

// --- Design Helpers ---
const initials = (name: string) => {
  const p = name.trim().split(' ');
  return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
};

export const KitInventory: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'kit' | 'equipment'>('kit');
    const [players, setPlayers] = useState<Player[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Edit States
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [isAddingItem, setIsAddingItem] = useState(false);
    
    // Validation
    const [validationError, setValidationError] = useState<string | null>(null);
    
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        loadData();
        window.addEventListener('academy_data_update', loadData);
        return () => window.removeEventListener('academy_data_update', loadData);
    }, []);

    const loadData = () => {
        setPlayers(StorageService.getPlayers());
        setInventory(StorageService.getInventory());
    };

    const handlePlayerUpdate = async (player: Player) => {
        // Validate Jersey Number Uniqueness
        if (player.jerseyNumber && !StorageService.isJerseyNumberAvailable(player.jerseyNumber, player.id)) {
            setValidationError(`Jersey number ${player.jerseyNumber} is already assigned to another player.`);
            return;
        }
        
        await StorageService.updatePlayer(player);
        setEditingPlayer(null);
        setValidationError(null);
        loadData();
    };

    const handleInventorySubmit = async (item: InventoryItem) => {
        if (isAddingItem) {
            // For new items, remove the placeholder id and use addInventoryItem
            const { id, ...rest } = item;
            await StorageService.addInventoryItem(rest);
        } else {
            await StorageService.updateInventoryItem(item);
        }
        setEditingItem(null);
        setIsAddingItem(false);
        loadData();
    };

    const handleDeleteItem = async (id: string) => {
        await StorageService.deleteInventoryItem(id);
        setConfirmDelete(null);
        loadData();
    };

    const filteredPlayers = players.filter(p => 
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.jerseyNumber && p.jerseyNumber.includes(searchTerm))
    ).sort((a, b) => (a.jerseyNumber || 'ZZZ').localeCompare(b.jerseyNumber || 'ZZZ'));

    const filteredInventory = inventory.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Stats
    const totalKitsIssued = players.filter(p => p.kitIssued).length;
    const totalEquipment = inventory.reduce((acc, item) => acc + item.quantity, 0);
    const lowStockCount = inventory.filter(item => item.minStock && item.quantity <= item.minStock).length;

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700">
            {/* Header Section */}
            <PageHeader 
                title="KIT & EQUIPMENT"
                subtitle="High-fidelity logistics management and academy asset tracking"
                extra={
                    <div className="flex items-center gap-4 px-4 py-2">
                        <div className="flex flex-col items-end">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest italic mb-1">ACADEMY_ASSET_VALUE</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-brand-accent italic tracking-tighter">
                                    ${inventory.reduce((acc, item) => acc + (item.quantity * (item.unitCost || 0)), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                }
            />

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Players', value: players.length, icon: <Users size={18} />, color: '#60a5fa' },
                    { label: 'Kits Issued', value: totalKitsIssued, icon: <CheckCircle2 size={18} />, color: '#C3F629' },
                    { label: 'Low Stock Alerts', value: lowStockCount, icon: <AlertCircle size={18} />, color: '#ef4444', pulse: lowStockCount > 0 },
                    { label: 'Total Assets', value: totalEquipment, icon: <Package size={18} />, color: '#00C8FF' }
                ].map((k, i) => (
                    <div key={i} className={`glass-card p-8 rounded-[2.5rem] group hover:bg-white/10 hover:border-white/30 transition-all duration-500 shadow-xl relative overflow-hidden ${k.pulse && k.label === 'Low Stock Alerts' ? 'border-red-500/30' : ''}`}>
                        {k.pulse && (k.label === 'Low Stock Alerts' ? <div className="red-light-bar" /> : <div className="green-light-bar" />)}
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

            {/* Tactical Search & Row */}
            <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
                <div className="flex p-1.5 bg-brand-950/40 border border-white/5 rounded-2xl w-fit backdrop-blur-xl">
                    <button 
                        onClick={() => { setActiveTab('kit'); setSearchTerm(''); }}
                        className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'kit' ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20' : 'text-white/40 hover:text-white'}`}
                    >
                        <Shirt size={14} />
                        PLAYER_KIT
                    </button>
                    <button 
                        onClick={() => { setActiveTab('equipment'); setSearchTerm(''); }}
                        className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'equipment' ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20' : 'text-white/40 hover:text-white'}`}
                    >
                        <Package size={14} />
                        EQUIPMENT_STOCK
                    </button>
                </div>

                <div className="flex items-center gap-6 w-full xl:w-auto">
                    <div className="relative flex-1 xl:w-96 group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-500/40 group-focus-within:text-brand-accent transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder={`SEARCH_${activeTab === 'kit' ? 'ATHLETES' : 'ASSETS'}_...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-brand-500/5 border border-brand-500/10 rounded-2xl py-4 pl-14 pr-6 text-[10px] font-black text-white placeholder:text-white/20 focus:outline-none focus:border-brand-accent/40 transition-all italic uppercase tracking-widest"
                        />
                    </div>
                    {activeTab === 'equipment' && (
                        <button 
                            onClick={() => {
                                setEditingItem({
                                    id: '',
                                    name: '',
                                    quantity: 0,
                                    condition: 'Excellent',
                                    lastCheckedDate: new Date().toISOString().split('T')[0],
                                    notes: ''
                                });
                                setIsAddingItem(true);
                            }}
                            className="p-4 bg-brand-accent text-brand-secondary rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-accent/20 border border-white/10"
                        >
                            <Plus size={20} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'kit' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlayers.map(player => (
                        <div key={player.id} className="glass-card p-8 rounded-[2.5rem] hover:bg-white/10 hover:border-white/30 transition-all duration-500 group relative overflow-hidden">
                            {/* Player ID Badge */}
                            <div className="absolute top-6 right-6 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">{player.memberId}</span>
                            </div>

                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary font-black text-xl shadow-inner overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                    {player.photoUrl ? (
                                        <img src={player.photoUrl} className="w-full h-full object-cover" alt="" />
                                    ) : initials(player.fullName)}
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none group-hover:text-brand-accent transition-colors">{player.fullName}</h4>
                                    <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.3em] mt-2 italic">{player.position}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 group-hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-2 mb-2 opacity-40">
                                        <Hash size={10} className="text-brand-accent" />
                                        <span className="text-[8px] font-black text-white uppercase tracking-widest">JERSEY_#</span>
                                    </div>
                                    <p className="text-2xl font-black text-white italic tracking-tighter">{player.jerseyNumber || '--'}</p>
                                </div>
                                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 group-hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-2 mb-2 opacity-40">
                                        <Ruler size={10} className="text-cyan-400" />
                                        <span className="text-[8px] font-black text-white uppercase tracking-widest">KIT_SIZE</span>
                                    </div>
                                    <p className="text-2xl font-black text-white italic tracking-tighter">{player.kitSize || '--'}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${player.kitIssued ? 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    {player.kitIssued ? <PackageCheck size={12} /> : <AlertCircle size={12} />}
                                    <span className="text-[9px] font-black uppercase tracking-widest italic">{player.kitIssued ? 'KIT_ISSUED' : 'PENDING_STOCK'}</span>
                                </div>
                                <button 
                                    onClick={() => setEditingPlayer(player)}
                                    className="p-4 bg-white/5 text-white/40 hover:text-brand-accent hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-white/20"
                                >
                                    <Edit2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl border border-white/10">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-8 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic">EQUIPMENT_ASSET</th>
                                <th className="p-8 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic">QUANTITY</th>
                                <th className="p-8 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic">UNIT_VALUE</th>
                                <th className="p-8 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic">CONDITION_LEVEL</th>
                                <th className="p-8 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic">LAST_INSPECTED</th>
                                <th className="p-8 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] italic text-right">CONTROLS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredInventory.map(item => (
                                <tr key={item.id} className="hover:bg-white/5 transition-all duration-300 group">
                                    <td className="p-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20 text-brand-accent group-hover:scale-110 transition-transform duration-500">
                                                <Package size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white uppercase italic tracking-tighter group-hover:text-brand-accent transition-colors">{item.name}</p>
                                                {item.notes && <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-1 italic line-clamp-1">{item.notes}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-base font-black text-white bg-white/5 px-4 py-2 rounded-xl border border-white/10 italic tracking-tighter w-fit">
                                                {item.quantity} <span className="text-[8px] text-white/20 uppercase ml-1">UNITS</span>
                                            </span>
                                            {item.minStock && item.quantity <= item.minStock && (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-md w-fit">
                                                    <AlertCircle size={8} className="text-red-500" />
                                                    <span className="text-[7px] font-black text-red-500 uppercase tracking-tighter italic">LOW_STOCK</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white italic tracking-tighter">${(item.unitCost || 0).toLocaleString()}</span>
                                            <span className="text-[8px] text-white/20 font-black uppercase tracking-widest mt-1 italic">TOTAL: ${(item.quantity * (item.unitCost || 0)).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border w-fit shadow-sm ${
                                            item.condition === 'Excellent' ? 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent' :
                                            item.condition === 'Good' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                                            item.condition === 'Fair' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/10 border-red-500/20 text-red-400'
                                        }`}>
                                            <span className="text-[9px] font-black uppercase tracking-widest italic">{item.condition}</span>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex items-center gap-3 text-white/40">
                                            <Calendar size={14} className="opacity-20" />
                                            <span className="text-[11px] font-black uppercase tracking-widest italic">{new Date(item.lastCheckedDate).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-8 text-right">
                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                            <button 
                                                onClick={() => setEditingItem(item)}
                                                className="p-4 bg-white/5 text-white/40 hover:text-brand-accent hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-white/20"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => setConfirmDelete({ id: item.id, name: item.name })}
                                                className="p-4 bg-white/5 text-white/40 hover:text-red-500 hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-white/20"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInventory.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-32 text-center">
                                        <div className="flex flex-col items-center opacity-10">
                                            <Package size={80} className="mb-6" />
                                            <p className="text-xl font-black uppercase tracking-[0.5em] italic text-white">NO_ASSETS_FOUND</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            {editingPlayer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-brand-secondary/60 animate-in fade-in zoom-in duration-300">
                    <div className="bg-brand-secondary border border-white/10 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/5">
                            <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Edit Player <span className="text-brand-500">Kit Details</span></h3>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">{editingPlayer.fullName}</p>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            {validationError && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
                                    <AlertCircle className="text-red-500 shrink-0" size={18} />
                                    <p className="text-[10px] font-black text-red-500 uppercase italic leading-relaxed">{validationError}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] ml-2 mb-2 block">Jersey Number</label>
                                    <input 
                                        type="text"
                                        value={editingPlayer.jerseyNumber || ''}
                                        onChange={(e) => {
                                            setEditingPlayer({ ...editingPlayer, jerseyNumber: e.target.value.toUpperCase() });
                                            setValidationError(null);
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:outline-none focus:border-brand-500/50 transition-all italic uppercase tracking-wider"
                                        placeholder="EX: 10"
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] ml-2 mb-2 block">Kit Size</label>
                                    <select 
                                        value={editingPlayer.kitSize || ''}
                                        onChange={(e) => setEditingPlayer({ ...editingPlayer, kitSize: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:outline-none focus:border-brand-500/50 transition-all italic uppercase tracking-wider appearance-none"
                                    >
                                        <option value="" disabled className="bg-brand-secondary text-white/40">Select Size</option>
                                        {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                                            <option key={size} value={size} className="bg-brand-secondary text-white">{size}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl">
                                    <div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-wider">Kit Issued</p>
                                        <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mt-1">Status of physical kit collection</p>
                                    </div>
                                    <button 
                                        onClick={() => setEditingPlayer({ ...editingPlayer, kitIssued: !editingPlayer.kitIssued })}
                                        className={`w-14 h-8 rounded-full p-1 transition-all duration-500 ${editingPlayer.kitIssued ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-white/10'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-500 ${editingPlayer.kitIssued ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/5 flex gap-4">
                            <button 
                                onClick={() => { setEditingPlayer(null); setValidationError(null); }}
                                className="flex-1 py-4 px-6 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-[0.25em] hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handlePlayerUpdate(editingPlayer)}
                                className="flex-1 py-4 px-6 bg-brand-500 text-brand-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={14} />
                                Save Updates
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {(editingItem || isAddingItem) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-brand-secondary/60 animate-in fade-in zoom-in duration-300">
                    <div className="bg-brand-secondary border border-white/10 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/5">
                            <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">
                                {isAddingItem ? (
                                    <>New <span className="text-brand-500">Equipment</span></>
                                ) : (
                                    <>Edit <span className="text-brand-500">Equipment</span></>
                                )}
                            </h3>
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">Manage Academy Assets</p>
                        </div>
                        
                        <div className="p-8 space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] ml-2 mb-2 block">Item Name</label>
                                    <input 
                                        type="text"
                                        value={editingItem?.name || ''}
                                        onChange={(e) => setEditingItem({ ...(editingItem as InventoryItem), name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:outline-none focus:border-brand-500/50 transition-all italic uppercase tracking-wider"
                                        placeholder="EX: TRAINING CONES"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] ml-2 mb-2 block">Quantity</label>
                                        <input 
                                            type="number"
                                            value={editingItem?.quantity || 0}
                                            onChange={(e) => setEditingItem({ ...(editingItem as InventoryItem), quantity: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:outline-none focus:border-brand-500/50 transition-all italic uppercase tracking-wider"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] ml-2 mb-2 block">Min Stock Alert</label>
                                        <input 
                                            type="number"
                                            value={editingItem?.minStock || 0}
                                            onChange={(e) => setEditingItem({ ...(editingItem as InventoryItem), minStock: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:outline-none focus:border-brand-500/50 transition-all italic uppercase tracking-wider"
                                            placeholder="EX: 5"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] ml-2 mb-2 block">Unit Cost ($)</label>
                                        <input 
                                            type="number"
                                            value={editingItem?.unitCost || 0}
                                            onChange={(e) => setEditingItem({ ...(editingItem as InventoryItem), unitCost: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:outline-none focus:border-brand-500/50 transition-all italic uppercase tracking-wider"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] ml-2 mb-2 block">Condition</label>
                                        <select 
                                            value={editingItem?.condition || 'Excellent'}
                                            onChange={(e) => setEditingItem({ ...(editingItem as InventoryItem), condition: e.target.value as any })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:outline-none focus:border-brand-500/50 transition-all italic uppercase tracking-wider appearance-none"
                                        >
                                            {['Excellent', 'Good', 'Fair', 'Poor'].map(c => (
                                                <option key={c} value={c} className="bg-brand-secondary text-white">{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] ml-2 mb-2 block">Last Checked Date</label>
                                    <input 
                                        type="date"
                                        value={editingItem?.lastCheckedDate || new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setEditingItem({ ...(editingItem as InventoryItem), lastCheckedDate: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:outline-none focus:border-brand-500/50 transition-all italic uppercase tracking-wider"
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] ml-2 mb-2 block">Notes</label>
                                    <textarea 
                                        value={editingItem?.notes || ''}
                                        onChange={(e) => setEditingItem({ ...(editingItem as InventoryItem), notes: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white focus:outline-none focus:border-brand-500/50 transition-all italic uppercase tracking-wider min-h-[100px]"
                                        placeholder="ADDITIONAL DETAILS..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-white/5 flex gap-4">
                            <button 
                                onClick={() => { setEditingItem(null); setIsAddingItem(false); }}
                                className="flex-1 py-4 px-6 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-[0.25em] hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleInventorySubmit(editingItem!)}
                                className="flex-1 py-4 px-6 bg-brand-500 text-brand-950 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={14} />
                                {isAddingItem ? 'Create Asset' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <ConfirmModal 
                    isOpen={!!confirmDelete}
                    title="Delete Equipment"
                    message={`Are you sure you want to remove ${confirmDelete.name}? This action cannot be undone.`}
                    confirmText="Delete Asset"
                    onConfirm={() => handleDeleteItem(confirmDelete.id)}
                    onCancel={() => setConfirmDelete(null)}
                    type="danger"
                />
            )}
        </div>
    );
};
