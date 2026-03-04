exports.handler = async function (event) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = { ...cors, 'Content-Type': 'application/json' };

  // ── 1. Check API key ──────────────────────────────────────────────────────
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    console.error('VAPI_API_KEY is missing or undefined');
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'Server-Konfigurationsfehler: VAPI_API_KEY fehlt. Bitte in Netlify Environment Variables setzen.' })
    };
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ungültiger Request-Body' }) };
  }

  const { phoneNumber } = parsedBody;
  if (!phoneNumber) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Keine Telefonnummer angegeben' }) };
  }

  // ── 3. Normalize to E.164 ─────────────────────────────────────────────────
  let num = phoneNumber.replace(/[\s\-().]/g, '');
  if (num.startsWith('00')) {
    num = '+' + num.slice(2);                // 0041... → +41...
  } else if (/^0[1-9]/.test(num)) {
    num = '+41' + num.slice(1);              // 079... → +4179...
  } else if (!num.startsWith('+')) {
    num = '+' + num.replace(/[^\d]/g, '');
  }
  num = num.replace(/(?!^\+)[^\d]/g, '');   // strip non-digits except leading +

  console.log('Phone input:', phoneNumber, '→ normalized:', num);

  if (!/^\+[1-9]\d{6,14}$/.test(num)) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({ error: 'Ungültiges Nummernformat nach Bereinigung: ' + num })
    };
  }

  // ── 4. Call VAPI ──────────────────────────────────────────────────────────
  const payload = {
    phoneNumberId: 'a74a4102-0325-4595-9e90-e9b00f6f2ef8',
    customer: { number: num },
    assistantId: 'faeb0ba3-86f1-4f36-a402-e3d1fbc9453a'
  };

  console.log('VAPI payload:', JSON.stringify(payload));

  try {
    const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const rawText = await vapiRes.text();
    console.log('VAPI status:', vapiRes.status, '| response:', rawText);

    let data;
    try { data = JSON.parse(rawText); } catch { data = { raw: rawText }; }

    if (!vapiRes.ok) {
      return {
        statusCode: vapiRes.status, headers,
        body: JSON.stringify({
          error: data.message || data.error || rawText,
          debug: { vapiStatus: vapiRes.status, vapiResponse: data, numberSent: num }
        })
      };
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, callId: data.id, number: num })
    };

  } catch (err) {
    console.error('Fetch to VAPI failed:', err.message);
    return {
      statusCode: 502, headers,
      body: JSON.stringify({ error: 'Verbindungsfehler zu VAPI: ' + err.message })
    };
  }
};
