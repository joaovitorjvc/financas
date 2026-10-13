const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateInstallments, listTransactions, updateTransactionStatus } = require('../src/services/transactionService');
const { Transaction } = require('../src/db');

test('calcula parcelas mensais ajustando fevereiro e preservando a descrição numerada', () => {
  const transactions = calculateInstallments({
    description: 'Seguro',
    amount: 12000,
    type: 'expense',
    category: 'outros',
    date: '2024-01-31',
    installments: 3
  });

  assert.deepEqual(transactions.map(transaction => ({
    description: transaction.description,
    amount: transaction.amount,
    date: transaction.date
  })), [
    { description: 'Seguro (1/3)', amount: 4000, date: '2024-01-31' },
    { description: 'Seguro (2/3)', amount: 4000, date: '2024-02-29' },
    { description: 'Seguro (3/3)', amount: 4000, date: '2024-03-31' }
  ]);
});

test('aplica pending para despesas novas e não adiciona status a entradas', () => {
  const expense = calculateInstallments({
    description: 'Compra',
    amount: 1000,
    type: 'expense',
    category: 'outros',
    date: '2024-01-01'
  });
  const income = calculateInstallments({
    description: 'Salário',
    amount: 1000,
    type: 'income',
    category: 'salario',
    date: '2024-01-01'
  });

  assert.equal(expense[0].status, 'pending');
  assert.equal(Object.hasOwn(income[0], 'status'), false);
});

test('lista despesas legadas com fallback pending e mantém entradas sem status', async () => {
  const originalFind = Transaction.find;
  Transaction.find = async () => [
    {
      _id: { toString: () => 'expense-1' },
      userId: 'user-1',
      groupId: null,
      description: 'Mercado',
      amount: 2500,
      type: 'expense',
      category: 'mercado',
      date: '2026-10-13'
    },
    {
      _id: { toString: () => 'income-1' },
      userId: 'user-1',
      groupId: null,
      description: 'Salário',
      amount: 5000,
      type: 'income',
      category: 'salario',
      date: '2026-10-05'
    }
  ];

  try {
    const transactions = await listTransactions('user-1');
    assert.equal(transactions[0].status, 'pending');
    assert.equal(Object.hasOwn(transactions[1], 'status'), false);
  } finally {
    Transaction.find = originalFind;
  }
});

test('atualiza status somente na despesa do usuário informado', async () => {
  const originalFindOneAndUpdate = Transaction.findOneAndUpdate;
  let receivedFilter;
  let receivedUpdate;
  let receivedOptions;
  Transaction.findOneAndUpdate = async (filter, update, options) => {
    receivedFilter = filter;
    receivedUpdate = update;
    receivedOptions = options;
    return {
      _id: { toString: () => 'expense-1' },
      userId: 'user-1',
      groupId: null,
      description: 'Mercado',
      amount: 2500,
      type: 'expense',
      category: 'mercado',
      date: '2026-10-13',
      status: 'paid'
    };
  };

  try {
    const transaction = await updateTransactionStatus('user-1', 'expense-1', 'paid');
    assert.equal(transaction.status, 'paid');
    assert.deepEqual(receivedFilter, { _id: 'expense-1', userId: 'user-1', type: 'expense' });
    assert.deepEqual(receivedUpdate, { status: 'paid' });
    assert.deepEqual(receivedOptions, { new: true, runValidators: true });
  } finally {
    Transaction.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('rejeita mais de 48 parcelas', () => {
  assert.throws(
    () => calculateInstallments({
      description: 'Compra',
      amount: 1000,
      type: 'expense',
      category: 'outros',
      date: '2024-01-01',
      installments: 49
    }),
    { message: 'Número de parcelas deve estar entre 1 e 48' }
  );
});
