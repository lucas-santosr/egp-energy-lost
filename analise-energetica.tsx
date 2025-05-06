"use client"

import { useState, useRef, useEffect } from "react"
import { Bar, BarChart, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Download, FileDown, Upload, BarChart2 } from "lucide-react"
import Image from "next/image"
import * as XLSX from "xlsx"

// Estilos globais para garantir consistência nas fontes
const globalStyles = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: "12px",
  fontWeight: "normal",
  color: "#333",
}

// Estilos para títulos dos eixos
const axisLabelStyles = {
  ...globalStyles,
  fontSize: "14px", // Aumentado de 12px para 14px
  fontWeight: "bold",
}

// Tarifas por complexo
const TARIFAS = {
  Morgado: 770.14,
  Papagaios: 345.93,
  MOR: 770.14, // Adicionado para suportar abreviações
  PPG: 345.93, // Adicionado para suportar abreviações
  // Total será calculado dinamicamente com base na média ponderada
  Total: 0,
}

// Mapeamento de abreviações para nomes completos
const COMPLEXO_MAPPING = {
  MOR: "Morgado",
  PPG: "Papagaios",
}

// Atualizar o modelo de dados para incluir a coluna DIN_INSTANTE
// Modificar a constante modeloExcelData para incluir a nova estrutura
const modeloExcelData = [
  {
    DIN_INSTANTE: "31/03/2025",
    COMPLEXO: "MOR",
    "ENERGIA GERADA (MWH)": 1.646529,
    "ENERGIA POTENCIAL (MWH)": 4.275836,
    "PERDA ENERGÉTICA POR LIMITAÇÕES ONS (MWH)": 0,
    "PERDA ENERGÉTICA AJUSTADA (MWH)": 2.629307,
  },
  {
    DIN_INSTANTE: "31/03/2025",
    COMPLEXO: "MOR",
    "ENERGIA GERADA (MWH)": 1.069481,
    "ENERGIA POTENCIAL (MWH)": 2.528555,
    "PERDA ENERGÉTICA POR LIMITAÇÕES ONS (MWH)": 0,
    "PERDA ENERGÉTICA AJUSTADA (MWH)": 1.459074,
  },
  {
    DIN_INSTANTE: "01/03/2025",
    COMPLEXO: "PPG",
    "ENERGIA GERADA (MWH)": 1.80321708,
    "ENERGIA POTENCIAL (MWH)": 1.669176409,
    "PERDA ENERGÉTICA POR LIMITAÇÕES ONS (MWH)": 0,
    "PERDA ENERGÉTICA AJUSTADA (MWH)": 0,
  },
  {
    DIN_INSTANTE: "01/03/2025",
    COMPLEXO: "PPG",
    "ENERGIA GERADA (MWH)": 0.040159625,
    "ENERGIA POTENCIAL (MWH)": 0.656543854,
    "PERDA ENERGÉTICA POR LIMITAÇÕES ONS (MWH)": 0,
    "PERDA ENERGÉTICA AJUSTADA (MWH)": 0.616384228,
  },
]

// Calcular totais
const calcularTotais = (data) => {
  if (data.length === 0) return null

  const totais = {
    complexo: "Total",
    energiaPotencial: 0,
    energiaGerada: 0,
    perdaEnergeticaAjustada: 0,
    perdaEnergeticaLimitacoesONS: 0,
    indisponibilidade: 0,
    totalMWhPerdidosRS: 0,
    totalMWhPerdidosAjustadaRS: 0,
  }

  data.forEach((item) => {
    totais.energiaPotencial += item.energiaPotencial
    totais.energiaGerada += item.energiaGerada
    totais.perdaEnergeticaAjustada += item.perdaEnergeticaAjustada
    totais.perdaEnergeticaLimitacoesONS += item.perdaEnergeticaLimitacoesONS

    // Somar os valores financeiros
    totais.totalMWhPerdidosRS += item.totalMWhPerdidosRS || 0
    totais.totalMWhPerdidosAjustadaRS += item.totalMWhPerdidosAjustadaRS || 0
  })

  // Calcular indisponibilidade conforme a fórmula: 1-(Energia Gerada total / Energia potencial total)
  totais.indisponibilidade = (1 - totais.energiaGerada / totais.energiaPotencial) * 100

  return totais
}

// Calcular indisponibilidade para cada complexo
const calcularIndisponibilidade = (item) => {
  return (1 - item.energiaGerada / item.energiaPotencial) * 100
}

// Modificar a função que processa os dados para agrupar por complexo
// Substituir a função processExcelData com esta versão atualizada:

