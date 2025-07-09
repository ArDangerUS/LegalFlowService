// src/lib/apiClient.ts - Исправленный API клиент без TypeScript ошибок

import { supabase } from './supabase';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    // Если мы в разработке и нет прокси, используем полный URL
    if (window.location.port === '5173' || window.location.port === '3001') {
      this.baseUrl = 'http://localhost:3000/api';
    } else {
      this.baseUrl = baseUrl;
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // Получаем токен из Supabase session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        return { 'Authorization': `Bearer ${session.access_token}` };
      }

      // Fallback на localStorage если нет сессии
      const token = localStorage.getItem('auth_token');
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {};
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`API Request: ${config.method || 'GET'} ${url}`);

      const response = await fetch(url, config);

      // Логируем ответ для отладки
      console.log(`API Response: ${response.status} ${response.statusText}`);

      // Проверяем Content-Type
      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            // Если получили HTML вместо JSON (например, страницу ошибки)
            const textContent = await response.text();
            if (textContent.includes('<!DOCTYPE') || textContent.includes('<html')) {
              errorMessage = 'Server returned HTML instead of JSON. Check API endpoints.';
              console.error('Received HTML response:', textContent.substring(0, 200));
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }

        throw new Error(errorMessage);
      }

      // Если ответ пустой (например, для DELETE), возвращаем null
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null as T;
      }

      // Проверяем, что получили JSON
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        throw new Error('Expected JSON response but received: ' + contentType);
      }

    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to API server');
      }
      throw error;
    }
  }

  // GET запрос
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST запрос - ИСПРАВЛЕНА СИГНАТУРА
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT запрос - ИСПРАВЛЕНА СИГНАТУРА
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE запрос
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Метод для проверки работоспособности API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Проверяем что получили 200 и JSON
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
}

// Создаем экземпляр клиента
export const apiClient = new ApiClient();

// Интерфейсы для типизации
export interface InvitationRequest {
  email: string;
  role: string;
  officeId?: string;
}

export interface InvitationResponse {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  message: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

// Специализированные методы для работы с приглашениями
export class InvitationApi {
  constructor(private client: ApiClient) {}

  async create(invitation: InvitationRequest): Promise<InvitationResponse> {
    return this.client.post<InvitationResponse>('/invitations', invitation);
  }

  async getAll(): Promise<any[]> {
    return this.client.get<any[]>('/invitations');
  }

  async resend(id: string): Promise<any> {
    return this.client.post(`/invitations/${id}/resend`);
  }

  async delete(id: string): Promise<void> {
    return this.client.delete(`/invitations/${id}`);
  }

  async getByToken(token: string): Promise<any> {
    return this.client.get(`/invitations/${token}`);
  }

  async accept(token: string, userData: any): Promise<any> {
    return this.client.post(`/invitations/${token}/accept`, userData);
  }
}

// Экспортируем API для приглашений
export const invitationApi = new InvitationApi(apiClient);