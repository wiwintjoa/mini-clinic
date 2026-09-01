export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
};

export type AccessTokenPayload = { sub: string; sid: string; type: 'access' };
