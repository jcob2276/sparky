export type SleepStage = 'awake' | 'rem' | 'light' | 'deep';
type SleepTimelineStatus = 'available' | 'unavailable' | 'invalid';

interface SleepTimelineSegment {
  stage: SleepStage;
  startBlock: number;
  blocks: number;
}

export interface SleepTimelineResult {
  status: SleepTimelineStatus;
  segments: SleepTimelineSegment[];
  axisLabels: string[];
  totalBlocks: number;
  measuredMinutes: number;
  intervalMinutes: number | null;
  durationMismatchMinutes: number | null;
}

interface BuildSleepTimelineInput {
  phases: string | null | undefined;
  bedtimeStart: string | null | undefined;
  bedtimeEnd: string | null | undefined;
}

const STAGES: Record<string, SleepStage> = {
  '1': 'deep',
  '2': 'light',
  '3': 'rem',
  '4': 'awake',
};

const WARSAW_TIME = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function emptyResult(status: Exclude<SleepTimelineStatus, 'available'>): SleepTimelineResult {
  return {
    status,
    segments: [],
    axisLabels: [],
    totalBlocks: 0,
    measuredMinutes: 0,
    intervalMinutes: null,
    durationMismatchMinutes: null,
  };
}

function buildAxisLabels(startMs: number, endMs: number): string[] {
  return Array.from({ length: 5 }, (_, index) => {
    const timestamp = startMs + ((endMs - startMs) * index / 4);
    return WARSAW_TIME.format(new Date(timestamp));
  });
}

export function buildSleepTimeline(input: BuildSleepTimelineInput): SleepTimelineResult {
  if (!input.phases) return emptyResult('unavailable');

  const stageSequence = [...input.phases].map((phase) => STAGES[phase]);
  if (stageSequence.some((stage) => !stage)) return emptyResult('invalid');

  const segments: SleepTimelineSegment[] = [];
  stageSequence.forEach((stage, index) => {
    const previous = segments.at(-1);
    if (previous?.stage === stage) {
      previous.blocks += 1;
      return;
    }
    segments.push({ stage, startBlock: index, blocks: 1 });
  });

  const startMs = input.bedtimeStart ? Date.parse(input.bedtimeStart) : Number.NaN;
  const endMs = input.bedtimeEnd ? Date.parse(input.bedtimeEnd) : Number.NaN;
  const hasValidInterval = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
  const measuredMinutes = stageSequence.length * 5;
  const intervalMinutes = hasValidInterval ? Math.round((endMs - startMs) / 60_000) : null;

  return {
    status: 'available',
    segments,
    axisLabels: hasValidInterval ? buildAxisLabels(startMs, endMs) : [],
    totalBlocks: stageSequence.length,
    measuredMinutes,
    intervalMinutes,
    durationMismatchMinutes: intervalMinutes === null
      ? null
      : Math.abs(intervalMinutes - measuredMinutes),
  };
}
