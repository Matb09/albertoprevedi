const CART_STORAGE_KEY = 'ap_shop_cart_v1';

let cartDropdownNode = null;
let cartTriggerNode = null;
let cartDropdownTimer = null;

function storageGetItem(key) {
    try {
        return window.localStorage.getItem(key);
    } catch (_) {
        return null;
    }
}

function storageSetItem(key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch (_) {
        // noop: localStorage non disponibile
    }
}

function storageRemoveItem(key) {
    try {
        window.localStorage.removeItem(key);
    } catch (_) {
        // noop: localStorage non disponibile
    }
}

function formatEuro(cents) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

function getProgramCover(program) {
    if (program && program.cover && typeof program.cover === 'object') {
        return program.cover;
    }

    return {
        src: program && typeof program.cover === 'string' ? program.cover : '',
        srcSet: '',
        fallback: program && typeof program.cover === 'string' ? program.cover : '',
        width: 960,
        height: 1440
    };
}

function renderResponsiveProgramImage(program, options = {}) {
    const {
        className = '',
        alt = '',
        loading = 'lazy',
        sizes = '100vw',
        fetchPriority = ''
    } = options;
    const cover = getProgramCover(program);
    const classAttr = className ? ` class="${className}"` : '';
    const srcSetAttr = cover.srcSet ? ` srcset="${cover.srcSet}" sizes="${sizes}"` : '';
    const fallbackAttr = cover.fallback ? ` data-fallback="${cover.fallback}"` : '';
    const fetchPriorityAttr = fetchPriority ? ` fetchpriority="${fetchPriority}"` : '';
    const widthAttr = cover.width ? ` width="${cover.width}"` : '';
    const heightAttr = cover.height ? ` height="${cover.height}"` : '';

    return `<img${classAttr} src="${cover.src}" alt="${alt}" loading="${loading}" decoding="async"${srcSetAttr}${fetchPriorityAttr}${fallbackAttr}${widthAttr}${heightAttr} onerror="if(this.dataset.fallback && this.dataset.fallbackApplied !== 'true'){this.dataset.fallbackApplied='true';this.src=this.dataset.fallback;this.removeAttribute('srcset');this.removeAttribute('sizes');}">`;
}

function safeParseJSON(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (_) {
        return fallback;
    }
}

function getCart() {
    const raw = storageGetItem(CART_STORAGE_KEY);
    const parsed = safeParseJSON(raw || '[]', []);
    if (!Array.isArray(parsed)) return [];

    const unique = new Map();
    parsed.forEach((item) => {
        if (!item || typeof item.id !== 'string') return;
        if (!PROGRAM_BY_ID[item.id]) return;
        if (!unique.has(item.id)) {
            unique.set(item.id, { id: item.id, qty: 1 });
        }
    });

    return Array.from(unique.values());
}

function saveCart(cart) {
    const normalized = Array.isArray(cart)
        ? cart
            .filter((item) => item && typeof item.id === 'string' && PROGRAM_BY_ID[item.id])
            .reduce((acc, item) => {
                if (!acc.some((line) => line.id === item.id)) {
                    acc.push({ id: item.id, qty: 1 });
                }
                return acc;
            }, [])
        : [];
    storageSetItem(CART_STORAGE_KEY, JSON.stringify(normalized));
    updateCartBadges();
}

function getCartCount() {
    return getCart().length;
}

function getCartLineItems() {
    return getCart()
        .map((item) => ({
            ...item,
            product: PROGRAM_BY_ID[item.id]
        }))
        .filter((item) => item.product);
}

function positionCartDropdown() {
    if (!cartDropdownNode) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
        const mobileFab = document.querySelector('[data-mobile-cart-fab].is-visible');
        cartDropdownNode.style.width = 'calc(100vw - 20px)';
        cartDropdownNode.style.left = '10px';
        cartDropdownNode.style.right = '10px';
        cartDropdownNode.style.top = 'auto';
        cartDropdownNode.style.bottom = mobileFab
            ? 'calc(4.2rem + env(safe-area-inset-bottom))'
            : '0.75rem';
        return;
    }

    cartDropdownNode.style.width = '';
    cartDropdownNode.style.right = '';
    cartDropdownNode.style.bottom = '';
    if (!cartTriggerNode) return;
    const triggerRect = cartTriggerNode.getBoundingClientRect();
    const viewportPadding = 12;
    const dropdownWidth = 340;
    const left = Math.max(
        viewportPadding,
        Math.min(triggerRect.right - dropdownWidth, window.innerWidth - dropdownWidth - viewportPadding)
    );
    cartDropdownNode.style.left = `${left}px`;
    cartDropdownNode.style.top = `${triggerRect.bottom + 10}px`;
}

function closeCartDropdown() {
    if (!cartDropdownNode || !cartTriggerNode) return;
    cartDropdownNode.classList.remove('open');
    cartTriggerNode.setAttribute('aria-expanded', 'false');
    if (cartDropdownTimer) {
        window.clearTimeout(cartDropdownTimer);
        cartDropdownTimer = null;
    }
}

function openCartDropdown(autoCloseMs = 0) {
    if (!cartDropdownNode || !cartTriggerNode) return;
    positionCartDropdown();
    cartDropdownNode.classList.add('open');
    cartTriggerNode.setAttribute('aria-expanded', 'true');
    if (cartDropdownTimer) {
        window.clearTimeout(cartDropdownTimer);
        cartDropdownTimer = null;
    }
    if (autoCloseMs > 0) {
        cartDropdownTimer = window.setTimeout(() => {
            closeCartDropdown();
        }, autoCloseMs);
    }
}

function renderCartDropdown() {
    if (!cartDropdownNode) return;

    const items = getCartLineItems();
    const totals = calculateCartTotals(items);
    if (!items.length) {
        cartDropdownNode.innerHTML = `
            <div class="cart-dropdown-header">Carrello</div>
            <p class="cart-dropdown-empty">Il carrello e vuoto.</p>
            <a class="btn btn-primary cart-dropdown-cta" href="programmi.html">Sfoglia i programmi</a>
        `;
        return;
    }

    const preview = items.slice(0, 3).map((item) => `
        <li class="cart-dropdown-item">
            ${renderResponsiveProgramImage(item.product, { alt: item.product.title, sizes: '92px' })}
            <div>
                <strong>${item.product.title}</strong>
                <span>Programma singolo</span>
            </div>
        </li>
    `).join('');
    const extraCount = items.length > 3 ? `<li class="cart-dropdown-more">+${items.length - 3} altri programmi</li>` : '';

    cartDropdownNode.innerHTML = `
        <div class="cart-dropdown-header">Carrello</div>
        <ul class="cart-dropdown-list">
            ${preview}
            ${extraCount}
        </ul>
        <div class="cart-dropdown-footer">
            <p><span>Totale</span><strong>${formatEuro(totals.totalCents)}</strong></p>
            <a class="btn btn-primary cart-dropdown-cta" href="carrello.html">Vai al carrello</a>
        </div>
    `;
}

function initCartUi() {
    if (cartDropdownNode && cartTriggerNode) return;

    cartTriggerNode = document.querySelector('.nav-cart-link');
    if (!cartTriggerNode) return;

    cartTriggerNode.setAttribute('aria-expanded', 'false');
    cartTriggerNode.setAttribute('aria-haspopup', 'dialog');

    cartDropdownNode = document.createElement('div');
    cartDropdownNode.className = 'cart-dropdown';
    cartDropdownNode.setAttribute('aria-live', 'polite');
    document.body.appendChild(cartDropdownNode);

    renderCartDropdown();

    cartTriggerNode.addEventListener('click', (event) => {
        event.preventDefault();
        if (!cartDropdownNode) return;
        const isOpen = cartDropdownNode.classList.contains('open');
        if (isOpen) {
            closeCartDropdown();
        } else {
            openCartDropdown();
        }
    });

    document.addEventListener('click', (event) => {
        if (!cartDropdownNode || !cartTriggerNode) return;
        const inDropdown = event.target.closest('.cart-dropdown');
        const inTrigger = event.target.closest('.nav-cart-link');
        if (!inDropdown && !inTrigger) {
            closeCartDropdown();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeCartDropdown();
        }
    });

    window.addEventListener('resize', () => {
        if (cartDropdownNode && cartDropdownNode.classList.contains('open')) {
            positionCartDropdown();
        }
    });

    window.addEventListener('scroll', () => {
        if (cartDropdownNode && cartDropdownNode.classList.contains('open')) {
            positionCartDropdown();
        }
    }, { passive: true });
}

function updateCartBadges() {
    const count = getCartCount();
    document.querySelectorAll('[data-cart-count]').forEach((node) => {
        node.textContent = String(count);
        node.style.display = count > 0 ? 'inline-flex' : 'none';
    });

    const mobileFab = document.querySelector('[data-mobile-cart-fab]');
    if (mobileFab) {
        const onCartPage = /\/?carrello\.html$/i.test(window.location.pathname);
        mobileFab.classList.toggle('is-visible', count > 0 && !onCartPage);
    }

    renderCartDropdown();
    updateAddToCartButtonsState();
}

function isProgramInCart(productId) {
    return getCart().some((item) => item.id === productId);
}

function updateAddToCartButtonsState() {
    const cartIds = new Set(getCart().map((item) => item.id));
    document.querySelectorAll('[data-add-to-cart]').forEach((button) => {
        const id = button.getAttribute('data-add-to-cart');
        const defaultLabel = button.getAttribute('data-add-default-label') || 'Aggiungi';
        if (cartIds.has(id)) {
            button.textContent = 'Nel carrello';
            button.disabled = true;
        } else {
            button.textContent = defaultLabel;
            button.disabled = false;
        }
    });
}

function addToCart(productId, qty = 1) {
    const product = PROGRAM_BY_ID[productId];
    if (!product) return false;

    const cart = getCart();
    const existing = cart.find((item) => item.id === productId);
    if (existing) return false;

    cart.push({ id: productId, qty: Math.max(1, qty) });

    saveCart(cart);
    return true;
}

