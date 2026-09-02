import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function AuthGuard({ children, adminOnly = false }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (adminOnly && !user.is_staff) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, adminOnly, router]);

  if (isLoading || !user || (adminOnly && !user.is_staff)) {
    return (
      <Center h="70vh">
        <Stack align="center" gap="sm">
          <Loader size="lg" />
          <Text c="dimmed" size="sm">
            Carregando...
          </Text>
        </Stack>
      </Center>
    );
  }

  return <>{children}</>;
}
