import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  roles?: string[];
}

export default function AuthGuard({ children, adminOnly = false, roles }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const { hasRole } = useRoleHelpers(user);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (adminOnly && !user.is_staff) {
      router.replace('/dashboard');
    } else if (roles && !hasRole(...roles)) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, adminOnly, roles, hasRole, router]);

  const denied =
    isLoading ||
    !user ||
    (adminOnly && !user.is_staff) ||
    (roles && !hasRole(...roles));

  if (denied) {
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
