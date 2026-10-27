// Azioni dell'account usate in più punti: uscita (profilo e barra laterale su desktop).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from './api';
import { clearLocalData } from './drafts';

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
