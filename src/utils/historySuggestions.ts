import { Bill, getMonthShortPtBr } from '../types/finance';

export interface FavoredHistorySummary {
  matchedFavored: string;
  totalBillsFound: number;
  lastBill?: Bill;
  lastAmount?: number;
  averageAmount?: number;
  suggestedCategory?: string;
  recentRecords: {
    id: string;
    amount: number;
    formattedAmount: string;
    monthLabel: string;
    dueDate: string;
    status: string;
    category: string;
  }[];
  commonDueDay?: number;
  lastPixKey?: string;
  lastPixType?: string;
  lastBarcode?: string;
}

export interface FrequentFavoredItem {
  favored: string;
  count: number;
  category: string;
  lastAmount?: number;
}

// Clean and normalize text for fuzzy comparison
function normalizeText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(?:conta|fatura|boleto|pagamento|parcela|de|da|do|mensalidade)\s+/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Finds payment history for a given favored name or bill title.
 */
export function getFavoredHistory(
  query: string,
  allBills: Bill[],
  currentBillId?: string
): FavoredHistorySummary | null {
  if (!query || typeof query !== 'string') return null;
  const cleanQuery = normalizeText(query);
  if (cleanQuery.length < 2) return null;

  // Filter bills (excluding current editing bill)
  const matchingBills = allBills.filter(b => {
    if (currentBillId && b.id === currentBillId) return false;

    const bFavoredNorm = normalizeText(b.favored);
    const bNameNorm = normalizeText(b.name);

    if (bFavoredNorm && (bFavoredNorm.includes(cleanQuery) || cleanQuery.includes(bFavoredNorm))) {
      return true;
    }
    if (bNameNorm && (bNameNorm.includes(cleanQuery) || cleanQuery.includes(bNameNorm))) {
      return true;
    }
    return false;
  });

  if (matchingBills.length === 0) return null;

  // Sort by dueDate descending (most recent first)
  matchingBills.sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));

  const lastBill = matchingBills[0];
  const validAmounts = matchingBills.map(b => Number(b.amount) || 0).filter(a => a > 0);
  const lastAmount = validAmounts.length > 0 ? validAmounts[0] : undefined;
  const averageAmount = validAmounts.length > 0
    ? validAmounts.reduce((acc, curr) => acc + curr, 0) / validAmounts.length
    : undefined;

  // Find most frequent or most recent category
  const categoryFrequency: Record<string, number> = {};
  matchingBills.forEach(b => {
    if (b.category) {
      categoryFrequency[b.category] = (categoryFrequency[b.category] || 0) + 1;
    }
  });

  const sortedCategories = Object.entries(categoryFrequency).sort((a, b) => b[1] - a[1]);
  const suggestedCategory = lastBill.category || (sortedCategories.length > 0 ? sortedCategories[0][0] : undefined);

  // Recent records (up to 4)
  const recentRecords = matchingBills.slice(0, 4).map(b => {
    const monthId = (b.dueDate || '').substring(0, 7);
    const monthLabel = monthId ? getMonthShortPtBr(monthId) : '';
    const amt = Number(b.amount) || 0;
    return {
      id: b.id,
      amount: amt,
      formattedAmount: `R$ ${amt.toFixed(2).replace('.', ',')}`,
      monthLabel,
      dueDate: b.dueDate || '',
      status: b.status,
      category: b.category,
    };
  });

  // Calculate common due day of month
  let commonDueDay: number | undefined;
  const dueDaysCount: Record<number, number> = {};
  matchingBills.forEach(b => {
    if (b.dueDate && b.dueDate.length >= 10) {
      const day = parseInt(b.dueDate.substring(8, 10), 10);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        dueDaysCount[day] = (dueDaysCount[day] || 0) + 1;
      }
    }
  });
  const sortedDays = Object.entries(dueDaysCount).sort((a, b) => b[1] - a[1]);
  if (sortedDays.length > 0) {
    commonDueDay = parseInt(sortedDays[0][0], 10);
  }

  // Find latest bill with PIX key or barcode
  const billWithPix = matchingBills.find(b => b.pixKey && b.pixKey.trim().length > 0);
  const billWithBarcode = matchingBills.find(b => b.barcode && b.barcode.trim().length > 10);

  // Preferred canonical display name
  const canonicalName = lastBill.favored || lastBill.name || query;

  return {
    matchedFavored: canonicalName,
    totalBillsFound: matchingBills.length,
    lastBill,
    lastAmount,
    averageAmount,
    suggestedCategory,
    recentRecords,
    commonDueDay,
    lastPixKey: billWithPix?.pixKey,
    lastPixType: billWithPix?.pixType,
    lastBarcode: billWithBarcode?.barcode,
  };
}

/**
 * Returns top frequent favored companies from past bills for 1-tap quick suggestions.
 */
export function getFrequentFavoreds(allBills: Bill[], limit = 6): FrequentFavoredItem[] {
  const map: Record<string, { count: number; category: string; lastAmount?: number; lastDate: string }> = {};

  allBills.forEach(b => {
    const rawName = (b.favored || b.name || '').trim();
    if (!rawName || rawName.length < 2) return;

    const normKey = normalizeText(rawName);
    if (!normKey) return;

    if (!map[normKey]) {
      map[normKey] = {
        count: 0,
        category: b.category || 'Outras Despesas',
        lastAmount: b.amount,
        lastDate: b.dueDate || '',
      };
    }

    map[normKey].count += 1;
    if ((b.dueDate || '') >= map[normKey].lastDate) {
      map[normKey].category = b.category || map[normKey].category;
      map[normKey].lastAmount = b.amount;
      map[normKey].lastDate = b.dueDate || map[normKey].lastDate;
    }
  });

  // Find original display names for top keys
  const entries = Object.entries(map).sort((a, b) => b[1].count - a[1].count);

  const result: FrequentFavoredItem[] = [];

  for (const [key, data] of entries.slice(0, limit)) {
    const foundBill = allBills.find(b => normalizeText(b.favored || b.name || '') === key);
    const displayName = foundBill?.favored || foundBill?.name || key;
    result.push({
      favored: displayName,
      count: data.count,
      category: data.category,
      lastAmount: data.lastAmount,
    });
  }

  return result;
}
