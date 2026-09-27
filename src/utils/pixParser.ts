// Intelligent Brazilian Pix Parser (EMV QRCPS Copia e Cola & Standard Pix Keys)
import { inferCategoryFromName } from './categories';

export interface ParsedPixResult {
  detected: boolean;
  pixType: 'Pix Copia e Cola' | 'CNPJ' | 'CPF' | 'Celular' | 'E-mail' | 'Aleatória';
  favored?: string;
  amount?: number;
  dueDate?: string;
  category?: string;
  billName?: string;
  pixKey?: string;
  city?: string;
  txid?: string;
  message: string;
}

// Known Brazilian companies and utilities for instant lookup
const KNOWN_BENEFICIARIES: Record<string, { name: string; billName: string; category: string }> = {
  '61695227000193': { name: 'Enel Distribuição SP', billName: 'Conta de Luz (Energia Elétrica)', category: 'Água, Luz & Gás' },
  '61.695.227/0001-93': { name: 'Enel Distribuição SP', billName: 'Conta de Luz (Energia Elétrica)', category: 'Água, Luz & Gás' },
  '43776517000180': { name: 'Sabesp São Paulo', billName: 'Conta de Água e Esgoto (Sabesp)', category: 'Água, Luz & Gás' },
  '43.776.517/0001-80': { name: 'Sabesp São Paulo', billName: 'Conta de Água e Esgoto (Sabesp)', category: 'Água, Luz & Gás' },
  '61888082000102': { name: 'Comgás São Paulo', billName: 'Gás Encanado (Comgás)', category: 'Água, Luz & Gás' },
  '61.888.082/0001-02': { name: 'Comgás São Paulo', billName: 'Gás Encanado (Comgás)', category: 'Água, Luz & Gás' },
  '40432544000147': { name: 'Claro Brasil S.A.', billName: 'Internet Fibra Óptica (Claro)', category: 'Moradia & Condomínio' },
  '40.432.544/0001-47': { name: 'Claro Brasil S.A.', billName: 'Internet Fibra Óptica (Claro)', category: 'Moradia & Condomínio' },
  '02558157000162': { name: 'Telefônica Brasil (Vivo)', billName: 'Internet Fibra / Telefone Vivo', category: 'Moradia & Condomínio' },
  '02.558.157/0001-62': { name: 'Telefônica Brasil (Vivo)', billName: 'Internet Fibra / Telefone Vivo', category: 'Moradia & Condomínio' },
  '00360305000104': { name: 'Caixa Econômica Federal', billName: 'Financiamento Imobiliário Caixa', category: 'Financiamentos & Empréstimos' },
  '00.360.305/0001-04': { name: 'Caixa Econômica Federal', billName: 'Financiamento Imobiliário Caixa', category: 'Financiamentos & Empréstimos' },
  '12345678000190': { name: 'Administradora Predial Alfa', billName: 'Taxa de Condomínio', category: 'Moradia & Condomínio' },
  '12.345.678/0001-90': { name: 'Administradora Predial Alfa', billName: 'Taxa de Condomínio', category: 'Moradia & Condomínio' },
  '60701190000104': { name: 'Banco Itaú Unibanco', billName: 'Fatura Cartão de Crédito Itaú', category: 'Financiamentos & Empréstimos' },
  '60.701.190/0001-04': { name: 'Banco Itaú Unibanco', billName: 'Fatura Cartão de Crédito Itaú', category: 'Financiamentos & Empréstimos' },
  '60746948000112': { name: 'Banco Bradesco S.A.', billName: 'Financiamento / Cartão Bradesco', category: 'Financiamentos & Empréstimos' },
  '60.746.948/0001-12': { name: 'Banco Bradesco S.A.', billName: 'Financiamento / Cartão Bradesco', category: 'Financiamentos & Empréstimos' },
};

// Helper: Parse TLV (Tag-Length-Value)
function parseTLV(payload: string): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  while (i < payload.length - 4) {
    const tag = payload.substring(i, i + 2);
    const lengthStr = payload.substring(i + 2, i + 4);
    const length = parseInt(lengthStr, 10);
    if (isNaN(length) || length < 0 || i + 4 + length > payload.length) {
      break;
    }
    const value = payload.substring(i + 4, i + 4 + length);
    result[tag] = value;
    i += 4 + length;
  }
  return result;
}

