import { Router } from 'express';
import {
  createInvitation,
  getInvitations,
  resendInvitation,
  deleteInvitation,
  acceptInvitation,
  getInvitationByToken,
  checkInvitationPermissions
} from '../api/invitations';

const router = Router();

// Создание приглашения (только админы и админы офисов)
router.post('/',
  checkInvitationPermissions(['admin', 'office_admin']),
  createInvitation
);

// Получение списка приглашений (только админы и админы офисов)
router.get('/',
  checkInvitationPermissions(['admin', 'office_admin']),
  getInvitations
);

// Повторная отправка приглашения (только админы и админы офисов)
router.post('/:id/resend',
  checkInvitationPermissions(['admin', 'office_admin']),
  resendInvitation
);

// Удаление приглашения (только админы и админы офисов)
router.delete('/:id',
  checkInvitationPermissions(['admin', 'office_admin']),
  deleteInvitation
);

// Получение информации о приглашении по токену (публичный доступ)
router.get('/:token', getInvitationByToken);

// Принятие приглашения (публичный доступ)
router.post('/:token/accept', acceptInvitation);

export default router;

// middleware/roleBasedAccess.ts - Middleware для проверки прав доступа
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    officeId?: string;
  };
}

export function requireAuth() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Получаем данные пользователя из базы
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, office_id')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();

      if (userError || !userData) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      req.user = {
        id: user.id,
        role: userData.role,
        officeId: userData.office_id
      };

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export function requireOfficeAccess() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Главный админ имеет доступ ко всему
    if (req.user.role === 'admin') {
      return next();
    }

    // Для других ролей проверяем офис
    const targetOfficeId = req.params.officeId || req.body.officeId;

    if (req.user.role === 'office_admin' || req.user.role === 'lawyer') {
      if (!req.user.officeId) {
        return res.status(403).json({ error: 'User not assigned to any office' });
      }

      if (targetOfficeId && targetOfficeId !== req.user.officeId) {
        return res.status(403).json({ error: 'Access denied to this office' });
      }
    }

    next();
  };
}