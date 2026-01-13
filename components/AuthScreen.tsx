
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Mail, Lock, User, Loader2, ArrowRight, Zap, ShieldAlert, Sun, Moon } from 'lucide-react';

interface Props {
  onAuthComplete: () => void;
}

const AuthScreen: React.FC<Props> = ({ onAuthComplete }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('econo_theme', newTheme);
  };

  const formatErrorMessage = (err: string) => {
    if (err.includes('auth/unauthorized-domain')) return "Domínio não autorizado. Verifique as configurações do Firebase.";
    if (err.includes('auth/user-not-found') || err.includes('auth/wrong-password') || err.includes('auth/invalid-credential')) return "E-mail ou senha incorretos.";
    if (err.includes('auth/email-already-in-use')) return "Este e-mail já está em uso.";
    return "Ocorreu um erro ao processar sua solicitação.";
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isForgotPassword) {
        await sendPasswordResetEmail(auth, email);
        alert('E-mail de recuperação enviado!');
        setIsForgotPassword(false);
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          displayName: name,
          email: email,
          createdAt: new Date().toISOString(),
          profileCompleted: false
        });
      }
      localStorage.setItem('econo_last_activity', Date.now().toString());
      if (!isForgotPassword) onAuthComplete();
    } catch (err: any) {
      setError(formatErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  // Classes atualizadas para inputs maiores e mais visíveis
  const inputClasses = "w-full pl-16 pr-6 py-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xl font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkBg flex items-center justify-center p-4 transition-colors duration-300 relative">
      <button 
        onClick={toggleTheme} 
        className="absolute top-6 right-6 p-3 rounded-xl bg-white dark:bg-darkSurface text-slate-500 dark:text-slate-400 shadow-lg border border-slate-100 dark:border-slate-800 transition-all hover:scale-110 active:scale-95"
      >
        {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
      </button>

      <div className="w-full max-w-lg bg-white dark:bg-darkSurface rounded-[3rem] shadow-2xl dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
        <div className="p-8 md:p-14">
          <div className="flex justify-center mb-12">
            <div className="bg-[#4f46e5] p-6 rounded-3xl shadow-2xl shadow-indigo-100 dark:shadow-none flex items-center gap-4 rotate-3 hover:rotate-0 transition-transform cursor-default">
              <Zap className="text-white fill-current" size={40} />
              <span className="text-white font-black text-4xl tracking-tighter">Econo</span>
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-900 dark:text-white text-center mb-2 uppercase tracking-tight">
            {isForgotPassword ? 'Resgate' : isLogin ? 'Bem-vindo' : 'Criar Conta'}
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-center text-[12px] font-black uppercase tracking-[0.3em] mb-12">
            {isForgotPassword ? 'Informe seu e-mail' : 'Gestão inteligente e segura'}
          </p>

          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && !isForgotPassword && (
              <div className="relative group">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={28} />
                <input type="text" required placeholder="NOME COMPLETO" className={inputClasses} value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className="relative group">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={28} />
              <input type="email" required placeholder="E-MAIL" className={inputClasses} value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {!isForgotPassword && (
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={28} />
                <input type="password" required placeholder="SENHA" className={inputClasses} value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            )}

            {error && (
              <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-start gap-4 text-[13px] text-rose-600 dark:text-rose-400 font-bold leading-relaxed">
                <ShieldAlert size={24} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full py-6 bg-[#4f46e5] text-white rounded-[1.5rem] font-black text-[15px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 hover:translate-y-[-2px] transition-all flex items-center justify-center gap-4 active:translate-y-[2px] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={28} /> : (
                <>{isForgotPassword ? 'Enviar Link' : isLogin ? 'Acessar Conta' : 'Cadastrar agora'}<ArrowRight size={24} /></>
              )}
            </button>
          </form>

          {isLogin && !isForgotPassword && (
            <button onClick={() => setIsForgotPassword(true)} className="w-full mt-8 text-[12px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors">Esqueceu sua senha?</button>
          )}

          <div className="mt-12 text-center border-t border-slate-50 dark:border-slate-800 pt-10">
            <button 
              onClick={() => { setIsLogin(!isLogin); setIsForgotPassword(false); setError(''); }} 
              className="text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors"
            >
              {isForgotPassword ? 'Voltar para login' : isLogin ? 'Novo por aqui? Crie sua conta' : 'Já é cadastrado? Faça Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