// Helper: Format raw string into Title Case
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 's/a', 'sa', 'ltda'].includes(word)) {
        return word === 's/a' || word === 'sa' ? 'S.A.' : word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Clean company / beneficiary name by separating it from amounts, prices, and labels
export function sanitizeCompanyName(raw: string): string {
  if (!raw) return '';

  let cleaned = raw
    // Remove labels like Cedente:, Beneficiário:, Empresa:, etc.
    .replace(/^(?:cedente|benefici[aá]rio|favorecido|empresa|nome(?:\s+fantasia)?|raz[aã]o\s+social|sacador|recebedor|pagar\s+(?:a|para))[:\s-]+/i, '')
    // Remove any currency amounts like R$ 150,00, R$150.00, BRL 150,00, 150,00
    .replace(/(?:valor\s*(?:total|do\s*documento|cobrado)?[:\s]*)?R?\$?\s*[\d]{1,3}(?:\.[\d]{3})*(?:,\d{2})/gi, '')
    .replace(/(?:valor\s*(?:total|do\s*documento|cobrado)?[:\s]*)?R?\$?\s*[\d]+(?:\.[\d]{2})/gi, '')
    // Remove standalone labels like "Valor: ...", "Total: ..."
    .replace(/valor\s*(?:total|do\s*documento|cobrado)?[:\s]*[\d.,]*/gi, '')
    .replace(/total[:\s]*[\d.,]*/gi, '')
    // Remove explicit date mentions like "Vencimento: 15/10/2026"
    .replace(/(?:vencimento|vence\s*(?:em)?|venc\.?)[:\s]*\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?/gi, '')
    // Remove CPF / CNPJ strings if concatenated
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '')
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '')
    // Clean trailing or leading punctuation/separators
    .replace(/^[\s\-•/|:,]+|[\s\-•/|:,]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned ? toTitleCase(cleaned) : '';
}

