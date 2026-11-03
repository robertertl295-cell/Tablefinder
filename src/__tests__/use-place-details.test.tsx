import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePlaceDetails } from '@/hooks/use-place-details';
import { PlacesError } from '@/services/places/errors';
import { MockPlacesProvider } from '@/services/places/mock-provider';

describe('usePlaceDetails', () => {
  it('lädt Details und kann nach einem Fehler erneut laden', async () => {
    const provider = new MockPlacesProvider({ latencyMs: 0 });
    const spy = jest
      .spyOn(provider, 'getDetails')
      .mockRejectedValueOnce(new PlacesError('network', 'offline'));

    const { result } = await renderHook(() => usePlaceDetails('mock-cafe-mitte', provider));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.status === 'error' && result.current.error.kind).toBe('network');

    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.status === 'success' && result.current.details.name).toBe(
      'Café Morgenlicht',
    );
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
