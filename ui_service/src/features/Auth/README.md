# Auth Feature

This feature handles user authentication including account creation and sign in functionality using TanStack Query for state management.

## API Endpoints

### Account Creation

- **Endpoint**: `POST /auth/register`
- **Backend URL**: `http://127.0.0.1:8000`
- **Full URL**: `http://127.0.0.1:8000/auth/register`

#### Request Body

```typescript
{
  "email": "user@example.com",
  "password": "string",
  "full_name": "string",
  "phone": "string",
  "city": "string",
  "profile_type": "string"
}
```

#### Response

```typescript
{
  "id": "string",
  "email": "string",
  "full_name": "string",
  "phone": "string",
  "city": "string",
  "profile_type": "string",
  "created_at": "string",
  "message": "string"
}
```

## Implementation Details

### 1. getAPIendpoint Function

Located in `src/constants.ts`, this function returns the full API endpoint with the backend URL prefixed:

```typescript
export const getAPIendpoint = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return `${API_BASE_URL}/${cleanEndpoint}`
}
```

### 2. API Service Functions

Located in `src/features/Auth/api.ts`, these functions handle the actual API calls:

- `registerUser(data: RegisterRequest): Promise<RegisterResponse>`
- `signInUser(credentials): Promise<any>`

### 3. TanStack Query Hooks

Located in `src/features/Auth/hooks.ts`, these hooks provide React Query functionality:

- `useRegisterUser()` - Mutation hook for user registration
- `useSignInUser()` - Mutation hook for user sign in

### 4. Components

- `SignIn.tsx` - Sign in form with TanStack Query integration
- `CreateProfile.tsx` - Account creation wizard with TanStack Query integration

## Usage Examples

### Using the getAPIendpoint function

```typescript
import { getAPIendpoint } from '@/constants'

const registerUrl = getAPIendpoint('/auth/register')
// Returns: http://127.0.0.1:8000/auth/register
```

### Using the registration hook

```typescript
import { useRegisterUser } from '@/features/Auth/hooks'

function MyComponent() {
  const registerMutation = useRegisterUser()

  const handleRegister = () => {
    registerMutation.mutate(
      {
        email: 'user@example.com',
        password: 'password123',
        full_name: 'John Doe',
        phone: '+1234567890',
        city: 'New York',
        profile_type: 'Lawyer',
      },
      {
        onSuccess: (data) => {
          console.log('Registration successful:', data)
        },
        onError: (error) => {
          console.error('Registration failed:', error.message)
        },
      },
    )
  }
}
```

## Environment Variables

Set the following environment variables in your `.env` file:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_AUTH_CLIENT_ID=your_google_oauth_client_id_here
```

## Sentry Integration

All API calls are instrumented with Sentry for error tracking and performance monitoring:

```typescript
Sentry.startSpan({ name: 'Registering new user account' }, async () => {
  // API call implementation
})
```

## Error Handling

The implementation includes comprehensive error handling:

1. **API Errors**: Proper error messages from the backend
2. **Network Errors**: Fallback error messages for network issues
3. **Validation Errors**: Form validation with user-friendly messages
4. **Toast Notifications**: Success and error notifications using Chakra UI toast

## Testing

Run tests for the getAPIendpoint function:

```bash
npm test src/constants.test.ts
```
