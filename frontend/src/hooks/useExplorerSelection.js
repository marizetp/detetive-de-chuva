import { useCallback, useContext, useState } from 'react';
import { ExplorerSelectionContext } from '../contexts/explorerSelectionContext.js';
import { getLocalIsoDate } from '../utils/dates.js';

/** Fallback local seguro quando componentes são montados isoladamente em testes. */
export function useExplorerSelection() {
  const ctx = useContext(ExplorerSelectionContext);
  const [localSelection, setLocalSelection] = useState(() => ({
    province: 'Huambo',
    municipality: '',
    crop: 'Milho',
    date: getLocalIsoDate(),
  }));

  const updateLocal = useCallback((patch) => {
    setLocalSelection((prev) => ({
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch),
    }));
  }, []);

  if (ctx) return ctx;
  return { selection: localSelection, updateSelection: updateLocal };
}
