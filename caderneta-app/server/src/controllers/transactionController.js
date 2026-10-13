const transactionService = require('../services/transactionService');

async function list(req, res) {
  const transactions = await transactionService.listTransactions(req.userId);
  res.json(transactions);
}

async function create(req, res) {
  const transactions = await transactionService.createTransactions(req.userId, req.body);
  res.status(201).json(transactions);
}

async function remove(req, res) {
  await transactionService.deleteTransaction(req.userId, req.params.id);
  res.json({ success: true });
}

module.exports = { list, create, remove };
