import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExplorerSelectionProvider } from '../contexts/ExplorerSelectionContext.jsx';
import { fireEvent, render, screen, waitFor } from '../test/render.jsx';
import CycleExplorerPage from './CycleExplorerPage.jsx';

const MOCK_MAP_OVERVIEW = {
  cultura: 'Milho',
  data_consulta: '2026-11-15',
  content_language: 'pt',
  provincias: {
    Huambo: {
      provincia: 'Huambo',
      status: 'AGUARDAR',
      score_confianca: 75,
      metricas: { chuva_acumulada_recente_mm: 32.8, humidade_solo_raiz: 0.39, previsao_7dias_mm: 48.6 },
    },
    Bié: {
      provincia: 'Bié',
      status: 'AGUARDAR',
      score_confianca: 74,
      metricas: { chuva_acumulada_recente_mm: 21.5, humidade_solo_raiz: 0.27, previsao_7dias_mm: 47.2 },
    },
    Huíla: {
      provincia: 'Huíla',
      status: 'DESFAVORAVEL',
      score_confianca: 87,
      metricas: { chuva_acumulada_recente_mm: 26.5, humidade_solo_raiz: 0.21, previsao_7dias_mm: 37.5 },
    },
  },
  municipios: {
    Huambo: {
      provincia: 'Huambo',
      municipio: 'Huambo',
      status: 'AGUARDAR',
      score_confianca: 75,
      metricas: { chuva_acumulada_recente_mm: 32.8, humidade_solo_raiz: 0.39, previsao_7dias_mm: 48.6 },
    },
    Caála: {
      provincia: 'Huambo',
      municipio: 'Caála',
      status: 'FAVORAVEL',
      score_confianca: 88,
      metricas: { chuva_acumulada_recente_mm: 35.0, humidade_solo_raiz: 0.44, previsao_7dias_mm: 54.6 },
    },
  },
};

const MOCK_OPTIMAL = {
  zona: 'huambo',
  provincia: 'Huambo',
  municipio: 'Caála',
  cultura: 'Milho',
  epoca_agricola: '2026/2027',
  content_language: 'pt',
  janela_recomendada: {
    inicio: '2026-10-17',
    fim: '2026-12-05',
    descricao_periodo: '17/10/2026 a 05/12/2026',
  },
  risco_falsa_partida: {
    probabilidade_pct: 8.3,
    ic90_pct: [2.3, 25.8],
  },
  exigencia_cultura: {
    chuva_abertura_3d_mm: 20,
    chuva_mensal_min_mm: 110,
    humidade_raiz_min: 0.35,
    profundidade_cm: 5,
    notas_agronomicas: 'Cultura base no Planalto Central.',
  },
  ciclo_anual_52s: Array.from({ length: 52 }, (_, idx) => ({
    semana_iso: idx + 1,
    probabilidade_cultura_pct: idx >= 41 || idx <= 3 ? 82.5 : idx >= 18 && idx <= 34 ? 12.0 : 50.0,
    nivel: idx >= 41 || idx <= 3 ? 'alta' : idx >= 18 && idx <= 34 ? 'baixa' : 'media',
    fase_ciclo: idx >= 41 || idx <= 3 ? 'PLANTIO_OTIMO' : 'TRANSICAO_CAUTELA',
    dentro_janela_otima: idx >= 41 && idx <= 48,
    humidade_raiz_mediana: 0.48,
    chuva_semanal_media_mm: 50.7,
  })),
  ciclo_mensal_12m: Array.from({ length: 12 }, (_, idx) => ({
    mes: idx + 1,
    probabilidade_cultura_pct: idx >= 9 || idx === 0 ? 80.0 : 20.0,
    nivel: idx >= 9 || idx === 0 ? 'alta' : 'baixa',
    chuva_media_mensal_mm: 219.5,
    humidade_solo_raiz_p50: 0.48,
    temperatura_media_c: 20.5,
  })),
  aviso: 'Indicativo baseado em análise histórica de 25 épocas.',
};

