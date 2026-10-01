import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState(1); // 1 = dados, 2 = código do e-mail
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar código');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterWithCode = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta');
      localStorage.setItem('caderneta_token', data.token);
      localStorage.setItem('caderneta_user', JSON.stringify(data.user));
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
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
            {!isRegister ? 'Entrar na sua conta' : step === 1 ? 'Criar sua conta' : 'Confirmar E-mail'}
          </h1>
          <p className="mt-2 text-sm text-[#7d6b5e]">
            {!isRegister
              ? 'Acesse seu extrato e seus envelopes de gastos'
              : step === 1
              ? 'Organize seu dinheiro de forma visual e intuitiva'
              : `Digite o código enviado para ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-100 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Formulário de Login */}
        {!isRegister && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#5e4d41] uppercase tracking-wider mb-1.5">E-mail</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 text-[#7d6b5e]" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-[#f1ede7] text-base text-[#2b1d14] outline-none focus:bg-white focus:ring-2 focus:ring-[#ff7200] transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5e4d41] uppercase tracking-wider mb-1.5">Senha</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-[#7d6b5e]" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
              {submitting ? 'Acessando...' : 'Acessar Caderneta'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* Cadastro - Passo 1: Dados */}
        {isRegister && step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#5e4d41] uppercase tracking-wider mb-1.5">Nome completo</label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 text-[#7d6b5e]" size={18} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-[#f1ede7] text-base text-[#2b1d14] outline-none focus:bg-white focus:ring-2 focus:ring-[#ff7200] transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5e4d41] uppercase tracking-wider mb-1.5">E-mail</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 text-[#7d6b5e]" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-[#f1ede7] text-base text-[#2b1d14] outline-none focus:bg-white focus:ring-2 focus:ring-[#ff7200] transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5e4d41] uppercase tracking-wider mb-1.5">Senha</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-[#7d6b5e]" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
              {submitting ? 'Enviando código...' : 'Continuar e verificar e-mail'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* Cadastro - Passo 2: Código */}
        {isRegister && step === 2 && (
          <form onSubmit={handleRegisterWithCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#5e4d41] uppercase tracking-wider mb-1.5">Código de 6 dígitos</label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 text-[#7d6b5e]" size={18} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-[#f1ede7] text-2xl font-serif font-bold tracking-widest text-center text-[#2b1d14] outline-none focus:bg-white focus:ring-2 focus:ring-[#ff7200] transition"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || code.length < 6}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#ff7200] hover:bg-[#ff8522] text-[#2b1d14] py-3.5 font-bold transition active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? 'Validando...' : 'Confirmar e Criar Conta'}
              <CheckCircle2 size={18} />
            </button>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-[#7d6b5e] hover:underline"
              >
                Voltar e alterar e-mail
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-[#7d6b5e]">
          {isRegister ? (
            <p>
              Já possui conta?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setStep(1); setError(''); }}
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
                onClick={() => { setIsRegister(true); setStep(1); setError(''); }}
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
