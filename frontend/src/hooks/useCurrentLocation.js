import { useMemo, useSyncExternalStore } from 'react';
import { getLocationSnapshot, subscribeToLocation } from '../routing/navigation.js';

const SERVER_SNAPSHOT = '/';

/** Localização actual, actualizada em navegação interna e com os botões recuar/avançar. */
export function useCurrentLocation() {
  const href = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, () => SERVER_SNAPSHOT);
  return useMemo(() => {
    const url = new URL(href, 'http://localhost');
    return { href, pathname: url.pathname, hash: url.hash };
  }, [href]);
}
