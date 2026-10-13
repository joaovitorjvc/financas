const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatCurrency = cents => brl.format(cents / 100);
export const formatShortCurrency = cents => brl.format(Math.round(cents / 100)).replace(/,00$/, '');

export function getCurrentYearMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthTransactions(transactions, yearMonth) {
  return transactions.filter(transaction => transaction.date.startsWith(yearMonth));
}

export function calculateTotals(transactions) {
  return transactions.reduce((totals, transaction) => {
    if (transaction.type === 'income') totals.totalIn += transaction.amount;
    if (transaction.type === 'expense') totals.totalOut += transaction.amount;
    return totals;
  }, { totalIn: 0, totalOut: 0 });
}

export function calculateSpentByCategory(transactions) {
  return transactions
    .filter(transaction => transaction.type === 'expense')
    .reduce((spent, transaction) => ({
      ...spent,
      [transaction.category]: (spent[transaction.category] || 0) + transaction.amount
    }), {});
}

export function getMonthName(yearMonth) {
  const [year, month] = yearMonth.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleString('pt-BR', { month: 'long' });
}
