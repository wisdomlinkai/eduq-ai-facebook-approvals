/**
 * App - Facebook Approvals
 * 
 * Standalone app for approving Facebook posts
 * Requires Admin or SuperAdmin Cognito group membership
 */

import React, { useEffect, useState } from 'react';
import { getCurrentUser, fetchAuthSession, signInWithRedirect, signOut } from 'aws-amplify/auth';
import FacebookApprovals from './FacebookApprovals.jsx';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      setIsLoading(true);
      
      // Get current user
      const currentUser = await getCurrentUser();
      
      // Get session to check groups
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      
      if (!idToken) {
        throw new Error('No ID token');
      }
      
      // Decode JWT to get groups
      const payload = JSON.parse(atob(idToken.toString().split('.')[1]));
      const rawGroups = payload['cognito:groups'];
      // Ensure groups is always an array (handle undefined, string, or array)
      const groups = Array.isArray(rawGroups) ? rawGroups : (rawGroups ? [rawGroups] : []);
      
      // Check admin access
      const isAdmin = groups.includes('Admins') || groups.includes('SuperAdmins');
      
      if (!isAdmin) {
        setError('Access denied. Admin privileges required.');
        setIsLoading(false);
        return;
      }
      
      setUser({
        email: currentUser.signInDetails?.loginId || currentUser.username,
        userId: currentUser.userId,
        groups,
        isSuperAdmin: groups.includes('SuperAdmins'),
      });
      
      setError(null);
    } catch (err) {
      console.log('[App] Not authenticated or error:', err.message);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin() {
    try {
      // Amplify v6 signInWithRedirect uses the oauth config from amplify_outputs.json
      // No provider parameter needed - it reads from the config
      await signInWithRedirect();
    } catch (err) {
      console.error('[App] Login error:', err);
      setError('Failed to initiate login');
    }
  }

  async function handleLogout() {
    try {
      // Clear local state first
      setUser(null);
      setError(null);
      // Then sign out from Cognito
      await signOut();
      // Reload the page to clear any cached state
      window.location.reload();
    } catch (err) {
      console.error('[App] Logout error:', err);
      // Force reload even if signOut fails
      window.location.reload();
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Error state (access denied)
  if (error) {
    return (
      <div className="app-error">
        <div className="app-error__icon">🚫</div>
        <h1>Access Denied</h1>
        <p>{error}</p>
        <p className="app-error__hint">
          You need Admin or SuperAdmin privileges to access this page.
        </p>
        <button onClick={handleLogout} className="btn btn--secondary">
          Sign Out
        </button>
      </div>
    );
  }

  // Not authenticated - trigger login
  if (!user) {
    // Auto-redirect to Cognito login
    handleLogin();
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Authenticated - show approvals page
  return <FacebookApprovals user={user} onLogout={handleLogout} />;
}
