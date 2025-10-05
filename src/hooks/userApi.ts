
import { setupApiInterceptors } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';

export const useApiSetup = () => {
    const { getToken } = useAuth();

    useEffect(() => {
        setupApiInterceptors(getToken);
    }, [getToken]);
};