# Google Cloud Migration Checklist
**From:** george.quraishi@gmail.com
**To:** george@bigheavy.fun
**Date:** February 6, 2026

## Pre-Migration Checklist

- [ ] Backup current `.env.local` file
- [ ] Document current Google Cloud project name/ID
- [ ] Note all active OAuth redirect URIs
- [ ] Verify current Gemini API usage/quotas

## Phase 1: Create New Google Cloud Project

### 1.1 Sign in to Google Cloud Console
- [ ] Navigate to https://console.cloud.google.com/
- [ ] Switch to **george@bigheavy.fun** account
- [ ] Verify you're in the correct organization (Big Heavy)

### 1.2 Create Project
- [ ] Click "Select a project" → "New Project"
- [ ] Project name: `Fictotum`
- [ ] Organization: `bigheavy.fun` (if available)
- [ ] Location: Select appropriate folder
- [ ] Click "Create"
- [ ] **Note the Project ID:** ________________

## Phase 2: Enable APIs

### 2.1 Enable Google+ API (OAuth)
- [ ] Navigate to "APIs & Services" → "Library"
- [ ] Search for "Google+ API"
- [ ] Click "Enable"
- [ ] Wait for confirmation

### 2.2 Enable Generative Language API (Gemini)
- [ ] In API Library, search "Generative Language API"
- [ ] Click "Enable"
- [ ] Accept terms of service if prompted
- [ ] Wait for confirmation

## Phase 3: Create OAuth 2.0 Credentials

### 3.1 Configure OAuth Consent Screen
- [ ] Go to "APIs & Services" → "OAuth consent screen"
- [ ] User Type: **Internal** (if bigheavy.fun is a Workspace org) or **External**
- [ ] App name: `Fictotum`
- [ ] User support email: `george@bigheavy.fun`
- [ ] App domain: `fictotum.vercel.app`
- [ ] Authorized domains: Add `vercel.app`
- [ ] Developer contact: `george@bigheavy.fun`
- [ ] Click "Save and Continue"
- [ ] Scopes: Add `email`, `profile`, `openid` (defaults)
- [ ] Click "Save and Continue"

### 3.2 Create OAuth Client ID
- [ ] Go to "APIs & Services" → "Credentials"
- [ ] Click "Create Credentials" → "OAuth client ID"
- [ ] Application type: **Web application**
- [ ] Name: `Fictotum Web Client`
- [ ] Authorized JavaScript origins:
  - [ ] `http://localhost:3000`
  - [ ] `https://fictotum.vercel.app`
- [ ] Authorized redirect URIs:
  - [ ] `http://localhost:3000/api/auth/callback/google`
  - [ ] `https://fictotum.vercel.app/api/auth/callback/google`
- [ ] Click "Create"
- [ ] **Copy Client ID:** ________________
- [ ] **Copy Client Secret:** ________________
- [ ] Download JSON (backup)

## Phase 4: Create Gemini API Key

### 4.1 Generate API Key
- [ ] In "APIs & Services" → "Credentials"
- [ ] Click "Create Credentials" → "API key"
- [ ] **Copy the key immediately:** ________________

### 4.2 Restrict API Key
- [ ] Click "Edit API key" (or find it in credentials list)
- [ ] API restrictions: **Restrict key**
- [ ] Select API: "Generative Language API"
- [ ] Application restrictions (optional):
  - [ ] HTTP referrers: `fictotum.vercel.app/*`
- [ ] Click "Save"

## Phase 5: Update Local Environment

### 5.1 Backup Current Config
```bash
cp web-app/.env.local web-app/.env.local.backup
```

### 5.2 Update `.env.local`
- [ ] Replace `GOOGLE_CLIENT_ID` with new value
- [ ] Replace `GOOGLE_CLIENT_SECRET` with new value
- [ ] Replace `GEMINI_API_KEY` with new value

### 5.3 Test Locally
```bash
cd web-app
npm run dev
```
- [ ] Test Google OAuth login at http://localhost:3000
- [ ] Test AI features (location validation, era suggestions)
- [ ] Verify no errors in console

## Phase 6: Update Vercel Environment

### 6.1 Add New Environment Variables
```bash
# From project root
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add GEMINI_API_KEY production
```

### 6.2 Update Preview/Development (Optional)
```bash
vercel env add GOOGLE_CLIENT_ID preview
vercel env add GOOGLE_CLIENT_SECRET preview
vercel env add GEMINI_API_KEY preview
```

### 6.3 Trigger Deployment
```bash
vercel --prod
```

## Phase 7: Verification

### 7.1 Test Production
- [ ] Navigate to https://fictotum.vercel.app
- [ ] Test Google OAuth login
- [ ] Verify user profile loads correctly
- [ ] Test AI features (if accessible without full auth)
- [ ] Check Vercel logs for errors

### 7.2 Monitor Usage
- [ ] Check Google Cloud Console → "APIs & Services" → "Dashboard"
- [ ] Verify requests are hitting the new project
- [ ] Monitor for any quota issues

## Phase 8: Cleanup (After 1 week of stable operation)

### 8.1 Old Project Cleanup
- [ ] Sign in to Google Cloud Console with **george.quraishi@gmail.com**
- [ ] Navigate to old "Chronos Graph" project
- [ ] Verify no recent API calls (check last 7 days)
- [ ] Disable APIs:
  - [ ] Google+ API
  - [ ] Generative Language API
- [ ] (Optional) Delete OAuth credentials
- [ ] (Optional) Delete API keys
- [ ] (Optional) Shut down entire project

### 8.2 Documentation
- [ ] Update this file with actual completion dates
- [ ] Note any issues encountered
- [ ] Document any API quota changes needed

## Rollback Plan (If Issues Arise)

### Emergency Rollback Steps
1. Revert `.env.local`:
   ```bash
   cp web-app/.env.local.backup web-app/.env.local
   ```

2. Revert Vercel environment variables:
   ```bash
   vercel env rm GOOGLE_CLIENT_ID production
   vercel env rm GOOGLE_CLIENT_SECRET production
   vercel env rm GEMINI_API_KEY production
   # Then re-add old values
   ```

3. Redeploy:
   ```bash
   vercel --prod
   ```

## Notes & Issues

### Issues Encountered
-

### API Quota Changes
-

### Completion Date
- Phase 1: ___________
- Phase 2: ___________
- Phase 3: ___________
- Phase 4: ___________
- Phase 5: ___________
- Phase 6: ___________
- Phase 7: ___________
- Phase 8: ___________
