import { api } from './client'

export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post<{ access_token: string }>('/auth/register', { username, email, password }).then((r) => r.data),
  login: (email: string, password: string) =>
    api.post<{ access_token: string }>('/auth/login', { email, password }).then((r) => r.data),
}
