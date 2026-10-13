const transactionService = require('../services/transactionService');

async function list(req, res) {
  const transactions = await transactionService.listTransactions(req.userId);
  res.json(transactions);
}

async function create(req, res) {
  const transactions = await transactionService.createTransactions(req.userId, req.body);
  res.status(201).json(transactions);
}

async function updateStatus(req, res) {
  const transaction = await transactionService.updateTransactionStatus(
    req.userId,
    req.params.id,
    req.body.status
  );
  res.json(transaction);
}

async function remove(req, res) {
  await transactionService.deleteTransaction(req.userId, req.params.id);
  res.json({ success: true });
}

module.exports = { list, create, updateStatus, remove };
