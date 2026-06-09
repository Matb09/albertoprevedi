// =============================================================
// COACHING ONLINE - Listino (fonte: Listino_AP.pdf)
// Descrizione, "adatto a chi", "cosa include" e prezzi presi dal
// listino ufficiale. I nomi dei livelli del percorso 2 sono
// riportati come nel PDF. Testo senza accenti, come il resto del sito.
// =============================================================
const COACHING_TRACKS = [
    {
        key: 'performance',
        slug: 'bodybuilding-performance',
        name: 'Bodybuilding Performance',
        tagline: 'Percorso pensato per atleti agonisti o aspiranti agonisti che vogliono prepararsi con metodo, continuita e supporto tecnico avanzato.',
        cover: 'assets/covers/BB agonistico e pre agonistico.JPG',
        coverAlt: 'Bodybuilding Performance',
        suitableFor: [
            'Preparare una gara',
            'Costruire una condizione da palco',
            'Migliorare performance, estetica e gestione del percorso',
            'Avere supporto costante nelle fasi piu delicate della preparazione'
        ],
        includes: [
            'Video call iniziale conoscitiva di 45 minuti',
            'Programma di allenamento personalizzato',
            'Piano nutrizionale personalizzato',
            'Coaching tramite WhatsApp',
            'Check settimanale ogni lunedi mattina',
            'Reperibilita 7 giorni su 7 per reali necessita',
            'Check piu frequenti in avvicinamento gara',
            'Possibilita di call pre-gara quando necessario',
            'Inserimento nel gruppo WhatsApp e accesso ai video bonus riservati ai membri del team'
        ],
        tiers: [
            { id: 'performance-3m', months: 3, name: '', priceCents: 75000, monthlyCents: 25000 },
            { id: 'performance-6m', months: 6, name: '', priceCents: 120000, monthlyCents: 20000 },
            { id: 'performance-12m', months: 12, name: '', priceCents: 220000, monthlyCents: 18300 }
        ]
    },
    {
        key: 'physique',
        slug: 'athlete-physique-coaching',
        name: 'Athlete Physique Coaching',
        tagline: 'Percorso pensato per uomini che vogliono costruire un fisico da atleta nella vita reale, senza preparazione agonistica.',
        cover: 'assets/covers/BB e fitness.jpg',
        coverAlt: 'Athlete Physique Coaching',
        suitableFor: [
            'Migliorare composizione corporea',
            'Aumentare massa muscolare',
            'Perdere grasso',
            'Sentirsi piu sicuro del proprio fisico',
            'Seguire un metodo personalizzato senza vivere da atleta agonista'
        ],
        includes: [
            'Video call iniziale conoscitiva di 45 minuti',
            'Programma di allenamento personalizzato',
            'Piano nutrizionale personalizzato',
            'Coaching tramite WhatsApp',
            'Check ogni 15 giorni',
            'Reperibilita dal lunedi mattina al giovedi ore 12:00',
            'Inserimento nel gruppo WhatsApp e accesso ai video bonus riservati ai membri del team',
            'Call extra disponibili su richiesta a pagamento'
        ],
        tiers: [
            { id: 'physique-3m', months: 3, name: 'Foundation/Start', priceCents: 60000, monthlyCents: 20000 },
            { id: 'physique-6m', months: 6, name: 'Build/Progress', priceCents: 90000, monthlyCents: 15000 },
            { id: 'physique-12m', months: 12, name: 'Season/Evolution', priceCents: 175000, monthlyCents: 14600 }
        ]
    }
];

// Lista piatta usata dal checkout: mantiene la forma legacy
// (id / trackKey / trackLabel / months / label / priceCents).
const COACHING_PLANS = COACHING_TRACKS.flatMap((track) =>
    track.tiers.map((tier) => ({
        id: tier.id,
        trackKey: track.key,
        trackLabel: track.name,
        months: tier.months,
        tierName: tier.name || '',
        label: tier.name
            ? `${track.name} - ${tier.name} - ${tier.months} mesi`
            : `${track.name} - ${tier.months} mesi`,
        priceCents: tier.priceCents
    }))
);

// Compatibilita: i vecchi link/ID continuano a funzionare puntando ai nuovi piani.
const COACHING_PLAN_ALIASES = {
    'bb-agonistico-6m': 'performance-6m',
    'bb-agonistico-12m': 'performance-12m',
    'bb-fitness-6m': 'physique-6m',
    'bb-fitness-12m': 'physique-12m'
};

const SHOP_CONFIG = {
    currency: 'EUR',
    singlePriceCents: 6990,
    bundlePricing: [
        { quantity: 3, priceCents: 14900, label: 'Pack 3 programmi' },
        { quantity: 5, priceCents: 22900, label: 'Pack 5 programmi' }
    ],
    coachingTracks: COACHING_TRACKS,
    coachingPlans: COACHING_PLANS,
    coachingPlanAliases: COACHING_PLAN_ALIASES,
    // Opzionale ma consigliato: URL base pubblico del sito (deve essere HTTPS).
    // Se lasciato vuoto, il checkout usa automaticamente l'origin della pagina corrente.
    // Esempio: 'https://www.albertoprevedi.it/'
    siteBaseUrl: 'https://albertoprevedi.vercel.app/',
    // Deploy URL dello script che crea la sessione Stripe Checkout.
    // Sostituisci questo valore quando pubblichi l'endpoint.
    checkoutApiUrl: 'https://script.google.com/macros/s/AKfycbxNB1mwyw5BhWvLQS8IG4cqfAljNTPnR7NqbQ-zpcIe3Yn4gKpgR9vNTLMZ7gcogDaT/exec'
};

