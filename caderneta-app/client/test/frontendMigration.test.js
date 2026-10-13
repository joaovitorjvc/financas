import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { authApi, transactionApi } from '../src/services/api.js';

const authContextPath = new URL('../src/context/AuthContext.jsx', import.meta.url);
const dashboardPath = new URL('../src/pages/DashboardPage.jsx', import.meta.url);

function response(data, ok = true) {
  return {
    ok,
    json: async () => data
  };
}

test('auth API sends login data and hydrates the current user with Bearer auth', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return response({ user: { id: 'user-1', name: 'Ana', email: 'ana@example.com' } });
  };

  try {
    const data = await authApi.login({ email: 'ana@example.com', password: 'secret' });
    const hydrated = await authApi.me('token-1');

    assert.equal(data.user.id, 'user-1');
    assert.equal(hydrated.user.email, 'ana@example.com');
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      email: 'ana@example.com',
      password: 'secret'
    });
    assert.equal(calls[1].options.headers.Authorization, 'Bearer token-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('transaction API rejects failed mutations with the server message', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response({ error: 'Sessão expirada' }, false);

  try {
    await assert.rejects(
      transactionApi.create('token-1', { description: 'Teste' }),
      { message: 'Sessão expirada' }
    );
    await assert.rejects(
      transactionApi.remove('token-1', 'transaction-1'),
      { message: 'Sessão expirada' }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('transaction status API uses the authenticated PATCH contract', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return response({ id: 'transaction-1', status: 'paid' });
  };

  try {
    const updated = await transactionApi.updateStatus('token-1', 'transaction-1', 'paid');

    assert.equal(updated.status, 'paid');
    assert.equal(calls[0].path, '/api/transactions/transaction-1/status');
    assert.equal(calls[0].options.method, 'PATCH');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer token-1');
    assert.deepEqual(JSON.parse(calls[0].options.body), { status: 'paid' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('auth hydration and dashboard mutation failures remain wired to the UI', async () => {
  const [authContext, dashboard] = await Promise.all([
    readFile(authContextPath, 'utf8'),
    readFile(dashboardPath, 'utf8')
  ]);

  assert.match(authContext, /authApi\.me\(token\)/);
  assert.match(authContext, /localStorage\.setItem\('caderneta_token'/);
  assert.match(authContext, /localStorage\.setItem\('caderneta_user'/);
  assert.match(dashboard, /await addTransaction\(payload\)/);
  assert.match(dashboard, /Não foi possível salvar o lançamento/);
  assert.match(dashboard, /await deleteTransaction\(id\)/);
  assert.match(dashboard, /Não foi possível remover o lançamento/);
  assert.match(dashboard, /await updateTransactionStatus\(id, status\)/);
  assert.match(dashboard, /value=\{t\.status \|\| 'pending'\}/);
  assert.match(dashboard, /<option value="paid">Pago<\/option>/);
  assert.match(dashboard, /<option value="pending">Pendente<\/option>/);
  assert.match(dashboard, /<option value="next_month">Proximo Mes<\/option>/);
  assert.match(dashboard, /Não foi possível atualizar o status/);
});
