/**
 * Formatters
 * 
 * Utilitários para formatação de valores, datas e outros dados na aplicação.
 */

/**
 * Formata um valor monetário
 * @param value Valor a ser formatado
 * @param currency Moeda (padrão: USD)
 * @param decimals Número de casas decimais (padrão: 2)
 * @returns String formatada
 */
export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  decimals: number = 2
): string => {
  // Usar Intl.NumberFormat para formatação consistente
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Formata um valor em satoshis para BTC
 * @param satoshis Valor em satoshis
 * @param decimals Número de casas decimais (padrão: 8)
 * @returns String formatada
 */
export const formatSatoshisToBTC = (
  satoshis: number,
  decimals: number = 8
): string => {
  const btc = satoshis / 100000000;
  return btc.toFixed(decimals);
};

/**
 * Formata um valor em BTC para satoshis
 * @param btc Valor em BTC
 * @returns Número de satoshis
 */
export const formatBTCToSatoshis = (btc: number): number => {
  return Math.round(btc * 100000000);
};

/**
 * Formata uma porcentagem
 * @param value Valor a ser formatado (0.1 = 10%)
 * @param decimals Número de casas decimais (padrão: 2)
 * @param includeSign Incluir sinal de + para valores positivos (padrão: true)
 * @returns String formatada
 */
export const formatPercentage = (
  value: number,
  decimals: number = 2,
  includeSign: boolean = true
): string => {
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(decimals)}%`;
};

/**
 * Formata uma data
 * @param timestamp Timestamp em milissegundos
 * @param format Formato (padrão: 'short')
 * @returns String formatada
 */
export const formatDate = (
  timestamp: number,
  format: 'short' | 'medium' | 'long' = 'short'
): string => {
  const date = new Date(timestamp);
  
  switch (format) {
    case 'short':
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    
    case 'medium':
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    
    case 'long':
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    
    default:
      return date.toLocaleDateString();
  }
};

/**
 * Formata um endereço Bitcoin
 * @param address Endereço completo
 * @param chars Número de caracteres a mostrar no início e fim (padrão: 6)
 * @returns Endereço formatado (ex: "bc1q...a7f9")
 */
export const formatAddress = (
  address: string,
  chars: number = 6
): string => {
  if (!address || address.length <= chars * 2) {
    return address;
  }
  
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
};

/**
 * Formata um ID de transação
 * @param txid ID da transação
 * @param chars Número de caracteres a mostrar no início e fim (padrão: 8)
 * @returns ID formatado (ex: "a1b2c3d4...w8x9y0z1")
 */
export const formatTxid = (
  txid: string,
  chars: number = 8
): string => {
  if (!txid || txid.length <= chars * 2) {
    return txid;
  }
  
  return `${txid.substring(0, chars)}...${txid.substring(txid.length - chars)}`;
};

/**
 * Formata um número grande com sufixos (K, M, B, T)
 * @param value Valor a ser formatado
 * @param decimals Número de casas decimais (padrão: 1)
 * @returns String formatada
 */
export const formatCompactNumber = (
  value: number,
  decimals: number = 1
): string => {
  if (value < 1000) {
    return value.toString();
  }
  
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const suffixIndex = Math.floor(Math.log10(value) / 3);
  
  const shortValue = value / Math.pow(1000, suffixIndex);
  return `${shortValue.toFixed(decimals)}${suffixes[suffixIndex]}`;
};

/**
 * Formata um tempo relativo (ex: "2 hours ago")
 * @param timestamp Timestamp em milissegundos
 * @returns String formatada
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  // Menos de 1 minuto
  if (diff < 60000) {
    return 'just now';
  }

  // Menos de 1 hora
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  // Menos de 1 dia
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Menos de 1 semana
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  // Menos de 1 mês
  if (diff < 2592000000) {
    const weeks = Math.floor(diff / 604800000);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }

  // Menos de 1 ano
  if (diff < 31536000000) {
    const months = Math.floor(diff / 2592000000);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }

  // Mais de 1 ano
  const years = Math.floor(diff / 31536000000);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
};

/**
 * Formata um número com separadores de milhar
 * @param value Valor a ser formatado
 * @param decimals Número de casas decimais (padrão: 0)
 * @returns String formatada
 */
export const formatNumber = (
  value: number,
  decimals: number = 0
): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Alias para formatPercentage para compatibilidade
 */
export const formatPercent = formatPercentage;
