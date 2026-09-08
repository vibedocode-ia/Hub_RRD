const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function underThousand(value: number): string {
  if (value === 0) return '';
  if (value === 100) return 'cem';
  const parts: string[] = [];
  const h = Math.floor(value / 100);
  const rest = value % 100;
  if (h) parts.push(hundreds[h]);
  if (rest) {
    const connector = parts.length ? 'e ' : '';
    if (rest < 10) parts.push(connector + units[rest]);
    else if (rest < 20) parts.push(connector + teens[rest - 10]);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(connector + tens[t] + (u ? ` e ${units[u]}` : ''));
    }
  }
  return parts.join(' ');
}

function integerWords(value: number): string {
  if (value === 0) return 'zero';
  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1000);
  const remainder = value % 1000;
  const groups: string[] = [];
  if (millions) groups.push(millions === 1 ? 'um milhão' : `${underThousand(millions)} milhões`);
  if (thousands) groups.push(thousands === 1 ? 'mil' : `${underThousand(thousands)} mil`);
  if (remainder) groups.push(underThousand(remainder));
  return groups.join(remainder > 0 && remainder < 100 ? ' e ' : ' ');
}

export function moneyToWords(input: string | number): string {
  const normalized = typeof input === 'number'
    ? input
    : Number(String(input).replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(normalized) || normalized < 0 || normalized >= 1_000_000_000) {
    throw new Error('Valor monetário inválido ou fora do limite suportado.');
  }
  const centsTotal = Math.round(normalized * 100);
  const reais = Math.floor(centsTotal / 100);
  const cents = centsTotal % 100;
  const parts: string[] = [];
  if (reais) {
    const de = reais >= 1_000_000 && reais % 1_000_000 === 0 ? ' de' : '';
    parts.push(`${integerWords(reais)}${de} ${reais === 1 ? 'real' : 'reais'}`);
  }
  if (cents) parts.push(`${integerWords(cents)} ${cents === 1 ? 'centavo' : 'centavos'}`);
  return parts.length ? parts.join(' e ') : 'zero reais';
}
