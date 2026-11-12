import { RESULT_SOURCES } from '../../config/api.js';
import { formatIsoDateLong } from '../../utils/format.js';
import { describeIssues, getFallbackStatus, isPastIsoDate } from '../../utils/report.js';
import InlineNotice from '../ui/InlineNotice.jsx';
import DivergenceNotice from './DivergenceNotice.jsx';
import ReportSection from './ReportSection.jsx';
import { REPORT_SECTIONS, SOURCE_META } from './reportStructure.js';

const SUBHEADING = 'font-mono text-xs font-medium tracking-[0.14em] text-accent uppercase';
const BODY = 'max-w-prose leading-relaxed text-ink-muted';

const LIMITATIONS = [
  'Os indicadores podem ser valores de referência, por exemplo históricos ou mensais, e não medições nem previsões meteorológicas para a data consultada. A fonte e o método não estão documentados.',
  'O nível de confiança é uma pontuação atribuída pelo sistema (0 a 100). Não é uma probabilidade de sucesso, salvo confirmação do serviço.',
  'A avaliação apoia a decisão; não garante a germinação, a produtividade nem o sucesso da sementeira.',
  'O texto da recomendação é produzido pelo serviço e a sua redacção pode variar entre consultas.',
  'Não substitui o conhecimento local nem o acompanhamento de técnicos de extensão agrícola.',
];

function Subsection({ title, children }) {
  return (
    <div>
      <h4 className={SUBHEADING}>{title}</h4>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Comparison({ advisory, evaluate, comparison }) {
  if (comparison) {
    if (comparison.hasDivergences || comparison.notComparable.length > 0) {
      return <DivergenceNotice comparison={comparison} />;
    }
    return (
      <p className={BODY}>
        Os valores comparados — estado, nível de confiança e indicadores — coincidem nas duas
        fontes.
      </p>
    );
  }
  if (advisory.status === 'loading' || evaluate.status === 'loading') {
    return <p className={BODY}>A comparação fica disponível quando as duas fontes responderem.</p>;
  }
  if (advisory.status === 'error' && evaluate.status === 'error') {
    return <p className={BODY}>Comparação indisponível: nenhuma das fontes respondeu.</p>;
  }
  return (
    <p className={BODY}>
      Comparação indisponível: só uma das fontes respondeu. Os valores apresentados vêm de uma
      única fonte, identificada em cada secção.
    </p>
  );
}

function WeatherData({ evaluate }) {
  const fallbackStatus = getFallbackStatus(evaluate);
  let evaluateStatement;
  if (fallbackStatus === 'confirmed') {
    evaluateStatement = (
      <InlineNotice tone="info" title="Valores de substituição">
        A avaliação técnica indica que usou dados meteorológicos de substituição. Os indicadores
        não correspondem necessariamente a medições nem a previsões meteorológicas para a data
        consultada: podem ser valores de referência, por exemplo históricos ou mensais. A fonte e
        o método não estão documentados.
      </InlineNotice>
    );
  } else if (fallbackStatus === 'denied') {
    evaluateStatement = (
      <p className={BODY}>A avaliação técnica indica que não usou dados de substituição.</p>
    );
  } else if (fallbackStatus === 'unconfirmed' && evaluate.status === 'success') {
    evaluateStatement = (
      <p className={BODY}>
        A avaliação técnica não indicou se usou dados de substituição. Não foi possível confirmar a
        natureza dos indicadores: não devem ser lidos como medições nem como previsões reais.
      </p>
    );
  } else if (fallbackStatus === 'unconfirmed') {
    evaluateStatement = (
      <p className={BODY}>
        Sem informação: a avaliação técnica não está disponível. Não foi possível confirmar se os
        indicadores são valores de substituição; não devem ser lidos como medições nem como
        previsões reais.
      </p>
    );
  } else {
    evaluateStatement = (
      <p className={BODY}>A aguardar a avaliação técnica para confirmar a natureza dos dados.</p>
    );
  }

  return (
    <>
      {evaluateStatement}
      <p className={BODY}>O serviço de recomendação não indica se usou dados de substituição.</p>
    </>
  );
}

function Completeness({ advisory, evaluate }) {
  const entries = [
    [RESULT_SOURCES.advisory, advisory],
    [RESULT_SOURCES.evaluate, evaluate],
  ];
  const items = [];
  for (const [source, state] of entries) {
    const name = SOURCE_META[source].name;
    if (state.status === 'error') {
      items.push({ key: `${source}-erro`, text: `${name}: sem resposta do serviço.` });
      continue;
    }
    if (state.status !== 'success' || !state.result) continue;
    for (const issue of describeIssues(state.result.issues)) {
      items.push({ key: `${source}-${issue.field}`, text: `${name}: ${issue.label} — ${issue.problem}.` });
    }
    const { status } = state.result;
    if (!status.known && status.code) {
      items.push({
        key: `${source}-estado-desconhecido`,
        text: `${name}: estado com valor não reconhecido («${status.code}»), apresentado com aspecto neutro.`,
      });
    }
  }

  if (items.length === 0) {
    const anyPending = entries.some(([, state]) => state.status === 'loading');
    return (
      <p className={BODY}>
        {anyPending
          ? 'A verificação fica completa quando as duas fontes responderem.'
          : 'As respostas recebidas incluem todos os campos documentados.'}
      </p>
    );
  }
  return (
    <ul className="max-w-prose space-y-2.5">
      {items.map((item) => (
        <li key={item.key} className="flex gap-4 leading-relaxed text-ink-muted">
          <span className="mt-3 h-px w-5 shrink-0 bg-caution" aria-hidden="true" />
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** 05 — Transparência: divergências, dados de substituição, dados incompletos e limites. */
export default function TransparencySection({ params, advisory, evaluate, today, comparison }) {
  const isPast = isPastIsoDate(params.data_consulta, today);
  const dateText = formatIsoDateLong(params.data_consulta);

  return (
    <ReportSection section={REPORT_SECTIONS.transparency}>
      <div className="space-y-12">
        <Subsection title="Comparação entre as fontes">
          <Comparison advisory={advisory} evaluate={evaluate} comparison={comparison} />
        </Subsection>

        <Subsection title="Dados meteorológicos">
          <WeatherData evaluate={evaluate} />
        </Subsection>

        <Subsection title="Dados incompletos ou inesperados">
          <Completeness advisory={advisory} evaluate={evaluate} />
        </Subsection>

        <Subsection title="Data da consulta">
          <p className={BODY}>
            {isPast
              ? `Consulta para uma data passada (${dateText}). O serviço não confirma que os indicadores sejam observações desse dia; podem ser valores de referência, por exemplo históricos ou mensais.`
              : `Consulta para hoje, ${dateText}, segundo o relógio deste dispositivo.`}
          </p>
        </Subsection>

        <Subsection title="Limites desta avaliação">
          <ul className="max-w-prose space-y-2.5">
            {LIMITATIONS.map((limitation) => (
              <li key={limitation} className="flex gap-4 leading-relaxed text-ink-muted">
                <span className="mt-3 h-px w-5 shrink-0 bg-accent" aria-hidden="true" />
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </Subsection>
      </div>
    </ReportSection>
  );
}
