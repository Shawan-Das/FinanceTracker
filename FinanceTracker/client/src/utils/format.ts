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

export function numberToWords(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num) || num === 0) return 'Zero BDT Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertGroup = (n: number): string => {
    let groupStr = '';
    if (n >= 100) {
      groupStr += `${units[Math.floor(n / 100)]} Hundred `;
      n %= 100;
    }
    if (n >= 20) {
      groupStr += `${tens[Math.floor(n / 10)]} `;
      n %= 10;
    }
    if (n > 0) {
      groupStr += `${units[n]} `;
    }
    return groupStr.trim();
  };

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return 'Zero BDT Only';

  let result = '';
  let current = integerPart;

  const crore = Math.floor(current / 10000000);
  current %= 10000000;
  const lakh = Math.floor(current / 100000);
  current %= 100000;
  const thousand = Math.floor(current / 1000);
  current %= 1000;
  const remainder = current;

  if (crore > 0) result += `${convertGroup(crore)} Crore `;
  if (lakh > 0) result += `${convertGroup(lakh)} Lakh `;
  if (thousand > 0) result += `${convertGroup(thousand)} Thousand `;
  if (remainder > 0) result += `${convertGroup(remainder)} `;

  result = result.trim() + ' BDT';

  if (decimalPart > 0) {
    result += ` and ${convertGroup(decimalPart)} Paisa`;
  }

  return `${result} Only`;
}
