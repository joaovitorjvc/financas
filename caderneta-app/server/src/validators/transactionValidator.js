const AppError = require('../errors/AppError');

const EXPENSE_CATEGORIES = ['moradia', 'mercado', 'transporte', 'contas', 'lazer', 'saude', 'outros'];
const INCOME_CATEGORIES = ['salario', 'freela', 'investimentos', 'outros_in'];

function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function validateTransaction(req, res, next) {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const { description, amount, type, category, date } = body;

    if (!description || amount === undefined || !type || !category || !date) {
      throw new AppError('Campos obrigatórios faltando', 400);
    }
    if (typeof description !== 'string' || !description.trim()) {
      throw new AppError('Descrição inválida', 400);
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Valor inválido', 400);
    }
    if (type !== 'income' && type !== 'expense') {
      throw new AppError('Tipo de lançamento inválido', 400);
    }
    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (!categories.includes(category)) {
      throw new AppError('Categoria inválida', 400);
    }
    if (!isValidDate(date)) {
      throw new AppError('Data inválida', 400);
    }

    const installments = body.installments === undefined ? 1 : Number(body.installments);
    if (!Number.isInteger(installments) || installments < 1 || installments > 48) {
      throw new AppError('Número de parcelas deve estar entre 1 e 48', 400);
    }
    body.installments = installments;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { validateTransaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES };
