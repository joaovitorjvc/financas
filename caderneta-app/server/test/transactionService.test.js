const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateInstallments } = require('../src/services/transactionService');

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
