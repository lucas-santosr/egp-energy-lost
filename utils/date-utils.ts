/**
 * Utilitários para manipulação de datas
 */

/**
 * Converte uma string de data em um objeto Date
 * Suporta múltiplos formatos de data
 * @param dataString String de data a ser convertida
 * @returns Objeto Date ou null se a conversão falhar
 */
export function converterParaData(dataString: string | Date | null | undefined): Date | null {
  if (!dataString) return null

  try {
    // Se já for um objeto Date, retornar
    if (dataString instanceof Date) return dataString

    // Tentar converter de diferentes formatos
    if (typeof dataString === "string") {
      // Remover espaços extras
      const dataLimpa = dataString.trim()

      // Formato DD/MM/YYYY ou DD-MM-YYYY
      if (dataLimpa.match(/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/)) {
        // Extrair componentes da data
        const separador = dataLimpa.includes("/") ? "/" : dataLimpa.includes("-") ? "-" : "."
        const parts = dataLimpa.split(separador)

        const dia = Number.parseInt(parts[0], 10)
        const mes = Number.parseInt(parts[1], 10) - 1 // Mês em JavaScript é 0-indexed
        const ano = Number.parseInt(parts[2], 10)

        // Ajustar ano de 2 dígitos
        const anoCompleto = ano < 100 ? (ano < 50 ? 2000 + ano : 1900 + ano) : ano

        // Verificar se os valores são válidos
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(anoCompleto) && dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11) {
          return new Date(anoCompleto, mes, dia)
        }
      }

      // Formato YYYY-MM-DD (ISO)
      if (dataLimpa.match(/^\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}$/)) {
        const separador = dataLimpa.includes("/") ? "/" : dataLimpa.includes("-") ? "-" : "."
        const parts = dataLimpa.split(separador)

        const ano = Number.parseInt(parts[0], 10)
        const mes = Number.parseInt(parts[1], 10) - 1
        const dia = Number.parseInt(parts[2], 10)

        if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano) && dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11) {
          return new Date(ano, mes, dia)
        }
      }

      // Formato com data e hora (DD/MM/YYYY HH:MM:SS)
      if (dataLimpa.match(/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\s+\d{1,2}:\d{1,2}(:\d{1,2})?$/)) {
        const [dataParte, horaParte] = dataLimpa.split(/\s+/)
        const separador = dataParte.includes("/") ? "/" : dataParte.includes("-") ? "-" : "."
        const parts = dataParte.split(separador)

        const dia = Number.parseInt(parts[0], 10)
        const mes = Number.parseInt(parts[1], 10) - 1
        const ano = Number.parseInt(parts[2], 10)
        const anoCompleto = ano < 100 ? (ano < 50 ? 2000 + ano : 1900 + ano) : ano

        const horaParts = horaParte.split(":")
        const hora = Number.parseInt(horaParts[0], 10)
        const minuto = Number.parseInt(horaParts[1], 10)
        const segundo = horaParts.length > 2 ? Number.parseInt(horaParts[2], 10) : 0

        if (
          !isNaN(dia) &&
          !isNaN(mes) &&
          !isNaN(anoCompleto) &&
          !isNaN(hora) &&
          !isNaN(minuto) &&
          !isNaN(segundo) &&
          dia >= 1 &&
          dia <= 31 &&
          mes >= 0 &&
          mes <= 11 &&
          hora >= 0 &&
          hora <= 23 &&
          minuto >= 0 &&
          minuto <= 59 &&
          segundo >= 0 &&
          segundo <= 59
        ) {
          return new Date(anoCompleto, mes, dia, hora, minuto, segundo)
        }
      }

      // Formato ISO 8601 (YYYY-MM-DDTHH:MM:SS.sssZ)
      if (dataLimpa.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/)) {
        const data = new Date(dataLimpa)
        if (!isNaN(data.getTime())) {
          return data
        }
      }
    }

    // Tentar converter diretamente
    const data = new Date(dataString)
    if (!isNaN(data.getTime())) {
      return data
    }

    console.error("Formato de data não reconhecido:", dataString)
    return null
  } catch (e) {
    console.error("Erro ao converter data:", e, dataString)
    return null
  }
}

