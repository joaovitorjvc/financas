const AppError = require('../errors/AppError');

function validateBudget(req, res, next) {
  try {
    const limits = req.body;
    if (!limits || typeof limits !== 'object' || Array.isArray(limits)) {
      throw new AppError('Orçamento inválido', 400);
    }

    for (const value of Object.values(limits)) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new AppError('Os limites do orçamento devem ser numéricos', 400);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = validateBudget;
