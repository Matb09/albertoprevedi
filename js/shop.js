const CART_STORAGE_KEY = 'ap_shop_cart_v1';

let cartDropdownNode = null;
let cartToastNode = null;
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
    if (!cartDropdownNode || !cartTriggerNode) return;
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
            <img src="${item.product.cover}" alt="${item.product.title}">
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

function showAddToCartToast(productId, alreadyInCart = false) {
    if (!cartToastNode) return;
    const product = PROGRAM_BY_ID[productId];
    if (!product) return;

    cartToastNode.textContent = alreadyInCart
        ? `"${product.title}" e gia nel carrello`
        : `"${product.title}" aggiunto al carrello`;
    cartToastNode.classList.add('show');
    window.setTimeout(() => {
        if (cartToastNode) {
            cartToastNode.classList.remove('show');
        }
    }, 1800);
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

    cartToastNode = document.createElement('div');
    cartToastNode.className = 'cart-toast';
    cartToastNode.setAttribute('aria-live', 'polite');
    document.body.appendChild(cartToastNode);

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
                <img class="shop-card-cover" src="${program.cover}" alt="Copertina ${program.title}" loading="lazy">
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
                <img src="${program.cover}" alt="Copertina ${program.title}">
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
                    <a class="btn btn-outline" href="${program.pdf}" target="_blank" rel="noopener">Apri PDF</a>
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

function getCheckoutUrls() {
    const baseUrl = getCheckoutBaseUrl();
    return {
        successUrl: new URL('checkout-success.html', baseUrl).toString(),
        cancelUrl: new URL('checkout-cancel.html', baseUrl).toString()
    };
}

function buildCheckoutPayload(cart) {
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

    const urls = getCheckoutUrls();

    return {
        currency: SHOP_CONFIG.currency,
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
                <a class="btn btn-primary" href="programmi.html">Vai al listing programmi</a>
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
                            <img src="${item.product.cover}" alt="${item.product.title}">
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
                <button type="button" id="cart-checkout-btn" class="btn btn-primary">Procedi al checkout</button>
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

    checkoutBtn.addEventListener('click', async () => {
        checkoutBtn.disabled = true;
        feedback.textContent = 'Creazione checkout in corso...';

        try {
            const payload = buildCheckoutPayload(getCart());
            const url = await createCheckoutSession(payload);
            feedback.textContent = 'Redirect a Stripe...';
            window.location.href = url;
        } catch (error) {
            feedback.textContent = error.message || 'Errore durante il checkout';
            checkoutBtn.disabled = false;
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
            showAddToCartToast(id, true);
            openCartDropdown(4200);
            return;
        }
        showAddToCartToast(id, false);
        openCartDropdown(4200);
    });
}

function initCheckoutResultPage() {
    const successNode = document.getElementById('checkout-success-page');
    if (successNode) {
        clearCart();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initCartUi();
    updateCartBadges();
    initListingFilterControls();
    renderListingPage();
    renderProgramPage();
    renderCartPage();
    initShopActions();
    initCheckoutResultPage();
});
