export interface User {
  username: string;
  email: string;
  role: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  expiresIn: number | null;
  login: (token: string, user: User, expiresIn: number) => void;
  logout: () => void;
}

