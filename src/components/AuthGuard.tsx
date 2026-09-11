import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useAuth, useRoleHelpers } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  roles?: string[];
  allow?: boolean;
}

export default function AuthGuard({ children, adminOnly = false, roles, allow }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const { hasRole } = useRoleHelpers(user);
  const router = useRouter();

  const deniedBy = () => {
    if (!user) return 'login';
    if (adminOnly && !user.is_staff) return 'dashboard';
    if (allow !== undefined && !allow) return 'dashboard';
    if (roles && !hasRole(...roles)) return 'dashboard';
    return null;
  };

  useEffect(() => {
    if (isLoading) return;
    const target = deniedBy();
    if (target) router.replace(target === 'login' ? '/login' : '/dashboard');
  }, [user, isLoading, adminOnly, roles, allow, hasRole, router]);

  const denied =
    isLoading ||
    (user && deniedBy() !== null) ||
    !user;

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