/**
 * Formata uma data para exibição no formato DD/MM/YYYY
 * @param data Data a ser formatada
 * @returns String formatada ou string vazia se a data for inválida
 */
export function formatarData(data: Date | string | null | undefined): string {
  if (!data) return ""

  const dataObj = data instanceof Date ? data : converterParaData(data)
  if (!dataObj) return ""

  const dia = String(dataObj.getDate()).padStart(2, "0")
  const mes = String(dataObj.getMonth() + 1).padStart(2, "0")
  const ano = dataObj.getFullYear()

  return `${dia}/${mes}/${ano}`
}

/**
 * Formata uma data para comparação (YYYY-MM-DD)
 * @param data Data a ser formatada
 * @returns String formatada para comparação ou string vazia se a data for inválida
 */
export function formatarDataParaComparacao(data: Date | string | null | undefined): string {
  if (!data) return ""

  const dataObj = data instanceof Date ? data : converterParaData(data)
  if (!dataObj) return ""

  const ano = dataObj.getFullYear()
  const mes = String(dataObj.getMonth() + 1).padStart(2, "0")
  const dia = String(dataObj.getDate()).padStart(2, "0")

  return `${ano}-${mes}-${dia}`
}

// Adicionar uma nova função para simplificar a data para o formato YYYY-MM-DD
export function simplificarData(data: Date | string | null | undefined): string {
  return formatarDataParaComparacao(data)
}

/**
 * Verifica se uma data está dentro de um intervalo
 * @param data Data a ser verificada
 * @param inicio Data de início do intervalo
 * @param fim Data de fim do intervalo
 * @returns true se a data estiver dentro do intervalo, false caso contrário
 */
export function dataEstaDentroDoIntervalo(
  data: Date | string | null | undefined,
  inicio: Date | string | null | undefined,
  fim: Date | string | null | undefined,
): boolean {
  if (!data || !inicio || !fim) return false

  const dataObj = data instanceof Date ? data : converterParaData(data)
  const inicioObj = inicio instanceof Date ? inicio : converterParaData(inicio)
  const fimObj = fim instanceof Date ? fim : converterParaData(fim)

  if (!dataObj || !inicioObj || !fimObj) return false

  // Normalizar para início e fim do dia
  const dataInicio = new Date(inicioObj)
  dataInicio.setHours(0, 0, 0, 0)

  const dataFim = new Date(fimObj)
  dataFim.setHours(23, 59, 59, 999)

  const dataComparacao = new Date(dataObj)
  dataComparacao.setHours(0, 0, 0, 0)

  return dataComparacao >= dataInicio && dataComparacao <= dataFim
}

/**
 * Obtém a data de hoje
 * @returns Data de hoje
 */
export function obterHoje(): Date {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return hoje
}

/**
 * Obtém a data de ontem
 * @returns Data de ontem
 */
export function obterOntem(): Date {
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)
  ontem.setHours(0, 0, 0, 0)
  return ontem
}

/**
 * Obtém a data de início do mês atual
 * @returns Data de início do mês atual
 */
export function obterInicioMesAtual(): Date {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1)
}

/**
 * Obtém a data de início do mês anterior
 * @returns Data de início do mês anterior
 */
export function obterInicioMesAnterior(): Date {
  const hoje = new Date()
  return new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
}

/**
 * Obtém a data de fim do mês anterior
 * @returns Data de fim do mês anterior
 */
export function obterFimMesAnterior(): Date {
  const hoje = new Date()
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
  fimMesAnterior.setHours(23, 59, 59, 999)
  return fimMesAnterior
}
