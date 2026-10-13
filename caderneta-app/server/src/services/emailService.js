const { senderEmail, brevoApiKey } = require('../config/env');
const AppError = require('../errors/AppError');

async function sendVerificationEmail(email, code) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Caderneta', email: senderEmail },
        to: [{ email }],
        subject: `${code} é o seu código de verificação — Caderneta`,
        htmlContent: `
          <div style="font-family: sans-serif; padding: 20px; color: #2b1d14;">
            <h2 style="color: #ff7200;">Caderneta — Minhas Finanças</h2>
            <p>Seu código de confirmação para criar a conta é:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px; background: #f1ede7; display: inline-block; border-radius: 8px;">
              ${code}
            </div>
            <p style="color: #7d6b5e; margin-top: 16px;">Válido por 10 minutos. Se você não solicitou, ignore este e-mail.</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro Brevo API:', errorData);
      throw new AppError('Erro ao enviar o e-mail via Brevo.', 500);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('Erro ao chamar Brevo:', err);
    throw new AppError('Erro de conexão com o serviço de e-mail.', 500);
  }
}

module.exports = { sendVerificationEmail };
