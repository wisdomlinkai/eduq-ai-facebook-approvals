---
inclusion: always
---

# Amplify v6 OAuth Configuration

**Last Updated:** October 15, 2026
**Status:** CRITICAL - Prevents Login Errors
**Priority:** HIGH

---

## The Problem

Amplify v6 OAuth requires `redirectSignIn` and `redirectSignOut` to be **arrays**, not strings. If you pass a string, you get:

```
TypeError: e.find is not a function
    at Ea (index-xxx.js:69:20165)
    at Nw (index-xxx.js:69:23775)
    at Tw (index-xxx.js:69:22909)
```

---

## The Fix

**❌ WRONG - String override:**
```javascript
Amplify.configure({
  Auth: {
    Cognito: {
      loginWith: {
        oauth: {
          redirectSignIn: window.location.origin + '/',  // STRING - WRONG!
          redirectSignOut: window.location.origin + '/', // STRING - WRONG!
        }
      }
    }
  }
});
```

**✅ CORRECT - Array from config:**
```javascript
Amplify.configure({
  Auth: {
    Cognito: {
      loginWith: {
        oauth: {
          redirectSignIn: config.auth.oauth.redirect_sign_in_uri,  // ARRAY
          redirectSignOut: config.auth.oauth.redirect_sign_out_uri, // ARRAY
        }
      }
    }
  }
});
```

---

## Why Arrays?

Amplify's OAuth flow calls `.find()` on the redirect URIs array to match the current URL:

```javascript
function Ea(e, t) {
  // e is the redirectSignIn array
  // e.find() is called to match current URL
  const n = e?.find(r => r === t);
}
```

If `e` is a string, `.find()` doesn't exist and throws `TypeError: e.find is not a function`.

---

## identityProviders Issue

**❌ WRONG - Causes e.find error:**
```javascript
oauth: {
  identityProviders: config.auth.oauth.identity_providers,  // DON'T include this
  domain: config.auth.oauth.domain,
  scopes: config.auth.oauth.scopes,
}
```

**Why:** The `identityProviders` field causes Amplify to call `.find()` on the providers array in a different code path, triggering the same error.

---

## Complete Correct Configuration

```javascript
const oauthConfig = config.auth.oauth ? {
  domain: config.auth.oauth.domain,
  scopes: config.auth.oauth.scopes,
  redirectSignIn: config.auth.oauth.redirect_sign_in_uri,
  redirectSignOut: config.auth.oauth.redirect_sign_out_uri,
  responseType: config.auth.oauth.response_type,
} : undefined;

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.auth.user_pool_id,
      userPoolClientId: config.auth.user_pool_client_id,
      identityPoolId: config.auth.identity_pool_id,
      loginWith: {
        oauth: oauthConfig,
      },
    },
  },
});
```

---

## amplify_outputs.json Format

The config file should have arrays for redirect URIs:

```json
{
  "auth": {
    "oauth": {
      "redirect_sign_in_uri": [
        "http://localhost:3000/",
        "https://fb.eduq-ai.com/",
        "https://d1rdv449k3pucy.amplifyapp.com/"
      ],
      "redirect_sign_out_uri": [
        "http://localhost:3000/",
        "https://fb.eduq-ai.com/",
        "https://d1rdv449k3pucy.amplifyapp.com/"
      ]
    }
  }
}
```

---

## RCA: October 15, 2026

**Error:** `TypeError: e.find is not a function` on Facebook Approvals login

**Root Cause:**
1. `main.jsx` was overriding `redirectSignIn` with a string: `window.location.origin + '/'`
2. Amplify's OAuth matching code calls `.find()` on the redirect URIs, expecting an array
3. String doesn't have `.find()` method, causing the error

**Fix:** Use arrays from `amplify_outputs.json` instead of string override

---

## Related Documentation

- `CRITICAL-RULES.md` - PowerShell JSON handling
- Amplify v6 Documentation: https://docs.amplify.aws/react/build-a-backend/auth/set-up-auth/
