import React from 'react';
import {
  Zap,
  Droplets,
  Flame,
  Wifi,
  Home,
  Building2,
  ShoppingCart,
  Fuel,
  HeartPulse,
  CreditCard,
  Landmark,
  GraduationCap,
  Tv,
  PawPrint,
  Wrench,
  Receipt,
  FileText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryMeta {
  name: string;
  shortName: string;
  icon: LucideIcon;
  badgeClasses: string;
  iconClasses: string;
  description: string;
}

export const CATEGORIES_LIST: CategoryMeta[] = [
  {
    name: 'Energia Elétrica',
    shortName: 'Energia',
    icon: Zap,
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    iconClasses: 'text-amber-600 dark:text-amber-400',
    description: 'Conta de luz e fornecimento elétrico (Enel, CPFL, Cemig, etc.)',
  },
  {
    name: 'Água & Saneamento',
    shortName: 'Água',
    icon: Droplets,
    badgeClasses: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    iconClasses: 'text-sky-600 dark:text-sky-400',
    description: 'Conta de água, esgoto e hidrômetro (Sabesp, Copasa, Sanepar, etc.)',
  },
  {
    name: 'Gás',
    shortName: 'Gás',
    icon: Flame,
    badgeClasses: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60',
    iconClasses: 'text-orange-600 dark:text-orange-400',
    description: 'Gás encanado ou botijão (Comgás, Ultragaz, Liquigás, etc.)',
  },
  {
    name: 'Internet & Telefonia',
    shortName: 'Internet',
    icon: Wifi,
    badgeClasses: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
    iconClasses: 'text-indigo-600 dark:text-indigo-400',
    description: 'Banda larga, fibra óptica, planos de celular e telefone',
  },
  {
    name: 'Moradia & Aluguel',
    shortName: 'Aluguel',
    icon: Home,
    badgeClasses: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    iconClasses: 'text-blue-600 dark:text-blue-400',
    description: 'Aluguel do imóvel, taxa de locação e imobiliária',
  },
  {
    name: 'Condomínio',
    shortName: 'Condomínio',
    icon: Building2,
    badgeClasses: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60',
    iconClasses: 'text-cyan-600 dark:text-cyan-400',
    description: 'Taxa condominial mensal e chamadas de capital',
  },
  {
    name: 'Alimentação & Supermercado',
    shortName: 'Mercado',
    icon: ShoppingCart,
    badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    iconClasses: 'text-emerald-600 dark:text-emerald-400',
    description: 'Compras de mercado, feira, hortifruti e alimentos',
  },
  {
    name: 'Transporte & Combustível',
    shortName: 'Transporte',
    icon: Fuel,
    badgeClasses: 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60',
    iconClasses: 'text-violet-600 dark:text-violet-400',
    description: 'Gasolina, etanol, pedágio, transporte público e aplicativos',
  },
  {
    name: 'Saúde & Farmácia',
    shortName: 'Saúde',
    icon: HeartPulse,
    badgeClasses: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    iconClasses: 'text-rose-600 dark:text-rose-400',
    description: 'Plano de saúde, farmácia, medicamentos e consultas',
  },
  {
    name: 'Cartão de Crédito',
    shortName: 'Cartão',
    icon: CreditCard,
    badgeClasses: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-800/60',
    iconClasses: 'text-fuchsia-600 dark:text-fuchsia-400',
    description: 'Fatura de cartões de crédito (Nubank, Itaú, Bradesco, etc.)',
  },
  {
    name: 'Financiamentos & Empréstimos',
    shortName: 'Financiamento',
    icon: Landmark,
    badgeClasses: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60',
    iconClasses: 'text-teal-600 dark:text-teal-400',
    description: 'Financiamento imobiliário (Caixa), veicular ou empréstimos',
  },
  {
    name: 'Educação & Cursos',
    shortName: 'Educação',
    icon: GraduationCap,
    badgeClasses: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    iconClasses: 'text-blue-600 dark:text-blue-400',
    description: 'Mensalidade escolar, faculdade, cursos e livros',
  },
  {
    name: 'Lazer & Assinaturas',
    shortName: 'Lazer',
    icon: Tv,
    badgeClasses: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
    iconClasses: 'text-purple-600 dark:text-purple-400',
    description: 'Netflix, Spotify, streaming, viagens e passeios',
  },
  {
    name: 'Pets & Veterinário',
    shortName: 'Pets',
    icon: PawPrint,
    badgeClasses: 'bg-lime-50 text-lime-900 border-lime-200 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-800/60',
    iconClasses: 'text-lime-600 dark:text-lime-400',
    description: 'Ração, pet shop, vacinas e consultas veterinárias',
  },
  {
    name: 'Manutenção & Reforma',
    shortName: 'Manutenção',
    icon: Wrench,
    badgeClasses: 'bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-900/60 dark:text-stone-300 dark:border-stone-700/60',
    iconClasses: 'text-stone-600 dark:text-stone-400',
    description: 'Reparos da casa, pintura, eletricista e encanador',
  },
  {
    name: 'Impostos & Tributos',
    shortName: 'Impostos',
    icon: FileText,
    badgeClasses: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700/60',
    iconClasses: 'text-slate-600 dark:text-slate-400',
    description: 'IPTU, IPVA, taxas municipais e declarações',
  },
  {
    name: 'Outras Despesas',
    shortName: 'Outros',
    icon: Receipt,
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/50',
    iconClasses: 'text-slate-500 dark:text-slate-400',
    description: 'Gastos diversos e pagamentos pontuais',
  },
];

export const CATEGORY_NAMES = CATEGORIES_LIST.map((c) => c.name);

/**
 * Returns complete category metadata with fallback for legacy category names
 */
export function getCategoryMeta(categoryName?: string): CategoryMeta {
  if (!categoryName) {
    return CATEGORIES_LIST[CATEGORIES_LIST.length - 1]; // Outras Despesas
  }

  const directMatch = CATEGORIES_LIST.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (directMatch) return directMatch;

  const norm = categoryName.toLowerCase();

  // Financiamentos takes priority over generic 'casa' or 'banco'
  if (
    norm.includes('financiamento') ||
    norm.includes('empréstimo') ||
    norm.includes('emprestimo') ||
    norm.includes('consignado') ||
    norm.includes('consórcio') ||
    norm.includes('consorcio') ||
    norm.includes('parcela') ||
    norm.includes('prestação') ||
    norm.includes('prestacao')
  ) {
    return CATEGORIES_LIST[10]; // Financiamentos & Empréstimos
  }

  // Legacy or flexible matches
  if (norm.includes('luz') || norm.includes('energia') || norm.includes('elétric') || norm.includes('eletric')) {
    return CATEGORIES_LIST[0]; // Energia Elétrica
  }
  if (norm.includes('água') || norm.includes('agua') || norm.includes('saneamento') || norm.includes('esgoto')) {
    return CATEGORIES_LIST[1]; // Água & Saneamento
  }
  if (norm.includes('gás') || norm.includes('gas') || norm.includes('comgás') || norm.includes('comgas') || norm.includes('botijão')) {
    return CATEGORIES_LIST[2]; // Gás
  }
  if (norm.includes('internet') || norm.includes('fibra') || norm.includes('telef') || norm.includes('celular') || norm.includes('wifi') || norm.includes('wi-fi') || norm.includes('banda larga')) {
    return CATEGORIES_LIST[3]; // Internet & Telefonia
  }
  if (norm.includes('condomínio') || norm.includes('condominio') || norm.includes('taxa condominial') || norm.includes('síndico')) {
    return CATEGORIES_LIST[5]; // Condomínio
  }
  if (norm.includes('moradia') || norm.includes('aluguel') || norm.includes('locação') || norm.includes('locacao') || norm.includes('imobiliária')) {
    return CATEGORIES_LIST[4]; // Moradia & Aluguel
  }
  if (norm.includes('alimento') || norm.includes('mercado') || norm.includes('compras') || norm.includes('supermercado') || norm.includes('hortifruti') || norm.includes('açougue') || norm.includes('padaria')) {
    return CATEGORIES_LIST[6]; // Alimentação & Supermercado
  }
  if (norm.includes('transporte') || norm.includes('combustível') || norm.includes('combustivel') || norm.includes('gasolina') || norm.includes('etanol') || norm.includes('posto') || norm.includes('uber') || norm.includes('pedágio')) {
    return CATEGORIES_LIST[7]; // Transporte & Combustível
  }
  if (norm.includes('saúde') || norm.includes('saude') || norm.includes('farmácia') || norm.includes('farmacia') || norm.includes('remédio') || norm.includes('médic') || norm.includes('dentista') || norm.includes('unimed')) {
    return CATEGORIES_LIST[8]; // Saúde & Farmácia
  }
  if (norm.includes('cartão') || norm.includes('cartao') || norm.includes('fatura') || norm.includes('nubank')) {
    return CATEGORIES_LIST[9]; // Cartão de Crédito
  }
  if (norm.includes('educação') || norm.includes('educacao') || norm.includes('escola') || norm.includes('colégio') || norm.includes('curso') || norm.includes('faculdade') || norm.includes('mensalidade escolar')) {
    return CATEGORIES_LIST[11]; // Educação & Cursos
  }
  if (norm.includes('lazer') || norm.includes('assinatura') || norm.includes('streaming') || norm.includes('netflix') || norm.includes('spotify') || norm.includes('academia') || norm.includes('smart fit')) {
    return CATEGORIES_LIST[12]; // Lazer & Assinaturas
  }
  if (norm.includes('pet') || norm.includes('animal') || norm.includes('veterinário') || norm.includes('veterinario') || norm.includes('ração') || norm.includes('racao')) {
    return CATEGORIES_LIST[13]; // Pets & Veterinário
  }
  if (norm.includes('manutenção') || norm.includes('manutencao') || norm.includes('reforma') || norm.includes('reparo') || norm.includes('pintura')) {
    return CATEGORIES_LIST[14]; // Manutenção & Reforma
  }
  if (norm.includes('imposto') || norm.includes('iptu') || norm.includes('ipva') || norm.includes('tributo') || norm.includes('receita federal')) {
    return CATEGORIES_LIST[15]; // Impostos & Tributos
  }
  if (norm.includes('casa')) {
    return CATEGORIES_LIST[4]; // Moradia & Aluguel
  }

  // Fallback default
  return {
    name: categoryName,
    shortName: categoryName.slice(0, 12),
    icon: Sparkles,
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    iconClasses: 'text-slate-500 dark:text-slate-400',
    description: categoryName,
  };
}

/**
 * Intelligent Category Detection based on Debt/Bill Name and Favored Company
 */
export function detectSmartCategory(billName?: string, favored?: string): string {
  const combined = `${billName || ''} ${favored || ''}`.trim();
  if (!combined) return 'Outras Despesas';

  // Normalize: remove diacritics and convert to lowercase
  const norm = combined
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Financiamentos & Empréstimos (Top Priority)
  if (
    norm.includes('financiamento') ||
    norm.includes('habitacional') ||
    norm.includes('imobiliari') ||
    norm.includes('consorcio') ||
    norm.includes('emprestimo') ||
    norm.includes('consignado') ||
    norm.includes('caixa habit') ||
    norm.includes('caixa econ') ||
    norm.includes('bv financ') ||
    norm.includes('banco pan') ||
    norm.includes('parcela do ap') ||
    norm.includes('parcela da casa') ||
    norm.includes('parcela carro') ||
    norm.includes('parcela moto') ||
    norm.includes('prestacao da casa') ||
    norm.includes('prestacao do ap') ||
    norm.includes('prestacao') ||
    norm.includes('creditas') ||
    norm.includes('renegociacao')
  ) {
    return 'Financiamentos & Empréstimos';
  }

  // 2. Cartão de Crédito & Fatura
  if (
    norm.includes('fatura') ||
    norm.includes('cartao') ||
    norm.includes('nubank') ||
    norm.includes('itaucard') ||
    norm.includes('bradescard') ||
    norm.includes('ourocard') ||
    norm.includes('c6 bank') ||
    norm.includes('inter mastercard')
  ) {
    return 'Cartão de Crédito';
  }

  // 3. Condomínio
  if (
    norm.includes('condominio') ||
    norm.includes('taxa condominial') ||
    norm.includes('sindico') ||
    norm.includes('administradora predial') ||
    norm.includes('edificio')
  ) {
    return 'Condomínio';
  }

  // 4. Moradia & Aluguel
  if (
    norm.includes('aluguel') ||
    norm.includes('quinto andar') ||
    norm.includes('quintoandar') ||
    norm.includes('locacao') ||
    norm.includes('imobiliaria') ||
    norm.includes('taxa de locacao')
  ) {
    return 'Moradia & Aluguel';
  }

  // 5. Energia Elétrica
  if (
    norm.includes('enel') ||
    norm.includes('cpfl') ||
    norm.includes('cemig') ||
    norm.includes('light') ||
    norm.includes('elektro') ||
    norm.includes('neoenergia') ||
    norm.includes('equatorial') ||
    norm.includes('rge') ||
    norm.includes('energisa') ||
    norm.includes('ceee') ||
    norm.includes('conta de luz') ||
    norm.includes('energia eletrica') ||
    norm.includes('luz')
  ) {
    return 'Energia Elétrica';
  }

  // 6. Água & Saneamento
  if (
    norm.includes('sabesp') ||
    norm.includes('copasa') ||
    norm.includes('sanepar') ||
    norm.includes('embasa') ||
    norm.includes('corsan') ||
    norm.includes('saneamento') ||
    norm.includes('esgoto') ||
    norm.includes('daae') ||
    norm.includes('saae') ||
    norm.includes('cedae') ||
    norm.includes('hidrometro') ||
    norm.includes('conta de agua') ||
    norm.includes('agua')
  ) {
    return 'Água & Saneamento';
  }

  // 7. Gás
  if (
    norm.includes('comgas') ||
    norm.includes('naturgy') ||
    norm.includes('ultragaz') ||
    norm.includes('liquigas') ||
    norm.includes('supergasbras') ||
    norm.includes('botijao') ||
    norm.includes('gas encanado') ||
    norm.includes('gas')
  ) {
    return 'Gás';
  }

  // 8. Internet & Telefonia
  if (
    norm.includes('claro') ||
    norm.includes('vivo') ||
    norm.includes('tim') ||
    norm.includes('oi') ||
    norm.includes('fibra') ||
    norm.includes('internet') ||
    norm.includes('telef') ||
    norm.includes('celular') ||
    norm.includes('wifi') ||
    norm.includes('wi-fi') ||
    norm.includes('banda larga') ||
    norm.includes('net virtua') ||
    norm.includes('starlink')
  ) {
    return 'Internet & Telefonia';
  }

  // 9. Alimentação & Supermercado
  if (
    norm.includes('mercado') ||
    norm.includes('supermercado') ||
    norm.includes('assai') ||
    norm.includes('atacadao') ||
    norm.includes('carrefour') ||
    norm.includes('pao de acucar') ||
    norm.includes('hortifruti') ||
    norm.includes('acougue') ||
    norm.includes('padaria') ||
    norm.includes('feira') ||
    norm.includes('ifood') ||
    norm.includes('compras do mes')
  ) {
    return 'Alimentação & Supermercado';
  }

  // 10. Transporte & Combustível
  if (
    norm.includes('combustivel') ||
    norm.includes('gasolina') ||
    norm.includes('etanol') ||
    norm.includes('diesel') ||
    norm.includes('posto') ||
    norm.includes('shell') ||
    norm.includes('ipiranga') ||
    norm.includes('petrobras') ||
    norm.includes('uber') ||
    norm.includes('99') ||
    norm.includes('pedagio') ||
    norm.includes('sem parar') ||
    norm.includes('conectcar') ||
    norm.includes('ipva') ||
    norm.includes('multa') ||
    norm.includes('detran') ||
    norm.includes('oficina')
  ) {
    return 'Transporte & Combustível';
  }

  // 11. Saúde & Farmácia
  if (
    norm.includes('farmacia') ||
    norm.includes('droga') ||
    norm.includes('drogasil') ||
    norm.includes('droga raia') ||
    norm.includes('remedio') ||
    norm.includes('medicamento') ||
    norm.includes('saude') ||
    norm.includes('unimed') ||
    norm.includes('notredame') ||
    norm.includes('amil') ||
    norm.includes('bradesco saude') ||
    norm.includes('hapvida') ||
    norm.includes('consulta') ||
    norm.includes('exame') ||
    norm.includes('dentista') ||
    norm.includes('psicolog') ||
    norm.includes('hospital')
  ) {
    return 'Saúde & Farmácia';
  }

  // 12. Educação & Cursos
  if (
    norm.includes('escola') ||
    norm.includes('colegio') ||
    norm.includes('faculdade') ||
    norm.includes('universidade') ||
    norm.includes('curso') ||
    norm.includes('mensalidade escolar') ||
    norm.includes('ingles') ||
    norm.includes('educacao') ||
    norm.includes('creche')
  ) {
    return 'Educação & Cursos';
  }

  // 13. Lazer & Assinaturas
  if (
    norm.includes('netflix') ||
    norm.includes('spotify') ||
    norm.includes('prime video') ||
    norm.includes('amazon prime') ||
    norm.includes('disney') ||
    norm.includes('hbo') ||
    norm.includes('max') ||
    norm.includes('youtube') ||
    norm.includes('streaming') ||
    norm.includes('academia') ||
    norm.includes('smart fit') ||
    norm.includes('smartfit') ||
    norm.includes('totalpass') ||
    norm.includes('gympass')
  ) {
    return 'Lazer & Assinaturas';
  }

  // 14. Pets & Veterinário
  if (
    norm.includes('pet') ||
    norm.includes('veterinari') ||
    norm.includes('racao') ||
    norm.includes('cobasi') ||
    norm.includes('petz')
  ) {
    return 'Pets & Veterinário';
  }

  // 15. Manutenção & Reforma
  if (
    norm.includes('manutencao') ||
    norm.includes('reforma') ||
    norm.includes('eletricista') ||
    norm.includes('encanador') ||
    norm.includes('pintura') ||
    norm.includes('leroy merlin') ||
    norm.includes('telhanorte')
  ) {
    return 'Manutenção & Reforma';
  }

  // 16. Impostos & Tributos
  if (
    norm.includes('iptu') ||
    norm.includes('tributo') ||
    norm.includes('imposto') ||
    norm.includes('receita federal') ||
    norm.includes('darf') ||
    norm.includes('gru')
  ) {
    return 'Impostos & Tributos';
  }

  // 17. Fallback for generic 'casa' or 'lar'
  if (norm.includes('casa') || norm.includes('apartamento') || norm.includes('imovel')) {
    return 'Moradia & Aluguel';
  }

  return 'Outras Despesas';
}
