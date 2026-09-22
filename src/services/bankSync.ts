import { BankConnection, Bill, Revenue } from '../types/finance';

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

          if (rawAmt < 0) {
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
          } else if (rawAmt > 0) {
            revenues.push({
              name: memo,
              amount: rawAmt,
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
            if (rawAmt < 0) {
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
                amount: rawAmt,
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
}

export const bankSync = new BankSyncService();