const processExcelData = (excelData) => {
  try {
    // Verificar se há dados
    if (!excelData || excelData.length === 0) {
      throw new Error("Nenhum dado encontrado na planilha.")
    }

    // Verificar se as colunas necessárias existem no primeiro item
    const primeiroItem = excelData[0]

    // Definir as colunas necessárias com base no novo formato
    const colunasNecessarias = [
      "DIN_INSTANTE",
      "COMPLEXO",
      "ENERGIA GERADA (MWH)",
      "ENERGIA POTENCIAL (MWH)",
      "PERDA ENERGÉTICA POR LIMITAÇÕES ONS (MWH)",
      "PERDA ENERGÉTICA AJUSTADA (MWH)",
    ]

    // Verificar se todas as colunas necessárias estão presentes
    const colunasAusentes = colunasNecessarias.filter((coluna) => {
      // Verificar se a coluna existe no objeto, independente de maiúsculas/minúsculas
      return !Object.keys(primeiroItem).some((key) => key.toUpperCase() === coluna.toUpperCase())
    })

    if (colunasAusentes.length > 0) {
      throw new Error(`Colunas ausentes na planilha: ${colunasAusentes.join(", ")}`)
    }

    // Encontrar os nomes reais das colunas no objeto (para lidar com diferenças de maiúsculas/minúsculas)
    const encontrarNomeColuna = (nomeColuna) => {
      return Object.keys(primeiroItem).find((key) => key.toUpperCase() === nomeColuna.toUpperCase())
    }

    const colunaDinInstante = encontrarNomeColuna("DIN_INSTANTE")
    const colunaComplexo = encontrarNomeColuna("COMPLEXO")
    const colunaEnergiaGerada = encontrarNomeColuna("ENERGIA GERADA (MWH)")
    const colunaEnergiaPotencial = encontrarNomeColuna("ENERGIA POTENCIAL (MWH)")
    const colunaPerdaLimitacoesONS = encontrarNomeColuna("PERDA ENERGÉTICA POR LIMITAÇÕES ONS (MWH)")
    const colunaPerdaAjustada = encontrarNomeColuna("PERDA ENERGÉTICA AJUSTADA (MWH)")

    // Agrupar dados por complexo
    const dadosPorComplexo = {}

    excelData.forEach((row, index) => {
      // Obter os valores das colunas usando os nomes encontrados
      const complexoOriginal = row[colunaComplexo]
      // Mapear abreviações para nomes completos se necessário
      const complexo = COMPLEXO_MAPPING[complexoOriginal] || complexoOriginal

      const energiaPotencial = Number.parseFloat(row[colunaEnergiaPotencial])
      const energiaGerada = Number.parseFloat(row[colunaEnergiaGerada])
      const perdaEnergeticaAjustada = Number.parseFloat(row[colunaPerdaAjustada])
      const perdaEnergeticaLimitacoesONS = Number.parseFloat(row[colunaPerdaLimitacoesONS])
      const dinInstante = row[colunaDinInstante]

      if (isNaN(energiaPotencial)) {
        throw new Error(`Valor inválido para Energia Potencial na linha ${index + 2}`)
      }
      if (isNaN(energiaGerada)) {
        throw new Error(`Valor inválido para Energia Gerada na linha ${index + 2}`)
      }
      if (isNaN(perdaEnergeticaAjustada)) {
        throw new Error(`Valor inválido para Perda Energética Ajustada na linha ${index + 2}`)
      }
      if (isNaN(perdaEnergeticaLimitacoesONS)) {
        throw new Error(`Valor inválido para Perda Energética por Limitações ONS na linha ${index + 2}`)
      }

      // Inicializar o objeto para o complexo se ainda não existir
      if (!dadosPorComplexo[complexo]) {
        dadosPorComplexo[complexo] = {
          complexo: complexo,
          energiaPotencial: 0,
          energiaGerada: 0,
          perdaEnergeticaAjustada: 0,
          perdaEnergeticaLimitacoesONS: 0,
          registros: [],
        }
      }

      // Adicionar os valores ao total do complexo
      dadosPorComplexo[complexo].energiaPotencial += energiaPotencial
      dadosPorComplexo[complexo].energiaGerada += energiaGerada
      dadosPorComplexo[complexo].perdaEnergeticaAjustada += perdaEnergeticaAjustada
      dadosPorComplexo[complexo].perdaEnergeticaLimitacoesONS += perdaEnergeticaLimitacoesONS

      // Adicionar o registro completo à lista de registros do complexo
      // Inside the processExcelData function, update the part where it adds records to the complexo:
      // Find this section in the function:
      // dadosPorComplexo[complexo].registros.push({...
      dadosPorComplexo[complexo].registros.push({
        dinInstante: row[colunaDinInstante],
        energiaPotencial,
        energiaGerada,
        perdaEnergeticaAjustada,
        perdaEnergeticaLimitacoesONS,
      })
    })

    // Converter o objeto de complexos em um array
    const processedData = Object.values(dadosPorComplexo).map((complexoData) => {
      const { complexo, energiaPotencial, energiaGerada, perdaEnergeticaAjustada, perdaEnergeticaLimitacoesONS } =
        complexoData

      // Obter a tarifa para o complexo
      const tarifa = TARIFAS[complexo] || 0

      // Calcular valores financeiros
      const perdaEnergeticaAjustadaAbs = Math.abs(perdaEnergeticaAjustada)
      const perdaEnergeticaLimitacoesONSAbs = Math.abs(perdaEnergeticaLimitacoesONS)
      const perdaTotal = perdaEnergeticaAjustadaAbs + perdaEnergeticaLimitacoesONSAbs

      const totalMWhPerdidosRS = perdaTotal * tarifa
      const totalMWhPerdidosAjustadaRS = perdaEnergeticaAjustadaAbs * tarifa

      return {
        complexo: complexo,
        energiaPotencial: energiaPotencial,
        energiaGerada: energiaGerada,
        perdaEnergeticaAjustada: -Math.abs(perdaEnergeticaAjustada),
        perdaEnergeticaLimitacoesONS: -Math.abs(perdaEnergeticaLimitacoesONS),
        tarifa: tarifa,
        totalMWhPerdidosRS: totalMWhPerdidosRS,
        totalMWhPerdidosAjustadaRS: totalMWhPerdidosAjustadaRS,
        registros: complexoData.registros,
        indisponibilidade: (1 - energiaGerada / energiaPotencial) * 100,
      }
    })

    return processedData
  } catch (error) {
    console.error("Erro ao processar dados:", error)
    throw error
  }
}

