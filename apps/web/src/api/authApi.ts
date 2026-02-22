import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatar?: string;
  profilePicture?: string;
  createdAt: string;
}

export interface SignupData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authApi = {
  // Sign up with email and password
  signup: async (data: SignupData): Promise<{ user: User }> => {
    const response = await api.post('/api/auth/signup', data);
    return response.data;
  },

  // Login with email and password
  login: async (data: LoginData): Promise<{ user: User }> => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
  },

  // Get current user
  me: async (): Promise<{ user: User }> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  // Google OAuth login URL
  getGoogleAuthUrl: (): string => {
    return `${API_URL}/api/auth/google`;
  },
};


export interface ProfileUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatar?: string;
  profilePicture?: string;
  profilePictureUrl?: string;
  googleId?: string;
  createdAt: string;
}

export const profileApi = {
  getProfile: async (): Promise<{ user: ProfileUser }> => {
    const response = await api.get('/api/profile');
    return response.data;
  },

  updateProfile: async (data: { name?: string; username?: string }): Promise<{ user: ProfileUser }> => {
    const response = await api.put('/api/profile', data);
    return response.data;
  },

  getProfilePictureUploadUrl: async (fileType: string): Promise<{ uploadUrl: string; fileKey: string }> => {
    const response = await api.get('/api/profile/picture/upload-url', { params: { fileType } });
    return response.data;
  },

  saveProfilePicture: async (fileKey: string): Promise<{ profilePicture: string; profilePictureUrl: string }> => {
    const response = await api.put('/api/profile/picture', { fileKey });
    return response.data;
  },

  deleteAccount: async (): Promise<{ message: string }> => {
    const response = await api.delete('/api/profile');
    return response.data;
  },
};
export default api;