function setCartItemQty(productId, qty) {
    const cart = getCart();
    const idx = cart.findIndex((item) => item.id === productId);
    if (idx < 0) return;

    const normalizedQty = qty > 0 ? 1 : 0;
    if (normalizedQty === 0) {
        cart.splice(idx, 1);
    } else {
        cart[idx].qty = normalizedQty;
    }

    saveCart(cart);
}

function clearCart() {
    storageRemoveItem(CART_STORAGE_KEY);
    updateCartBadges();
}

function getPricingOptions() {
    const options = [{ quantity: 1, priceCents: SHOP_CONFIG.singlePriceCents, label: 'Singolo programma' }];
    SHOP_CONFIG.bundlePricing.forEach((bundle) => {
        options.push({
            quantity: bundle.quantity,
            priceCents: bundle.priceCents,
            label: bundle.label
        });
    });
    return options.sort((a, b) => a.quantity - b.quantity);
}

function getBestBundlePlan(totalQty) {
    const options = getPricingOptions();
    const dp = new Array(totalQty + 1).fill(null).map(() => ({ cost: Infinity, plan: [] }));
    dp[0] = { cost: 0, plan: [] };

    for (let qty = 1; qty <= totalQty; qty += 1) {
        for (const option of options) {
            if (qty < option.quantity) continue;
            const prev = dp[qty - option.quantity];
            if (!Number.isFinite(prev.cost)) continue;

            const candidateCost = prev.cost + option.priceCents;
            if (candidateCost < dp[qty].cost) {
                dp[qty] = {
                    cost: candidateCost,
                    plan: [...prev.plan, option]
                };
            }
        }
    }

    const planMap = {};
    dp[totalQty].plan.forEach((step) => {
        const key = `${step.quantity}-${step.priceCents}`;
        if (!planMap[key]) {
            planMap[key] = { ...step, count: 0 };
        }
        planMap[key].count += 1;
    });

    return {
        totalCents: dp[totalQty].cost,
        breakdown: Object.values(planMap).sort((a, b) => b.quantity - a.quantity)
    };
}

function calculateCartTotals(cart) {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalCents = totalQty * SHOP_CONFIG.singlePriceCents;

    if (totalQty === 0) {
        return {
            totalQty,
            subtotalCents: 0,
            discountCents: 0,
            totalCents: 0,
            bundleBreakdown: []
        };
    }

    const bestPlan = getBestBundlePlan(totalQty);
    return {
        totalQty,
        subtotalCents,
        discountCents: Math.max(0, subtotalCents - bestPlan.totalCents),
        totalCents: bestPlan.totalCents,
        bundleBreakdown: bestPlan.breakdown
    };
}

const LISTING_FILTER_SECTIONS = {
    categoria: {
        key: 'categoria',
        filters: {
            ppl: {
                key: 'ppl',
                match: (program) => program.group === 'ppl'
            },
            split: {
                key: 'split',
                match: (program) => program.group === 'split'
            }
        }
    }
};

const LISTING_FILTERS = Object.values(LISTING_FILTER_SECTIONS)
    .reduce((acc, section) => ({ ...acc, ...section.filters }), {});
const LISTING_FILTER_KEYS = Object.keys(LISTING_FILTERS);
let selectedListingFilterKeys = new Set(LISTING_FILTER_KEYS);

function getListingFiltersFromSearch(search) {
    const params = new URLSearchParams(search || '');
    const keys = [];

    const tipo = (params.get('tipo') || '').toLowerCase();
    if (LISTING_FILTERS[tipo]) keys.push(tipo);

    const tipi = (params.get('tipi') || '').toLowerCase();
    if (tipi) {
        tipi.split(',').forEach((key) => {
            const normalized = key.trim();
            if (LISTING_FILTERS[normalized]) {
                keys.push(normalized);
            }
        });
    }

    return new Set([...new Set(keys)]);
}

function getSelectedListingFilters() {
    return new Set(selectedListingFilterKeys);
}

function buildListingFiltersQuery(selectedSet) {
    const values = [...selectedSet].filter((key) => LISTING_FILTERS[key]);
    if (values.length === 1) {
        return `tipo=${encodeURIComponent(values[0])}`;
    }
    if (values.length > 1 && values.length < LISTING_FILTER_KEYS.length) {
        return `tipi=${encodeURIComponent(values.join(','))}`;
    }
    return '';
}

function syncListingFiltersInUrl(selectedSet) {
    const url = new URL(window.location.href);
    const query = buildListingFiltersQuery(selectedSet);

    url.searchParams.delete('tipo');
    url.searchParams.delete('tipi');
    if (query) {
        const nextParams = new URLSearchParams(query);
        nextParams.forEach((value, key) => {
            url.searchParams.set(key, value);
        });
    }

    window.history.replaceState({}, '', url);
}

function updateListingFilterCheckboxes(selectedSet) {
    document.querySelectorAll('[data-listing-filter-checkbox]').forEach((checkbox) => {
        const key = (checkbox.getAttribute('data-listing-filter-checkbox') || '').toLowerCase();
        checkbox.checked = selectedSet.has(key);
    });
}

