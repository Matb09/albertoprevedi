// ============================================================
// Google Apps Script - Stripe Checkout Session API
// ============================================================
// Deploy come Web App (Execute as: Me, Who has access: Anyone)
// Script Properties richieste:
//   STRIPE_SECRET_KEY = sk_live_... oppure sk_test_...
//
// Endpoint usato dal frontend (js/shop-data.js -> checkoutApiUrl)
// POST body JSON (text/plain):
// {
//   items: [{ id, title, quantity, unitPriceCents }],
//   pricing: { subtotalCents, discountCents, totalCents, totalQuantity, bundleBreakdown },
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

    const items = normalizeItems(payload.items || []);
    if (!items.length) {
      return jsonResponse({ error: 'Cart is empty' }, 400);
    }

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const pricing = calculateBestPrice(totalQuantity);

    const successUrl = safeUrl(payload.successUrl);
    const cancelUrl = safeUrl(payload.cancelUrl);

    if (!successUrl || !cancelUrl) {
      return jsonResponse({ error: 'Missing successUrl/cancelUrl' }, 400);
    }

    const programTitles = items.map((item) => item.title).join(' | ').slice(0, 500);
    const programIds = items.map((item) => item.id).join(',').slice(0, 500);

    const params = {
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(pricing.totalCents),
      'line_items[0][price_data][product_data][name]': `Programmi Allenamento (${totalQuantity})`,
      'line_items[0][price_data][product_data][description]': `Acquisto multiplo programmi - ${programTitles}`,
      'line_items[0][quantity]': '1',
      'metadata[program_ids]': programIds,
      'metadata[program_titles]': programTitles,
      'metadata[program_count]': String(totalQuantity),
      'metadata[subtotal_cents]': String(pricing.subtotalCents),
      'metadata[discount_cents]': String(pricing.discountCents),
      'metadata[total_cents]': String(pricing.totalCents),
      'metadata[bundles]': pricing.bundleLabel
    };

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
      totalCents: pricing.totalCents,
      discountCents: pricing.discountCents
    }, 200);
  } catch (error) {
    return jsonResponse({ error: error.message || 'Internal error' }, 500);
  }
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
