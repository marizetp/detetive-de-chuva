import { RESULT_SOURCES } from '../../config/api.js';
import { MISSING_STATUS, UNKNOWN_STATUS } from '../../config/status.js';
import { CONSULTATION_ANCHORS, ROUTES } from '../../routing/routes.js';
import { describeConsultation } from '../../utils/report.js';
import AppLink from '../ui/AppLink.jsx';
import Button from '../ui/Button.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import { DropletIcon, ForecastIcon, RainIcon, RetryIcon, SproutIcon, StatusIcon } from '../ui/icons.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import LoadingIndicator from '../ui/LoadingIndicator.jsx';
import MarkdownContent from './MarkdownContent.jsx';
import { statusToneStyles } from './statusTone.js';

const HEADING = 'mt-3 text-3xl leading-tight font-semibold text-ink sm:text-4xl';

function getMetricValue(metrics, key) {
  const found = metrics?.find((m) => m.key === key);
  return found?.value ?? null;
}

/**
 * Área de Resultados — Desenvolvida para agricultores, cooperativas e técnicos de extensão.
 * Apresenta o veredito em destaque, 3 indicadores claros e a recomendação prática do agrônomo.
 */
export default function ResultsArea({
  submittedParams,
  advisory,
  evaluate,
  onRetry,
  today,
  headingRef,
  isStale = false,
}) {
  if (!submittedParams) {
    return (
      <section aria-labelledby="resultados-titulo">
        <Eyebrow className="font-display" data-reveal>
          Resultado da Avaliação
        </Eyebrow>
        <h2
          id="resultados-titulo"
          ref={headingRef}
          tabIndex={-1}
          className={HEADING}
          data-reveal
          data-reveal-delay="1"
        >
          Ainda sem consulta
        </h2>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-muted" data-reveal data-reveal-delay="2">
          Preencha a província, a cultura e a data pretendida, e clique em «Consultar Viabilidade».
          O parecer agronómico e os indicadores de apoio à decisão serão apresentados aqui.
        </p>
      </section>
    );
  }

  // Se a recomendação está a carregar
  if (advisory.status === 'loading') {
    return (
      <section aria-labelledby="resultados-titulo">
        <Eyebrow className="font-display" data-reveal>
          Resultado da Avaliação
        </Eyebrow>
        <h2
          id="resultados-titulo"
          ref={headingRef}
          tabIndex={-1}
          className={HEADING}
          data-reveal
          data-reveal-delay="1"
        >
          A avaliar viabilidade…
        </h2>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-10 text-center" data-reveal="fade" data-reveal-delay="2">
          <LoadingIndicator label="A consultar dados climatológicos de 25 anos da NASA e a gerar parecer agronómico…" />
        </div>
      </section>
    );
  }

  // Se a recomendação falhou com erro
  if (advisory.status === 'error') {
    return (
      <section aria-labelledby="resultados-titulo">
        <Eyebrow className="font-display" data-reveal>
          Resultado da Avaliação
        </Eyebrow>
        <h2
          id="resultados-titulo"
          ref={headingRef}
          tabIndex={-1}
          className={HEADING}
          data-reveal
          data-reveal-delay="1"
        >
          Erro na consulta
        </h2>
        {/* Falha técnica: aviso de erro (filete e triângulo vermelhos, texto ink), distinto do
            cartão de veredito usado para um resultado desfavorável. */}
        <InlineNotice
          tone="error"
          role="alert"
          title="Não foi possível obter a recomendação."
          className="mt-8"
          action={
            <Button variant="outline" size="sm" onClick={() => onRetry(RESULT_SOURCES.advisory)}>
              <RetryIcon className="size-4" />
              <span>Tentar novamente</span>
            </Button>
          }
        >
          O servidor demorou a responder ou ocorreu uma falha de ligação.
        </InlineNotice>
      </section>
    );
  }

  const result = advisory.result;
  // `null` quando o serviço não enviou estado (mapStatus → MISSING_STATUS); nunca se assume um.
  const statusRaw = result?.status?.code ?? null;
  const confidenceScore = result?.confidenceScore ?? 85;
  const metrics = result?.metrics ?? [];

  const rainRecent = getMetricValue(metrics, 'chuva_acumulada_recente_mm');
  const rootMoisture = getMetricValue(metrics, 'humidade_solo_raiz');
  const forecastRain = getMetricValue(metrics, 'previsao_7dias_mm');

  // Configuração visual do Veredito Hero. As cores vêm de statusTone.js (por `tone`, como em
  // config/status.js). Estado ausente e estado não reconhecido nunca herdam o aspecto de outro
  // estado: recebem a apresentação neutra (contorno tracejado, ícone neutro, texto ink-muted),
  // sem classificação inventada (CLAUDE.md §5–6).
  //  - ausente: o serviço não enviou estado → MISSING_STATUS («Estado indisponível»);
  //  - não reconhecido: enviou um valor fora dos três documentados → UNKNOWN_STATUS, com o valor.
  let statusTheme =
    statusRaw === null
      ? {
          tone: 'neutral',
          title: MISSING_STATUS.label.toUpperCase(),
          description: 'O serviço não enviou o estado desta avaliação. Nenhuma classificação é assumida.',
        }
      : {
          tone: 'neutral',
          title: UNKNOWN_STATUS.label.toUpperCase(),
          description: `O serviço devolveu um estado que a plataforma não reconhece («${statusRaw}»). É apresentado sem interpretação.`,
        };

  if (statusRaw === 'FAVORAVEL') {
    statusTheme = {
      tone: 'positive',
      title: 'FAVORÁVEL PARA SEMEADURA',
      description: 'As condições climáticas e as reservas de humidade do solo são adequadas para o desenvolvimento da cultura neste período.',
    };
  } else if (statusRaw === 'AGUARDAR') {
    statusTheme = {
      tone: 'caution',
      title: 'AGUARDAR MELHORES CONDIÇÕES',
      description: 'Transição ou humidade ainda incipiente na raiz. Recomenda-se cautela antes de semear para proteger sementes e capital.',
    };
  } else if (statusRaw === 'DESFAVORAVEL') {
    statusTheme = {
      tone: 'warning',
      title: 'NÃO RECOMENDADO / DESFAVORÁVEL',
      description: 'Risco elevado de perda do investimento e insumos. Período de estiagem ou condições hídricas insuficientes.',
    };
  }
  const statusColors = statusToneStyles(statusTheme.tone);

  return (
    <section aria-labelledby="resultados-titulo" className="space-y-8">
      <div>
        <Eyebrow className="font-display" data-reveal>
          Resultado da Avaliação
        </Eyebrow>
        <h2
          id="resultados-titulo"
          ref={headingRef}
          tabIndex={-1}
          className={HEADING}
          data-reveal
          data-reveal-delay="1"
        >
          Relatório da consulta
        </h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2" data-reveal data-reveal-delay="2">
          <p className="text-base font-medium text-ink-muted">
            {describeConsultation(submittedParams)}
          </p>
          <AppLink
            to={`${ROUTES.consultation}#${CONSULTATION_ANCHORS.form}`}
            className="inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:text-interactive hover:decoration-interactive"
          >
            Alterar dados da consulta
          </AppLink>
        </div>

        {isStale ? (
          <InlineNotice tone="info" title="Dados alterados no formulário" className="mt-5">
            Os dados do formulário foram alterados. Seleccione «Actualizar Viabilidade» para obter a avaliação com os novos dados.
          </InlineNotice>
        ) : null}
      </div>

      {/* 1. VEREDITO EM DESTAQUE (HERO CARD) */}
      <div
        className={`rounded-2xl border-2 bg-surface ${statusColors.rule} p-6 sm:p-8`}
        data-reveal
        data-reveal-delay="3"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <span className={`inline-flex items-center gap-2 font-display text-sm sm:text-base font-bold uppercase tracking-wide ${statusColors.text}`}>
              <StatusIcon tone={statusTheme.tone} className={`size-5 shrink-0 sm:size-6 ${statusColors.icon}`} />
              <span>{statusTheme.title}</span>
            </span>
            <p className="text-base sm:text-lg leading-relaxed text-ink">
              {statusTheme.description}
            </p>
          </div>

          {/* Nível de Confiança */}
          <div className="shrink-0 rounded-xl bg-canvas border border-line p-4 text-center md:min-w-[180px]">
            <p className="type-label font-display text-label">
              Nível de Confiança
            </p>
            <p className="mt-1 font-display text-4xl font-bold text-ink tabular-nums">
              {confidenceScore !== null ? `${confidenceScore}%` : '—'}
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-surface overflow-hidden">
              <div
                className={`motion-fill h-full ${statusColors.bar} transition-all duration-500`}
                style={{ width: `${confidenceScore ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. OS 3 CARTÕES DE INDICADORES SIMPLES */}
      <div>
        <h3 className="font-display text-lg font-semibold text-ink sm:text-xl" data-reveal>
          Indicadores Agroclimáticos Chave
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Chuva Recente */}
          <div className="rounded-xl border border-line bg-surface p-5" data-reveal data-reveal-delay="1">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink-muted">
              <RainIcon className="size-5 shrink-0 text-label" />
              <span>Chuva Recente</span>
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-ink tabular-nums">
              {rainRecent !== null ? (<>{rainRecent}<span className="text-label"> mm</span></>) : '—'}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Precipitação recente ou média histórica da época
            </p>
          </div>

          {/* Card 2: Humidade da Raiz */}
          <div className="rounded-xl border border-line bg-surface p-5" data-reveal data-reveal-delay="2">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink-muted">
              <DropletIcon className="size-5 shrink-0 text-label" />
              <span>Humidade da Raiz</span>
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-ink tabular-nums">
              {rootMoisture !== null ? (<>{(rootMoisture * 100).toFixed(0)}<span className="text-label">%</span></>) : '—'}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Água disponível na zona radicular do solo
            </p>
          </div>

          {/* Card 3: Chuva Prevista */}
          <div className="rounded-xl border border-line bg-surface p-5" data-reveal data-reveal-delay="3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink-muted">
              <ForecastIcon className="size-5 shrink-0 text-label" />
              <span>Chuva Prevista</span>
            </div>
            <div className="mt-3 font-display text-3xl font-bold text-ink tabular-nums">
              {forecastRain !== null ? (<>{forecastRain}<span className="text-label"> mm</span></>) : '—'}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Expectativa para os próximos 7 dias
            </p>
          </div>
        </div>
      </div>

      {/* 3. CARTA DO AGRÓNOMO (RECOMENDAÇÃO PRÁTICA) */}
      {result?.recommendationText ? (
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8" data-reveal>
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <SproutIcon className="size-6 shrink-0 text-label" />
            <div>
              <h3 className="font-display text-xl font-semibold text-ink sm:text-2xl">
                Recomendação Técnica do Agrónomo
              </h3>
              <p className="text-xs text-ink-muted">
                Orientação prática para o terreno, teste do torrão a 5 cm e proteção do investimento
              </p>
            </div>
          </div>

          <div className="mt-6 max-w-none text-ink leading-relaxed">
            <MarkdownContent text={result.recommendationText} />
          </div>
        </div>
      ) : null}

      {/* 4. DETALHES TÉCNICOS OPCIONAIS (EXPANSÍVEL E DISCRETO) */}
      {(evaluate?.result?.triggers?.length > 0 || evaluate?.result?.justifications?.length > 0) ? (
        <details className="rounded-xl border border-line bg-surface/30 p-4 text-xs text-ink-muted" data-reveal="fade">
          <summary className="cursor-pointer font-medium text-ink-subtle hover:text-ink">
            Ver detalhes e verificações agronómicas adicionais do modelo
          </summary>
          <div className="mt-4 space-y-3">
            {evaluate.result.triggers?.length > 0 ? (
              <div>
                <span className="font-semibold text-ink">Gatilhos identificados: </span>
                <span>{evaluate.result.triggers.join(', ')}</span>
              </div>
            ) : null}
            {evaluate.result.justifications?.map((just, idx) => (
              <p key={idx} className="leading-relaxed">• {just}</p>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
