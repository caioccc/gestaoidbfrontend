// Conversores por extenso (pt-BR) espelhando finance/amount_extenso.py.
const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZENAS = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
const ESPECIAIS: Record<number, string> = {
  10: 'dez',
  11: 'onze',
  12: 'doze',
  13: 'treze',
  14: 'quatorze',
  15: 'quinze',
  16: 'dezesseis',
  17: 'dezessete',
  18: 'dezoito',
  19: 'dezenove',
};
const SUFFIXES: [number, string, string][] = [
  [1e3, 'mil', 'mil'],
  [1e6, 'milhão', 'milhões'],
  [1e9, 'bilhão', 'bilhões'],
  [1e12, 'trilhão', 'trilhões'],
];
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function grupoPorExtenso(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (centena) partes.push(CENTENAS[centena]);
  if (resto in ESPECIAIS) {
    partes.push(ESPECIAIS[resto]);
  } else if (resto > 0) {
    const dezena = Math.floor(resto / 10);
    const unidade = resto % 10;
    if (dezena) partes.push(DEZENAS[dezena]);
    if (unidade) partes.push(UNIDADES[unidade]);
  }
  return partes.join(' e ');
}

function gruposBase10(n: number): number[] {
  const grupos: number[] = [];
  let resto = Math.floor(n);
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }
  return grupos;
}

export function inteiroPorExtenso(n: number, connector = ', '): string {
  if (n === 0) return 'zero';
  const partes: string[] = [];
  const grupos = gruposBase10(n);
  grupos.forEach((grupo, i) => {
    if (grupo === 0) return;
    let texto = grupoPorExtenso(grupo);
    if (i > 0) {
      const [_, singular, plural] = SUFFIXES[i - 1];
      texto = `${texto} ${grupo === 1 ? singular : plural}`;
    }
    partes.push(texto);
  });
  partes.reverse();
  return partes.join(connector);
}

function requerDe(n: number): boolean {
  return gruposBase10(n).length - 1 >= 2;
}

export function valorPorExtenso(valor: number): string {
  const abs = Math.abs(valor);
  const inteiro = Math.floor(abs);
  const centavos = Math.round((abs - inteiro) * 100);
  if (inteiro === 0 && centavos === 0) return 'zero reais';
  const partes: string[] = [];
  if (inteiro > 0) {
    const texto = inteiroPorExtenso(inteiro);
    const de = requerDe(inteiro) ? ' de' : '';
    partes.push(`${texto}${de} ${inteiro === 1 ? 'real' : 'reais'}`);
  }
  if (centavos > 0) {
    const texto = inteiroPorExtenso(centavos);
    partes.push(`${texto} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  }
  return partes.join(' e ');
}

export function dataPorExtenso(date: Date): string {
  const dia = inteiroPorExtenso(date.getDate());
  const mes = MESES[date.getMonth()];
  const ano = inteiroPorExtenso(date.getFullYear(), ' e ');
  return `${dia} de ${mes} de ${ano}`;
}