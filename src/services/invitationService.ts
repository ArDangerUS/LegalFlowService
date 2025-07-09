// src/services/invitationService.ts - Обновленный сервис для приглашений

import { apiClient } from '../lib/apiClient';

export interface InvitationData {
  id: string;
  email: string;
  role: string;
  officeId?: string;
  officeName?: string;
  expiresAt: string;
  isExpired: boolean;
}

export interface AcceptInvitationData {
  name: string;
  password: string;
}

export class InvitationService {
  // Получить приглашение по токену (публичный доступ)
  static async getInvitationByToken(token: string): Promise<InvitationData> {
    // Делаем запрос БЕЗ авторизации для публичной проверки приглашения
    const response = await fetch(`/api/invitations/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Не удалось загрузить приглашение');
    }

    return response.json();
  }

  // Принять приглашение (публичный доступ)
  static async acceptInvitation(token: string, userData: AcceptInvitationData): Promise<any> {
    // Делаем запрос БЕЗ авторизации для регистрации нового пользователя
    const response = await fetch(`/api/invitations/${token}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Ошибка регистрации');
    }

    return response.json();
  }

  // Остальные методы для авторизованных пользователей
  static async createInvitation(data: {
    email: string;
    role: string;
    officeId?: string;
  }) {
    return apiClient.post('/invitations', data);
  }

  static async getInvitations(): Promise<any[]> {
    return apiClient.get('/invitations');
  }

  static async resendInvitation(invitationId: string) {
    return apiClient.post(`/invitations/${invitationId}/resend`);
  }

  static async deleteInvitation(invitationId: string) {
    return apiClient.delete(`/invitations/${invitationId}`);
  }
}