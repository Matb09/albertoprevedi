// ═══════════════════════════════════════════════════════
// Google Apps Script — Contact Form Handler
// per il sito di Alberto Prevedi
// ═══════════════════════════════════════════════════════
//
// ISTRUZIONI:
// 1. Vai su https://script.google.com → Nuovo progetto
// 2. Cancella il contenuto e incolla TUTTO questo codice
// 3. Salva (Ctrl+S)
// 4. Deploy → Nuovo deployment
//    - Tipo: "App web"
//    - Esegui come: "Me" (il tuo account)
//    - Chi ha accesso: "Chiunque"
// 5. Autorizza l'accesso quando richiesto
// 6. Copia l'URL del deployment e incollalo in js/main.js
//    nella variabile APPS_SCRIPT_URL
// ═══════════════════════════════════════════════════════

// Email destinatario
const DEST_EMAIL = 'albertoprevedi@gmail.com';

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);

        const name = data.name || 'Sconosciuto';
        const email = data.email || 'Non fornita';
        const subject = data.subject || 'Contatto dal sito';
        const message = data.message || '';
        const privacyConsent = data.privacyConsent === true || String(data.privacyConsent || '').toLowerCase() === 'true';
        const privacyConsentAt = data.privacyConsentAt || '';
        const privacyPolicyVersion = data.privacyPolicyVersion || '';

        if (!privacyConsent) {
            return ContentService
                .createTextOutput(JSON.stringify({ success: false, message: 'Consenso privacy mancante' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // Componi il corpo dell'email
        const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #0891b2); padding: 24px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; margin: 0;">📩 Nuovo contatto dal sito</h2>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #475569; width: 100px;">Nome</td>
              <td style="padding: 8px 12px; color: #0f172a;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #475569;">Email</td>
              <td style="padding: 8px 12px;"><a href="mailto:${email}" style="color: #0ea5e9;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #475569;">Oggetto</td>
              <td style="padding: 8px 12px; color: #0f172a;">${subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #475569;">Consenso privacy</td>
              <td style="padding: 8px 12px; color: #0f172a;">SI (${privacyPolicyVersion || 'versione non indicata'})</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #475569;">Timestamp consenso</td>
              <td style="padding: 8px 12px; color: #0f172a;">${privacyConsentAt || 'non disponibile'}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="font-weight: bold; color: #475569; margin: 0 0 8px;">Messaggio:</p>
            <p style="color: #0f172a; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
            Inviato dal sito web albertoprevedi.com
          </p>
        </div>
      </div>
    `;

        // Invia email
        GmailApp.sendEmail(DEST_EMAIL, `[Sito Web] ${subject} — ${name}`, message, {
            htmlBody: htmlBody,
            replyTo: email,
            name: 'Sito Web Alberto Prevedi'
        });

        // Risposta di successo
        return ContentService
            .createTextOutput(JSON.stringify({ success: true, message: 'Email inviata!' }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// Test: puoi eseguire questa funzione per verificare che il tutto funzioni
function testEmail() {
    const testEvent = {
        postData: {
            contents: JSON.stringify({
                name: 'Test Utente',
                email: 'test@example.com',
                subject: 'Test dal sito',
                message: 'Questo è un messaggio di test.'
            })
        }
    };
    const result = doPost(testEvent);
    Logger.log(result.getContent());
}
