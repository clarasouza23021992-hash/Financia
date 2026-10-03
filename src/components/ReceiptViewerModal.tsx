import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Download, Share2, FileText, CheckCircle2, Calendar, 
  User, Images, Search, ChevronLeft, ChevronRight, 
  Maximize2, Eye, Tag, DollarSign, Check, ExternalLink,
  Receipt, ArrowRight, ShieldCheck, Filter, ZoomIn, 
  Sparkles, Layers, Image as ImageIcon
} from 'lucide-react';
import { Bill } from '../types/finance';

interface ReceiptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  monthBills?: Bill[];
  selectedMonthLabel?: string;
  initialView?: 'single' | 'gallery';
  onSelectBill?: (bill: Bill) => void;
}

export const isImageReceipt = (bill: Bill | null): boolean => {
  if (!bill || !bill.receiptUrl) return false;
  const url = bill.receiptUrl.toLowerCase();
  const name = (bill.receiptName || '').toLowerCase();
  if (url.startsWith('data:image')) return true;
  if (url.startsWith('blob:') && (bill.receiptType?.startsWith('image') || !name.endsWith('.pdf'))) return true;
  if (url.match(/\.(jpg|jpeg|png|webp|gif|bmp|heic|avif)($|\?)/i)) return true;
  if (name.match(/\.(jpg|jpeg|png|webp|gif|bmp|heic|avif)$/i)) return true;
  if (url.startsWith('data:') && !url.includes('pdf')) return true;
  if (!url.endsWith('.pdf') && !name.endsWith('.pdf') && !url.includes('application/pdf')) return true;
  return false;
};

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  isOpen,
  onClose,
  bill,
  monthBills = [],
  selectedMonthLabel = 'Mês Selecionado',
  initialView = 'single',
  onSelectBill,
}) => {
  // Aggregate all bills with attached receipts for the current month
  const billsWithReceipts = useMemo(() => {
    const list = monthBills.filter(b => Boolean(b.receiptUrl));
    // If a specific bill was passed and isn't already in list, include it
    if (bill && !list.some(b => b.id === bill.id)) {
      return [bill, ...list];
    }
    return list;
  }, [monthBills, bill]);

  // Aggregate specifically image receipts for quick scrolling through proof of payments
  const imageBills = useMemo(() => {
    return billsWithReceipts.filter(b => isImageReceipt(b));
  }, [billsWithReceipts]);

  // View mode: 'single' (focused detail) or 'gallery' (all month receipts gallery view)
  const [viewMode, setViewMode] = useState<'single' | 'gallery'>(() => {
    if (initialView === 'gallery' || !bill) return 'gallery';
    return 'single';
  });

  // Currently active bill in single viewer
  const [activeBillId, setActiveBillId] = useState<string>(() => {
    return bill?.id || billsWithReceipts[0]?.id || '';
  });

  // Gallery filters and search
  const [gallerySearch, setGallerySearch] = useState('');
  const [galleryTypeFilter, setGalleryTypeFilter] = useState<'all' | 'images' | 'documents'>('images');
  const [galleryStatusFilter, setGalleryStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  // Fullscreen image zoom overlay with carousel cycling
  const [fullscreenBillId, setFullscreenBillId] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  // Horizontal reel filmstrip ref for smooth arrow navigation
  const filmstripRef = useRef<HTMLDivElement>(null);

  // Sync state when modal opens or bill prop changes
  useEffect(() => {
    if (isOpen) {
      if (initialView === 'gallery' || (!bill && billsWithReceipts.length > 0)) {
        setViewMode('gallery');
      } else {
        setViewMode('single');
      }
      if (bill) {
        setActiveBillId(bill.id);
      } else if (billsWithReceipts.length > 0) {
        setActiveBillId(billsWithReceipts[0].id);
      }
      setGallerySearch('');
      setFullscreenBillId(null);
      setCopiedNotice(null);
    }
  }, [isOpen, bill, initialView]);

  // Active bill object
  const currentBill = useMemo(() => {
    return billsWithReceipts.find(b => b.id === activeBillId) || bill || billsWithReceipts[0] || null;
  }, [billsWithReceipts, activeBillId, bill]);

  // Current index for single navigation
  const currentIndex = useMemo(() => {
    if (!currentBill) return -1;
    return billsWithReceipts.findIndex(b => b.id === currentBill.id);
  }, [billsWithReceipts, currentBill]);

  // Fullscreen active bill
  const fullscreenBill = useMemo(() => {
    if (!fullscreenBillId) return null;
    return billsWithReceipts.find(b => b.id === fullscreenBillId) || null;
  }, [billsWithReceipts, fullscreenBillId]);

  // Fullscreen index among image bills (for quick cycling in lightbox)
  const fullscreenIndex = useMemo(() => {
    if (!fullscreenBill) return -1;
    return imageBills.findIndex(b => b.id === fullscreenBill.id);
  }, [imageBills, fullscreenBill]);

  // Handlers for cycling in fullscreen lightbox
  const handlePrevFullscreenImage = () => {
    if (imageBills.length <= 1 || fullscreenIndex < 0) return;
    const prevIdx = (fullscreenIndex - 1 + imageBills.length) % imageBills.length;
    setFullscreenBillId(imageBills[prevIdx].id);
  };

  const handleNextFullscreenImage = () => {
    if (imageBills.length <= 1 || fullscreenIndex < 0) return;
    const nextIdx = (fullscreenIndex + 1) % imageBills.length;
    setFullscreenBillId(imageBills[nextIdx].id);
  };

  // Keyboard navigation for quick browsing
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullscreenBillId) {
        if (e.key === 'Escape') {
          setFullscreenBillId(null);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          handleNextFullscreenImage();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          handlePrevFullscreenImage();
        }
        return;
      }
      if (e.key === 'Escape') {
        onClose();
      } else if (viewMode === 'single' && billsWithReceipts.length > 1) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          handleNextReceipt();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          handlePrevReceipt();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, viewMode, currentIndex, billsWithReceipts.length, fullscreenBillId, fullscreenIndex, imageBills.length]);

  if (!isOpen) return null;

  // Handlers for cycling receipts in single view
  const handlePrevReceipt = () => {
    if (billsWithReceipts.length <= 1 || currentIndex <= 0) {
      const last = billsWithReceipts[billsWithReceipts.length - 1];
      if (last) setActiveBillId(last.id);
      return;
    }
    const prev = billsWithReceipts[currentIndex - 1];
    if (prev) setActiveBillId(prev.id);
  };

  const handleNextReceipt = () => {
    if (billsWithReceipts.length <= 1 || currentIndex >= billsWithReceipts.length - 1) {
      const first = billsWithReceipts[0];
      if (first) setActiveBillId(first.id);
      return;
    }
    const next = billsWithReceipts[currentIndex + 1];
    if (next) setActiveBillId(next.id);
  };

  const handleScrollFilmstrip = (direction: 'left' | 'right') => {
    if (!filmstripRef.current) return;
    const scrollAmount = direction === 'left' ? -260 : 260;
    filmstripRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleDownload = (targetBill: Bill | null) => {
    const b = targetBill || currentBill;
    if (!b) return;

    if (b.receiptUrl) {
      const link = document.createElement('a');
      link.href = b.receiptUrl;
      const cleanName = (b.name || 'Conta').replace(/\s+/g, '_');
      link.download = b.receiptName || `Comprovante_${cleanName}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const text = `COMPROVANTE DE PAGAMENTO\n\nConta: ${b.name}\nValor: R$ ${b.amount.toFixed(2)}\nVencimento: ${b.dueDate}\nStatus: ${b.status}\nFavorecido: ${b.favored}\nCódigo: ${b.barcode || 'N/A'}\nChave Pix: ${b.pixKey || 'N/A'}\nData de Autenticação: ${new Date().toLocaleString('pt-BR')}`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Comprovante_${b.name.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleShare = (targetBill: Bill | null) => {
    const b = targetBill || currentBill;
    if (!b) return;

    const formattedAmount = `R$ ${b.amount.toFixed(2).replace('.', ',')}`;
    const statusText = b.status === 'paid' ? 'Pago ✅' : 'Agendado / Pendente ⏳';
    const paidByText = b.paidBy ? ` (por ${b.paidBy})` : '';
    const text = `🧾 *Comprovante das Finanças da Nossa Casa*\n\n` +
      `• *Conta:* ${b.name}\n` +
      `• *Valor:* ${formattedAmount}\n` +
      `• *Vencimento:* ${b.dueDate.split('-').reverse().join('/')}\n` +
      `• *Status:* ${statusText}${paidByText}\n` +
      `• *Favorecido:* ${b.favored || 'Não informado'}\n` +
      (b.receiptName ? `• *Arquivo Anexo:* ${b.receiptName}\n` : '') +
      `\nComprovante registrado no app Finanças da Minha Casa.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: `Comprovante: ${b.name}`, text }).catch(() => {});
    } else {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopiedNotice('Texto do comprovante copiado com sucesso!');
        setTimeout(() => setCopiedNotice(null), 3500);
      }
    }
  };

  // Filtered receipts in gallery view
  const filteredGalleryBills = billsWithReceipts.filter(b => {
    const matchesSearch = !gallerySearch.trim() || 
      b.name.toLowerCase().includes(gallerySearch.toLowerCase()) ||
      b.favored.toLowerCase().includes(gallerySearch.toLowerCase()) ||
      (b.paidBy || '').toLowerCase().includes(gallerySearch.toLowerCase()) ||
      b.category.toLowerCase().includes(gallerySearch.toLowerCase());

    if (!matchesSearch) return false;

    if (galleryStatusFilter === 'paid' && b.status !== 'paid') return false;
    if (galleryStatusFilter === 'pending' && b.status === 'paid') return false;

    if (galleryTypeFilter === 'images') {
      return isImageReceipt(b);
    }
    if (galleryTypeFilter === 'documents') {
      return !isImageReceipt(b);
    }
    return true;
  });

  const totalReceiptsAmount = billsWithReceipts.reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalImageCount = imageBills.length;
  const totalPaidReceipts = billsWithReceipts.filter(b => b.status === 'paid').length;
  const isCurrentAnImage = isImageReceipt(currentBill);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`bg-white dark:bg-[#0E172F] w-full rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto transition-all ${
          viewMode === 'gallery' ? 'max-w-3xl max-h-[min(94dvh,calc(100vh-1.5rem))]' : 'max-w-lg max-h-[min(94dvh,calc(100vh-1.5rem))]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title & View Switcher Tabs */}
        <div className="bg-[#0A1128] text-white px-4 sm:px-5 py-3.5 flex items-center justify-between flex-shrink-0 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-[#00C49F] flex items-center justify-center font-bold flex-shrink-0">
              {viewMode === 'gallery' ? <Images className="w-4.5 h-4.5" /> : <FileText className="w-4.5 h-4.5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold tracking-tight truncate flex items-center gap-1.5">
                <span>{viewMode === 'gallery' ? 'Galeria de Comprovantes' : (currentBill ? currentBill.name : 'Comprovante')}</span>
              </h2>
              <p className="text-[10.5px] text-slate-400 truncate flex items-center gap-1.5">
                <span>{selectedMonthLabel}</span>
                <span>•</span>
                <span className="text-teal-400 font-semibold">{billsWithReceipts.length} com comprovante</span>
                {totalImageCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-300 font-semibold">{totalImageCount} imagens</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View Mode Switcher Pills */}
            <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => setViewMode('gallery')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'gallery'
                    ? 'bg-[#00C49F] text-[#0A1128] shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Ver Galeria de Comprovantes do Mês"
              >
                <Images className="w-3.5 h-3.5" />
                <span>Galeria</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/20 font-black">
                  {billsWithReceipts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentBill) setViewMode('single');
                }}
                disabled={!currentBill}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 ${
                  viewMode === 'single'
                    ? 'bg-[#00C49F] text-[#0A1128] shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Ver Comprovante Detalhado"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Individual</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback notice toast */}
        {copiedNotice && (
          <div className="mx-4 mt-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{copiedNotice}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 1: RECEIPTS GALLERY (Aggregates all month proof images)    */}
        {/* ============================================================== */}
        {viewMode === 'gallery' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Gallery Top Filter & Summary Bar */}
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 space-y-2.5 flex-shrink-0">
              {/* Stats overview ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 font-extrabold flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-[#00C49F]" />
                    <span>{billsWithReceipts.length} Comprovantes em {selectedMonthLabel}</span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">
                    Total: <strong className="text-slate-900 dark:text-white font-mono">R$ {totalReceiptsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </span>
                </div>

                {/* Filter Pills: Images / All / Status */}
                <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setGalleryTypeFilter('images')}
                    className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                      galleryTypeFilter === 'images'
                        ? 'bg-slate-900 dark:bg-[#00C49F] text-white dark:text-[#0A1128] border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>Imagens / Fotos ({totalImageCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryTypeFilter('all')}
                    className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                      galleryTypeFilter === 'all'
                        ? 'bg-slate-900 dark:bg-[#00C49F] text-white dark:text-[#0A1128] border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Todos ({billsWithReceipts.length})</span>
                  </button>

                  {/* Status Toggle */}
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setGalleryStatusFilter(prev => prev === 'paid' ? 'all' : 'paid')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      galleryStatusFilter === 'paid'
                        ? 'bg-emerald-600 text-white border-transparent'
                        : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                    }`}
                  >
                    Pagas ({totalPaidReceipts})
                  </button>
                </div>
              </div>

              {/* Search input */}
              {billsWithReceipts.length > 1 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={gallerySearch}
                    onChange={(e) => setGallerySearch(e.target.value)}
                    placeholder="Pesquisar comprovante por conta, favorecido ou pagador..."
                    className="w-full pl-9 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {gallerySearch && (
                    <button
                      type="button"
                      onClick={() => setGallerySearch('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick-Scroll Horizontal Filmstrip (Carousel) for instant touch / click sliding */}
            {imageBills.length > 0 && (
              <div className="bg-slate-100 dark:bg-slate-950/80 px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Images className="w-3.5 h-3.5 text-[#00C49F]" />
                    <span>Deslize Rápido dos Comprovantes ({imageBills.length})</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleScrollFilmstrip('left')}
                      className="p-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Rolar para a esquerda"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScrollFilmstrip('right')}
                      className="p-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Rolar para a direita"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div 
                  ref={filmstripRef}
                  className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth pb-1 pt-0.5"
                >
                  {imageBills.map((b) => {
                    const isSelected = currentBill?.id === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setFullscreenBillId(b.id);
                        }}
                        className={`group relative flex-shrink-0 w-28 sm:w-32 rounded-xl overflow-hidden border transition-all text-left bg-white dark:bg-slate-900 p-1 cursor-pointer active-press ${
                          isSelected
                            ? 'ring-2 ring-[#00C49F] border-transparent shadow-md'
                            : 'border-slate-200 dark:border-slate-800 hover:border-teal-500 shadow-2xs'
                        }`}
                      >
                        <div className="w-full h-18 rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center relative">
                          <img
                            src={b.receiptUrl}
                            alt={b.name}
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="p-1 rounded-full bg-black/60 text-white">
                              <ZoomIn className="w-3.5 h-3.5 text-[#00C49F]" />
                            </span>
                          </div>
                          <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-white font-mono text-[8px] font-bold">
                            R$ {Math.round(b.amount)}
                          </span>
                        </div>
                        <div className="mt-1 px-0.5 truncate">
                          <p className="text-[10.5px] font-bold text-slate-900 dark:text-white truncate">
                            {b.name}
                          </p>
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                            {b.status === 'paid' ? '✓ Pago' : 'Agendado'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gallery Grid / Vertical Cards Feed */}
            <div className="p-3 sm:p-5 overflow-y-auto flex-1 min-h-0 overscroll-contain space-y-4">
              {billsWithReceipts.length === 0 ? (
                /* Empty state when 0 receipts in the month */
                <div className="py-12 px-4 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-800 my-4 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-inner">
                    <Images className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Nenhum comprovante anexado em {selectedMonthLabel}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Ao cadastrar ou pagar contas, você pode anexar fotos, prints do banco ou PDFs. Todos os comprovantes deste mês ficarão organizados nesta galeria para rolagem rápida.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl active-press transition-colors cursor-pointer"
                  >
                    Voltar para Contas do Mês
                  </button>
                </div>
              ) : filteredGalleryBills.length === 0 ? (
                /* Empty filter result */
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <Search className="w-6 h-6 mx-auto opacity-50" />
                  <p>Nenhum comprovante encontrado para os filtros selecionados.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setGallerySearch('');
                      setGalleryTypeFilter('all');
                      setGalleryStatusFilter('all');
                    }}
                    className="text-teal-600 dark:text-teal-400 font-bold underline cursor-pointer"
                  >
                    Limpar filtros de pesquisa
                  </button>
                </div>
              ) : (
                /* Gallery Grid of Cards */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredGalleryBills.map((b) => {
                    const isImg = isImageReceipt(b);
                    const formattedDate = b.dueDate.split('-').reverse().join('/');
                    const paidDate = b.paidAt ? new Date(b.paidAt).toLocaleDateString('pt-BR') : null;

                    return (
                      <div
                        key={b.id}
                        className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-shadow"
                      >
                        {/* Card Header */}
                        <div className="p-3 bg-white dark:bg-[#10182F] border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                              {b.name}
                            </span>
                            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate block">
                              {b.favored || b.category}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 block font-mono">
                              R$ {b.amount.toFixed(2).replace('.', ',')}
                            </span>
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                              b.status === 'paid'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            }`}>
                              {b.status === 'paid' ? 'Pago ✓' : 'Pendente'}
                            </span>
                          </div>
                        </div>

                        {/* Card Image / Document Display */}
                        <div 
                          onClick={() => {
                            if (isImg && b.receiptUrl) {
                              setFullscreenBillId(b.id);
                            } else {
                              setActiveBillId(b.id);
                              setViewMode('single');
                            }
                          }}
                          className="relative bg-slate-950 p-2 flex items-center justify-center min-h-[170px] max-h-[230px] cursor-pointer group overflow-hidden"
                          title="Clique para ampliar o comprovante"
                        >
                          {isImg ? (
                            <>
                              <img
                                src={b.receiptUrl}
                                alt={b.name}
                                className="max-h-[210px] w-auto max-w-full object-contain rounded-lg shadow-sm group-hover:scale-102 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                                <span className="px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-sm text-xs font-bold flex items-center gap-1.5 shadow-md">
                                  <Maximize2 className="w-3.5 h-3.5 text-[#00C49F]" />
                                  <span>Ampliar Comprovante</span>
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-4">
                              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5">
                                <FileText className="w-6 h-6" />
                              </div>
                              <span className="text-xs font-bold text-slate-200 truncate max-w-[200px]">
                                {b.receiptName || 'Documento PDF'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {b.receiptSize || 'Anexo Oficial'}
                              </span>
                            </div>
                          )}

                          {/* Top-right zoom button */}
                          {isImg && b.receiptUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFullscreenBillId(b.id);
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors cursor-pointer"
                              title="Tela cheia"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Card Info & Action Bar */}
                        <div className="p-2.5 bg-white dark:bg-[#10182F] border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px]">
                          <div className="min-w-0 text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 font-medium truncate">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Venc: {formattedDate}</span>
                              {paidDate && <span className="text-emerald-600 dark:text-emerald-400">• Pago {paidDate}</span>}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBillId(b.id);
                                setViewMode('single');
                              }}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Ver Detalhes do Comprovante"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(b)}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Baixar Arquivo"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShare(b)}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Compartilhar no WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: SINGLE RECEIPT VIEW (Focused inspection + arrows)       */}
        {/* ============================================================== */}
        {viewMode === 'single' && currentBill && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Cycle navigation ribbon if multiple receipts exist */}
            {billsWithReceipts.length > 1 && (
              <div className="bg-slate-100 dark:bg-slate-900/90 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs flex-shrink-0">
                <button
                  type="button"
                  onClick={handlePrevReceipt}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1 active-press transition-colors shadow-2xs cursor-pointer"
                  title="Comprovante anterior (Seta esquerda)"
                >
                  <ChevronLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    Comprovante {currentIndex + 1} de {billsWithReceipts.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewMode('gallery')}
                    className="text-[11px] text-teal-600 dark:text-teal-400 font-bold underline hover:opacity-80 ml-1 cursor-pointer flex items-center gap-1"
                  >
                    <Images className="w-3 h-3" />
                    <span>Ver Galeria</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleNextReceipt}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1 active-press transition-colors shadow-2xs cursor-pointer"
                  title="Próximo comprovante (Seta direita)"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </button>
              </div>
            )}

            {/* Single Content Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {/* Bill summary card */}
              <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="min-w-0">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate block">
                      {currentBill.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                      {currentBill.category} • {currentBill.favored || 'Favorecido não informado'}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block font-mono">
                      R$ {currentBill.amount.toFixed(2).replace('.', ',')}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                      currentBill.status === 'paid'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                    }`}>
                      {currentBill.status === 'paid' ? 'Pago ✓' : 'Pendente'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Vencimento: {currentBill.dueDate.split('-').reverse().join('/')}</span>
                  </span>
                  {currentBill.paidBy && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <User className="w-3 h-3 text-teal-500" />
                        <span>Pago por: {currentBill.paidBy}</span>
                      </span>
                    </>
                  )}
                  {currentBill.receiptName && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[150px] font-mono text-[10.5px]">
                        {currentBill.receiptName}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Receipt View Area with quick floating arrows */}
              <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-950 p-3 sm:p-4 flex flex-col items-center justify-center min-h-[240px] max-h-[420px] overflow-hidden group">
                {isCurrentAnImage ? (
                  <div className="relative max-h-full max-w-full flex items-center justify-center">
                    <img
                      src={currentBill.receiptUrl}
                      alt={currentBill.name}
                      onClick={() => setFullscreenBillId(currentBill.id)}
                      className="max-h-[380px] w-auto max-w-full object-contain rounded-lg shadow-md cursor-pointer hover:opacity-95 transition-opacity"
                      title="Toque para abrir em tela cheia / zoom"
                    />
                    <button
                      type="button"
                      onClick={() => setFullscreenBillId(currentBill.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors cursor-pointer"
                      title="Ampliar em tela cheia"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center p-6 space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-100">
                      {currentBill.receiptName || 'Comprovante_Oficial_Pagamento.pdf'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {currentBill.receiptSize || 'Documento Anexado'} • Autenticado
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Comprovante Válido &amp; Registrado</span>
                    </div>
                  </div>
                )}

                {/* Floating Left / Right cycle arrows on desktop / tablet */}
                {billsWithReceipts.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevReceipt}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-sm opacity-80 group-hover:opacity-100 transition-all cursor-pointer shadow-md"
                      title="Comprovante anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextReceipt}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-sm opacity-80 group-hover:opacity-100 transition-all cursor-pointer shadow-md"
                      title="Próximo comprovante"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Action Buttons for active bill */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownload(currentBill)}
                  className="flex-1 py-3 px-4 bg-[#00C49F] hover:bg-[#00b290] text-[#0A1128] font-black text-xs sm:text-sm rounded-xl active-press flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Comprovante</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(currentBill)}
                  className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl active-press flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Compartilhar no WhatsApp"
                >
                  <Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Compartilhar</span>
                </button>
              </div>

              {/* Bottom Thumbnail Strip in Single View */}
              {billsWithReceipts.length > 1 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Todos os comprovantes do mês:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {billsWithReceipts.map((b, idx) => {
                      const isImg = isImageReceipt(b);
                      const isSelected = b.id === currentBill.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setActiveBillId(b.id)}
                          className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border transition-all relative ${
                            isSelected
                              ? 'ring-2 ring-[#00C49F] border-transparent shadow-xs'
                              : 'opacity-60 hover:opacity-100 border-slate-300 dark:border-slate-700'
                          }`}
                          title={`${b.name} (R$ ${b.amount.toFixed(2)})`}
                        >
                          {isImg ? (
                            <img src={b.receiptUrl} alt={b.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-teal-400 text-[8px] font-bold">
                              PDF
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 bg-black/70 text-[8px] text-white px-0.5 font-bold">
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Pinned Footer */}
        <div className="flex-shrink-0 p-3 bg-slate-50 dark:bg-[#0c142b] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs z-20">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-[#00C49F]" />
            <span>Comprovantes protegidos &amp; sincronizados com a Nuvem</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Fullscreen Lightbox Image Zoom with Quick Carousel Cycling */}
      {fullscreenBill && fullscreenBill.receiptUrl && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-between p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setFullscreenBillId(null)}
        >
          {/* Top Info Bar */}
          <div 
            className="w-full max-w-4xl flex items-center justify-between text-white p-2 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold truncate">
                  {fullscreenBill.name}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  fullscreenBill.status === 'paid' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {fullscreenBill.status === 'paid' ? 'Pago' : 'Pendente'}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                R$ {fullscreenBill.amount.toFixed(2).replace('.', ',')} • Venc: {fullscreenBill.dueDate.split('-').reverse().join('/')}
                {imageBills.length > 1 && (
                  <span className="text-teal-400 font-bold ml-2">
                    ({fullscreenIndex + 1} de {imageBills.length} fotos)
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleDownload(fullscreenBill)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Baixar imagem"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleShare(fullscreenBill)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Compartilhar"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setFullscreenBillId(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Fechar tela cheia"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image Container with Quick Cycle Arrows */}
          <div 
            className="relative flex-1 w-full max-w-4xl flex items-center justify-center p-2 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {imageBills.length > 1 && (
              <button
                type="button"
                onClick={handlePrevFullscreenImage}
                className="absolute left-2 sm:left-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg active-press"
                title="Comprovante anterior (Seta esquerda)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={fullscreenBill.receiptUrl}
              alt={fullscreenBill.name}
              className="max-h-[72vh] max-w-[92vw] object-contain rounded-xl shadow-2xl transition-all"
            />

            {imageBills.length > 1 && (
              <button
                type="button"
                onClick={handleNextFullscreenImage}
                className="absolute right-2 sm:right-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg active-press"
                title="Próximo comprovante (Seta direita)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip for Quick Switching */}
          {imageBills.length > 1 && (
            <div 
              className="w-full max-w-2xl px-4 py-2 bg-black/60 backdrop-blur-md rounded-2xl flex items-center justify-center gap-2 overflow-x-auto no-scrollbar z-20"
              onClick={(e) => e.stopPropagation()}
            >
              {imageBills.map((imgB, idx) => (
                <button
                  key={imgB.id}
                  type="button"
                  onClick={() => setFullscreenBillId(imgB.id)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                    imgB.id === fullscreenBill.id 
                      ? 'border-[#00C49F] scale-105 shadow-md' 
                      : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                  title={imgB.name}
                >
                  <img src={imgB.receiptUrl} alt={imgB.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
