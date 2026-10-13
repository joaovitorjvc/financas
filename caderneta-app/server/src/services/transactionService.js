const { Transaction } = require('../db');
const AppError = require('../errors/AppError');

const MAX_INSTALLMENTS = 48;

function calculateInstallments({ description, amount, type, category, date, installments = 1 }) {
  const numInstallments = Number(installments);
  if (!Number.isInteger(numInstallments) || numInstallments < 1 || numInstallments > MAX_INSTALLMENTS) {
    throw new AppError('Número de parcelas deve estar entre 1 e 48', 400);
  }

  const [yearStr, monthStr, dayStr] = date.split('-');
  const baseYear = parseInt(yearStr, 10);
  const baseMonth = parseInt(monthStr, 10);
  const baseDay = parseInt(dayStr, 10);
  const installmentAmount = Math.round(Number(amount) / numInstallments);
  const transactions = [];

  for (let i = 0; i < numInstallments; i++) {
    const currentDate = new Date(baseYear, baseMonth - 1 + i, 1);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const maxDaysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
    const finalDay = String(Math.min(baseDay, maxDaysInMonth)).padStart(2, '0');
    const formattedDate = `${year}-${month}-${finalDay}`;
    const installmentDescription = numInstallments > 1
      ? `${description} (${i + 1}/${numInstallments})`
      : description;

    transactions.push({
      description: installmentDescription,
      amount: installmentAmount,
      type,
      category,
      date: formattedDate
    });
  }

  return transactions;
}

async function listTransactions(userId) {
  const userTransactions = await Transaction.find({ userId });
  return userTransactions.map(transaction => ({
    id: transaction._id.toString(),
    userId: transaction.userId,
    groupId: transaction.groupId,
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type,
    category: transaction.category,
    date: transaction.date
  }));
}

async function createTransactions(userId, payload) {
  const entries = calculateInstallments(payload);
  const groupId = entries.length > 1 ? Date.now().toString() : null;
  const createdTransactions = [];

  for (const entry of entries) {
    const transaction = await Transaction.create({ ...entry, groupId, userId });
    createdTransactions.push({
      id: transaction._id.toString(),
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date
    });
  }

  return createdTransactions;
}

async function deleteTransaction(userId, transactionId) {
  const deleted = await Transaction.findOneAndDelete({ _id: transactionId, userId });
  if (!deleted) throw new AppError('Lançamento não encontrado', 404);
}

module.exports = { calculateInstallments, listTransactions, createTransactions, deleteTransaction };
