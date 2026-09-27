import React from 'react';
import {
  Zap,
  Droplets,
  Flame,
  Building2,
  Wifi,
  ShoppingCart,
  Car,
  CreditCard,
  Landmark,
  HeartPulse,
  GraduationCap,
  Tv,
  Sparkles,
  Wrench,
  ReceiptText,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryDefinition {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconColor: string;
}

export const CATEGORIES_LIST: CategoryDefinition[] = [
  {
    id: 'energia',
    name: 'Energia Elétrica (Luz)',
    shortName: 'Energia',
    icon: Zap,
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'agua',
    name: 'Água & Saneamento',
    shortName: 'Água',
    icon: Droplets,
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
    badgeText: 'text-sky-800 dark:text-sky-300',
    badgeBorder: 'border-sky-200 dark:border-sky-800/60',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    id: 'gas',
    name: 'Gás (Encanado / Botijão)',
    shortName: 'Gás',
    icon: Flame,
    badgeBg: 'bg-orange-50 dark:bg-orange-950/40',
    badgeText: 'text-orange-800 dark:text-orange-300',
    badgeBorder: 'border-orange-200 dark:border-orange-800/60',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    id: 'moradia',
    name: 'Moradia & Condomínio',
    shortName: 'Moradia',
    icon: Building2,
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200 dark:border-indigo-800/60',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'internet',
    name: 'Internet, TV & Telefonia',
    shortName: 'Internet',
    icon: Wifi,
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    badgeText: 'text-cyan-800 dark:text-cyan-300',
    badgeBorder: 'border-cyan-200 dark:border-cyan-800/60',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'alimentacao',
    name: 'Alimentação & Supermercado',
    shortName: 'Mercado',
    icon: ShoppingCart,
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'transporte',
    name: 'Transporte & Combustível',
    shortName: 'Transporte',
    icon: Car,
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeText: 'text-blue-800 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'cartao',
    name: 'Cartão de Crédito',
    shortName: 'Cartão',
    icon: CreditCard,
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
    badgeText: 'text-purple-800 dark:text-purple-300',
    badgeBorder: 'border-purple-200 dark:border-purple-800/60',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'financiamento',
    name: 'Financiamentos & Empréstimos',
    shortName: 'Financiamento',
    icon: Landmark,
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-800 dark:text-slate-200',
    badgeBorder: 'border-slate-300 dark:border-slate-700',
    iconColor: 'text-slate-600 dark:text-slate-300',
  },
  {
    id: 'saude',
    name: 'Saúde & Farmácia',
    shortName: 'Saúde',
    icon: HeartPulse,
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeText: 'text-rose-800 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800/60',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    id: 'educacao',
    name: 'Educação & Cursos',
    shortName: 'Educação',
    icon: GraduationCap,
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
    badgeText: 'text-teal-800 dark:text-teal-300',
    badgeBorder: 'border-teal-200 dark:border-teal-800/60',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    id: 'lazer',
    name: 'Lazer & Assinaturas',
    shortName: 'Lazer',
    icon: Tv,
    badgeBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    badgeText: 'text-fuchsia-800 dark:text-fuchsia-300',
    badgeBorder: 'border-fuchsia-200 dark:border-fuchsia-800/60',
    iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  {
    id: 'pets',
    name: 'Pets & Animais',
    shortName: 'Pets',
    icon: Sparkles,
    badgeBg: 'bg-amber-50/80 dark:bg-amber-950/30',
    badgeText: 'text-amber-900 dark:text-amber-200',
    badgeBorder: 'border-amber-200 dark:border-amber-800/50',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  {
    id: 'manutencao',
    name: 'Manutenção & Reformas',
    shortName: 'Manutenção',
    icon: Wrench,
    badgeBg: 'bg-stone-100 dark:bg-stone-900',
    badgeText: 'text-stone-800 dark:text-stone-300',
    badgeBorder: 'border-stone-300 dark:border-stone-700',
    iconColor: 'text-stone-600 dark:text-stone-400',
  },
  {
    id: 'impostos',
    name: 'Impostos & Tributos (IPTU/IPVA)',
    shortName: 'Tributos',
    icon: ReceiptText,
    badgeBg: 'bg-yellow-50 dark:bg-yellow-950/40',
    badgeText: 'text-yellow-800 dark:text-yellow-300',
    badgeBorder: 'border-yellow-200 dark:border-yellow-800/60',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    id: 'outras',
    name: 'Outras Despesas',
    shortName: 'Outras',
    icon: CircleDollarSign,
    badgeBg: 'bg-gray-100 dark:bg-gray-800',
    badgeText: 'text-gray-800 dark:text-gray-300',
    badgeBorder: 'border-gray-200 dark:border-gray-700',
    iconColor: 'text-gray-500 dark:text-gray-400',
  },
];

export const CATEGORY_NAMES = CATEGORIES_LIST.map(c => c.name);

// Find category definition with fuzzy/backward compatibility matching
export function getCategoryInfo(categoryName: string): CategoryDefinition {
  if (!categoryName) return CATEGORIES_LIST[CATEGORIES_LIST.length - 1];
  const lower = categoryName.toLowerCase().trim();

  // Direct match
  const exact = CATEGORIES_LIST.find(c => c.name.toLowerCase() === lower || c.id === lower);
  if (exact) return exact;

  // Use smart inference
  const inferred = inferCategoryFromName(categoryName);
  if (inferred) return inferred;

  // Fallback to "Outras Despesas"
  return CATEGORIES_LIST[CATEGORIES_LIST.length - 1];
}

// Intelligent Category Inference from Bill Name, Description or Favored
export function inferCategoryFromName(text: string): CategoryDefinition | null {
  if (!text || typeof text !== 'string') return null;
  const raw = text.toLowerCase().trim();
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. FINANCIAMENTOS & EMPRÉSTIMOS (Highest priority so "financiamento da casa" never misclassifies)
  if (
    normalized.includes('financiam') ||
    normalized.includes('emprestim') ||
    normalized.includes('consorcio') ||
    normalized.includes('credito imobiliario') ||
    normalized.includes('credito pessoal') ||
    normalized.includes('habitacional') ||
    normalized.includes('caixa habita') ||
    normalized.includes('parcela da casa') ||
    normalized.includes('prestacao da casa') ||
    normalized.includes('mcmv') ||
    normalized.includes('minha casa') ||
    normalized.includes('bv financeira') ||
    normalized.includes('banco pan') ||
    normalized.includes('safra financ') ||
    normalized.includes('bmg') ||
    normalized.includes('consignado')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'financiamento') || null;
  }

  // 2. MORADIA & CONDOMÍNIO
  if (
    normalized.includes('condom') ||
    normalized.includes('aluguel') ||
    normalized.includes('locacao') ||
    normalized.includes('imobiliari') ||
    normalized.includes('predial') ||
    normalized.includes('sindico') ||
    normalized.includes('fundo de reserva') ||
    normalized.includes('quinto andar') ||
    normalized.includes('loft') ||
    normalized.includes('taxa residenc')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'moradia') || null;
  }

  // 3. ENERGIA ELÉTRICA (LUZ)
  if (
    normalized.includes('energia') ||
    normalized.includes('luz') ||
    normalized.includes('eletric') ||
    normalized.includes('enel') ||
    normalized.includes('cpfl') ||
    normalized.includes('light') ||
    normalized.includes('cemig') ||
    normalized.includes('elektro') ||
    normalized.includes('equatorial') ||
    normalized.includes('copel') ||
    normalized.includes('energisa') ||
    normalized.includes('coelba') ||
    normalized.includes('neoenergia') ||
    normalized.includes('edp') ||
    normalized.includes('celesc') ||
    normalized.includes('rge')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'energia') || null;
  }

  // 4. ÁGUA & SANEAMENTO
  if (
    normalized.includes('agua') ||
    normalized.includes('saneamento') ||
    normalized.includes('esgoto') ||
    normalized.includes('sabesp') ||
    normalized.includes('sanepar') ||
    normalized.includes('copasa') ||
    normalized.includes('embasa') ||
    normalized.includes('corsan') ||
    normalized.includes('cedae') ||
    normalized.includes('caesb') ||
    normalized.includes('hidrometro') ||
    normalized.includes('saae') ||
    normalized.includes('compesa')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'agua') || null;
  }

  // 5. GÁS (Notice word boundary check so "casa" NEVER matches gas!)
  if (
    /\bg[aá]s\b/i.test(raw) ||
    normalized.includes('comgas') ||
    normalized.includes('naturgy') ||
    normalized.includes('botijao') ||
    normalized.includes('ultragaz') ||
    normalized.includes('liquigas') ||
    normalized.includes('supergasbras') ||
    normalized.includes('copagaz') ||
    normalized.includes('gas encanado')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'gas') || null;
  }

  // 6. INTERNET, TV & TELEFONIA
  if (
    normalized.includes('internet') ||
    normalized.includes('fibra') ||
    normalized.includes('wifi') ||
    normalized.includes('wi-fi') ||
    normalized.includes('banda larga') ||
    normalized.includes('telefone') ||
    normalized.includes('telefonia') ||
    normalized.includes('claro') ||
    normalized.includes('vivo') ||
    normalized.includes('tim') ||
    normalized.includes('oi fibra') ||
    normalized.includes('net virtua') ||
    normalized.includes('sky') ||
    normalized.includes('starlink') ||
    normalized.includes('telecom')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'internet') || null;
  }

  // 7. CARTÃO DE CRÉDITO
  if (
    normalized.includes('cartao') ||
    normalized.includes('fatura') ||
    normalized.includes('nubank') ||
    normalized.includes('itaucard') ||
    normalized.includes('bradescard') ||
    normalized.includes('c6 bank') ||
    normalized.includes('mastercard') ||
    normalized.includes('visa') ||
    normalized.includes('elo') ||
    normalized.includes('ourocard') ||
    normalized.includes('credicard')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'cartao') || null;
  }

  // 8. ALIMENTAÇÃO & SUPERMERCADO
  if (
    normalized.includes('mercado') ||
    normalized.includes('supermercado') ||
    normalized.includes('aliment') ||
    normalized.includes('feira') ||
    normalized.includes('acougue') ||
    normalized.includes('hortifruti') ||
    normalized.includes('padaria') ||
    normalized.includes('assai') ||
    normalized.includes('atacadao') ||
    normalized.includes('carrefour') ||
    normalized.includes('pao de acucar') ||
    normalized.includes('compras do mes')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'alimentacao') || null;
  }

  // 9. TRANSPORTE & COMBUSTÍVEL
  if (
    normalized.includes('combust') ||
    normalized.includes('gasolina') ||
    normalized.includes('etanol') ||
    normalized.includes('diesel') ||
    normalized.includes('posto') ||
    normalized.includes('ipiranga') ||
    normalized.includes('shell') ||
    normalized.includes('uber') ||
    normalized.includes('99app') ||
    normalized.includes('taxi') ||
    normalized.includes('estacionamento') ||
    normalized.includes('pedagio') ||
    normalized.includes('sem parar') ||
    normalized.includes('veloe') ||
    normalized.includes('seguro auto') ||
    normalized.includes('mecanic') ||
    normalized.includes('revisao') ||
    normalized.includes('ipva') ||
    normalized.includes('detran')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'transporte') || null;
  }

  // 10. SAÚDE & FARMÁCIA
  if (
    normalized.includes('saude') ||
    normalized.includes('farmacia') ||
    normalized.includes('droga') ||
    normalized.includes('medic') ||
    normalized.includes('unimed') ||
    normalized.includes('notredame') ||
    normalized.includes('intermedica') ||
    normalized.includes('amil') ||
    normalized.includes('bradesco saude') ||
    normalized.includes('sulamerica') ||
    normalized.includes('hapvida') ||
    normalized.includes('plano de saude') ||
    normalized.includes('consulta') ||
    normalized.includes('exame') ||
    normalized.includes('laboratorio') ||
    normalized.includes('dentista') ||
    normalized.includes('psicolog')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'saude') || null;
  }

  // 11. EDUCAÇÃO & CURSOS
  if (
    normalized.includes('educa') ||
    normalized.includes('escola') ||
    normalized.includes('colegio') ||
    normalized.includes('curso') ||
    normalized.includes('faculdade') ||
    normalized.includes('universidade') ||
    normalized.includes('mensalidade escolar') ||
    normalized.includes('ingles') ||
    normalized.includes('creche')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'educacao') || null;
  }

  // 12. LAZER & ASSINATURAS
  if (
    normalized.includes('streaming') ||
    normalized.includes('netflix') ||
    normalized.includes('spotify') ||
    normalized.includes('amazon prime') ||
    normalized.includes('disney') ||
    normalized.includes('hbo') ||
    normalized.includes('max') ||
    normalized.includes('youtube') ||
    normalized.includes('academia') ||
    normalized.includes('smart fit') ||
    normalized.includes('bluefit') ||
    normalized.includes('gympass') ||
    normalized.includes('assinatura') ||
    normalized.includes('lazer')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'lazer') || null;
  }

  // 13. PETS & ANIMAIS
  if (
    normalized.includes('pet') ||
    normalized.includes('animal') ||
    normalized.includes('veterinari') ||
    normalized.includes('racao') ||
    normalized.includes('cobasi') ||
    normalized.includes('petz') ||
    normalized.includes('cachorro') ||
    normalized.includes('gato')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'pets') || null;
  }

  // 14. MANUTENÇÃO & REFORMAS
  if (
    normalized.includes('manuten') ||
    normalized.includes('reforma') ||
    normalized.includes('conserto') ||
    normalized.includes('obra') ||
    normalized.includes('pedreiro') ||
    normalized.includes('eletricista') ||
    normalized.includes('encanador') ||
    normalized.includes('pintor') ||
    normalized.includes('leroy merlin') ||
    normalized.includes('telhanorte')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'manutencao') || null;
  }

  // 15. IMPOSTOS & TRIBUTOS
  if (
    normalized.includes('iptu') ||
    normalized.includes('darf') ||
    normalized.includes('imposto') ||
    normalized.includes('tributo') ||
    normalized.includes('taxa municipal') ||
    normalized.includes('receita federal') ||
    normalized.includes('simples nacional')
  ) {
    return CATEGORIES_LIST.find(c => c.id === 'impostos') || null;
  }

  return null;
}
