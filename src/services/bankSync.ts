import { BankConnection, Bill, Revenue, CardPurchaseRequest, CardPurchaseResult } from '../types/finance';
import { cloudkit } from './cloudkitSync';

const STORAGE_KEY_BANKS = 'financas_bank_connections_v2';
const STORAGE_KEY_BANK_CREDS = 'financas_open_finance_creds_v2';
const STORAGE_KEY_CLEARED_MOCK = 'financas_bank_mock_cleared_v1';

export interface OpenFinanceConfig {
  institution: string;
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  syncInterval: 'realtime' | 'hourly' | 'daily';
  autoCategorize: boolean;
  certificateInstalled: boolean;
}

export const SUPPORTED_INSTITUTIONS = [
  { id: 'itau', name: 'Banco Itaú', code: '341', color: '#EC7000', icon: '🏦' },
  { id: 'nubank', name: 'Nubank', code: '260', color: '#820AD1', icon: '💜' },
  { id: 'bradesco', name: 'Banco Bradesco', code: '237', color: '#CC092F', icon: '🏛️' },
  { id: 'bb', name: 'Banco do Brasil', code: '001', color: '#FBF800', icon: '🟡' },
  { id: 'santander', name: 'Banco Santander', code: '033', color: '#EC0000', icon: '🔴' },
  { id: 'c6', name: 'C6 Bank', code: '336', color: '#242424', icon: '⚫' },
  { id: 'inter', name: 'Banco Inter', code: '077', color: '#FF7A00', icon: '🟠' },
  { id: 'caixa', name: 'Caixa Econômica', code: '104', color: '#005CA9', icon: '🟦' },
  { id: 'btg', name: 'BTG Pactual', code: '208', color: '#1B263B', icon: '🔷' },
  { id: 'xp', name: 'XP Investimentos', code: '102', color: '#000000', icon: '📈' },
  { id: 'sicoob', name: 'Sicoob', code: '756', color: '#003641', icon: '🟢' },
  { id: 'sicredi', name: 'Sicredi', code: '748', color: '#005C2B', icon: '🌿' },
];

export const INITIAL_BANK_CONNECTIONS: BankConnection[] = [
  {
    id: 'bank-itau-carlos',
    institution: 'Banco Itaú',
    accountType: 'Conta Corrente',
    accountNumber: 'Ag 0142 • C/C 89210-4',
    balance: 4890.30,
    status: 'connected',
    lastSync: 'Sincronizado há 2 min (Open Finance)',
    securityHash: 'sha256-e2e-itau-f47a98',
    cardHolder: 'Carlos',
  },
  {
    id: 'bank-nubank-camila',
    institution: 'Nubank',
    accountType: 'Cartão de Crédito',
    accountNumber: 'Final 4092 (Virtual & Físico)',
    balance: -1280.40,
    availableLimit: 14720.00,
    usedLimit: 1280.40,
    status: 'connected',
    lastSync: 'Sincronizado há 5 min (Open Finance)',
    securityHash: 'sha256-e2e-nu-a128df',
    cardHolder: 'Paula',
    closingDay: 5,
    dueDay: 15,
  },
];

