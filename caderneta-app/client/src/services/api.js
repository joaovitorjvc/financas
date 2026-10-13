async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'Erro ao realizar requisição');
  }

  return data;
}

export const authApi = {
  sendCode: email => request('/api/auth/send-code', {
    method: 'POST',
    body: { email }
  }),
  register: ({ name, email, password, code }) => request('/api/auth/register', {
    method: 'POST',
    body: { name, email, password, code }
  }),
  login: ({ email, password }) => request('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  }),
  me: token => request('/api/auth/me', { token })
};

export const transactionApi = {
  list: token => request('/api/transactions', { token }),
  create: (token, payload) => request('/api/transactions', {
    method: 'POST',
    token,
    body: payload
  }),
  remove: (token, id) => request(`/api/transactions/${id}`, {
    method: 'DELETE',
    token
  }),
  updateStatus: (token, id, status) => request(`/api/transactions/${id}/status`, {
    method: 'PATCH',
    token,
    body: { status }
  })
};

export const budgetApi = {
  list: token => request('/api/budgets', { token }),
  update: (token, limits) => request('/api/budgets', {
    method: 'PUT',
    token,
    body: limits
  })
};
