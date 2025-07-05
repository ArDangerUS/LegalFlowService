import { useState, useEffect } from 'react';
import { supabaseConfig, testSupabaseConnection } from '../lib/supabase';
import { networkService, NetworkService } from '../services/NetworkService';
import { offlineService } from '../services/OfflineService';

interface DatabaseState {
  isConnected: boolean;
  isConfigured: boolean;
  loading: boolean;
  error: string | null;
  connectionDetails?: any;
}

export function useDatabase() {
  const [dbState, setDbState] = useState<DatabaseState>({
    isConnected: false,
    isConfigured: supabaseConfig.isConfigured,
    loading: true,
    error: null
  });

  const testConnection = async () => {
    if (!supabaseConfig.isConfigured) {
      offlineService.setOfflineMode(true);
      setDbState({
        isConnected: false,
        isConfigured: false,
        loading: false,
        error: 'Database configuration missing. Please create a .env file with:\nVITE_SUPABASE_URL=your_supabase_project_url\nVITE_SUPABASE_ANON_KEY=your_supabase_anon_key'
      });
      return false;
    }

    // Check basic network connectivity first
    const hasNetwork = await networkService.testConnectivity();
    if (!hasNetwork) {
      console.warn('No network connectivity detected, running in offline mode');
      offlineService.setOfflineMode(true);
      setDbState({
        isConnected: false,
        isConfigured: true,
        loading: false,
        error: 'No network connection. Running in offline mode with cached data.'
      });
      return false;
    }

    setDbState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const connectionTest = await testSupabaseConnection();
      
      if (connectionTest.success) {
        offlineService.setOfflineMode(false);
        setDbState({
          isConnected: true,
          isConfigured: true,
          loading: false,
          error: null
        });
        return true;
      } else {
        console.warn('Database connection failed, continuing in offline mode');
        offlineService.setOfflineMode(true);
        
        setDbState({
          isConnected: false,
          isConfigured: true,
          loading: false,
          error: 'Unable to connect to database. The application will run in offline mode.',
          connectionDetails: connectionTest.details
        });
        return false;
      }
    } catch (error) {
      console.error('Database connection test failed:', error);
      offlineService.setOfflineMode(true);
      
      setDbState({
        isConnected: false,
        isConfigured: true,
        loading: false,
        error: 'Database connection failed. Running in offline mode.'
      });
      return false;
    }
  };

  useEffect(() => {
    testConnection();
    
    // Listen for network changes
    const unsubscribe = networkService.addListener((isOnline) => {
      if (isOnline) {
        // Network came back, try to reconnect
        console.log('📶 Network connectivity restored, attempting to reconnect...');
        testConnection();
      } else {
        // Network lost, go offline
        console.log('📵 Network connectivity lost, switching to offline mode');
        offlineService.setOfflineMode(true);
        setDbState(prev => ({
          ...prev,
          isConnected: false,
          error: 'Network connection lost. Running in offline mode with cached data.'
        }));
      }
    });

    return unsubscribe;
  }, []);

  return {
    ...dbState,
    testConnection,
    retry: testConnection
  };
}