// Helper: Extract due date from free text, barcodes, or Pix payloads
export function extractDueDate(text: string, fallbackMonth?: string): string | undefined {
  if (!text) return undefined;

  // 1. Explicit labels like "Vencimento: 15/10/2026", "Vence em: 2026-10-15", "Venc: 10/10"
  const explicitMatch = text.match(/(?:vencimento|vence\s*(?:em)?|venc\.?|data\s*de\s*vencimento|validade|limite|pagar\s*at[eé])[:\s]*(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/i);
  if (explicitMatch) {
    const day = explicitMatch[1].padStart(2, '0');
    const month = explicitMatch[2].padStart(2, '0');
    let year = explicitMatch[3];
    if (!year) {
      const now = new Date();
      year = String(now.getFullYear());
    } else if (year.length === 2) {
      year = '20' + year;
    }
    return `${year}-${month}-${day}`;
  }

  // 2. Look for date in ISO format (YYYY-MM-DD)
  const isoMatch = text.match(/20\d{2}[-/.]\d{2}[-/.]\d{2}/);
  if (isoMatch) {
    return isoMatch[0].replace(/[./]/g, '-');
  }

  // 3. General DD/MM/YYYY or DD-MM-YYYY
  const genericDateMatch = text.match(/(\d{2})[\/.-](\d{2})[\/.-](20\d{2})/);
  if (genericDateMatch) {
    return `${genericDateMatch[3]}-${genericDateMatch[2]}-${genericDateMatch[1]}`;
  }

  // 4. Pix Boleto (Pix Cobrança com Vencimento) - Look for 8-digit date representation (YYYYMMDD)
  const date8Match = text.match(/\b(20\d{2})(0[1-9]|1[0-2])([0-2][0-9]|3[01])\b/);
  if (date8Match) {
    return `${date8Match[1]}-${date8Match[2]}-${date8Match[3]}`;
  }

  // 5. Linha digitável (47 dígitos) fator de vencimento
  const cleanDigits = text.replace(/[^\d]/g, '');
  if (cleanDigits.length === 47 && !cleanDigits.startsWith('8')) {
    // Digits 34 to 37 are the 4-digit factor of due date
    const factorStr = cleanDigits.substring(33, 37);
    const factor = parseInt(factorStr, 10);
    if (!isNaN(factor) && factor >= 1000) {
      // Base date rollover logic (Febraban / BACEN):
      // Initial base: 07/10/1997. After factor 9999 (21/02/2025), new cycle began on 22/02/2025 with factor 1000.
      let baseDate = new Date(1997, 9, 7); // Oct 7, 1997
      let dueDateCalc = new Date(baseDate.getTime() + factor * 24 * 60 * 60 * 1000);
      if (dueDateCalc.getFullYear() < 2025) {
        // Rolled over into current cycle
        const newBase = new Date(2025, 1, 22); // Feb 22, 2025
        dueDateCalc = new Date(newBase.getTime() + (factor - 1000) * 24 * 60 * 60 * 1000);
      }
      return dueDateCalc.toISOString().slice(0, 10);
    }
  }

  return undefined;
}

// Categorize beneficiary based on name or keywords
function inferCategoryAndBillName(companyName: string): { category: string; billName: string } {
  const smartCat = inferCategoryFromName(companyName);
  if (smartCat) {
    let billName = `Conta - ${toTitleCase(companyName)}`;
    if (smartCat.id === 'financiamento') {
      billName = `Financiamento / Parcela (${toTitleCase(companyName)})`;
    } else if (smartCat.id === 'energia') {
      billName = `Conta de Luz (${toTitleCase(companyName)})`;
    } else if (smartCat.id === 'agua') {
      billName = `Conta de Água (${toTitleCase(companyName)})`;
    } else if (smartCat.id === 'gas') {
      billName = `Conta de Gás (${toTitleCase(companyName)})`;
    } else if (smartCat.id === 'moradia') {
      billName = `Moradia / Condomínio (${toTitleCase(companyName)})`;
    } else if (smartCat.id === 'internet') {
      billName = `Internet / Telecom (${toTitleCase(companyName)})`;
    } else if (smartCat.id === 'cartao') {
      billName = `Fatura do Cartão (${toTitleCase(companyName)})`;
    } else if (smartCat.id === 'alimentacao') {
      billName = `Supermercado (${toTitleCase(companyName)})`;
    } else if (smartCat.id === 'saude') {
      billName = `Saúde / Farmácia (${toTitleCase(companyName)})`;
    } else if (smartCat.id === 'educacao') {
      billName = `Educação (${toTitleCase(companyName)})`;
    } else if (smartCat.id === 'transporte') {
      billName = `Transporte (${toTitleCase(companyName)})`;
    }
    return { category: smartCat.name, billName };
  }

  return {
    category: 'Outras Despesas',
    billName: `Conta - ${toTitleCase(companyName)}`,
  };
}

export function parsePixInput(rawText: string): ParsedPixResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { detected: false, pixType: 'Pix Copia e Cola', message: 'Nenhum dado informado.' };
  }

  // 1. Pix Copia e Cola / EMV QR Code (starts with 000201)
  if (trimmed.startsWith('000201') || trimmed.includes('000201')) {
    const emvStartIndex = trimmed.indexOf('000201');
    const emvString = trimmed.substring(emvStartIndex);
    const tags = parseTLV(emvString);

    let companyName = tags['59'] ? toTitleCase(tags['59'].trim()) : '';
    let amount: number | undefined = undefined;
    let city = tags['60'] ? toTitleCase(tags['60'].trim()) : undefined;
    let txid: string | undefined = undefined;
    let extractedPixKey: string | undefined = undefined;
    let dueDate: string | undefined = extractDueDate(trimmed) || extractDueDate(emvString);

    // Amount tag 54
    if (tags['54']) {
      const parsed = parseFloat(tags['54']);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      }
    }

    // Subtags inside Tag 26 (Merchant Account Info)
    if (tags['26']) {
      const sub26 = parseTLV(tags['26']);
      if (sub26['01']) {
        extractedPixKey = sub26['01'].trim();
      }
    }

    // Subtags inside Tag 62 (Additional Data)
    if (tags['62']) {
      const sub62 = parseTLV(tags['62']);
      if (sub62['05']) {
        txid = sub62['05'].trim();
      }
    }

    // Check if extractedPixKey matches known beneficiaries
    if (extractedPixKey && KNOWN_BENEFICIARIES[extractedPixKey]) {
      const known = KNOWN_BENEFICIARIES[extractedPixKey];
      if (!companyName) companyName = known.name;
    }

    const { category, billName } = companyName ? inferCategoryAndBillName(companyName) : { category: 'Outras Despesas', billName: 'Conta via Pix' };

    return {
      detected: true,
      pixType: 'Pix Copia e Cola',
      favored: companyName || 'Beneficiário Pix',
      amount,
      dueDate,
      category,
      billName,
      pixKey: trimmed,
      city,
      txid,
      message: `✨ Pix Copia e Cola identificado com sucesso! Empresa: ${companyName || 'Identificada'} ${amount ? `• Valor: R$ ${amount.toFixed(2).replace('.', ',')}` : ''}${dueDate ? ` • Vencimento: ${dueDate.split('-').reverse().join('/')}` : ''}`,
    };
  }

  // Common extracted date and amount from message text if user pasted an entire Pix WhatsApp or bank receipt
  const parsedDueDate = extractDueDate(trimmed);

  // 2. Direct CNPJ or Formatted CNPJ
  const cnpjClean = trimmed.replace(/[^\d]/g, '');
  if (cnpjClean.length === 14) {
    const formatted = `${cnpjClean.slice(0, 2)}.${cnpjClean.slice(2, 5)}.${cnpjClean.slice(5, 8)}/${cnpjClean.slice(8, 12)}-${cnpjClean.slice(12, 14)}`;
    const known = KNOWN_BENEFICIARIES[cnpjClean] || KNOWN_BENEFICIARIES[formatted];

    if (known) {
      return {
        detected: true,
        pixType: 'CNPJ',
        favored: known.name,
        category: known.category,
        billName: known.billName,
        pixKey: formatted,
        dueDate: parsedDueDate,
        message: `✨ Empresa identificada por CNPJ: ${known.name}${parsedDueDate ? ` • Venc: ${parsedDueDate.split('-').reverse().join('/')}` : ''}`,
      };
    }

    return {
      detected: true,
      pixType: 'CNPJ',
      favored: `Empresa (CNPJ ${formatted})`,
      category: 'Outras Despesas',
      billName: 'Despesa PJ',
      pixKey: formatted,
      dueDate: parsedDueDate,
      message: `✨ Chave Pix CNPJ detectada: ${formatted}`,
    };
  }

  // 3. E-mail Pix Key
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const emailMatch = trimmed.match(emailRegex);
  if (emailMatch) {
    const email = emailMatch[1];
    const domain = email.split('@')[1]?.toLowerCase() || '';
    let favored = 'Beneficiário Pix';

    if (domain.includes('enel')) favored = 'Enel Distribuição';
    else if (domain.includes('sabesp')) favored = 'Sabesp São Paulo';
    else if (domain.includes('comgas')) favored = 'Comgás São Paulo';
    else if (domain.includes('claro')) favored = 'Claro Brasil S.A.';
    else if (domain.includes('vivo') || domain.includes('telefonica')) favored = 'Telefônica Brasil (Vivo)';
    else if (domain.includes('caixa')) favored = 'Caixa Econômica Federal';
    else if (domain.includes('condominio')) favored = 'Administradora de Condomínio';
    else {
      const parts = domain.split('.')[0];
      favored = toTitleCase(parts);
    }

    const { category, billName } = inferCategoryAndBillName(favored);

    return {
      detected: true,
      pixType: 'E-mail',
      favored,
      category,
      billName,
      pixKey: email,
      dueDate: parsedDueDate,
      message: `✨ Chave Pix de e-mail identificada para: ${favored}${parsedDueDate ? ` • Venc: ${parsedDueDate.split('-').reverse().join('/')}` : ''}`,
    };
  }

  // 4. Check for Copied Text with "Valor R$" and "Vencimento" (like shared invoice text)
  const amountMatch = trimmed.match(/R\$\s*([0-9.,]+)/i) || trimmed.match(/valor[:\s]+R?\$?\s*([0-9.,]+)/i);
  let parsedAmount: number | undefined;
  if (amountMatch) {
    const rawVal = amountMatch[1].replace(/\./g, '').replace(',', '.');
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 0) {
      parsedAmount = num;
    }
  }

  // 5. CPF (11 digits)
  const cpfClean = trimmed.replace(/[^\d]/g, '');
  if (cpfClean.length === 11) {
    const formatted = `${cpfClean.slice(0, 3)}.${cpfClean.slice(3, 6)}.${cpfClean.slice(6, 9)}-${cpfClean.slice(9, 11)}`;
    return {
      detected: true,
      pixType: 'CPF',
      favored: 'Pessoa Física',
      category: 'Outras Despesas',
      billName: 'Transferência / Pagamento',
      pixKey: formatted,
      amount: parsedAmount,
      dueDate: parsedDueDate,
      message: `✨ Chave Pix CPF identificada: ${formatted}`,
    };
  }

  // 6. Mobile phone (+55 or 11 digits)
  if (trimmed.startsWith('+55') || (cpfClean.length >= 10 && cpfClean.length <= 11 && (trimmed.includes('(') || trimmed.includes('-')))) {
    return {
      detected: true,
      pixType: 'Celular',
      favored: 'Contato / Fornecedor',
      category: 'Outras Despesas',
      billName: 'Pagamento via Celular',
      pixKey: trimmed,
      amount: parsedAmount,
      dueDate: parsedDueDate,
      message: `✨ Chave Pix de Celular identificada`,
    };
  }

  // 7. Random key (UUID / EVP)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return {
      detected: true,
      pixType: 'Aleatória',
      favored: 'Beneficiário Pix (Chave Aleatória)',
      category: 'Outras Despesas',
      billName: 'Pagamento Pix',
      pixKey: trimmed,
      amount: parsedAmount,
      dueDate: parsedDueDate,
      message: `✨ Chave Pix Aleatória EVP identificada`,
    };
  }

  // Fallback
  return {
    detected: false,
    pixType: 'Pix Copia e Cola',
    pixKey: trimmed,
    amount: parsedAmount,
    dueDate: parsedDueDate,
    message: 'Chave informada.',
  };
}

