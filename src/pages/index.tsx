import { useEffect, useState } from 'react';
import DefaultLanding from '../components/landing/DefaultLanding';
import InstitutionalLanding from '../components/landing/InstitutionalLanding';
import { isIdbcenDeployment } from '../utils/landingConfig';

export default function HomePage() {
  const [isIdbcen, setIsIdbcen] = useState(() => isIdbcenDeployment());

  useEffect(() => {
    setIsIdbcen(isIdbcenDeployment());
  }, []);

  return isIdbcen ? <InstitutionalLanding /> : <DefaultLanding />;
}
