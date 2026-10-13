const AppError = require('../errors/AppError');

module.exports = function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  if (err.code === 11000) {
    return res.status(400).json({ error: 'Registro já existe' });
  }

  console.error('Erro não tratado:', err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
};
