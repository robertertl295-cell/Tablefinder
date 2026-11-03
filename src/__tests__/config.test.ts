import { readConfig } from '@/services/config';

describe('readConfig', () => {
  it('nutzt Mock-Daten ohne API-Key', () => {
    expect(readConfig({})).toEqual({ placesApiKey: null, dataSource: 'mock' });
  });

  it('behandelt einen leeren Key wie keinen Key', () => {
    expect(readConfig({ EXPO_PUBLIC_PLACES_API_KEY: '   ' }).dataSource).toBe('mock');
  });

  it('nutzt Google mit gesetztem Key', () => {
    expect(readConfig({ EXPO_PUBLIC_PLACES_API_KEY: 'abc' })).toEqual({
      placesApiKey: 'abc',
      dataSource: 'google',
    });
  });
});
