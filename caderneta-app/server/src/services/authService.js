const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, VerificationCode } = require('../db');
const { jwtSecret } = require('../config/env');
const { sendVerificationEmail } = require('./emailService');
const AppError = require('../errors/AppError');

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

async function sendCode(email) {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('E-mail já cadastrado', 400);

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await VerificationCode.deleteMany({ email });
  await VerificationCode.create({ email, code });
  await sendVerificationEmail(email, code);
}

async function register({ name, email, password, code }) {
  const valid = await VerificationCode.findOne({ email, code });
  if (!valid) throw new AppError('Código de verificação incorreto ou expirado', 400);

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('E-mail já cadastrado', 400);

  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = await User.create({ name, email, password: hashedPassword });
  await VerificationCode.deleteMany({ email });

  const token = jwt.sign({ id: user._id.toString() }, jwtSecret, { expiresIn: '7d' });
  return { user: publicUser(user), token };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    throw new AppError('Credenciais inválidas', 401);
  }

  const token = jwt.sign({ id: user._id.toString() }, jwtSecret, { expiresIn: '7d' });
  return { user: publicUser(user), token };
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Usuário não encontrado', 404);
  return { user: publicUser(user) };
}

module.exports = { sendCode, register, login, getCurrentUser };
