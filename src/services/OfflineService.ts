/**
 * Service to manage offline functionality and data caching
 */
export class OfflineService {
  private static instance: OfflineService | null = null;
  private localStorage: Storage | null = null;
  private isOfflineMode: boolean = false;

  private constructor() {
    try {
      this.localStorage = window.localStorage;
    } catch (error) {
      console.warn('localStorage not available');
    }
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  public setOfflineMode(offline: boolean): void {
    this.isOfflineMode = offline;
  }

  public getOfflineMode(): boolean {
    return this.isOfflineMode;
  }

  public cacheData(key: string, data: any): void {
    if (!this.localStorage) return;

    try {
      const cached = {
        data,
        timestamp: Date.now(),
        version: '1.0'
      };
      this.localStorage.setItem(`offline_${key}`, JSON.stringify(cached));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  public getCachedData(key: string, maxAge: number = 24 * 60 * 60 * 1000): any {
    if (!this.localStorage) return null;

    try {
      const cached = this.localStorage.getItem(`offline_${key}`);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;

      if (age > maxAge) {
        this.localStorage.removeItem(`offline_${key}`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      return null;
    }
  }

  public clearCache(): void {
    if (!this.localStorage) return;

    const keys = Object.keys(this.localStorage);
    keys.forEach(key => {
      if (key.startsWith('offline_')) {
        this.localStorage!.removeItem(key);
      }
    });
  }

  public getOfflineData(type: 'conversations' | 'cases' | 'users'): any[] {
    return this.getCachedData(type) || [];
  }

  public setOfflineData(type: 'conversations' | 'cases' | 'users', data: any[]): void {
    this.cacheData(type, data);
  }
}

export const offlineService = OfflineService.getInstance();