// Master Extractor: Processes raw scanned text, boletos, and Pix codes,
// strictly separating the company name from the total amount,
// and automatically extracting and prefilling the due date.
export function parseScannedBoletoOrPix(
  input: Partial<{
    id: string;
    name: string;
    amount: number;
    dueDate: string;
    category: string;
    favored: string;
    barcode: string;
    pixKey: string;
    pixType: string;
    notes: string;
    [key: string]: any;
  }> | string,
  fallbackMonth?: string
): {
  id?: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  favored: string;
  barcode?: string;
  pixKey?: string;
  pixType?: string;
  notes?: string;
  recurrence?: string;
  fixedValueType?: 'fixed_value' | 'variable_value';
  splitHousehold?: boolean;
} {
  // If string input, parse it
  if (typeof input === 'string') {
    const rawText = input.trim();
    const pixResult = parsePixInput(rawText);

    // Extract amount
    let amount = pixResult.amount || 0;
    if (!amount) {
      const amountMatch = rawText.match(/R\$\s*([0-9.,]+)/i) || rawText.match(/valor[:\s]+R?\$?\s*([0-9.,]+)/i);
      if (amountMatch) {
        const rawVal = amountMatch[1].replace(/\./g, '').replace(',', '.');
        const num = parseFloat(rawVal);
        if (!isNaN(num) && num > 0) amount = num;
      }
    }

    // Extract barcode if present
    const cleanNumbers = rawText.replace(/[^\d]/g, '');
    let detectedBarcode: string | undefined;
    if (cleanNumbers.length >= 44 && cleanNumbers.length <= 48) {
      detectedBarcode = cleanNumbers;
      const barcodeParsed = parseBarcodeBoleto(rawText, fallbackMonth);
      if (barcodeParsed.detected) {
        return {
          name: barcodeParsed.billName || 'Boleto Bancário',
          amount: barcodeParsed.amount || amount,
          dueDate: barcodeParsed.dueDate || `${fallbackMonth || '2026-09'}-10`,
          category: barcodeParsed.category || 'Outras Despesas',
          favored: barcodeParsed.favored || 'Beneficiário do Boleto',
          barcode: detectedBarcode,
          pixKey: pixResult.pixKey,
          pixType: pixResult.pixType,
          notes: barcodeParsed.message || 'Código de barras lido e identificado com sucesso.',
          recurrence: barcodeParsed.recurrence || 'Mensal Fixa',
          fixedValueType: barcodeParsed.fixedValueType,
          splitHousehold: false,
        };
      }
    }

    // Extract due date
    const dueDate = extractDueDate(rawText, fallbackMonth) || `${fallbackMonth || '2026-09'}-10`;

    // Isolate Company / Favored name cleanly from amounts and labels
    let rawCompany = pixResult.favored || '';
    if (!rawCompany || rawCompany === 'Beneficiário Pix' || rawCompany === 'Pessoa Física') {
      const companyMatch = rawText.match(/(?:benefici[aá]rio|cedente|empresa|favorecido|sacador|recebedor)[:\s]+([^,\n\r]+)/i);
      if (companyMatch) {
        rawCompany = companyMatch[1];
      }
    }
    const cleanFavored = sanitizeCompanyName(rawCompany) || 'Empresa / Prestador';
    const { category, billName } = inferCategoryAndBillName(cleanFavored);

    return {
      name: billName || `Conta (${cleanFavored})`,
      amount,
      dueDate,
      category: pixResult.category || category,
      favored: cleanFavored,
      barcode: detectedBarcode,
      pixKey: pixResult.pixKey || (rawText.length < 100 ? rawText : undefined),
      pixType: pixResult.pixType,
      notes: `Processado com IA: Empresa e valor separados com precisão. Vencimento identificado em ${dueDate.split('-').reverse().join('/')}.`,
      recurrence: 'Mensal Fixa',
      splitHousehold: false,
    };
  }

  // If object input (e.g. from scanner modal)
  const combinedText = [
    input.name || '',
    input.favored || '',
    input.barcode || '',
    input.pixKey || '',
    input.notes || '',
  ].join(' ');

  // 1. Separate Company Identification from Amount
  let cleanFavored = sanitizeCompanyName(input.favored || input.name || '');
  if (!cleanFavored) {
    cleanFavored = 'Empresa / Concessionária';
  }

  // 2. Extract numeric amount
  let cleanAmount = typeof input.amount === 'number' && input.amount > 0 ? input.amount : 0;
  if (!cleanAmount) {
    const amountMatch = combinedText.match(/R\$\s*([0-9.,]+)/i) || combinedText.match(/valor[:\s]+R?\$?\s*([0-9.,]+)/i);
    if (amountMatch) {
      const rawVal = amountMatch[1].replace(/\./g, '').replace(',', '.');
      const num = parseFloat(rawVal);
      if (!isNaN(num) && num > 0) cleanAmount = num;
    }
  }

  // 3. Extract and enforce valid Due Date
  let cleanDueDate = input.dueDate;
  if (!cleanDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDueDate)) {
    cleanDueDate = extractDueDate(combinedText, fallbackMonth);
  }
  if (!cleanDueDate) {
    cleanDueDate = `${fallbackMonth || '2026-09'}-10`;
  }

  // 4. Generate clean Bill Name (ensuring amount is NOT in the name)
  let cleanName = sanitizeCompanyName(input.name || '');
  if (!cleanName || cleanName === cleanFavored) {
    const inferred = inferCategoryAndBillName(cleanFavored);
    cleanName = inferred.billName;
  }

  // 5. Category inference
  let category = input.category;
  if (!category || category === 'Outras Despesas') {
    const inferred = inferCategoryAndBillName(cleanFavored);
    category = inferred.category;
  }

  return {
    id: typeof input === 'object' && input && 'id' in input ? (input as any).id : undefined,
    name: cleanName,
    amount: cleanAmount,
    dueDate: cleanDueDate,
    category,
    favored: cleanFavored,
    barcode: input.barcode,
    pixKey: input.pixKey,
    pixType: input.pixType || 'Pix Copia e Cola',
    notes: input.notes || `Leitura com IA: Vencimento ${cleanDueDate.split('-').reverse().join('/')} e valor R$ ${cleanAmount.toFixed(2).replace('.', ',')} identificados.`,
    recurrence: input.recurrence || 'Mensal Fixa',
    splitHousehold: input.splitHousehold !== undefined ? input.splitHousehold : false,
  };
}

