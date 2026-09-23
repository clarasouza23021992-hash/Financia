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

  // Specific keyword detection
  if (lower.includes('gás') || lower.includes('gas') || lower.includes('comgás') || lower.includes('botijão')) {
    return CATEGORIES_LIST.find(c => c.id === 'gas')!;
  }
  if (lower.includes('água') || lower.includes('agua') || lower.includes('saneamento') || lower.includes('sabesp') || lower.includes('esgoto')) {
    return CATEGORIES_LIST.find(c => c.id === 'agua')!;
  }
  if (lower.includes('luz') || lower.includes('energia') || lower.includes('enel') || lower.includes('eletric') || lower.includes('cpfl')) {
    return CATEGORIES_LIST.find(c => c.id === 'energia')!;
  }
  if (lower.includes('condom') || lower.includes('aluguel') || lower.includes('moradia')) {
    return CATEGORIES_LIST.find(c => c.id === 'moradia')!;
  }
  if (lower.includes('internet') || lower.includes('fibra') || lower.includes('telefone') || lower.includes('claro') || lower.includes('vivo') || lower.includes('tim')) {
    return CATEGORIES_LIST.find(c => c.id === 'internet')!;
  }
  if (lower.includes('mercado') || lower.includes('aliment') || lower.includes('feira') || lower.includes('açougue') || lower.includes('compras')) {
    return CATEGORIES_LIST.find(c => c.id === 'alimentacao')!;
  }
  if (lower.includes('transporte') || lower.includes('combust') || lower.includes('gasolina') || lower.includes('uber') || lower.includes('carro')) {
    return CATEGORIES_LIST.find(c => c.id === 'transporte')!;
  }
  if (lower.includes('cartão') || lower.includes('cartao') || lower.includes('fatura') || lower.includes('nubank')) {
    return CATEGORIES_LIST.find(c => c.id === 'cartao')!;
  }
  if (lower.includes('financiamento') || lower.includes('empréstimo') || lower.includes('emprestimo') || lower.includes('caixa')) {
    return CATEGORIES_LIST.find(c => c.id === 'financiamento')!;
  }
  if (lower.includes('saúde') || lower.includes('saude') || lower.includes('farmácia') || lower.includes('farmacia') || lower.includes('médic') || lower.includes('unimed')) {
    return CATEGORIES_LIST.find(c => c.id === 'saude')!;
  }
  if (lower.includes('educa') || lower.includes('escola') || lower.includes('curso') || lower.includes('faculdade')) {
    return CATEGORIES_LIST.find(c => c.id === 'educacao')!;
  }
  if (lower.includes('lazer') || lower.includes('streaming') || lower.includes('netflix') || lower.includes('spotify') || lower.includes('assinatura')) {
    return CATEGORIES_LIST.find(c => c.id === 'lazer')!;
  }
  if (lower.includes('pet') || lower.includes('animal') || lower.includes('veterinário') || lower.includes('ração')) {
    return CATEGORIES_LIST.find(c => c.id === 'pets')!;
  }
  if (lower.includes('manuten') || lower.includes('reforma') || lower.includes('conserto') || lower.includes('obra')) {
    return CATEGORIES_LIST.find(c => c.id === 'manutencao')!;
  }
  if (lower.includes('iptu') || lower.includes('ipva') || lower.includes('imposto') || lower.includes('tributo')) {
    return CATEGORIES_LIST.find(c => c.id === 'impostos')!;
  }

  // Fallback to "Outras Despesas"
  return CATEGORIES_LIST[CATEGORIES_LIST.length - 1];
}
