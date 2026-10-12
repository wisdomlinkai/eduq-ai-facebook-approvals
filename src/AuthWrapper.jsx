/**
 * AuthWrapper - Cognito Authentication with Admin Group Check
 * 
 * Wraps the Facebook Approvals app with:
 * 1. Cognito authentication (redirect to Hosted UI)
 * 2. Admin group verification (only Admins or SuperAdmins allowed)
 * 3. Sign out functionality
 */

import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchAuthSession, signInWithRedirect, signOut } from 'aws-amplify/auth';
import amplifyConfig from '../public/amplify_outputs.json';

// Configure Amplify
Amplify.configure(amplifyConfig);

const AuthWrapper = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      // Get Cognito groups from tokens
      const groups = session.tokens?.idToken?.payload['cognito:groups'] || [];
      
      // Check if user is in Admin or SuperAdmin group
      const hasAdminAccess = groups.includes('Admins') || groups.includes('SuperAdmins');
      
      setUser(currentUser);
      setIsAdmin(hasAdminAccess);
      setLoading(false);
      
      if (!hasAdminAccess) {
        setError('Access denied. Admin privileges required.');
      }
    } catch (err) {
      // Not authenticated - redirect to Cognito Hosted UI
      console.log('Not authenticated, redirecting to login...');
      signInWithRedirect({
        provider: 'COGNITO',
        customState: window.location.href
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setIsAdmin(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center',
          maxWidth: '400px',
          color: '#2D3748'
        }}>
          <h2 style={{ marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ marginBottom: '24px', color: '#718096' }}>
            {error}
          </p>
          <button
            onClick={handleSignOut}
            style={{
              background: '#F56565',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Authenticated with admin access - render children with sign out button
  return (
    <div style={{ position: 'relative' }}>
      {React.cloneElement(children, { 
        user,
        onSignOut: handleSignOut 
      })}
    </div>
  );
};

export default AuthWrapper;
