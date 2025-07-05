/**
 * Service to handle network connectivity detection and offline mode
 */
export class NetworkService {
  private static instance: NetworkService | null = null;
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  private constructor() {
    this.setupNetworkListeners();
  }

  static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.notifyListeners();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  public getConnectionStatus(): boolean {
    return this.isOnline;
  }

  public addListener(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Test if we can actually reach a server (not just if browser thinks we're online)
   */
  public async testConnectivity(url?: string): Promise<boolean> {
    if (!this.isOnline) {
      return false;
    }

    try {
      const testUrl = url || 'https://httpbin.org/status/200';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wrapper for fetch that handles network errors gracefully
   */
  public async safeFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
    if (!this.isOnline) {
      throw new Error('No internet connection');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          this.isOnline = false;
          this.notifyListeners();
          throw new Error('Network connectivity lost');
        }
      }
      throw error;
    }
  }
}

export const networkService = NetworkService.getInstance();