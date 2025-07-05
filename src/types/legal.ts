export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'lawyer' | 'client';
  officeId?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface Invitation {
  id: string;
  email: string;
  token: string;
  role: User['role'];
  officeId?: string;
  officeName?: string;
  createdBy: string;
  createdByName?: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: Date;
  acceptedAt?: Date;
}

export interface Office {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: Date;
}

export interface Case {
  id: string;
  conversationId: string;
  clientName: string;
  clientContact?: string;
  caseType?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'assigned' | 'in-progress' | 'closed' | 'rejected';
  assignedLawyerId?: string;
  assignedLawyerName?: string;
  officeId?: string;
  officeName?: string;
  createdAt: Date;
  assignedAt?: Date;
  closedAt?: Date;
  responseTimeMinutes?: number;
  closureReason?: string;
  rejectionReason?: string;
  satisfactionRating?: number;
  notes?: string;
}


export interface CaseActivity {
  id: string;
  caseId: string;
  userId?: string;
  userName?: string;
  activityType: 'created' | 'assigned' | 'status_changed' | 'note_added' | 'closed' | 'rejected';
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface OfficeStats {
  officeId: string;
  officeName: string;
  totalCases: number;
  closedCases: number;
  rejectedCases: number;
  averageResponseTime: number;
  averageSatisfactionRating: number;
  newRequests: number;
  inProgressCases: number;
}

export interface LawyerStats {
  lawyerId: string;
  lawyerName: string;
  totalCases: number;
  closedCases: number;
  rejectedCases: number;
  averageResponseTime: number;
  averageSatisfactionRating: number;
  activeCases: number;
}