// Core currency metadata. Rates are fetched client-side at runtime.
export const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'CNY', name: 'Chinese Yuan (RMB)', symbol: '¥', flag: '🇨🇳' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  { code: 'BTN', name: 'Bhutanese Ngultrum', symbol: 'Nu.', flag: '🇧🇹' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
];

export const popularPairs = [
  { from: 'USD', to: 'CNY', label: 'USD → RMB' },
  { from: 'CNY', to: 'USD', label: 'RMB → USD' },
  { from: 'USD', to: 'PKR', label: 'USD → PKR' },
  { from: 'USD', to: 'MXN', label: 'USD → MXN' },
  { from: 'MXN', to: 'USD', label: 'MXN → USD' },
  { from: 'INR', to: 'USD', label: 'INR → USD' },
  { from: 'EUR', to: 'USD', label: 'EUR → USD' },
  { from: 'GBP', to: 'USD', label: 'GBP → USD' },
  { from: 'JPY', to: 'USD', label: 'JPY → USD' },
];

export const quickChips = [1, 10, 100, 500, 1000, 5000];
