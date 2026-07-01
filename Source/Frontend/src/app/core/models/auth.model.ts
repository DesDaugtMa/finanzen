export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  displayName: string;
  password: string;
  registrationToken: string;
}

export interface GoogleLoginRequest {
  idToken: string;
  registrationToken?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  displayName: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

export interface UserInfo {
  displayName: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface SessionInfo {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface RegistrationTokenInfo {
  token: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  isUsed: boolean;
}

export interface CreateRegistrationTokenRequest {
  description?: string;
  expiresInDays?: number;
}