function readListingFilterCheckboxes() {
    const next = new Set();
    document.querySelectorAll('[data-listing-filter-checkbox]').forEach((checkbox) => {
        const key = (checkbox.getAttribute('data-listing-filter-checkbox') || '').toLowerCase();
        if (checkbox.checked && LISTING_FILTERS[key]) {
            next.add(key);
        }
    });
    return next;
}

function initListingFilterControls() {
    const controls = document.getElementById('shop-filter-controls');
    const fromSearch = getListingFiltersFromSearch(window.location.search);
    const initial = fromSearch.size ? fromSearch : new Set(LISTING_FILTER_KEYS);
    selectedListingFilterKeys = new Set(initial);
    syncListingFiltersInUrl(initial);
    if (!controls) return;

    updateListingFilterCheckboxes(initial);

    controls.addEventListener('change', (event) => {
        const checkbox = event.target.closest('[data-listing-filter-checkbox]');
        if (!checkbox) return;

        const next = readListingFilterCheckboxes();
        selectedListingFilterKeys = next;
        syncListingFiltersInUrl(next);
        updateListingFilterCheckboxes(next);
        renderListingPage();
    });
}

function buildProgramDetailUrl(programSlug, selectedSet) {
    const query = buildListingFiltersQuery(selectedSet);
    return `programma.html?slug=${encodeURIComponent(programSlug)}${query ? `&${query}` : ''}`;
}

function renderListingPage() {
    const grid = document.getElementById('shop-listing-grid');
    if (!grid) return;

    const selectedSet = getSelectedListingFilters();
    const cartIds = new Set(getCart().map((item) => item.id));
    const programs = selectedSet.size > 0
        ? PROGRAM_CATALOG.filter((program) => selectedSet.has(program.group))
        : PROGRAM_CATALOG;
    updateListingFilterCheckboxes(selectedSet);

    if (!programs.length) {
        grid.innerHTML = `
            <div class="shop-empty-state">
                <h2>Nessun programma disponibile</h2>
                <p>La tipologia selezionata non ha risultati al momento.</p>
                <a class="btn btn-primary" href="programmi.html">Mostra catalogo completo</a>
            </div>
        `;
        return;
    }

    grid.innerHTML = programs.map((program) => {
        const inCart = cartIds.has(program.id);
        return `
        <article class="shop-card reveal visible">
            <a href="${buildProgramDetailUrl(program.slug, selectedSet)}" class="shop-card-cover-link" aria-label="${program.title}">
                ${renderResponsiveProgramImage(program, { className: 'shop-card-cover', alt: `Copertina ${program.title}`, sizes: '(min-width: 1200px) 360px, (min-width: 768px) 45vw, 100vw' })}
            </a>
            <div class="shop-card-body">
                <p class="shop-card-category">${program.category}</p>
                <h3>${program.title}</h3>
                <p>${program.shortDescription}</p>
                <div class="shop-price-row">
                    <span class="shop-price">${formatEuro(SHOP_CONFIG.singlePriceCents)}</span>
                    <span class="shop-price-note">prezzo singolo</span>
                </div>
                <div class="shop-card-actions">
                    <a class="btn btn-outline" href="${buildProgramDetailUrl(program.slug, selectedSet)}">Dettagli</a>
                    <button class="btn btn-primary" data-add-to-cart="${program.id}" data-add-default-label="Aggiungi" type="button" ${inCart ? 'disabled' : ''}>${inCart ? 'Nel carrello' : 'Aggiungi'}</button>
                </div>
            </div>
        </article>
    `;
    }).join('');
}

function renderProgramPage() {
    const wrapper = document.getElementById('program-pdp');
    if (!wrapper) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || '';
    const selectedSet = getListingFiltersFromSearch(window.location.search);
    const listingQuery = buildListingFiltersQuery(selectedSet);
    const listingUrl = listingQuery ? `programmi.html?${listingQuery}` : 'programmi.html';
    const program = PROGRAM_BY_SLUG[slug];
    const backLink = document.getElementById('program-back-link');
    if (backLink) {
        backLink.href = listingUrl;
    }

    if (!program) {
        wrapper.innerHTML = `
            <div class="shop-empty-state">
                <h2>Programma non trovato</h2>
                <p>Controlla il link o torna al catalogo.</p>
                <a class="btn btn-primary" href="${listingUrl}">Torna al listing</a>
            </div>
        `;
        return;
    }

    document.title = `${program.title} | Alberto Prevedi`;
    const inCart = isProgramInCart(program.id);

    wrapper.innerHTML = `
        <article class="pdp-layout reveal">
            <div class="pdp-media">
                ${renderResponsiveProgramImage(program, { alt: `Copertina ${program.title}`, loading: 'eager', fetchPriority: 'high', sizes: '(min-width: 992px) 420px, 100vw' })}
            </div>
            <div class="pdp-content">
                <p class="shop-card-category">${program.category}</p>
                <h1>${program.title}</h1>
                <p class="pdp-description">${program.longDescription}</p>

                <ul class="pdp-features">
                    <li>Formato digitale PDF</li>
                    <li>Accesso immediato post acquisto</li>
                    <li>Compatibile con acquisto multiplo e pack scontati</li>
                </ul>

                <div class="pdp-price-box">
                    <span class="shop-price">${formatEuro(SHOP_CONFIG.singlePriceCents)}</span>
                    <span class="shop-price-note">Programma singolo</span>
                </div>

                <div class="pdp-actions">
                    <button class="btn btn-primary" data-add-to-cart="${program.id}" data-add-default-label="Aggiungi al carrello" type="button" ${inCart ? 'disabled' : ''}>${inCart ? 'Nel carrello' : 'Aggiungi al carrello'}</button>
                </div>

                <p class="pdp-meta-note">Sconti automatici in carrello: 3 programmi a ${formatEuro(14900)} e 5 programmi a ${formatEuro(22900)}.</p>
            </div>
        </article>
    `;
}

