import { useEffect } from 'react';
import type { Location } from 'react-router-dom';
import { TAB_ORDER, type DashboardNavigate } from './dashboardViews';

/** URL param redirects, meal deep link and PWA share-target routing. */
export function useDashboardUrlRedirects(location: Location, navigate: DashboardNavigate) {
  // URL param redirects
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view');
    if (viewParam === 'kariera') {
      navigate('/projekty', { replace: true });
    } else if (viewParam && TAB_ORDER.includes(viewParam)) {
      navigate('/' + viewParam, { replace: true });
    } else if (params.get('todo') === 'new') {
      navigate('/todo?new=1', { replace: true });
    } else if (params.get('share_url') || params.get('share_text') || params.get('share_title')) {
      const shared = `${params.get('share_url') || ''} ${params.get('share_text') || ''}`;
      const hasUrl = /https?:\/\/[^\s]+/.test(shared);
      navigate({ pathname: hasUrl ? '/links' : '/keep', search: location.search }, { replace: true });
    }
  }, [location.search, navigate]);

  // Meal deep link
  useEffect(() => {
    if (new URLSearchParams(location.search).get('meal') === 'new') {
      navigate('/', { replace: true });
      window.setTimeout(() => navigate('/dzis', { replace: true }), 0);
    }
  }, [location.search, navigate]);

  // PWA Share Target lands on `/`; route link payloads to the canonical Pocket
  // consumer instead of silently leaving the parameters on Dzisiaj.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sharedUrl = params.get('share_url') || '';
    const sharedText = params.get('share_text') || '';
    const hasUrl = /https?:\/\/[^\s]+/.test(`${sharedUrl} ${sharedText}`);
    const target = hasUrl ? '/links' : sharedText.trim() ? '/keep' : null;
    if (target && location.pathname !== target) {
      navigate(`${target}?${params.toString()}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);
}
