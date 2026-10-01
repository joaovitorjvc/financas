import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ff7200] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-[#fbf9f6] rounded-2xl shadow-2xl p-8 sm:p-10 border border-[#2b1d14]/10">
        <div className="text-center mb-8">
          <span className="font-serif text-sm font-bold tracking-[0.25em] text-[#ff7200] uppercase">
            Caderneta
          </span>
          <h1 className="mt-2 text-3xl font-serif font-extrabold text-[#2b1d14]">
            {isRegister ? 'Criar sua conta' : 'Entrar na sua conta'}
          </h1>
          <p className="mt-2 text-sm text-[#7d6b5e]">
            {isRegister
              ? 'Organize seu dinheiro de forma visual e intuitiva'
              : 'Acesse seu extrato e seus envelopes de gastos'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-100 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-[#5e4d41] uppercase tracking-wider mb-1.5">
                Nome completo
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 text-[#7d6b5e]" size={18} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-[#f1ede7] text-base text-[#2b1d14] outline-none focus:bg-white focus:ring-2 focus:ring-[#ff7200] transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#5e4d41] uppercase tracking-wider mb-1.5">
              E-mail
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 text-[#7d6b5e]" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-[#f1ede7] text-base text-[#2b1d14] outline-none focus:bg-white focus:ring-2 focus:ring-[#ff7200] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5e4d41] uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 text-[#7d6b5e]" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-[#f1ede7] text-base text-[#2b1d14] outline-none focus:bg-white focus:ring-2 focus:ring-[#ff7200] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#2b1d14] text-[#fbf9f6] py-3.5 font-bold hover:bg-[#453023] transition active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? 'Carregando...' : isRegister ? 'Criar Caderneta' : 'Acessar Caderneta'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-[#7d6b5e]">
          {isRegister ? (
            <p>
              Já possui conta?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className="font-bold text-[#2b1d14] underline decoration-[#ff7200] decoration-2 underline-offset-4"
              >
                Fazer login
              </button>
            </p>
          ) : (
            <p>
              Ainda não tem conta?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className="font-bold text-[#2b1d14] underline decoration-[#ff7200] decoration-2 underline-offset-4"
              >
                Cadastre-se gratuitamente
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
