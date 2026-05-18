// Components
export { default as SignIn } from './SignIn';
export { default as CreateProfile } from './CreateProfile';
export { LogoutButton, ProtectedRoute } from './components';

// Hooks
export { useRegisterUser, useSignInUser, useLogout } from './hooks';

// API functions and types
export { registerUser, signInUser, logoutUser } from './api';
export type { RegisterRequest, RegisterResponse, ApiError, LogoutRequest, LogoutResponse } from './api';

// Validation utilities
export {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRegistrationForm,
  validateSignInForm,
  showValidationErrors
} from './utils/validation';
export type { ValidationResult } from './utils/validation';
