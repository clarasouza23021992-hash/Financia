import { Bill, Revenue } from '../types/finance';

const months = [
  '2026-09',
  '2026-10',
  '2026-11',
  '2026-12',
  '2027-01',
  '2027-02',
  '2027-03',
  '2027-04',
  '2027-05',
  '2027-06',
  '2027-07',
  '2027-08',
  '2027-09',
  '2027-10',
  '2027-11',
  '2027-12',
];

const nowIso = new Date().toISOString();

export function generateCoupleData(): { bills: Bill[]; revenues: Revenue[] } {
  const allBills: Bill[] = [];
  const allRevenues: Revenue[] = [];

  months.forEach((m) => {
    // 1. Taxa de Condominio
    allBills.push({
      id: `bill-condominio-${m}`,
      name: 'Taxa de Condomínio',
      amount: 580.0,
      dueDate: `${m}-10`,
      category: 'Moradia & Condomínio',
      status: 'pending',
      recurrence: 'Mensal Fixa',
      favored: 'Administradora do Condomínio',
      notes: 'Boleto mensal do condomínio do casal.',
      barcode: '23793.38128 60000.123456 01000.654321 1 95400000058000',
      pixKey: 'condominio.financeiro@gestora.com.br',
      pixType: 'E-mail',
      splitHousehold: true,
      splitDetails: [
        { name: 'Carlos', percentage: 50, amount: 290.0 },
        { name: 'Paula', percentage: 50, amount: 290.0 },
      ],
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Carlos (iPhone)',
      isSynced: true,
      fixedValueType: 'fixed_value',
      isEdited: false,
    });

    // 2. Energia Eletrica (Enel)
    allBills.push({
      id: `bill-luz-${m}`,
      name: 'Energia Elétrica (Enel)',
      amount: 245.6,
      dueDate: `${m}-15`,
      category: 'Energia Elétrica (Luz)',
      status: 'pending',
      recurrence: 'Mensal Fixa',
      favored: 'Enel Distribuição',
      notes: 'Consumo de energia da residência.',
      barcode: '83660000002 45600048100 12345678901 23456789012',
      pixKey: 'financeiro.enel@eneldistribuicao.com.br',
      pixType: 'E-mail',
      splitHousehold: true,
      splitDetails: [
        { name: 'Carlos', percentage: 50, amount: 122.8 },
        { name: 'Paula', percentage: 50, amount: 122.8 },
      ],
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Carlos (iPhone)',
      isSynced: true,
      fixedValueType: 'variable_value',
      isEdited: false,
    });

    // 3. Gas Encanado (Comgas)
    allBills.push({
      id: `bill-gas-${m}`,
      name: 'Gás Encanado (Comgás)',
      amount: 85.4,
      dueDate: `${m}-18`,
      category: 'Gás (Encanado / Botijão)',
      status: 'pending',
      recurrence: 'Mensal Fixa',
      favored: 'Comgás',
      notes: 'Consumo mensal de gás.',
      barcode: '83620000000 85400030100 98765432100 12345678901',
      pixKey: 'atendimento@comgas.com.br',
      pixType: 'E-mail',
      splitHousehold: true,
      splitDetails: [
        { name: 'Carlos', percentage: 50, amount: 42.7 },
        { name: 'Paula', percentage: 50, amount: 42.7 },
      ],
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Paula (iPhone)',
      isSynced: true,
      fixedValueType: 'variable_value',
      isEdited: false,
    });

    // 4. Internet Fibra Optica
    allBills.push({
      id: `bill-internet-${m}`,
      name: 'Internet Fibra Óptica',
      amount: 139.9,
      dueDate: `${m}-20`,
      category: 'Internet, TV & Telefonia',
      status: 'pending',
      recurrence: 'Mensal Fixa',
      favored: 'Claro Fibra / Vivo',
      notes: 'Plano 600 Mega Residencial.',
      barcode: '34191.79001 01043.510047 91020.150008 4 95400000013990',
      pixKey: 'pix.cobranca@clarobrasil.com.br',
      pixType: 'E-mail',
      splitHousehold: true,
      splitDetails: [
        { name: 'Carlos', percentage: 50, amount: 69.95 },
        { name: 'Paula', percentage: 50, amount: 69.95 },
      ],
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Carlos (iPhone)',
      isSynced: true,
      fixedValueType: 'fixed_value',
      isEdited: false,
    });

    // 5. Financiamento Imobiliario / Aluguel
    allBills.push({
      id: `bill-moradia-${m}`,
      name: 'Financiamento Imobiliário / Aluguel',
      amount: 2450.0,
      dueDate: `${m}-10`,
      category: 'Financiamentos & Empréstimos',
      status: 'pending',
      recurrence: 'Mensal Fixa',
      favored: 'Caixa Econômica / Locador',
      notes: 'Parcela da moradia da família.',
      barcode: '10499.00123 45678.901234 56789.012345 1 95400000245000',
      pixKey: '11987654321',
      pixType: 'Celular',
      splitHousehold: true,
      splitDetails: [
        { name: 'Carlos', percentage: 50, amount: 1225.0 },
        { name: 'Paula', percentage: 50, amount: 1225.0 },
      ],
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Carlos (iPhone)',
      isSynced: true,
      fixedValueType: 'fixed_value',
      isEdited: false,
    });

    // 6. Supermercado & Feira do Mes
    allBills.push({
      id: `bill-mercado-${m}`,
      name: 'Supermercado & Feira do Mês',
      amount: 1650.0,
      dueDate: `${m}-08`,
      category: 'Alimentação & Supermercado',
      status: 'pending',
      recurrence: 'Mensal Fixa',
      favored: 'Supermercado Principal',
      notes: 'Compras essenciais do mês para a casa.',
      barcode: '',
      pixKey: 'financeiro@supermercadocasa.com.br',
      pixType: 'E-mail',
      splitHousehold: true,
      splitDetails: [
        { name: 'Carlos', percentage: 50, amount: 825.0 },
        { name: 'Paula', percentage: 50, amount: 825.0 },
      ],
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Paula (iPhone)',
      isSynced: true,
      fixedValueType: 'variable_value',
      isEdited: false,
    });

    // 7. Plano de Saude Familiar
    allBills.push({
      id: `bill-saude-${m}`,
      name: 'Plano de Saúde Familiar',
      amount: 980.0,
      dueDate: `${m}-25`,
      category: 'Saúde & Farmácia',
      status: 'pending',
      recurrence: 'Mensal Fixa',
      favored: 'Operadora de Saúde',
      notes: 'Mensalidade do plano de saúde do casal.',
      barcode: '03399.12345 67890.123456 78901.234567 8 95400000098000',
      pixKey: 'cobranca@planosaude.com.br',
      pixType: 'E-mail',
      splitHousehold: true,
      splitDetails: [
        { name: 'Carlos', percentage: 50, amount: 490.0 },
        { name: 'Paula', percentage: 50, amount: 490.0 },
      ],
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Carlos (iPhone)',
      isSynced: true,
      fixedValueType: 'fixed_value',
      isEdited: false,
    });

    // 8. Streaming & Assinaturas (Netflix / Spotify) - PAGA POR CARLOS
    const isPaidCarlos = m === '2026-10' || m === '2026-11';
    allBills.push({
      id: `bill-streaming-${m}`,
      name: 'Streaming & Assinaturas',
      amount: 69.9,
      dueDate: `${m}-12`,
      category: 'Lazer & Assinaturas',
      status: isPaidCarlos ? 'paid' : 'pending',
      paidAt: isPaidCarlos ? `${m}-05T12:00:00.000Z` : undefined,
      paidBy: isPaidCarlos ? 'Carlos' : undefined,
      lastEditedBy: isPaidCarlos ? 'Carlos' : undefined,
      lastEditedAt: isPaidCarlos ? `${m}-05T12:00:00.000Z` : undefined,
      lastActionDescription: isPaidCarlos ? 'Marcou como Pago' : undefined,
      recurrence: 'Mensal Fixa',
      favored: 'Netflix / Spotify Família',
      notes: 'Serviços de entretenimento digital da casa.',
      barcode: '',
      pixKey: 'assinaturas@spotify.com',
      pixType: 'E-mail',
      splitHousehold: true,
      splitDetails: [
        { name: 'Carlos', percentage: 50, amount: 34.95 },
        { name: 'Paula', percentage: 50, amount: 34.95 },
      ],
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Carlos (iPhone)',
      isSynced: true,
      fixedValueType: 'fixed_value',
      isEdited: isPaidCarlos,
    });

    // 9. Teste Luz (PAGA POR PAULA - R$ 150,00) - Confirmada nas notificações
    const isPaidPaula = m === '2026-10' || m === '2026-11';
    allBills.push({
      id: `bill-teste-luz-${m}`,
      name: 'Teste Luz',
      amount: 150.0,
      dueDate: `${m}-10`,
      category: 'Energia Elétrica (Luz)',
      status: isPaidPaula ? 'paid' : 'pending',
      paidAt: isPaidPaula ? '2026-10-08T22:46:32.140Z' : undefined,
      paidBy: isPaidPaula ? 'Paula' : undefined,
      lastEditedBy: isPaidPaula ? 'Paula' : undefined,
      lastEditedAt: isPaidPaula ? '2026-10-08T22:46:32.140Z' : undefined,
      lastActionDescription: isPaidPaula ? 'Marcou como Pago' : undefined,
      recurrence: 'Mensal Fixa',
      favored: 'Enel',
      notes: 'Conta de luz adicional cadastrada e quitada por Paula.',
      barcode: '83660000001 50000048100 12345678901 23456789012',
      pixKey: 'enel.sp@enel.com',
      pixType: 'E-mail',
      splitHousehold: true,
      splitDetails: [
        { name: 'Carlos', percentage: 50, amount: 75.0 },
        { name: 'Paula', percentage: 50, amount: 75.0 },
      ],
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Paula (iPhone)',
      isSynced: true,
      fixedValueType: 'variable_value',
      isEdited: isPaidPaula,
    });

    // REVENUES:
    // Carlos Salario: R$ 6.850,00
    allRevenues.push({
      id: `rev-carlos-${m}`,
      name: 'Salário (Carlos)',
      amount: 6850.0,
      date: `${m}-05`,
      category: 'Salário & Renda',
      recurrence: 'Mensal',
      profileName: 'Carlos',
      notes: 'Remuneração mensal de Carlos.',
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Carlos (iPhone)',
      isSynced: true,
    });

    // Paula Salario: R$ 7.240,00
    allRevenues.push({
      id: `rev-paula-${m}`,
      name: 'Salário (Paula)',
      amount: 7240.0,
      date: `${m}-05`,
      category: 'Salário & Renda',
      recurrence: 'Mensal',
      profileName: 'Paula',
      notes: 'Remuneração mensal de Paula.',
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Paula (iPhone)',
      isSynced: true,
    });

    // Rendimentos / Investimentos: R$ 345,80
    allRevenues.push({
      id: `rev-invest-${m}`,
      name: 'Rendimentos & Investimentos',
      amount: 345.8,
      date: `${m}-15`,
      category: 'Investimentos & Aplicações',
      recurrence: 'Mensal',
      profileName: 'Família',
      notes: 'Rendimentos de CDB e fundos imobiliários.',
      version: 2,
      updatedAt: nowIso,
      updatedByDevice: 'Carlos (iPhone)',
      isSynced: true,
    });
  });

  return { bills: allBills, revenues: allRevenues };
}
