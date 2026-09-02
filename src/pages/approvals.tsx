import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Center, Loader } from '@mantine/core';

export default function ApprovalsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/churches');
  }, [router]);

  return (
    <Center h="70vh">
      <Loader />
    </Center>
  );
}