function normalizeCheckoutBaseUrl(value) {
    const text = String(value || '').trim();
    if (!text) return '';

    let parsed;
    try {
        parsed = new URL(text);
    } catch (_) {
        throw new Error('SHOP_CONFIG.siteBaseUrl non valida. Inserisci una URL HTTPS completa.');
    }

    if (parsed.protocol !== 'https:') {
        throw new Error('SHOP_CONFIG.siteBaseUrl deve usare HTTPS.');
    }

    if (!parsed.pathname.endsWith('/')) {
        parsed.pathname = `${parsed.pathname}/`;
    }

    return parsed.toString();
}

function getCheckoutBaseUrl() {
    const configuredBaseUrl = normalizeCheckoutBaseUrl(SHOP_CONFIG.siteBaseUrl);
    if (configuredBaseUrl) {
        return configuredBaseUrl;
    }

    const current = new URL(window.location.href);
    if (current.protocol === 'file:') {
        throw new Error(
            'Checkout non disponibile da file locale. Avvia un server HTTP (esempio: "python -m http.server 8080") o imposta SHOP_CONFIG.siteBaseUrl.'
        );
    }
    if (current.protocol !== 'https:') {
        throw new Error(
            'Checkout richiede URL di ritorno HTTPS. Imposta SHOP_CONFIG.siteBaseUrl con il dominio pubblico HTTPS del sito.'
        );
    }

    return new URL('.', current).toString();
}

function getCheckoutUrls(orderType) {
    const baseUrl = getCheckoutBaseUrl();
    const successUrl = new URL('checkout-success.html', baseUrl);
    const cancelUrl = new URL('checkout-cancel.html', baseUrl);
    successUrl.searchParams.set('order_type', orderType || 'program');
    cancelUrl.searchParams.set('order_type', orderType || 'program');
    return {
        successUrl: successUrl.toString(),
        cancelUrl: cancelUrl.toString()
    };
}

function getCoachingPlanByMonths(months) {
    const normalizedMonths = parseInt(months, 10);
    if (!Array.isArray(SHOP_CONFIG.coachingPlans)) return null;
    return SHOP_CONFIG.coachingPlans.find((plan) => plan.months === normalizedMonths) || null;
}

function normalizeCheckoutPrivacy(rawPrivacy) {
    const privacy = rawPrivacy && typeof rawPrivacy === 'object' ? rawPrivacy : {};
    const accepted = privacy.accepted === true;

    return {
        accepted,
        acceptedAt: accepted ? String(privacy.acceptedAt || '').slice(0, 64) : '',
        policyVersion: String(privacy.policyVersion || '').slice(0, 40)
    };
}

function buildProgramCheckoutPayload(cart, customer, privacy) {
    const totals = calculateCartTotals(cart);
    const items = cart
        .map((item) => {
            const program = PROGRAM_BY_ID[item.id];
            if (!program) return null;
            return {
                id: program.id,
                title: program.title,
                quantity: item.qty,
                unitPriceCents: SHOP_CONFIG.singlePriceCents
            };
        })
        .filter(Boolean);

    const urls = getCheckoutUrls('program');

    return {
        orderType: 'program',
        currency: SHOP_CONFIG.currency,
        customer,
        privacy: normalizeCheckoutPrivacy(privacy),
        items,
        pricing: {
            subtotalCents: totals.subtotalCents,
            discountCents: totals.discountCents,
            totalCents: totals.totalCents,
            totalQuantity: totals.totalQty,
            bundleBreakdown: totals.bundleBreakdown.map((item) => ({
                quantity: item.quantity,
                count: item.count,
                label: item.label,
                priceCents: item.priceCents
            }))
        },
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl
    };
}

function buildCoachingCheckoutPayload(plan, customer, privacy) {
    const urls = getCheckoutUrls('coaching');
    return {
        orderType: 'coaching',
        currency: SHOP_CONFIG.currency,
        customer,
        privacy: normalizeCheckoutPrivacy(privacy),
        coaching: {
            id: plan.id,
            months: plan.months,
            label: plan.label,
            priceCents: plan.priceCents
        },
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl
    };
}

