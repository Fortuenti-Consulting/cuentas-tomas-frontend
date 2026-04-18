import axios from 'axios'

const API_BASE_URL = 'http://localhost:8001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface User {
  id: string
  display_name: string
  role: 'ricardo' | 'catherine'
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export const authService = {
  login: (password: string) =>
    api.post<LoginResponse>('/auth/login', { password }),

  getMe: () => api.get<User>('/me'),
}

export default api
