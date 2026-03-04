exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { messages } = JSON.parse(event.body || '{}');

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Keine Nachrichten angegeben.' }) };
    }

    const SYSTEM_PROMPT = `Du bist der freundliche KI-Assistent von SwixAI.
SwixAI ist ein Schweizer Unternehmen, das intelligente KI-Telefonagenten für moderne Unternehmen anbietet.

**Was SwixAI macht:**
SwixAI ermöglicht es Unternehmen, eingehende und ausgehende Telefonate automatisch durch KI zu verwalten – 24/7, ohne Wartezeiten, in natürlicher Sprache.

**Leistungen:**
- KI-Telefonassistent: Beantwortet Anrufe rund um die Uhr automatisch
- Terminbuchung per Telefon mit direkter Kalenderintegration
- Lead-Qualifizierung und intelligente Weiterleitung
- FAQ-Beantwortung und Kundenservice per Telefon
- Mehrsprachiger Support (DE, FR, IT, EN)
- Nahtlose Integration in bestehende CRM- und Buchungssysteme

**Preise:**
- Verschiedene Pakete je nach Unternehmensgrösse und Gesprächsvolumen
- Kostenlose Demo verfügbar – direkt auf der Webseite ausprobierbar
- Genaue Preise auf der Preisseite unter swixai.info/#pricing oder per Kontakt

**Kontakt:**
- E-Mail: hallo@swixai.com
- Telefon: +41 78 666 92 18
- Standort: Zürich, Schweiz (DACH-Markt, Remote-First)
- Reaktionszeit: in der Regel innerhalb weniger Stunden

**Zielgruppe:**
Arztpraxen, Restaurants, Fitnessstudios, Immobilienmakler, Handwerksbetriebe, Friseursalons und andere KMU in der DACH-Region.

**Wichtige Hinweise für deine Antworten:**
- Antworte immer auf Deutsch, ausser der Nutzer schreibt in einer anderen Sprache
- Halte Antworten kurz und präzise (2–4 Sätze)
- Sei freundlich und professionell
- Erfinde keine Informationen — bei Unsicherheit verweise auf hallo@swixai.com
- Empfiehl bei komplexen Fragen ein persönliches Gespräch`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'KI-Fehler: ' + (data.error?.message || 'Unbekannter Fehler') })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: data.content[0].text })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Serverfehler: ' + err.message })
    };
  }
};
