import { Award, Smile } from 'lucide-react';
import DiscreteRating, { type RatingOption, type RatingTone } from '../ui/DiscreteRating';

const DAY_BANDS = [
  {
    min: 1,
    max: 3,
    label: 'Trudny',
    tone: 'critical',
    description: 'Plan wyraźnie się rozsypał albo dzień kosztował Cię więcej, niż dał.',
  },
  {
    min: 4,
    max: 6,
    label: 'Nierówny',
    tone: 'warning',
    description: 'Część rzeczy zadziałała, ale ważny fragment dnia nie został domknięty.',
  },
  {
    min: 7,
    max: 8,
    label: 'Dobry',
    tone: 'info',
    description: 'Najważniejsze rzeczy zostały zrobione, a bilans dnia jest na plus.',
  },
  {
    min: 9,
    max: 10,
    label: 'Wyjątkowy',
    tone: 'success',
    description: 'Plan został dowieziony, a jakość dnia wyraźnie przekroczyła zwykły dobry poziom.',
  },
] as const;

const DAY_OPTIONS: readonly RatingOption[] = Array.from({ length: 10 }, (_, index) => {
  const value = index + 1;
  const band = DAY_BANDS.find((candidate) => value >= candidate.min && value <= candidate.max);
  return { value, label: String(value), tone: band?.tone ?? 'neutral' };
});

const MOOD_OPTIONS: readonly RatingOption[] = [
  { value: 1, label: 'Ciężko', tone: 'critical' },
  { value: 2, label: 'Słabo', tone: 'warning' },
  { value: 3, label: 'Neutralnie', tone: 'neutral' },
  { value: 4, label: 'Dobrze', tone: 'info' },
  { value: 5, label: 'Świetnie', tone: 'success' },
];

interface DailyScorePickerProps {
  dayScore: number;
  setDayScore: (value: number) => void;
  moodScore: number;
  setMoodScore: (value: number) => void;
}

function rangeLabel(min: number, max: number) {
  return `${min}–${max}`;
}

export default function DailyScorePicker({
  dayScore,
  setDayScore,
  moodScore,
  setMoodScore,
}: DailyScorePickerProps) {
  const selectedBand = DAY_BANDS.find(
    (band) => dayScore >= band.min && dayScore <= band.max,
  ) ?? DAY_BANDS[1];

  return (
    <div className="ui-daily-score-picker">
      <div className="ui-daily-score-picker__section">
        <div className="ui-daily-score-picker__title">
          <Award size={16} aria-hidden="true" />
          Ocena realizacji
        </div>
        <DiscreteRating
          label="Wynik dnia"
          value={dayScore}
          max={10}
          options={DAY_OPTIONS}
          onChange={setDayScore}
        />
        <div aria-label="Znaczenie wyniku dnia" className="ui-rating-legend">
          {DAY_BANDS.map((band) => (
            <span key={band.min} data-tone={band.tone as RatingTone}>
              {rangeLabel(band.min, band.max)} {band.label}
            </span>
          ))}
        </div>
        <p className="ui-rating-explanation" data-tone={selectedBand.tone}>
          <strong>{rangeLabel(selectedBand.min, selectedBand.max)} · {selectedBand.label} dzień</strong>
          <span>{selectedBand.description}</span>
        </p>
      </div>

      <div className="ui-daily-score-picker__section">
        <div className="ui-daily-score-picker__title ui-daily-score-picker__title--mood">
          <Smile size={16} aria-hidden="true" />
          Samopoczucie
        </div>
        <DiscreteRating
          label="Samopoczucie"
          value={moodScore}
          max={5}
          options={MOOD_OPTIONS}
          onChange={setMoodScore}
        />
      </div>
    </div>
  );
}
