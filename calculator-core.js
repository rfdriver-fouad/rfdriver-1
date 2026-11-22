/* ==========================================================================
   RF Driver — calculator-core.js (v2)
   Logique unique de classification aéroport (CDG / ORY / BVA / PARIS / OTHER)
   et de tarification, partagée par reservation.html, en/reservation.html,
   vtc.html, en/vtc.html.

   AUCUN appel subDestinations/containingPlaces en production : les 34
   sous-destinations et leurs viewports individuels sont enregistrés
   statiquement ci-dessous, vérifiés via l'outil de diagnostic temporaire.

   v2 : normalisation des deux formats Google réels (Places API New
   camelCase avec lat()/lng() en fonctions, et Geocoder classique
   snake_case avec geometry.location), tolérance GPS explicite et testée,
   codes postaux ajoutés comme signal de secours (jamais seuls), zone
   Paris intramuros basée uniquement sur le code postal (75001-75020),
   plus de boîte GPS approximative pour Paris, gestion d'erreur robuste
   du géocodage inverse.
   ========================================================================== */

(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. DONNÉES STATIQUES — Place ID officiels                          */
  /* ------------------------------------------------------------------ */

  const OFFICIAL_AIRPORTS = {
    'ChIJW89MjgM-5kcRLKZbL5jgKwQ': 'cdg',
    'ChIJHTtq-rF15kcRIoTbQ9feeJ0': 'ory',
    'ChIJLTyNDYxv5kcRbtc9TZBbD_o': 'bva'
  };

  /* ------------------------------------------------------------------ */
  /* 2. DONNÉES STATIQUES — 34 sous-destinations vérifiées              */
  /* ------------------------------------------------------------------ */

  const SUBDESTINATIONS = [
    // --- CDG (18) ---
    { id: 'ChIJj_SZMx4-5kcRzSVh0FolC6Q', airport: 'cdg', name: 'Terminal 1',
      viewport: { north: 49.01683390614591, south: 49.011953, east: 2.545545221172724, west: 2.538159579770547 } },
    { id: 'ChIJDaR_1AcW5kcR-kGpWARkm1w', airport: 'cdg', name: 'Terminal 2A',
      viewport: { north: 49.004710900000006, south: 49.00196081513466, east: 2.571628700000001, west: 2.5586625855663176 } },
    { id: 'ChIJqQdRCwgW5kcRxe85UU8S-2w', airport: 'cdg', name: 'Terminal 2B',
      viewport: { north: 49.00566005726255, south: 49.00296209667955, east: 2.5717105000000022, west: 2.5585099999999987 } },
    { id: 'ChIJE-gTDAYW5kcRWa9ryMmBycw', airport: 'cdg', name: 'Terminal 2C',
      viewport: { north: 49.0047486684882, south: 49.0020507079052, east: 2.5722150000000017, west: 2.5643199999999977 } },
    { id: 'ChIJw6_6agYW5kcRz-bjMsafL_w', airport: 'cdg', name: 'Terminal 2D',
      viewport: { north: 49.00593248491461, south: 49.00323452433162, east: 2.5722150000000017, west: 2.5644099999999983 } },
    { id: 'ChIJj5QdzhsW5kcRTrW_XrLAnIg', airport: 'cdg', name: 'Terminal 2E',
      viewport: { north: 49.004710900000006, south: 49.001419447738485, east: 2.5821251901141227, west: 2.5709028999999983 } },
    { id: 'ChIJw-ndzRsW5kcRnolxVocgcao', airport: 'cdg', name: 'Terminal 2F',
      viewport: { north: 49.006888720230435, south: 49.003738000000006, east: 2.5859082000000013, west: 2.5709028999999983 } },
    { id: 'ChIJM1g9RywW5kcRVt47FXYWGX4', airport: 'cdg', name: 'Terminal 2G',
      viewport: { north: 49.007543999999996, south: 49.00412926072922, east: 2.608185000000002, west: 2.6002792319913293 } },
    { id: 'ChIJUTDWygE-5kcRLkxzxRFN5y4', airport: 'cdg', name: 'Terminal 3 Arrivées',
      viewport: { north: 49.015511418000486, south: 49.012813457417494, east: 2.5602255127276945, west: 2.5575275521446907 } },
    { id: 'ChIJISYNXQUW5kcRIRpPBR9auFQ', airport: 'cdg', name: 'Terminal 3 Départs',
      viewport: { north: 49.01428709658828, south: 49.011589136005284, east: 2.5602137221804395, west: 2.5575157615974358 } },
    { id: 'ChIJR_Pe0x8-5kcRqAr0cYvUJlI', airport: 'cdg', name: 'Parking 1',
      viewport: { north: 49.0156417302915, south: 49.0129437697085, east: 2.542710380291502, west: 2.540012419708498 } },
    { id: 'ChIJz8CSMhs_5kcRhqcJQLd0JIk', airport: 'cdg', name: 'Parking P3',
      viewport: { north: 49.0149147302915, south: 49.0122167697085, east: 2.561697330291502, west: 2.558999369708498 } },
    { id: 'ChIJj3uicdUX5kcROQtzM4-1Tj4', airport: 'cdg', name: 'Parking AB',
      viewport: { north: 49.0047052302915, south: 49.0020072697085, east: 2.565200130291502, west: 2.562502169708498 } },
    { id: 'ChIJ63Ha0UE95kcRBZQBg7kmYzg', airport: 'cdg', name: 'Parking PCD & E-PARK',
      viewport: { north: 49.005079130291506, south: 49.00238116970851, east: 2.5696792302915017, west: 2.566981269708498 } },
    { id: 'ChIJe4n8xs0X5kcRDoXWf_M6KJE', airport: 'cdg', name: 'Parking PEF',
      viewport: { north: 49.005353830291504, south: 49.002655869708505, east: 2.576343080291502, west: 2.573645119708498 } },
    { id: 'ChIJ3aP-c4AX5kcR_24O8Y8oies', airport: 'cdg', name: 'Parking PG',
      viewport: { north: 49.006835030291505, south: 49.004137069708506, east: 2.6070116802915018, west: 2.604313719708498 } },
    { id: 'ChIJZfIa9vMV5kcR4eRm_VyHSjc', airport: 'cdg', name: 'Parking PR ECO',
      viewport: { north: 49.0091506802915, south: 49.0064527197085, east: 2.544845800000002, west: 2.5417561999999982 } },
    { id: 'ChIJYdWXOh0W5kcRJ1r4j1TW1gQ', airport: 'cdg', name: 'PX Eco',
      viewport: { north: 49.012123480631914, south: 49.009425520048914, east: 2.5755887730725955, west: 2.570286841013034 } },

    // --- Orly (9) ---
    { id: 'ChIJO0Io_9Z15kcR2M9FNAWq2Es', airport: 'ory', name: 'Orly 1',
      viewport: { north: 48.7319329529038, south: 48.7276413, east: 2.367727200000002, west: 2.3566981482819305 } },
    { id: 'ChIJbRAg2NB15kcRoIlr69cvNjY', airport: 'ory', name: 'Orly 3',
      viewport: { north: 48.730636999999994, south: 48.72603035062555, east: 2.367727200000002, west: 2.359607899999998 } },
    { id: 'ChIJe-vJNs515kcRhMvmeBNpW1E', airport: 'ory', name: 'Orly 4',
      viewport: { north: 48.732245000000006, south: 48.72676905248022, east: 2.3759056332684927, west: 2.360949999999999 } },
    { id: 'ChIJDzVMqdZ15kcR1E5wLaF6t94', airport: 'ory', name: 'P2 Parking',
      viewport: { north: 48.73177729561454, south: 48.72907933503154, east: 2.3630095914879257, west: 2.360311630904922 } },
    { id: 'ChIJKdwLGtR15kcRm13ct_A8BV0', airport: 'ory', name: 'P3 Parking',
      viewport: { north: 48.7304034802915, south: 48.7277055197085, east: 2.3642517000000014, west: 2.3615000999999984 } },
    { id: 'ChIJcYvIGc515kcR2JuEzO67Ip8', airport: 'ory', name: 'P4a Parking',
      viewport: { north: 48.730167801184585, south: 48.72746984060159, east: 2.368965624860914, west: 2.365651698660808 } },
    { id: 'ChIJezR6-tF15kcRTv6wi4IYL28', airport: 'ory', name: 'P4b Parking',
      viewport: { north: 48.73104047419552, south: 48.72834251361252, east: 2.3681126530702166, west: 2.365414692487213 } },
    { id: 'ChIJMT9r9ct15kcR6GuAP-E2S5g', airport: 'ory', name: 'P4c Parking',
      viewport: { north: 48.73246024779426, south: 48.72976228721126, east: 2.3748924685682975, west: 2.3721945079852937 } },
    { id: 'ChIJzb_CYy105kcR1eBoVBUjWQA', airport: 'ory', name: 'Parking P eco',
      viewport: { north: 48.73823867062463, south: 48.73508747968617, east: 2.369849637140511, west: 2.365951692017854 } },

    // --- Beauvais-Tillé (7) ---
    { id: 'ChIJfyMlvw8H50cRJd6-C6LhHpQ', airport: 'bva', name: 'Terminal 1 Arrivées',
      viewport: { north: 49.4605096802915, south: 49.4578117197085, east: 2.1129069802915015, west: 2.1102090197084977 } },
    { id: 'ChIJpTY6yw8H50cRAYqMhuAATkg', airport: 'bva', name: 'Terminal 1 Départs',
      viewport: { north: 49.46052703029151, south: 49.45782906970851, east: 2.1127596802915014, west: 2.1100617197084977 } },
    { id: 'ChIJuyr10g0H50cREpttULzDQdw', airport: 'bva', name: 'Terminal 2 Arrivées',
      viewport: { north: 49.46137968029149, south: 49.4586817197085, east: 2.1150945000000014, west: 2.108990299999998 } },
    { id: 'ChIJ636v1w0H50cRtKVkN3FjsUw', airport: 'bva', name: 'Terminal 2 Départs',
      viewport: { north: 49.461203580291496, south: 49.4585056197085, east: 2.1145896000000017, west: 2.1089944999999988 } },
    { id: 'ChIJX1nDrg8H50cRyXDL41Z4XM0', airport: 'bva', name: 'Parking P1',
      viewport: { north: 49.461444440457186, south: 49.458746479874186, east: 2.1124143391341383, west: 2.108689399999998 } },
    { id: 'ChIJJzvCWgwH50cRujIjuPtv2kw', airport: 'bva', name: 'Parking P2',
      viewport: { north: 49.4624339298352, south: 49.4597359692522, east: 2.118359232123731, west: 2.1146606391503293 } },
    { id: 'ChIJfywLtHQH50cROYhCTmQw46k', airport: 'bva', name: 'Parking P4',
      viewport: { north: 49.46624051453587, south: 49.46265258847313, east: 2.1265957332812686, west: 2.118345300173935 } }
  ];

  const SUBDEST_BY_ID = {};
  SUBDESTINATIONS.forEach(function (s) { SUBDEST_BY_ID[s.id] = s; });

  /* ------------------------------------------------------------------ */
  /* 3. Communes et codes postaux de secours — jamais suffisants seuls  */
  /* ------------------------------------------------------------------ */

  const FALLBACK_COMMUNES = {
    cdg: ['roissy-en-france', 'tremblay-en-france', 'mauregard', 'le mesnil-amelot', 'mesnil-amelot', 'mitry-mory'],
    ory: ['orly', 'paray-vieille-poste'],
    bva: ['tille', 'tillé']
  };

  // Codes postaux réels confirmés par le diagnostic — jamais utilisés seuls,
  // uniquement combinés à "terminal"/"aéroport", exactement comme les communes.
  const FALLBACK_POSTAL_CODES = {
    cdg: ['95700', '77990', '93290', '77290'],
    ory: ['94390', '94310', '91550'],
    bva: ['60000']
  };

  const STRONG_TEXT_CODES = { cdg: ['cdg'], ory: ['ory'], bva: ['bva'] };
  const NAME_KEYWORDS = {
    cdg: ['charles de gaulle', 'charles-de-gaulle', 'roissy'],
    ory: ['orly'],
    bva: ['beauvais', 'beauvais-tille', 'beauvais-tillé']
  };
  const TERMINAL_WORDS = ['terminal', 'aérogare', 'aerogare'];
  const AIRPORT_WORDS = ['aéroport', 'aeroport', 'airport'];

  // FAUX POSITIF RÉEL CONFIRMÉ (v5) : "Hilton Paris Charles de Gaulle
  // Airport, 8 Rue de Rome, 93290 Roissy-en-France" (vrai hôtel, à 0,6 km
  // du vrai aéroport, même commune/code postal) était classé CDG à tort —
  // son nom contient à la fois "airport" et "charles de gaulle", ce qui
  // suffisait au palier (b). Correction ciblée : si un mot d'hébergement
  // est présent, le palier (b) ne s'applique plus — aucune zone élargie,
  // juste cette exclusion précise.
  const LODGING_WORDS = ['hotel', 'hôtel', 'residence', 'résidence', 'auberge', 'motel', 'ibis', 'novotel', 'hilton', 'mercure', 'campanile', 'kyriad', 'b&b'];

  /* ------------------------------------------------------------------ */
  /* 4. Tolérance GPS — testée et codée explicitement                   */
  /*                                                                     */
  /* AVERTISSEMENT IMPORTANT, à lire avant toute modification :          */
  /* Les 34 "viewport" ci-dessus sont les cadrages d'affichage que       */
  /* Google Maps renvoie pour chaque lieu — conçus pour centrer une      */
  /* carte à l'écran, PAS des limites géographiques certifiées des       */
  /* bâtiments ou emprises réelles des terminaux. Ils n'ont fait         */
  /* l'objet d'AUCUNE vérification indépendante (aucun point réel        */
  /* d'hôtel, de route ou de commune voisine n'a été testé contre ces    */
  /* boîtes pour confirmer qu'il tombe bien à l'extérieur). C'est un     */
  /* risque résiduel connu, pas un fait vérifié.                        */
  /*                                                                     */
  /* Pourquoi 60 mètres : c'est un choix de conception raisonné, pas une */
  /* valeur mesurée sur le terrain. 60m dépasse largement l'imprécision  */
  /* GPS normale d'un smartphone à ciel ouvert (typiquement 5-15m), pour */
  /* absorber une position légèrement décalée sans pour autant risquer   */
  /* de déborder sur une route ou un bâtiment nettement séparé. Cette    */
  /* valeur n'a pas été confrontée à des coordonnées réelles de lieux    */
  /* volontairement proches (hôtels d'aéroport, axes routiers) pour      */
  /* confirmer qu'elle ne les inclut jamais par erreur.                  */
  /*                                                                     */
  /* Conséquence pratique : le Place ID (étapes 1-2 de classifyLocation) */
  /* reste la seule reconnaissance réellement fiable. Le viewport        */
  /* (étape 4) n'intervient qu'en repli, seulement si aucun Place ID ne  */
  /* correspond — mais reste, par construction, une approximation non    */
  /* certifiée.                                                          */
  /* ------------------------------------------------------------------ */

  // 60 mètres : un point à ~50m d'un viewport est reconnu (imprécision GPS
  // normale d'un téléphone), un point à ~75m ou plus ne l'est pas plus.
  const TOLERANCE_METERS = 60;
  const METERS_PER_DEGREE_LAT = 111320;

  function expandViewport(v, toleranceMeters) {
    const centerLat = (v.north + v.south) / 2;
    const latDelta = toleranceMeters / METERS_PER_DEGREE_LAT;
    const lngDelta = toleranceMeters / (METERS_PER_DEGREE_LAT * Math.cos(centerLat * Math.PI / 180));
    return {
      north: v.north + latDelta,
      south: v.south - latDelta,
      east: v.east + lngDelta,
      west: v.west - lngDelta
    };
  }

  /* ------------------------------------------------------------------ */
  /* 5. Normalisation — accents, tirets, espaces, casse                 */
  /* ------------------------------------------------------------------ */

  function normalize(str) {
    if (!str) return '';
    return str.toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function containsAny(haystack, needles) {
    return needles.some(function (n) { return haystack.indexOf(normalize(n)) !== -1; });
  }

  function containsWholeWord(haystack, word) {
    const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    return re.test(haystack);
  }

  /* ------------------------------------------------------------------ */
  /* 6. Normalisation des formats Google réels                          */
  /*    Accepte à la fois :                                             */
  /*    - Places API (New)  : id, displayName, formattedAddress,        */
  /*      location.lat()/lng() (fonctions), types, addressComponents    */
  /*    - Geocoder classique : place_id, formatted_address,             */
  /*      geometry.location.lat()/lng() (fonctions), address_components */
  /* ------------------------------------------------------------------ */

  function extractLatLng(loc) {
    if (!loc) return null;
    const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
    const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;
    return { lat: lat, lng: lng };
  }

  function normalizeAddressComponents(comps) {
    if (!Array.isArray(comps)) return null;
    return comps.map(function (c) {
      return {
        longText: c.longText || c.long_name || null,
        shortText: c.shortText || c.short_name || null,
        types: c.types || []
      };
    });
  }

  // Ne dépend pas du code postal affiché dans formatted_address : Google
  // peut afficher seulement « Chantilly, France » tout en fournissant les
  // composants administratifs. Accepte les formats Places ancien/nouveau.
  function detectDepartement(placeData, rawText) {
    const place = placeData || {};
    const components = normalizeAddressComponents(
      Array.isArray(place.address_components) && place.address_components.length
        ? place.address_components : place.addressComponents
    ) || [];
    const postal = components.find(function (c) {
      return c.types.indexOf('postal_code') !== -1;
    });
    if (postal) {
      const code = [postal.shortText, postal.longText].find(function (value) {
        return /^\d{5}$/.test(value || '');
      });
      if (code) return code.substring(0, 2);
    }

    const department = components.find(function (c) {
      return c.types.indexOf('administrative_area_level_2') !== -1;
    });
    const departmentCodes = {
      'oise': '60', 'aisne': '02', 'somme': '80',
      'paris': '75', 'seine et marne': '77', 'yvelines': '78',
      'essonne': '91', 'hauts de seine': '92', 'seine saint denis': '93',
      'val de marne': '94', 'val d oise': '95'
    };
    if (department) {
      const name = normalize(department.longText || department.shortText).replace(/['’]/g, ' ');
      if (Object.prototype.hasOwnProperty.call(departmentCodes, name)) return departmentCodes[name];
    }

    // Secours pour une adresse sans composants : conserver le code postal
    // textuel et la mention explicite Oise, sans confondre le Val-d'Oise.
    const text = rawText || place.rawText || place.formatted_address || place.formattedAddress || '';
    const match = String(text).match(/\b(\d{5})\b/);
    if (match) return match[1].substring(0, 2);
    const normalizedText = normalize(text).replace(/['’]/g, ' ');
    if (/\bval\s+d\s+oise\b/.test(normalizedText)) return '95';
    if (/\boise\b/.test(normalizedText)) return '60';
    return null;
  }

  function getTripZones(departData, arriveeData) {
    const departement = detectDepartement(departData);
    const departementArrivee = detectDepartement(arriveeData);
    const idfDepartments = ['75', '77', '78', '91', '92', '93', '94', '95'];
    const departure = normalizePlaceData(departData);
    const types = departure && Array.isArray(departure.types) ? departure.types : [];
    return {
      departement: departement,
      departementArrivee: departementArrivee,
      departIsAirport: ['cdg', 'ory', 'bva'].indexOf(classifyLocation(departData)) !== -1
        || types.some(function (type) {
          return ['airport', 'international_airport', 'regional_airport'].indexOf(type) !== -1;
        }),
      zoneOise: departement === '60' || departementArrivee === '60',
      // Un départ IDF seul ne suffit pas : le trajet doit être 100 % IDF.
      zoneIDF: idfDepartments.indexOf(departement) !== -1
        && idfDepartments.indexOf(departementArrivee) !== -1
    };
  }

  function normalizePlaceData(raw) {
    if (!raw) return null;

    // Geocoder classique : reconnu par geometry.location
    if (raw.geometry && raw.geometry.location) {
      return {
        placeId: raw.place_id || null,
        displayName: raw.name || null,
        formattedAddress: raw.formatted_address || null,
        location: extractLatLng(raw.geometry.location),
        types: raw.types || null,
        addressComponents: normalizeAddressComponents(raw.address_components),
        containingPlaces: raw.containingPlaces || null,
        rawText: raw.rawText || null
      };
    }

    // Format réel "extractPlaceData()" du site (reservation.html/vtc.html) :
    // lat/lng déjà aplatis en nombres (pas de geometry/location imbriqué),
    // place_id et formatted_address en snake_case. Reconnu par la présence
    // de lat/lng numériques directement sur l'objet.
    if (typeof raw.lat === 'number' && typeof raw.lng === 'number') {
      return {
        placeId: raw.place_id || null,
        displayName: raw.name || null,
        formattedAddress: raw.formatted_address || null,
        location: { lat: raw.lat, lng: raw.lng },
        types: raw.types || null,
        addressComponents: normalizeAddressComponents(raw.address_components),
        containingPlaces: raw.containingPlaces || null,
        rawText: raw.rawText || null
      };
    }

    // Places API (New) — déjà en camelCase, mais location peut être un
    // objet LatLng avec lat()/lng() en fonctions.
    return {
      placeId: raw.id || raw.placeId || null,
      displayName: raw.displayName || null,
      formattedAddress: raw.formattedAddress || null,
      location: extractLatLng(raw.location),
      types: raw.types || null,
      addressComponents: normalizeAddressComponents(raw.addressComponents),
      containingPlaces: raw.containingPlaces || null,
      rawText: raw.rawText || null
    };
  }

  /* ------------------------------------------------------------------ */
  /* 7. Correspondance viewport — 34 petits rectangles, tolérance       */
  /*    appliquée individuellement, jamais fusionnés                   */
  /* ------------------------------------------------------------------ */

  function matchViewport(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    for (let i = 0; i < SUBDESTINATIONS.length; i++) {
      const v = expandViewport(SUBDESTINATIONS[i].viewport, TOLERANCE_METERS);
      if (lat <= v.north && lat >= v.south && lng <= v.east && lng >= v.west) {
        return SUBDESTINATIONS[i].airport;
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* 8. Cascade textuelle stricte — dernier recours uniquement          */
  /* ------------------------------------------------------------------ */

  function textCascade(rawText) {
    const t = normalize(rawText);
    if (!t) return 'other';

    // Calculé en premier : un mot d'hébergement bloque TOUS les paliers
    // texte (a, a2, b, c) — "Hôtel CDG" ne doit jamais matcher le code
    // exact, exactement comme "Hilton...Airport" ne doit jamais matcher
    // le palier nom+aéroport.
    const hasLodgingWord = containsAny(t, LODGING_WORDS);
    if (hasLodgingWord) return 'other';

    // a) code exact, mot entier
    for (const airport in STRONG_TEXT_CODES) {
      if (STRONG_TEXT_CODES[airport].some(function (code) { return containsWholeWord(t, code); })) {
        return airport;
      }
    }

    // a2) "Orly 1" à "Orly 4" — signal fort et non ambigu, mais jamais "Orly" seul
    if (/\borly\s*[1-4]\b/i.test(t)) {
      return 'ory';
    }

    // b) "aéroport"/"airport" + nom de l'aéroport — jamais si un mot
    //    d'hébergement est présent (faux positif hôtel confirmé)
    const hasAirportWord = containsAny(t, AIRPORT_WORDS);
    for (const airport in NAME_KEYWORDS) {
      if (containsAny(t, NAME_KEYWORDS[airport]) && hasAirportWord) return airport;
    }

    // c) terminal/aéroport + commune de secours OU code postal de secours
    //    (jamais commune ou code postal seuls, jamais si hébergement)
    const hasTerminalWord = containsAny(t, TERMINAL_WORDS);
    if ((hasTerminalWord || hasAirportWord) && !hasLodgingWord) {
      for (const airport in FALLBACK_COMMUNES) {
        if (containsAny(t, FALLBACK_COMMUNES[airport])) return airport;
      }
      for (const airport in FALLBACK_POSTAL_CODES) {
        if (FALLBACK_POSTAL_CODES[airport].some(function (code) { return containsWholeWord(t, code); })) {
          return airport;
        }
      }
    }

    return 'other';
  }

  /* ------------------------------------------------------------------ */
  /* 9. Paris intramuros — code postal UNIQUEMENT, jamais de boîte GPS  */
  /*    approximative (exclurait mal Boulogne-Billancourt, Levallois-   */
  /*    Perret, Montreuil, Gentilly, communes limitrophes non vérifiées)*/
  /* ------------------------------------------------------------------ */

  function isParisIntramuros(placeData) {
    if (!placeData || !Array.isArray(placeData.addressComponents)) return false;
    const postal = placeData.addressComponents.find(function (c) {
      return c.types && c.types.indexOf('postal_code') !== -1;
    });
    const code = postal && (postal.shortText || postal.longText);
    return !!(code && /^750(0[1-9]|1[0-9]|20)$/.test(code));
  }

  /* ------------------------------------------------------------------ */
  /* 10b. Villes de l'Oise — CORRIGÉ (v4)                                */
  /*                                                                     */
  /* L'ancien port fidèle de detectDepartVille() (substring pur, ex.     */
  /* "rib" dans "Tribunal", "compi" dans "10 rue de Compiègne, Paris")   */
  /* produisait de vrais faux positifs. Confirmé aussi : Margny-lès-     */
  /* Compiègne (60280), Margny-aux-Cerises (60381) et Margny-sur-Matz    */
  /* (60383) sont 3 communes RÉELLES et DISTINCTES de l'Oise — une       */
  /* correspondance "margny" ne peut jamais être fiable seule.           */
  /*                                                                     */
  /* Nouvelle priorité :                                                 */
  /*   1) addressComponents.locality, correspondance EXACTE (normalisée)*/
  /*      contre le nom officiel de la commune — la plus fiable.        */
  /*   2) Secours texte SEULEMENT si aucun addressComponents disponible :*/
  /*      le nom complet doit apparaître ET le vrai code postal de       */
  /*      cette commune doit être présent dans le même texte — jamais   */
  /*      l'un sans l'autre. Sans ça, retourne null plutôt qu'un faux   */
  /*      positif (aucune ville ajoutée, aucun tarif modifié).          */
  /* ------------------------------------------------------------------ */

  const OISE_VILLES = {
    'pierrefonds': { names: ['pierrefonds'], postal: '60350' },
    'compiegne': { names: ['compiegne'], postal: '60200' },
    'margny': { names: ['margny les compiegne'], postal: '60280' },
    'thourotte': { names: ['thourotte'], postal: '60150' },
    'ribecourt': { names: ['ribecourt dreslincourt'], postal: '60170' },
    'noyon': { names: ['noyon'], postal: '60400' }
  };

  function classifyOiseCity(rawTextOrPlaceData) {
    // Objet avec addressComponents (résultat déjà normalisé ou brut) —
    // priorité à la commune officielle Google, correspondance exacte.
    const placeData = (rawTextOrPlaceData && typeof rawTextOrPlaceData === 'object')
      ? (rawTextOrPlaceData.addressComponents ? rawTextOrPlaceData : normalizePlaceData(rawTextOrPlaceData))
      : null;

    if (placeData && Array.isArray(placeData.addressComponents)) {
      const locality = placeData.addressComponents.find(function (c) {
        return c.types && (c.types.indexOf('locality') !== -1 || c.types.indexOf('postal_town') !== -1);
      });
      const localityName = locality && normalize(locality.longText || locality.shortText);
      if (localityName) {
        for (const key in OISE_VILLES) {
          if (OISE_VILLES[key].names.indexOf(localityName) !== -1) return key;
        }
        // Une commune officielle a été trouvée mais ne correspond à aucune
        // des 6 villes connues : ne jamais retomber sur le texte brut dans
        // ce cas (on sait déjà quelle est la vraie commune, ce n'est pas
        // une de nos 6 villes).
        return null;
      }
    }

    // Secours texte uniquement si aucun addressComponents exploitable.
    const rawText = (typeof rawTextOrPlaceData === 'string') ? rawTextOrPlaceData
      : (placeData && (placeData.formattedAddress || placeData.rawText)) || null;
    if (!rawText) return null;
    const t = normalize(rawText);
    for (const key in OISE_VILLES) {
      const v = OISE_VILLES[key];
      const nameMatch = v.names.some(function (n) { return t.indexOf(n) !== -1; });
      const postalMatch = containsWholeWord(t, v.postal);
      if (nameMatch && postalMatch) return key;
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* 10c. Disney — CORRIGÉ (v5)                                          */
  /*                                                                     */
  /* Ancienne version : simple substring "disney", donnait un faux      */
  /* positif sur "Disney Store, 44 Rue de Rivoli, Paris" (signalé,       */
  /* jamais corrigé sans validation — confirmé maintenant autorisé).     */
  /*                                                                     */
  /* Données réelles vérifiées (sources indépendantes multiples,        */
  /* recherche web, pas d'invention) : le site Disneyland Paris est à    */
  /* cheval sur 2 communes, toutes deux au code postal 77700 :           */
  /*   - Chessy (adresse postale officielle : "RN 34, 77700 Chessy")     */
  /*   - Coupvray (parking : "Boulevard du Parc, 77700 Coupvray")        */
  /*                                                                     */
  /* Aucun viewport GPS Disney n'a été diagnostiqué (contrairement aux   */
  /* 3 aéroports) — je reste donc sur du texte vérifiable (nom complet,  */
  /* commune, code postal), jamais une boîte GPS fabriquée.              */
  /* ------------------------------------------------------------------ */

  const DISNEY_POSTAL_CODES = ['77700'];
  const DISNEY_COMMUNES = ['chessy', 'coupvray'];

  function isDisney(rawText) {
    if (!rawText) return false;
    const t = normalize(rawText);
    // "Disneyland" (nom complet) est suffisant seul — pas d'ambiguïté
    // connue avec ce mot précis (contrairement à "Disney" seul).
    if (t.indexOf('disneyland') !== -1) return true;
    if (t.indexOf('disney') !== -1) {
      // "Disney" seul (ex. "Disney Store") n'est jamais suffisant seul —
      // exige le vrai code postal (77700) ou une des 2 communes réelles.
      if (DISNEY_POSTAL_CODES.some(function (c) { return containsWholeWord(t, c); })) return true;
      if (DISNEY_COMMUNES.some(function (c) { return t.indexOf(c) !== -1; })) return true;
      return false;
    }
    return false;
  }

  /* ------------------------------------------------------------------ */
  /* 10d. classifyLocation                                              */
  /* ------------------------------------------------------------------ */

  // Parc Astérix (Plailly, 60128) — forfait CDG <-> Parc Astérix.
  // "Astérix" seul ne suffit pas : exige "parc asterix", ou "asterix"
  // avec la commune (Plailly) ou son code postal (60128).
  function isAsterix(rawText) {
    if (!rawText) return false;
    const t = normalize(rawText);
    if (t.indexOf('parc asterix') !== -1) return true;
    if (t.indexOf('asterix') !== -1 && (t.indexOf('plailly') !== -1 || containsWholeWord(t, '60128'))) return true;
    return false;
  }

  // Commune de Plailly (60128), où se trouve le parc : une adresse de
  // Plailly qui n'est pas reconnue comme le parc ne doit jamais recevoir
  // de prix au kilomètre depuis/vers CDG -> devis (voir resolveTripPrice).
  function isPlailly(rawText) {
    if (!rawText) return false;
    const t = normalize(rawText);
    // "asterix" seul (sans le parc confirmé) est traité comme Plailly : devis, jamais de prix au km.
    return t.indexOf('plailly') !== -1 || containsWholeWord(t, '60128') || t.indexOf('asterix') !== -1;
  }

  // Coordonnées du Parc Astérix : un point à moins de 1,5 km est le parc.
  const ASTERIX_CENTRE = { lat: 49.1340, lng: 2.5713 };
  function procheAsterix(loc) {
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
    const R = 6371, rad = Math.PI / 180;
    const dLat = (loc.lat - ASTERIX_CENTRE.lat) * rad, dLng = (loc.lng - ASTERIX_CENTRE.lng) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(ASTERIX_CENTRE.lat * rad) * Math.cos(loc.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a)) < 1.5;
  }

  function classifyLocation(rawPlaceData) {
    const placeData = normalizePlaceData(rawPlaceData);
    if (!placeData) return 'other';

    // 1. Place ID officiel de l'aéroport
    if (placeData.placeId && OFFICIAL_AIRPORTS[placeData.placeId]) {
      return OFFICIAL_AIRPORTS[placeData.placeId];
    }

    // 2. Place ID des 34 sous-destinations vérifiées
    if (placeData.placeId && SUBDEST_BY_ID[placeData.placeId]) {
      return SUBDEST_BY_ID[placeData.placeId].airport;
    }

    // Détection hébergement — calculée ICI, AVANT containingPlaces et le
    // viewport (pas seulement avant le viewport comme précédemment).
    // Combine le vrai type Google "lodging" ET le nom/l'adresse du lieu —
    // un hôtel identifié par son seul nom (ex. "Hilton...Airport"), sans
    // que le type "lodging" ait été renvoyé ou demandé, doit être détecté
    // tout autant qu'un hôtel typé explicitement.
    const lodgingNameText = normalize([placeData.displayName, placeData.formattedAddress].filter(Boolean).join(' '));
    const isLodging = (Array.isArray(placeData.types) && placeData.types.indexOf('lodging') !== -1)
      || containsAny(lodgingNameText, LODGING_WORDS);

    // Parc Astérix (y compris ses hôtels), reconnu par le nom ou l'adresse.
    const texteAsterix = [placeData.rawText, placeData.displayName, placeData.formattedAddress].filter(Boolean).join(' ');
    if (isAsterix(texteAsterix) || procheAsterix(placeData.location)) return 'asterix';
    if (isPlailly(texteAsterix)) return 'plailly';

    // 3. containingPlaces, uniquement si déjà fourni (jamais d'appel
    //    supplémentaire) — jamais si hébergement détecté.
    if (!isLodging && Array.isArray(placeData.containingPlaces)) {
      for (let i = 0; i < placeData.containingPlaces.length; i++) {
        const cp = placeData.containingPlaces[i];
        if (cp && cp.id && OFFICIAL_AIRPORTS[cp.id]) return OFFICIAL_AIRPORTS[cp.id];
      }
    }

    // 4. Coordonnées dans l'un des 34 viewports vérifiés (tolérance incluse)
    if (placeData.location && !isLodging) {
      const byViewport = matchViewport(placeData.location.lat, placeData.location.lng);
      if (byViewport) return byViewport;
    }

    // 5. Reconnaissance textuelle stricte, sur texte brut + nom + adresse
    //    — jamais si hébergement déjà détecté ci-dessus. Pour un
    //    hébergement, seul le code postal précis (addressComponents)
    //    confirme Paris — pas de repli texte "paris"/"750" ici, pour
    //    éviter qu'un nom d'hôtel du type "Hilton Paris CDG Airport"
    //    ne déclenche "paris" par coïncidence de nom.
    if (isLodging) return isParisIntramuros(placeData) ? 'paris' : 'other';
    const combined = [placeData.rawText, placeData.displayName, placeData.formattedAddress]
      .filter(Boolean).join(' ');
    const byText = textCascade(combined);
    if (byText !== 'other') return byText;

    // 6. Paris intramuros, seulement après exclusion des 3 aéroports.
    //    UNIQUEMENT via le code postal réel (addressComponents,
    //    75001-75020) — plus de repli texte "paris"/"750" (retiré sur
    //    demande explicite : la page appelante doit désormais fournir
    //    les composants d'adresse Google, pour la sélection Autocomplete,
    //    la saisie manuelle géocodée et la géolocalisation).
    if (isParisIntramuros(placeData)) return 'paris';

    return 'other';
  }

  /* ------------------------------------------------------------------ */
  /* 11. classifyByGeolocation — bouton géolocalisation (lat/lng bruts) */
  /*     Le géocodage inverse est protégé : un échec ne provoque jamais */
  /*     d'erreur JavaScript non gérée.                                 */
  /* ------------------------------------------------------------------ */

  async function classifyByGeolocation(lat, lng, reverseGeocodeFn) {
    // Le géocodage inverse passe D'ABORD quand il est disponible — il
    // fournit un nom/type que classifyLocation() peut vérifier (y compris
    // l'exclusion hébergement) avant de faire confiance à la position.
    // Se contenter du viewport en premier empêchait cette vérification
    // même quand elle était possible.
    if (typeof reverseGeocodeFn === 'function') {
      try {
        const rawPlaceData = await reverseGeocodeFn(lat, lng);
        if (rawPlaceData) {
          if (!rawPlaceData.location && !(rawPlaceData.geometry && rawPlaceData.geometry.location)) {
            rawPlaceData.location = { lat: lat, lng: lng };
          }
          return classifyLocation(rawPlaceData);
        }
      } catch (e) {
        // Géocodage inverse indisponible : repli sur le viewport seul ci-dessous.
      }
    }

    // LIMITE CONNUE ET NON RÉSOLUE : sans géocodage inverse (ou s'il a
    // échoué), il n'existe aucun nom/type à vérifier — un hôtel dont les
    // coordonnées tombent dans la marge de tolérance d'un viewport sera
    // ici classé comme aéroport, faute de moyen de le distinguer.
    return matchViewport(lat, lng) || 'other';
  }

  /* ------------------------------------------------------------------ */
  /* 12. classifyManualText — texte saisi sans sélection Google          */
  /*     Un seul géocodage possible, jamais de boucle, le secours       */
  /*     textuel strict n'est jamais accidentellement court-circuité.   */
  /* ------------------------------------------------------------------ */

  async function classifyManualText(rawText, geocodeFn) {
    if (typeof geocodeFn === 'function') {
      let rawPlaceData = null;
      try {
        rawPlaceData = await geocodeFn(rawText);
      } catch (e) {
        rawPlaceData = null;
      }
      if (rawPlaceData) {
        rawPlaceData.rawText = rawText;
        const result = classifyLocation(rawPlaceData);
        if (result !== 'other') return result;
        return 'other';
      }
    }
    // Géocodage indisponible ou échoué : secours textuel direct, jamais ignoré
    const parTexte = textCascade(rawText);
    if (parTexte === 'other' && isAsterix(rawText)) return 'asterix';
    if (parTexte === 'other' && isPlailly(rawText)) return 'plailly';
    return parTexte;
  }

  /* ------------------------------------------------------------------ */
  /* 13. Persistance des données Google — invalidées si édition manuelle*/
  /* ------------------------------------------------------------------ */

  function createLocationState() {
    return { placeId: null, displayName: null, formattedAddress: null, location: null, types: null, addressComponents: null, containingPlaces: null, rawText: null };
  }

  function setFromPlace(state, rawPlace, rawText) {
    const p = normalizePlaceData(rawPlace) || {};
    state.placeId = p.placeId || null;
    state.displayName = p.displayName || null;
    state.formattedAddress = p.formattedAddress || null;
    state.location = p.location || null;
    state.types = p.types || null;
    state.addressComponents = p.addressComponents || null;
    state.containingPlaces = p.containingPlaces || null;
    state.rawText = rawText || null;
    return state;
  }

  function clearOnManualEdit(state) {
    state.placeId = null; state.displayName = null; state.formattedAddress = null;
    state.location = null; state.types = null; state.addressComponents = null;
    state.containingPlaces = null; state.rawText = null;
    return state;
  }

  /* ==================================================================== */
  /* TARIFICATION — strictement séparée de la classification.             */
  /* Montants identiques, vérifiés sur les 4 pages (reservation.html,     */
  /* en/reservation.html, vtc.html, en/vtc.html) avant recopie ici.       */
  /* ==================================================================== */

  const FORFAITS_OISE = {
    'pierrefonds': { 'cdg': { 'eco': 100, 'berline': 125, 'van': 150 }, 'ory': { 'eco': 185, 'berline': 225, 'van': 270 }, 'bva': { 'eco': 135, 'berline': 165, 'van': 200 }, 'disney': { 'eco': 145, 'berline': 180, 'van': 215 } },
    'compiegne': { 'cdg': { 'eco': 110, 'berline': 135, 'van': 165 }, 'ory': { 'eco': 170, 'berline': 210, 'van': 245 }, 'bva': { 'eco': 110, 'berline': 135, 'van': 165 }, 'disney': { 'eco': 150, 'berline': 185, 'van': 220 } },
    'margny': { 'cdg': { 'eco': 110, 'berline': 135, 'van': 165 }, 'ory': { 'eco': 170, 'berline': 210, 'van': 245 }, 'bva': { 'eco': 110, 'berline': 135, 'van': 165 }, 'disney': { 'eco': 150, 'berline': 185, 'van': 220 } },
    'thourotte': { 'cdg': { 'eco': 130, 'berline': 160, 'van': 195 }, 'ory': { 'eco': 190, 'berline': 235, 'van': 275 }, 'bva': { 'eco': 130, 'berline': 155, 'van': 190 }, 'disney': { 'eco': 190, 'berline': 235, 'van': 275 } },
    'ribecourt': { 'cdg': { 'eco': 130, 'berline': 160, 'van': 195 }, 'ory': { 'eco': 190, 'berline': 235, 'van': 275 }, 'bva': { 'eco': 130, 'berline': 155, 'van': 190 }, 'disney': { 'eco': 190, 'berline': 235, 'van': 275 } },
    'noyon': { 'cdg': { 'eco': 150, 'berline': 185, 'van': 220 }, 'ory': { 'eco': 205, 'berline': 250, 'van': 300 }, 'bva': { 'eco': 150, 'berline': 180, 'van': 215 }, 'disney': { 'eco': 205, 'berline': 250, 'van': 295 } }
  };

  const FORFAITS_PARIS = {
    'paris-paris': { 'eco': 45, 'berline': 60, 'van': 70 },
    'paris-ory': { 'eco': 50, 'berline': 80, 'van': 90 },
    'paris-cdg': { 'eco': 60, 'berline': 90, 'van': 100 },
    'paris-disney': { 'eco': 75, 'berline': 100, 'van': 110 },
    'ory-cdg': { 'eco': 80, 'berline': 100, 'van': 110 },
    'ory-disney': { 'eco': 75, 'berline': 100, 'van': 110 },
    'cdg-disney': { 'eco': 70, 'berline': 100, 'van': 110 },
    'paris-bva': { 'eco': 130, 'berline': 170, 'van': 190 },
    'cdg-asterix': { 'eco': 45, 'berline': 55, 'van': 65 }
  };

  const COURSE_MIN = { 'eco': 30, 'berline': 40, 'van': 60 };
  const ATTENTE_TARIF_HORAIRE = { 'eco': 35, 'berline': 45, 'van': 60 };
  const TARIFS_KM = { 'eco': 2.00, 'berline': 2.60, 'van': 3.00 };

  function resolveForfaitFixe(classificationDepart, classificationArrivee, vehicule) {
    const a = classificationDepart, b = classificationArrivee;
    // Mêmes 8 paires que routeKey dans reservation.html (lignes 1206-1221) —
    // Disney utilise exactement le même mécanisme que Paris/aéroport,
    // ce n'est pas une étape séparée dans le vrai code.
    const pairs = [
      ['paris', 'paris', 'paris-paris'],
      ['paris', 'ory', 'paris-ory'],
      ['paris', 'cdg', 'paris-cdg'],
      ['paris', 'bva', 'paris-bva'],
      ['ory', 'cdg', 'ory-cdg'],
      ['paris', 'disney', 'paris-disney'],
      ['ory', 'disney', 'ory-disney'],
      ['cdg', 'disney', 'cdg-disney'],
      ['cdg', 'asterix', 'cdg-asterix']
    ];
    for (let i = 0; i < pairs.length; i++) {
      const x = pairs[i][0], y = pairs[i][1], key = pairs[i][2];
      if ((a === x && b === y) || (a === y && b === x)) {
        if (FORFAITS_PARIS[key] && FORFAITS_PARIS[key][vehicule] !== undefined) {
          return FORFAITS_PARIS[key][vehicule];
        }
      }
    }
    return null;
  }

  function resolveForfaitOise(villeOise, classificationAutreCote, vehicule) {
    if (!FORFAITS_OISE[villeOise]) return null;
    // 'disney' inclus — même mécanisme oiseDestKey que le vrai code
    // (reservation.html lignes 1230-1240), pas une étape séparée.
    if (['cdg', 'ory', 'bva', 'disney'].indexOf(classificationAutreCote) === -1) return null;
    const table = FORFAITS_OISE[villeOise][classificationAutreCote];
    if (!table || table[vehicule] === undefined) return null;
    return table[vehicule];
  }

  const VALID_VEHICULES = ['eco', 'berline', 'van'];

  function calculateKmPrice(distKm, vehicule) {
    if (VALID_VEHICULES.indexOf(vehicule) === -1) return null;
    if (typeof distKm !== 'number' || !isFinite(distKm) || distKm < 0) return null;
    let prix = distKm * TARIFS_KM[vehicule];
    if (prix < COURSE_MIN[vehicule]) prix = COURSE_MIN[vehicule];
    return prix;
  }

  // Prix final partagé par les six pages FR/EN et le serveur de paiement.
  // Ordre : forfaits -> éligibilité au km et limite de 200 km -> distance
  // du trajet et minimum de course -> attente -> aller-retour -> arrondi.
  // Le département de chaque extrémité et le statut aéroport proviennent
  // des données Google analysées par getTripZones().
  // La distance de déplacement du chauffeur n'entre jamais dans le prix.

  function resolveTripPrice(options) {
    const o = options || {};
    const vehicule = o.vehicule;

    if (VALID_VEHICULES.indexOf(vehicule) === -1) {
      return { prix: null, isForfait: false, type: 'invalide', detail: 'Véhicule inconnu', needsCorrection: true };
    }

    const departLabel = o.departIsDisney ? 'disney' : o.departClassification;
    const arriveeLabel = o.arriveeIsDisney ? 'disney' : o.arriveeClassification;

    let prix = null, isForfait = false, type = null, detail = null;

    // 1. Forfait Paris/aéroport ou aéroport-aéroport (Disney inclus)
    const forfaitFixe = resolveForfaitFixe(departLabel, arriveeLabel, vehicule);
    if (forfaitFixe !== null) {
      prix = forfaitFixe; isForfait = true; type = 'fixe';
      detail = 'Forfait fixe — prix confirmé à la réservation';
    }

    // 2. Forfait Oise/aéroport (Disney inclus), dans les deux sens
    if (prix === null) {
      if (o.departOiseVille) {
        const p = resolveForfaitOise(o.departOiseVille, arriveeLabel, vehicule);
        if (p !== null) { prix = p; isForfait = true; type = 'oise'; detail = 'Forfait fixe — prix confirmé à la réservation'; }
      } else if (o.arriveeOiseVille) {
        const p = resolveForfaitOise(o.arriveeOiseVille, departLabel, vehicule);
        if (p !== null) { prix = p; isForfait = true; type = 'oise'; detail = 'Forfait fixe — prix confirmé à la réservation'; }
      }
    }

    // 2b. CDG <-> Parc Astérix / Plailly sans forfait appliqué : jamais de
    //     prix au kilomètre sur cette liaison, toujours sur devis.
    if (prix === null) {
      const zoneAsterix = function (l) { return l === 'asterix' || l === 'plailly'; };
      if ((departLabel === 'cdg' && zoneAsterix(arriveeLabel)) || (arriveeLabel === 'cdg' && zoneAsterix(departLabel))) {
        return { prix: null, isForfait: false, type: 'devis', detail: 'Ce trajet nécessite un devis personnalisé.' };
      }
    }

    // 3. Pas de forfait : éligibilité, puis kilomètres du trajet et minimum de course.
    if (prix === null) {
      const distKm = o.distKm;
      const departement = o.departement;

      if (typeof distKm !== 'number' || !isFinite(distKm) || distKm < 0) {
        return { prix: null, isForfait: false, type: 'devis', detail: 'Distance indisponible ou invalide', needsCorrection: true };
      }

      if (distKm > 200) {
        return { prix: null, isForfait: false, type: 'devis', detail: "Trajet longue distance non calculable automatiquement — devis personnalisé" };
      }
      // Hors forfait : départ Oise, ou départ d'un aéroport vers l'Oise.
      // Une arrivée dans l'Oise seule ne suffit pas (ex. Paris -> Senlis).
      const departOise = departement === '60';
      const departAirport = o.departIsAirport === true
        || ['cdg', 'ory', 'bva'].indexOf(o.departClassification) !== -1;
      if (!departOise && !(departAirport && o.departementArrivee === '60')) {
        return { prix: null, isForfait: false, type: 'devis', detail: 'Ce trajet nécessite un devis personnalisé.' };
      }

      const kmPrice = calculateKmPrice(distKm, vehicule);
      if (kmPrice === null) {
        return { prix: null, isForfait: false, type: 'devis', detail: 'Distance ou véhicule invalide', needsCorrection: true };
      }
      prix = kmPrice;
      type = 'km';
      detail = distKm.toFixed(0) + ' km';


    }

    // 4. Attente — ABSENT (undefined/null/0) -> silencieux, pas d'attente.
    //    INVALIDE (fournie mais NaN/Infinity/négative) -> jamais ignorée
    //    silencieusement, correction requise avant d'afficher un prix.
    if (o.attenteMinutes !== undefined && o.attenteMinutes !== null && o.attenteMinutes !== 0) {
      if (typeof o.attenteMinutes !== 'number' || !isFinite(o.attenteMinutes) || o.attenteMinutes < 0) {
        return { prix: null, isForfait: false, type: 'devis', detail: "Temps d'attente invalide — vérification nécessaire", needsCorrection: true };
      }
      const tarifHoraire = ATTENTE_TARIF_HORAIRE[vehicule];
      const attentePrix = Math.round((o.attenteMinutes / 60) * tarifHoraire * 100) / 100;
      prix += attentePrix;
      detail = (detail || '') + ' + attente (' + attentePrix.toFixed(2) + '€)';
    }

    // 5. Aller-retour — prix doublé.
    // AMBIGUÏTÉ SIGNALÉE, NON RÉSOLUE ICI : dans le vrai code
    // (reservation.html), l'attente est ajoutée AVANT le doublement
    // aller-retour — donc l'attente saisie une fois est, de fait,
    // doublée elle aussi si aller-retour est coché. Je reproduis ce
    // comportement exact, sans trancher s'il s'agit du comportement
    // voulu (attente par trajet, doublée) ou d'un oubli (attente pour
    // toute la réservation, qui ne devrait pas être doublée).
    if (o.allerRetour) {
      prix = prix * 2;
      detail = (detail || '') + ' — aller-retour';
    }

    // 6. Arrondi final au 0,10€ le plus proche
    prix = Math.round(prix * 10) / 10;

    return { prix: prix, isForfait: isForfait, type: type, detail: detail };
  }

  /* ------------------------------------------------------------------ */
  /* Mise à disposition (Business, Van, First Class)                    */
  /* ------------------------------------------------------------------ */
  // Tarifs validés (nov. 2026). Codes internes conservés : 'berline' = Business.
  // Classique n'est pas proposé en mise à disposition. First Class = sur devis.
  // Nuit : de 21 h à 6 h, +10 €/h. Chaque tranche d'une heure prend le tarif
  // de son heure de début et le garde jusqu'à sa fin (ex. départ 20 h 30 :
  // 20 h 30-21 h 30 au tarif de jour, 21 h 30-22 h 30 au tarif de nuit ;
  // une tranche qui commence à 6 h 00 est au tarif de jour).
  // Kilomètres : 20 km inclus par heure réservée ; au-delà, 2 €/km en
  // Business et en Van (distinct des tarifs kilométriques des trajets).

  const MAD_TARIF_HORAIRE = {
    'berline': { 'jour': 70, 'nuit': 80 },
    'van': { 'jour': 90, 'nuit': 100 }
  };
  const MAD_DUREES = { 'berline': [3, 5, 10], 'van': [3, 5, 10], 'first': [5, 10] };
  const MAD_KM_PAR_HEURE = 20;
  const MAD_KM_SUPP_TARIF = { 'berline': 2, 'van': 2 };
  const MAD_KM_SUPP_OPTIONS = [0, 20, 50, 100];
  const MAD_NUIT_DEBUT_MIN = 21 * 60;
  const MAD_NUIT_FIN_MIN = 6 * 60;

  function isMadTrancheNuit(minuteDuJour) {
    return minuteDuJour >= MAD_NUIT_DEBUT_MIN || minuteDuJour < MAD_NUIT_FIN_MIN;
  }

  function resolveMadPrice(options) {
    const o = options || {};
    const vehicule = o.vehicule;
    const duree = Number(o.dureeHeures);
    const kmSupp = o.kmSupp === undefined || o.kmSupp === null || o.kmSupp === '' ? 0 : Number(o.kmSupp);

    if (!MAD_DUREES[vehicule]) {
      return { prix: null, type: 'invalide', needsCorrection: true, detail: 'Véhicule non proposé en mise à disposition' };
    }
    if (MAD_DUREES[vehicule].indexOf(duree) === -1) {
      return { prix: null, type: 'invalide', needsCorrection: true, detail: 'Durée non proposée pour ce véhicule' };
    }
    if (MAD_KM_SUPP_OPTIONS.indexOf(kmSupp) === -1) {
      return { prix: null, type: 'invalide', needsCorrection: true, detail: 'Kilométrage supplémentaire invalide' };
    }
    const kmInclus = duree * MAD_KM_PAR_HEURE;

    if (vehicule === 'first') {
      return { prix: null, type: 'devis', dureeHeures: duree, kmInclus: kmInclus, kmSupp: kmSupp, detail: 'First Class — sur devis' };
    }

    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(o.heureDebut || ''));
    if (!m) {
      return { prix: null, type: 'invalide', needsCorrection: true, detail: 'Heure de début invalide' };
    }
    const debutMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    const tarif = MAD_TARIF_HORAIRE[vehicule];
    let heuresJour = 0, heuresNuit = 0;
    for (let i = 0; i < duree; i++) {
      if (isMadTrancheNuit((debutMin + i * 60) % 1440)) heuresNuit++; else heuresJour++;
    }
    const prixHeures = heuresJour * tarif.jour + heuresNuit * tarif.nuit;
    const prixKmSupp = kmSupp * MAD_KM_SUPP_TARIF[vehicule];
    const prix = Math.round((prixHeures + prixKmSupp) * 10) / 10;

    return {
      prix: prix, type: 'mad', dureeHeures: duree, kmInclus: kmInclus, kmSupp: kmSupp,
      heuresJour: heuresJour, heuresNuit: heuresNuit,
      prixHeures: prixHeures, prixKmSupp: prixKmSupp
    };
  }

  /* ------------------------------------------------------------------ */
  /* Export global                                                      */
  /* ------------------------------------------------------------------ */

  global.RFCalculatorCore = {
    detectDepartement: detectDepartement,
    getTripZones: getTripZones,
    classifyLocation: classifyLocation,
    classifyByGeolocation: classifyByGeolocation,
    classifyManualText: classifyManualText,
    classifyOiseCity: classifyOiseCity,
    isDisney: isDisney,
    isAsterix: isAsterix,
    createLocationState: createLocationState,
    setFromPlace: setFromPlace,
    clearOnManualEdit: clearOnManualEdit,
    resolveForfaitFixe: resolveForfaitFixe,
    resolveForfaitOise: resolveForfaitOise,
    calculateKmPrice: calculateKmPrice,
    resolveTripPrice: resolveTripPrice,
    VALID_VEHICULES: VALID_VEHICULES,
    COURSE_MIN: COURSE_MIN,
    ATTENTE_TARIF_HORAIRE: ATTENTE_TARIF_HORAIRE,
    TARIFS_KM: TARIFS_KM,
    FORFAITS_PARIS: FORFAITS_PARIS,
    FORFAITS_OISE: FORFAITS_OISE,
    resolveMadPrice: resolveMadPrice,
    MAD_TARIF_HORAIRE: MAD_TARIF_HORAIRE,
    MAD_DUREES: MAD_DUREES,
    MAD_KM_PAR_HEURE: MAD_KM_PAR_HEURE,
    MAD_KM_SUPP_TARIF: MAD_KM_SUPP_TARIF,
    MAD_KM_SUPP_OPTIONS: MAD_KM_SUPP_OPTIONS,
    TOLERANCE_METERS: TOLERANCE_METERS,
    _internal: { OFFICIAL_AIRPORTS, SUBDESTINATIONS, matchViewport, textCascade, normalize, normalizePlaceData, extractLatLng, isParisIntramuros, expandViewport }
  };

  // Export CommonJS pour les fonctions serverless Node (ex: create-checkout.js) —
  // n'affecte jamais le chargement navigateur classique via <script src="...">,
  // qui n'exécute jamais cette branche (module est undefined dans un navigateur).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.RFCalculatorCore;
  }

})(typeof window !== 'undefined' ? window : globalThis);
