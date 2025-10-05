'use client';

import { apiClient } from '@/lib/api';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export function UserSync() {
    const { user, isLoaded } = useUser();
    const [synced, setSynced] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function syncUser() {
            if (!isLoaded) {
                console.log('⏳ Clerk not loaded yet...');
                return;
            }

            if (!user) {
                console.log('👤 No user logged in');
                setSynced(false);
                return;
            }

            if (synced) {
                console.log('✅ User already synced');
                return;
            }

            try {
                console.log('🔄 Syncing user with backend...', user.id);
                
                const response = await apiClient.post('/api/auth/sync', {
                    clerkUser: {
                        id: user.id,
                        emailAddresses: user.emailAddresses.map(e => ({
                            emailAddress: e.emailAddress
                        })),
                        username: user.username || user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        imageUrl: user.imageUrl
                    }
                });

                console.log('✅ User synced successfully:', response.data);
                setSynced(true);
                setError(null);
            } catch (err: any) {
                console.error('❌ Failed to sync user:', err);
                setError(err.response?.data?.error || 'Failed to sync user');
                
                // Retry after 3 seconds if failed
                setTimeout(() => {
                    console.log('🔄 Retrying user sync...');
                    setSynced(false);
                }, 3000);
            }
        }

        syncUser();
    }, [user, isLoaded, synced]);
    
    /*
    if (error) {
        return (
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                background: '#fee',
                padding: '10px',
                borderRadius: '5px',
                fontSize: '12px',
                zIndex: 9999
            }}>
                ❌ Sync Error: {error}
            </div>
        );
    }
    */

    return null;
}