import * as Sentry from '@sentry/tanstackstart-react';
import api from '@/integrations/axiosInterceptor';
import { getAPIendpoint } from '@/constants';

// Types for account creation
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  city: string;
  profile: {
    profile_type: string;
    fields: {
      [key: string]: any;
    };
  };
}

export interface RegisterResponse {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  city: string;
  profile: {
    profile_type: string;
    fields: {
      [key: string]: any;
    };
  };
  created_at: string;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, Array<string>>;
}

// Logout types
export interface LogoutRequest {
  refresh_token: string;
}

export interface LogoutResponse {
  message: string;
}

// Types for /auth/me endpoint
export interface GetCurrentUserResponse {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  city: string;
  profile: {
    profile_type: string;
    fields: {
      [key: string]: any;
    };
  };
  is_active: boolean;
  // Tokens that may be included in OAuth flow response
  access_token?: string;
  refresh_token?: string;
}

// Types for user profile update
export interface UpdateUserProfileRequest {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  profile: {
    profile_type: string;
    fields: {
      [key: string]: any;
    };
  };
}

export interface UpdateUserProfileResponse {
  msg: string;
}

// Types for token refresh
export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}


/**
 * Register a new user account
 */
export const registerUser = async (data: RegisterRequest, showErrorNotification = true): Promise<RegisterResponse> => {
  return Sentry.startSpan({ name: 'Registering new user account' }, async () => {
    const response = await api.post<RegisterResponse>(
      getAPIendpoint('/auth/register'),
      data,
      { showErrorNotification } as any
    );
    return response.data;
  });
};

/**
 * Sign in user
 */
export const signInUser = async (credentials: { email: string; password: string }, showErrorNotification = true) => {
  return Sentry.startSpan({ name: 'User sign in' }, async () => {
    const response = await api.post('/auth/login', credentials, { showErrorNotification } as any);
    return response.data;
  });
};

/**
 * Initiate Google OAuth login flow
 * This redirects the user to Google's authorization page
 */
export const initiateGoogleOAuth = (): void => {
  Sentry.startSpan({ name: 'Initiating Google OAuth flow' }, () => {
    // For OAuth flow, we need to redirect to the backend endpoint
    // The backend will handle the redirect to Google
    // Pass the backend callback URL as redirect_uri parameter
    const backendCallbackUrl = getAPIendpoint('/auth/google/callback');
    const backendOAuthUrl = `${getAPIendpoint('/auth/google')}?redirect_uri=${encodeURIComponent(backendCallbackUrl)}`;
    window.location.href = backendOAuthUrl;
  });
};


/**
 * Get current user information
 * Backend validates httpOnly cookies automatically
 */
export const getCurrentUser = async (showErrorNotification = true): Promise<GetCurrentUserResponse> => {
  return Sentry.startSpan({ name: 'Get current user information' }, async () => {
    // NO cookie reading - browser automatically sends httpOnly cookies
    const response = await api.get<GetCurrentUserResponse>(
      getAPIendpoint('/auth/me'),
      { showErrorNotification } as any
    );
    return response.data;
  });
};

/**
 * Update user profile information
 */
export const updateUserProfile = async (data: UpdateUserProfileRequest, showErrorNotification = true): Promise<UpdateUserProfileResponse> => {
  return Sentry.startSpan({ name: 'Update user profile' }, async () => {
    const response = await api.patch<UpdateUserProfileResponse>(
      getAPIendpoint('/auth/update/user'),
      data,
      { showErrorNotification } as any
    );
    return response.data;
  });
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string, showErrorNotification = false): Promise<RefreshTokenResponse> => {
  return Sentry.startSpan({ name: 'Refresh access token' }, async () => {
    const response = await api.get<RefreshTokenResponse>(
      getAPIendpoint('/auth/refresh'),
      {
        showErrorNotification,
        headers: {
          Cookie: `refresh_token=${refreshToken}`
        }
      } as any
    );
    return response.data;
  });
};

/**
 * Check if email already exists in the system
 * Returns: { exists: boolean, error?: string }
 */
export const checkEmailExists = async (email: string, showErrorNotification = false): Promise<{ exists: boolean; error?: string }> => {
  return Sentry.startSpan({ name: 'Check email existence' }, async () => {
    try {
      await api.post(
        getAPIendpoint('/auth/email-exists'),
        { email },
        { showErrorNotification } as any
      );
      // If we get 200 OK, email does not exist (available)
      return { exists: false };
    } catch (error: any) {
      // If we get 409 Conflict, email exists
      if (error.response?.status === 409) {
        return { exists: true };
      }
      // If we get 422 Unprocessable Entity, invalid email format
      if (error.response?.status === 422) {
        return { exists: false, error: 'Invalid email format' };
      }
      // For other errors, throw them
      throw error;
    }
  });
};

/**
 * Logout user by invalidating tokens
 */
export const logoutUser = async (refreshToken: string, showErrorNotification = true): Promise<LogoutResponse> => {
  return Sentry.startSpan({ name: 'User logout' }, async () => {
    const response = await api.post<LogoutResponse>(
      getAPIendpoint('/auth/logout'),
      { refresh_token: refreshToken },
      { showErrorNotification } as any
    );
    return response.data;
  });
};
