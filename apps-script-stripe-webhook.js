// ============================================================
// Google Apps Script - Stripe Webhook Handler
// ============================================================
// Deploy come Web App (Execute as: Me, Who has access: Anyone)
//
// Configurazione:
// - In Stripe Webhooks registra l'URL /exec del deployment
// - Evento richiesto: checkout.session.completed
// - Script Property richiesta: STRIPE_SECRET_KEY (stessa chiave del checkout script)
//
// Questo script:
// 1) salva ogni ordine sul Google Sheet
// 2) invia mail automatica cliente (programmi/coaching)
// 3) invia mail interna per ordini coaching da contattare
// ============================================================

const SPREADSHEET_ID = '1aPZ-M44LC5npbOWcz0D4zpT8nC4DsWzLxuBR8f8gWOE';
const SHEET_NAME = 'ordini';
const INTERNAL_EMAILS = ['matteobuffagni09@gmail.com'];
const SITE_BASE_URL = 'https://albertoprevedi.vercel.app/';
const COACHING_CONFIRMATION_TEXT = 'Pagamento ricevuto. Ti ricontatteremo entro 24 ore per fissare la call di partenza.';

const SHEET_COLUMNS = [
  'created_at',
  'order_id',
  'stripe_session_id',
  'payment_status',
  'product_type',
  'product_label',
  'amount_eur',
  'nome',
  'cognome',
  'email',
  'cell',
  'indirizzo',
  'citta',
  'provincia',
  'cap',
  'cf_piva',
  'invoice_status',
  'coaching_status',
  'notes'
];

const PROGRAM_PDF_BY_ID = {
  'ppl-base': 'assets/programs/ppl-programma.pdf',
  'split-4-upper': 'assets/programs/programma-4-split-enfasi-upper-body.pdf',
  'split-5-296': 'assets/programs/programma-5-split-296.pdf',
  'split-5-299': 'assets/programs/programma-5-split-299.pdf',
  'upper-lower-base': 'assets/programs/upper1-lower1-upper2-lower2.pdf',
  'upper-lower-bis': 'assets/programs/upper1-lower1-upper2-lower2-bis.pdf',
  'upper-lower-mav': 'assets/programs/upper1-lower1-upper2-lower2-mav.pdf'
};

function doPost(e) {
  try {
    const body = (e.postData && e.postData.contents) || '{}';
    const event = JSON.parse(body);

    if (!event || event.type !== 'checkout.session.completed') {
      return jsonResponse({ received: true });
    }

    const incomingSession = event.data && event.data.object ? event.data.object : null;
    if (!incomingSession || !incomingSession.id) {
      return jsonResponse({ received: true });
    }

    if (isSessionAlreadyProcessed_(incomingSession.id)) {
      return jsonResponse({ received: true, duplicate: true });
    }

    const session = fetchVerifiedSession_(incomingSession.id);
    if (!session) {
        return jsonResponse({ received: false, error: 'Stripe verification failed' });
    }
    if (String(session.payment_status || '').toLowerCase() !== 'paid') {
      return jsonResponse({ received: true, skipped: 'payment_not_paid' });
    }

    const metadata = session.metadata || {};
    const customerDetails = session.customer_details || {};

    const orderType = String(metadata.order_type || '').toLowerCase() === 'coaching' ? 'coaching' : 'program';
    const productLabel = metadata.order_label || (orderType === 'coaching' ? 'Coaching Online' : 'Programmi Allenamento');

    const customer = {
      nome: safeValue_(metadata.customer_nome || customerDetails.name || ''),
      cognome: safeValue_(metadata.customer_cognome || ''),
      indirizzo: safeValue_(metadata.customer_indirizzo || ''),
      citta: safeValue_(metadata.customer_citta || ''),
      provincia: safeValue_(metadata.customer_provincia || ''),
      cap: safeValue_(metadata.customer_cap || ''),
      email: safeValue_(metadata.customer_email || customerDetails.email || ''),
      cell: safeValue_(metadata.customer_cell || customerDetails.phone || ''),
      cfPiva: safeValue_(metadata.customer_cf_piva || '')
    };

    const row = {
      created_at: new Date(),
      order_id: safeValue_(session.payment_intent || session.id),
      stripe_session_id: safeValue_(session.id),
      payment_status: safeValue_(session.payment_status || ''),
      product_type: orderType === 'coaching' ? 'coaching' : 'programmi',
      product_label: safeValue_(productLabel),
      amount_eur: formatAmountEur_(session.amount_total),
      nome: customer.nome,
      cognome: customer.cognome,
      email: customer.email,
      cell: customer.cell,
      indirizzo: customer.indirizzo,
      citta: customer.citta,
      provincia: customer.provincia,
      cap: customer.cap,
      cf_piva: customer.cfPiva,
      invoice_status: 'DA_FATTURARE',
      coaching_status: orderType === 'coaching' ? 'DA_CONTATTARE' : 'N/A',
      notes: ''
    };

    appendOrderRow_(row);
    markSessionProcessed_(session.id);

    if (orderType === 'coaching') {
      sendCoachingCustomerEmail_(customer, productLabel);
      sendInternalCoachingEmail_(customer, row, metadata);
    } else {
      sendProgramsCustomerEmail_(customer, metadata);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    return jsonResponse({ received: false, error: error.message || 'Internal error' });
  }
}

function fetchVerifiedSession_(sessionId) {
  const stripeSecret = PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');
  if (!stripeSecret) {
    throw new Error('Missing STRIPE_SECRET_KEY in Script Properties');
  }

  const url = `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${stripeSecret}`
    },
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    return null;
  }

  const parsed = JSON.parse(response.getContentText() || '{}');
  if (!parsed || !parsed.id) return null;
  return parsed;
}

