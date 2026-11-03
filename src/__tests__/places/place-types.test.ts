import { categoryOf, isGastronomyPlace, isGastronomyType } from '@/services/places/place-types';

describe('isGastronomyType', () => {
  it.each(['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'fast_food_restaurant'])(
    'erkennt %s',
    (type) => expect(isGastronomyType(type)).toBe(true),
  );

  it.each(['ramen_restaurant', 'wine_bar', 'cat_cafe'])('erkennt Unterart %s', (type) =>
    expect(isGastronomyType(type)).toBe(true),
  );

  it.each(['hotel', 'supermarket', 'gas_station', 'museum', 'food', 'store'])(
    'lehnt %s ab',
    (type) => expect(isGastronomyType(type)).toBe(false),
  );
});

describe('isGastronomyPlace', () => {
  it('entscheidet nach dem Haupttyp', () => {
    expect(isGastronomyPlace('hotel', ['hotel', 'restaurant'])).toBe(false);
    expect(isGastronomyPlace('cafe', ['cafe', 'store'])).toBe(true);
  });

  it('nutzt die Typliste, wenn der Haupttyp fehlt', () => {
    expect(isGastronomyPlace(null, ['food', 'restaurant'])).toBe(true);
    expect(isGastronomyPlace(null, ['store'])).toBe(false);
  });
});

describe('categoryOf', () => {
  it('ordnet Unterarten Kategorien zu', () => {
    expect(categoryOf('ramen_restaurant', [])).toEqual(['restaurant']);
    expect(categoryOf('wine_bar', ['bar'])).toEqual(['bar']);
    expect(categoryOf('coffee_shop', [])).toEqual(['cafe']);
  });

  it('erlaubt mehrere Kategorien', () => {
    expect(categoryOf('meal_takeaway', ['turkish_restaurant']).sort()).toEqual(
      ['restaurant', 'takeaway'].sort(),
    );
  });
});
