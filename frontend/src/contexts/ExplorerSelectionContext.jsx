import { useCallback, useState } from 'react';
import { getLocalIsoDate } from '../utils/dates.js';
import { ExplorerSelectionContext } from './explorerSelectionContext.js';

/**
 * Partilha a província, município, cultura e data seleccionadas entre os separadores
 * Mapa (`/mapa`) e Ciclo (`/ciclo`) para que os dados e filtros coincidam sempre.
 */
export function ExplorerSelectionProvider({ children }) {
  const [selection, setSelection] = useState(() => ({
    province: 'Huambo',
    municipality: '',
    crop: 'Milho',
    date: getLocalIsoDate(),
  }));

  const updateSelection = useCallback((patch) => {
    setSelection((prev) => ({
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch),
    }));
  }, []);

  return (
    <ExplorerSelectionContext.Provider value={{ selection, updateSelection }}>
      {children}
    </ExplorerSelectionContext.Provider>
  );
}