export default function AnaliseEnergetica() {
  const [chartData, setChartData] = useState([]) // Iniciar com array vazio
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)
  const chartContainerRef = useRef(null) // Referência para o container inteiro (incluindo título)
  const chartRef = useRef(null) // Referência apenas para o gráfico

  // Adicionar estados e funções para o filtro de tempo no componente AnaliseEnergetica:
  // Adicionar após a declaração dos outros estados
  const [filtroTempo, setFiltroTempo] = useState("total")
  const [periodoTexto, setPeriodoTexto] = useState("Total")
  const [dadosFiltrados, setDadosFiltrados] = useState([])

  // Update the converterParaData function to better handle different date formats
  // Replace the existing converterParaData function with this improved version:

  const converterParaData = (dataString) => {
    if (!dataString) return null

    try {
      // Se já for um objeto Date, retornar
      if (dataString instanceof Date) return dataString

      // Tentar converter de diferentes formatos
      if (typeof dataString === "string") {
        // Formato DD/MM/YYYY
        if (dataString.includes("/")) {
          const parts = dataString.split("/")
          if (parts.length >= 3) {
            const dia = Number.parseInt(parts[0], 10)
            const mes = Number.parseInt(parts[1], 10) - 1 // Mês em JavaScript é 0-indexed
            const ano = Number.parseInt(parts[2], 10)

            // Verificar se os valores são válidos
            if (!isNaN(dia) && !isNaN(mes) && !isNaN(ano)) {
              console.log(`Convertendo data: ${dataString} para ${new Date(ano, mes, dia).toISOString()}`)
              return new Date(ano, mes, dia)
            }
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

  // Update the aplicarFiltroTempo function to properly filter data based on dates
  // Replace the existing aplicarFiltroTempo function with this improved version:

  const aplicarFiltroTempo = (dados, filtro) => {
    if (!dados || dados.length === 0) return []

    console.log(`Aplicando filtro: ${filtro}`)

    // Definir o texto do período com base no filtro
    if (filtro === "total") {
      setPeriodoTexto("Total")
    } else if (filtro === "hoje") {
      setPeriodoTexto("Hoje")
    } else if (filtro === "ontem") {
      setPeriodoTexto("Ontem")
    } else if (filtro === "este-mes") {
      setPeriodoTexto("Este Mês")
    } else if (filtro === "mes-anterior") {
      setPeriodoTexto("Mês Anterior")
    }

    // Criar uma cópia profunda dos dados para evitar modificar o original
    const dadosCopia = JSON.parse(JSON.stringify(dados))

    // Obter as datas de referência para os filtros
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0) // Normalizar para início do dia

    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)

    const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)

    console.log(
      `Datas de referência: Hoje=${hoje.toISOString()}, Ontem=${ontem.toISOString()}, Início Mês Atual=${inicioMesAtual.toISOString()}, Início Mês Anterior=${inicioMesAnterior.toISOString()}, Fim Mês Anterior=${fimMesAnterior.toISOString()}`,
    )

    // Para cada complexo, filtrar seus registros com base no filtro de tempo
    dadosCopia.forEach((complexo) => {
      if (!complexo.registros || complexo.registros.length === 0) return

      console.log(`Processando complexo: ${complexo.complexo} com ${complexo.registros.length} registros`)

      // Função para verificar se uma data está dentro de um período
      const estaNoIntervalo = (data, inicio, fim) => {
        if (!data) return false
        return data >= inicio && data <= fim
      }

      let registrosFiltrados = []

      if (filtro === "total") {
        registrosFiltrados = [...complexo.registros]
      } else {
        // Filtrar registros com base no período selecionado
        registrosFiltrados = complexo.registros.filter((reg) => {
          if (!reg.dinInstante) {
            console.log("Registro sem data:", reg)
            return false
          }

          const dataReg = converterParaData(reg.dinInstante)
          if (!dataReg) {
            console.log(`Não foi possível converter a data: ${reg.dinInstante}`)
            return false
          }

          // Normalizar para início do dia
          dataReg.setHours(0, 0, 0, 0)

          if (filtro === "hoje") {
            const resultado = dataReg.getTime() === hoje.getTime()
            if (resultado) console.log(`Data ${dataReg.toISOString()} corresponde a hoje`)
            return resultado
          } else if (filtro === "ontem") {
            const resultado = dataReg.getTime() === ontem.getTime()
            if (resultado) console.log(`Data ${dataReg.toISOString()} corresponde a ontem`)
            return resultado
          } else if (filtro === "este-mes") {
            const resultado = dataReg >= inicioMesAtual && dataReg <= hoje
            if (resultado) console.log(`Data ${dataReg.toISOString()} está no mês atual`)
            return resultado
          } else if (filtro === "mes-anterior") {
            const resultado = dataReg >= inicioMesAnterior && dataReg <= fimMesAnterior
            if (resultado) console.log(`Data ${dataReg.toISOString()} está no mês anterior`)
            return resultado
          }

          return false
        })
      }

      console.log(`Registros filtrados: ${registrosFiltrados.length}`)

      // Recalcular totais com base nos registros filtrados
      if (registrosFiltrados.length > 0) {
        complexo.energiaPotencial = registrosFiltrados.reduce((sum, reg) => sum + reg.energiaPotencial, 0)
        complexo.energiaGerada = registrosFiltrados.reduce((sum, reg) => sum + reg.energiaGerada, 0)
        complexo.perdaEnergeticaAjustada = -Math.abs(
          registrosFiltrados.reduce((sum, reg) => sum + (reg.perdaEnergeticaAjustada || 0), 0),
        )
        complexo.perdaEnergeticaLimitacoesONS = -Math.abs(
          registrosFiltrados.reduce((sum, reg) => sum + (reg.perdaEnergeticaLimitacoesONS || 0), 0),
        )

        // Recalcular valores financeiros
        const tarifa = TARIFAS[complexo.complexo] || 0
        const perdaEnergeticaAjustadaAbs = Math.abs(complexo.perdaEnergeticaAjustada)
        const perdaEnergeticaLimitacoesONSAbs = Math.abs(complexo.perdaEnergeticaLimitacoesONS)
        const perdaTotal = perdaEnergeticaAjustadaAbs + perdaEnergeticaLimitacoesONSAbs

        complexo.totalMWhPerdidosRS = perdaTotal * tarifa
        complexo.totalMWhPerdidosAjustadaRS = perdaEnergeticaAjustadaAbs * tarifa
        complexo.indisponibilidade =
          complexo.energiaPotencial > 0 ? (1 - complexo.energiaGerada / complexo.energiaPotencial) * 100 : 0
      } else {
        // Se nenhum registro corresponder ao filtro, definir valores como 0
        complexo.energiaPotencial = 0
        complexo.energiaGerada = 0
        complexo.perdaEnergeticaAjustada = 0
        complexo.perdaEnergeticaLimitacoesONS = 0
        complexo.totalMWhPerdidosRS = 0
        complexo.totalMWhPerdidosAjustadaRS = 0
        complexo.indisponibilidade = 0
      }
    })

    return dadosCopia
  }

  // Função para formatar uma data para comparação (YYYY-MM-DD)
  const formatarDataParaComparacao = (data) => {
    try {
      const dataObj = converterParaData(data)
      if (!dataObj) return ""

      const ano = dataObj.getFullYear()
      const mes = String(dataObj.getMonth() + 1).padStart(2, "0")
      const dia = String(dataObj.getDate()).padStart(2, "0")

      return `${ano}-${mes}-${dia}`
    } catch (e) {
      console.error("Erro ao formatar data para comparação:", e, data)
      return ""
    }
  }

  // Update the useEffect to properly apply the filter
  // Replace the existing useEffect with this improved version:

  useEffect(() => {
    if (chartData.length > 0) {
      const dadosFiltrados = aplicarFiltroTempo(chartData, filtroTempo)
      setDadosFiltrados(dadosFiltrados)
    } else {
      setDadosFiltrados([])
    }
  }, [chartData, filtroTempo])

  // Função para importar dados do Excel
  const importarDados = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Função para processar o arquivo selecionado
  const processarArquivo = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsLoading(true)
    setErrorMessage("")

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: "array" })

        // Assume que os dados estão na primeira planilha
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (jsonData.length === 0) {
          throw new Error("Nenhum dado encontrado na planilha.")
        }

        console.log("Dados importados da planilha:", jsonData.slice(0, 3)) // Mostrar os primeiros 3 registros

        // Processar os dados
        const processedData = processExcelData(jsonData)
        console.log("Dados processados:", processedData)
        setChartData(processedData)
        alert("Dados importados com sucesso!")
      } catch (error) {
        console.error("Erro ao processar arquivo Excel:", error)
        setErrorMessage(error.message || "Erro desconhecido ao processar o arquivo.")
      } finally {
        setIsLoading(false)
        // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }

    reader.onerror = () => {
      setErrorMessage("Erro ao ler o arquivo. Verifique se o arquivo não está corrompido.")
      setIsLoading(false)
    }

    reader.readAsArrayBuffer(file)
  }

  // Função para baixar o modelo Excel
  const baixarModeloExcel = () => {
    try {
      // Criar uma nova planilha
      const ws = XLSX.utils.json_to_sheet(modeloExcelData)

      // Criar um novo workbook e adicionar a planilha
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Dados")

      // Gerar o arquivo e fazer o download
      XLSX.writeFile(wb, "modelo-analise-energetica.xlsx")
    } catch (error) {
      console.error("Erro ao gerar modelo Excel:", error)
      alert("Erro ao gerar o arquivo modelo. Por favor, tente novamente.")
    }
  }

  const exportarImagem = async () => {
    if (!chartContainerRef.current) return

    try {
      // Importar html2canvas dinamicamente
      const html2canvas = (await import("html2canvas")).default

      // Configurações para garantir qualidade e fidelidade da imagem
      const canvas = await await html2canvas(chartContainerRef.current, {
        scale: 2, // Aumenta a resolução
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        onclone: (documentClone) => {
          // Garantir que as fontes sejam aplicadas corretamente
          const styles = document.createElement("style")
          styles.innerHTML = `
            * {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              -webkit-font-smoothing: antialiased;
            }
            text {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            .chart-title {
              font-size: 24px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 8px;
            }
            .chart-subtitle {
              font-size: 14px;
              text-align: center;
              margin-bottom: 16px;
              color: #666;
            }
            .logo-container {
              position: absolute;
              top: 20px;
              right: 20px;
              width: 120px;
              height: 40px;
            }
          `
          documentClone.head.appendChild(styles)
        },
      })

      // Criar link para download
      const link = document.createElement("a")
      link.download = `analise-energetica-${new Date().toISOString().split("T")[0]}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (error) {
      console.error("Erro ao exportar imagem:", error)
      alert("Erro ao exportar imagem. Verifique o console para mais detalhes.")
    }
  }

  // Formatador para valores numéricos
  const formatarNumero = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor)
  }

  // Formatador para valores monetários
  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor)
  }

  // Formatador para percentuais
  const formatarPercentual = (valor) => {
    return (
      new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(valor) + "%"
    )
  }

  // Função para calcular o domínio do eixo Y com base nos dados
  const calcularDominioY = (dados) => {
    if (!dados || dados.length === 0) return [0, 0]

    // Encontrar os valores máximos e mínimos nos dados
    let maxPositivo = 0
    let minNegativo = 0

    dados.forEach((item) => {
      // Valores positivos (energia potencial e gerada)
      maxPositivo = Math.max(maxPositivo, item.energiaPotencial || 0, item.energiaGerada || 0)

      // Valores negativos (perdas)
      minNegativo = Math.min(minNegativo, item.perdaEnergeticaAjustada || 0, item.perdaEnergeticaLimitacoesONS || 0)
    })

    // Adicionar uma margem de 10%
    maxPositivo = maxPositivo * 1.1
    minNegativo = minNegativo * 1.1

    // Arredondar para números "fechados" - sempre múltiplos de 1000 ou mais
    const arredondarParaCima = (valor) => {
      if (valor === 0) return 1000

      // Garantir que o valor mínimo seja 1000
      if (valor < 1000) return 1000

      const magnitude = Math.pow(10, Math.floor(Math.log10(valor)))

      if (valor <= 2 * magnitude) {
        return Math.ceil(valor / magnitude) * magnitude
      } else if (valor <= 5 * magnitude) {
        return Math.ceil(valor / (2 * magnitude)) * (2 * magnitude)
      } else {
        return Math.ceil(valor / (5 * magnitude)) * (5 * magnitude)
      }
    }

    const arredondarParaBaixo = (valor) => {
      if (valor === 0) return -1000

      // Garantir que o valor mínimo seja -1000
      if (valor > -1000) return -1000

      const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(valor))))

      if (Math.abs(valor) <= 2 * magnitude) {
        return Math.floor(valor / magnitude) * magnitude
      } else if (Math.abs(valor) <= 5 * magnitude) {
        return Math.floor(valor / (2 * magnitude)) * (2 * magnitude)
      } else {
        return Math.floor(valor / (5 * magnitude)) * (5 * magnitude)
      }
    }

    const maxArredondado = arredondarParaCima(maxPositivo)
    const minArredondado = arredondarParaBaixo(minNegativo)

    return [minArredondado, maxArredondado]
  }

  // Função para gerar ticks personalizados para o eixo Y
  const gerarTicksEixoY = (min, max) => {
    // Garantir que o zero esteja incluído
    const ticks = [0]

    // Calcular o intervalo entre os ticks
    const intervalo = Math.max(1000, Math.ceil((max - min) / 6 / 1000) * 1000)

    // Adicionar ticks positivos
    for (let i = intervalo; i <= max; i += intervalo) {
      // Pular valores menores que 1000
      if (i >= 1000) {
        ticks.push(i)
      }
    }

    // Adicionar ticks negativos
    for (let i = -intervalo; i >= min; i -= intervalo) {
      // Pular valores maiores que -1000
      if (i <= -1000) {
        ticks.push(i)
      }
    }

    // Ordenar os ticks
    return ticks.sort((a, b) => a - b)
  }

  // Calcular totais com base nos dados filtrados
  const totais = calcularTotais(dadosFiltrados)

  // Dados completos incluindo totais
  const dadosCompletos = totais ? [...dadosFiltrados, totais] : []

  // Verificar se há dados para exibir
  const temDados = dadosCompletos.length > 0

  // Adicione esta função auxiliar para depuração:
  const formatarDataDebug = (data) => {
    if (!data) return "null"
    if (data instanceof Date) return data.toISOString()
    return String(data)
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <div ref={chartContainerRef} className="relative">
        {/* Logo no canto superior direito */}
        <div className="absolute top-4 right-4 z-10 logo-container">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-ikJ4O4iDYWPJphzIoGdOa8L7AnnFEs.png"
            alt="Energimp Logo"
            width={180}
            height={60}
            className="object-contain"
          />
        </div>

        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold chart-title">Análise Energética dos Complexos</CardTitle>
          {/* Update the CardDescription to use the dynamic period text
          Replace the CardDescription line with: */}
          <CardDescription className="text-sm chart-subtitle">{periodoTexto}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Gráfico principal ou mensagem de sem dados */}
            <div className="h-[500px] w-full" ref={chartRef}>
              {temDados ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosCompletos} margin={{ top: 20, right: 30, left: 30, bottom: 40 }}>
                    <XAxis
                      dataKey="complexo"
                      label={{
                        value: "Complexos",
                        position: "insideBottom",
                        offset: -10,
                        style: {
                          textAnchor: "middle",
                          ...axisLabelStyles,
                        },
                      }}
                      tick={{ ...globalStyles }}
                    />
                    <YAxis
                      label={{
                        value: "MWh",
                        angle: -90,
                        position: "insideLeft",
                        style: {
                          textAnchor: "middle",
                          ...axisLabelStyles,
                        },
                      }}
                      domain={calcularDominioY(dadosCompletos)}
                      ticks={gerarTicksEixoY(...calcularDominioY(dadosCompletos))}
                      tickFormatter={(value) => `${value}`}
                      tick={{ ...globalStyles }}
                      allowDataOverflow={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${formatarNumero(value)} MWh`, ""]}
                      labelFormatter={(label) => `Complexo: ${label}`}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ paddingTop: 10, bottom: 0 }} // Reduzido de 20px para 10px
                    />

                    {/* Energia Potencial (Azul) */}
                    <Bar dataKey="energiaPotencial" name="Energia Potencial (MWh)" fill="#4299e1" stackId="a">
                      <LabelList
                        dataKey="energiaPotencial"
                        position="top"
                        formatter={(value) => formatarNumero(value)}
                        style={{ fill: "#000", fontSize: "12px", fontWeight: "bold" }}
                      />
                    </Bar>

                    {/* Perda Energética Ajustada (Vermelho) */}
                    <Bar
                      dataKey="perdaEnergeticaAjustada"
                      name="Perda Energética Ajustada (MWh)"
                      fill="#f56565"
                      stackId="b"
                    >
                      <LabelList
                        dataKey="perdaEnergeticaAjustada"
                        position="inside"
                        formatter={(value) => formatarNumero(value)}
                        style={{ fill: "#fff", fontSize: "12px", fontWeight: "bold" }}
                      />
                    </Bar>

                    {/* Perda Energética por Limitações ONS (Vermelho escuro) */}
                    <Bar dataKey="perdaEnergeticaLimitacoesONS" name="Limitações ONS (MWh)" fill="#c53030" stackId="b">
                      <LabelList
                        dataKey="perdaEnergeticaLimitacoesONS"
                        position="inside"
                        formatter={(value) => formatarNumero(value)}
                        style={{ fill: "#fff", fontSize: "12px", fontWeight: "bold" }}
                      />
                    </Bar>

                    {/* Energia Gerada (Verde) - Escala proporcional */}
                    <Bar
                      dataKey="energiaGerada"
                      name="Energia Gerada (MWh)"
                      fill="#48bb78"
                      // Removido minPointSize para manter proporcionalidade
                    >
                      <LabelList
                        dataKey="energiaGerada"
                        position="top"
                        formatter={(value) => formatarNumero(value)}
                        style={{ fill: "#000", fontSize: "12px", fontWeight: "bold" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <BarChart2 className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Nenhum dado disponível</h3>
                  <p className="text-sm text-gray-500 text-center max-w-md mt-2">
                    Importe um arquivo Excel com os dados dos complexos para visualizar o gráfico de análise energética.
                  </p>
                  <Button onClick={importarDados} className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Dados
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </div>

      {/* Botão para exportar imagem - só aparece se houver dados */}
      <CardContent>
        {temDados && (
          <div className="flex justify-end">
            <Button onClick={exportarImagem} className="bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-4 w-4" />
              Exportar Imagem
            </Button>
          </div>
        )}

        {/* Informações adicionais - só aparecem se houver dados */}
        {temDados && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            {/* Mostrar apenas os 3 cartões: Papagaios, Morgado e Total */}
            {dadosCompletos
              .filter(
                (item) => item.complexo === "Papagaios" || item.complexo === "Morgado" || item.complexo === "Total",
              )
              .sort((a, b) => {
                // Ordenar para garantir que Total seja o último
                if (a.complexo === "Total") return 1
                if (b.complexo === "Total") return -1
                // Ordenar Papagaios e Morgado alfabeticamente
                return a.complexo.localeCompare(b.complexo)
              })
              .map((item, index) => (
                <Card key={index} className={item.complexo === "Total" ? "bg-gray-100" : ""}>
                  <CardHeader className="py-2">
                    <CardTitle className="text-lg">{item.complexo}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Energia Potencial:</span>
                        <span className="font-medium">{formatarNumero(item.energiaPotencial)} MWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Energia Gerada:</span>
                        <span className="font-medium">{formatarNumero(item.energiaGerada)} MWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Perda Energética Ajustada:</span>
                        <span className="font-medium text-red-500">
                          {formatarNumero(item.perdaEnergeticaAjustada)} MWh
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Limitações ONS:</span>
                        <span className="font-medium text-red-700">
                          {formatarNumero(item.perdaEnergeticaLimitacoesONS)} MWh
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Perda Total:</span>
                        <span className="font-medium text-red-600">
                          {formatarNumero(
                            Math.abs(item.perdaEnergeticaAjustada) + Math.abs(item.perdaEnergeticaLimitacoesONS),
                          )}{" "}
                          MWh
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Indisponibilidade:</span>
                        <span className="font-medium">{formatarPercentual(item.indisponibilidade)}</span>
                      </div>

                      {/* Novas linhas com informações financeiras */}
                      {item.complexo !== "Total" && (
                        <div className="flex justify-between">
                          <span>Tarifa:</span>
                          <span className="font-medium">{formatarMoeda(item.tarifa)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Total MWh Perdidos (R$):</span>
                        <span className="font-medium text-red-600">{formatarMoeda(item.totalMWhPerdidosRS)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total MWh Perdidos Ajustada (R$):</span>
                        <span className="font-medium text-red-500">
                          {formatarMoeda(item.totalMWhPerdidosAjustadaRS)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Importação de dados */}
        <Card className="mt-6">
          <CardHeader className="py-3">
            <CardTitle className="text-lg">Importar Dados</CardTitle>
            <CardDescription>Importe dados de uma planilha Excel para atualizar o gráfico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex flex-col gap-4">
                {/* Update the filter buttons UI to match the provided design
                Replace the filter buttons section with: */}
                <div className="flex items-center gap-2 mb-4">
                  <Label htmlFor="filtro-tempo" className="min-w-24">
                    Filtrar por período:
                  </Label>
                  <div className="flex">
                    <Button
                      variant="secondary"
                      className={`rounded-l-md rounded-r-none px-3 py-1 h-9 ${
                        filtroTempo === "hoje" ? "bg-gray-700 text-white" : "bg-gray-500 text-white hover:bg-gray-600"
                      }`}
                      onClick={() => setFiltroTempo("hoje")}
                    >
                      Hoje
                    </Button>
                    <Button
                      variant="secondary"
                      className={`rounded-none px-3 py-1 h-9 border-l border-gray-400 ${
                        filtroTempo === "ontem" ? "bg-gray-700 text-white" : "bg-gray-500 text-white hover:bg-gray-600"
                      }`}
                      onClick={() => setFiltroTempo("ontem")}
                    >
                      Ontem
                    </Button>
                    <Button
                      variant="secondary"
                      className={`rounded-none px-3 py-1 h-9 border-l border-gray-400 ${
                        filtroTempo === "este-mes"
                          ? "bg-gray-700 text-white"
                          : "bg-gray-500 text-white hover:bg-gray-600"
                      }`}
                      onClick={() => setFiltroTempo("este-mes")}
                    >
                      Este Mês
                    </Button>
                    <Button
                      variant="secondary"
                      className={`rounded-r-md rounded-l-none px-3 py-1 h-9 border-l border-gray-400 ${
                        filtroTempo === "mes-anterior"
                          ? "bg-gray-700 text-white"
                          : "bg-gray-500 text-white hover:bg-gray-600"
                      }`}
                      onClick={() => setFiltroTempo("mes-anterior")}
                    >
                      Mês Anterior
                    </Button>
                  </div>
                  <Button
                    variant="secondary"
                    className={`ml-2 px-3 py-1 h-9 ${
                      filtroTempo === "total" ? "bg-gray-700 text-white" : "bg-gray-500 text-white hover:bg-gray-600"
                    }`}
                    onClick={() => setFiltroTempo("total")}
                  >
                    Total
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={baixarModeloExcel} variant="outline" className="flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    Baixar Modelo Excel
                  </Button>
                  <p className="text-sm text-gray-500">Baixe o modelo para preencher com seus dados</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    id="importar"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={processarArquivo}
                    className="hidden"
                  />
                  <Button
                    onClick={importarDados}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={isLoading}
                  >
                    <Upload className="h-4 w-4" />
                    {isLoading ? "Importando..." : "Importar Dados"}
                  </Button>
                  <p className="text-sm text-gray-500">Selecione um arquivo Excel para importar</p>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    <p className="font-medium">Erro ao importar dados:</p>
                    <p className="text-sm">{errorMessage}</p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
                  <p className="font-medium">Formato esperado da planilha:</p>
                  <ul className="list-disc list-inside text-sm mt-1">
                    <li>Coluna "DIN_INSTANTE": Data e hora no formato DD/MM/YYYY</li>
                    <li>Coluna "COMPLEXO": Nome do complexo (MOR ou PPG)</li>
                    <li>Coluna "ENERGIA GERADA (MWH)": Valor numérico</li>
                    <li>Coluna "ENERGIA POTENCIAL (MWH)": Valor numérico</li>
                    <li>Coluna "PERDA ENERGÉTICA POR LIMITAÇÕES ONS (MWH)": Valor numérico</li>
                    <li>Coluna "PERDA ENERGÉTICA AJUSTADA (MWH)": Valor numérico</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
