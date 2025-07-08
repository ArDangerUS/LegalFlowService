import {Invitation, UserRole} from "../types/user.ts";

export class InvitationService {
  static async createInvitation(data: {
    email: string;
    role: UserRole;
    officeId?: string;
  }) {
    const response = await fetch('/api/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка создания приглашения');
    }

    return response.json();
  }

  static async getInvitations(): Promise<Invitation[]> {
    const response = await fetch('/api/invitations');
    if (!response.ok) {
      throw new Error('Ошибка получения приглашений');
    }
    return response.json();
  }

  static async resendInvitation(invitationId: string) {
    const response = await fetch(`/api/invitations/${invitationId}/resend`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Ошибка повторной отправки приглашения');
    }

    return response.json();
  }

  static async deleteInvitation(invitationId: string) {
    const response = await fetch(`/api/invitations/${invitationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Ошибка удаления приглашения');
    }
  }

  static async acceptInvitation(token: string, userData: {
    name: string;
    password: string;
  }) {
    const response = await fetch(`/api/invitations/${token}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка принятия приглашения');
    }

    return response.json();
  }
}