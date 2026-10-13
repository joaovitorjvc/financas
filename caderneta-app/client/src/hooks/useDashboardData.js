import { useCallback, useEffect, useState } from 'react';
import { budgetApi, transactionApi } from '../services/api';

export function useDashboardData(token) {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});

  const refresh = useCallback(async () => {
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
      throw error;
    }
  }, [token]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

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
    refresh,
    addTransaction,
    deleteTransaction,
    updateBudget
  };
}
