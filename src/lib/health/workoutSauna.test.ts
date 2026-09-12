import { describe, it, expect } from 'vitest'
import { completedSaunaWindow, getSaunaStats } from './workoutSauna'

describe('completedSaunaWindow', () => {
  it('places a completed sauna before the logging time', () => {
    const window = completedSaunaWindow(25, new Date('2026-07-17T20:30:00.000Z'))

    expect(window).toEqual({
      workoutDate: '2026-07-17',
      startTimeManual: '22:05',
      endTimeManual: '22:30',
    })
  })

  it('keeps the start date when the session crosses midnight', () => {
    const window = completedSaunaWindow(25, new Date('2026-07-17T22:10:00.000Z'))

    expect(window).toEqual({
      workoutDate: '2026-07-17',
      startTimeManual: '23:45',
      endTimeManual: '00:10',
    })
  })
})

describe('getSaunaStats', () => {
  it('counts multiple Garmin Kardio sessions on the same date as 1 sauna with summed minutes', () => {
    const garminActivities = [
      {
        start_date: '2026-09-11T18:45:06+00:00',
        name: 'Kardio',
        sport_type: 'Workout',
        elapsed_time: 540, // 9 min
      },
      {
        start_date: '2026-09-11T18:59:49+00:00',
        name: 'Kardio',
        sport_type: 'Workout',
        elapsed_time: 1352, // 22.5 min -> 23 min
      },
    ]

    const stats = getSaunaStats([], '2026-09-05', garminActivities)

    expect(stats.sessionsCount).toBe(1)
    expect(stats.totalMinutes).toBe(32)
  })

  it('deduplicates manual sauna and Garmin Kardio on the same day as 1 sauna', () => {
    const manualSessions = [
      {
        date: '2026-09-11',
        workout_day: 'Sauna',
        exercise_logs: [{ exercise_name: 'Sauna', reps: 15 }],
      },
    ]
    const garminActivities = [
      {
        start_date: '2026-09-11T18:45:06+00:00',
        name: 'Kardio',
        sport_type: 'Workout',
        elapsed_time: 900, // 15 min
      },
    ]

    const stats = getSaunaStats(manualSessions, '2026-09-05', garminActivities)

    expect(stats.sessionsCount).toBe(1)
    expect(stats.totalMinutes).toBe(30)
  })
})
