
import React from 'react';
import { Transaction } from '../types';
import { Trash2, Edit3, ChevronDown, ChevronUp, Receipt, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionCard: React.FC<Props> = ({ transaction, onEdit, onDelete }) => {
  const [expanded, setExpanded] = React.useState(false);
  const isIncome = transaction.type === 'entrada';

  const formatDate = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(transaction);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(transaction.id!);
  };

  return (
    <div className="bg-white dark:bg-darkSurface rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 md:p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 group relative">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          <div className={`p-2.5 md:p-3 rounded-xl flex-shrink-0 ${isIncome ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'}`}>
            {isIncome ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-slate-800 dark:text-slate-200 text-[11px] md:text-[13px] leading-tight uppercase truncate tracking-tight">{transaction.description || 'Sem descrição'}</h3>
            <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 truncate uppercase tracking-wider">
              {formatDate(transaction.date)} <span className="hidden xs:inline">• {transaction.time}</span> • {transaction.account}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-5 flex-shrink-0">
          <div className="text-right">
            <p className={`text-sm md:text-[15px] font-black whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isIncome ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex justify-end mt-0.5">
               <span className={`text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${transaction.isPaid ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'}`}>
                {transaction.isPaid ? 'Pago' : 'Pendente'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
            <button 
              onClick={handleEdit}
              className="p-1.5 md:p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors z-10"
              title="Editar Transação"
            >
              <Edit3 size={16} />
            </button>
            <button 
              onClick={handleDelete}
              className="hidden xs:block p-1.5 md:p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors z-10"
              title="Excluir Transação"
            >
              <Trash2 size={16} />
            </button>
            {transaction.items && transaction.items.length > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} 
                className="p-1.5 md:p-2 text-slate-400 dark:text-slate-600 border-l border-slate-200 dark:border-slate-700 ml-1"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && transaction.items && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in slide-in-from-top-1">
          <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Detalhes dos Itens</p>
          {transaction.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center py-2.5 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-[10px] md:text-xs">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex-shrink-0">
                  {item.isNecessary ? (
                    <ShieldCheck size={14} className="text-emerald-500" />
                  ) : (
                    <AlertCircle size={14} className="text-amber-500" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block truncate uppercase">{item.name}</span>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px]">{item.quantity} un • R$ {item.price.toLocaleString('pt-BR')}</span>
                </div>
              </div>
              <span className="font-black text-slate-800 dark:text-slate-200 ml-2">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
          {transaction.receiptUrl && (
            <div className="mt-2">
               <a href={transaction.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">
                 <Receipt size={12} className="mr-1.5" /> Ver Comprovante
               </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionCard;
