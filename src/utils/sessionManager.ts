/**
 * Secure Session Management Utility
 * Handles session storage, validation, and cleanup
 */

export interface SessionData {
  user: any;
  timestamp: number;
  expiresAt: number;
}

const SESSION_KEY = 'app_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export class SessionManager {
  private static instance: SessionManager;
  private idleTimer: NodeJS.Timeout | null = null;
  private onSessionExpired?: () => void;

  private constructor() {
    this.setupIdleDetection();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Store user session securely
   */
  setSession(user: any): void {
    const now = Date.now();
    const sessionData: SessionData = {
      user: this.sanitizeUserData(user),
      timestamp: now,
      expiresAt: now + SESSION_DURATION
    };

    try {
      // Use sessionStorage instead of localStorage for better security
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      this.resetIdleTimer();
    } catch (error) {
      console.error('Failed to store session:', error);
      throw new Error('Session storage failed');
    }
  }

  /**
   * Get current session if valid
   */
  getSession(): any | null {
    try {
      const sessionStr = sessionStorage.getItem(SESSION_KEY);
      if (!sessionStr) return null;

      const sessionData: SessionData = JSON.parse(sessionStr);
      
      // Check if session has expired
      if (Date.now() > sessionData.expiresAt) {
        this.clearSession();
        return null;
      }

      // Update last activity timestamp
      sessionData.timestamp = Date.now();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      
      return sessionData.user;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      // Clear cart from both storages on logout
      sessionStorage.removeItem('cart');
      localStorage.removeItem('cart');
      sessionStorage.removeItem('searchInteracted');
      this.clearIdleTimer();
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Set callback for session expiration
   */
  onExpired(callback: () => void): void {
    this.onSessionExpired = callback;
  }

  /**
   * Sanitize user data before storage
   */
  private sanitizeUserData(user: any): any {
    // Remove sensitive data and keep only necessary fields
    const {
      accountNumber,
      acctName,
      address,
      city,
      state,
      zip,
      id,
      email,
      mobile_phone,
      requires_password_change,
      is_special_admin
    } = user;

    return {
      accountNumber,
      acctName,
      address,
      city,
      state,
      zip,
      id,
      email,
      mobile_phone,
      requires_password_change: Boolean(requires_password_change),
      is_special_admin: Boolean(is_special_admin)
    };
  }

  /**
   * Setup idle detection
   */
  private setupIdleDetection(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetTimer = () => {
      this.resetIdleTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });
  }

  /**
   * Reset idle timer
   */
  private resetIdleTimer(): void {
    this.clearIdleTimer();
    
    this.idleTimer = setTimeout(() => {
      console.log('Session expired due to inactivity');
      this.clearSession();
      if (this.onSessionExpired) {
        this.onSessionExpired();
      }
    }, IDLE_TIMEOUT);
  }

  /**
   * Clear idle timer
   */
  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Extend session if user is active
   */
  extendSession(): void {
    const session = this.getSession();
    if (session) {
      this.setSession(session);
    }
  }
}

export const sessionManager = SessionManager.getInstance();
