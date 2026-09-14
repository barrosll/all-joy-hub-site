// Recebe o webhook de "HTTP POST request" do Netlify Forms e envia um
// email com a identidade visual da All Joy Hub (logo + assinatura) via Resend,
// em vez do email genérico em texto simples que o Netlify manda por padrão.

const SITE_URL = 'https://alljoyhub.pt';
const LOGO_URL = `${SITE_URL}/images/logo-horizontal.png`;

const FORM_TITLES = {
  'reserva-mesa': 'Nova reserva de mesa',
  'orcamento-aniversario': 'Novo pedido de orçamento — Festa de aniversário'
};

const FIELD_LABELS = {
  dia: 'Dia', horario: 'Horário', pessoas: 'Pessoas',
  nome: 'Nome', contacto: 'Contacto', notas: 'Pedido especial',
  data: 'Data pretendida', criancas: 'Nº de crianças', pacote: 'Pacote preferido'
};

const IGNORED_FIELDS = new Set(['form-name', 'empresa']);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildRowsHtml(fields) {
  return fields.map(([key, value]) => {
    const label = FIELD_LABELS[key] || key;
    return `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f0e6d8;color:#8a713f;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f0e6d8;color:#2b2419;font-size:14px;">${escapeHtml(value)}</td>
      </tr>`;
  }).join('');
}

function buildEmailHtml(formName, fields) {
  const title = FORM_TITLES[formName] || `Novo envio — ${formName}`;
  const rows = buildRowsHtml(fields);
  return `
  <div style="background:#fff8ec;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0e6d8;">
      <div style="background:#1f1912;padding:20px 24px;">
        <img src="${LOGO_URL}" alt="All Joy Hub" height="32" style="display:block;">
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 16px;font-size:19px;color:#2b2419;">${escapeHtml(title)}</h1>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${rows}
        </table>
      </div>
      <div style="padding:18px 24px;background:#fff2df;color:#6f6153;font-size:12px;line-height:1.6;">
        <strong style="color:#2b2419;">All Joy Hub</strong><br>
        Shop · Eat · Play · Enjoy<br>
        Montijo, Portugal<br>
        <a href="${SITE_URL}" style="color:#e2591a;text-decoration:none;">${SITE_URL.replace('https://', '')}</a>
        &nbsp;·&nbsp;
        <a href="https://www.instagram.com/gm_mart_loja/" style="color:#e2591a;text-decoration:none;">Instagram</a>
      </div>
    </div>
  </div>`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const payload = body.payload || body;
    const formName = payload.form_name || 'formulário do site';
    const data = payload.data || payload.human_fields || {};

    const fields = Object.entries(data).filter(([key]) => !IGNORED_FIELDS.has(key));

    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.NOTIFY_TO_EMAIL;
    const fromEmail = process.env.NOTIFY_FROM_EMAIL || 'All Joy Hub <onboarding@resend.dev>';

    if (!apiKey || !toEmail) {
      console.error('Faltam variáveis de ambiente RESEND_API_KEY ou NOTIFY_TO_EMAIL');
      return { statusCode: 500, body: 'Missing configuration' };
    }

    const title = FORM_TITLES[formName] || `Novo envio — ${formName}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `${title} — All Joy Hub`,
        html: buildEmailHtml(formName, fields)
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend error:', res.status, errText);
      return { statusCode: 502, body: 'Failed to send email' };
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('notify-form error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
