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
      date: '2026-10-13',
      status: 'pending'
    }]);
    assert.deepEqual(receivedFilter, { userId: 'user-1' });
  } finally {
    Transaction.find = originalFind;
  }
});

test('atualiza status da despesa persistida e mantém isolamento por userId', async () => {
  const originalFindOneAndUpdate = Transaction.findOneAndUpdate;
  let receivedFilter;
  let receivedUpdate;
  Transaction.findOneAndUpdate = async (filter, update) => {
    receivedFilter = filter;
    receivedUpdate = update;
    return {
      _id: { toString: () => 'transaction-1' },
      userId: 'user-2',
      groupId: null,
      description: 'Mercado',
      amount: 2500,
      type: 'expense',
      category: 'mercado',
      date: '2026-10-13',
      status: update.status
    };
  };

  try {
    const response = await request('/api/transactions/transaction-1/status', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenFor('user-2')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'next_month' })
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'next_month');
    assert.deepEqual(receivedFilter, {
      _id: 'transaction-1',
      userId: 'user-2',
      type: 'expense'
    });
    assert.deepEqual(receivedUpdate, { status: 'next_month' });
  } finally {
    Transaction.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('rejeita status fora da allowlist com 400', async () => {
  const response = await request('/api/transactions/transaction-1/status', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenFor('user-1')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'cancelled' })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Status inválido' });
});

test('retorna 404 ao atualizar lançamento inexistente ou não pertencente ao usuário', async () => {
  const originalFindOneAndUpdate = Transaction.findOneAndUpdate;
  Transaction.findOneAndUpdate = async () => null;

  try {
    const response = await request('/api/transactions/transaction-1/status', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenFor('user-1')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'paid' })
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Lançamento não encontrado' });
  } finally {
    Transaction.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('rejeita PATCH de status sem autenticação', async () => {
  const response = await request('/api/transactions/transaction-1/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'paid' })
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Token não fornecido' });
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
