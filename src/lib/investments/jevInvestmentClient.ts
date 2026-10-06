/** Historical chat metadata only. Uncalibrated AI scores are no longer generated. */
export interface JevSignalEvaluation {
  signalScore: number;
  confidence: number;
  rallyProbability: number;
  riskLevel: 'niski' | 'umiarkowany' | 'wysoki';
  urgency: 'natychmiastowe' | 'obserwacja' | 'brak';
}
