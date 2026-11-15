// English dictionary (default language since 2026-11-14). Keys must match pt.js (parity test).
// Interpolation: {name}. API field names and the brand name are never translated.
// Keys whose English wording carries scientific or agronomic meaning are listed in
// ../reviewRequired.js and must be reviewed by a person before being considered final.

const en = {
  common: {
    retry: 'Try again',
    checkAgain: 'Check again',
  },
  documentTitle: {
    consultation: 'Crop consultation',
    notFound: 'Page not found',
  },
  skipLink: 'Skip to content',
  header: {
    homeLink: '— home page',
    navLabel: 'Main',
    navMobileLabel: 'Main (mobile)',
    menuOpen: 'Menu',
    menuClose: 'Close',
    cta: 'Start consultation',
    ctaMobile: 'Start crop consultation',
  },
  nav: {
    home: 'Home',
    howItWorks: 'How it works',
    sources: 'Data sources',
  },
  language: {
    selectorLabel: 'Language',
    changed: 'Language changed to English.',
  },
  suggestion: {
    regionLabel: 'Language suggestion',
    title: 'Would you prefer Portuguese?',
    accept: 'Switch to Portuguese',
    dismiss: 'Keep English',
  },
  footer: {
    tagline: 'Agroclimatic intelligence to support farming decisions in Angola.',
    navLabel: 'Footer',
    navHeading: 'Navigate',
    consultation: 'Crop consultation',
    dataHeading: 'Data',
    advisoryTerm: 'Assessments and recommendations',
    advisoryDescription: 'Detetive da Chuva assessment service (project API).',
    trendsTerm: 'Historical trends',
    trendsDescription: 'NASA POWER (MERRA-2 reanalysis) — in preparation, not yet available.',
    disclaimer:
      'Project developed for the NASA Space Apps Challenge 2026. Detetive da Chuva is not an official NASA service.',
    decisionSupport: 'Decision-support tool — it does not guarantee farming outcomes.',
  },
  home: {
    hero: {
      question: 'Can the traditional farming calendar still be relied on?',
      lead: 'A farming decision-support platform that presents the agroclimatic indicators provided by the system, such as rainfall and soil moisture, to help decide when to sow.',
      cta: 'Start crop consultation',
      howItWorks: 'How it works',
    },
    about: {
      title: 'Agroclimatic information to decide when to sow',
      paragraph1:
        'For generations, the traditional farming calendar has guided sowing on the Central Plateau. Detetive da Chuva starts from a simple question: do current conditions match that calendar?',
      paragraph2:
        'For each province and crop, the platform queries an agroclimatic assessment service and presents the result clearly: a classification, a confidence level, the indicators it is based on and practical guidance for the field.',
      indicatorsHeading: 'Indicators considered',
    },
    howItWorks: {
      title: 'Three steps, from the field to the recommendation',
      stepPrefix: 'Step {number}: ',
      step1Title: 'Select the province and the crop',
      step1Text:
        'Choose the province where you will sow and the crop you intend to plant. The available options are provided by the service.',
      step2Title: 'Analyse the agroclimatic conditions',
      step2Text:
        'The service analyses agroclimatic indicators, such as rainfall and soil moisture in the root zone, and returns a classification for the chosen province and crop.',
      step3Title: 'Read the recommendation',
      step3Text:
        'You receive a classification, a confidence level and practical guidance. The confidence level is a system score, not a guarantee of success.',
      statusListLabel: 'Possible classifications',
      ctaPrompt: 'Ready to assess the conditions in your area?',
      cta: 'Start crop consultation',
    },
    sources: {
      title: 'Where the data comes from, and what we do not know yet',
      sourcesHeading: 'Data sources',
      available: 'Available',
      pending: 'In preparation',
      serviceTitle: 'Detetive da Chuva assessment service',
      serviceText:
        'The project API that returns, for each consultation, the classification, the confidence level, the indicators and the recommendation, as well as a complementary technical assessment. The detailed origin of the weather data used by the service is not yet documented in this version.',
      trendsTitle: 'Historical agroclimatic trends',
      trendsText:
        'Analysis of long-term trends based on reanalysis data — a model product, not a direct measurement. Not yet available on the platform.',
      natureHeading: 'About the platform',
      nature1: 'It is a decision-support tool. It does not guarantee a successful sowing.',
      nature2: 'The confidence level is a score assigned by the system, not a confirmed probability.',
      nature3:
        'The recommendation text is produced by the service and its wording may vary between consultations.',
      nature4:
        'It does not replace local knowledge or the support of agricultural extension officers.',
    },
  },
  status: {
    FAVORAVEL: 'Favourable',
    AGUARDAR: 'Wait',
    DESFAVORAVEL: 'Unfavourable',
    unknown: 'Unrecognised status',
    missing: 'Status unavailable',
  },
  metrics: {
    chuva_acumulada_recente_mm: {
      label: 'Recent accumulated rainfall',
      description:
        'Rainfall accumulated before the consultation date, according to the service. It may be a reference value rather than a measurement.',
    },
    humidade_solo_raiz: {
      label: 'Soil moisture in the root zone',
      description:
        'Water available in the soil layer where roots develop, according to the service, on a scale from 0 to 1 (shown here as a percentage). It may be a reference value rather than a measurement.',
    },
    previsao_7dias_mm: {
      label: 'Rainfall indicated for 7 days',
      description:
        'Rainfall indicated by the service for the seven days after the consultation date. It may be a reference value rather than a weather forecast.',
    },
  },
  consultation: {
    eyebrow: 'Crop consultation',
    title: 'Assess the conditions for sowing',
    lead: 'Enter the province, the municipality (optional), the crop and the intended date — now or for future season planning. Get the agronomic recommendation and the climate indicators that support the decision.',
    form: {
      title: 'Consultation details',
      lead: 'Enter the location, the crop and the intended date to assess the sowing conditions.',
      loadingProvinces: 'Loading provinces from the service…',
      loadingCrops: 'Loading crops from the service…',
      loadingBoth: 'Loading provinces and crops from the service…',
      province: {
        label: 'Province',
        placeholder: 'Select the province',
        loading: 'Loading provinces…',
        loadError: 'The provinces could not be loaded.',
        empty: 'No provinces are available at the moment.',
      },
      municipality: {
        label: 'Municipality',
        hint: 'Optional. Allows greater geographic precision of the forecast.',
        wholeProvince: 'Provincial seat / Whole province',
        seat: '{name} (provincial seat)',
      },
      crop: {
        label: 'Crop',
        placeholder: 'Select the crop',
        loading: 'Loading crops…',
        loadError: 'The crops could not be loaded.',
        empty: 'No crops are available at the moment.',
      },
      date: {
        label: 'Intended sowing date',
        hint: 'Today or any future date for season planning.',
      },
      submit: 'Check suitability',
      submitPending: 'Assessing suitability…',
      submitUpdate: 'Update suitability',
      hintPending: 'The consultation is in progress. Please wait for the service to respond.',
      hintCatalogs: 'Available once the provinces and crops have loaded.',
      staleTitle: 'Details changed',
      staleBody:
        'The report shows the previous consultation ({consultation}). Select “{action}” to get a report with the new details.',
    },
  },
  validation: {
    provinceRequired: 'Select a province.',
    cropRequired: 'Select a crop.',
    dateRequired: 'Enter the consultation date.',
    dateInvalid: 'Enter a valid date in the YYYY-MM-DD format.',
    provinceFromList: 'Select a province from the list.',
    cropFromList: 'Select a crop from the list.',
  },
  errors: {
    inputTitle: 'Check the consultation details.',
    unexpectedTitle: 'An unexpected error occurred.',
    unexpectedDescription: 'Try again. If the problem persists, come back later.',
    timeoutTitle: 'The server took too long to respond.',
    timeoutDescription:
      'The service may be starting up after a period of inactivity. Wait a moment and try again.',
    networkTitle: 'Could not connect to the server.',
    networkDescription: 'Check your Internet connection and try again.',
    validationTitle: 'The server did not accept the consultation.',
    validationDescription: 'Review the selected province, crop and date.',
    malformedTitle: 'The server response could not be interpreted.',
    malformedDescription: 'Try again in a few moments.',
    serverTitle: 'The server encountered a problem.',
    serverDescription: 'Try again in a few moments.',
    rejectedTitle: 'The server did not accept the request.',
    rejectedDescription: 'Review the consultation details and try again.',
  },
  loading: {
    slow: 'This is taking longer than usual. The service may be starting up after a period of inactivity — it can take up to two minutes.',
  },
  results: {
    eyebrow: 'Assessment result',
    emptyTitle: 'No consultation yet',
    emptyBody:
      'Fill in the province, the crop and the intended date, then select “{action}”. The agronomic assessment and the decision-support indicators will appear here.',
    loadingTitle: 'Assessing suitability…',
    loadingLabel: 'Analysing historical climate data and agricultural indicators...',
    errorTitle: 'Consultation error',
    errorNoticeTitle: 'The recommendation could not be retrieved.',
    errorNoticeBody: 'The server took too long to respond or the connection failed.',
    reportTitle: 'Consultation report',
    changeData: 'Change consultation details',
    staleTitle: 'Form details changed',
    staleBody:
      'The form details have changed. Select “{action}” to get the assessment for the new details.',
    verdict: {
      FAVORAVEL: {
        title: 'Favourable for sowing',
        description:
          'Climate conditions and soil moisture reserves are suitable for the crop to develop in this period.',
      },
      AGUARDAR: {
        title: 'Wait for better conditions',
        description:
          'Transition period, or moisture at root level is still limited. Caution is advised before sowing, to protect seed and capital.',
      },
      DESFAVORAVEL: {
        title: 'Not recommended / Unfavourable',
        description:
          'High risk of losing the investment and inputs. Dry spell or insufficient water conditions.',
      },
      missingDescription:
        'The service did not send the status of this assessment. No classification is assumed.',
      unknownDescription:
        'The service returned a status the platform does not recognise (“{value}”). It is shown without interpretation.',
    },
    confidence: 'Confidence level',
    confidenceUnavailable: 'Not available',
    // Non-breaking space (U+00A0) before «·»: the separator never starts a line.
    confidenceCaption: 'System confidence score · Not a probability',
    indicatorsTitle: 'Key agroclimatic indicators',
    rainRecent: {
      label: 'Recent rainfall',
      caption: 'Recent rainfall or historical average for the season',
    },
    rootMoisture: {
      label: 'Root-zone moisture',
      caption: 'Water available in the root zone of the soil',
    },
    forecastRain: {
      label: 'Expected rainfall',
      caption: 'Outlook for the next 7 days',
    },
    recommendationTitle: 'Agronomist’s technical recommendation',
    recommendationSubtitle:
      'Practical guidance for the field, the 5 cm soil-clod test and protecting the investment',
    detailsSummary: 'View additional agronomic details and checks from the model',
    triggersLabel: 'Triggers identified: ',
    sourceLanguage: {
      recommendationTitle: 'The detailed recommendation is not yet available in English.',
      justificationsTitle: 'The technical justifications are not yet available in English.',
      body: 'This text is produced by the assessment service in another language and has not been translated yet. The original text is available below for reference.',
      viewOriginal: 'View the original text ({language})',
    },
  },
  notFound: {
    eyebrow: 'Error 404',
    title: 'Page not found',
    body: 'The address you were looking for does not exist or has changed.',
    cta: 'Go to the home page',
  },
  languageNames: {
    en: 'English',
    pt: 'Portuguese',
  },
};

export default en;
