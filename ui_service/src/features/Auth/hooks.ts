import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/tanstackstart-react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from './store/authStore';

import { getCurrentUser, initiateGoogleOAuth, logoutUser, registerUser, signInUser, updateUserProfile } from './api';
import type { GetCurrentUserResponse, RegisterRequest, UpdateUserProfileRequest, UpdateUserProfileResponse } from './api';

/**
 * Safe hook to get query client with error handling
 */
const useSafeQueryClient = () => {
  try {
    return useQueryClient();
  } catch (error) {
    console.error('QueryClient not available:', error);
    return null;
  }
};

/**
 * Hook for user registration
 */
export const useRegisterUser = () => {
  const queryClient = useSafeQueryClient();

  return useMutation({
    mutationFn: ({ data, showErrorNotification = true }: { data: RegisterRequest; showErrorNotification?: boolean }) =>
      registerUser(data, showErrorNotification),
    onSuccess: (data) => {
      // Invalidate and refetch user-related queries
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['user'] });

        // You can also set user data in cache if needed
        queryClient.setQueryData(['user'], data);
      }

      Sentry.startSpan({ name: 'User registration successful' }, () => {
        console.log('API Success: User registration completed', { userId: data.id, email: data.email });
      });
    },
    onError: (error: Error) => {
      Sentry.startSpan({ name: 'User registration failed' }, () => {
        console.log('API Error: User registration failed', { error: error.message, endpoint: 'register' });
      });
    },
  });
};

/**
 * Hook for user sign in
 * Backend sets httpOnly cookies, frontend only stores user in memory
 */
export const useSignInUser = () => {
  const queryClient = useSafeQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: ({ credentials, showErrorNotification = true }: { credentials: { email: string; password: string }; showErrorNotification?: boolean }) =>
      signInUser(credentials, showErrorNotification),
    onSuccess: (data) => {
      // Transform response to User format and store in Zustand (memory only)
      const userData = {
        id: (data.user?.id || data.id)?.toString(),
        email: data.user?.email || data.email,
        full_name: data.user?.full_name || data.full_name,
        profile_type: JSON.stringify(data.user?.profile || data.profile || {}),
      };

      // NO cookie management - backend already set httpOnly cookies
      setUser(userData);

      // Invalidate and refetch user-related queries
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.setQueryData(['user'], data);
      }

      Sentry.startSpan({ name: 'User sign in successful' }, () => {
        console.log('API Success: User sign in completed', { userId: userData.id, email: userData.email });
      });
    },
    onError: (error: Error) => {
      Sentry.startSpan({ name: 'User sign in failed' }, () => {
        console.log('API Error: User sign in failed', { error: error.message, endpoint: 'signin' });
      });
    },
  });
};

/**
 * Hook for initiating Google OAuth flow
 */
export const useGoogleOAuth = () => {
  return useMutation({
    mutationFn: async () => {
      initiateGoogleOAuth();
      return Promise.resolve();
    },
    onSuccess: () => {
      Sentry.startSpan({ name: 'Google OAuth initiated successfully' }, () => {
        console.log('API Success: Google OAuth flow initiated');
      });
    },
    onError: (error: Error) => {
      Sentry.startSpan({ name: 'Google OAuth initiation failed' }, () => {
        console.log('API Error: Google OAuth initiation failed', { error: error.message, endpoint: 'oauth' });
      });
    },
  });
};

/**
 * Hook for getting current user information
 * Used primarily for OAuth flow to fetch user data after redirect
 */
export const useGetCurrentUser = () => {
  const queryClient = useSafeQueryClient();
  const { setUser } = useAuthStore();

  return useMutation<GetCurrentUserResponse, Error, { showErrorNotification?: boolean }>({
    mutationFn: ({ showErrorNotification = true }) =>
      getCurrentUser(showErrorNotification),
    onSuccess: (data) => {
      const { id, email, full_name, profile } = data;
      console.log('API Success: Current user retrieved successfully', { userId: id, email });
      
      // Transform response to User format and store in Zustand (memory only)
      const userData = {
        id: id.toString(),
        email: email,
        full_name: full_name,
        profile_type: JSON.stringify(profile),
      };

      // NO cookie management - backend already set httpOnly cookies
      setUser(userData);

      // Invalidate and refetch user-related queries
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.setQueryData(['user'], data);
      }

      Sentry.startSpan({ name: 'Get current user successful' }, () => {
        console.log('API Success: Get current user completed', { userId: id, email });
      });
    },
    onError: (error: Error) => {
      Sentry.startSpan({ name: 'Get current user failed' }, () => {
        console.log('API Error: Get current user failed', { error: error.message, endpoint: '/auth/me' });
      });
    },
  });
};

/**
 * Hook for updating user profile
 */
export const useUpdateUserProfile = () => {
  const queryClient = useSafeQueryClient();

  return useMutation<UpdateUserProfileResponse, Error, { data: UpdateUserProfileRequest; showErrorNotification?: boolean }>({
    mutationFn: ({ data, showErrorNotification = true }) =>
      updateUserProfile(data, showErrorNotification),
    onSuccess: (data) => {
      // Invalidate and refetch user-related queries
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }

      Sentry.startSpan({ name: 'User profile updated successfully' }, () => {
        console.log('API Success: User profile updated successfully', { message: data.msg });
      });
    },
    onError: (error: Error) => {
      Sentry.startSpan({ name: 'User profile update failed' }, () => {
        console.log('API Error: User profile update failed', { error: error.message, endpoint: 'update-profile' });
      });
    },
  });
};

/**
 * Hook for user logout
 * Backend clears httpOnly cookies, frontend clears memory
 */
export const useLogout = () => {
  const queryClient = useSafeQueryClient();
  const { clearUser } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      // Call backend logout API (backend will clear httpOnly cookies)
      await logoutUser('', false); // Backend doesn't need refresh token in body
    },
    onSuccess: () => {
      // Clear user from Zustand store (memory)
      clearUser();

      // Clear all query cache
      if (queryClient) {
        queryClient.clear();
      }

      // Show success notification
      import('@/features/shared/components/ToastNotifications').then(({ ToastNotifications }) => {
        ToastNotifications.logoutSuccess();
      });

      // Redirect to signin
      navigate({ to: '/signin' });

      Sentry.startSpan({ name: 'User logout successful' }, () => {
        console.log('API Success: User logged out successfully');
      });
    },
    onError: (error: Error) => {
      // Even if API fails, clear local state and redirect
      clearUser();
      if (queryClient) {
        queryClient.clear();
      }
      navigate({ to: '/signin' });

      Sentry.startSpan({ name: 'User logout failed' }, () => {
        console.log('API Error: User logout failed', { error: error.message, endpoint: 'logout' });
      });
    },
  });
};
