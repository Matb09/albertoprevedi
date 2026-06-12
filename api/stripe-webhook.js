// Relay del webhook Stripe verso Google Apps Script.
//
// Perche esiste: Stripe richiede una risposta HTTP 200-299, ma le Web App
// di Apps Script rispondono sempre con un redirect 302 (che Stripe non segue
// e conta come errore; dopo troppi errori disattiva l'endpoint).
// Questa funzione riceve l'evento, lo inoltra allo script seguendo i
// redirect e risponde 200 a Stripe solo se lo script ha risposto bene.
//
// In Stripe (test E live) l'endpoint webhook deve puntare a:
//   https://albertoprevedi.vercel.app/api/stripe-webhook
// L'URL di inoltro puo essere sovrascritto senza deploy con la variabile
// d'ambiente STRIPE_WEBHOOK_FORWARD_URL su Vercel.

const APPS_SCRIPT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzFEbG6B9QIkIPFikJPXCVgL02XbTk1KvrNJvxo1TftdIi1iIHEvr9UDdMH7l58fnIO/exec';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const target = process.env.STRIPE_WEBHOOK_FORWARD_URL || APPS_SCRIPT_WEBHOOK_URL;
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});

  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      redirect: 'follow'
    });
    const text = await upstream.text();

    if (upstream.ok) {
      res.status(200).json({ received: true, downstream: text.slice(0, 200) });
      return;
    }

    // Risposta non 2xx dallo script: 502 cosi Stripe ritenta piu tardi.
    // Lo script deduplica le sessioni gia processate, quindi niente doppioni.
    res.status(502).json({ received: false, downstreamStatus: upstream.status });
  } catch (err) {
    res.status(500).json({ received: false, error: String((err && err.message) || err) });
  }
};
