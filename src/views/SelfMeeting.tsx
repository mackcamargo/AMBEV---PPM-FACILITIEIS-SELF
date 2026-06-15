import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../lib/store';
import { generateId } from '../lib/idUtils';
import { Material, Equipe, AtaReuniao, Movimentacao, formatUnit } from '../types';
import { Save, AlertCircle, ShoppingCart, Plus, Trash2, Download, Mail, Share2, Search } from 'lucide-react';

export const SelfMeeting: React.FC = () => {
  const { materiais, equipes, setEquipes, atas, setAtas, addMovimentacao, colaboradores, updateMaterial, updateEquipe } = useApp();
  
  // Local state for shopping list items: { materialId: quantity }
  const [compras, setCompras] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('selfMeeting_compras');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedTeam, setSelectedTeam] = useState<string | null>(() => {
    return localStorage.getItem('selfMeeting_selectedTeam');
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [externalSearchTerm, setExternalSearchTerm] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  // Inline editing for Min/Ideal values
  const [editingStock, setEditingStock] = useState<{ id: string, field: 'min' | 'ideal' | 'atual', value: string } | null>(null);
  const [editingBudget, setEditingBudget] = useState<{ id: string, value: string } | null>(null);
  
  // New Timer State
  const [elapsed, setElapsed] = useState<number>(() => {
    const saved = localStorage.getItem('selfMeeting_elapsed');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(() => {
    return localStorage.getItem('selfMeeting_isTimerRunning') !== 'false';
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selfMeeting_compras', JSON.stringify(compras));
  }, [compras]);

  useEffect(() => {
    localStorage.setItem('selfMeeting_elapsed', elapsed.toString());
  }, [elapsed]);

  useEffect(() => {
    localStorage.setItem('selfMeeting_isTimerRunning', isTimerRunning.toString());
  }, [isTimerRunning]);

  useEffect(() => {
    if (selectedTeam) {
      localStorage.setItem('selfMeeting_selectedTeam', selectedTeam);
    } else {
      localStorage.removeItem('selfMeeting_selectedTeam');
    }
  }, [selectedTeam]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isEmailChoiceModalOpen, setIsEmailChoiceModalOpen] = useState(false);
  const [shareTeam, setShareTeam] = useState<string>('Todas');
  const [showConfirmNewMeeting, setShowConfirmNewMeeting] = useState(false);
  const [clearOnShareClose, setClearOnShareClose] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  
  // States for duplicate check and save handling
  const [isSaving, setIsSaving] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [customAtaName, setCustomAtaName] = useState(() => {
    return localStorage.getItem('selfMeeting_customAtaName') || '';
  });

  useEffect(() => {
    localStorage.setItem('selfMeeting_customAtaName', customAtaName);
  }, [customAtaName]);
  
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      // Check if user is not already in an input/textarea
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '');
      
      if (e.shiftKey && e.key.toLowerCase() === 'f' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  // Reset scroll position to top when selected team changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [selectedTeam]);
  
  // Materials list for the table
  const tableData = materiais
    .filter(m => !selectedTeam || m.equipe === selectedTeam)
    .filter(m => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        m.sap.toLowerCase().includes(search) ||
        m.descricao.toLowerCase().includes(search) ||
        m.equipe.toLowerCase().includes(search) ||
        (m.codigoFornecedor || '').toLowerCase().includes(search) ||
        (m.localizacao || '').toLowerCase().includes(search) ||
        (m.detalhes || '').toLowerCase().includes(search)
      );

      const isZerado = m.estoqueAtual === 0;
      const isCritico = m.estoqueAtual < m.estoqueMinimo && m.estoqueAtual > 0;
      const isOk = m.estoqueAtual > 0 && m.estoqueAtual >= m.estoqueMinimo;

      const matchesStatus = 
        filterStatuses.length === 0 || 
        (filterStatuses.includes('ZERADO') && isZerado) || 
        (filterStatuses.includes('CRITICO') && isCritico) ||
        (filterStatuses.includes('OK') && isOk);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (a.descricao || '').localeCompare(b.descricao || ''))
    .map(m => ({
      ...m,
      status: m.estoqueAtual === 0 ? 'Zerado' : m.estoqueAtual < m.estoqueMinimo ? 'Crítico' : 'OK',
      qtdComprar: compras[m.id] || 0,
      subtotal: (compras[m.id] || 0) * m.precoUnitario
    }));

  // Auto-focus first item when team is selected
  useEffect(() => {
    if (selectedTeam && tableData.length > 0) {
      const firstItem = tableData[0];
      setActiveRowId(firstItem.id);
      setTimeout(() => {
        buttonRefs.current[firstItem.id]?.focus();
      }, 100);
    }
  }, [selectedTeam]);

  // Calculate totals per team based on all materials in compras (unfiltered)
  const impactPerTeam = useMemo(() => {
    const impacts: Record<string, number> = {};
    equipes?.forEach(e => {
      impacts[e.nome] = 0;
    });
    
    materiais?.forEach(m => {
      const q = compras?.[m.id] || 0;
      if (q > 0) {
        const subtotal = q * (m.precoUnitario || 0);
        const currentImpact = impacts[m.equipe] || 0;
        impacts[m.equipe] = currentImpact + subtotal;
      }
    });
    
    return impacts;
  }, [compras, materiais, equipes]);

  const totalGeral: number = (Object.values(impactPerTeam) as number[]).reduce((a, b) => a + b, 0);
  const totalSaldoEquipes: number = useMemo(() => equipes?.reduce((acc, e) => acc + (Number(e.saldoAtualizado) || 0), 0) || 0, [equipes]);
  const totalExibido = selectedTeam ? (impactPerTeam[selectedTeam] || 0) : totalGeral;

  const handleUpdateQtd = (id: string, val: string) => {
    const q = Math.max(0, parseInt(val) || 0);
    setCompras(prev => ({ ...prev, [id]: q }));
  };

  const handleNovaReuniaoClick = () => {
    const hasItems = Object.values(compras).some(q => (q as number) > 0);
    if (hasItems) {
      setShowConfirmNewMeeting(true);
    } else {
      setCompras({});
      setSelectedTeam(null);
      setElapsed(0);
      setIsTimerRunning(true); // Start timer on new meeting
    }
  };

  const handleDiscardAndNewMeeting = () => {
    setCompras({});
    setSelectedTeam(null);
    setElapsed(0);
    setIsTimerRunning(true);
    setCustomAtaName('');
    setShowConfirmNewMeeting(false);
  };

  const handleSaveAndNewMeeting = () => {
    setClearOnShareClose(true);
    checkDuplicateAndSave();
    setShowConfirmNewMeeting(false);
  };

  const checkDuplicateAndSave = () => {
    if (isSaving) return;

    // Check for potential duplicates: same items on the same day
    const today = new Date().toLocaleDateString();
    const currentItemsStr = JSON.stringify(Object.entries(compras)
      .filter(([_, q]) => (q as number) > 0)
      .sort(([a], [b]) => a.localeCompare(b)));

    const isDuplicate = atas.some(ata => {
      const ataDate = new Date(ata.data).toLocaleDateString();
      if (ataDate !== today) return false;

      const ataItemsStr = JSON.stringify(ata.itensComprados
        .map(i => [i.materialId, i.quantidade])
        .sort(([a], [b]) => (a as string).localeCompare(b as string)));
      
      return currentItemsStr === ataItemsStr;
    });

    if (isDuplicate) {
      setShowDuplicateModal(true);
      return;
    }

    handleSaveReuniao();
  };

  const handleSaveReuniao = (customName?: string) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      // Create Ata
      const novaAta: AtaReuniao = {
        id: generateId(),
        data: new Date().toISOString(),
        descricao: customName || ('Ata de Reunião de Self - ' + new Date().toLocaleDateString()),
        orcamentosSnapshot: equipes.map(e => {
          const impact = impactPerTeam[e.nome] || 0;
          const isOverspent = impact > e.saldoAtualizado;
          return {
            equipe: e.nome,
            saldoAnterior: e.saldoAtualizado,
            saldoNovo: e.saldoAtualizado - impact,
            estouro: isOverspent ? impact - e.saldoAtualizado : 0
          };
        }),
        itensComprados: Object.entries(compras)
          .filter(([_, q]) => (q as number) > 0)
          .map(([id, q]) => ({
            materialId: id,
            quantidade: q as number,
            custoTotal: (q as number) * (materiais.find(m => m.id === id)?.precoUnitario || 0)
          }))
      };

      setAtas(prev => [novaAta, ...prev]);
      setShowShareModal(true);
    } finally {
      setIsSaving(false);
      setShowDuplicateModal(false);
      setCustomAtaName('');
    }
  };

  const shareViaWhatsApp = () => {
    const text = generateShareMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmailChoice = (e: React.MouseEvent, provider: 'gmail' | 'outlook') => {
    e.stopPropagation();
    const subject = `Solicitação de Orçamento - Ata de Reunião de Self - ${new Date().toLocaleDateString()}`;
    const text = generateShareMessage();
    let formattedBody = text.replace(/\n/g, '\r\n');
    
    // Truncate to avoid 404 / URL too long errors
    if (formattedBody.length > 1500) {
      formattedBody = formattedBody.substring(0, 1500) + "\n\n...[Mensagem truncada devido ao tamanho. Baixe a planilha para ver tudo.]";
    }

    let url = "";

    if (provider === 'gmail') {
      url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;
    } else {
      url = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;
    }
    
    // Auto download spreadsheet
    downloadSpreadsheet();
    
    window.open(url, '_blank');
    setIsEmailChoiceModalOpen(false);

    setTimeout(() => {
      alert("E-mail aberto e planilha baixada!\n\nPor favor, anexe o arquivo da planilha (.csv) baixado em seu computador no corpo do e-mail.");
    }, 500);
  };

  const initiateEmailShare = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      shareViaEmail();
    } else {
      setIsEmailChoiceModalOpen(true);
    }
  };

  const shareViaEmail = () => {
    const subject = `Solicitação de Orçamento - Ata de Reunião de Self - ${new Date().toLocaleDateString()}`;
    const text = generateShareMessage();
    const formattedBody = text.replace(/\n/g, '\r\n');
    
    // Auto download spreadsheet
    downloadSpreadsheet();
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;

    setTimeout(() => {
      alert("Planilha baixada e e-mail aberto!\n\nPor favor, anexe o arquivo da planilha (.csv) baixado em seu computador.");
    }, 500);
  };

  const handleGlobalShare = async () => {
    const subject = `Solicitação de Orçamento - Ata de Reunião de Self - ${new Date().toLocaleDateString()}`;
    const text = generateShareMessage();
    
    // Prepare items to generate the CSV rows
    const items = Object.entries(compras)
      .filter(([id, q]) => {
        const isSelected = (q as number) > 0;
        if (!isSelected) return false;
        if (shareTeam === 'Todas') return true;
        const m = materiais.find(mat => mat.id === id);
        return m?.equipe === shareTeam;
      })
      .map(([id, q]) => {
        const m = materiais.find(mat => mat.id === id);
        return {
          COD_SAP: m?.sap,
          Equipe: m?.equipe,
          Descricao: m?.descricao,
          Quantidade: q,
          Unidade: formatUnit(m?.unidade)
        };
      });

    const headers = ['COD SAP', 'Equipe', 'Descrição', 'Quantidade', 'Unidade'];
    const csvRows = [
      headers.join(';'),
      ...items.map(row => 
        [
          row.COD_SAP,
          row.Equipe,
          `"${row.Descricao}"`,
          row.Quantidade,
          row.Unidade
        ].join(';')
      )
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const fileName = `Orcamento_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    
    const shareData: any = {
      title: subject,
      text: text,
    };

    try {
      const csvFile = new File([csvContent], fileName, { type: 'text/csv;charset=utf-8;' });
      if (navigator.canShare && navigator.canShare({ files: [csvFile] })) {
        shareData.files = [csvFile];
      }
    } catch (e) {
      console.warn("Could not attach file to shareData:", e);
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        shareViaEmail();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share API fallback:', err?.message || err);
        shareViaEmail();
      }
    }
  };

  const handleWebShare = async () => {
    const text = generateShareMessage();
    const shareData = {
      title: 'Solicitação de Orçamento',
      text: text,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        alert('Resumo copiado para a área de transferência!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share API fallback:', err?.message || err);
        const tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        document.body.appendChild(tempTextarea);
        tempTextarea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextarea);
        alert('Resumo copiado para a área de transferência!');
      }
    }
  };

  const generateShareMessage = () => {
    const items = Object.entries(compras)
      .filter(([id, q]) => {
        const isSelected = (q as number) > 0;
        if (!isSelected) return false;
        if (shareTeam === 'Todas') return true;
        const m = materiais.find(mat => mat.id === id);
        return m?.equipe === shareTeam;
      })
      .map(([id, q]) => {
        const m = materiais.find(mat => mat.id === id);
        return `• ${m?.descricao}\n  - COD SAP: ${m?.sap}\n  - Qtd: ${q} ${formatUnit(m?.unidade)}`;
      });
    
    return `Ola Espero que esteja Tudo Bem!\n\nSolicitamos o orçamento para os materiais e peças listados abaixo, referentes à nossa Reunião de Self.\nPedimos que o retorno com valores, disponibilidade e condições comerciais seja enviado em até 48 horas após o recebimento deste e-mail ou WhatsApp.\nÉ imprescindível que a proposta contemple o prazo de entrega após a geração do pedido de compra, para que possamos avaliar e dar prosseguimento ao processo de aquisição.\nSegue lista abaixo!\n\n${items.length > 0 ? items.join('\n\n') : 'Nenhum material selecionado para esta equipe.'}`;
  };

  const downloadSpreadsheet = () => {
    const items = Object.entries(compras)
      .filter(([id, q]) => {
        const isSelected = (q as number) > 0;
        if (!isSelected) return false;
        if (shareTeam === 'Todas') return true;
        const m = materiais.find(mat => mat.id === id);
        return m?.equipe === shareTeam;
      })
      .map(([id, q]) => {
        const m = materiais.find(mat => mat.id === id);
        return {
          COD_SAP: m?.sap,
          Equipe: m?.equipe,
          Descricao: m?.descricao,
          Quantidade: q,
          Unidade: formatUnit(m?.unidade)
        };
      });

    const headers = ['COD SAP', 'Equipe', 'Descrição', 'Quantidade', 'Unidade'];
    const csvRows = [
      headers.join(';'),
      ...items.map(row => 
        [
          row.COD_SAP,
          row.Equipe,
          `"${row.Descricao}"`,
          row.Quantidade,
          row.Unidade
        ].join(';')
      )
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Orcamento_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    if (clearOnShareClose) {
      setCompras({});
      setSelectedTeam(null);
      setElapsed(0);
      setIsTimerRunning(true);
      setCustomAtaName('');
      setClearOnShareClose(false);
    }
  };

  const onButtonKeyDown = (e: React.KeyboardEvent, id: string, index: number) => {
    const item = tableData[index];
    if (!item) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (item.qtdComprar === 0) {
        const needed = Math.max(1, (item.estoqueIdeal || 0) - item.estoqueAtual);
        handleUpdateQtd(id, needed.toString());
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleUpdateQtd(id, '0');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextItem = tableData[index + 1];
      if (nextItem) {
        setActiveRowId(nextItem.id);
        buttonRefs.current[nextItem.id]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevItem = tableData[index - 1];
      if (prevItem) {
        setActiveRowId(prevItem.id);
        buttonRefs.current[prevItem.id]?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setActiveRowId(id);
      // Ensure it's marked as SIM (autofill) if it's currently at 0
      if (item.qtdComprar === 0) {
        const needed = Math.max(1, (item.estoqueIdeal || 0) - item.estoqueAtual);
        handleUpdateQtd(id, needed.toString());
      }
      
      setTimeout(() => {
        const input = inputRefs.current[id];
        if (input) {
          input.focus();
          input.select();
        }
      }, 10);
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextItem = tableData[index + 1];
      if (nextItem) {
        setActiveRowId(nextItem.id);
        buttonRefs.current[nextItem.id]?.focus();
      }
    }
  };

  const isInvalid = equipes.some(e => (e.saldoAtualizado - (impactPerTeam[e.nome] || 0)) < 0);

  // Row highlighting state
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const handleBudgetUpdate = (id: string, newVerbaStr: string) => {
    const equipe = equipes.find(eq => eq.id === id);
    if (!equipe) return;
    
    const newVerba = Number(newVerbaStr) || 0;
    const delta = newVerba - (equipe.verbaDestinada || 0);
    const newSaldo = (equipe.saldoAtualizado || 0) + delta;
    
    updateEquipe(id, { 
      verbaDestinada: newVerba,
      saldoAtualizado: newSaldo
    });
    setEditingBudget(null);
  };

  return (
    <>
      <div className="view-container">
        {/* Fixed Header Content (Sticky) */}
        <div className="bg-slate-50 shrink-0 z-20 pb-1 space-y-3">
        {/* Budget Grid */}
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 pb-2 sm:pb-0 shrink-0 snap-x scrollbar-hide">
          {/* Todas as Equipes Card */}
          <div 
            onClick={() => setSelectedTeam(null)}
            className={`card card-equipe border-l-4 cursor-pointer transition-all hover:shadow-md shrink-0 snap-start w-[240px] sm:w-auto ${selectedTeam === null ? 'ring-2 ring-[#1E3A8A] ring-offset-2 bg-slate-50/50' : 'bg-white'}`} 
            style={{ borderLeftColor: '#1E3A8A' }}
          >
            <div className="flex justify-between items-center bg-transparent">
              <p className="text-[9px] font-extrabold text-black uppercase tracking-wider">Todas as Equipes</p>
              {selectedTeam === null && <div className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a] animate-pulse" />}
            </div>
            <div className="mt-1 flex justify-between items-end">
              <div>
                <p className="text-[8px] text-slate-500 uppercase font-bold">Verba Inicial</p>
                <p className="text-[11px] font-bold text-slate-700">R${totalSaldoEquipes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Saldo</p>
                <p className={`text-[11px] font-black ${(totalSaldoEquipes - totalGeral) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  R${(totalSaldoEquipes - totalGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-[8px] text-slate-500 uppercase font-bold">Gasto Previsto</p>
              <p className={`text-xs font-semibold ${totalGeral > 0 ? 'text-blue-600 font-black' : 'text-slate-400 font-medium'}`}>
                 R${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              {/* Barra de progresso geral */}
              <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${(totalSaldoEquipes - totalGeral) < 0 ? 'bg-red-500' : ((totalGeral / (totalSaldoEquipes || 1)) >= 0.8 ? 'bg-orange-500' : 'bg-emerald-500')}`}
                  style={{ 
                    width: `${totalGeral > 0 ? Math.max(12, Math.min(100, (totalGeral / (totalSaldoEquipes || 1)) * 100)) : 0}%`
                  }}
                />
              </div>
            </div>
          </div>

          {equipes?.map((e, idx) => {
            const impact = impactPerTeam[e.nome] || 0;
            const novoSaldo = (e.saldoAtualizado || 0) - impact;
            const isNegative = novoSaldo < 0;
            const isSelected = selectedTeam === e.nome;

            return (
              <div 
                key={e.id || `equipe-${idx}`} 
                onClick={() => setSelectedTeam(e.nome)}
                className={`card card-equipe border-l-4 cursor-pointer transition-all hover:shadow-md shrink-0 snap-start w-[240px] sm:w-auto ${isSelected ? 'ring-2 ring-[#1E3A8A] ring-offset-2' : ''}`} 
                style={{ borderLeftColor: '#1E3A8A' }}
              >
                <div className="flex justify-between items-center bg-transparent">
                  <p className="text-[9px] font-extrabold text-black uppercase tracking-wider">{e.nome}</p>
                  {e.nome === 'Pintura' && isTimerRunning && (
                    <div className="text-[9px] text-emerald-600 font-extrabold animate-pulse">
                      {formatTime(elapsed)}
                    </div>
                  )}
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />}
                </div>
                <div className="mt-1 flex justify-between items-end">
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase font-bold">Verba Inicial</p>
                    {editingBudget?.id === e.id ? (
                      <input
                        autoFocus
                        type="number"
                        className="w-full text-[11px] font-bold text-slate-700 bg-white border border-blue-500 rounded px-1 outline-none mt-1"
                        value={editingBudget.value}
                        onChange={(ev) => setEditingBudget({ ...editingBudget, value: ev.target.value })}
                        onBlur={() => handleBudgetUpdate(e.id, editingBudget.value)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') handleBudgetUpdate(e.id, editingBudget.value);
                          if (ev.key === 'Escape') setEditingBudget(null);
                        }}
                        onClick={(ev) => ev.stopPropagation()}
                      />
                    ) : (
                      <p 
                        className="text-[11px] font-bold text-slate-700 cursor-edit hover:text-blue-600 transition-colors"
                        onDoubleClick={(ev) => {
                          ev.stopPropagation();
                          setEditingBudget({ id: e.id, value: e.verbaDestinada.toString() });
                        }}
                        title="Duplo clique para editar verba inicial"
                      >
                        R$ {e.verbaDestinada?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-500 uppercase font-bold">Saldo</p>
                    <p className={`text-[11px] font-black ${novoSaldo < 0 ? 'text-red-600' : 'text-emerald-600'}`}>R$ {novoSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-[8px] text-slate-500 uppercase font-bold">Gasto Previsto</p>
                  <p className={`text-xs font-semibold ${impact > 0 ? 'text-blue-600 font-black' : 'text-slate-400 font-medium'}`}>
                     R$ {impact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {/* Barra de progresso do gasto */}
                  <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500 rounded-full"
                      style={{ 
                        width: `${impact > 0 ? Math.max(12, Math.min(100, (impact / (e.saldoAtualizado || 1)) * 100)) : 0}%`,
                        backgroundColor: isNegative ? '#EF4444' : ((impact / (e.saldoAtualizado || 1)) >= 0.8 ? '#F97316' : '#10B981')
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        </div>

        {/* Decision Table */}
        <div className="card !p-0 flex-1 flex flex-col min-h-0 overflow-hidden mt-1">
          <div className="p-2 lg:p-2.5 border-b border-brand-border flex flex-col gap-2 shrink-0 bg-slate-50/30">
            {/* Base Header Compacted */}
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3 rounded-full bg-[#1e3a8a]" />
                Área de Decisão {selectedTeam ? ` - ${selectedTeam}` : ''}
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`text-sm font-black tabular-nums transition-colors ${isInvalid ? 'text-red-600' : 'text-blue-600'}`}>
                    R$ {totalExibido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Search and Filters Strip Compacted */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 bg-white p-1.5 rounded-lg border border-slate-100 shrink-0">
              <div className="flex flex-col md:flex-row flex-1 items-stretch md:items-center gap-2">
                <div className="flex items-center gap-2 flex-1 md:max-w-md">
                  {/* Busca Externa - Slim */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (externalSearchTerm.trim()) {
                        window.open(`https://www.google.com/search?q=${encodeURIComponent(externalSearchTerm)}`, '_blank');
                      }
                    }}
                    className="relative group w-1/3 md:w-32 h-7"
                  >
                      <input 
                        type="text" 
                        placeholder="Google..."
                        className="w-full pl-2 pr-6 py-0.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-0 rounded text-[9px] font-bold text-slate-900 placeholder:text-slate-400 transition-all h-full"
                        value={externalSearchTerm}
                        onChange={(e) => setExternalSearchTerm(e.target.value)}
                      />
                      <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-700">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </button>
                  </form>

                  {/* Busca Interna - Slim */}
                  <div className="relative group flex-1 h-7">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <Search className="w-3 h-3 text-slate-400 group-focus-within:text-blue-500" />
                      </div>
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="Pesquisar material, SAP..."
                        className="w-full pl-7 pr-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded text-[9px] font-bold text-slate-900 placeholder:text-slate-400 transition-all h-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                </div>

                {/* Status Filter Chips - Slim */}
                <div className="flex items-center bg-slate-50 p-0.5 rounded border border-slate-200 h-7 overflow-x-auto scrollbar-hide">
                  <button 
                    onClick={() => setFilterStatuses([])}
                    className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded transition-all ${filterStatuses.length === 0 ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Ver Tudo
                  </button>
                  <div className="w-px h-2.5 bg-slate-200 mx-0.5 shrink-0" />
                  <button 
                    onClick={() => setFilterStatuses(prev => prev.includes('ZERADO') ? prev.filter(s => s !== 'ZERADO') : [...prev, 'ZERADO'])}
                    className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded transition-all flex items-center gap-1 ${filterStatuses.includes('ZERADO') ? 'bg-white shadow-sm text-red-600 border border-red-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <div className={`w-1 h-1 rounded-full ${filterStatuses.includes('ZERADO') ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                    Zerados
                  </button>
                  <button 
                    onClick={() => setFilterStatuses(prev => prev.includes('CRITICO') ? prev.filter(s => s !== 'CRITICO') : [...prev, 'CRITICO'])}
                    className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded transition-all flex items-center gap-1 ${filterStatuses.includes('CRITICO') ? 'bg-white shadow-sm text-amber-600 border border-amber-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <div className={`w-1 h-1 rounded-full ${filterStatuses.includes('CRITICO') ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
                    Críticos
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full xl:w-auto mt-0 overflow-x-auto scrollbar-hide min-w-0">
                  <div className="flex items-center gap-1.5 w-full md:w-auto h-7">
                    <button 
                      onClick={() => setShowConfirmClear(true)}
                      disabled={totalGeral === 0}
                      className="px-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-red-600 rounded text-[9px] font-black uppercase tracking-tight transition-all flex items-center gap-1 h-full whitespace-nowrap disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpar</span>
                    </button>

                    <button 
                      onClick={handleNovaReuniaoClick}
                      className="px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-black uppercase tracking-tight transition-all flex items-center gap-1 h-full whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nova</span>
                    </button>

                    <button 
                      onClick={checkDuplicateAndSave}
                      disabled={totalGeral === 0 || isSaving}
                      className="px-2 bg-slate-900 hover:bg-black text-white rounded text-[9px] font-black uppercase tracking-tight transition-all flex items-center gap-1 h-full whitespace-nowrap disabled:opacity-50"
                    >
                      <Save className={`w-3 h-3 ${isSaving ? 'animate-spin' : ''}`} />
                      <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                  </div>
              </div>
            </div>
          </div>

          {isInvalid && (
            <div className="bg-red-50 p-3 flex items-center gap-3 border-b border-red-100 shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-[11px] text-red-600 font-medium">Orçamento estourado em uma ou mais equipes. A reunião pode ser salva, mas o saldo ficará negativo.</p>
            </div>
          )}

          {/* Área de Decisão de Compras */}
          <div ref={tableContainerRef} className="scroll-container">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_rgba(15,23,42,0.06)]">
                <tr className="bg-slate-50">
                  <th className="table-header !px-4 border-b border-slate-100">COD SAP</th>
                  <th className="table-header !px-4 border-b border-slate-100">Cód. Forn.</th>
                  <th className="table-header !px-4 border-b border-slate-100">Material</th>
                  <th className="table-header !px-4 text-right border-b border-slate-100">Local</th>
                  <th className="table-header !px-4 text-right border-b border-slate-100">Estoque</th>
                  <th className="table-header !px-4 text-right border-b border-slate-100">Mín/Ideal</th>
                  <th className="table-header !px-4 text-center border-b border-slate-100">Status</th>
                  <th className="table-header !px-4 text-center border-b border-slate-100">Comprar?</th>
                  <th className="table-header !px-4 text-right border-b border-slate-100">Preço Un.</th>
                  <th className="table-header !px-4 text-right w-24 border-b border-slate-100">Qtd Comprar</th>
                  <th className="table-header !px-4 text-right border-b border-slate-100">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-slate-500 font-medium bg-slate-50/50">
                      Nenhum material encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  tableData.map((item, index) => {
                    const isActive = activeRowId === item.id;
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => setActiveRowId(item.id)}
                        className={`table-row group transition-all duration-200 cursor-pointer relative ${
                          isActive 
                            ? 'bg-blue-50/70 shadow-[inset_0_2px_0_0_#1e3a8a,inset_0_-2px_0_0_#1e3a8a] z-10' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className={`px-4 py-3 font-mono text-[11px] border-b transition-all ${isActive ? 'text-blue-900 font-black border-blue-900/10' : 'text-slate-500 border-slate-200'}`}>
                          {item.sap}
                        </td>
                        <td className={`px-4 py-3 font-mono text-[10px] border-b transition-all ${isActive ? 'text-blue-800 font-bold border-blue-900/10' : 'text-slate-400 border-slate-200'}`}>
                          {item.codigoFornecedor || '-'}
                        </td>
                        <td className={`px-4 py-3 border-b transition-all ${isActive ? 'border-blue-900/10' : 'border-slate-200'}`}>
                          <p className={`font-bold text-[12px] leading-tight mb-0.5 ${isActive ? 'text-blue-950' : 'text-slate-800'}`}>{item.descricao}</p>
                          <div className="flex gap-2 items-center">
                            <p className={`text-[10px] font-bold uppercase tracking-tighter px-1 rounded-sm ${isActive ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{item.equipe}</p>
                            {item.ultimaMovimentacao && (
                              <p className={`text-[9.5px] font-normal ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>| {item.ultimaMovimentacao}</p>
                            )}
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-[11px] font-bold uppercase tracking-tighter text-right border-b transition-all ${isActive ? 'text-blue-900 border-blue-900/10' : 'text-slate-500 border-slate-200'}`}>{item.localizacao || '-'}</td>
                        <td className={`px-4 py-3 text-[11px] font-medium text-right border-b transition-all ${isActive ? 'border-blue-900/10' : 'border-slate-200'}`}>
                        {editingStock?.id === item.id && editingStock?.field === 'atual' ? (
                          <input
                            autoFocus
                            className="w-10 h-4 bg-white border border-blue-500 rounded text-center text-slate-900 outline-none ml-auto"
                            value={editingStock.value}
                            onChange={(e) => setEditingStock({ ...editingStock, value: e.target.value })}
                            onBlur={() => {
                              updateMaterial(item.id, { estoqueAtual: Number(editingStock.value) || 0 });
                              setEditingStock(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateMaterial(item.id, { estoqueAtual: Number(editingStock.value) || 0 });
                                setEditingStock(null);
                              }
                              if (e.key === 'Escape') setEditingStock(null);
                            }}
                          />
                        ) : (
                          <span 
                            onDoubleClick={() => setEditingStock({ id: item.id, field: 'atual', value: item.estoqueAtual.toString() })}
                            className={`px-2 py-0.5 rounded font-black transition-all ${
                              item.estoqueAtual >= (item.estoqueIdeal || 0) 
                                ? 'text-emerald-700 bg-emerald-50' 
                                : item.estoqueAtual === 0 
                                ? 'text-red-700 bg-red-50' 
                                : 'text-amber-700 bg-amber-50'
                            } cursor-edit hover:brightness-95`}
                            title="Duplo clique para editar estoque atual"
                          >
                            {item.estoqueAtual} {formatUnit(item.unidade)}
                          </span>
                        )}
                      </td>
                        <td className={`px-4 py-3 text-[11px] font-medium text-right border-b transition-all ${isActive ? 'border-blue-900/10' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 justify-end">
                          {editingStock?.id === item.id && editingStock?.field === 'min' ? (
                             <input
                              autoFocus
                              className="w-8 h-4 bg-white border border-blue-500 rounded text-center text-slate-900 outline-none"
                              value={editingStock.value}
                              onChange={(e) => setEditingStock({ ...editingStock, value: e.target.value })}
                              onBlur={() => {
                                updateMaterial(item.id, { estoqueMinimo: Number(editingStock.value) || 0 });
                                setEditingStock(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateMaterial(item.id, { estoqueMinimo: Number(editingStock.value) || 0 });
                                  setEditingStock(null);
                                }
                                if (e.key === 'Escape') setEditingStock(null);
                              }}
                            />
                          ) : (
                            <span 
                              onDoubleClick={() => setEditingStock({ id: item.id, field: 'min', value: item.estoqueMinimo.toString() })}
                              className="cursor-edit hover:text-blue-600 transition-colors"
                              title="Duplo clique para editar"
                            >
                              {item.estoqueMinimo}
                            </span>
                          )}
                          <span className="text-slate-200">|</span>
                          {editingStock?.id === item.id && editingStock?.field === 'ideal' ? (
                            <input
                              autoFocus
                              className="w-8 h-4 bg-white border border-blue-500 rounded text-center text-slate-900 outline-none"
                              value={editingStock.value}
                              onChange={(e) => setEditingStock({ ...editingStock, value: e.target.value })}
                              onBlur={() => {
                                updateMaterial(item.id, { estoqueIdeal: Number(editingStock.value) || 0 });
                                setEditingStock(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateMaterial(item.id, { estoqueIdeal: Number(editingStock.value) || 0 });
                                  setEditingStock(null);
                                }
                                if (e.key === 'Escape') setEditingStock(null);
                              }}
                            />
                          ) : (
                            <span 
                              onDoubleClick={() => setEditingStock({ id: item.id, field: 'ideal', value: (item.estoqueIdeal || 0).toString() })}
                              className="cursor-edit hover:text-blue-600 transition-colors"
                              title="Duplo clique para editar"
                            >
                              {item.estoqueIdeal || '-'}
                            </span>
                          )}
                        </div>
                      </td>
                        <td className={`px-4 py-3 text-center border-b transition-all ${isActive ? 'border-blue-900/10' : 'border-slate-200'}`}>
                        <span className={`status-pill !text-[10px] !py-0 !px-2 !h-4 ${
                          item.status === 'Zerado' ? 'pill-crit' : 
                          item.status === 'Crítico' ? 'pill-warn' : 'pill-ok'}`}>
                          {item.status === 'OK' ? 'OK' : item.status === 'Crítico' ? 'BAIXO' : 'ZERADO'}
                        </span>
                      </td>
                        <td className={`px-4 py-3 border-b transition-all ${isActive ? 'border-blue-900/10' : 'border-slate-200'}`}>
                        <div className="flex justify-center">
                          <button 
                            ref={el => buttonRefs.current[item.id] = el}
                            onKeyDown={(e) => onButtonKeyDown(e, item.id, index)}
                            onClick={() => {
                              if (item.qtdComprar > 0) {
                                handleUpdateQtd(item.id, '0');
                              } else {
                                const needed = Math.max(1, (item.estoqueIdeal || 0) - item.estoqueAtual);
                                handleUpdateQtd(item.id, needed.toString());
                              }
                            }}
                            className={`text-[11px] font-black h-7 px-4 rounded-full border focus:outline-none transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 touch-manipulation uppercase tracking-tighter w-16 hover:animate-intense-pulse focus:animate-intense-pulse hover:scale-110 focus:scale-110 hover:ring-4 focus:ring-4 ${
                              item.qtdComprar > 0 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 hover:ring-blue-500/40 focus:ring-blue-500/50' 
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-700 hover:ring-slate-200 focus:ring-slate-300'
                            }`}
                          >
                            {item.qtdComprar > 0 ? 'SIM' : 'NÃO'}
                          </button>
                        </div>
                      </td>
                        <td className={`px-4 py-3 text-right border-b transition-all ${isActive ? 'border-blue-900/10' : 'border-slate-200'}`}>
                          <div className="flex items-center justify-end gap-0 group">
                          <span className="text-[11px] text-slate-300 font-bold group-hover:text-green-500 transition-colors">R$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            className="bg-transparent border-none outline-none focus:ring-0 p-0 m-0 tabular-nums text-[11px] font-bold text-right w-14 text-slate-500 group-hover:text-green-600 focus:text-green-700 transition-colors cursor-pointer"
                            value={item.precoUnitario}
                            onChange={(e) => updateMaterial(item.id, { precoUnitario: Number(e.target.value) || 0 })}
                          />
                        </div>
                      </td>
                        <td className={`px-4 py-3 text-right border-b transition-all ${isActive ? 'border-blue-900/10' : 'border-slate-200'}`}>
                          <input 
                            ref={el => inputRefs.current[item.id] = el}
                          onKeyDown={(e) => onInputKeyDown(e, index)}
                          type="number" 
                          className={`input-field tabular-nums focus:bg-emerald-50/10 h-8 px-3 text-[12px] font-bold text-right border-slate-100 hover:border-slate-200 transition-all ${item.qtdComprar > 0 ? 'bg-emerald-50/30 border-emerald-200 ring-2 ring-emerald-500/5' : ''}`}
                          value={item.qtdComprar || ''}
                          placeholder="0"
                          onChange={(e) => handleUpdateQtd(item.id, e.target.value)}
                          onFocus={() => setActiveRowId(item.id)}
                          style={{ minWidth: '60px' }}
                        />
                      </td>
                        <td className={`px-4 py-3 text-right font-black tabular-nums text-[12px] border-b transition-all ${isActive ? 'text-blue-950 border-blue-900/10' : 'text-slate-900 border-slate-200'}`}>
                        {item.subtotal > 0 ? `R$ ${item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                      </td>
                    </tr>
                   );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 animate-custom-blink mb-1">Reunião Salva!</h3>
              <p className="text-sm text-slate-500 mt-2">Deseja compartilhar a solicitação de orçamento agora?</p>

              <div className="mt-6 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Enviar de qual equipe?</label>
                <div className="flex flex-wrap gap-2">
                   <button 
                     onClick={() => setShareTeam('Todas')}
                     className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        shareTeam === 'Todas' 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                     }`}
                   >
                     TODAS
                   </button>
                   {equipes.map(e => (
                     <button 
                       key={e.id}
                       onClick={() => setShareTeam(e.nome)}
                       className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          shareTeam === e.nome 
                          ? 'bg-blue-600 border-blue-600 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                       }`}
                     >
                       {e.nome.toUpperCase()}
                     </button>
                   ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
                <button 
                  onClick={handleGlobalShare}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-700">Compartilhar</span>
                </button>

                <button 
                  onClick={shareViaWhatsApp}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group lg:min-w-[70px] cursor-pointer"
                >
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-emerald-200">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <span className="text-[9px] font-bold text-slate-700">WhatsApp</span>
                </button>

                <button 
                  onClick={initiateEmailShare}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-amber-50 hover:border-amber-200 transition-all group lg:min-w-[70px] cursor-pointer"
                >
                  <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-amber-200">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-700">Email</span>
                </button>
                


                
                <button 
                  onClick={downloadSpreadsheet}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform relative shadow-lg shadow-emerald-200">
                    <Download className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-700">Planilha</span>
                </button>
              </div>

              <button 
                onClick={closeShareModal}
                className="mt-6 w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Agora não, obrigado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Meeting Warning Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-widest mb-2 font-sans underline decoration-2 decoration-[#0F172A]/20">REUNIÃO NESSA MESMA DATA JÁ FOI SALVA</h3>
              <p className="text-[11px] text-slate-500 mb-6 leading-relaxed">
                Este centro de custo já registrou uma reunião hoje com estes itens.
                Deseja <strong>salvar uma nova reunião</strong> mesmo assim?
              </p>

              <div className="w-full space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-black text-[#0F172A] uppercase tracking-tighter ml-1">Para salvar novamente, informe um nome/identificador para esta segunda reunião:</label>
                  <input 
                    type="text"
                    placeholder="Ex: Reunião Extra, Revisão Pintura..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 outline-none transition-all placeholder:font-normal"
                    value={customAtaName}
                    onChange={(e) => setCustomAtaName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      setShowDuplicateModal(false);
                      setCustomAtaName('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all cursor-pointer font-sans"
                  >
                    Não, cancelar
                  </button>
                  <button 
                    onClick={() => handleSaveReuniao(customAtaName)}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all cursor-pointer shadow-lg shadow-blue-200 font-sans"
                  >
                    Sim, salvar agora
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Save or Discard current unsaved choosing */}
      {showConfirmNewMeeting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-950 mb-2">Iniciar Nova Reunião?</h3>
              <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto mb-6">
                Você possui peças selecionadas nesta tela. Deseja <strong>salvar</strong> a reunião com as escolhas atuais ou prefere <strong>descartar</strong> tudo?
              </p>

              <div className="flex flex-col gap-2.5">
                <button 
                  onClick={handleSaveAndNewMeeting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar e Iniciar Nova
                </button>
                
                <button 
                  onClick={handleDiscardAndNewMeeting}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 font-extrabold text-xs py-3 rounded-xl transition-all active:scale-98 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Descartar Alterações
                </button>

                <button 
                  onClick={() => setShowConfirmNewMeeting(false)}
                  className="w-full mt-2 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 font-bold text-xs py-2.5 rounded-xl transition-all active:scale-98 cursor-pointer"
                >
                  Continuar Editando
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Clear list items */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-950 mb-2 font-sans tracking-tight">Limpar Lista de Materiais?</h3>
              <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto mb-6">
                Você pode optar por apenas limpar a lista ou pode salvar a reunião antes de apagá-la.
              </p>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    setClearOnShareClose(true);
                    handleSaveReuniao();
                    setShowConfirmClear(false);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar e Limpar
                </button>
                <button 
                  onClick={() => {
                    setCompras({});
                    setSelectedTeam(null);
                    setElapsed(0);
                    setIsTimerRunning(true);
                    setCustomAtaName('');
                    setShowConfirmClear(false);
                  }}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-[10px] py-2.5 rounded-xl transition-all active:scale-98 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 border border-transparent hover:border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Sem Salvar
                </button>

                <button 
                  onClick={() => setShowConfirmClear(false)}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[10px] py-2.5 mt-1 rounded-xl transition-all active:scale-98 cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEmailChoiceModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4">Escolha seu provedor</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={(e) => shareViaEmailChoice(e, 'gmail')}
                className="p-4 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 text-center font-bold text-sm text-slate-700 transition-colors cursor-pointer"
              >
                Gmail
              </button>
              <button 
                onClick={(e) => shareViaEmailChoice(e, 'outlook')}
                className="p-4 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-center font-bold text-sm text-slate-700 transition-colors cursor-pointer"
              >
                Outlook
              </button>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEmailChoiceModalOpen(false); }}
              className="w-full mt-4 p-2 text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
