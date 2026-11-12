import { useRef, useState } from 'react';
import { ConsultationInputError, validateConsultationParams } from '../../utils/validators.js';
import Button from '../ui/Button.jsx';
import CatalogSelectField from './CatalogSelectField.jsx';
import DateField from './DateField.jsx';

const FIELD_ORDER = ['provincia', 'cultura', 'data_consulta'];
const SUBMIT_HINT_ID = 'consulta-submeter-dica';

function isOptionAvailable(catalog, value) {
  return catalog.options.some((option) => option.value === value);
}

/**
 * Formulário da consulta. Valida com as regras partilhadas (utils/validators.js) e confirma
 * que a província e a cultura pertencem às listas devolvidas pela API.
 * Nomes de campos = nomes da API (`provincia`, `cultura`, `data_consulta`).
 */
export default function ConsultationForm({ provinces, crops, today, isPending, onSubmit }) {
  const [values, setValues] = useState({ provincia: '', cultura: '', data_consulta: today });
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
    const next = { ...values, [name]: value };
    setValues(next);
    // Depois da primeira tentativa, os erros acompanham as correcções em tempo real.
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
      // O serviço valida de novo; se recusar, mostramos os mesmos erros por campo.
      if (!(error instanceof ConsultationInputError)) throw error;
      setErrors(error.fieldErrors);
      focusFirstInvalid(error.fieldErrors);
    }
  };

  let submitHint = null;
  if (isPending) submitHint = 'A consulta está em curso. Aguarde a resposta do serviço.';
  else if (!catalogsReady) submitHint = 'Disponível quando as províncias e as culturas estiverem carregadas.';

  return (
    <form noValidate onSubmit={handleSubmit} aria-labelledby="consulta-formulario-titulo">
      <h2 id="consulta-formulario-titulo" className="text-2xl leading-snug font-semibold text-ink">
        Dados da consulta
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">Todos os campos são obrigatórios.</p>

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
          hint="Hoje ou uma data anterior."
          value={values.data_consulta}
          max={today}
          onChange={(value) => updateField('data_consulta', value)}
          error={errors.data_consulta}
          inputRef={dataRef}
        />
      </div>

      <div className="mt-8">
        <Button
          type="submit"
          isUnavailable={isUnavailable}
          aria-describedby={submitHint ? SUBMIT_HINT_ID : undefined}
          className="w-full justify-center"
        >
          {isPending ? 'A consultar…' : 'Consultar'}
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
