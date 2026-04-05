// ═══════════════════════════════════════════════════════
// Google Apps Script — Stripe Webhook Handler
// per le notifiche di acquisto di Alberto Prevedi
// ═══════════════════════════════════════════════════════
//
// ISTRUZIONI:
// 1. Vai su https://script.google.com -> Nuovo progetto
// 2. Cancella tutto ed incolla questo codice
// 3. Salva (Ctrl+S) e rinomina il progetto (es. "Stripe Webhook Alberto")
// 4. Clicca su "Deploy" -> "Nuovo deployment"
//    - Tipo: "App web"
//    - Esegui come: "Me"
//    - Chi ha accesso: "Chiunque"
// 5. Copia l'URL del deployment
// 6. Vai nella Dashboard di Stripe -> Sviluppatori -> Webhook
// 7. Aggiungi endpoint, incolla l'URL e seleziona l'evento "checkout.session.completed"
// ═══════════════════════════════════════════════════════

const DEST_EMAIL = 'albertoprevedi@gmail.com'; // Inserire l'email corretta a cui inviare le notifiche

function doPost(e) {
    try {
        const event = JSON.parse(e.postData.contents);

        // Controlliamo che l'evento sia un avvenuto pagamento su checkout link
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            const customerName = session.customer_details?.name || 'Sconosciuto';
            const customerEmail = session.customer_details?.email || 'Nessuna email';
            const customerPhone = session.customer_details?.phone || 'Nessun telefono';
            const amountTotal = (session.amount_total / 100).toFixed(2);

            // Il nome del prodotto è spesso salvato in session.metadata o necessita di recupero.
            // E' buona pratica inserire una descrizione o il nome prodotto nei Payments Links
            let productDescription = 'Pacchetto/Programma (verifica in Stripe)';

            // Tentativo di recuperare info prodotto (se ci sono custom text nei payment link)
            if (session.custom_text && session.custom_text.submit && session.custom_text.submit.message) {
                productDescription = session.custom_text.submit.message;
            }

            const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">💰 Nuovo Acquisto Ricevuto!</h2>
          </div>
          <div style="padding: 24px; background: #f8fafc;">
            <p style="font-size: 16px; color: #333;">Hai appena ricevuto un nuovo pagamento tramite il sito web.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 8px;">
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 35%;">Cliente:</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                  <a href="mailto:${customerEmail}">${customerEmail}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Telefono:</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                  <a href="https://wa.me/${customerPhone.replace(/\\D/g, '')}">${customerPhone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px; font-weight: bold;">Importo:</td>
                <td style="padding: 12px; color: #10b981; font-weight: bold;">${amountTotal} &euro;</td>
              </tr>
            </table>

            <div style="margin-top: 24px;">
              <p style="color: #64748b; font-size: 14px;"><strong>Nota:</strong> Ricordati di contattarlo su WhatsApp o via mail per inviargli il programma o per far partire il coaching.</p>
            </div>
          </div>
        </div>
      `;

            GmailApp.sendEmail(DEST_EMAIL, `🎉 Nuovo Acquisto dal Sito: ${customerName}`, "Nuovo acquisto ricevuto.", {
                htmlBody: htmlBody,
                name: 'Stripe Webhook Bot'
            });

            return ContentService.createTextOutput(JSON.stringify({ received: true }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // Ignoriamo altri tipi di eventi
        return ContentService.createTextOutput(JSON.stringify({ received: true }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
