const authService = require('../services/authService');

async function sendCode(req, res) {
  await authService.sendCode(req.body.email);
  res.json({ success: true, message: 'Código enviado com sucesso!' });
}

async function register(req, res) {
  const result = await authService.register(req.body);
  res.json(result);
}

async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

async function me(req, res) {
  const result = await authService.getCurrentUser(req.userId);
  res.json(result);
}

module.exports = { sendCode, register, login, me };
