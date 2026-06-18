import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Package } from 'lucide-react';
import { Material } from '../types';
import { normalizeText } from '../lib/stringUtils';

interface MaterialSelectProps {
  value: string;
  onChange: (value: string) => void;
  materiais: Material[];
  placeholder: string;
  label?: string;
  className?: string;
  required?: boolean;
  error?: boolean;
}

export const MaterialSelect: React.FC<MaterialSelectProps> = ({ 
  value, 
  onChange, 
  materiais, 
  placeholder, 
  label,
  className = "",
  required,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedMaterial = materiais.find(m => m.id === value);

  const filtered = materiais
    .filter(m => {
      const search = normalizeText(searchTerm);
      return normalizeText(m.descricao).includes(search) || 
             normalizeText(m.sap || '').includes(search);
    })
    .sort((a, b) => a.descricao.localeCompare(b.descricao));

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-8 px-3 bg-white border rounded-lg flex items-center justify-between text-[10px] transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm ${
          error 
            ? 'border-red-600 ring-1 ring-red-100 bg-red-50' 
            : 'border-slate-200 hover:border-slate-300'
        } ${isOpen ? 'border-blue-500 ring-1 ring-blue-50' : ''}`}
      >
        <span className={value ? "text-slate-800 font-bold truncate pr-2" : "text-slate-400 font-medium"}>
          {selectedMaterial ? selectedMaterial.descricao : placeholder}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full min-w-[280px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Pesquisar material ou código SAP..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`w-full px-3 py-2 text-left text-[10px] hover:bg-slate-50 transition-colors flex items-center justify-between border-b border-slate-50 ${!value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500 font-medium'}`}
            >
              <span>Todas as Peças</span>
              {!value && <Check className="w-3 h-3 text-blue-600" />}
            </button>

            {filtered.length > 0 ? (
              filtered.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(m.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-3 py-2.5 text-left text-[10px] hover:bg-slate-50 transition-colors flex items-center justify-between group border-b border-slate-50 last:border-0 ${value === m.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <span className={`truncate ${value === m.id ? 'font-black' : 'font-bold'}`}>{m.descricao}</span>
                    <div className="flex items-center gap-2">
                      {m.sap && (
                        <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-tighter">
                          SAP: {m.sap}
                        </span>
                      )}
                      <span className="text-[8px] font-bold text-slate-300 uppercase">
                        Stock: {m.estoqueAtual}
                      </span>
                    </div>
                  </div>
                  {value === m.id && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-[10px] text-slate-400 font-medium flex flex-col items-center gap-2">
                <Package className="w-5 h-5 text-slate-200" />
                Nenhum material encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
