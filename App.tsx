
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, where, getDoc } from 'firebase/firestore';
import { Transaction, Balance, UserProfile, Feedback } from './types';
import TransactionForm from './components/TransactionForm';
import AuthScreen from './components/AuthScreen';
import ProfileSetup from './components/ProfileSetup';
import { 
  Plus, LayoutDashboard, Search, 
  User, Zap, Moon, Sun, BarChart3, 
  Info, Camera, Loader2, X, Trash2, Edit3, 
  CheckCircle2, Clock, MessageSquare, Send, Heart, ListFilter, PieChart as PieIcon,
  Download, FileSpreadsheet, AlertTriangle, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown,
  Type as TypeIcon, Filter, ShieldAlert, ShieldCheck, Calendar, RotateCcw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

type ActiveTab = 'home' | 'analytics' | 'profile';
type HistoryFilter = 'todos' | 'entrada' | 'saida';
type FontSize = 'sm' | 'md' | 'lg';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente'>('todos');
  
  // Filtros de Período
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem('econo_font_size') as FontSize) || 'md';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [loading, setLoading] = useState(false);
  
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editGender, setEditGender] = useState<string>('');
  const [editPhoto, setEditPhoto] = useState('');
  const [editBio, setEditBio] = useState('');
  
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const [feedbackType, setFeedbackType] = useState<Feedback['type']>('sugestao');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const changeFontSize = (size: FontSize) => {
    document.documentElement.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
    document.documentElement.classList.add(`font-size-${size}`);
    setFontSize(size);
    localStorage.setItem('econo_font_size', size);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setStatusFilter('todos');
    setHistoryFilter('todos');
  };

  const handleSendFeedback = async () => {
    if (!user || !feedbackMsg.trim()) return;
    setSendingFeedback(true);
    try {
      await addDoc(collection(db, "feedback"), {
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || 'Usuário',
        type: feedbackType,
        message: feedbackMsg,
        createdAt: new Date().toISOString(),
        status: 'pendente'
      });
      setFeedbackMsg('');
      showToast("Feedback enviado com sucesso!", "success");
    } catch (err) {
      showToast("Erro ao enviar feedback.", "error");
    } finally {
      setSendingFeedback(false);
    }
  };

  const exportDetailedCSV = (type: 'entrada' | 'saida') => {
    const filtered = transactions.filter(t => t.type === type);
    if (filtered.length === 0) {
      showToast("Nenhum dado encontrado para exportar.", "info");
      return;
    }

    const headers = ["Data", "Transacao_Descricao", "Categoria", "Metodo", "Item_Nome", "Item_Qtd", "Item_Preco_Unit", "Item_Total", "Status", "Obs"];
    const rows: string[][] = [];

    filtered.forEach(t => {
      if (t.items && t.items.length > 0) {
        t.items.forEach(item => {
          rows.push([
            t.date,
            `"${t.description.replace(/"/g, '""')}"`,
            t.category,
            t.paymentType,
            `"${item.name.replace(/"/g, '""')}"`,
            item.quantity.toString(),
            item.price.toFixed(2).replace('.', ','),
            item.total.toFixed(2).replace('.', ','),
            t.isPaid ? 'Liquidado' : 'Pendente',
            `"${(t.observations || '').replace(/"/g, '""')}"`
          ]);
        });
      } else {
        rows.push([
          t.date,
          `"${t.description.replace(/"/g, '""')}"`,
          t.category,
          t.paymentType,
          "N/A",
          "1",
          t.amount.toFixed(2).replace('.', ','),
          t.amount.toFixed(2).replace('.', ','),
          t.isPaid ? 'Liquidado' : 'Pendente',
          `"${(t.observations || '').replace(/"/g, '""')}"`
        ]);
      }
    });

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Econo_Detalhado_${type === 'entrada' ? 'Receitas' : 'Saidas'}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Relatório detalhado de ${type}s exportado!`, "success");
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteDoc(doc(db, "transactions", transactionToDelete));
      showToast("Transação excluída com sucesso.", "success");
    } catch (err) {
      showToast("Erro ao excluir transação.", "error");
    } finally {
      setTransactionToDelete(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data() as UserProfile;
          setUserProfile(profileData);
          setEditName(profileData.displayName || u.displayName || '');
          setEditBirthDate(profileData.birthDate || '');
          setEditGender(profileData.gender || 'Prefiro não dizer');
          setEditPhoto(profileData.photoURL || u.photoURL || '');
          setEditBio(profileData.bio || '');
          setNeedsProfileSetup(!profileData.profileCompleted);
        } else {
          setNeedsProfileSetup(true);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setProfileLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setTransactions(data.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)));
    });
    return () => unsubscribe();
  }, [user]);

  const balance = useMemo<Balance>(() => {
    return transactions.reduce((acc, curr) => {
      if (curr.isPaid) {
        if (curr.type === 'entrada') {
          acc.totalIn += curr.amount;
          acc.net += curr.amount;
        } else {
          acc.totalOut += curr.amount;
          acc.net -= curr.amount;
        }
      }
      return acc;
    }, { totalIn: 0, totalOut: 0, net: 0 });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesHistory = historyFilter === 'todos' || t.type === historyFilter;
      const matchesStatus = statusFilter === 'todos' || 
                           (statusFilter === 'pago' ? t.isPaid : !t.isPaid);
      
      // Lógica de período
      const transactionDate = t.date; // YYYY-MM-DD
      const matchesStart = startDate === '' || transactionDate >= startDate;
      const matchesEnd = endDate === '' || transactionDate <= endDate;

      return matchesSearch && matchesHistory && matchesStatus && matchesStart && matchesEnd;
    });
  }, [transactions, searchTerm, historyFilter, statusFilter, startDate, endDate]);

  const chartData = useMemo(() => {
    const summary = [
      { name: 'Entradas', valor: balance.totalIn, fill: '#10b981' },
      { name: 'Saídas', valor: balance.totalOut, fill: '#f43f5e' }
    ];
    const categoryMap: Record<string, number> = {};
    transactions.filter(t => t.type === 'saida' && t.isPaid).forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
      name: name.toUpperCase(),
      value
    })).sort((a, b) => b.value - a.value);
    return { summary, categoryData };
  }, [balance, transactions]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('econo_theme', newTheme);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const updateData = { displayName: editName, birthDate: editBirthDate, gender: editGender as UserProfile['gender'], photoURL: editPhoto, bio: editBio };
      await updateDoc(doc(db, "users", user.uid), updateData);
      setUserProfile(prev => prev ? { ...prev, ...updateData } : null);
      showToast("Perfil atualizado!", "success");
    } catch (err) { showToast("Erro ao atualizar perfil.", "error"); } finally { setLoading(false); }
  };

  if (profileLoading) return <div className="min-h-screen bg-white dark:bg-darkBg flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;
  if (!user) return <AuthScreen onAuthComplete={() => {}} />;
  if (needsProfileSetup) return <ProfileSetup uid={user.uid} onComplete={() => setNeedsProfileSetup(false)} />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkBg transition-all pb-32">
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-right-full duration-300 ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : toast.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : 'bg-indigo-600/90 border-indigo-50 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : toast.type === 'error' ? <ShieldAlert size={20} /> : <div className="bg-indigo-400 rounded-full p-0.5"><Info size={16} /></div>}
            <span className="text-[0.7rem] font-black uppercase tracking-wider">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={14} /></button>
          </div>
        ))}
      </div>

      <header className="bg-white dark:bg-darkSurface border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-4 md:px-12 py-5 shadow-sm transition-colors">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><Zap size={24} className="fill-current" /></div>
            <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter hidden md:block">Econo</h1>
          </div>

          <div className="flex-1 max-w-2xl flex items-center gap-4 hidden sm:flex">
            {/* Barra de Busca */}
            <div className="flex-1 relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="PROCURAR..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 py-3 pl-12 pr-6 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-black text-[10px] uppercase dark:text-white tracking-widest placeholder:text-slate-300" 
              />
            </div>

            {/* Filtro de Período */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-2xl">
              <Calendar className="text-slate-400" size={16} />
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 outline-none"
                />
                <span className="text-slate-300 font-bold">/</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 outline-none"
                />
              </div>
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-2 text-rose-500 hover:scale-110 transition-transform">
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
               {(['sm', 'md', 'lg'] as FontSize[]).map(s => (
                 <button 
                  key={s} 
                  onClick={() => changeFontSize(s)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-[10px] font-black uppercase transition-all ${fontSize === s ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   {s === 'sm' ? 'A-' : s === 'md' ? 'A' : 'A+'}
                 </button>
               ))}
            </div>

            <button onClick={toggleTheme} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all active:scale-90 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <img src={userProfile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} className="w-11 h-11 rounded-full border-2 border-indigo-100 dark:border-indigo-900 shadow-md flex-shrink-0" />
          </div>
        </div>
        
        {/* Mobile Filter Area */}
        <div className="mt-4 sm:hidden space-y-3 animate-in slide-in-from-top-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="PESQUISAR..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 pl-12 pr-4 rounded-xl outline-none font-bold text-[10px] uppercase tracking-widest dark:text-white" 
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl">
            <Calendar size={14} className="text-slate-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[9px] font-black uppercase w-full dark:text-white" />
            <span className="text-slate-300">/</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[9px] font-black uppercase w-full dark:text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white dark:bg-darkSurface p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group">
            <p className="text-[0.75rem] font-black text-slate-400 uppercase mb-2 tracking-widest group-hover:text-indigo-500 transition-colors">Saldo Líquido</p>
            <h2 className={`text-4xl font-black transition-all ${balance.net >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`}>
              R$ {balance.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 transition-all hover:shadow-md group">
            <TrendingUp className="text-emerald-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
            <p className="text-[0.75rem] font-black text-emerald-600/60 uppercase mb-2 tracking-widest">Entradas</p>
            <h2 className="text-3xl font-black text-emerald-600">R$ {balance.totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/20 p-8 rounded-3xl border border-rose-100 dark:border-rose-900/30 transition-all hover:shadow-md group">
            <TrendingDown className="text-rose-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
            <p className="text-[0.75rem] font-black text-rose-600/60 uppercase mb-2 tracking-widest">Saídas</p>
            <h2 className="text-3xl font-black text-rose-600">R$ {balance.totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
          <div className="flex bg-white dark:bg-darkSurface p-2 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit shadow-sm">
            <button onClick={() => setActiveTab('home')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[0.75rem] font-black uppercase transition-all ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutDashboard size={18} /> Histórico
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[0.75rem] font-black uppercase transition-all ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
              <BarChart3 size={18} /> Dashboard
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[0.75rem] font-black uppercase transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
              <User size={18} /> Perfil & Feedback
            </button>
          </div>

          {activeTab === 'home' && (
            <div className="flex flex-wrap gap-4">
              <div className="flex bg-white dark:bg-darkSurface p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <button onClick={() => setHistoryFilter('todos')} className={`px-5 py-2 rounded-xl text-[0.65rem] font-black uppercase transition-all ${historyFilter === 'todos' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Todos</button>
                <button onClick={() => setHistoryFilter('entrada')} className={`px-5 py-2 rounded-xl text-[0.65rem] font-black uppercase transition-all ${historyFilter === 'entrada' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Receitas</button>
                <button onClick={() => setHistoryFilter('saida')} className={`px-5 py-2 rounded-xl text-[0.65rem] font-black uppercase transition-all ${historyFilter === 'saida' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}>Saídas</button>
              </div>

              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-white dark:bg-darkSurface px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-[0.65rem] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-slate-500 dark:text-slate-400"
              >
                <option value="todos">Status: Todos</option>
                <option value="pago">Liquidado</option>
                <option value="pendente">Pendente</option>
              </select>

              <button 
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white rounded-2xl text-[0.65rem] font-black uppercase transition-all text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <RotateCcw size={14} /> Resetar
              </button>
            </div>
          )}
        </div>

        {activeTab === 'analytics' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-wrap gap-6 items-center justify-between bg-white dark:bg-darkSurface p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
                   <FileSpreadsheet size={32} />
                </div>
                <div>
                  <h3 className="text-[0.85rem] font-black uppercase dark:text-white tracking-[0.2em]">Relatórios Detalhados</h3>
                  <p className="text-[0.7rem] text-slate-400 font-bold uppercase tracking-tight">Exportação por itens individuais (CSV)</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => exportDetailedCSV('entrada')}
                  className="px-8 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-[0.7rem] font-black uppercase flex items-center gap-3 transition-all active:scale-95 shadow-sm"
                >
                  <Download size={18} /> Exportar Entradas
                </button>
                <button 
                  onClick={() => exportDetailedCSV('saida')}
                  className="px-8 py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-full text-[0.7rem] font-black uppercase flex items-center gap-3 transition-all active:scale-95 shadow-sm"
                >
                  <Download size={18} /> Exportar Saídas
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white dark:bg-darkSurface p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl"><BarChart3 size={20} /></div>
                  <h3 className="text-sm font-black uppercase dark:text-white tracking-[0.2em]">Fluxo de Caixa</h3>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.summary}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }} 
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '13px' }} 
                        itemStyle={{ fontWeight: 'black' }}
                      />
                      <Bar dataKey="valor" radius={[12, 12, 0, 0]} barSize={80}>
                        {chartData.summary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-darkSurface p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl"><PieIcon size={20} /></div>
                  <h3 className="text-sm font-black uppercase dark:text-white tracking-[0.2em]">Gastos por Categoria</h3>
                </div>
                <div className="h-80 w-full">
                  {chartData.categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.categoryData}
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {chartData.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#8b5cf6'][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '13px' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <ShieldAlert size={50} className="mb-4 opacity-20" />
                      <p className="text-[0.75rem] font-black uppercase tracking-widest">Sem dados de gastos</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="flex items-center gap-3">
               <ListFilter size={20} className="text-indigo-500" />
               <h3 className="text-sm font-black uppercase dark:text-white tracking-[0.2em]">
                 {startDate || endDate ? 'Movimentações no Período' : 'Movimentações Recentes'}
               </h3>
               {(searchTerm || startDate || endDate || statusFilter !== 'todos') && (
                 <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-in zoom-in-90">
                   Filtros Ativos ({filteredTransactions.length} encontrados)
                 </span>
               )}
             </div>
             
             <div className="overflow-x-auto bg-white dark:bg-darkSurface rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
                <table className="w-full text-left text-[0.8rem] border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    <tr className="text-slate-400 uppercase font-black tracking-[0.15em]">
                      <th className="px-10 py-6">Data</th>
                      <th className="px-10 py-6">Descrição</th>
                      <th className="px-10 py-6">Categoria</th>
                      <th className="px-10 py-6">Status</th>
                      <th className="px-10 py-6 text-right min-w-[160px]">Valor</th>
                      <th className="px-10 py-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="px-10 py-6 font-bold text-slate-500">{t.date.split('-').reverse().join('/')}</td>
                          <td className="px-10 py-6 font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight text-[0.9rem]">{t.description}</td>
                          <td className="px-10 py-6"><span className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-lg text-[0.65rem] font-black uppercase text-slate-500 tracking-wider border border-slate-200 dark:border-slate-700">{t.category}</span></td>
                          <td className="px-10 py-6">
                            {t.isPaid ? (
                              <span className="flex items-center gap-1.5 text-[0.7rem] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider"><CheckCircle2 size={16} /> Liquidado</span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-[0.7rem] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider"><Clock size={16} /> Em Aberto</span>
                            )}
                          </td>
                          <td className={`px-10 py-6 text-right font-black whitespace-nowrap text-[1rem] ${t.type === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center justify-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingTransaction(t); setIsFormOpen(true); }} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-indigo-500 dark:hover:text-indigo-400 transition-all active:scale-90"><Edit3 size={18} /></button>
                              <button onClick={() => setTransactionToDelete(t.id!)} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-rose-500 dark:hover:text-rose-400 transition-all active:scale-90"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-10 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-20">
                            <Search size={48} className="text-slate-400" />
                            <p className="text-[0.7rem] font-black uppercase tracking-[0.3em]">Nenhum registro encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-500">
            <div className="lg:col-span-2 bg-white dark:bg-darkSurface p-10 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter mb-8">Configurações de Perfil</h3>
                <div className="space-y-8">
                  <div className="flex items-center gap-8 mb-10">
                    <img src={editPhoto || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} className="w-28 h-28 rounded-3xl border-4 border-slate-50 dark:border-slate-800 shadow-xl" />
                    <button onClick={() => profilePhotoInputRef.current?.click()} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[0.75rem] font-black uppercase flex items-center gap-3 shadow-lg active:scale-95 transition-all"><Camera size={20} /> Trocar Foto</button>
                    <input type="file" ref={profilePhotoInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if(file) {
                        const r = new FileReader();
                        r.onload = () => setEditPhoto(r.result as string);
                        r.readAsDataURL(file);
                      }
                    }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest px-1">Seu Nome</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="NOME" className="w-full bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl text-sm font-bold border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest px-1">Data de Nascimento</label>
                      <input type="date" value={editBirthDate} onChange={e => setEditBirthDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl text-sm font-bold border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                  </div>
                  <button onClick={handleUpdateProfile} disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[0.8rem] uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">{loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={22} /> Salvar Alterações</>}</button>
                </div>
            </div>
            <div className="space-y-10">
               <div className="bg-indigo-50 dark:bg-indigo-950/20 p-10 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl"><MessageSquare size={20} /></div>
                    <h3 className="text-xs font-black uppercase dark:text-white tracking-[0.2em]">Feedback</h3>
                  </div>
                  <textarea value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)} placeholder="Sua sugestão..." className="w-full h-40 bg-white dark:bg-slate-800 p-5 rounded-2xl text-sm font-medium border border-slate-100 dark:border-slate-700 outline-none resize-none mb-6 focus:ring-2 focus:ring-indigo-500 transition-all"></textarea>
                  <button onClick={handleSendFeedback} disabled={sendingFeedback || !feedbackMsg.trim()} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[0.7rem] uppercase tracking-[0.15em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg">
                    {sendingFeedback ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Enviar Sugestão</>}
                  </button>
               </div>
               <div className="p-10 border border-slate-200 dark:border-slate-800 rounded-[2rem] text-center bg-white dark:bg-darkSurface/50">
                  <Heart className="text-rose-500 mx-auto animate-bounce mb-3" size={32} />
                  <p className="text-[0.75rem] font-black text-slate-400 uppercase tracking-[0.2em]">Econo v2.8.0</p>
                  <p className="text-[0.65rem] font-bold text-slate-300 dark:text-slate-600 mt-2 uppercase">Made for Smart Savers</p>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* FAB Botão Adicionar */}
      <div className="fixed bottom-10 right-10 z-40 group">
        <button 
          onClick={() => {
            setEditingTransaction({
              userId: user.uid, account: 'Principal', amount: 0, category: 'Outros', date: new Date().toISOString().split('T')[0],
              description: '', isPaid: true, isRecurring: false, items: [], observations: '', paymentType: 'pix',
              time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), type: 'saida'
            });
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center h-20 w-20 bg-indigo-600 text-white rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all ring-4 ring-indigo-500/10 group-hover:rotate-12"
        >
          <Plus size={40} />
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-6">
          <TransactionForm initialData={editingTransaction} allTransactions={transactions} onSave={async (d) => {
            try {
              if (d.id) await updateDoc(doc(db, "transactions", d.id), { ...d });
              else await addDoc(collection(db, "transactions"), { ...d, userId: user.uid });
              showToast("Transação salva com sucesso!", "success");
              setIsFormOpen(false);
            } catch (err) { showToast("Erro ao processar.", "error"); }
          }} onCancel={() => setIsFormOpen(false)} />
        </div>
      )}

      {transactionToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkSurface rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
               <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center mb-8">
                 <AlertTriangle size={40} />
               </div>
               <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter mb-3">Excluir Registro?</h3>
               <p className="text-slate-400 dark:text-slate-500 text-[0.8rem] font-bold uppercase leading-relaxed mb-10 tracking-tight">
                 Tem certeza que deseja apagar permanentemente este dado? Esta ação não pode ser desfeita.
               </p>
               <div className="grid grid-cols-2 gap-5 w-full">
                 <button 
                  onClick={() => setTransactionToDelete(null)}
                  className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                 >
                   Cancelar
                 </button>
                 <button 
                  onClick={confirmDelete}
                  className="py-4 bg-rose-600 text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest shadow-xl shadow-rose-100 dark:shadow-none hover:bg-rose-700 transition-all active:scale-95"
                 >
                   Confirmar
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
