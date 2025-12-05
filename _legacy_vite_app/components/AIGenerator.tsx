import React, { useState } from 'react';
import { Contact } from '../types';
import { generateBirthdayWish } from '../services/gemini';
import { Sparkles, RefreshCw } from 'lucide-react';

interface AIGeneratorProps {
  contact: Contact;
  parentName?: string;
  onClose: () => void;
  onUse: (msg: string) => void;
}

export const AIGenerator: React.FC<AIGeneratorProps> = ({ contact, parentName, onClose, onUse }) => {
  const [loading, setLoading] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [tone, setTone] = useState('warm');

  const handleGenerate = async () => {
    setLoading(true);
    const msg = await generateBirthdayWish(contact, tone, parentName);
    setGeneratedMessage(msg);
    setLoading(false);
  };

  // Generate on mount
  React.useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <Sparkles size={20} />
            <h3 className="font-bold text-lg">AI Wish Writer</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {parentName && (
          <div className="mb-3 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100 text-xs text-indigo-700">
             Drafting message to <strong>{parentName}</strong> regarding {contact.name}.
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {['Warm', 'Funny', 'Professional', 'Short'].map((t) => (
            <button
              key={t}
              onClick={() => setTone(t.toLowerCase())}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                tone === t.toLowerCase() 
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 p-4 rounded-xl min-h-[100px] flex items-center justify-center mb-4 border border-gray-100">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="animate-spin" size={16} />
              <span className="text-sm">Writing magic...</span>
            </div>
          ) : (
            <p className="text-gray-800 text-center leading-relaxed">"{generatedMessage}"</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors"
          >
            <RefreshCw size={16} />
            Regenerate
          </button>
          <button
            onClick={() => onUse(generatedMessage)}
            disabled={loading || !generatedMessage}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use This
          </button>
        </div>
      </div>
    </div>
  );
};
