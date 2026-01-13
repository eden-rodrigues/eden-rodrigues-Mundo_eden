
import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Camera, User, Calendar, Loader2, Save } from 'lucide-react';

interface Props {
  uid: string;
  onComplete: () => void;
}

const ProfileSetup: React.FC<Props> = ({ uid, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [age, setAge] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        age: parseInt(age),
        birthDate: birthDate,
        photoURL: photoUrl || auth.currentUser?.photoURL || '',
        profileCompleted: true
      });
      onComplete();
    } catch (err) {
      alert('Erro ao salvar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Complete seu Perfil</h2>
        <p className="text-slate-500 text-sm mb-8">Conte-nos um pouco mais sobre você para personalizar sua experiência.</p>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center border-2 border-dashed border-indigo-200 overflow-hidden">
                {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <User size={40} className="text-indigo-300" />}
              </div>
              <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer shadow-lg active:scale-90 transition-transform">
                <Camera size={16} />
                <input type="text" placeholder="URL da Foto" className="hidden" />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Data de Nascimento</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="date" required 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                  value={birthDate} onChange={e => setBirthDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Idade</label>
              <input 
                type="number" required placeholder="Sua idade"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                value={age} onChange={e => setAge(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">URL da Foto de Perfil (Opcional)</label>
              <input 
                type="text" placeholder="https://..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                <Save size={18} /> Finalizar Cadastro
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
