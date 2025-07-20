import { User } from '../types';

const SESSION_KEY = 'music_supplies_mobile_session';
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

interface SessionData {
  user: User;
  timestamp: number;
}

class SessionManager {
  private expirationCallback: (() => void) | null = null;

  setSession(user: User): void {
    const sessionData: SessionData = {
      user,
      timestamp: Date.now()
    };
    
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  getSession(): User | null {
    try {
      const sessionString = sessionStorage.getItem(SESSION_KEY);
      if (!sessionString) return null;

      const sessionData: SessionData = JSON.parse(sessionString);
      
      // Check if session has expired
      if (Date.now() - sessionData.timestamp > SESSION_TIMEOUT) {
        this.clearSession();
        if (this.expirationCallback) {
          this.expirationCallback();
        }
        return null;
      }

      return sessionData.user;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      this.clearSession();
      return null;
    }
  }

  clearSession(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  onExpired(callback: () => void): void {
    this.expirationCallback = callback;
  }

  isSessionValid(): boolean {
    return this.getSession() !== null;
  }
}

export const sessionManager = new SessionManager();
