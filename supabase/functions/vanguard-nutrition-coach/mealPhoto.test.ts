import { assertEquals, assertRejects, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { resolveMealPhoto } from './mealPhoto.ts';

Deno.test('resolveMealPhoto rejects malformed meal input', async () => {
  await assertRejects(() => resolveMealPhoto('', []), Error);
  await assertRejects(() => resolveMealPhoto('Owsianka', 'bad'), Error);
});

Deno.test('resolveMealPhoto returns an Openverse photograph URL for a dish', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    assertStringIncludes(url, 'api.openverse.org/v1/images');
    assertStringIncludes(url.toLowerCase(), 'oatmeal');
    return Response.json({
      results: [{
        title: 'Oatmeal bowl',
        thumbnail: 'https://example.com/oatmeal-thumb.jpg',
        url: 'https://example.com/oatmeal.jpg',
        foreign_landing_url: 'https://example.com/source',
        creator: 'Test Photographer',
        license: 'by',
      }],
    });
  };
  try {
    const result = await resolveMealPhoto('Oatmeal with banana', ['oats', 'banana']);
    assertEquals(result.success, true);
    assertEquals(result.photoUrl, 'https://example.com/oatmeal-thumb.jpg');
    assertStringIncludes(result.attribution ?? '', 'Test Photographer');
  } finally {
    globalThis.fetch = original;
  }
});
