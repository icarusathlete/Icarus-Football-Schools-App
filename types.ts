
export type Role = 'admin' | 'coach' | 'player' | 'pending' | 'rejected';

export interface User {
  id: string;
  username: string;
  password: string; // Stored as plain text for this demo environment only
  role: Role;
  fullName?: string; // Corrected field for profile completion
  memberId?: string; // Corrected field for profile completion
  linkedPlayerId?: string; // For student accounts
  photoUrl?: string; // Coach/Admin Profile Photo
  // Extended Details
  contactNumber?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  employeeNumber?: string;
  // For Coaches
  assignedVenues?: string[];
  assignedBatches?: string[];
  onboardingComplete?: boolean;
  specificRole?: string; // head_coach, assistant_coach, academy_director
  requestedRole?: 'coach' | 'player'; // Self-reported role during pending approval
  requestReason?: string; // Optional note from user when requesting access
}

export interface PlayerEvaluation {
  level: number;
  overallRating: number;
  height: number; // CMS
  weight: number; // KGS
  metrics: {
    passing: number;
    juggling: number;
    shooting: number;
    beepTest: number;
    weakFoot: number;
    longPass: number;
  };
  timeTrials: {
    dribbling: number; // seconds
    speed: number;    // seconds
    agility: number;  // seconds
  };
  developmentAreas: string[];
  coachName: string;
  evaluationDate: string;
  coachRemarks?: string;
  actionImageUrl?: string;
  coachSignatureUrl?: string;
}

export interface Venue {
  id: string;
  name: string;
}

export interface Batch {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  memberId: string; // Human readable ID like ICR-0001
  fullName: string;
  dateOfBirth: string;
  parentName: string;
  contactNumber: string;
  address?: string; 
  venue?: string; // Storing venue name
  batch?: string; // Storing batch name
  photoUrl: string;
  position: string;
  registeredAt: string;
  email?: string;
  notes?: string;
  evaluation?: PlayerEvaluation;
  evaluationHistory?: PlayerEvaluation[]; // Store past reports
  attachments?: { url: string; type: 'image' | 'video'; note: string; date: string }[];
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED'
}

export interface AttendanceRecord {
  id: string;
  playerId: string;
  playerName?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  venue?: string;
  batch?: string;
  notes?: string;
  markedBy?: string;
  timestamp?: number;
}

export interface MatchStats {
  playerId: string;
  goals: number;
  assists: number;
  rating: number; // 1-10
  minutesPlayed: number;
  isStarter?: boolean; // New field to track Starting XI
}

export type MatchEventType = 'goal' | 'yellow_card' | 'red_card' | 'substitution';

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number;
  playerId: string;
  assistantId?: string; // For goals
  subInId?: string; // For substitutions
  subOutId?: string; // For substitutions
}

export interface Match {
  id: string;
  date: string;
  opponent: string;
  result: 'W' | 'L' | 'D';
  scoreFor: number;
  scoreAgainst: number;
  playerStats: MatchStats[];
  highlightsUrl?: string; // Optional YouTube link
  scheduledEventId?: string; // Link to schedule
  isLive?: boolean;
  report?: string;
  playerOfTheMatchId?: string;
  possession?: number;
  shotsOnTarget?: number;
  events?: MatchEvent[];
  timerState?: {
    currentTime: number; // in seconds
    isRunning: boolean;
  };
}

export interface AcademySettings {
  name: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export type EventType = 'training' | 'match' | 'social';

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: EventType;
  location: string;
  leadCoachId?: string; // ID of the coach leading the session
  rsvps?: Record<string, 'attending' | 'declined'>; // playerId -> status
  drillIds?: string[]; // IDs of drills attached to this session
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  priority: 'normal' | 'high';
  imageUrl?: string; // Added field for brochure images
  qrCodeUrl?: string; // Optional QR code for brochure
}

export interface InvoiceDetails {
  invoiceNo: string;
  date: string;
  amount: number;
  paymentMode: string;
  validTill: string;
}

export interface FeeRecord {
  id: string;
  playerId: string;
  month: string; // YYYY-MM
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  amount: number;
  datePaid?: string;
  invoice?: InvoiceDetails;
}

// --- NEW DRILL TYPES ---
export type DrillCategory = 'Technical' | 'Tactical' | 'Physical' | 'Psychosocial' | 'Set Pieces';
export type DrillDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Drill {
  id: string;
  title: string;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  duration: number; // minutes
  minPlayers: number;
  description: string;
  equipment: string[];
  instructions: string[];
  coachingPoints: string[];
  imageUrl?: string; 
  videoUrl?: string; // YouTube link for demonstration
}
// --- COMMUNICATION & SUPPORT TYPES ---

export type MessageType = 'push' | 'email' | 'sms';

export interface BroadcastMessage {
  id: string;
  senderId: string;
  senderName: string;
  title: string;
  content: string;
  type: MessageType;
  targetAudience: 'all' | 'venue' | 'batch';
  targetId?: string; // Venue ID or Batch ID if not 'all'
  timestamp: string;
  status: 'sent' | 'pending' | 'failed';
}

export interface SupportTicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  playerId: string;
  playerName: string;
  subject: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  messages: SupportTicketMessage[];
}
