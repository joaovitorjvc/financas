import { useCallback, useEffect, useState } from 'react';
import { budgetApi, transactionApi } from '../services/api';

export function useDashboardData(token) {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    setLoadError('');
    if (!token) {
      setTransactions([]);
      setBudgets({});
      return;
    }

    try {
      const [nextTransactions, nextBudgets] = await Promise.all([
        transactionApi.list(token),
        budgetApi.list(token)
      ]);
      setTransactions(nextTransactions);
      setBudgets(nextBudgets);
    } catch (error) {
      console.error(error);
      setLoadError(`Não foi possível carregar os dados: ${error.message}`);
      throw error;
    }
  }, [token]);

  const retry = useCallback(() => refresh().catch(() => {}), [refresh]);

  useEffect(() => {
    retry();
  }, [retry]);

  const addTransaction = async payload => {
    await transactionApi.create(token, payload);
    await refresh();
  };

  const deleteTransaction = async id => {
    await transactionApi.remove(token, id);
    setTransactions(previous => previous.filter(transaction => transaction.id !== id));
  };

  const updateBudget = async (categoryId, newAmount) => {
    const updated = { ...budgets, [categoryId]: newAmount };
    setBudgets(updated);
    await budgetApi.update(token, updated);
  };

  return {
    transactions,
    budgets,
    loadError,
    retry,
    refresh,
    addTransaction,
    deleteTransaction,
    updateBudget
  };
}
