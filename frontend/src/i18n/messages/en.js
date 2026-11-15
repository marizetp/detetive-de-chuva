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
    map: 'Interactive Map of Angola',
    cycle: 'Annual Sowing Cycle',
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
    map: 'Map',
    cycle: 'Cycle',
  },
  workspace: {
    navLabel: 'Agricultural consultation views',
    mapTab: 'Interactive map',
    cycleTab: 'Sowing cycle',
    consultationTab: 'Traditional consultation',
  },
  language: {
    selectorLabel: 'Language',
    changed: 'Language changed to English.',
  },
  demo: {
    regionLabel: 'Demonstration mode',
    title: 'Demonstration mode',
    body: 'Results are real responses from the assessment service, recorded on {date}. They do not represent current conditions and are not updated.',
    available: 'Available consultations:',
    assessmentOnly: 'technical assessment only',
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
    advisoryDescription: 'Sources: NASA GPM IMERG, NASA POWER and Open-Meteo.',
    trendsTerm: 'Historical trends',
    trendsDescription: 'NASA POWER (MERRA-2) trend analysis — in preparation.',
    disclaimer:
      'Project developed for the NASA Space Apps Challenge 2026. AgroKairos is not an official NASA service.',
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
        'For generations, the traditional farming calendar has guided sowing on the Central Plateau. AgroKairos starts from a simple question: do current conditions match that calendar?',
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
      serviceTitle: 'AgroKairos assessment service',
      serviceText:
        'Returns the sowing classification, confidence score, and consultation indicators by combining the 25-year NASA POWER baseline, NASA GPM IMERG, Open-Meteo data, and crop profiles. When recent data is unavailable, it falls back to NASA POWER historical climatology and indicates this in the report.',
      trendsTitle: 'Historical agroclimatic trends',
      trendsText:
        'Analysis of long-term trends based on reanalysis data — a model product, not a direct measurement. Not yet available on the platform.',
      natureHeading: 'About the platform',
      nature1: 'It is a decision-support tool. It does not guarantee a successful sowing.',
      nature2: 'The confidence level is a score assigned by the system, not a confirmed probability.',
      nature3:
        'The recommendation text is produced automatically by the assessment service, based on the indicators for each consultation. It may be written with generative artificial intelligence or from a fixed text template, and its wording may vary between consultations. It does not replace advice from an agricultural extension officer.',
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
      label: 'Historical mean rainfall (7 days)',
      description:
        'Historical mean rainfall for this period, indicating the years used (2000–2024).',
    },
  },
  consultation: {
    eyebrow: 'Crop consultation',
    title: 'Assess the conditions for sowing',
    lead: 'Select the province, municipality, crop, and date to check sowing conditions.',
    form: {
      title: 'Consultation details',
      lead: 'Choose the location, crop, and date.',
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
        hint: 'Optional. Improves geographic precision for the consultation.',
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
        hint: 'Today or another date for season planning.',
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
    unsupportedLanguageTitle: 'The requested language is not supported by this service.',
    unsupportedLanguageDescription:
      'The assessment service did not accept the language of the request. Your consultation details were not affected. Change the interface language and check again, or try later.',
    validationTitle: 'The consultation details are not valid.',
    validationDescription:
      'Check the selected province, crop and date and correct anything needed before sending again.',
    badRequestTitle: 'The server did not accept the request.',
    badRequestDescription:
      'Check the consultation details and correct anything needed before sending again.',
    notFoundTitle: 'The requested information was not found.',
    notFoundDescription: 'This resource may not be available in this version of the service.',
    demoUnavailableTitle: 'This consultation is not available in demonstration mode.',
    demoUnavailableDescription:
      'Only the recorded consultations listed at the top of the page can be shown.',
    unavailableTitle: 'The service is temporarily unavailable.',
    unavailableDescription: 'Try again in a few minutes.',
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
      'Fill in the province, the crop and the intended date, then select “{action}”. The recommendation and the decision-support indicators will appear here.',
    loadingTitle: 'Assessing suitability…',
    loadingLabel: 'Fetching agroclimatic indicators…',
    errorTitle: 'Consultation error',
    errorNoticeTitle: 'The recommendation could not be retrieved.',
    reportTitle: 'Consultation report',
    mechanism:
      'Agricultural assessment from the decision engine: it combines the 25-year NASA POWER baseline, Open-Meteo data and the crop profile for the crop and location given. It does not include the IMERG assessment of the rainy-season onset or the planting window, which are independent scientific analyses.',
    changeData: 'Change consultation details',
    staleTitle: 'Form details changed',
    staleBody:
      'The form details have changed. Select “{action}” to get the assessment for the new details.',
    verdict: {
      FAVORAVEL: {
        title: 'Favourable for sowing',
        description:
          'Based on the indicators for this consultation, the service classifies conditions as favourable for sowing. This is decision-support guidance, not a guarantee of germination or harvest.',
      },
      AGUARDAR: {
        title: 'Wait before sowing',
        description:
          'Based on the indicators for this consultation, the service does not yet classify conditions as favourable for sowing and suggests waiting. You can check again later.',
      },
      DESFAVORAVEL: {
        title: 'Not recommended / Unfavourable',
        description:
          'Based on the indicators for this consultation, the service classifies conditions as unfavourable for sowing in this period. Before deciding, check conditions in the field and, where possible, with an agricultural extension officer.',
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
      caption: 'Recent rainfall recorded for this period',
    },
    rootMoisture: {
      label: 'Root-zone moisture',
      caption: 'Available root-zone soil moisture',
    },
    forecastRain: {
      label: 'Historical mean rainfall',
      caption: 'Historical mean rainfall for this period (2000–2024)',
    },
    recommendationTitle: 'Recommendation from the assessment service',
    recommendationSubtitle:
      "Generated automatically from the service's indicators; artificial intelligence may be used.",
    detailsSummary: 'View additional agronomic details and checks from the model',
    triggersLabel: 'Triggers identified: ',
    fallback: {
      confirmedTitle: 'Alternative weather data',
      confirmedBody:
        'According to the technical assessment, real-time weather data (Open-Meteo) was not available for this consultation, and the decision engine used NASA POWER climatology for 2000–2024 instead. Values obtained this way are historical expectations for the time of year, not current observations or forecasts. The recommendation was obtained in a separate request that does not state its data source, so it cannot be confirmed whether its indicators used the same alternative.',
      confirmedBodyAssessment:
        'According to the technical assessment, real-time weather data (Open-Meteo) was not available for this consultation, and the decision engine used NASA POWER climatology for 2000–2024 instead. Values obtained this way are historical expectations for the time of year, not current observations or forecasts. The technical assessment does not state which of its indicators used this alternative.',
      unconfirmedTitle: 'Data source not confirmed',
      evaluateUnavailable:
        'The technical assessment is not available, so it could not be confirmed whether real-time or alternative weather data was used.',
      notIndicated:
        'The technical assessment did not indicate whether real-time or alternative weather data was used.',
    },
    divergence: {
      recommendation: 'Recommendation',
      assessment: 'Technical assessment',
      field: 'Field',
      status: 'Status',
      confidence: 'Confidence level',
      tableCaption: 'Values that differ between the recommendation and the technical assessment',
      statusTitle: 'The recommendation and the technical assessment show different statuses',
      statusBody:
        'Both results are shown exactly as received from the service; the platform does not choose between them. Consider both before deciding and, where possible, check conditions in the field.',
      valuesTitle: 'The statuses match, but some values differ',
      valuesBody:
        'The recommendation and the technical assessment show the same status but returned different values for the fields below. Both are shown unchanged.',
      notComparableTitle: 'Not all values could be compared',
      notComparableBody:
        'One of the results did not include these fields, so they were not compared: {fields}. This does not mean the values match.',
      assessmentUnavailableTitle: 'Technical assessment unavailable',
      assessmentUnavailableBody:
        'The technical assessment could not be retrieved, so the recommendation is shown without that comparison.',
      recommendationUnavailableTitle: 'Recommendation unavailable',
      recommendationUnavailableBody:
        'The recommendation could not be retrieved. Only the technical assessment is shown below, labelled as such; without the recommendation, the two results cannot be compared.',
      assessmentStatusLabel: 'Status according to the technical assessment',
    },
    sourceLanguage: {
      recommendationTitle: 'The detailed recommendation is not yet available in English.',
      justificationsTitle: 'The technical justifications are not yet available in English.',
      body: 'This text is produced by the assessment service in another language and has not been translated yet. The original text is available below for reference.',
      recommendationBody:
        'This recommendation was requested from the assessment service in {source}. You can request it in English: the service generates it again, so the wording may differ. The text requested in {source} is still available below.',
      requestInLanguage: 'Get the recommendation in {language}',
      justificationsBody:
        'These justifications were requested from the assessment service in {source}. You can request them in English: the service repeats only the technical assessment. The text requested in {source} is still available below.',
      requestJustificationsInLanguage: 'Get the justifications in {language}',
      viewOriginal: 'View the original text ({language})',
    },
  },
  // Scientific mechanisms and IMERG engine. Prepared for integration (D11): IMERG and the planting
  // window have no screen yet. Scientific texts: human review required.
  mechanisms: {
    decisionEngine: {
      title: 'Agricultural assessment (decision engine)',
      description:
        'Operational assessment by crop and municipality, using the 25-year NASA POWER baseline, Open-Meteo data and crop profiles.',
    },
    imerg: {
      title: 'Rainy-season onset (IMERG)',
      description:
        'Independent scientific assessment of the rainy-season onset and false-start risk, using NASA GPM IMERG V07 data.',
    },
    optimalPlanting: {
      title: 'Planting window',
      description:
        'Planning information combining IMERG indicators and NASA POWER historical data. Indicative; not a guaranteed date.',
    },
  },
  imerg: {
    noDecision: {
      noReliableBasis: {
        title: 'No conclusion: insufficient IMERG data',
        body: 'There is not enough reliable IMERG data to assess the current rainy season. This is not an indication to plant, wait or not plant. Consult an agricultural technician.',
      },
      outOfSeason: {
        title: 'No conclusion: outside the rainy season',
        body: 'The date given is outside the regional rainy season, so the IMERG engine gives no planting indication.',
      },
      unknown: {
        title: 'Unrecognised IMERG result',
        body: 'The IMERG engine returned a result the platform does not recognise. No planting indication is shown.',
      },
      missing: {
        title: 'IMERG result unavailable',
        body: 'The IMERG engine response does not state a result. No planting indication is shown.',
      },
    },
  },
  cycle: {
    eyebrow: 'Map & agricultural cycle',
    title: 'Interactive Angola map & annual sowing cycle',
    lead: 'Explore Central Plateau provinces and municipalities, switch crops, and follow sowing phases across the year.',
    mapPage: {
      eyebrow: 'Map by crop',
      title: 'Angola — provinces & municipalities by crop',
      lead: 'Select a province, municipality, and crop to inspect indicators for your chosen date.',
      summaryLabel: 'Selected map zone summary',
      summaryEyebrow: 'Selected zone',
      openCycleCta: 'Open annual cycle for this zone',
    },
    cyclePage: {
      eyebrow: 'Agricultural cycle',
      title: 'Annual sowing cycle & probability calendar',
      lead: 'Follow the most favourable weeks and months for sowing across the year.',
    },
    controlsLabel: 'Crop and date selection',
    cropLabel: 'Crop',
    dateLabel: 'Reference date',
    loading: 'Updating...',
    errorTitle: 'Could not reach all live seasonal data',
    errorBody: 'Check your connection or backend status; try again in a few seconds.',
    weekShort: 'Wk',
    disclaimerFallback: 'Historical reference (2000–2024 · NASA GPM IMERG and NASA POWER).',
    tier: {
      alta: 'High sowing probability',
      media: 'Moderate (watch false start)',
      baixa: 'Low probability / off-season',
    },
    map: {
      sectionLabel: 'Interactive map of Angola',
      eyebrow: 'Angola map',
      titleNational: 'Angola — Central Plateau focus',
      titleProvince: '{province} — {count} municipalities',
      viewAngola: 'All Angola',
      svgLabelNational: 'Map of Angola highlighting Huambo, Bié, and Huíla',
      svgLabelProvince: 'Municipality map of {province}',
      noDataYet: 'No evaluation yet',
      clickHint: 'Click a province to view municipalities',
      provinceWhole: 'All of {province}',
    },
    ring: {
      sectionLabel: 'Annual sowing cycle ring',
      eyebrow: 'Agricultural cycle dial',
      title: '{crop} cycle in {province}',
      svgLabel: 'Circular 52-week sowing probability dial for {crop} in {province}',
      seasonDay: 'Season day {day}',
      weekLabel: 'ISO week {week}',
      optimalWindow: 'Recommended window',
      soilReserve: 'Root-zone reserve',
      certaintyNote: 'NASA 2000–2024 historical series (5%–95% range).',
    },
    calendar: {
      sectionLabel: 'Monthly sowing probability calendar',
      eyebrow: 'Monthly phase calendar',
      prevMonth: 'Previous month',
      nextMonth: 'Next month',
    },
    drawer: {
      title: 'Selected cycle period',
      liveStatus: 'Status on date',
      liveMoisture: 'Current root-zone moisture',
      liveRecentRain: 'Recent rainfall (3–5 days)',
      weekSuitability: 'Weekly suitability',
      weeklyRain: 'Mean weekly rainfall',
      monthlyRainMean: 'Mean monthly rainfall',
      falseStartRisk: 'False-start risk (IMERG)',
      openingRainMin: 'Opening rain & depth',
      openConsultation: 'Open traditional consultation for this zone',
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
