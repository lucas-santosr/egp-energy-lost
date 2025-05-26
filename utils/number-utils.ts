/**
 * Utilitários para manipulação de números
 */

/**
 * Converte um valor para número, tratando diferentes formatos
 * @param valor Valor a ser convertido para número
 * @param valorPadrao Valor padrão caso a conversão falhe
 * @returns Número convertido ou valor padrão
 */
export function converterParaNumero(valor: any, valorPadrao = 0): number {
  if (valor === null || valor === undefined) return valorPadrao

  try {
    // Se já for um número, retornar
    if (typeof valor === "number" && !isNaN(valor)) return valor

    // Se for string, tentar converter
    if (typeof valor === "string") {
      // Remover espaços e substituir vírgula por ponto
      const valorLimpo = valor.trim().replace(/\./g, "").replace(",", ".")

      // Verificar se é um número válido
      if (valorLimpo === "") return valorPadrao

      const numero = Number(valorLimpo)
      return isNaN(numero) ? valorPadrao : numero
    }

    // Tentar converter diretamente
    const numero = Number(valor)
    return isNaN(numero) ? valorPadrao : numero
  } catch (e) {
    console.error("Erro ao converter para número:", e, valor)
    return valorPadrao
  }
}

/**
 * Formata um número para exibição
 * @param valor Valor a ser formatado
 * @param casasDecimais Número de casas decimais
 * @returns String formatada
 */
export function formatarNumero(valor: number | string | null | undefined, casasDecimais = 2): string {
  if (valor === null || valor === undefined) return "0,00"

  const numero = typeof valor === "number" ? valor : converterParaNumero(valor)

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  }).format(numero)
}

/**
 * Formata um valor monetário para exibição
 * @param valor Valor a ser formatado
 * @param casasDecimais Número de casas decimais
 * @returns String formatada com símbolo de moeda
 */
export function formatarMoeda(valor: number | string | null | undefined, casasDecimais = 2): string {
  if (valor === null || valor === undefined) return "R$ 0,00"

  const numero = typeof valor === "number" ? valor : converterParaNumero(valor)

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  }).format(numero)
}

/**
 * Formata um percentual para exibição
 * @param valor Valor a ser formatado
 * @param casasDecimais Número de casas decimais
 * @returns String formatada com símbolo de percentual
 */
export function formatarPercentual(valor: number | string | null | undefined, casasDecimais = 2): string {
  if (valor === null || valor === undefined) return "0,00%"

  const numero = typeof valor === "number" ? valor : converterParaNumero(valor)

  return (
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: casasDecimais,
      maximumFractionDigits: casasDecimais,
    }).format(numero) + "%"
  )
}

/**
 * Arredonda um número para um múltiplo específico
 * @param valor Valor a ser arredondado
 * @param multiplo Múltiplo para arredondamento
 * @param direcao 'cima' para arredondar para cima, 'baixo' para arredondar para baixo
 * @returns Valor arredondado
 */
export function arredondarParaMultiplo(valor: number, multiplo = 1000, direcao: "cima" | "baixo" = "cima"): number {
  if (valor === 0) return multiplo

  if (direcao === "cima") {
    return Math.ceil(valor / multiplo) * multiplo
  } else {
    return Math.floor(valor / multiplo) * multiplo
  }
}
