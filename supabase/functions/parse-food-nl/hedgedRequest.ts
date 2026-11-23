export interface HedgeOptions {
  /** Po tylu ms bez wyniku startuje kolejny kandydat (poprzedni nadal trwa). */
  hedgeMs: number
  /** Twardy limit całej operacji. */
  totalMs: number
}

/**
 * Uruchamia kandydatów po kolei, ale nie czeka na awarię poprzedniego: kolejny startuje po `hedgeMs`
 * albo od razu, gdy poprzedni się nie powiódł. Pierwszy udany wynik wygrywa i przerywa resztę.
 */
export function firstSuccess<T>(
  candidates: readonly string[],
  run: (candidate: string, signal: AbortSignal) => Promise<T>,
  { hedgeMs, totalMs }: HedgeOptions,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController()
    let next = 0
    let running = 0
    let finished = false
    let lastError: unknown = null
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined
    const totalTimer = setTimeout(() => finish(() => reject(lastError ?? new Error('Przekroczono czas analizy'))), totalMs)

    function finish(settle: () => void) {
      if (finished) return
      finished = true
      clearTimeout(hedgeTimer)
      clearTimeout(totalTimer)
      controller.abort()
      settle()
    }

    function launch() {
      if (finished || next >= candidates.length) return
      const candidate = candidates[next++]
      running++
      clearTimeout(hedgeTimer)
      if (next < candidates.length) hedgeTimer = setTimeout(launch, hedgeMs)
      run(candidate, controller.signal).then(
        (value) => finish(() => resolve(value)),
        (error) => {
          lastError = error
          running--
          if (finished) return
          if (next < candidates.length) launch()
          else if (running === 0) finish(() => reject(error))
        },
      )
    }

    launch()
  })
}
