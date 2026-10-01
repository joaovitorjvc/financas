const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./middleware/auth');
const { readData, writeData } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'caderneta-chave-secreta-2026';

app.use(cors());
app.use(express.json());

// Auth
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }

  const db = readData();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'E-mail já cadastrado' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = {
    id: Date.now().toString(),
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  writeData(db);

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readData();
  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const db = readData();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

// Transactions - GET
app.get('/api/transactions', authMiddleware, (req, res) => {
  const db = readData();
  const userTx = db.transactions.filter(t => t.userId === req.userId);
  res.json(userTx);
});

// Transactions - POST (com parcelamento)
app.post('/api/transactions', authMiddleware, (req, res) => {
  const { description, amount, type, category, date, installments = 1 } = req.body;
  if (!description || !amount || !type || !category || !date) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  const db = readData();
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

    const tx = {
      id: `${Date.now()}_${i}`,
      groupId,
      userId: req.userId,
      description: desc,
      amount: installmentAmount,
      type,
      category,
      date: formattedDate,
      createdAt: new Date().toISOString()
    };

    db.transactions.push(tx);
    createdTransactions.push(tx);
  }

  writeData(db);
  res.status(201).json(createdTransactions);
});

// Transactions - DELETE
app.delete('/api/transactions/:id', authMiddleware, (req, res) => {
  const db = readData();
  const initialLen = db.transactions.length;
  db.transactions = db.transactions.filter(t => !(t.id === req.params.id && t.userId === req.userId));

  if (db.transactions.length === initialLen) {
    return res.status(404).json({ error: 'Lançamento não encontrado' });
  }

  writeData(db);
  res.json({ success: true });
});

// Budgets / Envelopes
app.get('/api/budgets', authMiddleware, (req, res) => {
  const db = readData();
  const userBudgets = db.budgets.find(b => b.userId === req.userId);
  res.json(userBudgets ? userBudgets.limits : {});
});

app.put('/api/budgets', authMiddleware, (req, res) => {
  const db = readData();
  let budgetObj = db.budgets.find(b => b.userId === req.userId);
  if (!budgetObj) {
    budgetObj = { userId: req.userId, limits: {} };
    db.budgets.push(budgetObj);
  }
  budgetObj.limits = req.body;
  writeData(db);
  res.json(budgetObj.limits);
});

// Servir arquivos do React compilado
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
