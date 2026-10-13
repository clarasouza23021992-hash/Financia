import React, { useState, useRef, useId } from 'react';
import { 
  X, MessageCircle, Share2, Copy, Download, Check, Sparkles, 
  TrendingUp, CheckCircle2, Clock, Wallet, Heart, ShieldCheck, 
  ChevronRight, Award, Trophy, Eye, EyeOff
} from 'lucide-react';
import { Bill, Revenue, UserProfile } from '../types/finance';

interface WhatsAppSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  selectedMonthId: string;
  bills: Bill[];
  revenues: Revenue[];
  profiles: UserProfile[];
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

export const WhatsAppSummaryModal: React.FC<WhatsAppSummaryModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  bills,
  revenues,
  profiles,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'text'>('card');
  const [includeRevenue, setIncludeRevenue] = useState(true);
  const [includeSpouseSplit, setIncludeSpouseSplit] = useState(true);
  const [includeLoveNote, setIncludeLoveNote] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const cardPreviewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardGradientId = useId();

  if (!isOpen) return null;

  // Filter valid bills
  const validBills = bills.filter(b => {
    if (b.category === 'Salário & Renda') return false;
    const lower = (b.name || '').toLowerCase();
    if (lower.includes('salário') || lower.includes('salario')) return false;
    if (b.id && b.id.startsWith('bill-migrated-')) return false;
    if (b.notes && b.notes.includes('Transferido automaticamente para Dívidas')) return false;
    return true;
  });

  const totalBillsAmount = validBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalBillsCount = validBills.length;

  const paidBills = validBills.filter(b => b.status === 'paid');
  const paidAmount = paidBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const paidCount = paidBills.length;

  const pendingBills = validBills.filter(b => b.status !== 'paid');
  const pendingAmount = Math.max(0, totalBillsAmount - paidAmount);
  const pendingCount = pendingBills.length;

  const totalRevenueAmount = revenues.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const balance = totalRevenueAmount - totalBillsAmount;

  const paidPercentage = totalBillsCount > 0 ? Math.round((paidCount / totalBillsCount) * 100) : 0;
  const paidAmountPercentage = totalBillsAmount > 0 ? Math.round((paidAmount / totalBillsAmount) * 100) : 0;

  // Couple names
  const partner1 = profiles[0]?.name || 'Você';
  const partner2 = profiles[1]?.name || 'Esposa';
  const coupleTitle = `${partner1} & ${partner2}`;

  // Breakdown by partner
  const paidByPartner1 = paidBills.filter(b => (b.paidBy || '').toLowerCase() === partner1.toLowerCase())
    .reduce((acc, b) => acc + b.amount, 0);
  const paidByPartner2 = paidBills.filter(b => (b.paidBy || '').toLowerCase() === partner2.toLowerCase())
    .reduce((acc, b) => acc + b.amount, 0);

  // Top 3 categories
  const categoryTotals: Record<string, number> = {};
  validBills.forEach(b => {
    const cat = b.category || 'Outros';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + b.amount;
  });
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const formatBRL = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Generate WhatsApp formatted text
  const generateWhatsAppMessage = () => {
    let msg = `✨ *RETROSPECTIVA FINANCEIRA DO CASAL* ✨\n`;
    msg += `📅 *${selectedMonth}* — ${coupleTitle}\n`;
    msg += `────────────────────────────\n\n`;

    if (paidPercentage === 100) {
      msg += `🏆 *100% DAS CONTAS QUITADAS!* 🎉\nParabéns! Zeramos absolutamente tudo neste mês!\n\n`;
    } else {
      msg += `📊 *Progresso de Quitação:* ${paidPercentage}% concluído (${paidCount}/${totalBillsCount} contas pagas)\n\n`;
    }

    if (includeRevenue && totalRevenueAmount > 0) {
      msg += `💰 *Renda do Casal:* ${formatBRL(totalRevenueAmount)}\n`;
    }
    msg += `💳 *Total em Contas:* ${formatBRL(totalBillsAmount)}\n`;
    msg += `✅ *Já Pago:* ${formatBRL(paidAmount)} (${paidCount} ${paidCount === 1 ? 'conta' : 'contas'})\n`;
    
    if (pendingCount > 0) {
      msg += `⏳ *Restante a Pagar:* ${formatBRL(pendingAmount)} (${pendingCount} ${pendingCount === 1 ? 'pendência' : 'pendências'})\n`;
    } else {
      msg += `✅ *Restante a Pagar:* R$ 0,00 (Tudo em dia!)\n`;
    }

    if (includeRevenue && totalRevenueAmount > 0) {
      if (balance >= 0) {
        msg += `🟢 *Sobra Prevista:* ${formatBRL(balance)} ✨\n`;
      } else {
        msg += `⚠️ *Atenção ao Saldo:* ${formatBRL(balance)}\n`;
      }
    }

    if (includeSpouseSplit && (paidByPartner1 > 0 || paidByPartner2 > 0)) {
      msg += `\n👥 *Quem já pagou contas este mês:*\n`;
      if (paidByPartner1 > 0) msg += `  • ${partner1}: ${formatBRL(paidByPartner1)}\n`;
      if (paidByPartner2 > 0) msg += `  • ${partner2}: ${formatBRL(paidByPartner2)}\n`;
    }

    if (topCategories.length > 0) {
      msg += `\n🏷️ *Top Despesas do Mês:*\n`;
      topCategories.forEach(([cat, val], idx) => {
        msg += `  ${idx + 1}. ${cat}: ${formatBRL(val)}\n`;
      });
    }

    if (includeLoveNote) {
      msg += `\n❤️ *Nossa Parceria:*\n`;
      msg += `_Mais um mês cuidando do nosso futuro juntos com carinho, transparência e disciplina!_\n`;
    }

    msg += `\n📱 _Gerado pelo app Finanças da Minha Casa_`;
    return msg;
  };

  const handleCopyText = async () => {
    try {
      const text = generateWhatsAppMessage();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (onShowToast) onShowToast('Resumo copiado para a área de transferência!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (onShowToast) onShowToast('Não foi possível copiar automaticamente.', 'warning');
    }
  };

  const handleSendWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  };

  // Draw high-resolution visual card to Canvas for Instant PNG Download & Web Share
  const generateCanvasImage = async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dimensions: 900 x 1200 (HD 3:4 portrait card, perfect for WhatsApp status or message)
    const width = 900;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;

    // Background gradient: Deep luxurious navy to dark teal
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#070D1E');
    bgGrad.addColorStop(0.5, '#0A152E');
    bgGrad.addColorStop(1, '#051024');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative ambient circles
    const radGrad1 = ctx.createRadialGradient(800, 100, 20, 800, 100, 350);
    radGrad1.addColorStop(0, 'rgba(0, 229, 181, 0.18)');
    radGrad1.addColorStop(1, 'rgba(0, 229, 181, 0)');
    ctx.fillStyle = radGrad1;
    ctx.beginPath();
    ctx.arc(800, 100, 350, 0, Math.PI * 2);
    ctx.fill();

    const radGrad2 = ctx.createRadialGradient(100, 950, 20, 100, 950, 400);
    radGrad2.addColorStop(0, 'rgba(255, 209, 102, 0.12)');
    radGrad2.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = radGrad2;
    ctx.beginPath();
    ctx.arc(100, 950, 400, 0, Math.PI * 2);
    ctx.fill();

    // Top Card Header Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Top Brand Badge
    ctx.fillStyle = 'rgba(0, 229, 181, 0.15)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 190, 70, 380, 46, 23);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 229, 181, 0.4)';
    ctx.stroke();

    ctx.fillStyle = '#00E5B5';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ FINANÇAS DA MINHA CASA ✨', width / 2, 100);

    // Month & Couple Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    ctx.fillText(selectedMonth, width / 2, 175);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Retrospectiva & Fechamento • ${coupleTitle}`, width / 2, 215);

    // Progress Box
    const progressY = 265;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(80, progressY, width - 160, 140, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    ctx.fillStyle = paidPercentage === 100 ? '#FFD166' : '#00E5B5';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(paidPercentage === 100 ? '🏆 100% QUITADAS!' : '⚡ PROGRESSO DE QUITAÇÃO', 110, progressY + 45);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${paidPercentage}% Concluído`, width - 110, progressY + 45);

    // Progress Bar Track
    const barX = 110;
    const barY = progressY + 68;
    const barW = width - 220;
    const barH = 18;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 9);
    ctx.fill();

    // Progress Bar Fill
    const fillW = Math.max(18, (barW * Math.min(100, paidPercentage)) / 100);
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fillGrad.addColorStop(0, '#00C49F');
    fillGrad.addColorStop(1, '#00E5B5');
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 9);
    ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${paidCount} de ${totalBillsCount} contas pagas (${formatBRL(paidAmount)})`, 110, progressY + 115);

    // 4 Key Value Cards
    const gridY = 440;
    const cardW = (width - 190) / 2;
    const cardH = 135;

    // Card 1: Total Contas
    drawMetricBox(ctx, 80, gridY, cardW, cardH, 'TOTAL EM CONTAS', formatBRL(totalBillsAmount), `${totalBillsCount} contas cadastradas`, '#F43F5E');

    // Card 2: Já Pago
    drawMetricBox(ctx, 80 + cardW + 30, gridY, cardW, cardH, 'TOTAL JÁ QUITADO', formatBRL(paidAmount), `${paidCount} contas liquidadas`, '#10B981');

    // Card 3: Restante a Pagar
    drawMetricBox(ctx, 80, gridY + cardH + 20, cardW, cardH, 'RESTANTE A PAGAR', formatBRL(pendingAmount), `${pendingCount} contas pendentes`, pendingCount === 0 ? '#10B981' : '#F59E0B');

    // Card 4: Renda ou Sobra
    if (includeRevenue && totalRevenueAmount > 0) {
      drawMetricBox(
        ctx, 
        80 + cardW + 30, 
        gridY + cardH + 20, 
        cardW, 
        cardH, 
        balance >= 0 ? 'SOBRA PREVISTA' : 'BALANÇO', 
        formatBRL(balance), 
        `Renda: ${formatBRL(totalRevenueAmount)}`, 
        balance >= 0 ? '#00E5B5' : '#EF4444'
      );
    } else {
      drawMetricBox(
        ctx, 
        80 + cardW + 30, 
        gridY + cardH + 20, 
        cardW, 
        cardH, 
        'PERCENTUAL PAGO', 
        `${paidAmountPercentage}%`, 
        'do valor total quitado', 
        '#00E5B5'
      );
    }

    // Spouse participation box
    let currentY = 765;
    if (includeSpouseSplit && (paidByPartner1 > 0 || paidByPartner2 > 0)) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.roundRect(80, currentY, width - 160, 110, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();

      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('👥 PARTICIPAÇÃO DO CASAL NAS QUITAÇÕES', 110, currentY + 40);

      ctx.fillStyle = '#00E5B5';
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillText(`👤 ${partner1}: ${formatBRL(paidByPartner1)}`, 110, currentY + 80);

      ctx.fillStyle = '#FFD166';
      ctx.textAlign = 'right';
      ctx.fillText(`👩🏻 ${partner2}: ${formatBRL(paidByPartner2)}`, width - 110, currentY + 80);

      currentY += 135;
    }

    // Top categories
    if (topCategories.length > 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('TOP CATEGORIAS DO MÊS:', 100, currentY + 25);

      const catText = topCategories.map(([cat, val], i) => `${i + 1}. ${cat} (${formatBRL(val)})`).join('   •   ');
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '19px system-ui, -apple-system, sans-serif';
      ctx.fillText(catText, 100, currentY + 58);
      currentY += 80;
    }

    // Love Note Footer
    if (includeLoveNote) {
      ctx.fillStyle = 'rgba(255, 209, 102, 0.1)';
      ctx.beginPath();
      ctx.roundRect(80, currentY + 10, width - 160, 95, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.3)';
      ctx.stroke();

      ctx.fillStyle = '#FFD166';
      ctx.textAlign = 'center';
      ctx.font = 'italic 21px system-ui, -apple-system, sans-serif';
      ctx.fillText('❤️ "Mais um mês cuidando do nosso futuro com amor e parceria!" ❤️', width / 2, currentY + 65);
    }

    // Bottom Timestamp & Watermark
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'center';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillText('Finanças da Minha Casa • Sincronizado e seguro', width / 2, height - 60);

    return canvas.toDataURL('image/png');
  };

  const drawMetricBox = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    value: string,
    sub: string,
    accentColor: string
  ) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.stroke();

    // Accent left stripe
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(x + 12, y + 20, 4, h - 40, 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(title, x + 28, y + 36);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(value, x + 28, y + 78);

    ctx.fillStyle = '#64748B';
    ctx.font = '15px system-ui, -apple-system, sans-serif';
    ctx.fillText(sub, x + 28, y + 108);
  };

  const handleDownloadImage = async () => {
    try {
      setIsGeneratingImage(true);
      const dataUrl = await generateCanvasImage();
      if (!dataUrl) return;

      const link = document.createElement('a');
      const safeMonthName = selectedMonth.toLowerCase().replace(/[^a-z0-9]/g, '-');
      link.download = `resumo-casal-${safeMonthName}.png`;
      link.href = dataUrl;
      link.click();

      if (onShowToast) onShowToast('Imagem gerada e baixada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      if (onShowToast) onShowToast('Erro ao gerar imagem.', 'warning');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareImageNative = async () => {
    try {
      setIsGeneratingImage(true);
      const dataUrl = await generateCanvasImage();
      if (!dataUrl) return;

      // Convert dataUrl to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `resumo-${selectedMonth}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Resumo Financeiro - ${selectedMonth}`,
          text: `Retrospectiva financeira do mês: ${selectedMonth} (${coupleTitle})`,
        });
      } else {
        // Fallback to direct download
        handleDownloadImage();
      }
    } catch {
      handleDownloadImage();
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#0D152A] border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0A1128]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <MessageCircle className="w-5 h-5 fill-emerald-500/30" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Resumo para WhatsApp</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Retrospectiva
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {selectedMonth} • {coupleTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Card Visual vs Texto) */}
        <div className="px-5 pt-3 pb-1 flex items-center gap-2 border-b border-slate-800/80 bg-[#090F20]">
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'card'
                ? 'bg-emerald-500 text-[#0A1128] shadow-md shadow-emerald-500/20 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cartão Visual (Imagem)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'text'
                ? 'bg-emerald-500 text-[#0A1128] shadow-md shadow-emerald-500/20 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Texto Formatado</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          {/* Quick Options Toggles */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIncludeRevenue(!includeRevenue)}
              className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                includeRevenue
                  ? 'bg-teal-950/40 border-teal-500/40 text-teal-200'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Wallet className="w-3.5 h-3.5" />
                {includeRevenue ? <Eye className="w-3 h-3 text-teal-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              </div>
              <span className="font-semibold text-[11px] leading-tight">Renda do Casal</span>
            </button>

            <button
              type="button"
              onClick={() => setIncludeSpouseSplit(!includeSpouseSplit)}
              className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                includeSpouseSplit
                  ? 'bg-teal-950/40 border-teal-500/40 text-teal-200'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {includeSpouseSplit ? <Eye className="w-3 h-3 text-teal-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              </div>
              <span className="font-semibold text-[11px] leading-tight">Quem Pagou</span>
            </button>

            <button
              type="button"
              onClick={() => setIncludeLoveNote(!includeLoveNote)}
              className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                includeLoveNote
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Heart className="w-3.5 h-3.5" />
                {includeLoveNote ? <Eye className="w-3 h-3 text-rose-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
              </div>
              <span className="font-semibold text-[11px] leading-tight">Recado a Dois</span>
            </button>
          </div>

          {activeTab === 'card' ? (
            /* VISUAL CARD PREVIEW (Estilo Spotify Wrapped de Finanças) */
            <div 
              ref={cardPreviewRef}
              className="relative rounded-3xl overflow-hidden p-5 border border-slate-700/70 shadow-2xl bg-gradient-to-b from-[#091124] via-[#0C1733] to-[#070F22] text-white"
            >
              {/* Decorative Glows */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-black text-xs">
                    ✦
                  </div>
                  <div>
                    <div className="text-[10px] font-black tracking-wider text-emerald-400 uppercase">
                      Finanças da Minha Casa
                    </div>
                    <div className="text-base font-black text-white leading-tight">
                      {selectedMonth}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-300 font-bold bg-white/10 px-2 py-0.8 rounded-full border border-white/10">
                    {coupleTitle}
                  </span>
                </div>
              </div>

              {/* Progress Box */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    {paidPercentage === 100 ? (
                      <>
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-300 font-black">100% DAS CONTAS QUITADAS!</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span>Progresso de Quitação</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs font-black text-white">{paidPercentage}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden p-0.5 mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, paidPercentage))}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-300 flex items-center justify-between">
                  <span>{paidCount} de {totalBillsCount} contas pagas</span>
                  <span className="font-bold text-emerald-400">{formatBRL(paidAmount)}</span>
                </div>
              </div>

              {/* Key Metrics 2x2 Grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-rose-300 block mb-0.5">TOTAL CONTAS</span>
                  <div className="text-base font-black text-white">{formatBRL(totalBillsAmount)}</div>
                  <span className="text-[10px] text-slate-400">{totalBillsCount} contas no mês</span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-emerald-300 block mb-0.5">JÁ PAGO</span>
                  <div className="text-base font-black text-emerald-400">{formatBRL(paidAmount)}</div>
                  <span className="text-[10px] text-slate-400">{paidCount} liquidadas</span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-amber-300 block mb-0.5">A PAGAR</span>
                  <div className={`text-base font-black ${pendingCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {formatBRL(pendingAmount)}
                  </div>
                  <span className="text-[10px] text-slate-400">{pendingCount} pendentes</span>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  {includeRevenue && totalRevenueAmount > 0 ? (
                    <>
                      <span className="text-[10px] font-bold text-teal-300 block mb-0.5">
                        {balance >= 0 ? 'SOBRA ESTIMADA' : 'BALANÇO'}
                      </span>
                      <div className={`text-base font-black ${balance >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>
                        {formatBRL(balance)}
                      </div>
                      <span className="text-[10px] text-slate-400">Renda: {formatBRL(totalRevenueAmount)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-teal-300 block mb-0.5">% QUITADO</span>
                      <div className="text-base font-black text-teal-300">{paidAmountPercentage}%</div>
                      <span className="text-[10px] text-slate-400">do valor em R$ pago</span>
                    </>
                  )}
                </div>
              </div>

              {/* Spouse split */}
              {includeSpouseSplit && (paidByPartner1 > 0 || paidByPartner2 > 0) && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 mb-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">👤</span>
                    <div>
                      <div className="text-[10px] text-slate-400">{partner1}</div>
                      <div className="font-bold text-teal-300 text-xs">{formatBRL(paidByPartner1)}</div>
                    </div>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex items-center gap-1.5 text-right">
                    <div>
                      <div className="text-[10px] text-slate-400">{partner2}</div>
                      <div className="font-bold text-amber-300 text-xs">{formatBRL(paidByPartner2)}</div>
                    </div>
                    <span className="text-sm">👩🏻</span>
                  </div>
                </div>
              )}

              {/* Love note */}
              {includeLoveNote && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-2.5 text-center text-[11px] text-rose-200 font-medium">
                  ❤️ <em>"Mais um mês cuidando do nosso futuro com amor e parceria!"</em>
                </div>
              )}
            </div>
          ) : (
            /* TEXT PREVIEW */
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
              {generateWhatsAppMessage()}
            </div>
          )}

          {/* Hidden Canvas for crisp image generation */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#0A1128] space-y-2.5">
          <div className="flex items-center gap-2">
            {/* Primary Action: Send to WhatsApp */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-[#0A1128] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-[#0A1128]" />
              <span>Enviar no WhatsApp</span>
            </button>

            {/* Copy Formatted Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="py-3 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              title="Copiar texto formatado"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Image */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 active:scale-98 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700/80 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span>{isGeneratingImage ? 'Gerando...' : 'Baixar Imagem PNG'}</span>
            </button>

            {/* Native Share on Mobile */}
            <button
              type="button"
              onClick={handleShareImageNative}
              disabled={isGeneratingImage}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 active:scale-98 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700/80 transition-all cursor-pointer disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Compartilhar Imagem</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
