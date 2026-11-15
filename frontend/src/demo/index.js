// Entrada do modo de demonstração. Só é carregada por main.jsx quando VITE_DEMO_MODE=true;
// num build de produção normal, este módulo, as gravações e a faixa não existem no bundle.

import { setTransport } from '../services/api.js';
import DemoModeBanner from './DemoModeBanner.jsx';
import { DEMO_RECORDINGS } from './recordings.js';
import { createReplayTransport } from './replayTransport.js';

/**
 * Liga o modo de demonstração: todos os pedidos passam a ser respondidos só com gravações reais
 * elegíveis (nunca pela rede). Devolve a faixa a mostrar em todas as páginas.
 */
export function activateDemoMode() {
  setTransport(createReplayTransport(DEMO_RECORDINGS));
  return { Banner: DemoModeBanner };
}
