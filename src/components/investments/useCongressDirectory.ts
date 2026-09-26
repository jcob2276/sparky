import { useEffect, useState } from 'react';
import type { InsiderTradeItem } from '../../lib/investments/investmentsApi';
import {
  fetchCongressFeed,
  fetchPoliticianTrades,
  fetchPublicPoliticians,
  type PublicPolitician,
} from '../../lib/investments/publicDisclosures';

export function useCongressDirectory() {
  const [politicians, setPoliticians] = useState<PublicPolitician[]>([]);
  const [trades, setTrades] = useState<InsiderTradeItem[]>([]);
  const [tradeTotal, setTradeTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [ready, setReady] = useState(false);
  const [personId, setPersonId] = useState<string | null>(null);
  const [personTrades, setPersonTrades] = useState<InsiderTradeItem[]>([]);
  const [loadedPersonId, setLoadedPersonId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchPublicPoliticians(), fetchCongressFeed()])
      .then(([people, feed]) => {
        if (!active) return;
        setPoliticians(people);
        setTrades(feed.trades);
        setTradeTotal(feed.total);
        setTruncated(feed.truncated);
        setReady(true);
      })
      .catch((err: unknown) => {
        console.warn('[useCongressDirectory]', err);
        if (!active) return;
        setPoliticians([]);
        setTrades([]);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!personId) return;
    let active = true;
    fetchPoliticianTrades(personId)
      .then((rows) => {
        if (!active) return;
        setPersonTrades(rows);
        setLoadedPersonId(personId);
      })
      .catch((err: unknown) => {
        console.warn('[useCongressDirectory] person', err);
        if (!active) return;
        setPersonTrades([]);
        setLoadedPersonId(personId);
      });
    return () => {
      active = false;
    };
  }, [personId]);

  const personLoading = personId !== null && loadedPersonId !== personId;
  const activeTrades = personId === null ? trades : loadedPersonId === personId ? personTrades : [];

  return {
    politicians,
    trades: activeTrades,
    tradeTotal,
    truncated: personId ? false : truncated,
    loading: !ready,
    personLoading,
    personId,
    setPersonId,
  };
}
