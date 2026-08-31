import type { Transaction } from '../types';
import type { QuickPreset } from '../components/QuickTransactionModal';

const DEFAULT_EMOJIS: Record<string, string> = {
  food: '🍕',
  dining: '🍽️',
  restaurant: '🍔',
  lunch: '🍱',
  coffee: '☕',
  tea: '🍵',
  snack: '🥐',
  grocery: '🛒',
  groceries: '🥦',
  supermarket: '🛍️',
  uber: '🚗',
  pathao: '🛵',
  ride: '🚕',
  fuel: '⛽',
  cng: '🛺',
  transport: '🚌',
  bill: '📱',
  mobile: '📲',
  internet: '🌐',
  wifi: '📶',
  electric: '⚡',
  utility: '💡',
  rent: '🏠',
  salary: '💼',
  income: '💰',
  gym: '🏋️',
  medicine: '💊',
  doctor: '🩺',
  movie: '🎬',
  game: '🎮',
  book: '📚',
  shopping: '👕',
};

function getEmojiForText(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, emoji] of Object.entries(DEFAULT_EMOJIS)) {
    if (lower.includes(keyword)) return emoji;
  }
  return '⚡';
}

export interface SmartSuggestion extends QuickPreset {
  frequency: number;
  isSmart: boolean;
}

/**
 * Analyzes transaction history to detect recurring patterns and habits
 */
export function detectSmartSuggestions(transactions: Transaction[]): SmartSuggestion[] {
  if (!transactions || transactions.length === 0) return [];

  // Group by normalized key (description + type)
  const patternMap = new Map<
    string,
    {
      count: number;
      totalAmount: number;
      lastAmount: number;
      type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
      description: string;
      accountId: string | null;
      categoryId: string | null;
      categoryName?: string;
      accountName?: string;
    }
  >();

  transactions.forEach((tx) => {
    const rawDesc = tx.description?.trim() || tx.transaction_type.replace('_', ' ');
    const key = `${tx.transaction_type}__${rawDesc.toLowerCase()}`;

    if (!patternMap.has(key)) {
      patternMap.set(key, {
        count: 1,
        totalAmount: Number(tx.amount) || 0,
        lastAmount: Number(tx.amount) || 0,
        type: (tx.transaction_type === 'TRANSFER' ? 'TRANSFER' : tx.transaction_type === 'INCOME' ? 'INCOME' : 'EXPENSE'),
        description: rawDesc,
        accountId: tx.account_id,
        categoryId: tx.category_id,
        categoryName: tx.category_name,
        accountName: tx.account_name,
      });
    } else {
      const item = patternMap.get(key)!;
      item.count += 1;
      item.totalAmount += Number(tx.amount) || 0;
      item.lastAmount = Number(tx.amount) || item.lastAmount;
      if (!item.accountId && tx.account_id) item.accountId = tx.account_id;
      if (!item.categoryId && tx.category_id) item.categoryId = tx.category_id;
    }
  });

  // Sort by frequency (most frequent first)
  const sorted = Array.from(patternMap.values())
    .sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount)
    .slice(0, 6);

  return sorted.map((p, index) => {
    const emoji = getEmojiForText(p.description + ' ' + (p.categoryName || ''));
    const isIncome = p.type === 'INCOME';
    const isTransfer = p.type === 'TRANSFER';

    const color = isIncome
      ? 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : isTransfer
      ? 'from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
      : 'from-brand-500/20 to-indigo-500/20 text-brand-600 dark:text-brand-400 border-brand-500/30';

    return {
      id: `smart_${index}_${p.description.replace(/\s+/g, '_')}`,
      title: p.description,
      icon: emoji,
      type: p.type,
      categoryName: p.categoryName || undefined,
      defaultAmount: Math.round(p.lastAmount),
      description: p.description,
      color,
      frequency: p.count,
      isSmart: true,
    };
  });
}
