import { Client, Account, Storage, Databases, type Models } from 'appwrite';
import { ref, computed } from 'vue';
import { createGlobalState } from '@vueuse/core';
import { 
  APPWRITE_ENDPOINT, 
  APPWRITE_PROJECT_ID, 
  SESSION_COOKIE_NAME 
} from 'astro:env/client';

// Helper function to validate session token (moved outside for reuse)
const isValidToken = (token: string | undefined): boolean => {
  return token !== undefined &&
         token !== null &&
         token !== 'undefined' &&
         token !== 'null' &&
         token !== '' &&
         token.trim() !== '';
};

// localStorage helpers for session persistence across page loads
const SESSION_STORAGE_KEY = 'appwrite_session';
const SESSION_EXPIRY_KEY = 'appwrite_session_expiry';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const persistSession = (token: string): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, token);
    localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_TTL_MS));
  } catch { /* storage full or unavailable */ }
};

const getPersistedSession = (): string | undefined => {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const token = localStorage.getItem(SESSION_STORAGE_KEY);
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (!token) return undefined;
    if (expiry && Date.now() > Number(expiry)) {
      clearPersistedSession();
      return undefined;
    }
    return token;
  } catch {
    return undefined;
  }
};

const clearPersistedSession = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  } catch { /* ignore */ }
};

const touchPersistedSession = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    const token = localStorage.getItem(SESSION_STORAGE_KEY);
    if (token) {
      localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_TTL_MS));
    }
  } catch { /* ignore */ }
};

export const useAppwrite = createGlobalState(() => {
  // Client instances - managed internally
  let client: Client | null = null;
  let account: Account | null = null;
  let databases: Databases | null = null;
  let storage: Storage | null = null;
  // We don't need Functions/Avatars here; keep client-only services used by the admin UI

  // Session state using Vue refs
  const sessionToken = ref<string | undefined>(undefined);

  // Initialize client
  const initializeClient = () => {
    if (!client) {
      client = new Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID);
      
      account = new Account(client);
      databases = new Databases(client);
      storage = new Storage(client);
      // no-op for functions/avatars – managed server-side if ever needed
    }
    
    return client;
  };

  // Initialize client immediately
  initializeClient();

  // Set session on client - simplified
  const setClientSession = (token: string | undefined) => {
    if (isValidToken(token)) {
      console.log('Setting session on client:', token!.slice(0, 10) + '...');
      client!.setSession(token!);
      sessionToken.value = token!;
    } else {
      console.log('Clearing session');
      sessionToken.value = undefined;
    }
  };

  // Auto-initialize session from localStorage or cookie (client-side only)
  const initializeSessionFromCookies = (session?: string) => {
    // Try localStorage first (for Safari/page refresh recovery)
    if (!session && typeof localStorage !== 'undefined') {
      const persistedToken = getPersistedSession();
      if (persistedToken && isValidToken(persistedToken)) {
        console.log('Recovering session from localStorage');
        session = persistedToken;
        // Touch the session to extend expiry
        touchPersistedSession();
      }
    }
    
    // Check cookies if still no session
    if (!session && typeof document !== 'undefined' && !sessionToken.value) {
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(cookie => 
        cookie.trim().startsWith(`${SESSION_COOKIE_NAME}=`)
      );
      
      if (sessionCookie) {
        const token = sessionCookie.split('=')[1];
        if (isValidToken(token)) {
          console.log('Initializing session from cookie');
          session = token;
        }
      }
    }
    
    // Now set the session if we found one
    if (isValidToken(session)) {
      console.log('Setting session:', session ? 'found' : 'none');
      setClientSession(session!);
      // Persist for future page loads
      persistSession(session!);
    } else if (session) {
      console.warn('Invalid session token:', session);
      setClientSession(undefined);
      clearPersistedSession();
    }
  };

  // Computed properties - simplified to primarily use client.config.session
  const currentSession = computed(() => client!.config.session || sessionToken.value);
  
  // Check if user is authenticated - simplified
  const isAuthenticated = computed(() => {
    return isValidToken(client!.config.session);
  });
  
  // Check if client is ready - much simpler
  const isReady = computed(() => {
    return client !== null && client!.config.session !== undefined;
  });
  
  // Wait for client to be ready with proper timeout
  const waitForReady = (timeoutMs: number = 2000): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already ready
      if (isReady.value) {
        resolve();
        return;
      }
      
      const startTime = Date.now();
      const checkInterval = 50; // Check every 50ms
      
      const checkReady = () => {
        // Check if ready
        if (isReady.value || isValidToken(client!.config.session)) {
          resolve();
          return;
        }
        
        // Check if timeout
        if (Date.now() - startTime > timeoutMs) {
          console.warn(`Appwrite client not ready after ${timeoutMs}ms timeout`);
          reject(new Error('Timeout waiting for Appwrite client'));
          return;
        }
        
        // Continue checking
        setTimeout(checkReady, checkInterval);
      };
      
      // Start checking
      checkReady();
    });
  };
  
  // Set session
  const setSession = (token: string | undefined) => {
    setClientSession(token);
  };
  
  // Get current session
  const getSession = () => {
    return client!.config.session || sessionToken.value;
  };
  
  // Clear session
  const clearSession = () => {
    setClientSession(undefined);
  };
  
  // Get current user (optional convenience for client UI)
  const getCurrentUser = async (): Promise<Models.User<Models.Preferences> | null> => {
    try {
      if (!account || !isAuthenticated.value) return null;
      return await account.get();
    } catch {
      return null;
    }
  };
  
  // Client-side clear only; server-side auth/logout happens via API route
  const deleteSession = async () => {
    clearSession();
    clearPersistedSession();
  };
  
  // Password recovery flows and other auth are handled server-side; no client logic here
  const sendPasswordRecovery = async () => undefined as any;
  
  // Reinitialize client after Astro navigation
  const reinitClient = () => {
    console.log('Reinitializing Appwrite client after navigation');

    // Check for persisted session
    const persistedToken = getPersistedSession();
    if (persistedToken && isValidToken(persistedToken)) {
      console.log('Restoring session from localStorage after navigation');
      setClientSession(persistedToken);
      touchPersistedSession(); // Extend expiry
    } else {
      // Try cookies as fallback
      initializeSessionFromCookies();
    }
  };
  
  return {
    // Client instances
    client: client!,
    account: account!,
    databases: databases!,
    storage: storage!,
    // intentionally no functions/avatars here

    // Session management
    currentSession,
    isAuthenticated,
    isReady,
    setSession,
    getSession,
    clearSession,
    waitForReady,
    
    // Auth methods
    getCurrentUser,
    deleteSession,
    sendPasswordRecovery,
    
    // Initialization functions
    initializeSessionFromCookies,
    reinitClient,
  };
});

// Export the initialization function for standalone use
export const initializeSessionFromCookies = (session?: string) => {
  const { initializeSessionFromCookies: init } = useAppwrite();
  return init(session);
};
