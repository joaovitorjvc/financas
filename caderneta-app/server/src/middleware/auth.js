const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'caderneta-chave-secreta-2026';

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

  const [, token] = authHeader.split(' ');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};