export const BRAZILIAN_BANKS: Record<string, { name: string; category: string; defaultName: string }> = {
  '001': { name: 'Banco do Brasil S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Banco do Brasil' },
  '033': { name: 'Banco Santander (Brasil) S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Santander' },
  '104': { name: 'Caixa Econômica Federal', category: 'Financiamentos & Empréstimos', defaultName: 'Financiamento / Boleto Caixa' },
  '237': { name: 'Banco Bradesco S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Bradesco' },
  '341': { name: 'Banco Itaú Unibanco S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Itaú' },
  '260': { name: 'Nubank (Nu Pagamentos S.A.)', category: 'Financiamentos & Empréstimos', defaultName: 'Fatura Nubank' },
  '077': { name: 'Banco Inter S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Banco Inter' },
  '212': { name: 'Banco Original S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Banco Original' },
  '336': { name: 'Banco C6 S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto C6 Bank' },
  '422': { name: 'Banco Safra S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Safra' },
  '748': { name: 'Sicredi (Banco Cooperativo)', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Sicredi' },
  '756': { name: 'Sicoob (Bancoob)', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Sicoob' },
  '655': { name: 'Banco Votorantim S.A. (BV)', category: 'Financiamentos & Empréstimos', defaultName: 'Financiamento BV' },
  '208': { name: 'Banco BTG Pactual S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto BTG Pactual' },
  '041': { name: 'Banrisul S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Banrisul' },
  '070': { name: 'BRB - Banco de Brasília', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto BRB' },
  '623': { name: 'Banco PAN S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Financiamento / Boleto PAN' },
  '389': { name: 'Banco Mercantil do Brasil S.A.', category: 'Financiamentos & Empréstimos', defaultName: 'Boleto Mercantil' },
};

export interface ParsedBarcodeResult {
  detected: boolean;
  amount?: number;
  dueDate?: string;
  hasEncodedDueDate?: boolean;
  favored?: string;
  category?: string;
  billName?: string;
  bankName?: string;
  type?: 'boleto_bancario' | 'concessionaria' | 'outro';
  recurrence?: 'Mensal Fixa' | 'Parcelada' | 'Única / Pontual';
  fixedValueType?: 'fixed_value' | 'variable_value';
  message?: string;
}

// Automatic Barcode / Linha Digitável Parser - Extracts All Bill Details
export function parseBarcodeBoleto(rawBarcode: string, fallbackMonth?: string): ParsedBarcodeResult {
  if (!rawBarcode || typeof rawBarcode !== 'string') {
    return { detected: false, message: 'Código de barras vazio.' };
  }

  const clean = rawBarcode.replace(/[^\d]/g, '');
  if (!clean || clean.length < 15) {
    return { detected: false, message: 'Código de barras muito curto.' };
  }

  const effectiveMonth = fallbackMonth || new Date().toISOString().slice(0, 7);

  // Helper to convert Bacen factor to Date string
  const factorToDate = (factor: number): string | undefined => {
    if (isNaN(factor) || factor < 1000) return undefined;
    // Base Bacen: 07/10/1997.
    // Ciclo 1: de 07/10/1997 até 21/02/2025 (fator 9999 atingido em 21/02/2025).
    // Ciclo 2: a partir de 22/02/2025 o fator reinicia em 1000.
    const base1 = new Date(Date.UTC(1997, 9, 7));
    const target1 = new Date(base1.getTime() + factor * 24 * 60 * 60 * 1000);
    
    // Se a data calculada for anterior a 2025 e hoje estamos em 2025+, aplica novo ciclo
    const nowYear = new Date().getFullYear();
    if (target1.getUTCFullYear() < 2024 || (target1.getUTCFullYear() < nowYear && factor <= 3000)) {
      const base2 = new Date(Date.UTC(2025, 1, 22));
      const target2 = new Date(base2.getTime() + (factor - 1000) * 24 * 60 * 60 * 1000);
      return target2.toISOString().slice(0, 10);
    }
    return target1.toISOString().slice(0, 10);
  };

  // Inspect any surrounding text for company names or explicit dates/amounts
  const lowerText = rawBarcode.toLowerCase();
  const textDateMatch = rawBarcode.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
  const textDueDate = textDateMatch ? `${textDateMatch[3]}-${textDateMatch[2]}-${textDateMatch[1]}` : undefined;

  let textAmount: number | undefined;
  const textValMatch = rawBarcode.match(/R\$\s*([0-9.,]+)/i) || rawBarcode.match(/valor[:\s]+R?\$?\s*([0-9.,]+)/i);
  if (textValMatch) {
    const parsed = parseFloat(textValMatch[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) textAmount = parsed;
  }

  // 1. BOLETO BANCÁRIO - Linha Digitável (47 dígitos)
  if (clean.length === 47 && !clean.startsWith('8')) {
    const bankCode = clean.substring(0, 3);
    const bankInfo = BRAZILIAN_BANKS[bankCode] || {
      name: `Banco (Cód. ${bankCode})`,
      category: 'Financiamentos & Empréstimos',
      defaultName: `Boleto Bancário (${bankCode})`,
    };

    // Fator de vencimento (posições 33 a 36 inclusive, 4 dígitos)
    const factorStr = clean.substring(33, 37);
    const factor = parseInt(factorStr, 10);
    let calculatedDueDate = factorToDate(factor) || textDueDate;
    if (!calculatedDueDate) {
      calculatedDueDate = `${effectiveMonth}-10`;
    }

    // Valor (posições 37 a 46 inclusive, 10 dígitos com 2 casas decimais)
    const valueStr = clean.substring(37, 47);
    const cents = parseInt(valueStr, 10);
    const amount = (!isNaN(cents) && cents > 0) ? cents / 100 : (textAmount || undefined);

    let favored = bankInfo.name;
    let billName = bankInfo.defaultName;
    let category = bankInfo.category;

    // Detect if text mentions specific service/company
    if (lowerText.includes('condom')) {
      billName = 'Taxa Condominial';
      category = 'Moradia & Condomínio';
      favored = 'Administradora de Condomínio';
    } else if (lowerText.includes('aluguel') || lowerText.includes('imobil')) {
      billName = 'Aluguel Residencial';
      category = 'Moradia & Condomínio';
      favored = 'Imobiliária / Locador';
    } else if (lowerText.includes('unimed') || lowerText.includes('saúde') || lowerText.includes('saude') || lowerText.includes('plano')) {
      billName = 'Plano de Saúde';
      category = 'Saúde & Farmácia';
      favored = 'Operadora de Saúde';
    } else if (lowerText.includes('escola') || lowerText.includes('faculdade') || lowerText.includes('curso')) {
      billName = 'Mensalidade Escolar';
      category = 'Educação';
      favored = 'Instituição de Ensino';
    } else if (lowerText.includes('seguro')) {
      billName = 'Seguro Residencial / Auto';
      category = 'Transporte & Combustível';
      favored = 'Seguradora';
    }

    return {
      detected: true,
      type: 'boleto_bancario',
      amount,
      dueDate: calculatedDueDate,
      hasEncodedDueDate: true,
      favored,
      category,
      billName,
      bankName: bankInfo.name,
      recurrence: 'Mensal Fixa',
      fixedValueType: amount && amount > 0 ? 'fixed_value' : 'variable_value',
      message: `✨ Boleto identificado: ${billName} • ${favored}${amount ? ` • R$ ${amount.toFixed(2).replace('.', ',')}` : ''} • Vencimento: ${calculatedDueDate.split('-').reverse().join('/')}`,
    };
  }

  // 2. BOLETO BANCÁRIO - Código de Barras (44 dígitos)
  if (clean.length === 44 && !clean.startsWith('8')) {
    const bankCode = clean.substring(0, 3);
    const bankInfo = BRAZILIAN_BANKS[bankCode] || {
      name: `Banco (Cód. ${bankCode})`,
      category: 'Financiamentos & Empréstimos',
      defaultName: `Boleto Bancário (${bankCode})`,
    };

    const factorStr = clean.substring(5, 9);
    const factor = parseInt(factorStr, 10);
    let calculatedDueDate = factorToDate(factor) || textDueDate;
    if (!calculatedDueDate) {
      calculatedDueDate = `${effectiveMonth}-10`;
    }

    const valueStr = clean.substring(9, 19);
    const cents = parseInt(valueStr, 10);
    const amount = (!isNaN(cents) && cents > 0) ? cents / 100 : (textAmount || undefined);

    let favored = bankInfo.name;
    let billName = bankInfo.defaultName;
    let category = bankInfo.category;

    if (lowerText.includes('condom')) {
      billName = 'Taxa Condominial';
      category = 'Moradia & Condomínio';
      favored = 'Administradora de Condomínio';
    }

    return {
      detected: true,
      type: 'boleto_bancario',
      amount,
      dueDate: calculatedDueDate,
      hasEncodedDueDate: true,
      favored,
      category,
      billName,
      bankName: bankInfo.name,
      recurrence: 'Mensal Fixa',
      fixedValueType: amount && amount > 0 ? 'fixed_value' : 'variable_value',
      message: `✨ Boleto bancário reconhecido: ${billName} • ${favored}${amount ? ` • R$ ${amount.toFixed(2).replace('.', ',')}` : ''} • Vencimento: ${calculatedDueDate.split('-').reverse().join('/')}`,
    };
  }

  // 3. CONCESSIONÁRIAS E SERVIÇOS PÚBLICOS (Começam com 8 - 48 dígitos ou 44 dígitos)
  if (clean.startsWith('8') && (clean.length === 48 || clean.length === 44)) {
    const segment = clean.charAt(1);
    let category = 'Outras Despesas';
    let billName = 'Conta de Concessionária';
    let favored = 'Concessionária de Serviços Públicos';

    if (segment === '1') {
      category = 'Outras Despesas';
      billName = 'IPTU / Taxa Municipal';
      favored = 'Prefeitura Municipal';
    } else if (segment === '2') {
      category = 'Água & Saneamento';
      billName = 'Conta de Água e Saneamento (Sabesp)';
      favored = 'Companhia de Água e Esgoto (Sabesp)';
    } else if (segment === '3') {
      category = 'Energia Elétrica (Luz)';
      billName = 'Conta de Luz / Energia Elétrica (Enel)';
      favored = 'Distribuidora de Energia (Enel/CPFL/Light)';
    } else if (segment === '4') {
      category = 'Internet, TV & Telefonia';
      billName = 'Internet / Telefonia (Vivo/Claro)';
      favored = 'Operadora de Telecomunicações';
    } else if (segment === '5') {
      category = 'Outras Despesas';
      billName = 'Taxa Governamental / GRU';
      favored = 'Receita Federal / Governo';
    } else if (segment === '6') {
      category = 'Moradia & Condomínio';
      billName = 'Carnê / Taxa Residencial';
      favored = 'Administradora Residencial';
    } else if (segment === '7') {
      category = 'Transporte & Combustível';
      billName = 'IPVA / Multa de Trânsito';
      favored = 'Detran / Órgão de Trânsito';
    }

    // Refine with text keywords if available
    if (lowerText.includes('sabesp') || lowerText.includes('sanepar') || lowerText.includes('copasa') || lowerText.includes('água') || lowerText.includes('agua')) {
      billName = 'Conta de Água e Esgoto';
      favored = lowerText.includes('sabesp') ? 'Sabesp - Cia de Saneamento SP' : 'Companhia de Água e Saneamento';
      category = 'Água & Saneamento';
    } else if (lowerText.includes('enel') || lowerText.includes('cpfl') || lowerText.includes('light') || lowerText.includes('cemig') || lowerText.includes('luz') || lowerText.includes('energia')) {
      billName = 'Conta de Luz / Energia Elétrica';
      favored = lowerText.includes('enel') ? 'Enel Distribuição SP' : (lowerText.includes('cpfl') ? 'CPFL Energia' : 'Distribuidora de Energia Elétrica');
      category = 'Energia Elétrica (Luz)';
    } else if (lowerText.includes('comgás') || lowerText.includes('comgas') || lowerText.includes('gás') || lowerText.includes('gas')) {
      billName = 'Conta de Gás Encanado';
      favored = 'Comgás - Cia de Gás de SP';
      category = 'Gás (Encanado / Botijão)';
    } else if (lowerText.includes('vivo') || lowerText.includes('telefonica')) {
      billName = 'Vivo Fibra Residencial';
      favored = 'Telefônica Brasil S.A. (Vivo)';
      category = 'Internet, TV & Telefonia';
    } else if (lowerText.includes('claro') || lowerText.includes('net ')) {
      billName = 'Claro Fibra / Net Residencial';
      favored = 'Claro Brasil S.A.';
      category = 'Internet, TV & Telefonia';
    } else if (lowerText.includes('tim')) {
      billName = 'TIM Ultrafibra';
      favored = 'TIM S.A.';
      category = 'Internet, TV & Telefonia';
    }

    // Extração do valor em concessionárias
    let amount: number | undefined = textAmount;
    let raw44 = clean;
    if (clean.length === 48) {
      // 4 blocos de 11 dígitos com 1 DV cada: remover os DVs nas posições 11, 23, 35, 47
      raw44 = clean.slice(0, 11) + clean.slice(12, 23) + clean.slice(24, 35) + clean.slice(36, 47);
    }
    
    const valStr = raw44.substring(4, 15);
    const cents = parseInt(valStr, 10);
    if (!isNaN(cents) && cents > 0) {
      amount = cents / 100;
    }

    // Extração de data de vencimento em concessionárias (campo livre ou texto)
    let extractedDueDate: string | undefined = textDueDate;
    if (!extractedDueDate) {
      // Procura por data formato YYYYMMDD ou DDMMAAAA nos dígitos do campo livre (índice 15 a 43)
      const freeField = raw44.slice(15);
      const yyyymmdd = freeField.match(/(202[5-9])(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])/);
      if (yyyymmdd) {
        extractedDueDate = `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;
      } else {
        const ddmmyyyy = freeField.match(/(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])(202[5-9])/);
        if (ddmmyyyy) {
          extractedDueDate = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
        }
      }
    }

    if (!extractedDueDate) {
      extractedDueDate = `${effectiveMonth}-10`;
    }

    return {
      detected: true,
      type: 'concessionaria',
      amount,
      dueDate: extractedDueDate,
      hasEncodedDueDate: true,
      favored,
      category,
      billName,
      recurrence: 'Mensal Fixa',
      fixedValueType: amount && amount > 0 ? 'fixed_value' : 'variable_value',
      message: `✨ Concessionária reconhecida: ${billName} • ${favored}${amount ? ` • R$ ${amount.toFixed(2).replace('.', ',')}` : ''} • Vencimento: ${extractedDueDate.split('-').reverse().join('/')}`,
    };
  }

  // 4. Fallback genérico para códigos numéricos parciais (>= 20 dígitos)
  const inferredDueDate = textDueDate || `${effectiveMonth}-10`;
  const defaultBank = BRAZILIAN_BANKS[clean.slice(0, 3)]?.name || 'Beneficiário / Banco';

  return {
    detected: true,
    type: 'outro',
    billName: 'Boleto Bancário',
    favored: defaultBank,
    category: 'Outras Despesas',
    dueDate: inferredDueDate,
    hasEncodedDueDate: true,
    amount: textAmount,
    recurrence: 'Mensal Fixa',
    fixedValueType: textAmount && textAmount > 0 ? 'fixed_value' : 'variable_value',
    message: `✨ Código de barras reconhecido! Vencimento: ${inferredDueDate.split('-').reverse().join('/')}${textAmount ? ` • R$ ${textAmount.toFixed(2).replace('.', ',')}` : ''}`,
  };
}

