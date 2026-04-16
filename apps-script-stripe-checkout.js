// ============================================================
// Google Apps Script - Stripe Checkout Session API
// ============================================================
// Deploy come Web App (Execute as: Me, Who has access: Anyone)
// Script Properties richieste:
//   STRIPE_SECRET_KEY = sk_live_... oppure sk_test_...
//
// Endpoint usato dal frontend (js/shop-data.js -> checkoutApiUrl)
// POST body JSON (text/plain)
// {
//   orderType: 'program' | 'coaching',
//   customer: { nome, cognome, indirizzo, citta, provincia, cap, email, cell, cfPiva },
//   privacy: { accepted, acceptedAt, policyVersion },
//   items/pricing (solo program),
//   coaching (solo coaching),
//   successUrl,
//   cancelUrl
// }
// ============================================================

const DEFAULT_SINGLE_PRICE_CENTS = 6990;
const PACKS = [
  { quantity: 3, priceCents: 14900 },
  { quantity: 5, priceCents: 22900 }
];

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    const stripeSecret = PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');

    if (!stripeSecret) {
      return jsonResponse({ error: 'Missing STRIPE_SECRET_KEY in Script Properties' }, 500);
    }

    const customer = normalizeCustomer(payload.customer || {});
    const customerError = validateCustomer(customer);
    if (customerError) {
      return jsonResponse({ error: customerError }, 400);
    }

    const privacy = normalizePrivacy(payload.privacy || {});
    if (!privacy.accepted) {
      return jsonResponse({ error: 'Missing privacy consent' }, 400);
    }

    const successUrl = safeUrl(payload.successUrl);
    const cancelUrl = safeUrl(payload.cancelUrl);

    if (!successUrl || !cancelUrl) {
      return jsonResponse({ error: 'Missing successUrl/cancelUrl' }, 400);
    }

    const orderType = String(payload.orderType || 'program').toLowerCase() === 'coaching' ? 'coaching' : 'program';
    const orderData = orderType === 'coaching'
      ? buildCoachingOrderData(payload.coaching || {})
      : buildProgramOrderData(payload.items || []);

    if (orderData.error) {
      return jsonResponse({ error: orderData.error }, 400);
    }

    const params = {
      mode: 'payment',
      locale: 'it',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customer.email,
      billing_address_collection: 'required',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(orderData.totalCents),
      'line_items[0][price_data][product_data][name]': orderData.productName,
      'line_items[0][price_data][product_data][description]': orderData.productDescription,
      'line_items[0][quantity]': '1'
    };

    const metadata = {
      order_type: orderType,
      order_label: orderData.orderLabel,
      total_cents: String(orderData.totalCents),
      customer_nome: customer.nome,
      customer_cognome: customer.cognome,
      customer_indirizzo: customer.indirizzo,
      customer_citta: customer.citta,
      customer_provincia: customer.provincia,
      customer_cap: customer.cap,
      customer_email: customer.email,
      customer_cell: customer.cell,
      customer_cf_piva: customer.cfPiva,
      privacy_accepted: privacy.accepted ? 'true' : 'false',
      privacy_accepted_at: privacy.acceptedAt,
      privacy_policy_version: privacy.policyVersion || 'unknown'
    };

    Object.keys(orderData.metadata).forEach((key) => {
      metadata[key] = orderData.metadata[key];
    });

    Object.keys(metadata).forEach((key) => {
      const safeKey = String(key || '').trim().slice(0, 40);
      if (!safeKey) return;
      params[`metadata[${safeKey}]`] = String(metadata[key] || '').slice(0, 500);
    });

    const stripeResponse = UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'post',
      payload: params,
      headers: {
        Authorization: `Bearer ${stripeSecret}`
      },
      muteHttpExceptions: true
    });

    const code = stripeResponse.getResponseCode();
    const body = stripeResponse.getContentText();
    const parsed = JSON.parse(body || '{}');

    if (code < 200 || code >= 300 || !parsed.url) {
      return jsonResponse({ error: parsed.error ? parsed.error.message : 'Stripe session error' }, 502);
    }

    return jsonResponse({
      ok: true,
      url: parsed.url,
      orderType: orderType,
      totalCents: orderData.totalCents
    }, 200);
  } catch (error) {
    return jsonResponse({ error: error.message || 'Internal error' }, 500);
  }
}

