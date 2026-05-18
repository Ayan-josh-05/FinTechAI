# Google OAuth Setup Guide

## Overview

This application now supports Google OAuth authentication using the backend OAuth flow. Users can sign in using their Google accounts through a secure server-side OAuth implementation.

## Environment Variables Required

Create a `.env` file in the root directory with the following variables:

```env
# Google OAuth Configuration
VITE_GOOGLE_AUTH_CLIENT_ID=your_google_client_id_here

# API Configuration
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Backend Configuration

The backend should be configured with the following endpoints:

1. **`/auth/google`** - Initiates Google OAuth flow
   - Accepts a `redirect_uri` query parameter from the frontend (should be the backend callback URL)
   - Redirects user to Google's authorization page with the correct callback URL
   - Should redirect back to the frontend signin URL after processing

2. **`/auth/google/callback`** - Handles OAuth callback (Backend handles this directly)
   - Processes the authorization code from Google
   - Exchanges the code for tokens
   - Redirects user to the frontend with authentication tokens

## How It Works

1. **User clicks "Continue with Google"** on the sign-in page
2. **Frontend redirects** to backend `/auth/google?redirect_uri=http://127.0.0.1:8000/auth/google/callback`
3. **Backend redirects** to Google's OAuth consent page with the correct callback URL
4. **User authorizes** the application on Google
5. **Google redirects** back to backend `/auth/google/callback` with authorization code
6. **Backend processes** the callback, exchanges code for tokens, and redirects to frontend signin
7. **User is authenticated** and redirected to dashboard

## Files Modified

- `src/features/Auth/api.ts` - Added Google OAuth initiation function
- `src/features/Auth/hooks.ts` - Added TanStack Query hook for OAuth initiation
- `src/features/Auth/SignIn.tsx` - Updated to use backend OAuth flow
- `src/routes/routes.tsx` - Removed OAuth callback route (handled by backend)

## Google OAuth Console Configuration

In your Google Cloud Console OAuth configuration, make sure to add the following authorized redirect URIs:

- `http://127.0.0.1:8000/auth/google/callback` (for development - backend handles callback)
- `http://localhost:8000/auth/google/callback` (alternative localhost format)
- Add your production backend callback URL when deploying

**Note**: The frontend passes the backend callback URL as the `redirect_uri` parameter. The backend will redirect users back to the frontend signin URL (`http://localhost:3000/signin`) after successful authentication.

## Testing

1. Set up your Google OAuth credentials in Google Cloud Console
2. Add the correct redirect URIs in Google OAuth Console
3. Configure the backend with your Google OAuth settings
4. Set the environment variables
5. Start the development server: `npm run dev`
6. Navigate to `/signin` and test the Google OAuth flow

## Security Notes

- The OAuth flow is handled server-side for better security
- JWT tokens are stored in HTTP-only cookies
- The callback URL must match exactly what's configured in Google Console
- All OAuth operations are instrumented with Sentry for monitoring
