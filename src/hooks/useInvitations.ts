import { useState, useEffect } from 'react';
import {Invitation, UserRole} from '../types/user';
import { InvitationService } from '../services/invitationService';

export const useInvitations = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await InvitationService.getInvitations();
      setInvitations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки приглашений');
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async (data: {
    email: string;
    role: UserRole;
    officeId?: string;
  }) => {
    const newInvitation = await InvitationService.createInvitation(data);
    await loadInvitations(); // Перезагружаем список
    return newInvitation;
  };

  const resendInvitation = async (invitationId: string) => {
    await InvitationService.resendInvitation(invitationId);
    await loadInvitations();
  };

  const deleteInvitation = async (invitationId: string) => {
    await InvitationService.deleteInvitation(invitationId);
    await loadInvitations();
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  return {
    invitations,
    loading,
    error,
    loadInvitations,
    createInvitation,
    resendInvitation,
    deleteInvitation,
  };
};
