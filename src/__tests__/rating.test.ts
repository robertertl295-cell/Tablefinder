import { LOW_DATA_THRESHOLD, RATING_CONFIDENCE_LABEL, ratingConfidence } from '@/utils/rating';

describe('ratingConfidence', () => {
  it.each([
    [0, 'none'],
    [1, 'low'],
    [LOW_DATA_THRESHOLD - 1, 'low'],
    [LOW_DATA_THRESHOLD, 'medium'],
    [199, 'medium'],
    [200, 'high'],
  ] as const)('%i Bewertungen → %s', (count, expected) => {
    expect(ratingConfidence(count)).toBe(expected);
  });

  it('markiert unter 30 Bewertungen als „Wenig Datenbasis“', () => {
    expect(RATING_CONFIDENCE_LABEL[ratingConfidence(29)]).toBe('Wenig Datenbasis');
  });
});
