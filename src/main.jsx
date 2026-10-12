/**
 * Main Entry Point - Facebook Approvals
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import App from './App.jsx';
import './index.css';

// Load Amplify configuration
async function initApp() {
  try {
    const response = await fetch('/amplify_outputs.json');
    const config = await response.json();
    
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: config.auth.user_pool_id,
          userPoolClientId: config.auth.user_pool_client_id,
          identityPoolId: config.auth.identity_pool_id,
          loginWith: {
            oauth: config.auth.oauth ? {
              identityProviders: config.auth.oauth.identity_providers,
              domain: config.auth.oauth.domain,
              scopes: config.auth.oauth.scopes,
              redirectSignIn: window.location.origin + '/',
              redirectSignOut: window.location.origin + '/',
              responseType: config.auth.oauth.response_type,
            } : undefined,
          },
        },
      },
    });
    
    console.log('[Facebook Approvals] Amplify configured');
  } catch (error) {
    console.error('[Facebook Approvals] Failed to load config:', error);
  }
  
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

initApp();
