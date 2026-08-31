/**
 * Common formatting helpers for Balqen client
 */

export function formatDateDMY(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' && dateInput.includes('T')
    ? new Date(dateInput)
    : new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  
  // Format as DD/MM/YYYY
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  return `৳${(isNaN(num) ? 0 : num).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
