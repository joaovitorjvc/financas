import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import React, { createElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useDashboardData } from '../src/hooks/useDashboardData.js';
import { calculateTotals, getMonthTransactions } from '../src/utils/finance.js';
import { authApi, budgetApi, transactionApi } from '../src/services/api.js';

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
  assert.match(dashboard, /t\.type === 'expense' && \(\s*<select/);
});

test('dashboard hook preserves local invariants when status updates succeed or fail', async () => {
  let latest;
  let renderer;
  let shouldFail = false;
  const yearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const initialTransactions = [
    {
      id: 'income-1',
      type: 'income',
      amount: 5000,
      category: 'salario',
      date: `${yearMonth}-05`,
      installments: 1
    },
    {
      id: 'expense-1',
      type: 'expense',
      amount: 1234,
      category: 'mercado',
      date: `${yearMonth}-06`,
      installments: 3,
      status: 'pending'
    },
    {
      id: 'expense-2',
      type: 'expense',
      amount: 800,
      category: 'transporte',
      date: `${yearMonth}-07`,
      installments: 2,
      status: 'pending'
    }
  ];
  const originalTransactionList = transactionApi.list;
  const originalUpdateStatus = transactionApi.updateStatus;
  const originalBudgetList = budgetApi.list;
  transactionApi.list = async () => initialTransactions;
  transactionApi.updateStatus = async (token, id, status) => {
    assert.equal(token, 'token-1');
    assert.equal(id, 'expense-1');
    if (shouldFail) throw new Error('Falha de rede');
    return { id, status };
  };
  budgetApi.list = async () => ({ mercado: 1000 });

  function DashboardDataHarness({ token, onChange }) {
    const data = useDashboardData(token);
    onChange(data);
    return createElement('output', { 'data-count': data.transactions.length });
  }

  try {
    await act(async () => {
      renderer = TestRenderer.create(createElement(DashboardDataHarness, {
        token: 'token-1',
        onChange: value => { latest = value; }
      }));
    });

    const monthTransactions = getMonthTransactions(latest.transactions, yearMonth);
    const totalsBefore = calculateTotals(monthTransactions);
    const filteredBefore = monthTransactions
      .filter(transaction => transaction.category === 'mercado')
      .map(transaction => transaction.id);

    await act(async () => {
      await latest.updateTransactionStatus('expense-1', 'paid');
    });

    const updatedExpense = latest.transactions.find(transaction => transaction.id === 'expense-1');
    assert.equal(updatedExpense.status, 'paid');
    assert.equal(updatedExpense.date, `${yearMonth}-06`);
    assert.equal(updatedExpense.installments, 3);
    assert.deepEqual(
      getMonthTransactions(latest.transactions, yearMonth)
        .filter(transaction => transaction.category === 'mercado')
        .map(transaction => transaction.id),
      filteredBefore
    );
    assert.deepEqual(calculateTotals(getMonthTransactions(latest.transactions, yearMonth)), totalsBefore);

    const stateBeforeFailure = latest.transactions;
    shouldFail = true;
    await act(async () => {
      await assert.rejects(
        latest.updateTransactionStatus('expense-1', 'next_month'),
        { message: 'Falha de rede' }
      );
    });
    assert.deepEqual(latest.transactions, stateBeforeFailure);
  } finally {
    transactionApi.list = originalTransactionList;
    transactionApi.updateStatus = originalUpdateStatus;
    budgetApi.list = originalBudgetList;
    if (renderer) {
      await act(async () => renderer.unmount());
    }
  }
});