function collectCheckoutCustomer(form) {
    const getValue = (name) => String((form.elements[name] && form.elements[name].value) || '').trim();
    return {
        nome: getValue('nome'),
        cognome: getValue('cognome'),
        indirizzo: getValue('indirizzo'),
        citta: getValue('citta'),
        provincia: getValue('provincia').toUpperCase(),
        cap: getValue('cap'),
        email: getValue('email').toLowerCase(),
        cell: getValue('cell'),
        cfPiva: getValue('cf_piva')
    };
}

function validateCheckoutCustomer(customer, privacyChecked) {
    const requiredFields = [
        ['nome', 'Inserisci il nome.'],
        ['cognome', 'Inserisci il cognome.'],
        ['indirizzo', 'Inserisci l\'indirizzo di residenza.'],
        ['citta', 'Inserisci la citta.'],
        ['provincia', 'Inserisci la provincia.'],
        ['cap', 'Inserisci il CAP.'],
        ['email', 'Inserisci l\'email.'],
        ['cell', 'Inserisci il cellulare.'],
        ['cfPiva', 'Inserisci CF o Partita IVA.']
    ];

    for (const [field, message] of requiredFields) {
        if (!customer[field]) {
            return message;
        }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
        return 'Email non valida.';
    }

    if (!/^[0-9]{5}$/.test(customer.cap)) {
        return 'CAP non valido (usa 5 cifre).';
    }

    if (!/^[A-Za-z]{2}$/.test(customer.provincia)) {
        return 'Provincia non valida (usa 2 lettere).';
    }

    const digitsPhone = customer.cell.replace(/\D/g, '');
    if (digitsPhone.length < 8) {
        return 'Numero di cellulare non valido.';
    }

    if (customer.cfPiva.replace(/\s+/g, '').length < 11) {
        return 'CF o Partita IVA non valido.';
    }

    if (!privacyChecked) {
        return 'Devi accettare informativa privacy e termini di vendita per proseguire.';
    }

    return '';
}

async function createCheckoutSession(payload) {
    if (!SHOP_CONFIG.checkoutApiUrl || SHOP_CONFIG.checkoutApiUrl === 'YOUR_CHECKOUT_API_URL_HERE') {
        throw new Error('Checkout API non configurata. Inserisci checkoutApiUrl in js/shop-data.js');
    }

    let response;
    try {
        response = await fetch(SHOP_CONFIG.checkoutApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(payload)
        });
    } catch (_) {
        throw new Error('Richiesta checkout bloccata dal browser o dalla rete. Apri il sito da URL HTTP/HTTPS e verifica CORS.');
    }

    if (!response.ok) {
        if (response.status === 403) {
            throw new Error('Checkout API 403: endpoint Apps Script non pubblico. Pubblica Web App con accesso "Anyone" e usa URL /exec.');
        }

        const text = await response.text();
        const plainText = text
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (/access|denied|permission|forbidden|acceso/i.test(plainText)) {
            throw new Error('Accesso negato alla Checkout API. Controlla i permessi del deploy Apps Script.');
        }

        throw new Error(plainText.slice(0, 220) || `Errore creazione checkout (${response.status})`);
    }

    const data = await response.json();
    if (data && data.error) {
        throw new Error(String(data.error).slice(0, 220));
    }

    if (!data || !data.url) {
        throw new Error('Risposta checkout non valida');
    }

    return data.url;
}

function renderCartPage() {
    const wrapper = document.getElementById('cart-page');
    if (!wrapper) return;

    const cart = getCart();
    const totals = calculateCartTotals(cart);
    const items = cart
        .map((item) => ({ ...item, product: PROGRAM_BY_ID[item.id] }))
        .filter((item) => item.product);

    if (!items.length) {
        wrapper.innerHTML = `
            <div class="shop-empty-state">
                <h1>Il carrello e vuoto</h1>
                <p>Aggiungi almeno un programma per proseguire al checkout.</p>
                <a class="btn btn-primary cart-empty-cta" href="programmi.html">Vai al listing programmi</a>
            </div>
        `;
        return;
    }

    wrapper.innerHTML = `
        <div class="cart-layout">
            <section class="cart-items">
                <h1>Carrello</h1>
                <p class="cart-subtitle">Gestisci i tuoi programmi prima del checkout.</p>
                <div class="cart-item-list">
                    ${items.map((item) => `
                        <article class="cart-item">
                            ${renderResponsiveProgramImage(item.product, { alt: item.product.title, sizes: '92px' })}
                            <div class="cart-item-main">
                                <p class="shop-card-category">${item.product.category}</p>
                                <h3>${item.product.title}</h3>
                                <p>${formatEuro(SHOP_CONFIG.singlePriceCents)} cad.</p>
                            </div>
                            <div class="cart-item-controls">
                                <span>1</span>
                                <button type="button" class="cart-remove" data-cart-remove="${item.product.id}">Rimuovi</button>
                            </div>
                        </article>
                    `).join('')}
                </div>
            </section>

            <aside class="cart-summary">
                <h2>Riepilogo</h2>
                <div class="cart-summary-row"><span>Programmi</span><strong>${totals.totalQty}</strong></div>
                <div class="cart-summary-row"><span>Subtotale</span><strong>${formatEuro(totals.subtotalCents)}</strong></div>
                <div class="cart-summary-row"><span>Sconto pack</span><strong>- ${formatEuro(totals.discountCents)}</strong></div>
                <div class="cart-summary-row cart-total"><span>Totale</span><strong>${formatEuro(totals.totalCents)}</strong></div>
                <button type="button" id="cart-checkout-btn" class="btn btn-primary">Inserisci dati e procedi</button>
                <a class="btn btn-outline" href="programmi.html">Continua acquisti</a>
                <p id="checkout-feedback" class="checkout-feedback" aria-live="polite"></p>
            </aside>
        </div>
    `;

    wrapper.querySelectorAll('[data-cart-remove]').forEach((button) => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-cart-remove');
            setCartItemQty(id, 0);
            renderCartPage();
        });
    });

    const checkoutBtn = document.getElementById('cart-checkout-btn');
    const feedback = document.getElementById('checkout-feedback');

    checkoutBtn.addEventListener('click', () => {
        checkoutBtn.disabled = true;
        feedback.textContent = '';
        feedback.classList.remove('is-visible');
        window.location.href = 'checkout.html?flow=programs';
    });
}

