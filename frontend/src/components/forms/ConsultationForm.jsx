import { useRef, useState } from 'react';
import { MUNICIPALITIES_BY_PROVINCE } from '../../data/municipalities.js';
import { CONSULTATION_ANCHORS } from '../../routing/routes.js';
import { describeConsultation } from '../../utils/report.js';
import { ConsultationInputError, validateConsultationParams } from '../../utils/validators.js';
import Button from '../ui/Button.jsx';
import { ChevronDownIcon } from '../ui/icons.jsx';
import InlineNotice from '../ui/InlineNotice.jsx';
import LoadingIndicator from '../ui/LoadingIndicator.jsx';
import CatalogSelectField from './CatalogSelectField.jsx';
import DateField from './DateField.jsx';
import FieldShell from './FieldShell.jsx';
import { CONTROL_CLASSES } from './fieldStyles.js';

const CONSULTATION_FORM_ID = CONSULTATION_ANCHORS.form;
const FIELD_ORDER = ['provincia', 'cultura', 'data_consulta'];
const SUBMIT_HINT_ID = 'consulta-submeter-dica';

function isOptionAvailable(catalog, value) {
  return catalog.options.some((option) => option.value === value);
}

/**
 * Formulário da consulta com suporte a planeamento estratégico e selecção municipal.
 */
export default function ConsultationForm({
  provinces,
  crops,
  today,
  isPending,
  onSubmit,
  onValuesChange,
  lastSubmitted = null,
  isStale = false,
}) {
  const [values, setValues] = useState({ provincia: '', municipio: '', cultura: '', data_consulta: today });
  const [errors, setErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const provinciaRef = useRef(null);
  const culturaRef = useRef(null);
  const dataRef = useRef(null);
  const fieldRefs = { provincia: provinciaRef, cultura: culturaRef, data_consulta: dataRef };

  const catalogsReady = provinces.status === 'success' && crops.status === 'success';
  const isUnavailable = isPending || !catalogsReady;

  const validate = (candidate) => {
    const result = validateConsultationParams(candidate, { requireDate: true, today });
    if (!result.provincia && !isOptionAvailable(provinces, candidate.provincia)) {
      result.provincia = 'Seleccione uma província da lista.';
    }
    if (!result.cultura && !isOptionAvailable(crops, candidate.cultura)) {
      result.cultura = 'Seleccione uma cultura da lista.';
    }
    return result;
  };

  const updateField = (name, value) => {
    let next;
    if (name === 'provincia') {
      next = { ...values, provincia: value, municipio: '' };
    } else {
      next = { ...values, [name]: value };
    }
    setValues(next);
    onValuesChange?.(next);
    if (hasAttemptedSubmit) setErrors(validate(next));
  };

  const focusFirstInvalid = (fieldErrors) => {
    const first = FIELD_ORDER.find((name) => fieldErrors[name]);
    if (first) fieldRefs[first].current?.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isUnavailable) return;

    setHasAttemptedSubmit(true);
    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      focusFirstInvalid(fieldErrors);
      return;
    }

    try {
      onSubmit({ ...values });
    } catch (error) {
      if (!(error instanceof ConsultationInputError)) throw error;
      setErrors(error.fieldErrors);
      focusFirstInvalid(error.fieldErrors);
    }
  };

  let submitHint = null;
  if (isPending) submitHint = 'A consulta está em curso. Aguarde a resposta do serviço.';
  else if (!catalogsReady) submitHint = 'Disponível quando as províncias e as culturas estiverem carregadas.';

  const loadingCatalogs = [
    provinces.status === 'loading' ? 'as províncias' : null,
    crops.status === 'loading' ? 'as culturas' : null,
  ].filter(Boolean);

  let submitLabel = 'Consultar';
  if (isPending) submitLabel = 'A consultar…';
  else if (isStale) submitLabel = 'Actualizar consulta';

  const availableMunicipalities = values.provincia ? MUNICIPALITIES_BY_PROVINCE[values.provincia] ?? [] : [];

  return (
    <form
      id={CONSULTATION_FORM_ID}
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby="consulta-formulario-titulo"
    >
      <h2 id="consulta-formulario-titulo" className="text-2xl leading-snug font-semibold text-ink">
        Dados da consulta
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">Campos com província, cultura e data são obrigatórios.</p>

      {loadingCatalogs.length > 0 ? (
        <div className="mt-6">
          <LoadingIndicator label={`A carregar ${loadingCatalogs.join(' e ')} do serviço…`} />
        </div>
      ) : null}

      <div className="mt-7 space-y-6">
        <CatalogSelectField
          id="provincia"
          label="Província"
          placeholder="Seleccione a província"
          resourceLabel="as províncias"
          emptyMessage="Não há províncias disponíveis de momento."
          catalog={provinces}
          value={values.provincia}
          onChange={(value) => updateField('provincia', value)}
          error={errors.provincia}
          inputRef={provinciaRef}
        />
        {availableMunicipalities.length > 0 ? (
          <FieldShell
            id="municipio"
            label="Município"
            hint="Opcional. Permite maior precisão geográfica da previsão."
          >
            <div className="relative">
              <select
                id="municipio"
                name="municipio"
                value={values.municipio || ''}
                onChange={(event) => updateField('municipio', event.target.value)}
                className={`${CONTROL_CLASSES} appearance-none pr-11`}
              >
                <option value="">Sede provincial / Toda a província</option>
                {availableMunicipalities.map((item) => (
                  <option key={item.id} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-accent" />
            </div>
          </FieldShell>
        ) : null}
        <CatalogSelectField
          id="cultura"
          label="Cultura"
          placeholder="Seleccione a cultura"
          resourceLabel="as culturas"
          emptyMessage="Não há culturas disponíveis de momento."
          catalog={crops}
          value={values.cultura}
          onChange={(value) => updateField('cultura', value)}
          error={errors.cultura}
          inputRef={culturaRef}
        />
        <DateField
          id="data_consulta"
          label="Data da consulta"
          hint="Hoje ou qualquer data futura de planeamento de safra."
          value={values.data_consulta}
          onChange={(value) => updateField('data_consulta', value)}
          error={errors.data_consulta}
          inputRef={dataRef}
        />
      </div>

      {isStale && !isPending && lastSubmitted ? (
        <InlineNotice tone="info" role="status" title="Dados alterados" className="mt-8">
          O relatório ao lado mostra a consulta anterior ({describeConsultation(lastSubmitted)}).
          Seleccione «Actualizar consulta» para obter um relatório com os novos dados.
        </InlineNotice>
      ) : null}

      <div className="mt-8">
        <Button
          type="submit"
          isUnavailable={isUnavailable}
          aria-describedby={submitHint ? SUBMIT_HINT_ID : undefined}
          className="w-full justify-center"
        >
          {submitLabel}
        </Button>
        {submitHint ? (
          <p id={SUBMIT_HINT_ID} className="mt-3 text-sm leading-relaxed text-ink-muted">
            {submitHint}
          </p>
        ) : null}
      </div>
    </form>
  );
}
