const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./middleware/auth');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const { connectDB, User, Transaction, Budget, VerificationCode } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'caderneta-chave-secreta-2026';

connectDB().catch(err => console.error('Erro ao conectar no MongoDB:', err));

app.use(cors());
app.use(express.json());

// Auth - Enviar código por e-mail
app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).json({ error: 'E-mail já cadastrado' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await VerificationCode.deleteMany({ email: email.toLowerCase() });
  await VerificationCode.create({ email: email.toLowerCase(), code });

  try {
    await resend.emails.send({
      from: 'Caderneta <onboarding@resend.dev>',
      to: email.toLowerCase(),
      subject: `${code} é o seu código de verificação — Caderneta`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #2b1d14;">
          <h2 style="color: #ff7200;">Caderneta — Minhas Finanças</h2>
          <p>Seu código de confirmação para criar a conta é:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px; background: #f1ede7; display: inline-block; border-radius: 8px;">
            ${code}
          </div>
          <p style="color: #7d6b5e; margin-top: 16px;">Válido por 10 minutos. Se você não solicitou, ignore este e-mail.</p>
        </div>
      `
    });
    res.json({ success: true, message: 'Código enviado com sucesso!' });
  } catch (err) {
    console.error('Erro Resend:', err);
    res.status(500).json({ error: 'Erro ao enviar o e-mail. Verifique a chave do Resend.' });
  }
});

// Auth - Registrar com validação de código
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, code } = req.body;
  if (!name || !email || !password || !code) {
    return res.status(400).json({ error: 'Nome, e-mail, senha e código são obrigatórios' });
  }

  const valid = await VerificationCode.findOne({ email: email.toLowerCase(), code: code.trim() });
  if (!valid) {
    return res.status(400).json({ error: 'Código de verificação incorreto ou expirado' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).json({ error: 'E-mail já cadastrado' });

  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword
  });

  await VerificationCode.deleteMany({ email: email.toLowerCase() });

  const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: { id: user._id.toString(), name: user.name, email: user.email }, token });
});

// Auth - Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: { id: user._id.toString(), name: user.name, email: user.email }, token });
});

// Auth - Me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ user: { id: user._id.toString(), name: user.name, email: user.email } });
});

// Transactions - GET
app.get('/api/transactions', authMiddleware, async (req, res) => {
  const userTx = await Transaction.find({ userId: req.userId });
  res.json(userTx.map(t => ({
    id: t._id.toString(),
    userId: t.userId,
    groupId: t.groupId,
    description: t.description,
    amount: t.amount,
    type: t.type,
    category: t.category,
    date: t.date
  })));
});

// Transactions - POST (com parcelamento)
app.post('/api/transactions', authMiddleware, async (req, res) => {
  const { description, amount, type, category, date, installments = 1 } = req.body;
  if (!description || !amount || !type || !category || !date) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  const numInstallments = Math.max(1, parseInt(installments, 10) || 1);
  const [yearStr, monthStr, dayStr] = date.split('-');
  const baseYear = parseInt(yearStr, 10);
  const baseMonth = parseInt(monthStr, 10);
  const baseDay = parseInt(dayStr, 10);

  const installmentAmount = Math.round(Number(amount) / numInstallments);
  const createdTransactions = [];
  const groupId = numInstallments > 1 ? Date.now().toString() : null;

  for (let i = 0; i < numInstallments; i++) {
    const d = new Date(baseYear, baseMonth - 1 + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const maxDaysInMonth = new Date(y, d.getMonth() + 1, 0).getDate();
    const finalDay = String(Math.min(baseDay, maxDaysInMonth)).padStart(2, '0');
    const formattedDate = `${y}-${m}-${finalDay}`;

    const desc = numInstallments > 1
      ? `${description} (${i + 1}/${numInstallments})`
      : description;

    const tx = await Transaction.create({
      groupId,
      userId: req.userId,
      description: desc,
      amount: installmentAmount,
      type,
      category,
      date: formattedDate
    });

    createdTransactions.push({
      id: tx._id.toString(),
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      date: tx.date
    });
  }

  res.status(201).json(createdTransactions);
});

// Transactions - DELETE
app.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
  const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!deleted) return res.status(404).json({ error: 'Lançamento não encontrado' });
  res.json({ success: true });
});

// Budgets / Envelopes
app.get('/api/budgets', authMiddleware, async (req, res) => {
  const budget = await Budget.findOne({ userId: req.userId });
  res.json(budget ? budget.limits : {});
});

app.put('/api/budgets', authMiddleware, async (req, res) => {
  const budget = await Budget.findOneAndUpdate(
    { userId: req.userId },
    { limits: req.body },
    { upsert: true, new: true }
  );
  res.json(budget.limits);
});

// Servir frontend React
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
