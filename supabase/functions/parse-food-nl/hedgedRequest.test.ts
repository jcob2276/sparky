import { assertEquals, assertRejects } from 'jsr:@std/assert@1'
import { firstSuccess } from './hedgedRequest.ts'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

Deno.test('startuje kolejnego kandydata po hedgeMs i bierze pierwszy wynik', async () => {
  const started: string[] = []
  const result = await firstSuccess(['wolny', 'szybki'], async (name) => {
    started.push(name)
    await sleep(name === 'wolny' ? 300 : 10)
    return name
  }, { hedgeMs: 30, totalMs: 1000 })
  assertEquals(result, 'szybki')
  assertEquals(started, ['wolny', 'szybki'])
})

Deno.test('po awarii od razu przechodzi do następnego', async () => {
  const t0 = performance.now()
  const result = await firstSuccess(['zly', 'dobry'], async (name) => {
    if (name === 'zly') throw new Error('503')
    return name
  }, { hedgeMs: 5000, totalMs: 10000 })
  assertEquals(result, 'dobry')
  assertEquals(performance.now() - t0 < 500, true)
})

Deno.test('zwraca ostatni błąd, gdy wszyscy zawiodą', async () => {
  await assertRejects(
    () => firstSuccess(['a', 'b'], (name) => Promise.reject(new Error(`fail ${name}`)), { hedgeMs: 5, totalMs: 1000 }),
    Error,
    'fail b',
  )
})

Deno.test('twardy limit czasu przerywa wszystko', async () => {
  await assertRejects(
    () => firstSuccess(['a'], (_n, signal) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted')))), { hedgeMs: 5, totalMs: 40 }),
    Error,
  )
})
