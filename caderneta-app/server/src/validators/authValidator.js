const AppError = require('../errors/AppError');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bodyOf(req) {
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
}

function validateEmail(email) {
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    throw new AppError('E-mail inválido', 400);
  }
  return email.trim().toLowerCase();
}

function validateSendCode(req, res, next) {
  try {
    const body = bodyOf(req);
    if (!body.email) throw new AppError('E-mail é obrigatório', 400);
    body.email = validateEmail(body.email);
    next();
  } catch (err) {
    next(err);
  }
}

function validateRegister(req, res, next) {
  try {
    const body = bodyOf(req);
    if (!body.name || !body.email || !body.password || !body.code) {
      throw new AppError('Nome, e-mail, senha e código são obrigatórios', 400);
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new AppError('Nome inválido', 400);
    }
    if (typeof body.password !== 'string' || !body.password) {
      throw new AppError('Senha inválida', 400);
    }
    if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code.trim())) {
      throw new AppError('Código de verificação inválido', 400);
    }
    body.email = validateEmail(body.email);
    body.code = body.code.trim();
    next();
  } catch (err) {
    next(err);
  }
}

function validateLogin(req, res, next) {
  try {
    const body = bodyOf(req);
    if (!body.email || !body.password) {
      throw new AppError('E-mail e senha são obrigatórios', 400);
    }
    if (typeof body.password !== 'string' || !body.password) {
      throw new AppError('Senha inválida', 400);
    }
    body.email = validateEmail(body.email);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { validateSendCode, validateRegister, validateLogin };
