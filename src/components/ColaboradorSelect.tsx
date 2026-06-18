import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { Colaborador } from '../types';
import { normalizeText } from '../lib/stringUtils';

interface ColaboradorSelectProps {
  value: string;
  onChange: (value: string) => void;
  colaboradores: Colaborador[];
  placeholder: string;
  label?: string;
  required?: boolean;
  error?: boolean;
}

export const ColaboradorSelect = React.forwardRef<HTMLButtonElement, ColaboradorSelectProps>(({ 
  value, 
  onChange, 
  colaboradores, 
  placeholder, 
  label,
  required,
  error
}, ref) => {
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

  const filtered = colaboradores
    .filter(c => c.status === 'Ativo')
    .filter(c => {
      const search = normalizeText(searchTerm);
      return normalizeText(c.nome).includes(search) || 
             normalizeText(c.empresa || '').includes(search);
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const renderEmpresa = (empresa: string | undefined) => {
    if (!empresa) return null;
    
    const isVision = empresa.toUpperCase() === 'VISION';
    const isBCM = empresa.toUpperCase() === 'BCM';

    if (isVision) {
      return <span className="text-blue-900 font-bold">({empresa})</span>;
    }
    if (isBCM) {
      return <span className="text-emerald-600 italic">({empresa})</span>;
    }
    return <span className="text-slate-400">({empresa})</span>;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <button
        ref={ref}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 bg-white border rounded-xl flex items-center justify-between text-[13px] transition-all focus:outline-none focus:ring-1 focus:ring-brand-accent shadow-xs ${
          error 
            ? 'border-red-600 ring-2 ring-red-600 bg-red-100 animate-error-pulse' 
            : 'border-brand-border hover:border-brand-accent'
        }`}
      >
        <span className={value ? "text-slate-900 font-medium" : "text-slate-400"}>
          {value ? (
            <div className="flex items-center gap-1.5">
              <span>{value}</span>
              {renderEmpresa(colaboradores.find(c => c.nome === value)?.empresa)}
            </div>
          ) : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] bottom-full mb-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Pesquisar..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-accent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.nome);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-4 py-2 text-left text-[13px] hover:bg-slate-50 transition-colors flex items-center justify-between group ${value === c.nome ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{c.nome}</span>
                    {renderEmpresa(c.empresa)}
                  </div>
                  {value === c.nome && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">Nenhum colaborador encontrado</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
