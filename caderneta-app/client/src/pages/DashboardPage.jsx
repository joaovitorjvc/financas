import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, LogOut, Plus, Trash2, Tag, Calendar, DollarSign } from 'lucide-react';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (cents) => brl.format(cents / 100);
const fmtCurto = (cents) => brl.format(Math.round(cents / 100)).replace(/,00$/, '');

const CATEGORIAS_PADRAO = [
  { id: 'moradia', nome: 'Moradia', teto: 250000 },
  { id: 'mercado', nome: 'Mercado', teto: 140000 },
  { id: 'transporte', nome: 'Transporte', teto: 60000 },
  { id: 'contas', nome: 'Contas Fixas', teto: 45000 },
  { id: 'lazer', nome: 'Lazer', teto: 60000 },
  { id: 'saude', nome: 'Saúde', teto: 35000 },
  { id: 'outros', nome: 'Outros', teto: 30000 },
];

const ENTRADAS_CAT = [
  { id: 'salario', nome: 'Salário' },
  { id: 'freela', nome: 'Freela / Extra' },
  { id: 'investimentos', nome: 'Rendimentos' },
  { id: 'outros_in', nome: 'Outros' }
];

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const [currentYm, setCurrentYm] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [filterCat, setFilterCat] = useState(null);

  // Form states
  const [type, setType] = useState('expense');
  const [amountInput, setAmountInput] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('mercado');
  const [day, setDay] = useState(new Date().getDate());

  // Load data
  const fetchData = async () => {
    try {
      const [txRes, bRes] = await Promise.all([
        fetch('/api/transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/budgets', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (txRes.ok) setTransactions(await txRes.json());
      if (bRes.ok) setBudgets(await bRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Calculations for current month
  const monthTx = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(currentYm));
  }, [transactions, currentYm]);

  const totalIn = monthTx.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = monthTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const sobra = totalIn - totalOut;

  const spentByCat = useMemo(() => {
    const map = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [monthTx]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const cleanAmount = Math.round(parseFloat(amountInput.replace(',', '.')) * 100);
    if (!cleanAmount || cleanAmount <= 0) return;

    const dateStr = `${currentYm}-${String(day).padStart(2, '0')}`;
    const payload = {
      description: desc.trim() || (type === 'income' ? 'Entrada' : 'Gasto'),
      amount: cleanAmount,
      type,
      category: cat,
      date: dateStr
    };

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setAmountInput('');
      setDesc('');
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleUpdateBudget = async (catId, newAmount) => {
    const updated = { ...budgets, [catId]: newAmount };
    setBudgets(updated);
    await fetch('/api/budgets', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updated)
    });
  };

  const changeMonth = (diff) => {
    const [y, m] = currentYm.split('-').map(Number);
    const d = new Date(y, m - 1 + diff, 1);
    setCurrentYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const [ano, mes] = currentYm.split('-');
  const nomeMes = new Date(Number(ano), Number(mes) - 1, 1).toLocaleString('pt-BR', { month: 'long' });

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-[#2b1d14] font-sans pb-16">
      {/* Header / Capa */}
      <header className="bg-[#ff7200] text-[#2b1d14] pb-12 pt-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between border-b border-[#2b1d14]/15 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="font-serif font-black tracking-widest text-lg uppercase">Caderneta</span>
              <span className="text-xs bg-[#2b1d14] text-white px-2 py-0.5 rounded-full font-bold">
                {user?.name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-[#2b1d14]/10 rounded-full px-2 py-1">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-[#2b1d14]/10 rounded-full">
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 font-bold capitalize text-sm">{nomeMes} {ano}</span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-[#2b1d14]/10 rounded-full">
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                onClick={logout}
                title="Sair"
                className="flex items-center gap-1.5 text-xs font-bold bg-[#2b1d14] text-[#fbf9f6] px-3 py-1.5 rounded-lg hover:bg-[#453023] transition"
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-bold uppercase tracking-wider text-[#2b1d14]/80">
              {sobra >= 0 ? `Sobra prevista em ${nomeMes}` : `Faltou em ${nomeMes}`}
            </p>
            <h1 className="text-5xl sm:text-7xl font-serif font-black tracking-tight mt-1 tabular-nums">
              {fmt(Math.abs(sobra))}
            </h1>
            <div className="mt-6 flex flex-wrap gap-6 text-sm font-semibold">
              <span className="bg-[#2b1d14]/10 px-3 py-1.5 rounded-lg">
                Entrou: <b className="text-emerald-950 font-bold">{fmt(totalIn)}</b>
              </span>
              <span className="bg-[#2b1d14]/10 px-3 py-1.5 rounded-lg">
                Saiu: <b className="text-red-950 font-bold">{fmt(totalOut)}</b>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-[-24px]">
        {/* Envelopes */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
  {CATEGORIAS_PADRAO.map(c => {
    const spent = spentByCat[c.id] || 0;

    return (
      <div
        key={c.id}
        onClick={() => setFilterCat(filterCat === c.id ? null : c.id)}
        className={`bg-[#ebe7e0] rounded-xl p-3.5 h-24 flex flex-col justify-between cursor-pointer border transition hover:-translate-y-0.5 shadow-sm ${
          filterCat === c.id ? 'ring-2 ring-[#2b1d14] bg-[#e2ddd4]' : 'border-[#2b1d14]/10'
        }`}
      >
        <span className="text-xs font-bold text-[#5e4d41] uppercase tracking-wider block truncate">
          {c.nome}
        </span>
        <div>
          <span className="text-[11px] text-[#7d6b5e] block uppercase">Gasto</span>
          <span className="text-lg font-serif font-bold text-[#2b1d14] tabular-nums block">
            {fmt(spent)}
          </span>
        </div>
      </div>
    );
  })}
</section>

        {/* Form and Transactions Grid */}
        <div className="grid lg:grid-cols-[340px_1fr] gap-8 mt-10">
          {/* Form */}
          <div className="bg-[#f1ede7] p-6 rounded-2xl border border-[#2b1d14]/10 self-start">
            <h2 className="text-xl font-serif font-bold mb-4">Novo Lançamento</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 bg-[#ebe7e0] p-1 rounded-lg text-sm font-bold">
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCat('mercado'); }}
                  className={`py-2 rounded-md transition ${type === 'expense' ? 'bg-[#2b1d14] text-white' : 'text-[#5e4d41]'}`}
                >
                  Saída
                </button>
                <button
                  type="button"
                  onClick={() => { setType('income'); setCat('salario'); }}
                  className={`py-2 rounded-md transition ${type === 'income' ? 'bg-[#648c16] text-white' : 'text-[#5e4d41]'}`}
                >
                  Entrada
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5e4d41] uppercase mb-1">Valor (R$)</label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  className="w-full text-2xl font-serif font-bold p-3 bg-white rounded-lg border border-[#2b1d14]/20 outline-none focus:border-[#ff7200]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5e4d41] uppercase mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Supermercado..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full p-2.5 bg-white rounded-lg border border-[#2b1d14]/20 text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5e4d41] uppercase mb-1">Categoria</label>
                  <select
                    value={cat}
                    onChange={e => setCat(e.target.value)}
                    className="w-full p-2.5 bg-white rounded-lg border border-[#2b1d14]/20 text-sm outline-none"
                  >
                    {(type === 'expense' ? CATEGORIAS_PADRAO : ENTRADAS_CAT).map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5e4d41] uppercase mb-1">Dia</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={day}
                    onChange={e => setDay(e.target.value)}
                    className="w-full p-2.5 bg-white rounded-lg border border-[#2b1d14]/20 text-sm outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#ff7200] hover:bg-[#ff8522] text-[#2b1d14] font-bold py-3 rounded-lg transition"
              >
                Lançar na Caderneta
              </button>
            </form>
          </div>

          {/* Table / Extrato */}
          <div className="bg-white p-6 rounded-2xl border border-[#2b1d14]/10 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2b1d14]/10">
              <h2 className="text-xl font-serif font-bold">
                Extrato {filterCat && <span className="text-xs bg-[#ff7200]/20 text-[#2b1d14] px-2 py-0.5 rounded ml-2">Filtro ativo</span>}
              </h2>
              {filterCat && (
                <button onClick={() => setFilterCat(null)} className="text-xs font-bold text-[#ff7200] hover:underline">
                  Limpar filtro
                </button>
              )}
            </div>

            {monthTx.length === 0 ? (
              <div className="py-12 text-center text-[#7d6b5e] text-sm">
                Nenhum lançamento registrado neste mês.
              </div>
            ) : (
              <div className="divide-y divide-[#2b1d14]/10">
                {monthTx
                  .filter(t => !filterCat || t.category === filterCat)
                  .map(t => (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="font-serif font-bold text-xs bg-[#f1ede7] px-2 py-1 rounded text-[#7d6b5e]">
                          {t.date.split('-')[2]}
                        </span>
                        <div>
                          <p className="font-medium text-sm text-[#2b1d14]">{t.description}</p>
                          <p className="text-xs text-[#7d6b5e] capitalize">{t.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-serif font-bold text-sm ${t.type === 'income' ? 'text-emerald-700' : 'text-[#2b1d14]'}`}>
                          {t.type === 'income' ? '+' : '-'} {fmt(t.amount)}
                        </span>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-[#7d6b5e] hover:text-red-600 transition"
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