function buildProgramOrderData(rawItems) {
  const items = normalizeItems(rawItems);
  if (!items.length) {
    return { error: 'Cart is empty' };
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const pricing = calculateBestPrice(totalQuantity);

  const programTitles = items.map((item) => item.title).join(' | ').slice(0, 500);
  const programIds = items.map((item) => item.id).join(',').slice(0, 500);

  return {
    totalCents: pricing.totalCents,
    orderLabel: `Programmi (${totalQuantity})`,
    productName: `Programmi Allenamento (${totalQuantity})`,
    productDescription: `Acquisto multiplo programmi - ${programTitles}`.slice(0, 500),
    metadata: {
      program_ids: programIds,
      program_titles: programTitles,
      program_count: String(totalQuantity),
      subtotal_cents: String(pricing.subtotalCents),
      discount_cents: String(pricing.discountCents),
      bundles: pricing.bundleLabel
    }
  };
}

function buildCoachingOrderData(rawCoaching) {
  const coaching = normalizeCoaching(rawCoaching);
  if (!coaching) {
    return { error: 'Invalid coaching payload' };
  }

  return {
    totalCents: coaching.priceCents,
    orderLabel: coaching.label,
    productName: coaching.label,
    productDescription: `Percorso coaching online ${coaching.months} mesi`,
    metadata: {
      coaching_id: coaching.id,
      coaching_months: String(coaching.months)
    }
  };
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .filter((item) => item && item.id && item.title)
    .map((item) => ({
      id: String(item.id).slice(0, 100),
      title: String(item.title).slice(0, 120),
      quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
    }));
}

function normalizeCoaching(rawCoaching) {
  if (!rawCoaching || typeof rawCoaching !== 'object') return null;

  const id = String(rawCoaching.id || '').slice(0, 80);
  const label = String(rawCoaching.label || '').slice(0, 180);
  const months = parseInt(rawCoaching.months, 10);
  const priceCents = parseInt(rawCoaching.priceCents, 10);

  if (!id || !label) return null;
  if (!Number.isFinite(months) || months <= 0) return null;
  if (!Number.isFinite(priceCents) || priceCents <= 0) return null;

  return {
    id,
    label,
    months,
    priceCents
  };
}

function normalizeCustomer(rawCustomer) {
  const customer = rawCustomer && typeof rawCustomer === 'object' ? rawCustomer : {};

  return {
    nome: String(customer.nome || '').trim().slice(0, 120),
    cognome: String(customer.cognome || '').trim().slice(0, 120),
    indirizzo: String(customer.indirizzo || '').trim().slice(0, 220),
    citta: String(customer.citta || '').trim().slice(0, 120),
    provincia: String(customer.provincia || '').trim().toUpperCase().slice(0, 2),
    cap: String(customer.cap || '').trim().slice(0, 10),
    email: String(customer.email || '').trim().toLowerCase().slice(0, 180),
    cell: String(customer.cell || '').trim().slice(0, 50),
    cfPiva: String(customer.cfPiva || '').trim().toUpperCase().slice(0, 32)
  };
}

function normalizePrivacy(rawPrivacy) {
  const privacy = rawPrivacy && typeof rawPrivacy === 'object' ? rawPrivacy : {};
  const accepted = privacy.accepted === true || String(privacy.accepted || '').toLowerCase() === 'true';

  return {
    accepted,
    acceptedAt: accepted ? String(privacy.acceptedAt || '').trim().slice(0, 64) : '',
    policyVersion: String(privacy.policyVersion || '').trim().slice(0, 40)
  };
}

function validateCustomer(customer) {
  if (!customer.nome) return 'Missing customer nome';
  if (!customer.cognome) return 'Missing customer cognome';
  if (!customer.indirizzo) return 'Missing customer indirizzo';
  if (!customer.citta) return 'Missing customer citta';
  if (!customer.provincia) return 'Missing customer provincia';
  if (!customer.cap) return 'Missing customer cap';
  if (!customer.email) return 'Missing customer email';
  if (!customer.cell) return 'Missing customer cell';
  if (!customer.cfPiva) return 'Missing customer cfPiva';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return 'Invalid customer email';
  }

  return '';
}

function calculateBestPrice(totalQty) {
  const options = [{ quantity: 1, priceCents: DEFAULT_SINGLE_PRICE_CENTS, label: '1x singolo' }]
    .concat(PACKS.map((pack) => ({ quantity: pack.quantity, priceCents: pack.priceCents, label: `${pack.quantity}x pack` })));

  const dp = [];
  for (let i = 0; i <= totalQty; i += 1) {
    dp.push({ cost: Number.POSITIVE_INFINITY, plan: [] });
  }
  dp[0] = { cost: 0, plan: [] };

  for (let qty = 1; qty <= totalQty; qty += 1) {
    options.forEach((option) => {
      if (qty < option.quantity) return;
      const prev = dp[qty - option.quantity];
      if (!isFinite(prev.cost)) return;

      const candidate = prev.cost + option.priceCents;
      if (candidate < dp[qty].cost) {
        dp[qty] = {
          cost: candidate,
          plan: prev.plan.concat([option])
        };
      }
    });
  }

  const subtotalCents = totalQty * DEFAULT_SINGLE_PRICE_CENTS;
  const totalCents = dp[totalQty].cost;
  const discountCents = Math.max(0, subtotalCents - totalCents);

  const counter = {};
  dp[totalQty].plan.forEach((step) => {
    const key = `${step.quantity}x`;
    counter[key] = (counter[key] || 0) + 1;
  });

  const bundleLabel = Object.keys(counter)
    .sort()
    .map((key) => `${counter[key]}*${key}`)
    .join('+')
    .slice(0, 300);

  return {
    subtotalCents,
    totalCents,
    discountCents,
    bundleLabel
  };
}

function safeUrl(value) {
  const text = String(value || '').trim();
  if (!/^https:\/\//i.test(text)) return '';
  return text.slice(0, 2048);
}

function jsonResponse(obj, statusCode) {
  const payload = {
    status: statusCode,
    ...obj
  };

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
