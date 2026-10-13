const budgetService = require('../services/budgetService');

async function list(req, res) {
  const limits = await budgetService.getBudgets(req.userId);
  res.json(limits);
}

async function update(req, res) {
  const limits = await budgetService.updateBudgets(req.userId, req.body);
  res.json(limits);
}

module.exports = { list, update };
