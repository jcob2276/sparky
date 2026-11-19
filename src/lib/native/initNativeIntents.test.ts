import { afterEach, expect, it, vi } from 'vitest';
import { initNativeIntents, registerNativeNavigate } from './initNativeIntents';

const { app } = vi.hoisted(() => ({
  app: { addListener: vi.fn(), getLaunchUrl: vi.fn<() => Promise<{ url: string } | undefined>>(async () => undefined) },
}));

vi.mock('@capacitor/app', () => ({ App: app }));
vi.mock('./platform', () => ({ isNativePlatform: () => true }));
vi.mock('./shareIntentPlugin', () => ({ ShareIntent: { consumePending: async () => ({}) } }));

afterEach(() => {
  registerNativeNavigate(null);
  vi.resetAllMocks();
});

it('routes a cold launch from the meal camera widget', async () => {
  const navigate = vi.fn();
  registerNativeNavigate(navigate);
  app.getLaunchUrl.mockResolvedValue({ url: 'sparky-widget://open/camera' });

  await initNativeIntents();

  expect(navigate).toHaveBeenCalledExactlyOnceWith('/posilek?akcja=aparat');
});

it('routes only known widget actions while the app is running', async () => {
  const navigate = vi.fn();
  registerNativeNavigate(navigate);
  await initNativeIntents();
  const onOpen = app.addListener.mock.calls[0][1];

  onOpen({ url: 'sparky-widget://open/keep' });
  onOpen({ url: 'sparky-widget://open/unknown' });

  expect(navigate).toHaveBeenCalledExactlyOnceWith('/keep');
});
