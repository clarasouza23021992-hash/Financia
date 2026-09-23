// Intelligent Brazilian Pix Parser (EMV QRCPS Copia e Cola & Standard Pix Keys)

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
  if (!text) return fallbackMonth ? `${fallbackMonth}-10` : undefined;

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

  // Fallback to active month default (e.g. 10th of the month)
  if (fallbackMonth) {
    return `${fallbackMonth}-10`;
  }

  return undefined;
}

// Categorize beneficiary based on name or keywords
function inferCategoryAndBillName(companyName: string): { category: string; billName: string } {
  const upper = companyName.toUpperCase();

  if (upper.includes('ENEL') || upper.includes('CPFL') || upper.includes('LIGHT') || upper.includes('CEMIG') || upper.includes('ELEKTRO') || upper.includes('EQUATORIAL') || upper.includes('ENERGIA') || upper.includes('LUZ')) {
    return { category: 'Energia Elétrica', billName: `Conta de Luz (${toTitleCase(companyName)})` };
  }
  if (upper.includes('SABESP') || upper.includes('SANEPAR') || upper.includes('COPASA') || upper.includes('EMBASA') || upper.includes('CORSAN') || upper.includes('AGUA') || upper.includes('ÁGUA') || upper.includes('SANEAMENTO')) {
    return { category: 'Água & Saneamento', billName: `Conta de Água (${toTitleCase(companyName)})` };
  }
  if (upper.includes('COMGAS') || upper.includes('COMGÁS') || upper.includes('NATURGY') || upper.includes('GAS') || upper.includes('GÁS') || upper.includes('ULTRAGAZ') || upper.includes('LIQUIGAS') || upper.includes('LIQUIGÁS')) {
    return { category: 'Gás', billName: `Conta de Gás (${toTitleCase(companyName)})` };
  }
  if (upper.includes('CONDOMINIO') || upper.includes('CONDOMÍNIO') || upper.includes('PREDIAL') || upper.includes('LELLO') || upper.includes('HABITATUS') || upper.includes('IMOBIL') || upper.includes('EDIFICIO') || upper.includes('EDIFÍCIO')) {
    return { category: 'Moradia & Condomínio', billName: 'Taxa de Condomínio' };
  }
  if (upper.includes('CLARO') || upper.includes('VIVO') || upper.includes('TIM') || upper.includes('OI') || upper.includes('FIBRA') || upper.includes('INTERNET') || upper.includes('TELECOM')) {
    return { category: 'Internet, TV & Telefonia', billName: `Internet / Telecom (${toTitleCase(companyName)})` };
  }
  if (upper.includes('CAIXA') || upper.includes('ITAU') || upper.includes('ITAÚ') || upper.includes('BRADESCO') || upper.includes('SANTANDER') || upper.includes('NUBANK') || upper.includes('BANCO') || upper.includes('FINANCIAMENTO') || upper.includes('EMPRESTIMO') || upper.includes('EMPRÉSTIMO')) {
    return { category: 'Financiamentos & Empréstimos', billName: `Financiamento / Parcela (${toTitleCase(companyName)})` };
  }
  if (upper.includes('MERCADO') || upper.includes('SUPERMERCADO') || upper.includes('ASSAI') || upper.includes('ASSAÍ') || upper.includes('ATACADAO') || upper.includes('ATACADÃO') || upper.includes('CARREFOUR') || upper.includes('PAO DE ACUCAR') || upper.includes('PÃO DE AÇÚCAR')) {
    return { category: 'Alimentação & Mercado', billName: `Mercado (${toTitleCase(companyName)})` };
  }
  if (upper.includes('DROGASIL') || upper.includes('DROGA RAIA') || upper.includes('FARMACIA') || upper.includes('FARMÁCIA') || upper.includes('UNIMED') || upper.includes('NOTREDAME') || upper.includes('SAUDE') || upper.includes('SAÚDE') || upper.includes('CLINICA') || upper.includes('CLÍNICA')) {
    return { category: 'Saúde & Farmácia', billName: `Saúde / Farmácia (${toTitleCase(companyName)})` };
  }
  if (upper.includes('COLEGIO') || upper.includes('COLÉGIO') || upper.includes('ESCOLA') || upper.includes('FACULDADE') || upper.includes('UNIVERSIDADE') || upper.includes('EDUCACAO') || upper.includes('EDUCAÇÃO')) {
    return { category: 'Educação', billName: `Mensalidade Escolar (${toTitleCase(companyName)})` };
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
      detectedBarcode = rawText;
      // If 47-digit bank boleto, extract cents if amount is not set
      if (cleanNumbers.length === 47 && !amount) {
        const centsStr = cleanNumbers.substring(37);
        const cents = parseInt(centsStr, 10);
        if (!isNaN(cents) && cents > 0) {
          amount = cents / 100;
        }
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
  favored?: string;
  category?: string;
  billName?: string;
  bankName?: string;
  type?: 'boleto_bancario' | 'concessionaria' | 'outro';
  message?: string;
}

// Automatic Barcode / Linha Digitável Parser
export function parseBarcodeBoleto(rawBarcode: string, fallbackMonth?: string): ParsedBarcodeResult {
  const clean = rawBarcode.replace(/[^\d]/g, '');
  if (!clean || clean.length < 20) {
    return { detected: false, message: 'Código de barras muito curto.' };
  }

  // Helper to convert Bacen factor to Date string
  const factorToDate = (factor: number): string | undefined => {
    if (isNaN(factor) || factor < 1000) return undefined;
    // Base Bacen: 07/10/1997. Fatores acima de 1000.
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

  // 1. BOLETO BANCÁRIO - Linha Digitável (47 dígitos)
  if (clean.length === 47 && !clean.startsWith('8')) {
    const bankCode = clean.substring(0, 3);
    const bankInfo = BRAZILIAN_BANKS[bankCode] || {
      name: `Banco Código ${bankCode}`,
      category: 'Financiamentos & Empréstimos',
      defaultName: `Boleto Bancário (Banco ${bankCode})`,
    };

    // Fator de vencimento (posições 33 a 36 inclusive, 4 dígitos)
    const factorStr = clean.substring(33, 37);
    const factor = parseInt(factorStr, 10);
    let calculatedDueDate = factorToDate(factor);

    if (!calculatedDueDate && fallbackMonth) {
      calculatedDueDate = `${fallbackMonth}-15`;
    }

    // Valor (posições 37 a 46 inclusive, 10 dígitos com 2 casas decimais)
    const valueStr = clean.substring(37, 47);
    const cents = parseInt(valueStr, 10);
    const amount = !isNaN(cents) && cents > 0 ? cents / 100 : undefined;

    return {
      detected: true,
      type: 'boleto_bancario',
      amount,
      dueDate: calculatedDueDate,
      favored: bankInfo.name,
      category: bankInfo.category,
      billName: bankInfo.defaultName,
      bankName: bankInfo.name,
      message: `✨ Boleto identificado: ${bankInfo.name}${amount ? ` • R$ ${amount.toFixed(2).replace('.', ',')}` : ''}${calculatedDueDate ? ` • Venc: ${calculatedDueDate.split('-').reverse().join('/')}` : ''}`,
    };
  }

  // 2. BOLETO BANCÁRIO - Código de Barras (44 dígitos)
  if (clean.length === 44 && !clean.startsWith('8')) {
    const bankCode = clean.substring(0, 3);
    const bankInfo = BRAZILIAN_BANKS[bankCode] || {
      name: `Banco Código ${bankCode}`,
      category: 'Financiamentos & Empréstimos',
      defaultName: `Boleto Bancário (Banco ${bankCode})`,
    };

    const factorStr = clean.substring(5, 9);
    const factor = parseInt(factorStr, 10);
    let calculatedDueDate = factorToDate(factor);

    if (!calculatedDueDate && fallbackMonth) {
      calculatedDueDate = `${fallbackMonth}-15`;
    }

    const valueStr = clean.substring(9, 19);
    const cents = parseInt(valueStr, 10);
    const amount = !isNaN(cents) && cents > 0 ? cents / 100 : undefined;

    return {
      detected: true,
      type: 'boleto_bancario',
      amount,
      dueDate: calculatedDueDate,
      favored: bankInfo.name,
      category: bankInfo.category,
      billName: bankInfo.defaultName,
      bankName: bankInfo.name,
      message: `✨ Boleto identificado: ${bankInfo.name}${amount ? ` • R$ ${amount.toFixed(2).replace('.', ',')}` : ''}${calculatedDueDate ? ` • Venc: ${calculatedDueDate.split('-').reverse().join('/')}` : ''}`,
    };
  }

  // 3. CONCESSIONÁRIAS E SERVIÇOS PÚBLICOS (Começam com 8 - 48 dígitos ou 44 dígitos)
  if (clean.startsWith('8') && (clean.length === 48 || clean.length === 44)) {
    const segment = clean.charAt(1);
    let category = 'Água, Luz & Gás';
    let billName = 'Conta de Concessionária';
    let favored = 'Concessionária de Serviços Públicos';

    if (segment === '1') {
      category = 'Outras Despesas';
      billName = 'IPTU / Taxa Municipal';
      favored = 'Prefeitura / Órgão Público';
    } else if (segment === '2') {
      category = 'Água, Luz & Gás';
      billName = 'Conta de Água e Saneamento';
      favored = 'Companhia de Água e Esgoto (Sabesp)';
    } else if (segment === '3') {
      category = 'Água, Luz & Gás';
      billName = 'Conta de Luz / Energia Elétrica';
      favored = 'Distribuidora de Energia Elétrica (Enel/CPFL/Light)';
    } else if (segment === '4') {
      category = 'Moradia & Condomínio';
      billName = 'Internet / Telefonia Residencial';
      favored = 'Operadora de Telecomunicações (Vivo/Claro/Tim)';
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
      billName = 'Multa de Trânsito / IPVA';
      favored = 'Detran / Órgão de Trânsito';
    }

    // Extração do valor em concessionárias (dígitos 4 a 14 ou 4 a 15)
    let amount: number | undefined = undefined;
    if (clean.length === 48) {
      // 4 blocos de 11 dígitos com 1 DV cada: remover os DVs nas posições 11, 23, 35, 47
      const raw44 = clean.slice(0, 11) + clean.slice(12, 23) + clean.slice(24, 35) + clean.slice(36, 47);
      const valStr = raw44.substring(4, 15);
      const cents = parseInt(valStr, 10);
      if (!isNaN(cents) && cents > 0) {
        amount = cents / 100;
      }
    } else if (clean.length === 44) {
      const valStr = clean.substring(4, 15);
      const cents = parseInt(valStr, 10);
      if (!isNaN(cents) && cents > 0) {
        amount = cents / 100;
      }
    }

    const dueDate = fallbackMonth ? `${fallbackMonth}-10` : undefined;

    return {
      detected: true,
      type: 'concessionaria',
      amount,
      dueDate,
      favored,
      category,
      billName,
      message: `✨ Concessionária identificada: ${billName}${amount ? ` • R$ ${amount.toFixed(2).replace('.', ',')}` : ''}`,
    };
  }

  // 4. Fallback genérico para códigos numéricos parciais ou outros formatos
  if (clean.length >= 30) {
    const defaultDate = fallbackMonth ? `${fallbackMonth}-10` : new Date().toISOString().slice(0, 10);
    return {
      detected: true,
      type: 'outro',
      billName: 'Boleto Bancário',
      favored: 'Beneficiário do Boleto',
      category: 'Outras Despesas',
      dueDate: defaultDate,
      message: '✨ Linha digitável reconhecida. Complete os dados se necessário.',
    };
  }

  return {
    detected: false,
    message: 'Código de barras recebido (formato livre).',
  };
}

