// src/api/offices.ts - Простой API для офисов

import { supabase } from '../lib/supabase';

export async function getOffices(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: offices, error } = await supabase
      .from('offices')
      .select('id, name, address, city, phone, email, created_at')
      .order('name');

    if (error) {
      console.error('Get offices error:', error);
      return Response.json({ error: 'Failed to fetch offices' }, { status: 500 });
    }

    return Response.json(offices || []);
  } catch (error) {
    console.error('Get offices error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function createOffice(req: Request) {
  try {
    const { name, address, city, phone, email } = await req.json();
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!name || !city) {
      return Response.json({ error: 'Name and city are required' }, { status: 400 });
    }

    const { data: office, error } = await supabase
      .from('offices')
      .insert({
        name: name.trim(),
        address: address?.trim(),
        city: city.trim(),
        phone: phone?.trim(),
        email: email?.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Create office error:', error);
      return Response.json({ error: 'Failed to create office' }, { status: 500 });
    }

    return Response.json(office, { status: 201 });
  } catch (error) {
    console.error('Create office error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}