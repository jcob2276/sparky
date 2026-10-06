import { useEffect, useState } from 'react';
import { fetchInsidersPageData, type InsidersPageData } from '../../lib/investments/insidersService';
export function useInsidersData() {
  const [data, setData] = useState<InsidersPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetchInsidersPageData().then(result => { if (active) setData(result); })
      .catch(() => { if (active) setError('Nie udało się pobrać danych SEC Form 4. Spróbuj ponownie później.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { data, loading, error };
}