function buildCheckoutProgramsSummary(items, totals) {
    return `
        <h2>Riepilogo ordine</h2>
        <div class="checkout-summary-list">
            ${items.map((item) => `
                <div class="checkout-summary-item">
                    <span>${item.product.title}</span>
                    <strong>${formatEuro(SHOP_CONFIG.singlePriceCents)}</strong>
                </div>
            `).join('')}
        </div>
        <div class="checkout-summary-totals">
            <div class="checkout-summary-item"><span>Subtotale</span><strong>${formatEuro(totals.subtotalCents)}</strong></div>
            <div class="checkout-summary-item"><span>Sconto pack</span><strong>- ${formatEuro(totals.discountCents)}</strong></div>
            <div class="checkout-summary-item checkout-summary-total"><span>Totale</span><strong>${formatEuro(totals.totalCents)}</strong></div>
        </div>
    `;
}

function buildCheckoutCoachingSummary(plan) {
    return `
        <h2>Riepilogo ordine</h2>
        <div class="checkout-summary-list">
            <div class="checkout-summary-item">
                <span>${plan.label}</span>
                <strong>${formatEuro(plan.priceCents)}</strong>
            </div>
        </div>
        <div class="checkout-summary-totals">
            <div class="checkout-summary-item checkout-summary-total"><span>Totale</span><strong>${formatEuro(plan.priceCents)}</strong></div>
        </div>
    `;
}