class BankSyncService {
  public getConnections(): BankConnection[] {
    if (typeof window === 'undefined') return [];
    const isMockCleared = localStorage.getItem(STORAGE_KEY_CLEARED_MOCK);
    const raw = localStorage.getItem(STORAGE_KEY_BANKS);
    
    if (isMockCleared) {
      if (!raw) return [];
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }

    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveConnections(connections: BankConnection[]): void {
    localStorage.setItem(STORAGE_KEY_BANKS, JSON.stringify(connections));
    localStorage.setItem(STORAGE_KEY_CLEARED_MOCK, 'true');
  }

  public addOrUpdateConnection(connection: BankConnection): BankConnection[] {
    const list = this.getConnections();
    const index = list.findIndex(c => c.id === connection.id);
    let updated: BankConnection[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = connection;
    } else {
      updated = [connection, ...list];
    }
    this.saveConnections(updated);
    return updated;
  }

  public deleteConnection(id: string): BankConnection[] {
    const list = this.getConnections();
    const updated = list.filter(c => c.id !== id);
    this.saveConnections(updated);
    return updated;
  }

  public clearAllConnections(): void {
    localStorage.setItem(STORAGE_KEY_BANKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY_CLEARED_MOCK, 'true');
  }

  public getOpenFinanceConfig(): OpenFinanceConfig {
    if (typeof window === 'undefined') {
      return {
        institution: 'Banco Itaú',
        clientId: '',
        clientSecret: '',
        environment: 'production',
        syncInterval: 'realtime',
        autoCategorize: true,
        certificateInstalled: true,
      };
    }
    const raw = localStorage.getItem(STORAGE_KEY_BANK_CREDS);
    if (!raw) {
      return {
        institution: 'Banco Itaú',
        clientId: '',
        clientSecret: '',
        environment: 'production',
        syncInterval: 'realtime',
        autoCategorize: true,
        certificateInstalled: true,
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        institution: 'Banco Itaú',
        clientId: '',
        clientSecret: '',
        environment: 'production',
        syncInterval: 'realtime',
        autoCategorize: true,
        certificateInstalled: true,
      };
    }
  }

  public saveOpenFinanceConfig(cfg: OpenFinanceConfig): void {
    localStorage.setItem(STORAGE_KEY_BANK_CREDS, JSON.stringify(cfg));
  }

  // Parse standard Brazilian OFX/CSV statement file
  public parseStatementFile(content: string, filename: string): { bills: Partial<Bill>[]; revenues: Partial<Revenue>[] } {
    const bills: Partial<Bill>[] = [];
    const revenues: Partial<Revenue>[] = [];
    const lines = content.split(/\r\n|\n|\r/);

    // Simple robust OFX/CSV transaction extractor
    const isOfx = filename.toLowerCase().endsWith('.ofx') || content.includes('<OFX>') || content.includes('<STMTTRN>');

    if (isOfx) {
      const trnBlocks = content.split('<STMTTRN>');
      trnBlocks.shift(); // remove header
      for (const block of trnBlocks) {
        const typeMatch = block.match(/<TRNTYPE>([A-Z]+)/);
        const amountMatch = block.match(/<TRNAMT>([0-9.-]+)/);
        const dateMatch = block.match(/<DTPOSTED>([0-9]{8})/);
        const memoMatch = block.match(/<MEMO>([^<\r\n]+)/);

        if (amountMatch && dateMatch) {
          const rawAmt = parseFloat(amountMatch[1]);
          const dateStr = dateMatch[1];
          const y = dateStr.substring(0, 4);
          const m = dateStr.substring(4, 6);
          const d = dateStr.substring(6, 8);
          const isoDate = `${y}-${m}-${d}`;
          const memo = memoMatch ? memoMatch[1].trim() : 'Transação Bancária';

          const isDebt = rawAmt < 0 || this.isDebtOrBill(memo);

          if (isDebt) {
            bills.push({
              name: memo,
              amount: Math.abs(rawAmt),
              dueDate: isoDate,
              favored: memo,
              category: this.guessCategory(memo),
              status: 'paid',
              splitHousehold: true,
              recurrence: 'Única / Pontual',
              notes: 'Importado via Extrato OFX do Banco',
            });
          } else {
            revenues.push({
              name: memo,
              amount: Math.abs(rawAmt),
              date: isoDate,
              category: 'Salário & Renda',
              recurrence: 'Única',
              notes: 'Importado via Extrato OFX do Banco',
            });
          }
        }
      }
    } else {
      // CSV Line parser (Date, Description, Amount)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(/[;,]/);
        if (parts.length >= 3) {
          const dateStr = parts[0].replace(/"/g, '').trim();
          const memo = parts[1].replace(/"/g, '').trim();
          const rawAmt = parseFloat(parts[2].replace(/"/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.').trim());

          if (!isNaN(rawAmt)) {
            const parsedDate = this.normalizeDate(dateStr);
            const isDebt = rawAmt < 0 || this.isDebtOrBill(memo);
            if (isDebt) {
              bills.push({
                name: memo || 'Despesa Importada',
                amount: Math.abs(rawAmt),
                dueDate: parsedDate,
                favored: memo,
                category: this.guessCategory(memo),
                status: 'paid',
                splitHousehold: true,
                recurrence: 'Única / Pontual',
                notes: 'Importado de extrato bancário CSV',
              });
            } else {
              revenues.push({
                name: memo || 'Receita Importada',
                amount: Math.abs(rawAmt),
                date: parsedDate,
                category: 'Salário & Renda',
                recurrence: 'Única',
                notes: 'Importado de extrato bancário CSV',
              });
            }
          }
        }
      }
    }

    return { bills, revenues };
  }

  private isDebtOrBill(text: string): boolean {
    const lower = (text || '').toLowerCase();
    return (
      lower.startsWith('conta') ||
      lower.startsWith('boleto') ||
      lower.startsWith('fatura') ||
      lower.includes('jupiter') ||
      lower.includes('água') ||
      lower.includes('agua') ||
      lower.includes('saneamento') ||
      lower.includes('luz') ||
      lower.includes('energia') ||
      lower.includes('enel') ||
      lower.includes('sabesp') ||
      lower.includes('copasa') ||
      lower.includes('sanepar') ||
      lower.includes('cemig') ||
      lower.includes('iptu') ||
      lower.includes('condom') ||
      lower.includes('aluguel') ||
      lower.includes('internet') ||
      lower.includes('fibra') ||
      lower.includes('telef') ||
      lower.includes('debito') ||
      lower.includes('pagto') ||
      lower.includes('pagamento') ||
      lower.includes('tarifa') ||
      lower.includes('farmacia') ||
      lower.includes('droga') ||
      lower.includes('mercado') ||
      lower.includes('supermercado') ||
      lower.includes('uber') ||
      lower.includes('ifood') ||
      lower.includes('posto') ||
      lower.includes('combustivel')
    );
  }

  private normalizeDate(raw: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parts = raw.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      let y = parts[2];
      if (y.length === 2) y = '20' + y;
      return `${y}-${m}-${d}`;
    }
    return new Date().toISOString().split('T')[0];
  }

  private guessCategory(text: string): string {
    const low = text.toLowerCase();
    if (low.includes('condom') || low.includes('aluguel') || low.includes('iptu')) return 'Moradia & Condomínio';
    if (low.includes('enel') || low.includes('luz') || low.includes('energia') || low.includes('sabesp') || low.includes('agua') || low.includes('gas')) return 'Água, Luz & Gás';
    if (low.includes('mercado') || low.includes('carrefour') || low.includes('pao de acucar') || low.includes('supermercado') || low.includes('hortifruti')) return 'Alimentação & Mercado';
    if (low.includes('uber') || low.includes('posto') || low.includes('shell') || low.includes('ipiranga') || low.includes('combustivel')) return 'Transporte & Combustível';
    if (low.includes('farmacia') || low.includes('droga') || low.includes('unimed') || low.includes('medico') || low.includes('saude')) return 'Saúde & Farmácia';
    if (low.includes('netflix') || low.includes('spotify') || low.includes('cinema') || low.includes('restaurante')) return 'Lazer & Assinaturas';
    if (low.includes('caixa') || low.includes('financiamento') || low.includes('parcela') || low.includes('emprestimo')) return 'Financiamentos & Empréstimos';
    return 'Outras Despesas';
  }

  // Get all linked credit cards
  public getLinkedCreditCards(): BankConnection[] {
    return this.getConnections().filter(c => c.accountType === 'Cartão de Crédito');
  }

  // Parse SMS / Push notification from Brazilian banks
  public parsePushOrSmsNotification(text: string): CardPurchaseRequest | null {
    const raw = String(text || '').trim();
    if (!raw) return null;

    // 1. Extract Amount
    let totalAmount = 0;
    const amountMatch = raw.match(/(?:R\$\s*|valor\s*(?:de)?\s*R\$\s*|de\s*R\$\s*)([0-9]{1,3}(?:\.[0-9]{3})*|\d+)(?:,(\d{2}))?/i) ||
                        raw.match(/\b([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})\b/);
    if (amountMatch) {
      if (amountMatch[2] !== undefined) {
        const whole = amountMatch[1].replace(/\./g, '');
        const cents = amountMatch[2];
        totalAmount = parseFloat(`${whole}.${cents}`);
      } else {
        totalAmount = parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.'));
      }
    }

    if (totalAmount <= 0) return null;

    // 2. Extract Installments
    let installments = 1;
    let installmentAmount: number | undefined;

    const instMatch = raw.match(/(\d{1,2})\s*x\s*(?:de\s*(?:R\$\s*)?([0-9.,]+))?/i) ||
                      raw.match(/(?:parcelad[oa]\s*em\s*|em\s*)(\d{1,2})\s*(?:vezes|parcelas)/i);
    if (instMatch) {
      installments = Math.max(1, parseInt(instMatch[1], 10));
      if (instMatch[2]) {
        installmentAmount = parseFloat(instMatch[2].replace(/\./g, '').replace(',', '.'));
      }
    }

    // 3. Card brand / Bank
    let institution = 'Cartão de Crédito';
    const lower = raw.toLowerCase();
    if (lower.includes('nubank')) institution = 'Nubank';
    else if (lower.includes('itau') || lower.includes('itaucard')) institution = 'Banco Itaú';
    else if (lower.includes('bradesco')) institution = 'Banco Bradesco';
    else if (lower.includes('santander')) institution = 'Banco Santander';
    else if (lower.includes('ourocard') || lower.includes('banco do brasil') || lower.includes('bb')) institution = 'Banco do Brasil';
    else if (lower.includes('c6')) institution = 'C6 Bank';
    else if (lower.includes('inter')) institution = 'Banco Inter';
    else if (lower.includes('caixa')) institution = 'Caixa Econômica';
    else if (lower.includes('xp')) institution = 'XP Investimentos';
    else if (lower.includes('btg')) institution = 'BTG Pactual';

    // 4. Last 4 digits
    let cardLast4: string | undefined;
    const last4Match = raw.match(/(?:final|cart[aã]o\s*final)\s*([0-9]{4})/i);
    if (last4Match) {
      cardLast4 = last4Match[1];
    }

    // 5. Merchant / Description
    let description = 'Compra no Cartão';
    const atMatch = raw.match(/(?:na|no|em)\s+([A-Za-z0-9À-ÿ\s&.-]{3,35})(?:\s+aprovada|\s+no\s+valor|\s+de\s+R|\.|$)/i);
    if (atMatch && atMatch[1] && !atMatch[1].toLowerCase().includes('cart') && !atMatch[1].toLowerCase().includes('aprovad')) {
      description = atMatch[1].trim();
    } else {
      const genericMatch = raw.match(/compra(?:\s+aprovada)?\s+(?:de\s+R\$[0-9.,]+\s+)?(?:no\s+seu\s+[A-Za-z0-9]+\s+)?(?:na|no|em)\s+([A-Za-z0-9À-ÿ\s&.-]{3,30})/i);
      if (genericMatch && genericMatch[1]) {
        description = genericMatch[1].trim();
      }
    }

    // Match with any existing connected card
    const existingCards = this.getLinkedCreditCards();
    const matchedCard = existingCards.find(c => {
      if (cardLast4 && c.accountNumber && c.accountNumber.includes(cardLast4)) return true;
      if (c.institution.toLowerCase().includes(institution.toLowerCase())) return true;
      return false;
    });

    return {
      cardId: matchedCard?.id,
      institution: matchedCard?.institution || institution,
      cardName: matchedCard?.cardName || matchedCard?.institution || institution,
      cardLast4: cardLast4 || (matchedCard?.accountNumber?.match(/\d{4}/)?.[0] || '0000'),
      cardHolder: matchedCard?.cardHolder || 'Paula',
      description,
      totalAmount,
      installments,
      installmentAmount,
      closingDay: matchedCard?.closingDay || 5,
      dueDay: matchedCard?.dueDay || 15,
      category: this.guessCategory(description),
      splitHousehold: true,
      purchaseDate: new Date().toISOString().slice(0, 10),
    };
  }

  // Publish a real card purchase with automatic installments across future months
  public async publishCardPurchase(request: CardPurchaseRequest): Promise<CardPurchaseResult> {
    const totalAmount = Number(request.totalAmount) || 0;
    const installments = Math.max(1, Number(request.installments) || 1);
    const purchaseDate = request.purchaseDate || new Date().toISOString().slice(0, 10);

    // Resolve card connection if available
    const existingCards = this.getLinkedCreditCards();
    let card: BankConnection | undefined;

    if (request.cardId) {
      card = existingCards.find(c => c.id === request.cardId);
    } else if (request.cardLast4) {
      card = existingCards.find(c => c.accountNumber?.includes(request.cardLast4!));
    } else if (request.institution) {
      card = existingCards.find(c => c.institution.toLowerCase().includes(request.institution!.toLowerCase()));
    }

    if (!card && existingCards.length > 0) {
      card = existingCards[0];
    }

    const cardName = card?.institution || request.cardName || request.institution || 'Cartão de Crédito';
    const cardLast4 = request.cardLast4 || (card?.accountNumber?.match(/\d{4}/)?.[0] || '0000');
    const cardHolder = card?.cardHolder || request.cardHolder || 'Paula';
    const closingDay = request.closingDay || card?.closingDay || 5;
    const dueDay = request.dueDay || card?.dueDay || 15;
    const cleanDesc = (request.description || 'Compra no Cartão').trim();

    const calcInstallmentAmount = request.installmentAmount && request.installmentAmount > 0
      ? Number(request.installmentAmount)
      : Number((totalAmount / installments).toFixed(2));

    const [pYStr, pMStr, pDStr] = purchaseDate.split('-');
    const pYear = parseInt(pYStr, 10) || new Date().getFullYear();
    const pMonth = parseInt(pMStr, 10) || (new Date().getMonth() + 1);
    const pDay = parseInt(pDStr, 10) || new Date().getDate();

    // Determine initial invoice month based on closingDay
    let invoiceYear = pYear;
    let invoiceMonth = pMonth;

    if (pDay > closingDay) {
      invoiceMonth += 1;
      if (invoiceMonth > 12) {
        invoiceMonth = 1;
        invoiceYear += 1;
      }
    }

    if (dueDay < closingDay) {
      invoiceMonth += 1;
      if (invoiceMonth > 12) {
        invoiceMonth = 1;
        invoiceYear += 1;
      }
    }

    const parentGroupId = `inst-card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const nowIso = new Date().toISOString();
    const activeDev = cloudkit.getActiveDevice().name;
    const createdBills: Bill[] = [];

    for (let i = 1; i <= installments; i++) {
      const monthOffset = i - 1;
      const targetMonthIndex = invoiceMonth + monthOffset;
      const targetYear = invoiceYear + Math.floor((targetMonthIndex - 1) / 12);
      const targetMonthNum = ((targetMonthIndex - 1) % 12) + 1;

      const maxDaysInTarget = new Date(targetYear, targetMonthNum, 0).getDate();
      const validDay = Math.min(dueDay, maxDaysInTarget);
      const installmentDueDate = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;

      // Adjust last installment cents so sum is exact
      let instVal = calcInstallmentAmount;
      if (i === installments && installments > 1) {
        const previousSum = calcInstallmentAmount * (installments - 1);
        const remainder = Number((totalAmount - previousSum).toFixed(2));
        if (remainder > 0) instVal = remainder;
      }

      const bill: Bill = {
        id: `bill-card-${parentGroupId}-${i}`,
        name: installments > 1 ? `${cleanDesc} (${i}/${installments})` : cleanDesc,
        amount: instVal,
        dueDate: installmentDueDate,
        category: request.category || this.guessCategory(cleanDesc),
        favored: `${cardName} •••• ${cardLast4}`,
        barcode: '',
        pixKey: '',
        pixType: 'Pix Copia e Cola',
        recurrence: installments > 1 ? 'Parcelada' : 'Única / Pontual',
        installmentNumber: i,
        totalInstallments: installments,
        parentInstallmentId: parentGroupId,
        splitHousehold: request.splitHousehold !== false,
        splitDetails: [],
        notes: `💳 Cartão: ${cardName} (${cardHolder}) •••• ${cardLast4} | Total: R$ ${totalAmount.toFixed(2).replace('.', ',')} em ${installments}x de R$ ${instVal.toFixed(2).replace('.', ',')}${request.notes ? ' | ' + request.notes : ''}`,
        status: 'pending',
        version: 1,
        updatedAt: nowIso,
        updatedByDevice: activeDev,
        isSynced: true,
      };

      cloudkit.saveBill(bill);
      createdBills.push(bill);
    }

    // Update the linked credit card invoice and limits
    let updatedConnection: BankConnection | undefined;
    if (card) {
      const currentUsed = card.usedLimit || 0;
      card.usedLimit = currentUsed + totalAmount;
      if (card.availableLimit !== undefined) {
        card.availableLimit = Math.max(0, card.availableLimit - totalAmount);
      }
      card.balance = (card.balance || 0) + (installments > 1 ? calcInstallmentAmount : totalAmount);
      card.lastSync = `Compra de R$ ${totalAmount.toFixed(2).replace('.', ',')} (${installments}x) sincronizada agora`;
      this.addOrUpdateConnection(card);
      updatedConnection = card;
    }

    // Send asynchronously to server-side persistence
    try {
      const houseId = localStorage.getItem('financas_household_id') || 'minha-casa';
      fetch('/api/cards/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house: houseId,
          purchase: {
            ...request,
            cardName,
            cardLast4,
            cardHolder,
            dueDay,
            closingDay,
          },
        }),
      }).catch(() => {});
    } catch {}

    const firstDueDate = createdBills[0]?.dueDate || purchaseDate;
    const lastDueDate = createdBills[createdBills.length - 1]?.dueDate || purchaseDate;

    return {
      bills: createdBills,
      totalAmount,
      installmentAmount: calcInstallmentAmount,
      installmentsCount: installments,
      cardName,
      firstDueDate,
      lastDueDate,
      parentInstallmentId: parentGroupId,
      updatedConnection,
    };
  }

  // Webhook information for iOS Shortcuts, Android Macrodroid, Tasker, Zapier, Pluggy
  public getWebhookInfo(): {
    endpointUrl: string;
    householdId: string;
    examplePayload: string;
    exampleCurl: string;
  } {
    const houseId = (typeof window !== 'undefined' ? localStorage.getItem('financas_household_id') : '') || 'minha-casa';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const endpointUrl = `${origin}/api/cards/webhook?house=${encodeURIComponent(houseId)}`;

    const examplePayload = JSON.stringify(
      {
        house: houseId,
        text: 'Compra aprovada no seu Nubank de R$ 1.200,00 em 10x na Casas Bahia',
        totalAmount: 1200.0,
        installments: 10,
        description: 'Casas Bahia - Geladeira',
        cardName: 'Nubank',
        cardHolder: 'Paula',
      },
      null,
      2
    );

    const exampleCurl = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ text: "Compra de R$ 1.500,00 em 10x aprovada no Nubank na Magazine Luiza" })}'`;

    return {
      endpointUrl,
      householdId: houseId,
      examplePayload,
      exampleCurl,
    };
  }
}

export const bankSync = new BankSyncService();
