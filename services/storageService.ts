import { Player, AttendanceRecord, AttendanceStatus, User, Match, ScheduleEvent, Announcement, FeeRecord, AcademySettings, PlayerEvaluation, Venue, Batch, Drill, BroadcastMessage, SupportTicket, InventoryItem, Certificate, CoachMessage, WeeklyTip } from '../types';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, updateDoc, deleteField } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  const errorString = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorString);
  throw new Error(errorString);
}

const PLAYERS_KEY = 'icarus_players';
const ATTENDANCE_KEY = 'icarus_attendance';
const USERS_KEY = 'icarus_users';
const MATCHES_KEY = 'icarus_matches';
const SCHEDULE_KEY = 'icarus_schedule';
const NOTICES_KEY = 'icarus_notices';
const FEES_KEY = 'icarus_fees';
const SETTINGS_KEY = 'icarus_settings';
const DRAFTS_KEY = 'icarus_eval_drafts';
const LAST_INVOICE_KEY = 'icarus_last_invoice_id';
const VENUES_KEY = 'icarus_venues';
const BATCHES_KEY = 'icarus_batches';
const DRILLS_KEY = 'icarus_drills';
const SESSION_MOTM_KEY = 'icarus_session_motm';
const FINALIZED_ROLLCALLS_KEY = 'icarus_finalized_rollcalls';
const MESSAGES_KEY = 'icarus_messages';
const TICKETS_KEY = 'icarus_tickets';
const INVENTORY_KEY = 'icarus_inventory';
const CERTIFICATES_KEY = 'icarus_certificates';
const COACH_MESSAGES_KEY = 'icarus_coach_messages';
const WEEKLY_TIPS_KEY = 'icarus_weekly_tips';

const generateId = () => Math.random().toString(36).substr(2, 9);

const notifyDataChange = () => {
  window.dispatchEvent(new Event('academy_data_update'));
};

