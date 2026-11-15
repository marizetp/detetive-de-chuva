import { useRef, useState } from 'react';
import { MUNICIPALITIES_BY_PROVINCE } from '../../data/municipalities.js';
import { localizeCropName, localizeCropValue } from '../../i18n/catalogNames.js';
import { useI18n } from '../../i18n/useI18n.js';
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
  const { t, language } = useI18n();
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
      result.provincia = 'validation.provinceFromList';
    }
    if (!result.cultura && !isOptionAvailable(crops, candidate.cultura)) {
      result.cultura = 'validation.cropFromList';
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
  if (isPending) submitHint = t('consultation.form.hintPending');
  else if (!catalogsReady) submitHint = t('consultation.form.hintCatalogs');

  const provincesLoading = provinces.status === 'loading';
  const cropsLoading = crops.status === 'loading';
  let catalogsLoadingLabel = null;
  if (provincesLoading && cropsLoading) catalogsLoadingLabel = t('consultation.form.loadingBoth');
  else if (provincesLoading) catalogsLoadingLabel = t('consultation.form.loadingProvinces');
  else if (cropsLoading) catalogsLoadingLabel = t('consultation.form.loadingCrops');

  let submitLabel = t('consultation.form.submit');
  if (isPending) submitLabel = t('consultation.form.submitPending');
  else if (isStale) submitLabel = t('consultation.form.submitUpdate');

  const describe = (params) =>
    describeConsultation(params, {
      language,
      cropLabel: (value) => localizeCropValue(value, crops.options, language),
    });
  // Mensagens de validação: chaves do dicionário, traduzidas aqui.
  const errorText = (name) => (errors[name] ? t(errors[name]) : undefined);

  const availableMunicipalities = values.provincia ? MUNICIPALITIES_BY_PROVINCE[values.provincia] ?? [] : [];

  return (
    <form
      id={CONSULTATION_FORM_ID}
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby="consulta-formulario-titulo"
    >
      <h2 id="consulta-formulario-titulo" className="text-2xl leading-snug font-semibold text-ink">
        {t('consultation.form.title')}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t('consultation.form.lead')}</p>

      {catalogsLoadingLabel ? (
        <div className="mt-6">
          <LoadingIndicator label={catalogsLoadingLabel} />
        </div>
      ) : null}

      <div className="mt-7 space-y-6">
        <CatalogSelectField
          id="provincia"
          label={t('consultation.form.province.label')}
          placeholder={t('consultation.form.province.placeholder')}
          loadingLabel={t('consultation.form.province.loading')}
          errorTitle={t('consultation.form.province.loadError')}
          emptyMessage={t('consultation.form.province.empty')}
          catalog={provinces}
          value={values.provincia}
          onChange={(value) => updateField('provincia', value)}
          error={errorText('provincia')}
          inputRef={provinciaRef}
        />
        {availableMunicipalities.length > 0 ? (
          <FieldShell
            id="municipio"
            label={t('consultation.form.municipality.label')}
            hint={t('consultation.form.municipality.hint')}
          >
            <div className="relative">
              <select
                id="municipio"
                name="municipio"
                value={values.municipio || ''}
                onChange={(event) => updateField('municipio', event.target.value)}
                className={`${CONTROL_CLASSES} appearance-none pr-11`}
              >
                <option value="">{t('consultation.form.municipality.wholeProvince')}</option>
                {availableMunicipalities.map((item) => (
                  <option key={item.id} value={item.value}>
                    {item.isSeat
                      ? t('consultation.form.municipality.seat', { name: item.label })
                      : item.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-label" />
            </div>
          </FieldShell>
        ) : null}
        <CatalogSelectField
          id="cultura"
          label={t('consultation.form.crop.label')}
          placeholder={t('consultation.form.crop.placeholder')}
          loadingLabel={t('consultation.form.crop.loading')}
          errorTitle={t('consultation.form.crop.loadError')}
          emptyMessage={t('consultation.form.crop.empty')}
          getOptionLabel={(option) => localizeCropName(option, language)}
          catalog={crops}
          value={values.cultura}
          onChange={(value) => updateField('cultura', value)}
          error={errorText('cultura')}
          inputRef={culturaRef}
        />
        <DateField
          id="data_consulta"
          label={t('consultation.form.date.label')}
          hint={t('consultation.form.date.hint')}
          value={values.data_consulta}
          onChange={(value) => updateField('data_consulta', value)}
          error={errorText('data_consulta')}
          inputRef={dataRef}
        />
      </div>

      {isStale && !isPending && lastSubmitted ? (
        <InlineNotice tone="info" role="status" title={t('consultation.form.staleTitle')} className="mt-8">
          {t('consultation.form.staleBody', {
            consultation: describe(lastSubmitted),
            action: t('consultation.form.submitUpdate'),
          })}
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
