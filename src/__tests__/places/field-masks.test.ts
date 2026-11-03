import { detailsFieldMask, searchFieldMask } from '@/services/places/field-masks';

describe('searchFieldMask', () => {
  it('fragt Merkmale nur bei Bedarf ab', () => {
    const basic = searchFieldMask({ includeAttributes: false, withPageToken: false });
    const full = searchFieldMask({ includeAttributes: true, withPageToken: false });
    expect(basic).not.toContain('servesVegetarianFood');
    expect(full).toContain('places.servesVegetarianFood');
  });

  it('setzt das Präfix places. und optional nextPageToken', () => {
    const mask = searchFieldMask({ includeAttributes: false, withPageToken: true }).split(',');
    expect(mask).toContain('places.id');
    expect(mask).toContain('nextPageToken');
    expect(mask.filter((f) => f !== 'nextPageToken').every((f) => f.startsWith('places.'))).toBe(
      true,
    );
  });

  it('fordert keine teuren Detailfelder an', () => {
    const mask = searchFieldMask({ includeAttributes: true, withPageToken: true });
    expect(mask).not.toContain('reviews');
    expect(mask).not.toContain('websiteUri');
  });
});

describe('detailsFieldMask', () => {
  it('enthält Detailfelder ohne Präfix und ohne Dopplung', () => {
    const fields = detailsFieldMask().split(',');
    expect(fields).toEqual(expect.arrayContaining(['id', 'reviews', 'currentOpeningHours']));
    expect(fields).not.toContain('currentOpeningHours.openNow');
    expect(new Set(fields).size).toBe(fields.length);
  });
});
