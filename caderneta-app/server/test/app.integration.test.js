const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { jwtSecret } = require('../src/config/env');
const { Transaction } = require('../src/db');

let server;
let baseUrl;

function tokenFor(id) {
  return jwt.sign({ id }, jwtSecret);
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

test.before(async () => {
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('lista transações com sucesso e filtra pelo usuário autenticado', async () => {
  const originalFind = Transaction.find;
  let receivedFilter;
  Transaction.find = async filter => {
    receivedFilter = filter;
    return [{
      _id: { toString: () => 'transaction-1' },
      userId: 'user-1',
      groupId: null,
      description: 'Mercado',
      amount: 2500,
      type: 'expense',
      category: 'mercado',
      date: '2026-10-13'
    }];
  };

  try {
    const response = await request('/api/transactions', {
      headers: { Authorization: `Bearer ${tokenFor('user-1')}` }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{
      id: 'transaction-1',
      userId: 'user-1',
      groupId: null,
      description: 'Mercado',
      amount: 2500,
      type: 'expense',
      category: 'mercado',
      date: '2026-10-13'
    }]);
    assert.deepEqual(receivedFilter, { userId: 'user-1' });
  } finally {
    Transaction.find = originalFind;
  }
});

test('rejeita payload de transação inválido com 400', async () => {
  const response = await request('/api/transactions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenFor('user-1')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ description: 'Sem os campos obrigatórios' })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Campos obrigatórios faltando' });
});

test('rejeita rota protegida sem bearer com 401', async () => {
  const response = await request('/api/transactions');

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Token não fornecido' });
});
