const express = require('express');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const transactionController = require('../controllers/transactionController');
const { validateTransaction } = require('../validators/transactionValidator');

const router = express.Router();

router.use(authMiddleware);
router.get('/', asyncHandler(transactionController.list));
router.post('/', validateTransaction, asyncHandler(transactionController.create));
router.delete('/:id', asyncHandler(transactionController.remove));

module.exports = router;