function renderCheckoutPage() {
    const wrapper = document.getElementById('checkout-page');
    if (!wrapper) return;

    const params = new URLSearchParams(window.location.search);
    const flow = (params.get('flow') || 'programs').toLowerCase();
    const isCoaching = flow === 'coaching';

    const cart = getCart();
    const programItems = cart
        .map((item) => ({ ...item, product: PROGRAM_BY_ID[item.id] }))
        .filter((item) => item.product);
    const programTotals = calculateCartTotals(cart);

    const coachingPlan = isCoaching ? getCoachingPlanByMonths(params.get('months')) : null;

    if (!isCoaching && !programItems.length) {
        wrapper.innerHTML = `
            <div class="shop-empty-state">
                <h1>Carrello vuoto</h1>
                <p>Aggiungi almeno un programma prima del checkout.</p>
                <a class="btn btn-primary" href="programmi.html">Vai ai programmi</a>
            </div>
        `;
        return;
    }

    if (isCoaching && !coachingPlan) {
        wrapper.innerHTML = `
            <div class="shop-empty-state">
                <h1>Piano coaching non valido</h1>
                <p>Seleziona nuovamente il percorso coaching dalla home.</p>
                <a class="btn btn-primary" href="index.html#acquista">Torna ad acquista</a>
            </div>
        `;
        return;
    }

    const summary = isCoaching
        ? buildCheckoutCoachingSummary(coachingPlan)
        : buildCheckoutProgramsSummary(programItems, programTotals);

    wrapper.innerHTML = `
        <div class="checkout-layout">
            <aside class="checkout-summary-panel">
                <p class="shop-card-category">${isCoaching ? 'Coaching Online' : 'Programmi Allenamento'}</p>
                ${summary}
            </aside>

            <section class="checkout-form-panel">
                <h1>Dati per fatturazione</h1>
                <p class="cart-subtitle">Compila i dati richiesti prima del pagamento. Riceverai conferma via email.</p>
                <form id="checkout-customer-form" class="checkout-form" novalidate>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="checkout-nome">Nome</label>
                            <input id="checkout-nome" name="nome" type="text" required>
                        </div>
                        <div class="form-group">
                            <label for="checkout-cognome">Cognome</label>
                            <input id="checkout-cognome" name="cognome" type="text" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="checkout-indirizzo">Indirizzo di residenza</label>
                        <input id="checkout-indirizzo" name="indirizzo" type="text" required>
                    </div>

                    <div class="form-row checkout-form-row-3">
                        <div class="form-group">
                            <label for="checkout-citta">Citta</label>
                            <input id="checkout-citta" name="citta" type="text" required>
                        </div>
                        <div class="form-group">
                            <label for="checkout-provincia">Provincia</label>
                            <input id="checkout-provincia" name="provincia" type="text" maxlength="2" placeholder="RM" required>
                        </div>
                        <div class="form-group">
                            <label for="checkout-cap">CAP</label>
                            <input id="checkout-cap" name="cap" type="text" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="checkout-email">Email</label>
                            <input id="checkout-email" name="email" type="email" required>
                        </div>
                        <div class="form-group">
                            <label for="checkout-cell">Cellulare</label>
                            <input id="checkout-cell" name="cell" type="tel" required>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="checkout-cf-piva">Codice Fiscale o Partita IVA</label>
                        <input id="checkout-cf-piva" name="cf_piva" type="text" required>
                    </div>

                    <label class="checkout-privacy-check">
                        <input type="checkbox" id="checkout-privacy" required>
                        <span>Confermo di aver letto <a href="privacy.html" target="_blank" rel="noopener">Informativa Privacy</a> e <a href="termini-vendita.html" target="_blank" rel="noopener">Termini di vendita</a> e acconsento al trattamento dei dati per acquisto e fatturazione.</span>
                    </label>

                    <button type="submit" class="btn btn-primary" id="checkout-submit-btn">Vai al pagamento sicuro</button>
                    <p id="checkout-feedback" class="checkout-feedback" aria-live="polite"></p>
                </form>
            </section>
        </div>
    `;

    const form = document.getElementById('checkout-customer-form');
    const feedback = document.getElementById('checkout-feedback');
    const submitBtn = document.getElementById('checkout-submit-btn');
    const privacyInput = document.getElementById('checkout-privacy');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitBtn.disabled = true;
        feedback.textContent = '';
        feedback.classList.remove('is-visible');

        const customer = collectCheckoutCustomer(form);
        const validationError = validateCheckoutCustomer(customer, privacyInput.checked);
        if (validationError) {
            feedback.textContent = validationError;
            feedback.classList.add('is-visible');
            submitBtn.disabled = false;
            return;
        }

        const privacy = {
            accepted: privacyInput.checked,
            acceptedAt: privacyInput.checked ? new Date().toISOString() : '',
            policyVersion: '2026-04-16'
        };

        try {
            const payload = isCoaching
                ? buildCoachingCheckoutPayload(coachingPlan, customer, privacy)
                : buildProgramCheckoutPayload(getCart(), customer, privacy);
            const url = await createCheckoutSession(payload);
            window.location.href = url;
        } catch (error) {
            feedback.textContent = error.message || 'Errore durante il checkout';
            feedback.classList.add('is-visible');
            submitBtn.disabled = false;
        }
    });
}

function initShopActions() {
    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-add-to-cart]');
        if (!button) return;

        event.preventDefault();
        const id = button.getAttribute('data-add-to-cart');
        const ok = addToCart(id, 1);
        if (!ok) {
            openCartDropdown(4200);
            return;
        }
        openCartDropdown(4200);
    });
}

function initCheckoutResultPage() {
    const successNode = document.getElementById('checkout-success-page');
    if (successNode) {
        const params = new URLSearchParams(window.location.search);
        const orderType = (params.get('order_type') || 'program').toLowerCase();
        const titleNode = document.getElementById('checkout-success-title');
        const textNode = document.getElementById('checkout-success-text');

        if (orderType === 'coaching') {
            if (titleNode) titleNode.textContent = 'Richiesta coaching completata';
            if (textNode) {
                textNode.textContent = 'Pagamento ricevuto. Ti ricontatteremo entro 24 ore per fissare la call di partenza.';
            }
            return;
        }

        clearCart();
    }
}

function initCheckoutCancelPage() {
    const titleNode = document.getElementById('checkout-cancel-title');
    if (!titleNode) return;

    const params = new URLSearchParams(window.location.search);
    const orderType = (params.get('order_type') || 'program').toLowerCase();
    if (orderType !== 'coaching') return;

    const textNode = document.getElementById('checkout-cancel-text');
    const primaryNode = document.getElementById('checkout-cancel-primary');

    titleNode.textContent = 'Pagamento coaching annullato';
    if (textNode) {
        textNode.textContent = 'Nessun addebito effettuato. Quando vuoi puoi riprovare dalla sezione coaching.';
    }
    if (primaryNode) {
        primaryNode.textContent = 'Torna al coaching';
        primaryNode.href = 'index.html#acquista';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initCartUi();
    updateCartBadges();
    initListingFilterControls();
    renderListingPage();
    renderProgramPage();
    renderCartPage();
    renderCheckoutPage();
    initShopActions();
    initCheckoutResultPage();
    initCheckoutCancelPage();
});
