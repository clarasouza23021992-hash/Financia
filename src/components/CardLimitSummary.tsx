import React from 'react';
import { 
  CreditCard, TrendingUp, AlertCircle, CheckCircle2, 
  Sparkles, ShieldCheck, Plus, ArrowUpRight, Zap 
} from 'lucide-react';
import { BankConnection } from '../types/finance';

interface CardLimitSummaryProps {
  cards: BankConnection[];
  onSelectCard?: (card: BankConnection) => void;
  onEditCard?: (card: BankConnection) => void;
  onAddNewCard?: () => void;
  compact?: boolean;
}

export const CardLimitSummary: React.FC<CardLimitSummaryProps> = ({
  cards,
  onSelectCard,
  onEditCard,
  onAddNewCard,
  compact = false,
}) => {
  const creditCards = cards.filter(c => c.accountType === 'Cartão de Crédito');

  if (creditCards.length === 0) {
    return null;
  }

  // Calculate metrics for a single card
  const getMetrics = (card: BankConnection) => {
    const used = card.usedLimit !== undefined ? card.usedLimit : Math.max(0, Math.abs(card.balance || 0));
    const available = card.availableLimit !== undefined ? card.availableLimit : 0;
    const total = (card.availableLimit !== undefined && card.usedLimit !== undefined)
      ? (card.availableLimit + card.usedLimit)
      : (available > 0 ? available + used : (used > 0 ? used : 0));

    const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round((used / total) * 100))) : 0;

    let barColor = 'bg-emerald-500';
    let textColor = 'text-emerald-600 dark:text-emerald-400';
    let badgeBg = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    let statusLabel = 'Limite Saudável';

    if (percentage >= 85) {
      barColor = 'bg-rose-500';
      textColor = 'text-rose-600 dark:text-rose-400';
      badgeBg = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
      statusLabel = 'Atenção: Limite Alto';
    } else if (percentage >= 60) {
      barColor = 'bg-amber-500';
      textColor = 'text-amber-600 dark:text-amber-400';
      badgeBg = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
      statusLabel = 'Uso Moderado';
    }

    return {
      used,
      available,
      total,
      percentage,
      barColor,
      textColor,
      badgeBg,
      statusLabel,
      hasLimit: card.availableLimit !== undefined || total > 0,
    };
  };

  // Aggregated totals across all cards
  const totalCombinedAvailable = creditCards.reduce((acc, c) => acc + (c.availableLimit || 0), 0);
  const totalCombinedUsed = creditCards.reduce((acc, c) => acc + (c.usedLimit !== undefined ? c.usedLimit : Math.max(0, Math.abs(c.balance || 0))), 0);
  const totalCombinedLimit = totalCombinedAvailable + totalCombinedUsed;
  const overallPercentage = totalCombinedLimit > 0 ? Math.min(100, Math.round((totalCombinedUsed / totalCombinedLimit) * 100)) : 0;

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Resumo Visual dos Limites de Crédito
            </h4>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
              Acompanhamento de limite disponível e utilizado neste mês
            </span>
          </div>
        </div>

        {totalCombinedLimit > 0 && creditCards.length > 1 && (
          <span className="text-[11px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 px-2.5 py-0.5 rounded-full">
            Total Disponível: R$ {totalCombinedAvailable.toFixed(2).replace('.', ',')}
          </span>
        )}
      </div>

      {/* Aggregated progress overview card (if more than 1 card) */}
      {creditCards.length > 1 && !compact && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0B1528] to-[#0A1A2F] text-white border border-slate-700/60 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <TrendingUp className="w-3.5 h-3.5 text-[#00C49F]" />
              <span>Consolidado da Família ({creditCards.length} cartões)</span>
            </div>
            <div className="text-[11px] font-bold text-slate-300">
              <span className="text-[#00C49F] font-black">{overallPercentage}%</span> utilizado
            </div>
          </div>

          {/* Aggregated Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden relative p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallPercentage >= 85 ? 'bg-rose-500' : overallPercentage >= 60 ? 'bg-amber-400' : 'bg-[#00C49F]'
              }`}
              style={{ width: `${Math.max(2, overallPercentage)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <div>
              <span className="text-slate-400">Utilizado: </span>
              <span className="font-bold text-rose-300">
                R$ {totalCombinedUsed.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div>
              <span className="text-slate-400">Disponível: </span>
              <span className="font-black text-[#00C49F]">
                R$ {totalCombinedAvailable.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div>
              <span className="text-slate-400">Limite Total: </span>
              <span className="font-semibold text-slate-300">
                R$ {totalCombinedLimit.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Individual Cards Progress Breakdown */}
      <div className="grid grid-cols-1 gap-2.5">
        {creditCards.map((card) => {
          const metrics = getMetrics(card);
          const cardLast4 = card.last4 || card.accountNumber?.match(/\d{4}/)?.[0] || '••••';

          return (
            <div
              key={card.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/40 shadow-2xs transition-all space-y-2.5 group"
            >
              {/* Top row: Brand, cardholder, last4, and status badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0 font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {card.institution}
                      </span>
                      {card.cardHolder && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium">
                          {card.cardHolder}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        •••• {cardLast4}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${metrics.badgeBg}`}>
                    {metrics.percentage}% em uso
                  </span>

                  {onEditCard && (
                    <button
                      type="button"
                      onClick={() => onEditCard(card)}
                      className="text-[10.5px] font-bold text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 px-1.5 py-0.5 rounded transition-colors"
                      title="Editar limite do cartão"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>

              {/* Middle row: Big numbers for Available Limit & Used */}
              <div className="flex items-end justify-between gap-2 pt-0.5">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black block tracking-wider">
                    Limite Disponível
                  </span>
                  <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>R$ {metrics.available.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black block tracking-wider">
                    Utilizado no Mês
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    R$ {metrics.used.toFixed(2).replace('.', ',')}
                  </span>
                  {metrics.total > 0 && (
                    <span className="text-[10px] text-slate-400 block">
                      de R$ {metrics.total.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${metrics.barColor}`}
                    style={{ width: `${Math.max(2, metrics.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${metrics.barColor}`} />
                    <span>{metrics.statusLabel}</span>
                  </span>

                  {card.closingDay && card.dueDay ? (
                    <span>
                      Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Quick action button to launch purchase with this card */}
              {onSelectCard && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectCard(card)}
                    className="text-[10.5px] font-bold text-teal-700 dark:text-[#00C49F] hover:underline flex items-center gap-1 py-0.5"
                  >
                    <Zap className="w-3 h-3 text-[#00C49F]" />
                    <span>Lançar compra neste cartão</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
