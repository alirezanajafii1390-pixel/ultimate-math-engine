import type { CalculatorShareData, ConverterShareData, FormulaShareData, ShareData } from './types';
import type { TranslationKey } from '../i18n';

type T = (key: TranslationKey) => string;

function formatCalculator(data: CalculatorShareData, t: T): string {
  return `🧮 ${t('share.appName')}\n\n${data.expression}\n\n= ${data.result}`;
}

function formatFormula(data: FormulaShareData, t: T): string {
  const varsLine = data.variables.length ? `\n${data.variables.map((v) => `${v.key} = ${v.value}`).join('\n')}` : '';
  const resultsLine = data.results.map((r) => `${r.label} = ${r.value}`).join('\n');
  return `📐 ${t('share.appName')}\n\n${data.formulaName}${varsLine}\n\n${resultsLine}`;
}

function formatConverter(data: ConverterShareData, t: T): string {
  return `🔄 ${t('share.appName')}\n\n${data.categoryLabel}\n\n${data.input.value} ${data.input.unit}\n→ ${data.output.value} ${data.output.unit}`;
}

export function formatShareText(data: ShareData, t: T): string {
  switch (data.kind) {
    case 'calculator':
      return formatCalculator(data, t);
    case 'formula':
      return formatFormula(data, t);
    case 'converter':
      return formatConverter(data, t);
  }
}
