const express = require('express');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const budgetController = require('../controllers/budgetController');
const validateBudget = require('../validators/budgetValidator');

const router = express.Router();

router.use(authMiddleware);
router.get('/', asyncHandler(budgetController.list));
router.put('/', validateBudget, asyncHandler(budgetController.update));

module.exports = router;