const generateSequentialMemberId = (existingPlayers: Player[]): string => {
  if (existingPlayers.length === 0) return 'ICR-0001';
  
  const ids = existingPlayers
    .map(p => {
      const match = p.memberId?.match(/ICR-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(id => !isNaN(id));

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextId = maxId + 1;
  return `ICR-${nextId.toString().padStart(4, '0')}`;
};

let syncUnsubscribers: (() => void)[] = [];
let currentSessionUser: User | null = null;

function sanitizeObject(obj: any): any {
  const sanitized: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
  });
  return sanitized;
}

export const StorageService = {
  init: () => {
    // Basic local init if needed, but we rely on Firebase sync now
  },

  // --- INTERNAL UTILITIES ---
  _getFromCache: <T>(key: string): T | null => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Failed to parse cache for ${key}`, e);
      return null;
    }
  },

  _saveToCache: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    notifyDataChange();
  },

  _write: async (collectionName: string, docId: string, data: any, storageKey?: string) => {
    try {
      const sanitized = sanitizeObject(data);
      await setDoc(doc(db, collectionName, docId), sanitized);
      
      if (storageKey) {
          const currentData = StorageService._getFromCache<any>(storageKey);
          if (Array.isArray(currentData)) {
              const index = currentData.findIndex((item: any) => item.id === docId);
              const newItem = { ...sanitized, id: docId };
              if (index !== -1) {
                  currentData[index] = newItem;
              } else {
                  currentData.push(newItem);
              }
              StorageService._saveToCache(storageKey, currentData);
          } else if (currentData && typeof currentData === 'object') {
              currentData[docId] = sanitized;
              StorageService._saveToCache(storageKey, currentData);
          }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
      throw error;
    }
  },

  _delete: async (collectionName: string, docId: string, storageKey?: string) => {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      
      if (storageKey) {
          const currentData = StorageService._getFromCache<any>(storageKey);
          if (Array.isArray(currentData)) {
              const filtered = currentData.filter((item: any) => item.id !== docId);
              StorageService._saveToCache(storageKey, filtered);
          } else if (currentData && typeof currentData === 'object') {
              delete currentData[docId];
              StorageService._saveToCache(storageKey, currentData);
          }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
      throw error;
    }
  },

  startFirebaseSync: (user: User) => {
    currentSessionUser = user;
    // Clear previous listeners
    syncUnsubscribers.forEach(unsub => unsub());
    syncUnsubscribers = [];

    const syncCollection = (collectionName: string, storageKey: string, isMap = false) => {
      const unsub = onSnapshot(collection(db, collectionName), (snapshot) => {
        if (isMap) {
            const data: any = {};
            snapshot.docs.forEach(doc => {
                data[doc.id] = doc.data();
            });
            StorageService._saveToCache(storageKey, data);
        } else {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            StorageService._saveToCache(storageKey, data);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, collectionName);
      });
      syncUnsubscribers.push(unsub);
    };

    const syncQuery = (q: any, storageKey: string, isMap = false) => {
      const unsub = onSnapshot(q, (snapshot) => {
        if (isMap) {
            const data: any = {};
            snapshot.docs.forEach(doc => {
                data[doc.id] = doc.data();
            });
            StorageService._saveToCache(storageKey, data);
        } else {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            StorageService._saveToCache(storageKey, data);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, storageKey);
      });
      syncUnsubscribers.push(unsub);
    };

    syncCollection('players', PLAYERS_KEY);
    syncCollection('matches', MATCHES_KEY);
    syncCollection('attendance', ATTENDANCE_KEY);
    syncCollection('schedule', SCHEDULE_KEY);
    syncCollection('notices', NOTICES_KEY);
    syncCollection('venues', VENUES_KEY);
    syncCollection('batches', BATCHES_KEY);
    syncCollection('drills', DRILLS_KEY);
    syncCollection('session_motm', SESSION_MOTM_KEY, true);
    syncCollection('finalized_rollcalls', FINALIZED_ROLLCALLS_KEY, true);
    syncCollection('messages', MESSAGES_KEY);
    syncCollection('tickets', TICKETS_KEY);
    syncCollection('inventory', INVENTORY_KEY);
    syncCollection('certificates', CERTIFICATES_KEY);
    syncCollection('coach_messages', COACH_MESSAGES_KEY);
    syncCollection('weekly_tips', WEEKLY_TIPS_KEY);

    if (user.role === 'admin' || user.role === 'coach') {
        syncCollection('users', USERS_KEY);
        syncCollection('fees', FEES_KEY);
    } else {
        import('firebase/firestore').then(({ query, where, collection, doc, onSnapshot }) => {
            let coachesData: any[] = [];
            let myData: any = null;

            const updateStoredUsers = () => {
                const combined = myData ? [myData, ...coachesData.filter(c => c.id !== user.id)] : coachesData;
                StorageService._saveToCache(USERS_KEY, combined);
            };

            const unsubCoaches = onSnapshot(query(collection(db, 'users'), where('role', '==', 'coach')), (snap) => {
                coachesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                updateStoredUsers();
            });

            const unsubMe = onSnapshot(doc(db, 'users', user.id), (snap) => {
                if (snap.exists()) {
                    myData = { id: snap.id, ...snap.data() };
                    updateStoredUsers();
                }
            });

            syncUnsubscribers.push(unsubCoaches, unsubMe);

            if (user.linkedPlayerId) {
                const feesQuery = query(collection(db, 'fees'), where('playerId', '==', user.linkedPlayerId));
                syncQuery(feesQuery, FEES_KEY);
            } else {
                StorageService._saveToCache(FEES_KEY, []);
            }
        });
    }

    const unsubSettings = onSnapshot(doc(db, 'settings', 'academy'), (docSnap) => {
      if (docSnap.exists()) {
        StorageService._saveToCache(SETTINGS_KEY, { academy: docSnap.data() });
        window.dispatchEvent(new Event('settingsChanged'));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/academy');
    });
    syncUnsubscribers.push(unsubSettings);
  },

  stopFirebaseSync: () => {
    currentSessionUser = null;
    syncUnsubscribers.forEach(unsub => unsub());
    syncUnsubscribers = [];
  },

  getCurrentUser: () => {
    return currentSessionUser;
  },

  getPlayers: (): Player[] => {
    return StorageService._getFromCache<Player[]>(PLAYERS_KEY) || [];
  },

  addPlayer: async (player: Omit<Player, 'id' | 'memberId' | 'registeredAt'>): Promise<Player> => {
    console.log("StorageService.addPlayer called with:", player);
    const players = StorageService.getPlayers();
    const newMemberId = generateSequentialMemberId(players);
    const newId = generateId();
    const newPlayer: Player = sanitizeObject({
      ...player,
      id: newId,
      memberId: newMemberId,
      registeredAt: new Date().toISOString(),
    });
    
    try {
        await StorageService._write('players', newId, newPlayer, PLAYERS_KEY);
        console.log("Player successfully added to Firestore:", newId);
        return newPlayer;
    } catch (error) {
        throw error;
    }
  },

  findPlayerByName: (name: string): Player | undefined => {
    const players = StorageService.getPlayers();
    return players.find(p => p.fullName.toLowerCase().trim() === name.toLowerCase().trim());
  },

  deduplicatePlayers: async () => {
    const players = StorageService.getPlayers();
    const uniqueMap = new Map<string, Player>();
    const toDelete: string[] = [];

    players.forEach(p => {
        const key = `${p.fullName.toLowerCase().trim()}-${p.contactNumber.trim()}`;
        if (uniqueMap.has(key)) {
            // If already exists, mark this ID for deletion
            toDelete.push(p.id);
        } else {
            uniqueMap.set(key, p);
        }
    });

    if (toDelete.length > 0) {
        console.log(`Deduplicating: Removing ${toDelete.length} redundant records.`);
        for (const id of toDelete) {
            await StorageService.deletePlayer(id);
        }
        return true;
    }
    return false;
  },

  deletePlayer: async (playerId: string) => {
    await StorageService._delete('players', playerId, PLAYERS_KEY);
  },

  updatePlayer: async (player: Player) => {
    await StorageService._write('players', player.id, player, PLAYERS_KEY);
  },

  saveEvaluation: async (playerId: string, evaluation: PlayerEvaluation) => {
    const players = StorageService.getPlayers();
    const index = players.findIndex(p => p.id === playerId);
    if (index >= 0) {
      const player = players[index];
      if (!player.evaluationHistory) player.evaluationHistory = [];
      if (player.evaluation) {
          const isSameDay = player.evaluation.evaluationDate === evaluation.evaluationDate;
          if (!isSameDay) {
              player.evaluationHistory.push(player.evaluation);
              player.evaluationHistory.sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime());
          }
      }
      player.evaluation = evaluation;
      await StorageService._write('players', playerId, player, PLAYERS_KEY);
      StorageService.clearDraft(playerId);
    }
  },

  deleteEvaluation: async (playerId: string) => {
    try {
      const playerRef = doc(db, 'players', playerId);
      await updateDoc(playerRef, {
        evaluation: deleteField()
      });
      StorageService.clearDraft(playerId);
      notifyDataChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${playerId}/evaluation`);
    }
  },

  clearEvaluationHistory: async (playerId: string) => {
    try {
      const playerRef = doc(db, 'players', playerId);
      await updateDoc(playerRef, {
        evaluationHistory: deleteField()
      });
      notifyDataChange();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${playerId}/evaluationHistory`);
    }
  },

  getDrafts: (): Record<string, PlayerEvaluation> => {
      return StorageService._getFromCache<Record<string, PlayerEvaluation>>(DRAFTS_KEY) || {};
  },

  saveDraft: (playerId: string, evaluation: PlayerEvaluation) => {
      const drafts = StorageService.getDrafts();
      drafts[playerId] = evaluation;
      StorageService._saveToCache(DRAFTS_KEY, drafts);
  },

  getDraft: (playerId: string): PlayerEvaluation | null => {
      const drafts = StorageService.getDrafts();
      return drafts[playerId] || null;
  },

  clearDraft: (playerId: string) => {
      const drafts = StorageService.getDrafts();
      if (drafts[playerId]) {
          delete drafts[playerId];
          StorageService._saveToCache(DRAFTS_KEY, drafts);
      }
  },

  setMOTM: async (playerId: string, date: string, venue?: string, batch?: string) => {
      const key = (venue && batch) ? `${date}_${venue}_${batch}` : date;
      await StorageService._write('session_motm', key, { playerId, timestamp: Date.now(), venue, batch }, SESSION_MOTM_KEY);
  },

  getMOTM: (date: string, venue?: string, batch?: string): { playerId: string, timestamp: number } | null => {
      const key = (venue && batch) ? `${date}_${venue}_${batch}` : date;
      const storage = StorageService._getFromCache<Record<string, any>>(SESSION_MOTM_KEY);
      return storage ? (storage[key] || null) : null;
  },

  getNextInvoiceId: (): string => {
      const fees = StorageService.getFees();
      let maxNum = 0;
      fees.forEach(fee => {
          if (fee.invoice && fee.invoice.invoiceNo) {
              const match = fee.invoice.invoiceNo.match(/INV-(\d+)/);
              if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > maxNum) maxNum = num;
              }
          }
      });
      const nextNum = maxNum + 1;
      return `INV-${nextNum.toString().padStart(3, '0')}`;
  },

  saveLastInvoiceId: (id: string) => {
    // Deprecated: calculated dynamically via getNextInvoiceId
  },

  getVenues: (): Venue[] => StorageService._getFromCache<Venue[]>(VENUES_KEY) || [],
  
  addVenue: async (name: string) => {
      const newId = generateId();
      await StorageService._write('venues', newId, { id: newId, name }, VENUES_KEY);
  },

  updateVenue: async (id: string, name: string) => {
      await StorageService._write('venues', id, { id, name }, VENUES_KEY);
  },

  deleteVenue: async (id: string) => {
    await StorageService._delete('venues', id, VENUES_KEY);
  },

  getBatches: (): Batch[] => StorageService._getFromCache<Batch[]>(BATCHES_KEY) || [],

  addBatch: async (name: string) => {
      const newId = generateId();
      await StorageService._write('batches', newId, { id: newId, name }, BATCHES_KEY);
  },

  updateBatch: async (id: string, name: string) => {
      await StorageService._write('batches', id, { id, name }, BATCHES_KEY);
  },

  deleteBatch: async (id: string) => {
    await StorageService._delete('batches', id, BATCHES_KEY);
  },

  getDrills: (): Drill[] => StorageService._getFromCache<Drill[]>(DRILLS_KEY) || [],

  addDrill: async (drill: Omit<Drill, 'id'>) => {
      const newId = generateId();
      await StorageService._write('drills', newId, { ...drill, id: newId }, DRILLS_KEY);
  },

  deleteDrill: async (id: string) => {
    await StorageService._delete('drills', id, DRILLS_KEY);
  },

  getAttendance: (): AttendanceRecord[] => StorageService._getFromCache<AttendanceRecord[]>(ATTENDANCE_KEY) || [],
  
  getDailyAttendance: (date: string) => StorageService.getAttendance().filter(r => r.date === date),
  
  saveAttendanceBatch: async (records: AttendanceRecord[]) => {
    // Write each record to Firestore
    const promises = records.map(r => {
        const id = r.id || generateId();
        return StorageService._write('attendance', id, { ...r, id }, ATTENDANCE_KEY);
    });
    await Promise.all(promises);
  },

  savePlayerSelfCheckIn: async (playerId: string, date: string) => {
    const id = `${date}_${playerId}`;
    const record: AttendanceRecord = {
      id,
      playerId,
      date,
      status: AttendanceStatus.PRESENT,
      notes: 'Self Check-In'
    };
    await StorageService._write('attendance', id, record, ATTENDANCE_KEY);
  },

  isRollcallFinalized: (date: string, venue?: string, batch?: string): boolean => {
      const key = (venue && batch) ? `${date}_${venue}_${batch}` : date;
      const storage = StorageService._getFromCache<Record<string, any>>(FINALIZED_ROLLCALLS_KEY);
      return storage ? !!storage[key] : false;
  },

  finalizeRollcall: async (date: string, venue?: string, batch?: string) => {
      const key = (venue && batch) ? `${date}_${venue}_${batch}` : date;
      await StorageService._write('finalized_rollcalls', key, { finalized: true, timestamp: Date.now(), venue, batch }, FINALIZED_ROLLCALLS_KEY);
  },

  unfinalizeRollcall: async (date: string, venue?: string, batch?: string) => {
      const key = (venue && batch) ? `${date}_${venue}_${batch}` : date;
      await StorageService._delete('finalized_rollcalls', key, FINALIZED_ROLLCALLS_KEY);
  },
  
  getUsers: (): User[] => StorageService._getFromCache<User[]>(USERS_KEY) || [],
  
  addUser: async (u: Omit<User, 'id'>) => {
    const newId = generateId();
    const newUser = sanitizeObject({...u, id: newId});
    await StorageService._write('users', newId, newUser, USERS_KEY);
    return newUser;
  },
  
  deleteUser: async (id: string) => {
    await StorageService._delete('users', id, USERS_KEY);
  },

  getCertificates: (): Certificate[] => StorageService._getFromCache<Certificate[]>(CERTIFICATES_KEY) || [],

  sendCoachMessage: async (msg: Omit<CoachMessage, 'id' | 'timestamp' | 'read'>) => {
    const id = generateId();
    const newMsg: CoachMessage = {
      ...msg,
      id,
      timestamp: Date.now(),
      read: false
    };
    await StorageService._write('coach_messages', id, newMsg, COACH_MESSAGES_KEY);
    return newMsg;
  },

  getCoachMessages: (): CoachMessage[] => StorageService._getFromCache<CoachMessage[]>(COACH_MESSAGES_KEY) || [],

  getWeeklyTips: (): WeeklyTip[] => StorageService._getFromCache<WeeklyTip[]>(WEEKLY_TIPS_KEY) || [],

  getMatches: (): Match[] => StorageService._getFromCache<Match[]>(MATCHES_KEY) || [],
  
  addMatch: async (m: Omit<Match, 'id'>) => {
    const newId = generateId();
    const newMatch = sanitizeObject({...m, id: newId});
    await StorageService._write('matches', newId, newMatch, MATCHES_KEY);
    return newMatch;
  },

  updateMatch: async (m: Match) => {
    await StorageService._write('matches', m.id, m, MATCHES_KEY);
  },

  deleteMatch: async (id: string) => {
    await StorageService._delete('matches', id, MATCHES_KEY);
  },
  
  getSchedule: (): ScheduleEvent[] => StorageService._getFromCache<ScheduleEvent[]>(SCHEDULE_KEY) || [],
  
  addEvent: async (e: Omit<ScheduleEvent, 'id'>) => {
      const newId = generateId();
      await StorageService._write('schedule', newId, { ...e, id: newId }, SCHEDULE_KEY);
  },
  
  updateEvent: async (updatedEvent: ScheduleEvent) => {
      await StorageService._write('schedule', updatedEvent.id, updatedEvent, SCHEDULE_KEY);
  },

  deleteEvent: async (id: string) => {
    await StorageService._delete('schedule', id, SCHEDULE_KEY);
  },
  
  toggleRSVP: async (eventId: string, playerId: string, status: 'attending' | 'declined') => {
      const schedule = StorageService.getSchedule();
      const eventIndex = schedule.findIndex(e => e.id === eventId);
      if (eventIndex >= 0) {
          const event = schedule[eventIndex];
          if (!event.rsvps) event.rsvps = {};
          if (event.rsvps[playerId] === status) {
              delete event.rsvps[playerId];
          } else {
              event.rsvps[playerId] = status;
          }
          try {
            await setDoc(doc(db, 'schedule', eventId), event);
            return event;
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `schedule/${eventId}`);
          }
      }
      return null;
  },

  getNotices: (): Announcement[] => StorageService._getFromCache<Announcement[]>(NOTICES_KEY) || [],
  
  addNotice: async (n: Omit<Announcement, 'id' | 'date'>) => {
      const newId = generateId();
      await StorageService._write('notices', newId, { ...n, id: newId, date: new Date().toISOString() }, NOTICES_KEY);
  },
  
  deleteNotice: async (id: string) => {
    await StorageService._delete('notices', id, NOTICES_KEY);
  },
  
  getFees: (): FeeRecord[] => StorageService._getFromCache<FeeRecord[]>(FEES_KEY) || [],
  
  updateFee: async (f: FeeRecord) => {
    const id = f.id || generateId();
    await StorageService._write('fees', id, { ...f, id }, FEES_KEY);
  },

  deleteFee: async (id: string) => {
    await StorageService._delete('fees', id, FEES_KEY);
  },

  getSettings: (): AcademySettings => {
    const data = StorageService._getFromCache<any>(SETTINGS_KEY);
    if (data?.academy) return data.academy;
    
    return {
      name: 'ACADEMY PORTAL',
      logoUrl: '',
      primaryColor: '#0066FF', // Tactical Blue
      secondaryColor: '#0D1B8A', // Deep Midnight
      fontFamily: 'Orbitron' 
    };
  },
  
  saveSettings: async (s: AcademySettings) => { 
    await StorageService._write('settings', 'academy', s, SETTINGS_KEY);
    window.dispatchEvent(new Event('settingsChanged'));
  },
  
  exportData: () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('icarus_')) {
            try {
                data[key] = JSON.parse(localStorage.getItem(key) || 'null');
            } catch (e) {
                data[key] = localStorage.getItem(key);
            }
        }
    }
    return JSON.stringify(data, null, 2);
  },
  
  triggerBackupDownload: () => {
    const dataStr = StorageService.exportData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `icarus_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  
  analyzeBackup: (jsonStr: string) => {
      try {
          const data = JSON.parse(jsonStr);
          const stats: any = { valid: false, details: {} };
          
          if (data[PLAYERS_KEY]) stats.details.players = data[PLAYERS_KEY].length;
          if (data[MATCHES_KEY]) stats.details.matches = data[MATCHES_KEY].length;
          
          if (Object.keys(data).some(k => k.startsWith('icarus_'))) {
              stats.valid = true;
          }
          return stats;
      } catch (e) {
          return { valid: false, error: 'Invalid JSON format' };
      }
  },

  restoreBackup: async (jsonStr: string) => { 
    try { 
      const data = JSON.parse(jsonStr); 
      if (!data.icarus_players && !data.icarus_settings) return false;

      // Restore to Firebase
      if (data[PLAYERS_KEY]) {
          for (const p of data[PLAYERS_KEY]) {
            try {
              await setDoc(doc(db, 'players', p.id), p);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `players/${p.id}`);
            }
          }
      }
      if (data[USERS_KEY]) {
          for (const u of data[USERS_KEY]) {
            try {
              await setDoc(doc(db, 'users', u.id), u);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `users/${u.id}`);
            }
          }
      }
      if (data[MATCHES_KEY]) {
          for (const m of data[MATCHES_KEY]) {
            try {
              await setDoc(doc(db, 'matches', m.id), m);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `matches/${m.id}`);
            }
          }
      }
      if (data[ATTENDANCE_KEY]) {
          for (const a of data[ATTENDANCE_KEY]) {
            const id = a.id || generateId();
            try {
              await setDoc(doc(db, 'attendance', id), { ...a, id });
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `attendance/${id}`);
            }
          }
      }
      if (data[SCHEDULE_KEY]) {
          for (const s of data[SCHEDULE_KEY]) {
            try {
              await setDoc(doc(db, 'schedule', s.id), s);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `schedule/${s.id}`);
            }
          }
      }
      if (data[NOTICES_KEY]) {
          for (const n of data[NOTICES_KEY]) {
            try {
              await setDoc(doc(db, 'notices', n.id), n);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `notices/${n.id}`);
            }
          }
      }
      if (data[FEES_KEY]) {
          for (const f of data[FEES_KEY]) {
            const id = f.id || generateId();
            try {
              await setDoc(doc(db, 'fees', id), { ...f, id });
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `fees/${id}`);
            }
          }
      }
      if (data[VENUES_KEY]) {
          for (const v of data[VENUES_KEY]) {
            try {
              await setDoc(doc(db, 'venues', v.id), v);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `venues/${v.id}`);
            }
          }
      }
      if (data[BATCHES_KEY]) {
          for (const b of data[BATCHES_KEY]) {
            try {
              await setDoc(doc(db, 'batches', b.id), b);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `batches/${b.id}`);
            }
          }
      }
      if (data[DRILLS_KEY]) {
          for (const d of data[DRILLS_KEY]) {
            try {
              await setDoc(doc(db, 'drills', d.id), d);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, `drills/${d.id}`);
            }
          }
      }
      if (data[SETTINGS_KEY]) {
          try {
            await setDoc(doc(db, 'settings', 'academy'), data[SETTINGS_KEY]);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'settings/academy');
          }
      }
      if (data[SESSION_MOTM_KEY]) {
          for (const date of Object.keys(data[SESSION_MOTM_KEY])) {
              try {
                await setDoc(doc(db, 'session_motm', date), data[SESSION_MOTM_KEY][date]);
              } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, `session_motm/${date}`);
              }
          }
      }

      return true; 
    } catch(e) {
      console.error("Restore failed:", e);
      return false;
    } 
  },
  
  clearData: () => { 
    // Clearing Firebase data programmatically is dangerous and usually not done client-side.
    // We'll leave this as a no-op or just clear local storage for now.
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('icarus_')) {
            localStorage.removeItem(key);
        }
    });
    window.dispatchEvent(new Event('settingsChanged')); 
    notifyDataChange();
  },

  // --- Local Backups (IndexedDB) ---
  saveLocalBackup: async (name?: string): Promise<any> => {
    const dataStr = StorageService.exportData();
    const backup = {
      id: generateId(),
      name: name || `Backup ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      data: dataStr
    };
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IcarusBackupsDB', 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        store.put(backup);
        tx.oncomplete = () => resolve(backup);
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  },

  getLocalBackups: async (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IcarusBackupsDB', 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('backups')) {
            resolve([]);
            return;
        }
        const tx = db.transaction('backups', 'readonly');
        const store = tx.objectStore('backups');
        const getAll = store.getAll();
        getAll.onsuccess = () => resolve(getAll.result.sort((a: any, b: any) => b.timestamp - a.timestamp));
        getAll.onerror = () => reject(getAll.error);
      };
      request.onerror = () => reject(request.error);
    });
  },

  deleteLocalBackup: async (id: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('IcarusBackupsDB', 1);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  },

  seedSampleData: async () => {
      console.log("Seeding sample data...");
      
      // 1. Mock Players
      const players = [
          { fullName: 'Marcus Rashford', squadId: 'U13', position: 'Forward', username: 'rashy10' },
          { fullName: 'Jude Bellingham', squadId: 'U15', position: 'Midfielder', username: 'jude5' },
          { fullName: 'Bukayo Saka', squadId: 'U13', position: 'Winger', username: 'saka7' },
          { fullName: 'Phil Foden', squadId: 'U15', position: 'Midfielder', username: 'phil47' },
          { fullName: 'Kobbie Mainoo', squadId: 'U13', position: 'Midfielder', username: 'kobbie37' },
      ];

      for (const p of players) {
          await StorageService.addPlayer({
              ...p as any, 
              contactNumber: '555-0100', 
              dateOfBirth: '2010-01-01', 
              parentName: 'Guardian', 
              photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`
          });
      }

      const freshPlayers = StorageService.getPlayers();

      // 2. Mock Matches (Past)
      const matches = [
          { date: '2024-03-20', opponent: 'Nexus Academy', scoreFor: 3, scoreAgainst: 1, isLive: false, highlightsUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ' },
          { date: '2024-03-25', opponent: 'Crestwood FC', scoreFor: 2, scoreAgainst: 2, isLive: false },
          { date: '2024-03-28', opponent: 'Titan Academy', scoreFor: 0, scoreAgainst: 2, isLive: false },
          { date: '2024-04-01', opponent: 'Solar Hawks', scoreFor: 4, scoreAgainst: 0, isLive: false },
      ];

      for (const m of matches) {
          const stats = freshPlayers.map(p => ({
              playerId: p.id,
              goals: Math.floor(Math.random() * 2),
              assists: Math.floor(Math.random() * 1),
              rating: 6 + Math.floor(Math.random() * 4),
              minutesPlayed: 90,
              isStarter: true
          }));
          await StorageService.addMatch({
              ...m,
              result: m.scoreFor > m.scoreAgainst ? 'W' : m.scoreFor < m.scoreAgainst ? 'L' : 'D',
              playerStats: stats,
              possession: 45 + Math.floor(Math.random() * 15),
              shotsOnTarget: m.scoreFor + Math.floor(Math.random() * 5),
              report: 'Strong performance on the break. Tactical discipline was maintained throughout the second half.'
          } as any);
      }

      // 3. Mock Venues & Batches
      await StorageService.addVenue('Icarus Pro Complex');
      await StorageService.addVenue('Olympic Grounds');
      await StorageService.addBatch('Performance Elite');
      await StorageService.addBatch('Development Pro');

      // 4. Mock Schedule (Past & Future)
      const now = new Date();
      const schedule = [
          { title: 'Match against Rovers FC', date: new Date(now.getTime() + 86400000 * 3).toISOString().split('T')[0], time: '10:00', type: 'match', location: 'Icarus Pro Complex' },
          { title: 'Training: Tactical Positioning', date: new Date(now.getTime() + 86400000 * 5).toISOString().split('T')[0], time: '16:00', type: 'training', location: 'Olympic Grounds' },
          { title: 'Match against Zenith United', date: new Date(now.getTime() + 86400000 * 10).toISOString().split('T')[0], time: '14:00', type: 'match', location: 'Icarus Pro Complex' },
      ];

      for (const s of schedule) {
          await StorageService.addEvent(s as any);
      }

      // 5. Mock Notices
      await StorageService.addNotice({ 
          title: 'New Training Kits Available', 
          content: 'Please collect your new Icarus brand kits from the office after practice.', 
          author: 'Academy Director',
          priority: 'normal'
      });
      await StorageService.addNotice({ 
          title: 'Spring Tournament Update', 
          content: 'Tournament brackets have been finalized. Check the Match Center for upcoming fixtures.', 
          author: 'Head Coach',
          priority: 'high'
      });

      console.log("Seeding complete.");
  },

  // --- COMMUNICATION & SUPPORT METHODS ---
  getMessages: (): BroadcastMessage[] => StorageService._getFromCache<BroadcastMessage[]>(MESSAGES_KEY) || [],

  sendBroadcast: async (message: Omit<BroadcastMessage, 'id' | 'timestamp' | 'status'>) => {
    const id = generateId();
    const newMessage: BroadcastMessage = {
      ...message,
      id,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    await StorageService._write('messages', id, newMessage, MESSAGES_KEY);
    return newMessage;
  },

  deleteMessage: async (id: string) => {
    await StorageService._delete('messages', id, MESSAGES_KEY);
  },

  getTickets: (): SupportTicket[] => StorageService._getFromCache<SupportTicket[]>(TICKETS_KEY) || [],

  addTicket: async (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>) => {
    const id = generateId();
    const now = new Date().toISOString();
    const newTicket: SupportTicket = {
      ...ticket,
      id,
      createdAt: now,
      updatedAt: now,
      messages: []
    };
    await StorageService._write('tickets', id, newTicket, TICKETS_KEY);
    return newTicket;
  },

  updateTicket: async (ticket: SupportTicket) => {
    const updatedTicket = {
      ...ticket,
      updatedAt: new Date().toISOString()
    };
    await StorageService._write('tickets', updatedTicket.id, updatedTicket, TICKETS_KEY);
  },

  deleteTicket: async (id: string) => {
    await StorageService._delete('tickets', id, TICKETS_KEY);
  },

  // --- INVENTORY METHODS ---
  getInventory: (): InventoryItem[] => StorageService._getFromCache<InventoryItem[]>(INVENTORY_KEY) || [],

  addInventoryItem: async (item: Omit<InventoryItem, 'id'>) => {
    const id = generateId();
    const newItem = { ...item, id };
    await StorageService._write('inventory', id, newItem, INVENTORY_KEY);
    return newItem;
  },

  updateInventoryItem: async (item: InventoryItem) => {
    await StorageService._write('inventory', item.id, item, INVENTORY_KEY);
  },

  deleteInventoryItem: async (id: string) => {
    await StorageService._delete('inventory', id, INVENTORY_KEY);
  },

  isJerseyNumberAvailable: (jerseyNumber: string, excludePlayerId?: string): boolean => {
    if (!jerseyNumber) return true;
    const players = StorageService.getPlayers();
    return !players.some(p => p.jerseyNumber === jerseyNumber && p.id !== excludePlayerId);
  }
};