function appendOrderRow_(row) {
  const sheet = getOrdersSheet_();
  ensureSheetHeader_(sheet);

  const values = SHEET_COLUMNS.map((column) => row[column] !== undefined ? row[column] : '');
  sheet.appendRow(values);
}

function getOrdersSheet_() {
  if (!SPREADSHEET_ID || !SHEET_NAME) {
    throw new Error('Spreadsheet configuration missing');
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet '${SHEET_NAME}' not found`);
  }

  return sheet;
}

function ensureSheetHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.getRange(1, 1, 1, SHEET_COLUMNS.length).setValues([SHEET_COLUMNS]);
}

function isSessionAlreadyProcessed_(sessionId) {
  const key = `processed_${sessionId}`;
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return value === '1';
}

function markSessionProcessed_(sessionId) {
  const key = `processed_${sessionId}`;
  PropertiesService.getScriptProperties().setProperty(key, '1');
}

function sendProgramsCustomerEmail_(customer, metadata) {
  if (!customer.email) return;

  const programIds = String(metadata.program_ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const programTitles = String(metadata.program_titles || '')
    .split('|')
    .map((title) => title.trim())
    .filter(Boolean);

  const listItems = [];

  programIds.forEach((programId, index) => {
    const title = programTitles[index] || `Programma ${index + 1}`;
    const path = PROGRAM_PDF_BY_ID[programId];
    if (!path) {
      listItems.push(`<li>${escapeHtml_(title)}</li>`);
      return;
    }
    const url = buildPublicUrl_(path);
    listItems.push(`<li><a href="${url}">${escapeHtml_(title)}</a></li>`);
  });

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Grazie per il tuo acquisto</h2>
      <p>Il pagamento e stato completato con successo. Qui trovi i tuoi programmi in PDF:</p>
      <ul style="line-height: 1.7;">
        ${listItems.join('') || '<li>Riceverai i materiali via email a breve.</li>'}
      </ul>
      <p style="margin-top: 20px; color: #475569; font-size: 13px;">Per supporto rispondi direttamente a questa email.</p>
    </div>
  `;

  GmailApp.sendEmail(
    customer.email,
    'Ordine confermato - Programmi Alberto Prevedi',
    'Il tuo ordine e stato confermato. Apri l\'email in HTML per scaricare i PDF.',
    {
      htmlBody: htmlBody,
      name: 'Alberto Prevedi Team'
    }
  );
}

function sendCoachingCustomerEmail_(customer, productLabel) {
  if (!customer.email) return;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Pagamento ricevuto</h2>
      <p>Abbiamo ricevuto correttamente il tuo acquisto per <strong>${escapeHtml_(productLabel)}</strong>.</p>
      <p>${escapeHtml_(COACHING_CONFIRMATION_TEXT)}</p>
      <p style="margin-top: 20px; color: #475569; font-size: 13px;">Ti scriveremo all'email indicata oppure al numero telefonico fornito.</p>
    </div>
  `;

  GmailApp.sendEmail(
    customer.email,
    'Ordine coaching confermato - Alberto Prevedi',
    COACHING_CONFIRMATION_TEXT,
    {
      htmlBody: htmlBody,
      name: 'Alberto Prevedi Team'
    }
  );
}

function sendInternalCoachingEmail_(customer, row, metadata) {
  if (!INTERNAL_EMAILS.length) return;

  const cleanPhone = String(customer.cell || '').replace(/\D/g, '');
  const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '';

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Nuovo coaching da contattare</h2>
      <p>Ordine ricevuto da sito. Contattare il cliente entro 24h.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Prodotto</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${escapeHtml_(row.product_label)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Importo</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${escapeHtml_(row.amount_eur)} EUR</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Nome</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${escapeHtml_(`${customer.nome} ${customer.cognome}`.trim())}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${escapeHtml_(customer.email)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Cell</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${escapeHtml_(customer.cell)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">CF/P.IVA</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${escapeHtml_(customer.cfPiva)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Indirizzo</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${escapeHtml_(`${customer.indirizzo}, ${customer.cap} ${customer.citta} (${customer.provincia})`)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Sessione Stripe</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${escapeHtml_(row.stripe_session_id)}</td></tr>
      </table>
      <p style="margin-top: 14px;">
        ${whatsappLink ? `<a href="${whatsappLink}">Apri WhatsApp cliente</a>` : 'Numero WhatsApp non disponibile'}
      </p>
      <p style="color: #475569; font-size: 12px;">Sheet stato iniziale: invoice_status=DA_FATTURARE, coaching_status=DA_CONTATTARE</p>
    </div>
  `;

  const mailOptions = {
    htmlBody: htmlBody,
    name: 'Stripe Webhook Bot'
  };
  if (customer.email) {
    mailOptions.replyTo = customer.email;
  }

  GmailApp.sendEmail(
    INTERNAL_EMAILS.join(','),
    `Nuovo coaching da contattare - ${row.product_label}`,
    `Nuovo coaching da contattare: ${customer.nome} ${customer.cognome}`,
    mailOptions
  );
}

function buildPublicUrl_(path) {
  const base = String(SITE_BASE_URL || '').replace(/\/+$/, '');
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return `${base}/${cleanPath}`;
}

function formatAmountEur_(amountCents) {
  const cents = Number(amountCents || 0);
  const eur = cents / 100;
  return eur.toFixed(2);
}

function safeValue_(value) {
  return String(value || '').trim().slice(0, 500);
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj || {}))
    .setMimeType(ContentService.MimeType.JSON);
}
