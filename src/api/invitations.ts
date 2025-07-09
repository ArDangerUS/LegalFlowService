// src/api/invitations.ts - Простой API для приглашений

import { supabase } from '../lib/supabase';

// Генерация простого токена
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function createInvitation(req: Request) {
  try {
    const { email, role, officeId } = await req.json();
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!email || !role) {
      return Response.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Проверяем, нет ли уже пользователя с таким email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return Response.json({ error: 'User already exists' }, { status: 400 });
    }

    // Получаем текущего пользователя для invited_by
    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!user) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Создаем приглашение
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email,
        role,
        office_id: officeId || null,
        created_by: user.id,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Create invitation error:', error);
      return Response.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    return Response.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      expiresAt: invitation.expires_at,
      message: 'Invitation created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create invitation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function getInvitations(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        office_id,
        expires_at,
        created_at,
        status,
        offices(name, city)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get invitations error:', error);
      return Response.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    const formattedInvitations = (invitations || []).map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      officeId: inv.office_id,
      officeName: inv.offices ? `${inv.offices.name} (${inv.offices.city})` : 'No office',
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
      isExpired: new Date(inv.expires_at) < new Date()
    }));

    return Response.json(formattedInvitations);
  } catch (error) {
    console.error('Get invitations error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function deleteInvitation(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Delete invitation error:', error);
      return Response.json({ error: 'Failed to delete invitation' }, { status: 500 });
    }

    return Response.json({ message: 'Invitation deleted successfully' });
  } catch (error) {
    console.error('Delete invitation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}