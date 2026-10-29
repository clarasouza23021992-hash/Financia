import { inferCategoryFromName } from './categories';
import { Bill } from '../types/finance';

export interface ParsedBankNotification {
  rawText: string;
  detected: boolean;
  merchant: string;
  totalAmount: number;
  installments: number;
  installmentAmount: number;
  cardName: string;
  cardLast4?: string;
  category: string;
  confidence: number;
}

export interface GeneratedInstallmentPlan {
  totalAmount: number;
  installments: number;
  installmentAmount: number;
  merchant: string;
  cardName: string;
  cardLast4?: string;
  category: string;
  purchasedBy: string;
  purchaseDate: string;
  closingDay: number;
  dueDay: number;
  bills: Array<{
    name: string;
    amount: number;
    dueDate: string;
    month: string;
    installmentNumber: number;
    totalInstallments: number;
    favored: string;
    category: string;
    notes: string;
  }>;
}

/**
 * Parses bank push notifications, SMS or WhatsApp messages from Brazilian banks.
 * Handles Nubank, Itaú, Bradesco, Santander, Banco do Brasil, Inter, C6, Caixa, XP, etc.
 */
export function parseBankNotificationText(rawText: string): ParsedBankNotification {
  const text = (rawText || '').trim();
  if (!text) {
    return {
      rawText: '',
      detected: false,
      merchant: '',
      totalAmount: 0,
      installments: 1,
      installmentAmount: 0,
      cardName: 'Cartão de Crédito',
      category: 'Cartão & Compras',
      confidence: 0,
    };
  }

  // 1. Amount Detection (supports R$ 1.500,00, R$150,00, 1.200,50, R$ 49,99, etc.)
  let totalAmount = 0;
  const amountRegexes = [
    /(?:R\$\s*|valor\s*(?:de)?\s*R\$\s*|de\s*R\$\s*)([0-9]{1,3}(?:\.[0-9]{3})*|\d+)(?:,(\d{2}))?/i,
    /\b([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})\b/,
    /(?:R\$\s*)([0-9]+(?:\.[0-9]{2}))/i,
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match) {
      if (match[2] !== undefined) {
        const whole = match[1].replace(/\./g, '');
        const cents = match[2];
        totalAmount = parseFloat(`${whole}.${cents}`);
      } else {
        totalAmount = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
      }
      if (totalAmount > 0) break;
    }
  }

  // 2. Installments: e.g. "em 10x", "10x de", "parcelado em 3x", "12 parcelas", "3 vezes"
  let installments = 1;
  let parsedInstallmentAmount: number | undefined;

  const installmentMatch = 
    text.match(/(\d{1,2})\s*x\s*(?:de\s*(?:R\$\s*)?([0-9.,]+))?/i) ||
    text.match(/(?:parcelad[oa]\s*em\s*|em\s*)(\d{1,2})\s*(?:vezes|parcelas)/i) ||
    text.match(/\b(\d{1,2})\s*parcelas\b/i);

  if (installmentMatch) {
    installments = Math.max(1, parseInt(installmentMatch[1], 10));
    if (installmentMatch[2]) {
      parsedInstallmentAmount = parseFloat(installmentMatch[2].replace(/\./g, '').replace(',', '.'));
    }
  }

  // 3. Card Brand / Bank detection
  let cardName = 'Cartão de Crédito';
  const lower = text.toLowerCase();
  if (lower.includes('nubank') || lower.includes('nu pagamentos')) cardName = 'Nubank';
  else if (lower.includes('itau') || lower.includes('itaú') || lower.includes('itaucard')) cardName = 'Banco Itaú';
  else if (lower.includes('bradesco')) cardName = 'Banco Bradesco';
  else if (lower.includes('santander')) cardName = 'Banco Santander';
  else if (lower.includes('ourocard') || lower.includes('banco do brasil') || lower.includes('bb ')) cardName = 'Banco do Brasil';
  else if (lower.includes('c6')) cardName = 'C6 Bank';
  else if (lower.includes('inter')) cardName = 'Banco Inter';
  else if (lower.includes('caixa')) cardName = 'Caixa Econômica';
  else if (lower.includes('xp')) cardName = 'XP Investimentos';
  else if (lower.includes('btg')) cardName = 'BTG Pactual';
  else if (lower.includes('mercado pago')) cardName = 'Mercado Pago';
  else if (lower.includes('picpay')) cardName = 'PicPay';

  // 4. Last 4 Digits (final 1234, cartão final 4567, etc.)
  let cardLast4: string | undefined;
  const last4Match = text.match(/(?:final|cart[aã]o\s*final)\s*([0-9]{4})/i) ||
                     text.match(/\*{4}\s*([0-9]{4})/);
  if (last4Match) {
    cardLast4 = last4Match[1];
  }

  // 5. Merchant / Description detection
  let merchant = '';
  const merchantPatterns = [
    // "Compra de R$ 150 na Drogaria SP aprovada"
    /(?:na|no|em)\s+([A-Za-z0-9À-ÿ\s&.-]{3,35}?)(?:\s+aprovada|\s+no\s+valor|\s+de\s+R|\s+foi|\.|$)/i,
    // "Compra aprovada em Drogasil de R$..."
    /(?:aprovada\s+(?:em|no|na)\s+)([A-Za-z0-9À-ÿ\s&.-]{3,35}?)(?:\s+no\s+valor|\s+de\s+R|\.|$)/i,
    // "Estabelecimento: Drogaria SP"
    /(?:estabelecimento|local|loja):\s*([A-Za-z0-9À-ÿ\s&.-]{3,35})/i,
    // "Compra no seu Nubank em Magazine Luiza"
    /(?:compra\s+no\s+seu\s+[A-Za-z0-9]+\s+(?:em|na|no)\s+)([A-Za-z0-9À-ÿ\s&.-]{3,35})/i,
  ];

  for (const pat of merchantPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const candLow = candidate.toLowerCase();
      // Avoid false matches with "cartao", "credito", "seu", "valor"
      if (!candLow.includes('cart') && !candLow.includes('credito') && !candLow.includes('aprovad') && !candLow.includes('conta') && candidate.length >= 3) {
        merchant = candidate;
        break;
      }
    }
  }

  // Fallback cleanups
  if (!merchant) {
    // Check known merchants in text
    const knownStores = [
      'Mercado Livre', 'Amazon', 'Shopee', 'Magazine Luiza', 'Magalu', 'Drogasil',
      'Drogaria São Paulo', 'Droga Raia', 'Pão de Açúcar', 'Carrefour', 'Assaí',
      'Uber', 'iFood', 'Rappi', 'Netflix', 'Spotify', 'Posto Shell', 'Posto Ipiranga',
      'Casas Bahia', 'Leroy Merlin', 'Decathlon', 'Zara', 'Renner', 'Riachuelo'
    ];
    for (const store of knownStores) {
      if (new RegExp(`\\b${store}\\b`, 'i').test(text)) {
        merchant = store;
        break;
      }
    }
  }

  if (!merchant) {
    merchant = 'Compra no Cartão';
  }

  // Clean merchant name
  merchant = merchant.replace(/\s+/g, ' ').trim();
  merchant = merchant.replace(/^(?:o|a|os|as)\s+/i, '');

  // Calculate installment amount
  const installmentAmount = parsedInstallmentAmount && parsedInstallmentAmount > 0
    ? parsedInstallmentAmount
    : totalAmount > 0
    ? Number((totalAmount / installments).toFixed(2))
    : 0;

  // Infer category
  const catObj = inferCategoryFromName(merchant);
  const category = catObj?.name || 'Cartão & Compras';

  const detected = totalAmount > 0;
  const confidence = (totalAmount > 0 ? 0.4 : 0) + (installments > 1 ? 0.2 : 0) + (merchant !== 'Compra no Cartão' ? 0.3 : 0) + (cardName !== 'Cartão de Crédito' ? 0.1 : 0);

  return {
    rawText: text,
    detected,
    merchant,
    totalAmount,
    installments,
    installmentAmount,
    cardName,
    cardLast4,
    category,
    confidence: Math.min(confidence, 1),
  };
}

