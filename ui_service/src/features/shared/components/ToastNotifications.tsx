import { toaster } from './Toaster'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  title: string
  description?: string
  type: ToastType
  duration?: number
  closable?: boolean
}

/**
 * Common toast notification component
 * Provides consistent toast notifications across the application
 */
export class ToastNotifications {
  /**
   * Show a success toast notification
   */
  static success(options: Omit<ToastOptions, 'type'>) {
    return toaster.create({
      ...options,
      type: 'success',
    })
  }

  /**
   * Show an error toast notification
   */
  static error(options: Omit<ToastOptions, 'type'>) {
    return toaster.create({
      ...options,
      type: 'error',
    })
  }

  /**
   * Show an info toast notification
   */
  static info(options: Omit<ToastOptions, 'type'>) {
    return toaster.create({
      ...options,
      type: 'info',
    })
  }

  /**
   * Show a warning toast notification
   */
  static warning(options: Omit<ToastOptions, 'type'>) {
    return toaster.create({
      ...options,
      type: 'warning',
    })
  }

  /**
   * Show a generic toast notification
   */
  static show(options: ToastOptions) {
    return toaster.create(options)
  }

  /**
   * Show account creation success notification
   */
  static accountCreated() {
    return this.success({
      title: 'Account Created',
      description: 'Your account has been created successfully!',
    })
  }

  /**
   * Show account creation error notification
   */
  static accountCreationFailed(errorMessage?: string) {
    return this.error({
      title: 'Registration Failed',
      description:
        errorMessage || 'Failed to create account. Please try again.',
    })
  }

  /**
   * Show profile update success notification
   */
  static profileUpdated() {
    return this.success({
      title: 'Profile Updated Successfully',
      description: 'Your profile has been updated successfully!',
    })
  }

  /**
   * Show Query bookmark success notification
   */
  static querySaved() {
    return this.success({
      title: 'Query Saved',
      description: 'Query has been saved successfully!',
    })
  }

  /**
   * Show Query bookmark success notification
   */
  static queryBookmarked() {
    return this.success({
      title: 'Query Bookmarked',
      description: 'Query has been bookmarked successfully!',
    })
  }

  /**
   * Show Query unbookmark success notification
   */
  static queryUnBookmarked() {
    return this.success({
      title: 'Query Removed from Bookmarks',
      description: 'Query has been removed from bookmarks successfully!',
    })
  }

  /**
   * Show sign in success notification
   */
  static signInSuccess() {
    return this.success({
      title: 'Sign In Successful',
      description: 'Welcome back!',
    })
  }

  /**
   * Show sign in error notification
   */
  static signInFailed(errorMessage?: string) {
    return this.error({
      title: 'Sign In Failed',
      description: errorMessage || 'Invalid credentials. Please try again.',
    })
  }

  /**
   * Show validation error notification
   */
  static validationError(field?: string) {
    return this.error({
      title: 'Validation Error',
      description: field
        ? `Please check the ${field} field.`
        : 'Please check your input and try again.',
    })
  }

  /**
   * Show network error notification
   */
  static networkError() {
    return this.error({
      title: 'Network Error',
      description:
        'Unable to connect to the server. Please check your internet connection.',
    })
  }

  /**
   * Show server error notification
   */
  static serverError() {
    return this.error({
      title: 'Server Error',
      description: 'Something went wrong on our end. Please try again later.',
    })
  }

  /**
   * Show logout success notification
   */
  static logoutSuccess() {
    return this.success({
      title: 'Logged Out Successfully',
      description: 'You have been logged out successfully. See you soon!',
    })
  }
}
