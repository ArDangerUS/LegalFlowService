import { supabase } from '../lib/supabase';
import { networkService } from './NetworkService';
import { offlineService } from './OfflineService';
import type { User, Office, Case, CaseActivity, OfficeStats, LawyerStats, Invitation } from '../types/legal';

export class LegalCaseService {
  // User Management
  async createUser(userData: Omit<User, 'id' | 'createdAt'>, id?: string): Promise<User> {
    try {
      const insertData = {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        office_id: userData.officeId || null,
        is_active: userData.isActive,
        ...(id && { id })
      };

      const { data, error } = await supabase
        .from('users')
        .upsert(insertData, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Database error creating user:', error);
        throw new Error(`Failed to create user: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned when creating user');
      }

      return this.mapUserRow(data);
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }
  // Добавьте эти методы в класс LegalCaseService

  async updateOffice(id: string, updates: Partial<Office>): Promise<Office> {
    const { data, error } = await supabase
      .from('offices')
      .update({
        name: updates.name,
        address: updates.address,
        phone: updates.phone,
        email: updates.email
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapOfficeRow(data);
  }

  async deleteOffice(id: string): Promise<void> {
    // Сначала отвязываем всех пользователей от офиса
    await supabase
      .from('users')
      .update({ office_id: null })
      .eq('office_id', id);

    // Затем удаляем офис
    const { error } = await supabase
      .from('offices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getOfficeUsers(officeId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('office_id', officeId)
      .order('name');

    if (error) throw error;
    return (data || []).map(this.mapUserRow);
  }

  async assignUserToOffice(userId: string, officeId: string | null): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ office_id: officeId })
      .eq('id', userId);

    if (error) throw error;
  }

  async getOfficeStatistics(officeId?: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalCases: number;
    activeCases: number;
    avgResponseTime: number;
  }> {
    let usersQuery = supabase.from('users').select('id, is_active');
    let casesQuery = supabase.from('cases').select('id, status, response_time_minutes');

    if (officeId) {
      usersQuery = usersQuery.eq('office_id', officeId);
      casesQuery = casesQuery.eq('office_id', officeId);
    }

    const [usersResult, casesResult] = await Promise.all([
      usersQuery,
      casesQuery
    ]);

    if (usersResult.error) throw usersResult.error;
    if (casesResult.error) throw casesResult.error;

    const users = usersResult.data || [];
    const cases = casesResult.data || [];

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const totalCases = cases.length;
    const activeCases = cases.filter(c => c.status !== 'closed' && c.status !== 'rejected').length;

    const responseTimes = cases
      .filter(c => c.response_time_minutes !== null)
      .map(c => c.response_time_minutes);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    return {
      totalUsers,
      activeUsers,
      totalCases,
      activeCases,
      avgResponseTime
    };
  }
  async getUsers(): Promise<User[]> {
    // Check if we're online, if not return cached data
    if (!networkService.getConnectionStatus() || offlineService.getOfflineMode()) {
      console.warn('⚠️ Offline mode: returning cached users data');
      return offlineService.getOfflineData('users');
    }

    if (!supabase) {
      console.warn('⚠️ Supabase not configured: returning cached users data');
      return offlineService.getOfflineData('users');
    }

    try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

      if (error) throw error;

      const users = (data || []).map(this.mapUserRow);

      // Cache the data for offline use
      offlineService.setOfflineData('users', users);

      return users;
    } catch (error) {
      console.warn('⚠️ Failed to fetch users, falling back to cached data:', error);
      return offlineService.getOfflineData('users');
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is expected when user doesn't exist
          return null;
        }
        console.error('Database error getting user by ID:', error);
        throw new Error(`Failed to get user: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return this.mapUserRow(data);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to get user')) {
        throw error;
      }
      console.error('Error in getUserById:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Database error getting user by email:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return this.mapUserRow(data);
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        role: updates.role,
        office_id: updates.officeId || null,
        is_active: updates.isActive,
        last_login: updates.lastLogin?.toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapUserRow(data);
  }

  // Office Management
  async getOffices(): Promise<Office[]> {
    const { data, error } = await supabase
      .from('offices')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(this.mapOfficeRow);
  }

  async createOffice(officeData: Omit<Office, 'id' | 'createdAt'>): Promise<Office> {
    const { data, error } = await supabase
      .from('offices')
      .insert({
        name: officeData.name,
        address: officeData.address,
        phone: officeData.phone,
        email: officeData.email
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapOfficeRow(data);
  }

  // Case Management
  async getCases(filters?: {
    status?: string;
    assignedLawyerId?: string;
    officeId?: string;
    priority?: string;
  }): Promise<Case[]> {
    // In offline mode, filter cached data
    if (!networkService.getConnectionStatus() || offlineService.getOfflineMode()) {
      console.warn('⚠️ Offline mode: filtering cached cases data');
      const cachedCases = offlineService.getOfflineData('cases');
      return this.filterCasesLocally(cachedCases, userId, userRole, filters);
    }

    // Check if we're online, if not return cached data
    if (!networkService.getConnectionStatus() || offlineService.getOfflineMode()) {
      console.warn('⚠️ Offline mode: returning cached cases data');
      return offlineService.getOfflineData('cases');
    }

    if (!supabase) {
      console.warn('⚠️ Supabase not configured: returning cached cases data');
      return offlineService.getOfflineData('cases');
    }

    try {
    let query = supabase
      .from('cases')
      .select(`
        *,
        assigned_lawyer:users!cases_assigned_lawyer_id_fkey(name),
        office:offices!cases_office_id_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.assignedLawyerId) {
      if (filters.assignedLawyerId === 'unassigned') {
        query = query.is('assigned_lawyer_id', null);
      } else {
        query = query.eq('assigned_lawyer_id', filters.assignedLawyerId);
      }
    }
    if (filters?.officeId) {
      query = query.eq('office_id', filters.officeId);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

      const { data, error } = await query;
      if (error) throw error;

      const cases = (data || []).map(this.mapCaseRow);

      // Cache the data for offline use
      offlineService.setOfflineData('cases', cases);

      return cases;
    } catch (error) {
      console.warn('⚠️ Failed to fetch cases, falling back to cached data:', error);
      return offlineService.getOfflineData('cases');
    }
  }

  /**
   * Get cases filtered by user role and permissions
   */
  async getCasesForUser(
    userId: string,
    userRole: User['role'],
    filters?: {
      status?: string;
      assignedLawyerId?: string;
      officeId?: string;
      priority?: string;
    }
  ): Promise<Case[]> {
    // Admin users can see all cases
    if (userRole === 'admin') {
      return this.getCases(filters);
    }

    // Lawyer users can only see their own assigned cases
    if (userRole === 'lawyer') {
      const lawyerFilters = {
        ...filters,
        assignedLawyerId: userId // Override to only show this lawyer's cases
      };
      return this.getCases(lawyerFilters);
    }

    // Other roles get no cases
    return [];
  }

  private filterCasesLocally(cases: Case[], userId: string, userRole: User['role'], filters?: any): Case[] {
    let filteredCases = [...cases];

    // Apply role-based filtering
    if (userRole === 'lawyer') {
      filteredCases = filteredCases.filter(case_ => case_.assignedLawyerId === userId);
    }

    // Apply additional filters
    if (filters?.status) {
      filteredCases = filteredCases.filter(case_ => case_.status === filters.status);
    }
    if (filters?.priority) {
      filteredCases = filteredCases.filter(case_ => case_.priority === filters.priority);
    }
    if (filters?.assignedLawyerId === 'unassigned') {
      filteredCases = filteredCases.filter(case_ => !case_.assignedLawyerId);
    } else if (filters?.assignedLawyerId) {
      filteredCases = filteredCases.filter(case_ => case_.assignedLawyerId === filters.assignedLawyerId);
    }

    return filteredCases;
  }

  async getCaseById(id: string): Promise<Case | null> {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        assigned_lawyer:users!cases_assigned_lawyer_id_fkey(name),
        office:offices!cases_office_id_fkey(name)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapCaseRow(data);
  }

  async assignCase(caseId: string, lawyerId: string, assignedBy: string): Promise<Case> {
    const { data, error } = await supabase
      .from('cases')
      .update({
        assigned_lawyer_id: lawyerId,
        assigned_at: new Date().toISOString(),
        status: 'assigned'
      })
      .eq('id', caseId)
      .select(`
        *,
        assigned_lawyer:users!cases_assigned_lawyer_id_fkey(name),
        office:offices!cases_office_id_fkey(name)
      `)
      .single();

    if (error) throw error;

    // Create activity log
    await this.createCaseActivity(caseId, assignedBy, 'assigned', `Case assigned to lawyer`);

    // Log assignment for audit purposes
    console.log(`✅ Case ${caseId} assigned to lawyer ${lawyerId} by ${assignedBy}`);

    return this.mapCaseRow(data);
  }

  async updateCaseStatus(
    caseId: string,
    status: Case['status'],
    userId: string,
    reason?: string,
    satisfactionRating?: number
  ): Promise<Case> {
    const updateData: any = {
      status,
      ...(status === 'closed' && { closed_at: new Date().toISOString() }),
      ...(reason && status === 'closed' && { closure_reason: reason }),
      ...(reason && status === 'rejected' && { rejection_reason: reason }),
      ...(satisfactionRating && { satisfaction_rating: satisfactionRating })
    };

    const { data, error } = await supabase
      .from('cases')
      .update(updateData)
      .eq('id', caseId)
      .select(`
        *,
        assigned_lawyer:users!cases_assigned_lawyer_id_fkey(name),
        office:offices!cases_office_id_fkey(name)
      `)
      .single();

    if (error) throw error;

    // Create activity log
    await this.createCaseActivity(caseId, userId, 'status_changed', `Case status changed to ${status}`, { reason, satisfactionRating });

    return this.mapCaseRow(data);
  }

  async addCaseNote(caseId: string, userId: string, note: string): Promise<void> {
    const { error } = await supabase
      .from('cases')
      .update({ notes: note })
      .eq('id', caseId);

    if (error) throw error;

    // Create activity log
    await this.createCaseActivity(caseId, userId, 'note_added', 'Note added to case', { note });
  }

  async deleteCase(caseId: string): Promise<void> {
    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', caseId);

    if (error) throw error;
  }

  // Case Activity Management
  async createCaseActivity(
    caseId: string,
    userId: string,
    activityType: CaseActivity['activityType'],
    description: string,
    metadata?: Record<string, any>
  ): Promise<CaseActivity> {
    const { data, error } = await supabase
      .from('case_activities')
      .insert({
        case_id: caseId,
        user_id: userId,
        activity_type: activityType,
        description,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapCaseActivityRow(data);
  }

  async getCaseActivities(caseId: string): Promise<CaseActivity[]> {
    const { data, error } = await supabase
      .from('case_activities')
      .select(`
        *,
        user:users(name)
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapCaseActivityRow);
  }

  // Analytics
  async getOfficeStats(): Promise<OfficeStats[]> {
    const { data, error } = await supabase.rpc('get_office_statistics');
    if (error) throw error;
    return data || [];
  }

  async getLawyerStats(officeId?: string): Promise<LawyerStats[]> {
    const { data, error } = await supabase.rpc('get_lawyer_statistics', {
      office_filter: officeId
    });
    if (error) throw error;
    return data || [];
  }

  async getUnrespondedCases(minutesThreshold: number = 10): Promise<Case[]> {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        assigned_lawyer:users!cases_assigned_lawyer_id_fkey(name),
        office:offices!cases_office_id_fkey(name)
      `)
      .eq('status', 'new')
      .lt('created_at', new Date(Date.now() - minutesThreshold * 60 * 1000).toISOString());

    if (error) throw error;
    return (data || []).map(this.mapCaseRow);
  }

  // Invitation Management (Removed email functionality)
  async createInvitation(
    email: string,
    role: User['role'],
    officeId: string | undefined,
    createdByUserId: string
  ): Promise<Invitation> {
    // Generate unique token
    const token = crypto.randomUUID() + '-' + Date.now().toString(36);

    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        email,
        token,
        role,
        office_id: officeId || null,
        created_by: createdByUserId,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select(`
        *,
        office:offices(name),
        created_by_user:users!invitations_created_by_fkey(name)
      `)
      .single();

    if (error) {
      // Check for unique constraint violation on email
      if (error.code === '23505' && error.message.includes('invitations_email_key')) {
        throw new Error(`An invitation has already been sent to ${email}. Please check existing invitations or contact the user directly.`);
      }
      throw error;
    }

    const invitation = this.mapInvitationRow(data);

    console.log('✅ Invitation created successfully:', {
      email,
      token,
      expiresAt: expiresAt.toISOString(),
      invitationUrl: `${window.location.origin}/invite/${token}`
    });

    return invitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        office:offices(name),
        created_by_user:users!invitations_created_by_fkey(name)
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      throw error;
    }

    return this.mapInvitationRow(data);
  }

  async getInvitations(): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        office:offices(name),
        created_by_user:users!invitations_created_by_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapInvitationRow);
  }

  async registerUserWithInvitation(
    token: string,
    name: string,
    password: string
  ): Promise<User> {
    // First, validate the invitation
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    try {
      // Create user account with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation for invitations
          data: {
            name: name,
            role: invitation.role,
            office_id: invitation.officeId
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account');

      console.log('✅ Auth user created for invitation:', authData.user.id);

      // Wait for trigger to create user record
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if user was created by trigger
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // If trigger didn't work, create manually
      if (userError || !userData) {
        console.log('Creating user manually as fallback...');
        const { data: manualUserData, error: manualError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: invitation.email,
            name: name,
            role: invitation.role,
            office_id: invitation.officeId || null,
            is_active: true
          })
          .select()
          .single();

        if (manualError) {
          console.error('Failed to create user record:', manualError);
          throw new Error('Failed to create user account. Please try again.');
        }

        userData = manualUserData;
      }

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      console.log('✅ User registered successfully via invitation');

      return this.mapUserRow(userData);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }



  async deleteInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw error;
  }

  async resendInvitation(invitationId: string): Promise<Invitation> {
    // Extend expiration by 24 hours
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 24);

    const { data, error } = await supabase
      .from('invitations')
      .update({
        expires_at: newExpiresAt.toISOString(),
        status: 'pending'
      })
      .eq('id', invitationId)
      .select(`
        *,
        office:offices(name),
        created_by_user:users!invitations_created_by_fkey(name)
      `)
      .single();

    if (error) throw error;

    const invitation = this.mapInvitationRow(data);

    console.log('✅ Invitation resent successfully:', {
      email: invitation.email,
      token: invitation.token,
      expiresAt: newExpiresAt.toISOString(),
      invitationUrl: `${window.location.origin}/invite/${invitation.token}`
    });

    return invitation;
  }

  // Helper methods for mapping database rows to TypeScript interfaces
  private mapUserRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      officeId: row.office_id,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      lastLogin: row.last_login ? new Date(row.last_login) : undefined
    };
  }

  private mapOfficeRow(row: any): Office {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      email: row.email,
      createdAt: new Date(row.created_at)
    };
  }

  private mapCaseRow(row: any): Case {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      clientName: row.client_name,
      clientContact: row.client_contact,
      caseType: row.case_type,
      priority: row.priority,
      status: row.status,
      assignedLawyerId: row.assigned_lawyer_id,
      assignedLawyerName: row.assigned_lawyer?.name,
      officeId: row.office_id,
      officeName: row.office?.name,
      createdAt: new Date(row.created_at),
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : undefined,
      closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
      responseTimeMinutes: row.response_time_minutes,
      closureReason: row.closure_reason,
      rejectionReason: row.rejection_reason,
      satisfactionRating: row.satisfaction_rating,
      notes: row.notes
    };
  }

  private mapCaseActivityRow(row: any): CaseActivity {
    return {
      id: row.id,
      caseId: row.case_id,
      userId: row.user_id,
      userName: row.user?.name,
      activityType: row.activity_type,
      description: row.description,
      metadata: row.metadata,
      createdAt: new Date(row.created_at)
    };
  }

  private mapInvitationRow(row: any): Invitation {
    return {
      id: row.id,
      email: row.email,
      token: row.token,
      role: row.role,
      officeId: row.office_id,
      officeName: row.office?.name,
      createdBy: row.created_by,
      createdByName: row.created_by_user?.name,
      expiresAt: new Date(row.expires_at),
      status: row.status,
      createdAt: new Date(row.created_at),
      acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined
    };
  }
}