function stubExplorerFetch() {
  const fetchSpy = vi.fn(async (url) => {
    const target = String(url);
    if (target.includes('/api/v1/crops')) {
      return { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'milho', nome: 'Milho', icone: '🌽' }, { id: 'feijao', nome: 'Feijão', icone: '🫘' }]) };
    }
    if (target.includes('/api/v1/map-overview')) {
      return { ok: true, status: 200, text: async () => JSON.stringify(MOCK_MAP_OVERVIEW) };
    }
    if (target.includes('/api/v1/optimal-planting')) {
      return { ok: true, status: 200, text: async () => JSON.stringify(MOCK_OPTIMAL) };
    }
    if (target.includes('/api/v1/baseline/')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ nome: 'Huambo', curva_sementeira_semanal: {}, linha_base_mensal: {} }) };
    }
    return { ok: true, status: 200, text: async () => '{}' };
  });
  vi.stubGlobal('fetch', fetchSpy);
  return fetchSpy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CycleExplorerPage — Menus separados Mapa / Ciclo e sincronização', () => {
  it('renderiza o modo Mapa com separadores superiores (Mapa | Ciclo | Consulta tradicional) e zoom municipal', async () => {
    const fetchSpy = stubExplorerFetch();

    render(
      <ExplorerSelectionProvider>
        <CycleExplorerPage mode="map" />
      </ExplorerSelectionProvider>,
      { language: 'pt' },
    );

    expect(screen.getByRole('link', { name: 'Mapa interactivo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Ciclo de sementeira' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Consulta tradicional' })).toHaveAttribute('href', '/consulta');

    await waitFor(() => {
      expect(screen.getByText('Huambo · 75%')).toBeInTheDocument();
    });

    // Zoom into Huambo municipalities (11 ADM2 polygons)
    fireEvent.click(screen.getByRole('button', { name: /Huambo \(11\)/i }));
    expect(screen.getByText(/Huambo — 11 municípios/i)).toBeInTheDocument();

    // Select Caála municipality
    fireEvent.click(screen.getByRole('button', { name: 'Caála' }));
    expect(screen.getByText(/Caála, Huambo · Milho/)).toBeInTheDocument();

    // Switch crop triggers fresh map overview request
    fireEvent.click(screen.getByRole('button', { name: /Feijão/i }));
    await waitFor(() => {
      const calls = fetchSpy.mock.calls.map(([u]) => String(u));
      expect(calls.some((u) => u.includes('cultura=Feij'))).toBe(true);
    });
  });

  it('renderiza o modo Ciclo sincronizado com o estado do mapa e com humidade/estado consistentes', async () => {
    const fetchSpy = stubExplorerFetch();

    render(
      <ExplorerSelectionProvider>
        <CycleExplorerPage mode="cycle" />
      </ExplorerSelectionProvider>,
      { language: 'pt' },
    );

    expect(screen.getByRole('link', { name: 'Ciclo de sementeira' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Consulta tradicional' })).toHaveAttribute('href', '/consulta');

    await waitFor(() => {
      expect(screen.getByText('17/10/2026 a 05/12/2026')).toBeInTheDocument();
    });

    // Synchronized map status + live root moisture (39% for Huambo from map-overview)
    expect(screen.getAllByText(/Aguardar · 75\/100/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('39%').length).toBeGreaterThanOrEqual(1);

    // Selecting Caála in Cycle mode syncs requests and displays Caála, Huambo
    fireEvent.change(screen.getByLabelText(/Município/i), { target: { value: 'Caála' } });
    await waitFor(() => {
      expect(screen.getByText(/Ciclo de Milho em Caála, Huambo/i)).toBeInTheDocument();
      const calls = fetchSpy.mock.calls.map(([u]) => String(u));
      expect(calls.some((u) => u.includes('municipio=Ca'))).toBe(true);
    });
  });
});
