/**
 * Utilitários de moeda no padrão brasileiro (ponto de milhar, vírgula decimal).
 */

// Máscara estilo "centavos": o usuário digita apenas números e o valor monta
// 1.234,56 automaticamente enquanto digita.
export const maskCurrencyBR = (raw: string | number): string => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Exibe um valor já formatado em BR. Aceita número (ex: 1234.5) ou string
// mascarada (ex: "1.234,56"); string vazia/nula vira ''.
export const displayCurrencyBR = (v: any): string => {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v === 'number') {
    return v.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return String(v);
};

// Converte string mascarada ("1.234,56") ou número em número puro (1234.56).
export const parseCurrencyBR = (val: any): number => {
  if (typeof val === 'number') return val;
  const digits = String(val ?? '').replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
};

// Converte um número puro em string mascarada BR, para preencher inputs.
export const numberToMaskBR = (n: number | undefined | null): string => {
  if (n === undefined || n === null || n === '' || isNaN(Number(n))) return '';
  return maskCurrencyBR(String(Math.round(Number(n) * 100)));
};