function buildCoverAsset(baseName, fallback) {
    return {
        src: `assets/optimized/covers/480/${baseName}.webp`,
        srcSet: `assets/optimized/covers/480/${baseName}.webp 480w, assets/optimized/covers/960/${baseName}.webp 960w`,
        fallback,
        width: 960,
        height: 1440
    };
}

const PROGRAM_CATALOG = [
    {
        id: 'ppl-base',
        slug: 'ppl-base',
        title: 'Programma PPL Base',
        group: 'ppl',
        category: 'Push Pull Legs',
        shortDescription: 'Split su 3 giornate con progressione guidata e volumi bilanciati.',
        longDescription: 'Programma in stile Push Pull Legs pensato per crescita muscolare costante e gestione ottimale del recupero settimanale.',
        cover: buildCoverAsset('ppl', 'assets/covers/ppl.png'),
        pdf: 'assets/programs/ppl-programma.pdf'
    },
    {
        id: 'split-4-upper',
        slug: 'split-4-upper',
        title: '4 Split Enfasi Upper Body',
        group: 'split',
        category: '4 Split',
        shortDescription: 'Focus specifico su distretto upper per migliorare volumi e dettagli.',
        longDescription: 'Programma 4 split con priorita su tronco e arti superiori, mantenendo equilibrio su lower body e recupero.',
        cover: buildCoverAsset('4-split-enfasi-upper-body', 'assets/covers/4-split-enfasi-upper-body.png'),
        pdf: 'assets/programs/programma-4-split-enfasi-upper-body.pdf'
    },
    {
        id: 'split-5-296',
        slug: 'split-5-296',
        title: '5 Split Program 296',
        group: 'split',
        category: '5 Split',
        shortDescription: 'Split su 5 sedute con struttura avanzata e alta specificita.',
        longDescription: 'Programma 5 split per atleti intermedi/avanzati che desiderano incrementare densita e qualita muscolare.',
        cover: buildCoverAsset('5-split-296', 'assets/covers/5-split-296.png'),
        pdf: 'assets/programs/programma-5-split-296.pdf'
    },
    {
        id: 'split-5-299',
        slug: 'split-5-299',
        title: '5 Split Program 299',
        group: 'split',
        category: '5 Split',
        shortDescription: 'Variante 5 split con distribuzione complementare dei gruppi muscolari.',
        longDescription: 'Versione alternativa del 5 split, utile per variare stimoli e frequenze durante i diversi mesocicli.',
        cover: buildCoverAsset('5-split-299', 'assets/covers/5-split-299.png'),
        pdf: 'assets/programs/programma-5-split-299.pdf'
    },
    {
        id: 'upper-lower-base',
        slug: 'upper-lower-base',
        title: 'Upper Lower Base',
        group: 'split',
        category: '4 Split',
        shortDescription: 'Upper/Lower su 4 giornate con approccio semplice e progressivo.',
        longDescription: 'Struttura upper lower equilibrata, ottima per progressione lineare su fondamentali e complementari.',
        cover: buildCoverAsset('upper1-lower1-upper2-lower2', 'assets/covers/upper1-lower1-upper2-lower2.png'),
        pdf: 'assets/programs/upper1-lower1-upper2-lower2.pdf'
    },
    {
        id: 'upper-lower-bis',
        slug: 'upper-lower-bis',
        title: 'Upper Lower Bis',
        group: 'split',
        category: '4 Split',
        shortDescription: 'Versione bis con variazioni esercizi e gestione fatigue migliorata.',
        longDescription: 'Programma upper lower con varianti tecniche per mantenere progressione e qualita esecutiva nel medio periodo.',
        cover: buildCoverAsset('upper1-lower1-upper2-lower2-bis', 'assets/covers/upper1-lower1-upper2-lower2-bis.png'),
        pdf: 'assets/programs/upper1-lower1-upper2-lower2-bis.pdf'
    },
    {
        id: 'upper-lower-mav',
        slug: 'upper-lower-mav',
        title: 'Upper Lower MAV',
        group: 'split',
        category: '4 Split',
        shortDescription: 'Template upper/lower con logica MAV e progressione autoregolata.',
        longDescription: 'Programma upper lower con impostazione MAV, pensato per modulare carico e volume in base alla risposta individuale.',
        cover: buildCoverAsset('upper-lower-mav', 'assets/covers/upper-lower-mav.png'),
        pdf: 'assets/programs/upper1-lower1-upper2-lower2-mav.pdf'
    }
];

const PROGRAM_BY_ID = Object.fromEntries(PROGRAM_CATALOG.map((program) => [program.id, program]));
const PROGRAM_BY_SLUG = Object.fromEntries(PROGRAM_CATALOG.map((program) => [program.slug, program]));
