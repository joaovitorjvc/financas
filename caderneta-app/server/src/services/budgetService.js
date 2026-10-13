const { Budget } = require('../db');

async function getBudgets(userId) {
  const budget = await Budget.findOne({ userId });
  return budget ? budget.limits : {};
}

async function updateBudgets(userId, limits) {
  const budget = await Budget.findOneAndUpdate(
    { userId },
    { limits },
    { upsert: true, new: true }
  );
  return budget.limits;
}

module.exports = { getBudgets, updateBudgets };
