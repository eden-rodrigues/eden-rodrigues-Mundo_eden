
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Transaction, TransactionItem } from '../types';
import { Plus, X, Save, Camera, Loader2, Sparkles, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, RefreshCw, CheckCircle2, CircleDot, FileText, Upload, Check, Clock, Tag, ShieldCheck, Edit3, FileStack, CalendarDays, MessageSquare, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  initialData?: Transaction;
  allTransactions?: Transaction[];
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
}

const TransactionForm: React.FC<Props> = ({ initialData, allTransactions = [], onSave, onCancel }) => {
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boletoFileRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Transaction>(initialData || {
    userId: '', 
    account: 'PicPay',
    amount: 0,
    category: 'Outros',
    date: new Date().toISOString().split('T')[0],
    description: '',
    isPaid: true,
    isRecurring: true,
    items: [],
    observations: '',
    paymentType: 'pix',
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    type: 'saida',
    receiptUrl: ''
  });

  const [isBoleto, setIsBoleto] = useState(false);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newItem, setNewItem] = useState<Partial<TransactionItem>>({
    name: '', price: 0, quantity: 1, isNecessary: true
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(initialData?.receiptUrl || null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        items: initialData.items || []
      });
      setIsBoleto(initialData.category === 'Boleto');
      if (initialData.receiptUrl) setReceiptPreview(initialData.receiptUrl);
    }
  }, [initialData]);

  const suggestions = useMemo(() => {
    return Array.from(
      new Set(
        allTransactions
          .filter(t => t.type === formData.type)
          .map(t => t.description)
          .filter(d => d && d.trim().length > 0)
      )
    );
  }, [allTransactions, formData.type]);

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ 
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } }, 
              { text: "Extraia os dados em JSON: date(YYYY-MM-DD), time(HH:mm), description, totalAmount, items(name, price, quantity, total)." }
            ] 
          }],
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                time: { type: Type.STRING },
                description: { type: Type.STRING },
                totalAmount: { type: Type.NUMBER },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                      quantity: { type: Type.NUMBER },
                      total: { type: Type.NUMBER }
                    }
                  }
                }
              }
            }
          }
        });
        
        const resultText = response.text?.trim() || '{}';
        const result = JSON.parse(resultText);

        setFormData(prev => ({ 
          ...prev, 
          date: result.date || prev.date, 
          time: result.time || prev.time, 
          description: result.description || prev.description, 
          amount: result.totalAmount || prev.amount, 
          items: (result.items || []).map((it: any) => ({ 
            ...it, 
            id: Math.random().toString(36).substr(2, 9), 
            isNecessary: true 
          })) 
        }));
      } catch (err) { alert("Erro na IA."); } finally { setIsScanning(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) return;
    
    const item: TransactionItem = { 
      id: editingItemId || Math.random().toString(36).substr(2, 9), 
      name: newItem.name.toUpperCase(), 
      price: Number(newItem.price), 
      quantity: Number(newItem.quantity || 1), 
      total: Number(newItem.price) * Number(newItem.quantity || 1), 
      isNecessary: newItem.isNecessary ?? true 
    };

    setFormData(prev => {
      const currentItems = prev.items || [];
      const updatedItems = editingItemId 
        ? currentItems.map(i => i.id === editingItemId ? item : i) 
        : [...currentItems, item];
        
      return { 
        ...prev, 
        items: updatedItems, 
        amount: updatedItems.reduce((acc, i) => acc + i.total, 0) 
      };
    });

    setNewItem({ name: '', price: 0, quantity: 1, isNecessary: true });
    setEditingItemId(null);
  };

  const confirmRemoveItem = () => {
    if (!itemToDelete) return;
    setFormData(prev => {
      const filtered = prev.items?.filter(i => i.id !== itemToDelete) || [];
      return { ...prev, items: filtered, amount: filtered.reduce((acc, curr) => acc + curr.total, 0) };
    });
    setItemToDelete(null);
  };

  const toggleItemNecessity = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.map(i => i.id === itemId ? { ...i, isNecessary: !i.isNecessary } : i) || []
    }));
  };

  const toggleBoletoMode = () => {
    const nextValue = !isBoleto;
    setIsBoleto(nextValue);
    setFormData(prev => ({
      ...prev,
      category: nextValue ? 'Boleto' : 'Outros',
      items: nextValue ? [] : prev.items,
      amount: nextValue ? 0 : prev.items?.reduce((acc, i) => acc + i.total, 0) || 0
    }));
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setReceiptPreview(base64);
        setFormData(prev => ({ ...prev, receiptUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClasses = "w-full px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-[15px] text-slate-800 dark:text-white transition-all font-bold appearance-none shadow-sm disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:text-slate-400";
  const labelClasses = "block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-[0.15em] px-1";
  const isEntry = formData.type === 'entrada';
  const showAccountField = ['pix', 'débito', 'crédito'].includes(formData.paymentType.toLowerCase());
  const isAmountReadOnly = !isEntry && !isBoleto && (formData.items && formData.items.length > 0);

  const handleFinalSave = () => {
    const finalData = { ...formData };
    if (isBoleto) {
      finalData.observations = `Vencimento: ${dueDate}. ${finalData.observations}`;
    }
    onSave(finalData);
  };

  return (
    <div className="bg-white dark:bg-darkSurface md:rounded-[2.5rem] shadow-2xl w-full max-w-[1000px] mx-auto overflow-hidden flex flex-col h-full md:max-h-[92vh] transition-all relative">
      <datalist id="description-list">
        {suggestions.map((s, i) => (<option key={i} value={s} />))}
      </datalist>

      {itemToDelete && (
        <div className="absolute inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-darkSurface p-10 rounded-[2rem] max-w-xs w-full text-center border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h4 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-3">Excluir Item?</h4>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-10 leading-relaxed">Deseja remover este item da lista? O valor total será recalculado.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setItemToDelete(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Cancelar</button>
              <button onClick={confirmRemoveItem} className="py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg">Excluir</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 md:px-12 py-8 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-darkSurface sticky top-0 z-10 transition-colors">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                {initialData?.id ? 'Editar Registro' : 'Novo Registro'}
              </h2>
              {isEntry ? (
                <ArrowUpCircle size={28} className="text-emerald-500" />
              ) : (
                <ArrowDownCircle size={28} className="text-rose-500" />
              )}
            </div>
            <button onClick={onCancel} className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-all p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800">
              <X size={32} />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setFormData({...formData, isPaid: !formData.isPaid})} 
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase border-2 transition-all ${formData.isPaid ? 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-sm' : 'bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-sm'}`}
              >
                {formData.isPaid ? <Check size={16} /> : <Clock size={16} />} 
                {formData.isPaid ? 'Liquidado' : 'Em Aberto'}
              </button>

              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-inner">
                <button 
                  type="button" 
                  onClick={() => { setFormData({ ...formData, type: 'entrada', category: 'Receita', items: [] }); setIsBoleto(false); }} 
                  className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all duration-300 ${isEntry ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xl' : 'text-slate-400 dark:text-slate-600'}`}
                >
                  Receita
                </button>
                <button 
                  type="button" 
                  onClick={() => setFormData({ ...formData, type: 'saida', category: 'Outros' })} 
                  className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all duration-300 ${!isEntry ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xl' : 'text-slate-400 dark:text-slate-600'}`}
                >
                  Despesa
                </button>
              </div>
            </div>

            {!isEntry && (
              <button 
                onClick={toggleBoletoMode}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${isBoleto ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl' : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800'}`}
              >
                <FileStack size={18} /> {isBoleto ? 'Modo Boleto Ativo' : 'Pagar como Boleto?'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-12 py-10 space-y-10 pb-32 md:pb-12">
        {!isEntry && !isBoleto && (
          <div className="p-6 bg-indigo-600 dark:bg-indigo-700 rounded-3xl flex items-center justify-between shadow-xl shadow-indigo-100 dark:shadow-none animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center space-x-5 text-white">
              <Sparkles size={32} className="animate-pulse" />
              <div>
                <p className="font-black text-sm uppercase tracking-tight">Scanner Inteligente</p>
                <p className="text-[11px] opacity-80 uppercase font-bold tracking-widest">Extrair dados do cupom fiscal</p>
              </div>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white text-indigo-600 px-7 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-md active:scale-95 transition-all">
              <Camera size={20} /> Abrir Câmera
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleScanReceipt} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          <div className="sm:col-span-2">
            <label className={labelClasses}>Identificação / Nome da Loja</label>
            <input list="description-list" className={inputClasses} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="EX: COMPRAS SUPERMERCADO" />
          </div>

          <div className="col-span-1">
            <label className={labelClasses}>Valor Total {isAmountReadOnly && '(AUTO)'}</label>
            <div className="relative">
              <span className={`absolute left-5 top-1/2 -translate-y-1/2 font-black text-[16px] ${isEntry ? 'text-emerald-600' : 'text-rose-600'} ${isAmountReadOnly ? 'opacity-50' : ''}`}>R$</span>
              <input 
                type="number" 
                step="0.01" 
                className={`${inputClasses} pl-12 font-black text-[18px]`} 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                disabled={isAmountReadOnly}
              />
            </div>
          </div>

          <div className="col-span-1">
            <label className={labelClasses}>Categoria</label>
            <input className={inputClasses} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
          </div>

          <div className="col-span-1">
            <label className={labelClasses}>{isBoleto ? 'Data do Pagamento' : 'Data'}</label>
            <input type="date" className={inputClasses} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>

          {isBoleto && (
            <div className="col-span-1">
              <label className={`${labelClasses} text-indigo-500`}>Data de Vencimento</label>
              <div className="relative">
                <CalendarDays size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400" />
                <input type="date" className={`${inputClasses} pl-12 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/10`} value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="col-span-1">
            <label className={labelClasses}>Horário</label>
            <input type="time" className={inputClasses} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
          </div>

          <div className="col-span-1">
            <label className={labelClasses}>Forma Pagto</label>
            <select className={inputClasses} value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value})}>
              <option value="pix">PIX</option>
              <option value="dinheiro">DINHEIRO</option>
              <option value="crédito">CRÉDITO</option>
              <option value="débito">DÉBITO</option>
            </select>
          </div>

          {showAccountField && (
            <div className="col-span-1">
              <label className={labelClasses}>Origem/Banco</label>
              <input className={inputClasses} value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} placeholder="EX: NUBANK" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className={labelClasses}><div className="flex items-center gap-2"><MessageSquare size={14} /> Observações</div></label>
            <textarea className={`${inputClasses} min-h-[140px] resize-none py-5 font-medium`} value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} placeholder="Deseja adicionar algum comentário extra?"></textarea>
          </div>

          <div className="space-y-2">
            <label className={labelClasses}><div className="flex items-center gap-2"><ImageIcon size={14} /> Comprovante Visual</div></label>
            <div onClick={() => receiptInputRef.current?.click()} className="relative min-h-[140px] bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex flex-col items-center justify-center p-6 border-dashed group">
              {receiptPreview ? (
                <>
                  <img src={receiptPreview} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[1px] group-hover:scale-110 transition-transform duration-500" />
                  <div className="relative z-10 bg-white/95 dark:bg-slate-900/95 px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-lg">
                     <Check size={18} className="text-emerald-500" />
                     <span className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Trocar Comprovante</span>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-slate-300 dark:text-slate-600 mb-3 group-hover:translate-y-[-4px] transition-transform" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Clique para Anexar</span>
                </>
              )}
              <input type="file" ref={receiptInputRef} className="hidden" accept="image/*" onChange={handleReceiptChange} />
            </div>
          </div>
        </div>

        {!isEntry && (
          <div className="space-y-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.25em] flex items-center gap-3">
              <Tag size={18} className="text-indigo-500" />
              {isBoleto ? 'Anexo do Boleto' : 'Detalhamento de Itens da Compra'}
            </h3>
            
            {!isBoleto && (
              <>
                <div id="item-entry-form" className={`flex flex-col sm:flex-row gap-4 p-5 rounded-3xl border-2 transition-all ${editingItemId ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 shadow-inner' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'} items-end sm:items-center`}>
                  <div className="flex-1 w-full">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block px-1">Nome do Item</label>
                    <input placeholder="EX: FILÉ MIGNON" className="w-full px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[14px] font-bold outline-none dark:text-white shadow-sm" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                  </div>
                  <div className="flex gap-4 w-full sm:w-auto">
                    <div className="flex-1 sm:w-32">
                      <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block px-1">Preço Unit.</label>
                      <input type="number" placeholder="0,00" className="w-full px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[14px] font-black text-rose-600 dark:text-rose-400" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} />
                    </div>
                    <div className="w-20">
                      <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block px-1">QTDE</label>
                      <input type="number" placeholder="1" className="w-full px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[14px] font-black text-center dark:text-white" value={newItem.quantity || ''} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                    </div>
                    <button type="button" onClick={handleAddItem} className="bg-indigo-600 text-white px-7 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl active:scale-90 h-[58px] mt-auto">
                      <Plus size={28} />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden">
                  <table className="w-full text-left text-[14px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-5">Item</th>
                        <th className="px-8 py-5 text-right">Preço</th>
                        <th className="px-8 py-5 text-center">QTDE</th>
                        <th className="px-8 py-5 text-center">Nec.</th>
                        <th className="px-8 py-5 text-right">Total</th>
                        <th className="px-8 py-5 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {(formData.items || []).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{item.name}</td>
                          <td className="px-8 py-4 text-right font-medium text-slate-500">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-8 py-4 text-center text-slate-500 font-black">{item.quantity}</td>
                          <td className="px-8 py-4 text-center">
                             <input type="checkbox" checked={item.isNecessary} onChange={() => toggleItemNecessity(item.id)} className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-all" />
                          </td>
                          <td className="px-8 py-4 text-right font-black text-slate-800 dark:text-white text-[15px]">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-8 py-4 text-center">
                            <button onClick={() => setItemToDelete(item.id)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-all p-2 rounded-xl active:scale-90"><Trash2 size={20} /></button>
                          </td>
                        </tr>
                      ))}
                      {(!formData.items || formData.items.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-8 py-12 text-center text-slate-300 dark:text-slate-600 font-black uppercase tracking-[0.3em] text-[11px]">Nenhum item na lista</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-6 md:px-12 md:py-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-darkSurface md:bg-slate-50 dark:md:bg-slate-900 flex gap-6 fixed md:static bottom-0 left-0 w-full z-20 shadow-2xl md:shadow-none">
        <button onClick={onCancel} className="flex-1 py-5 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-2xl text-[12px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm">Cancelar</button>
        <button onClick={handleFinalSave} className={`flex-[2] py-5 text-white font-black rounded-2xl shadow-2xl text-[12px] uppercase tracking-[0.2em] active:scale-95 transition-all ${isEntry ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}>
          Confirmar {isEntry ? 'Receita' : 'Registro'}
        </button>
      </div>
    </div>
  );
};

export default TransactionForm;
