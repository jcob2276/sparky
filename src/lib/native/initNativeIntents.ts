/**
 * Android share target + deep links (shortcuts, https://localhost/...).
 */
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { isNativePlatform } from './platform';
import { ShareIntent } from './shareIntentPlugin';

const PATH_PREFIX = '__path__=';
const widgetRoutes = new Map([
  ['/keep', '/keep'],
  ['/todo', '/todo'],
  ['/workout', '/trening?live=1'],
  ['/camera', '/posilek?akcja=aparat'],
  ['/barcode', '/posilek?akcja=skaner'],
]);
let handledWidgetLaunch = false;


type NavigateFn = (path: string) => void;

let navigateHandler: NavigateFn | null = null;

export function registerNativeNavigate(handler: NavigateFn | null): void {
  navigateHandler = handler;
}

export function dispatchNativeNavigate(target: string): void {
  if (!target) return;
  let path = target;
  try {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      const parsed = new URL(target);
      path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    /* ignore */
  }

  if (navigateHandler) {
    navigateHandler(path);
  } else {
    try {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      /* ignore */
    }
  }
}

function navigateFromNativeTarget(target: string): void {
  dispatchNativeNavigate(target);
}

function navigateFromUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'sparky-widget:' && parsed.host === 'open') {
      const route = widgetRoutes.get(parsed.pathname);
      if (route) navigateFromNativeTarget(route);
      return;
    }
    if (parsed.host !== 'localhost') return;
    const path = `${parsed.pathname}${parsed.search}`;
    navigateFromNativeTarget(path.startsWith('/') ? path : `/${path}`);
  } catch {
    /* ignore malformed launch URLs */
  }
}

function parseNativePendingRoute(query: string | undefined): string | null {
  if (!query) return null;
  if (query.startsWith(PATH_PREFIX)) {
    return decodeURIComponent(query.slice(PATH_PREFIX.length));
  }
  const shared = query.includes('share_url') || query.includes('share_text') || query.includes('share_title');
  if (shared) {
    const params = new URLSearchParams(query);
    const blob = `${params.get('share_url') ?? ''} ${params.get('share_text') ?? ''}`;
    const hasUrl = /https?:\/\/[^\s]+/.test(blob);
    return hasUrl ? `/links?${query}` : `/keep?${query}`;
  }
  return null;
}

export async function initNativeIntents(): Promise<PluginListenerHandle | undefined> {
  if (!isNativePlatform()) return;

  try {
    const pending = await ShareIntent.consumePending();
    const route = parseNativePendingRoute(pending.query);
    if (route) navigateFromNativeTarget(route);
  } catch {
    /* plugin unavailable on non-Android builds */
  }

  const listener = await App.addListener('appUrlOpen', ({ url }) => {
    if (url.startsWith('sparky-widget:')) handledWidgetLaunch = true;
    navigateFromUrl(url);
  });

  if (!handledWidgetLaunch) {
    const launch = await App.getLaunchUrl().catch(() => undefined);
    if (!handledWidgetLaunch && launch?.url.startsWith('sparky-widget:')) {
      handledWidgetLaunch = true;
      navigateFromUrl(launch.url);
    }
  }

  return listener;
}

export async function consumeNativeShareOnResume(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const pending = await ShareIntent.consumePending();
    const route = parseNativePendingRoute(pending.query);
    if (route) navigateFromNativeTarget(route);
  } catch {
    /* noop */
  }
}
