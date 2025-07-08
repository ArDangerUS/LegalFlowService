
import { apiClient } from '../lib/apiClient';
import { Invitation, UserRole } from '../types/user';

export class InvitationService {
  static async createInvitation(data: {
    email: string;
    role: UserRole;
    officeId?: string;
  }) {
    return apiClient.post('/invitations', data);
  }

  static async getInvitations(): Promise<Invitation[]> {
    return apiClient.get('/invitations');
  }

  static async resendInvitation(invitationId: string) {
    return apiClient.post(`/invitations/${invitationId}/resend`);
  }

  static async deleteInvitation(invitationId: string) {
    return apiClient.delete(`/invitations/${invitationId}`);
  }

  static async acceptInvitation(token: string, userData: {
    name: string;
    password: string;
  }) {
    return apiClient.post(`/invitations/${token}/accept`, userData);
  }

  static async getInvitationByToken(token: string) {
    return apiClient.get(`/invitations/${token}`);
  }
}

// src/services/officeService.ts - Обновленный сервис офисов

import { apiClient } from '../lib/apiClient';

export interface Office {
  id: string;
  name: string;
  address?: string;
  city: string;
  phone?: string;
  email?: string;
  created_at?: string;
}

export class OfficeService {
  static async getOffices(): Promise<Office[]> {
    return apiClient.get('/offices');
  }

  static async createOffice(data: {
    name: string;
    address?: string;
    city: string;
    phone?: string;
    email?: string;
  }): Promise<Office> {
    return apiClient.post('/offices', data);
  }

  static async updateOffice(id: string, data: {
    name: string;
    address?: string;
    city: string;
    phone?: string;
    email?: string;
  }): Promise<Office> {
    return apiClient.put(`/offices/${id}`, data);
  }

  static async deleteOffice(id: string): Promise<void> {
    return apiClient.delete(`/offices/${id}`);
  }
}