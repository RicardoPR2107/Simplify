import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput, UpdateProfileInput, UserProfile } from '@simplify/shared';
import { api, ApiError } from '../../lib/api';

export const ME_QUERY_KEY = ['me'] as const;

/** Usuario actual. `null` = no hay sesión; `undefined` = todavía se está comprobando. */
export function useCurrentUser() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async (): Promise<UserProfile | null> => {
      try {
        return (await api.get<{ user: UserProfile }>('/me')).user;
      } catch (error) {
        if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') return null;
        throw error;
      }
    },
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<{ user: UserProfile }>('/auth/login', input),
    onSuccess: ({ user }) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api.post<{ user: UserProfile }>('/auth/register', input),
    onSuccess: ({ user }) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    // Aunque falle la red, en este navegador la sesión se da por cerrada.
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(ME_QUERY_KEY, null);
    },
  });
}

/** RF-04 y RF-18: cambia nombre o moneda. La moneda nueva se aplica al instante en toda la app. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch<{ user: UserProfile }>('/me', input),
    onSuccess: ({ user }) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });
}
