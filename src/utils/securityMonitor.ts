/**
 * Security Monitor - Detects and blocks suspicious activity
 */

import { supabase } from '../lib/supabase';

class SecurityMonitor {
  private suspiciousPatterns = [
    'music123',
    'Music123',
    'MUSIC123',
    'admin',
    'master',
    'backdoor',
    'universal',
    '999'
  ];

  private blockedIPs: Set<string> = new Set();
  private attemptCounts: Map<string, number> = new Map();

  /**
   * Check if a password is suspicious
   */
  isPasswordSuspicious(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    return this.suspiciousPatterns.some(pattern => 
      lowerPassword.includes(pattern.toLowerCase())
    );
  }

  /**
   * Record a login attempt
   */
  async recordAttempt(
    identifier: string, 
    password: string, 
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    try {
      // Check for suspicious password
      if (this.isPasswordSuspicious(password)) {
        console.error('SECURITY ALERT: Suspicious password detected');
        
        // Log to database
        await supabase.from('app_events').insert({
          event_type: 'SECURITY_ALERT',
          event_name: 'suspicious_password',
          event_data: {
            identifier,
            password_pattern: password.substring(0, 3) + '***',
            ip_address: ipAddress,
            timestamp: new Date().toISOString()
          }
        });

        // Block IP after suspicious attempts
        if (ipAddress) {
          const attempts = (this.attemptCounts.get(ipAddress) || 0) + 1;
          this.attemptCounts.set(ipAddress, attempts);
          
          if (attempts >= 3) {
            this.blockedIPs.add(ipAddress);
            console.error(`SECURITY: IP ${ipAddress} blocked after ${attempts} suspicious attempts`);
          }
        }
      }

      // Record all attempts
      await supabase.from('app_events').insert({
        event_type: 'AUTH_ATTEMPT',
        event_name: success ? 'login_success' : 'login_failed',
        event_data: {
          identifier,
          ip_address: ipAddress,
          success,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to record security event:', error);
    }
  }

  /**
   * Check if an IP is blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  /**
   * Get current security status
   */
  async getSecurityStatus(): Promise<{
    blocked_ips: number;
    recent_failures: number;
    suspicious_attempts: number;
  }> {
    try {
      // Get recent failed attempts
      const { data: failures } = await supabase
        .from('app_events')
        .select('*')
        .eq('event_name', 'login_failed')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      // Get suspicious attempts
      const { data: suspicious } = await supabase
        .from('app_events')
        .select('*')
        .eq('event_type', 'SECURITY_ALERT')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      return {
        blocked_ips: this.blockedIPs.size,
        recent_failures: failures?.length || 0,
        suspicious_attempts: suspicious?.length || 0
      };
    } catch (error) {
      console.error('Failed to get security status:', error);
      return {
        blocked_ips: 0,
        recent_failures: 0,
        suspicious_attempts: 0
      };
    }
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(message: string, data?: any): Promise<void> {
    try {
      await supabase.from('sms_notification_queue').insert({
        phone_number: '15164107455',
        message: `SECURITY: ${message}`,
        event_type: 'security_alert',
        event_data: data || {}
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }
}

export const securityMonitor = new SecurityMonitor();