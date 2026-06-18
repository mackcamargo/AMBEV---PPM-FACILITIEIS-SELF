import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../lib/store';
import { 
  FileText, 
  Clock, 
  X, 
  Share2, 
  ShoppingCart, 
  ExternalLink, 
  Download, 
  Edit3, 
  Trash2,
  Search,
  Check,
  AlertCircle,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AtaReuniao, formatUnit, Movimentacao } from '../types';

export const MeetingHistory: React.FC = () => {
  const { 
    atas, 
    materiais, 
    equipes, 
    setAtas, 
    setEquipes, 
    setMateriais, 
    setMovimentacoes, 
    colaboradores, 
    user,
    movimentacoes,
    deletionPassword,
    isDeletionPasswordEnabled
  } = useApp();

  const [selectedAta, setSelectedAta] = useState<AtaReuniao | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isEmailChoiceModalOpen, setIsEmailChoiceModalOpen] = useState(false);
  const [shareTeam, setShareTeam] = useState<string>('Todas');

  // Month filtering state
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Delete confirm states
  const [ataToDelete, setAtaToDelete] = useState<AtaReuniao | null>(null);
  const [deletionPasswordInput, setDeletionPasswordInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editedDesc, setEditedDesc] = useState('');
  const [editedItens, setEditedItens] = useState<Record<string, number>>({});
  const [itensOrder, setItensOrder] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editFilterTeam, setEditFilterTeam] = useState<string | null>(null);

  const handleShare = (ata: AtaReuniao) => {
    setSelectedAta(ata);
    setShowShareOptions(true);
    setIsEditing(false);
  };

  const handleView = (ata: AtaReuniao) => {
    setSelectedAta(ata);
    setShowShareOptions(false);
    setIsEditing(false);
  };

  const handleEditInit = (ata: AtaReuniao) => {
    setSelectedAta(ata);
    setIsEditing(true);
    setShowShareOptions(false);
    setEditedDesc(ata.descricao);
    setEditFilterTeam(null);

    // Populate editedItems map
    const itemMap: Record<string, number> = {};
    ata.itensComprados.forEach(item => {
      itemMap[item.materialId] = item.quantidade;
    });
    setEditedItens(itemMap);
    setItensOrder(ata.itensComprados.map(i => i.materialId));
  };

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    atas.forEach(ata => {
      const date = new Date(ata.data);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        monthsSet.add(`${year}-${month}`);
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [atas]);

  const formatMonthYear = (val: string) => {
    const [year, month] = val.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[parseInt(month) - 1]} / ${year}`;
  };

  const filteredAtas = useMemo(() => {
    return atas.filter(ata => {
      if (!selectedMonth) return true;
      const date = new Date(ata.data);
      if (isNaN(date.getTime())) return false;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}` === selectedMonth;
    });
  }, [atas, selectedMonth]);

  const editedImpactPerTeam = useMemo(() => {
    const impacts: Record<string, number> = {};
    Object.keys(editedItens).forEach(id => {
      const q = editedItens[id];
      const mat = materiais.find(m => m.id === id);
      if (mat && q > 0) {
        impacts[mat.equipe] = (impacts[mat.equipe] || 0) + (q * mat.precoUnitario);
      }
    });
    return impacts;
  }, [editedItens, materiais]);

  const handleDeleteReuniao = async (ata: AtaReuniao) => {
    if (isDeletionPasswordEnabled && deletionPasswordInput !== deletionPassword) {
      setDeleteError('Senha de exclusão inválida.');
      return;
    }
    
    // Remove meeting from history list
    setAtas(prev => prev.filter(a => a.id !== ata.id));
    setAtaToDelete(null);
    setDeletionPasswordInput('');
    setDeleteError('');
    if (selectedAta?.id === ata.id) {
      setSelectedAta(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (isDeletionPasswordEnabled && deletionPasswordInput !== deletionPassword) {
      setDeleteError('Senha de exclusão inválida.');
      return;
    }

    setAtas(prev => prev.filter(a => !selectedIds.includes(a.id)));
    if (selectedAta && selectedIds.includes(selectedAta.id)) {
      setSelectedAta(null);
    }
    setIsBulkDeleteModalOpen(false);
    setSelectedIds([]);
    setDeletionPasswordInput('');
    setDeleteError('');
  };

  const handleSaveEditedAta = () => {
    if (!selectedAta) return;

    // Calculate original spent cost per team in this meeting
    const originalImpactPerTeam: Record<string, number> = {};
    selectedAta.itensComprados.forEach(item => {
      const mat = materiais.find(m => m.id === item.materialId);
      if (mat) {
        originalImpactPerTeam[mat.equipe] = (originalImpactPerTeam[mat.equipe] || 0) + item.custoTotal;
      }
    });

    // Update the AtaReuniao object
    setAtas(prev => prev.map(a => {
      if (a.id === selectedAta.id) {
        return {
          ...a,
          descricao: editedDesc,
          orcamentosSnapshot: equipes.map(e => {
            const newSpent = editedImpactPerTeam[e.nome] || 0;
            const originalSpent = originalImpactPerTeam[e.nome] || 0;
            const currentActualBalance = e.saldoAtualizado; // balance after other transactions
            // Reconstruct prior balance relative to this meeting
            const saldoAnteriorEst = currentActualBalance + originalSpent;
            const isOverspent = newSpent > saldoAnteriorEst;
            return {
              equipe: e.nome,
              saldoAnterior: saldoAnteriorEst,
              saldoNovo: saldoAnteriorEst - newSpent,
              estouro: isOverspent ? newSpent - saldoAnteriorEst : 0
            };
          }),
          itensComprados: Object.keys(editedItens)
            .filter(id => editedItens[id] > 0)
            .map(id => {
              const q = editedItens[id];
              return {
                materialId: id,
                quantidade: q,
                custoTotal: q * (materiais.find(m => m.id === id)?.precoUnitario || 0)
              };
            })
        };
      }
      return a;
    }));

    setIsEditing(false);
    setSelectedAta(null);
  };

  const { setView } = useApp();
  const handleOpenInMeetingMode = () => {
    if (!selectedAta) return;
    
    // Prepare localStorage for SelfMeeting
    localStorage.setItem('selfMeeting_compras', JSON.stringify(editedItens));
    localStorage.removeItem('selfMeeting_selectedTeam');
    
    // Navigate to SelfMeeting
    setView('reuniao-self');
    setSelectedAta(null);
    setIsEditing(false);
  };

  const handleWebShare = async (ata: AtaReuniao) => {
    const text = generateShareMessage(ata);
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

  const generateShareMessage = (ata: AtaReuniao) => {
    const items = ata.itensComprados
      .filter(item => {
        if (shareTeam === 'Todas') return true;
        const m = materiais.find(mat => mat.id === item.materialId);
        return m?.equipe === shareTeam;
      })
      .map(item => {
        const m = materiais.find(mat => mat.id === item.materialId);
        return `• ${m?.descricao}\n  - COD SAP: ${m?.sap}\n  - Qtd: ${item.quantidade} ${formatUnit(m?.unidade)}`;
      });
    
    return `Ola Espero que esteja Tudo Bem!\n\nSolicitamos o orçamento para os materiais e peças listados abaixo, referentes à nossa Reunião de Self.\nPedimos que o retorno com valores, disponibilidade e condições comerciais seja enviado em até 48 horas após o recebimento deste e-mail ou WhatsApp.\nÉ imprescindível que a proposta contemple o prazo de entrega após a geração do pedido de compra, para que possamos avaliar e dar prosseguimento ao processo de aquisição.\nSegue lista abaixo!\n\n${items.length > 0 ? items.join('\n\n') : 'Nenhum material selecionado para esta equipe nesta ata.'}`;
  };

  const shareViaWhatsApp = (ata: AtaReuniao) => {
    const text = generateShareMessage(ata);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmailChoice = (e: React.MouseEvent, ata: AtaReuniao, provider: 'gmail' | 'outlook') => {
    e.stopPropagation();
    const subject = `Solicitação de Orçamento - ${ata.descricao}`;
    const text = generateShareMessage(ata);
    let formattedBody = text.replace(/\n/g, '\r\n');
    
    // Truncate to avoid 404 / URL too long errors
    if (formattedBody.length > 1500) {
      formattedBody = formattedBody.substring(0, 1500) + "\n\n...[Mensagem truncada devido ao tamanho. Baixe o PDF/CSV para ver tudo.]";
    }

    let url = "";

    if (provider === 'gmail') {
      url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;
    } else {
      url = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;
    }
    
    // Automatic spreadsheet download
    downloadSpreadsheet(ata);
    
    window.open(url, '_blank');
    setIsEmailChoiceModalOpen(false);

    setTimeout(() => {
      alert("E-mail aberto e planilha baixada!\n\nPor favor, anexe o arquivo da planilha (.csv) baixado em seu computador no corpo do e-mail.");
    }, 500);
  };

  const initiateEmailShare = (ata: AtaReuniao) => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      shareViaEmail(ata);
    } else {
      setSelectedAta(ata); // Ensure selectedAta is set
      setIsEmailChoiceModalOpen(true);
    }
  };

  const shareViaEmail = (ata: AtaReuniao) => {
    const subject = `Solicitação de Orçamento - ${ata.descricao}`;
    const text = generateShareMessage(ata);
    const formattedBody = text.replace(/\n/g, '\r\n');
    
    // Automatic spreadsheet download
    downloadSpreadsheet(ata);
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedBody)}`;

    setTimeout(() => {
      alert("Planilha baixada e e-mail aberto!\n\nPor favor, anexe o arquivo da planilha (.csv) baixado em seu computador.");
    }, 500);
  };

  const handleGlobalShare = async (ata: AtaReuniao) => {
    const subject = `Solicitação de Orçamento - ${ata.descricao}`;
    const text = generateShareMessage(ata);
    
    // Generate CSV items
    const items = ata.itensComprados
      .filter(item => {
        if (shareTeam === 'Todas') return true;
        const m = materiais.find(mat => mat.id === item.materialId);
        return m?.equipe === shareTeam;
      })
      .map(item => {
        const m = materiais.find(mat => mat.id === item.materialId);
        return {
          SAP: m?.sap,
          Equipe: m?.equipe || 'N/A',
          Descricao: m?.descricao,
          Quantidade: item.quantidade,
          Unidade: formatUnit(m?.unidade)
        };
      });

    const headers = ['COD SAP', 'Equipe', 'Descrição', 'Quantidade', 'Unidade'];
    const csvRows = [
      headers.join(';'),
      ...items.map(row => 
        [
          row.SAP,
          `"${row.Equipe}"`,
          `"${row.Descricao}"`,
          row.Quantidade,
          row.Unidade
        ].join(';')
      )
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n');
    const fileName = `Ata_${ata.descricao.replace(/\s+/g, '_')}.csv`;
    
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
        shareViaEmail(ata);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share API fallback:', err?.message || err);
        shareViaEmail(ata);
      }
    }
  };

  const downloadSpreadsheet = (ata: AtaReuniao) => {
    const items = ata.itensComprados
      .filter(item => {
        if (shareTeam === 'Todas') return true;
        const m = materiais.find(mat => mat.id === item.materialId);
        return m?.equipe === shareTeam;
      })
      .map(item => {
        const m = materiais.find(mat => mat.id === item.materialId);
        return {
          SAP: m?.sap,
          Equipe: m?.equipe || 'N/A',
          Descricao: m?.descricao,
          Quantidade: item.quantidade,
          Unidade: formatUnit(m?.unidade)
        };
      });

    const headers = ['COD SAP', 'Equipe', 'Descrição', 'Quantidade', 'Unidade'];
    const csvRows = [
      headers.join(';'),
      ...items.map(row => 
        [
          row.SAP,
          `"${row.Equipe}"`,
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
    link.setAttribute('download', `Ata_${ata.descricao.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="view-container">
      <div className="card !p-0 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-brand-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky top-0 z-30 bg-white shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider hidden sm:block">Histórico de Atas de Reunião</h3>
            <button 
              onClick={() => {
                if (selectedIds.length === filteredAtas.length) setSelectedIds([]);
                else setSelectedIds(filteredAtas.map(a => a.id));
              }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 flex items-center gap-2"
            >
              <Check className={`w-3.5 h-3.5 ${selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
              {selectedIds.length === filteredAtas.length && filteredAtas.length > 0 ? 'Desmarcar' : 'Selecionar Tudo'}
            </button>
            {selectedIds.length > 0 && (
              <button 
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir ({selectedIds.length})
              </button>
            )}
          </div>
          
          {/* Mês filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase font-extrabold text-slate-400">Filtrar por Mês:</span>
            <select
              className="p-1 px-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white cursor-pointer hover:border-slate-350 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">Todos os meses</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {formatMonthYear(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="scroll-container min-h-0 divide-y divide-slate-100">
          {filteredAtas.length === 0 ? (
            <div className="py-20 text-center text-slate-300 italic">
              {atas.length === 0 ? 'Nenhuma ata de reunião registrada.' : 'Nenhuma ata correspondente ao mês selecionado.'}
            </div>
          ) : (
            filteredAtas.map(ata => (
              <div key={ata.id} className="p-4 hover:bg-slate-50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-1"
                      checked={selectedIds.includes(ata.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (selectedIds.includes(ata.id)) {
                          setSelectedIds(prev => prev.filter(id => id !== ata.id));
                        } else {
                          setSelectedIds(prev => [...prev, ata.id]);
                        }
                      }}
                    />
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-[12px] font-bold text-slate-800">{ata.descricao}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3" />
                    {new Date(ata.data).toLocaleString('pt-BR')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                  {ata.orcamentosSnapshot?.map((snap, sIdx) => {
                    const isExceeded = (snap.saldoNovo || 0) < 0;
                    return (
                      <div key={`${ata.id}-snap-${sIdx}`} className={`p-2 rounded-xl border transition-all ${isExceeded ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tight truncate">{snap.equipe}</p>
                        <p className="text-[9px] text-slate-500 line-through">R$ {snap.saldoAnterior?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className={`text-[10px] font-bold ${isExceeded ? 'text-red-600' : 'text-emerald-600'}`}>
                          R$ {snap.saldoNovo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {isExceeded && (
                          <span className="text-[8.5px] font-black text-red-600 uppercase tracking-wider block mt-0.5" title="Gasto excedeu o limite deste centro de custo">
                            Estouro
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                   <p className="text-[11px] text-slate-500 font-medium font-semibold">
                      <span className="font-extrabold text-slate-700">{ata.itensComprados?.length || 0}</span> materiais aprovados para compra.
                   </p>
                   <div className="flex flex-wrap gap-2">
                     <button 
                       onClick={() => handleShare(ata)}
                       className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 transition-all uppercase tracking-tight active:scale-95 cursor-pointer select-none"
                     >
                       <Share2 className="w-3.5 h-3.5" />
                       Compartilhar
                     </button>
                     <button 
                       onClick={() => {
                         const itemMap: Record<string, number> = {};
                         ata.itensComprados.forEach(item => {
                           itemMap[item.materialId] = item.quantidade;
                         });
                         localStorage.setItem('selfMeeting_compras', JSON.stringify(itemMap));
                         localStorage.removeItem('selfMeeting_selectedTeam');
                         setView('reuniao-self');
                       }}
                       className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 transition-all uppercase tracking-tight active:scale-95 cursor-pointer select-none"
                     >
                       <ShoppingCart className="w-3.5 h-3.5" />
                       Abrir em Reunião
                     </button>
                     <button 
                       onClick={() => handleEditInit(ata)}
                       className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-all uppercase tracking-tight active:scale-95 cursor-pointer select-none"
                     >
                       <Edit3 className="w-3.5 h-3.5" />
                       Editar
                     </button>
                     <button 
                       onClick={() => {
                          setDeletionPasswordInput('');
                          setDeleteError('');
                          setAtaToDelete(ata);
                        }}
                       className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50/70 px-2.5 py-1.5 rounded-lg border border-red-100 hover:border-red-200 transition-all uppercase tracking-tight active:scale-95 cursor-pointer select-none"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                       Deletar
                     </button>
                     <button 
                       onClick={() => handleView(ata)}
                       className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 transition-all uppercase tracking-tight active:scale-95 cursor-pointer select-none"
                     >
                       <ExternalLink className="w-3.5 h-3.5" />
                       Visualizar Detalhes
                     </button>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Details / Share / Edit Modal */}
      {selectedAta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { if (!isEditing) setSelectedAta(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-blue" />
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    {isEditing ? 'Editar Reunião' : showShareOptions ? 'Compartilhar Reunião' : 'Detalhes da Reunião'}
                  </h3>
                </div>
                
                {isEditing && (
                  <button 
                    onClick={handleOpenInMeetingMode}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-100 transition-all border border-blue-200 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Abrir no Modo Dinâmico
                  </button>
                )}
              </div>
              <button onClick={() => setSelectedAta(null)} className="p-1 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {isEditing ? (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Título da Ata de Reunião</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Reunião de Alinhamento Semanal..."
                      className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all" 
                      value={editedDesc} 
                      onChange={(e) => setEditedDesc(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Data da Sessão</label>
                    <span className="w-full text-xs font-bold text-slate-500 border border-slate-200 rounded-lg p-2.5 bg-slate-100 inline-block font-sans">
                      {new Date(selectedAta.data).toLocaleString('pt-BR')} (original)
                    </span>
                  </div>

                  {/* Materials list */}
                  <div className="flex flex-col pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 pb-1 mb-3">Materiais Incluídos na Reunião</p>
                    <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                      {Object.keys(editedItens).sort((a,b) => {
                        const idxA = itensOrder.indexOf(a);
                        const idxB = itensOrder.indexOf(b);
                        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                      }).filter(matId => {
                        if (!editFilterTeam) return true;
                        const mat = materiais.find(m => m.id === matId);
                        return mat?.equipe === editFilterTeam;
                      }).map((matId) => {
                        const qty = editedItens[matId];
                        const mat = materiais.find(m => m.id === matId);
                        if (!mat) return null;
                        return (
                          <div key={matId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-150 transition-colors">
                            <div className="flex flex-col min-w-0 flex-1 mr-4">
                              <span className="text-xs font-bold text-slate-700 truncate">{mat.descricao}</span>
                              <span className="text-[9.5px] font-mono text-slate-400 font-semibold">COD SAP: {mat.sap} • Equipe: {mat.equipe}</span>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditedItens(prev => {
                                      const current = prev[matId] || 0;
                                      if (current <= 1) {
                                        const copy = { ...prev };
                                        delete copy[matId];
                                        return copy;
                                      }
                                      return { ...prev, [matId]: current - 1 };
                                    });
                                  }}
                                  className="p-0.5 px-2 bg-slate-50 hover:bg-slate-100 border-r border-slate-200 transition-colors text-slate-500 font-bold active:bg-slate-200 select-none cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  value={qty}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setEditedItens(prev => {
                                      if (val === 0) {
                                        const copy = { ...prev };
                                        delete copy[matId];
                                        return copy;
                                      }
                                      return { ...prev, [matId]: val };
                                    });
                                  }}
                                  className="w-10 text-center text-xs font-bold text-slate-700 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditedItens(prev => ({ ...prev, [matId]: (prev[matId] || 0) + 1 }));
                                  }}
                                  className="p-0.5 px-2 bg-slate-50 hover:bg-slate-100 border-l border-slate-200 transition-colors text-slate-500 font-bold active:bg-slate-200 select-none cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditedItens(prev => {
                                    const copy = { ...prev };
                                    delete copy[matId];
                                    return copy;
                                  });
                                }}
                                className="p-1 px-1.5 hover:bg-red-50 hover:text-red-600 rounded-md text-slate-400 transition-colors cursor-pointer"
                                title="Remover material"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(editedItens).length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs italic">
                          Nenhum material adicionado a esta reunião. Use a busca abaixo para adicionar.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add materials dropdown search */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Adicionar Material à Reunião</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Digite o COD SAP ou descrição para buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all"
                      />
                    </div>

                    {searchQuery.trim() !== '' && (
                      <div className="border border-slate-150 rounded-xl max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white shadow-lg animate-in slide-in-from-top-1 duration-150 relative z-10">
                        {materiais
                          .filter(m => {
                            const query = searchQuery.toLowerCase();
                            return m.descricao.toLowerCase().includes(query) || m.sap.toLowerCase().includes(query);
                          })
                          .map(m => {
                            const alreadyAdded = editedItens[m.id] !== undefined;
                            return (
                              <div key={m.id} className="p-2 px-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col min-w-0 flex-1 mr-4">
                                  <span className="font-bold text-slate-700 truncate">{m.descricao}</span>
                                  <span className="text-[10px] text-slate-400 font-mono font-semibold">COD SAP: {m.sap} • Equipe: {m.equipe}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditedItens(prev => {
                                      if (!prev[m.id]) {
                                        setItensOrder(order => [...order, m.id]);
                                      }
                                      return {
                                        ...prev,
                                        [m.id]: (prev[m.id] || 0) + 1
                                      };
                                    });
                                    setSearchQuery('');
                                  }}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer ${
                                    alreadyAdded
                                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                  }`}
                                >
                                  {alreadyAdded ? 'Adicionar +1' : 'Adicionar'}
                                </button>
                              </div>
                            );
                          })}
                        {materiais.filter(m => {
                          const query = searchQuery.toLowerCase();
                          return m.descricao.toLowerCase().includes(query) || m.sap.toLowerCase().includes(query);
                        }).length === 0 && (
                          <div className="p-3 text-center text-xs text-slate-400 italic">
                            Nenhum material correspondente encontrado.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Impact preview */}
                  <div className="pt-2 border-t border-slate-155 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Impacto Ajustado nos Orçamentos</p>
                      {editFilterTeam && (
                        <button 
                          onClick={() => setEditFilterTeam(null)}
                          className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase"
                        >
                          Ver Todos
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {equipes.map(e => {
                        const newImpact = editedImpactPerTeam[e.nome] || 0;
                        
                        const originalItemSpent = selectedAta.itensComprados
                          .filter(item => {
                            const m = materiais.find(mat => mat.id === item.materialId);
                            return m?.equipe === e.nome;
                          })
                          .reduce((sum, item) => sum + item.custoTotal, 0);

                        const refund = originalItemSpent;
                        const adjustedBalance = e.saldoAtualizado + refund - newImpact;
                        const isExceeded = adjustedBalance < 0;
                        const isSelected = editFilterTeam === e.nome;

                        return (
                          <div 
                            key={e.id} 
                            onClick={() => setEditFilterTeam(isSelected ? null : e.nome)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                              isSelected 
                                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30' 
                                : isExceeded 
                                  ? 'bg-red-50/60 border-red-100 hover:border-red-200' 
                                  : 'bg-slate-50 border-slate-150 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <p className="text-[9px] font-black text-black uppercase tracking-tight truncate">{e.nome}</p>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                            </div>
                            <div className="mt-1">
                              <span className="text-[9px] text-slate-400 block font-medium">Lançamento: <b className="text-slate-700">R$ {newImpact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></span>
                              <span className="text-[9px] text-slate-400 block font-medium">Saldo Futuro: <b className={`font-bold ${isExceeded ? 'text-red-600' : 'text-emerald-600'}`}>R$ {adjustedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></span>
                            </div>
                            {isExceeded && (
                              <span className="text-[8px] font-black text-red-600 uppercase tracking-widest block mt-1">
                                Estouro Potencial
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : showShareOptions ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Share2 className="w-8 h-8 text-brand-blue" />
                  </div>
                  <p className="text-sm text-slate-600 mb-8 font-semibold">Por qual meio você deseja compartilhar esta solicitação de orçamento?</p>
                  
                  <div className="mb-8 text-left max-w-md mx-auto">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Enviar de qual equipe?</label>
                    <div className="flex flex-wrap gap-2">
                       <button 
                         onClick={() => setShareTeam('Todas')}
                         className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer select-none ${
                            shareTeam === 'Todas' 
                            ? 'bg-slate-900 border-slate-900 text-white' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
                         }`}
                       >
                         TODAS
                       </button>
                       {equipes.map(e => (
                         <button 
                           key={e.id}
                           onClick={() => setShareTeam(e.nome)}
                           className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer select-none ${
                              shareTeam === e.nome 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
                           }`}
                         >
                           {e.nome.toUpperCase()}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button 
                      onClick={() => handleGlobalShare(selectedAta)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                        <Share2 className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-700">Compartilhar</span>
                    </button>

                    <button 
                      onClick={() => shareViaWhatsApp(selectedAta)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-emerald-200">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </div>
                      <span className="text-[9px] font-bold text-slate-700">WhatsApp</span>
                    </button>

                    <button 
                      onClick={() => initiateEmailShare(selectedAta)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-amber-50 hover:border-amber-200 transition-all group cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-amber-200">
                        <Mail className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-700">Email</span>
                    </button>
                    

                    
                    <button 
                      onClick={() => downloadSpreadsheet(selectedAta)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform relative shadow-lg shadow-emerald-200">
                        <Download className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-700">Planilha</span>
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setShowShareOptions(false)}
                    className="mt-8 text-xs font-bold text-brand-blue hover:underline bg-brand-blue/5 px-4 py-2 rounded-full cursor-pointer"
                  >
                    Ver detalhes da compra
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                     <p className="text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-1 mb-2 uppercase font-mono tracking-wider">Materiais Aprovados</p>
                     <div className="space-y-2">
                        {selectedAta.itensComprados?.map((item, idx) => {
                          const m = materiais.find(mat => mat.id === item.materialId);
                          return (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                               <div className="flex flex-col min-w-0">
                                 <span className="text-xs font-bold text-slate-700 truncate">{m?.descricao || 'Material não encontrado'}</span>
                                 <span className="text-[10px] font-mono text-slate-400 font-semibold font-sans">COD SAP: {m?.sap || 'N/A'}</span>
                               </div>
                               <div className="text-right shrink-0">
                                 <span className="text-xs font-bold text-brand-blue block">{item.quantidade} {formatUnit(m?.unidade)}</span>
                                 <span className="text-[10px] text-slate-500 italic font-mono font-semibold">R$ {item.custoTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                               </div>
                            </div>
                          );
                        })}
                     </div>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-4 text-white flex justify-between items-center shadow-lg shadow-slate-900/10">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Custo Total da Ata</p>
                      <p className="text-xl font-bold">R$ {selectedAta.itensComprados?.reduce((acc, curr) => acc + (curr.custoTotal || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <button 
                      onClick={() => setShowShareOptions(true)}
                      className="bg-brand-blue hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all shadow-lg shadow-brand-blue/20 cursor-pointer select-none active:scale-95"
                    >
                      <Share2 className="w-4 h-4" />
                      Compartilhar
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditedItens({});
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-extrabold transition-all uppercase tracking-tight cursor-pointer"
                  >
                    Voltar para Detalhes
                  </button>
                  <button 
                    onClick={handleSaveEditedAta}
                    disabled={Object.keys(editedItens).length === 0 || !editedDesc.trim()}
                    className={`px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-extrabold transition-all uppercase tracking-tight flex items-center gap-1.5 shadow-md cursor-pointer select-none active:scale-95 ${
                      (Object.keys(editedItens).length === 0 || !editedDesc.trim())
                        ? 'opacity-40 cursor-not-allowed shadow-none active:scale-100'
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleEditInit(selectedAta)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-extrabold transition-all uppercase tracking-tight flex items-center gap-1.5 cursor-pointer select-none active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar Reunião
                  </button>
                  <button 
                    onClick={() => setSelectedAta(null)}
                    className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-extrabold transition-all uppercase tracking-tight cursor-pointer select-none active:scale-95"
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Excluir em Massa</h3>
              <p className="text-sm text-slate-500 mt-2">
                Tem certeza que deseja excluir as <span className="font-bold text-slate-700">{selectedIds.length} atas selecionadas</span>? 
                Esta ação não poderá ser desfeita e irá estornar a verba aos orçamentos afetados.
              </p>
              
              <div className="w-full mt-4 text-left">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Sua Senha de Acesso</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Digite sua senha para autorizar"
                  value={deletionPasswordInput}
                  onChange={(e) => {
                    setDeletionPasswordInput(e.target.value);
                    if (deleteError) setDeleteError('');
                  }}
                  autoFocus
                />
                {deleteError && (
                  <p className="text-[11px] text-red-600 font-bold mt-1.5">{deleteError}</p>
                )}
              </div>
              
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setIsBulkDeleteModalOpen(false);
                  setDeleteError('');
                  setDeletionPasswordInput('');
                }}
                className="flex-1 btn-secondary cursor-pointer h-10 text-[11px] font-bold uppercase tracking-wider rounded-xl border border-slate-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmBulkDelete}
                className="flex-1 bg-red-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 hover:bg-red-700 transition-all shadow-sm cursor-pointer"
              >
                Excluir Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {ataToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setAtaToDelete(null); setDeletionPasswordInput(''); setDeleteError(''); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100 flex flex-col p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Deletar Reunião</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase font-mono mt-0.5">ID: {ataToDelete.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Você tem certeza de que deseja deletar a reunião <span className="font-bold text-slate-800">"{ataToDelete.descricao}"</span>?
            </p>
            <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed">
              <b>Nota:</b> Esta ação irá estornar a verba de <b>R$ {ataToDelete.itensComprados.reduce((acc, curr) => acc + curr.custoTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> de volta para os orçamentos das respectivas equipes, atualizará o estoque dos {ataToDelete.itensComprados.length} materiais retirados e removerá as movimentações correspondentes do histórico!
            </p>

            <div className="w-full text-left">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Sua Senha de Acesso</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Digite sua senha para autorizar"
                value={deletionPasswordInput}
                onChange={(e) => {
                  setDeletionPasswordInput(e.target.value);
                  if (deleteError) setDeleteError('');
                }}
                autoFocus
              />
              {deleteError && (
                <p className="text-[11px] text-red-600 font-bold mt-1.5">{deleteError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setAtaToDelete(null); setDeletionPasswordInput(''); setDeleteError(''); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer hover:border-slate-350"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReuniao(ataToDelete)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-red-200 active:scale-95 select-none"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {isEmailChoiceModalOpen && selectedAta && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4">Escolha seu provedor</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                  onClick={(e) => shareViaEmailChoice(e, selectedAta, 'gmail')}
                  className="p-4 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 text-center font-bold text-sm text-slate-700"
                >
                  Gmail
                </button>
                <button 
                  onClick={(e) => shareViaEmailChoice(e, selectedAta, 'outlook')}
                  className="p-4 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-center font-bold text-sm text-slate-700"
                >
                  Outlook
                </button>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsEmailChoiceModalOpen(false); }}
                className="w-full mt-4 p-2 text-slate-400 text-sm font-bold"
              >
                Cancelar
              </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
