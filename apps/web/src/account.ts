// Azioni dell'account usate in più punti: tema ed uscita (profilo e barra laterale su desktop).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import { api } from './api';
import { clearLocalData } from './drafts';
import { getTheme, setTheme, subscribeTheme } from './theme';

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme);
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')] as const;
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      clearLocalData();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}