/**
 * Builds real calendar installment bills across successive monthly billing cycles.
 */
export function buildCardInstallmentPlan(params: {
  merchant: string;
  totalAmount: number;
  installments: number;
  installmentAmount?: number;
  purchaseDate?: string;
  closingDay?: number;
  dueDay?: number;
  cardName?: string;
  cardLast4?: string;
  purchasedBy?: string;
  category?: string;
}): GeneratedInstallmentPlan {
  const merchant = (params.merchant || 'Compra no Cartão').trim();
  const totalAmount = Number(params.totalAmount) || 0;
  const installments = Math.max(1, Number(params.installments) || 1);
  const purchaseDate = params.purchaseDate || new Date().toISOString().slice(0, 10);
  const closingDay = params.closingDay || 5;
  const dueDay = params.dueDay || 15;
  const cardName = params.cardName || 'Cartão de Crédito';
  const cardLast4 = params.cardLast4 || '0000';
  const purchasedBy = params.purchasedBy || 'Carlos & Paula';
  const category = params.category || inferCategoryFromName(merchant)?.name || 'Cartão & Compras';

  const calcInstallmentAmount = params.installmentAmount && params.installmentAmount > 0
    ? Number(params.installmentAmount)
    : Number((totalAmount / installments).toFixed(2));

  const [pYStr, pMStr, pDStr] = purchaseDate.split('-');
  const pYear = parseInt(pYStr, 10) || new Date().getFullYear();
  const pMonth = parseInt(pMStr, 10) || (new Date().getMonth() + 1);
  const pDay = parseInt(pDStr, 10) || new Date().getDate();

  // Determine initial billing invoice month based on closingDay
  let invoiceYear = pYear;
  let invoiceMonth = pMonth;

  // If purchase occurred on or after closing day, it pushes to the next invoice cycle
  if (pDay >= closingDay) {
    invoiceMonth += 1;
    if (invoiceMonth > 12) {
      invoiceMonth = 1;
      invoiceYear += 1;
    }
  }

  // If due day is earlier than closing day, payment is in the following month
  if (dueDay < closingDay) {
    invoiceMonth += 1;
    if (invoiceMonth > 12) {
      invoiceMonth = 1;
      invoiceYear += 1;
    }
  }

  const bills: GeneratedInstallmentPlan['bills'] = [];

  for (let i = 1; i <= installments; i++) {
    const monthOffset = i - 1;
    const targetMonthIndex = invoiceMonth + monthOffset;
    const targetYear = invoiceYear + Math.floor((targetMonthIndex - 1) / 12);
    const targetMonthNum = ((targetMonthIndex - 1) % 12) + 1;

    const maxDays = new Date(targetYear, targetMonthNum, 0).getDate();
    const validDay = Math.min(dueDay, maxDays);
    const monthKey = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;
    const dueDateStr = `${monthKey}-${String(validDay).padStart(2, '0')}`;

    // Adjust last installment to prevent cent drift
    let currentInstAmount = calcInstallmentAmount;
    if (i === installments && installments > 1) {
      const prevSum = calcInstallmentAmount * (installments - 1);
      const remainder = Number((totalAmount - prevSum).toFixed(2));
      if (remainder > 0) currentInstAmount = remainder;
    }

    const title = installments > 1 ? `${merchant} (${i}/${installments})` : merchant;
    const favored = `${cardName}${cardLast4 ? ` •••• ${cardLast4}` : ''}`;
    const notes = `💳 Compra no ${cardName} (${purchasedBy}) | Total: R$ ${totalAmount.toFixed(2).replace('.', ',')} em ${installments}x de R$ ${currentInstAmount.toFixed(2).replace('.', ',')}`;

    bills.push({
      name: title,
      amount: currentInstAmount,
      dueDate: dueDateStr,
      month: monthKey,
      installmentNumber: i,
      totalInstallments: installments,
      favored,
      category,
      notes,
    });
  }

  return {
    totalAmount,
    installments,
    installmentAmount: calcInstallmentAmount,
    merchant,
    cardName,
    cardLast4,
    category,
    purchasedBy,
    purchaseDate,
    closingDay,
    dueDay,
    bills,
  };
}
