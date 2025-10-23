/**
 * Secure session manager for Recharge Portal
 * Uses multiple layers of protection for storing session data
 */

class RechargeSessionManager {
  constructor() {
    this.sessionKey = 'rcp_session';
    this.expiryKey = 'rcp_session_expiry';
    // 24 hours by default
    this.defaultExpiryHours = 24;
    // Get nonce issued by the server from a secure cookie
    this.sessionNonce = this.getSessionNonce();
  }

  /**
   * Gets nonce issued by the server from a secure cookie
   */
  getSessionNonce() {
    // Example: get nonce from 'rcp_nonce' cookie
    const match = document.cookie.match(/(?:^|; )rcp_nonce=([^;]*)/);
    if (match) {
      return decodeURIComponent(match[1]);
    } else {
      // No server nonce found in rcp_nonce cookie
      return null;
    }
  }

  /**
   * Encrypts data with simple XOR (for basic obfuscation)
   * WARNING: XOR + base64 is NOT cryptographically secure. Use server-side sessions with HttpOnly cookies or Web Crypto API (AES-GCM) for real security.
   */
  encrypt(data) {
    const key = this.sessionNonce || '';
    const jsonStr = JSON.stringify(data);
    let encrypted = '';
    for (let i = 0; i < jsonStr.length; i++) {
      encrypted += String.fromCharCode(
        jsonStr.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(encrypted);
  }

  /**
   * Decrypts data
   */
  decrypt(encryptedData) {
    try {
      const key = this.sessionNonce || '';
      const encrypted = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return JSON.parse(decrypted);
    } catch (error) {
      // Decryption error
      return null;
    }
  }

  /**
   * Saves session
   */
  saveSession(sessionData, expiryHours = null) {
    try {
      const expiry = Date.now() + ((expiryHours || this.defaultExpiryHours) * 60 * 60 * 1000);
      // Encrypt session data
      const encryptedSession = this.encrypt(sessionData);
      // Save to sessionStorage (more secure than localStorage)
      sessionStorage.setItem(this.sessionKey, encryptedSession);
      sessionStorage.setItem(this.expiryKey, expiry.toString());
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Restores session
   */
  restoreSession() {
    try {
      const encryptedSession = sessionStorage.getItem(this.sessionKey);
      const expiryStr = sessionStorage.getItem(this.expiryKey);
      if (!encryptedSession || !expiryStr) {
        return null;
      }
      // Check expiration
      const expiry = parseInt(expiryStr);
      if (Date.now() >= expiry) {
        this.clearSession();
        return null;
      }
      // Decrypt session
      const sessionData = this.decrypt(encryptedSession);
      if (!sessionData) {
        this.clearSession();
        return null;
      }
      return sessionData;
    } catch (error) {
      this.clearSession();
      return null;
    }
  }

  /**
   * Clears saved session
   */
  clearSession() {
    sessionStorage.removeItem(this.sessionKey);
    sessionStorage.removeItem(this.expiryKey);
  }

  /**
   * Checks session validity
   */
  isSessionValid() {
    const expiryStr = sessionStorage.getItem(this.expiryKey);
    if (!expiryStr) {
      return false;
    }
    const expiry = parseInt(expiryStr);
    return Date.now() < expiry;
  }

  /**
   * Extends session
   */
  extendSession(additionalHours = null) {
    if (!this.isSessionValid()) {
      return false;
    }

    const newExpiry = Date.now() + ((additionalHours || this.defaultExpiryHours) * 60 * 60 * 1000);
    sessionStorage.setItem(this.expiryKey, newExpiry.toString());
    return true;
  }

  /**
   * Gets remaining session time in minutes
   */
  getSessionTimeLeft() {
    const expiryStr = sessionStorage.getItem(this.expiryKey);
    if (!expiryStr) return 0;

    const expiry = parseInt(expiryStr);
    const timeLeft = expiry - Date.now();
    return Math.max(0, Math.floor(timeLeft / (60 * 1000)));
  }
}

// Create global instance
window.rechargeSessionManager = new RechargeSessionManager();