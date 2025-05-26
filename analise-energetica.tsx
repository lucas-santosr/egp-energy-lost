"use client"

import { useState, useRef, useEffect } from "react"
import { Bar, BarChart, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Download, FileDown, Upload, BarChart2, CalendarIcon, Check, ChevronsUpDown } from "lucide-react"
import Image from "next/image"
import * as XLSX from "xlsx"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, isValid, parse, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

// Importar os novos utilitários
import {
  obterHoje,
  obterOntem,
  obterInicioMesAtual,
  obterInicioMesAnterior,
  obterFimMesAnterior,
} from "./utils/date-utils"
import {
  converterParaNumero,
  formatarNumero,
  formatarMoeda,
  formatarPercentual,
  arredondarParaMultiplo,
} from "./utils/number-utils"

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

// Opções de complexo para o filtro
const COMPLEXO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "Morgado", label: "Morgado" },
  { value: "Papagaios", label: "Papagaios" },
]

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
    "PERDA ENERGÉTICA POR LIMITAÇÕES ONS (MWH)": 1.459074,
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

/**
 * Converte uma string para número de forma robusta
 * @param value Valor a ser convertido
 * @param defaultValue Valor padrão caso a conversão falhe
 * @returns Número convertido ou valor padrão
 */
const parseNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue

  // Se já for um número, retorna diretamente
  if (typeof value === "number") return value

  try {
    // Converte string para formato que o parseFloat entende (substitui vírgula por ponto)
    const normalizedValue = String(value).replace(/\./g, "").replace(",", ".")
    const result = Number.parseFloat(normalizedValue)
    return isNaN(result) ? defaultValue : result
  } catch (error) {
    console.error("Erro ao converter para número:", error, value)
    return defaultValue
  }
}

/**
 * Converte uma string de data para um objeto Date de forma robusta
 * @param dataString String de data a ser convertida
 * @returns Objeto Date ou null se a conversão falhar
 */
const parseDate = (dataString) => {
  if (!dataString) return null

  // Se já for um objeto Date, retorna diretamente
  if (dataString instanceof Date && isValid(dataString)) return dataString

  // Converte para string se não for
  const strValue = String(dataString).trim()

  try {
    // Tenta diferentes formatos de data

    // Formato DD/MM/YYYY
    if (strValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parsedDate = parse(strValue, "dd/MM/yyyy", new Date())
      if (isValid(parsedDate)) {
        return parsedDate
      }
    }

    // Formato DD-MM-YYYY
    if (strValue.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const parsedDate = parse(strValue, "dd-MM-yyyy", new Date())
      if (isValid(parsedDate)) {
        return parsedDate
      }
    }

    // Formato YYYY-MM-DD
    if (strValue.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const parsedDate = parseISO(strValue)
      if (isValid(parsedDate)) {
        return parsedDate
      }
    }

    // Formato MM/DD/YYYY (americano)
    if (strValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parsedDate = parse(strValue, "MM/dd/yyyy", new Date())
      if (isValid(parsedDate)) {
        return parsedDate
      }
    }

    // Tenta converter diretamente
    const directDate = new Date(strValue)
    if (isValid(directDate)) {
      return directDate
    }

    // Tenta extrair componentes da data de formatos numéricos (Excel)
    if (!isNaN(Number(strValue))) {
      // Converte número do Excel para data
      const excelDate = XLSX.SSF.parse_date_code(Number(strValue))
      if (excelDate) {
        const { y: year, m: month, d: day } = excelDate
        const date = new Date(year, month - 1, day)
        if (isValid(date)) {
          return date
        }
      }
    }

    console.warn("Formato de data não reconhecido:", strValue)
    return null
  } catch (error) {
    console.error("Erro ao converter data:", error, strValue)
    return null
  }
}

// Função para formatar a data para comparação (YYYY-MM-DD)
const formatarDataParaComparacao = (data) => {
  if (!data) return null
  try {
    // Tenta converter para um objeto Date se não for
    const dateObj = data instanceof Date ? data : new Date(data)
    if (!isValid(dateObj)) {
      console.warn("Data inválida:", data)
      return null
    }
    return format(dateObj, "yyyy-MM-dd")
  } catch (error) {
    console.error("Erro ao formatar data:", error, data)
    return null
  }
}

// Calcular totais
const calcularTotais = (data) => {
  if (!data || data.length === 0) return null

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
    totais.energiaPotencial += parseNumber(item.energiaPotencial)
    totais.energiaGerada += parseNumber(item.energiaGerada)
    totais.perdaEnergeticaAjustada += parseNumber(item.perdaEnergeticaAjustada)
    totais.perdaEnergeticaLimitacoesONS += parseNumber(item.perdaEnergeticaLimitacoesONS)

    // Somar os valores financeiros
    totais.totalMWhPerdidosRS += parseNumber(item.totalMWhPerdidosRS)
    totais.totalMWhPerdidosAjustadaRS += parseNumber(item.totalMWhPerdidosAjustadaRS)
  })

  // Calcular indisponibilidade conforme a fórmula: 1-(Energia Gerada total / Energia potencial total)
  totais.indisponibilidade =
    totais.energiaPotencial > 0 ? (1 - totais.energiaGerada / totais.energiaPotencial) * 100 : 0

  return totais
}

// Modificar a função que processa os dados para agrupar por complexo
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

    // Log para depuração
    console.log("Processando dados da planilha. Primeiros registros:", excelData.slice(0, 3))

    excelData.forEach((row, index) => {
      try {
        // Obter os valores das colunas usando os nomes encontrados
        const complexoOriginal = row[colunaComplexo]
        // Mapear abreviações para nomes completos se necessário
        const complexo = COMPLEXO_MAPPING[complexoOriginal] || complexoOriginal

        // Atualizar a função processExcelData para usar os novos utilitários
        // Encontrar a seção onde os valores são convertidos:
        const energiaPotencial = converterParaNumero(row[colunaEnergiaPotencial])
        const energiaGerada = converterParaNumero(row[colunaEnergiaGerada])
        const perdaEnergeticaAjustada = converterParaNumero(row[colunaPerdaAjustada])
        const perdaEnergeticaLimitacoesONS = converterParaNumero(row[colunaPerdaLimitacoesONS])
        const dinInstante = row[colunaDinInstante]

        // Validar valores
        if (isNaN(energiaPotencial)) {
          console.warn(`Valor inválido para Energia Potencial na linha ${index + 2}: ${row[colunaEnergiaPotencial]}`)
        }
        if (isNaN(energiaGerada)) {
          console.warn(`Valor inválido para Energia Gerada na linha ${index + 2}: ${row[colunaEnergiaGerada]}`)
        }
        if (isNaN(perdaEnergeticaAjustada)) {
          console.warn(
            `Valor inválido para Perda Energética Ajustada na linha ${index + 2}: ${row[colunaPerdaAjustada]}`,
          )
        }
        if (isNaN(perdaEnergeticaLimitacoesONS)) {
          console.warn(
            `Valor inválido para Perda Energética por Limitações ONS na linha ${index + 2}: ${row[colunaPerdaLimitacoesONS]}`,
          )
        }

        // Validar data
        const dataObj = parseDate(dinInstante)
        if (!dataObj) {
          console.warn(`Data inválida na linha ${index + 2}: ${dinInstante}`)
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

        // Atualizar a função processExcelData para armazenar a data simplificada
        // Encontrar a parte onde os registros são adicionados ao complexo:
        dadosPorComplexo[complexo].registros.push({
          dinInstante,
          dataObj, // Armazenar o objeto Date para facilitar a filtragem
          dataSimplificada: formatarDataParaComparacao(dataObj), // Adicionar formato simplificado YYYY-MM-DD
          energiaPotencial,
          energiaGerada,
          perdaEnergeticaAjustada,
          perdaEnergeticaLimitacoesONS,
        })
      } catch (error) {
        console.error(`Erro ao processar linha ${index + 2}:`, error, row)
      }
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
        indisponibilidade: energiaPotencial > 0 ? (1 - energiaGerada / energiaPotencial) * 100 : 0,
      }
    })

    return processedData
  } catch (error) {
    console.error("Erro ao processar dados:", error)
    throw error
  }
}

// Componente DatePicker personalizado
function DatePicker({ value, onChange, label, placeholder }) {
  return (
    <div className="flex flex-col space-y-1">
      <Label htmlFor={label}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd/MM/yyyy", { locale: ptBR }) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={value} onSelect={onChange} initialFocus locale={ptBR} />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Componente Combobox personalizado
function Combobox({ options, value, onChange }) {
  const [open, setOpen] = useState(false)

  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {selectedOption ? selectedOption.label : "Selecione..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar complexo..." />
          <CommandList>
            <CommandEmpty>Nenhum complexo encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function AnaliseEnergetica() {
  const [chartData, setChartData] = useState([]) // Iniciar com array vazio
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)
  const chartContainerRef = useRef(null) // Referência para o container inteiro (incluindo título)
  const chartRef = useRef(null) // Referência apenas para o gráfico

  // Estados para os filtros
  const [filtroTempo, setFiltroTempo] = useState("total")
  const [periodoTexto, setPeriodoTexto] = useState("Total")
  const [dadosFiltrados, setDadosFiltrados] = useState([])

  // Novos estados para os filtros personalizados
  const [dataInicio, setDataInicio] = useState(null)
  const [dataFim, setDataFim] = useState(null)
  const [complexoSelecionado, setComplexoSelecionado] = useState("todos")
  const [filtroPersonalizado, setFiltroPersonalizado] = useState(false)

  // Estado para debug
  const [debugInfo, setDebugInfo] = useState("")

  // Função para aplicar filtros personalizados
  const aplicarFiltrosPersonalizados = () => {
    if (dataInicio && dataFim) {
      setFiltroPersonalizado(true)
      setFiltroTempo("personalizado")
      aplicarFiltros()
    } else {
      alert("Por favor, selecione uma data de início e uma data de fim.")
    }
  }

  // Função para limpar filtros personalizados
  const limparFiltrosPersonalizados = () => {
    setDataInicio(null)
    setDataFim(null)
    setComplexoSelecionado("todos")
    setFiltroPersonalizado(false)
    setFiltroTempo("total")
    aplicarFiltros()
  }

  // Função unificada para aplicar todos os filtros
  const aplicarFiltros = () => {
    console.log("=== INICIANDO APLICAÇÃO DE FILTROS ===")
    console.log("Filtro tempo:", filtroTempo)
    console.log("Data início:", dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Não selecionada")
    console.log("Data fim:", dataFim ? format(dataFim, "dd/MM/yyyy") : "Não selecionada")
    console.log("Complexo selecionado:", complexoSelecionado)
    console.log("Total de complexos nos dados:", chartData.length)

    if (chartData.length === 0) {
      console.log("Nenhum dado disponível para filtrar")
      return
    }

    let dadosFiltradosPorData = []

    // Determinar o texto do período com base no filtro
    if (filtroTempo === "personalizado") {
      if (dataInicio && dataFim) {
        const dataInicioFormatada = format(dataInicio, "dd/MM/yyyy", { locale: ptBR })
        const dataFimFormatada = format(dataFim, "dd/MM/yyyy", { locale: ptBR })
        setPeriodoTexto(`${dataInicioFormatada} a ${dataFimFormatada}`)

        console.log("Aplicando filtro personalizado...")
        // Filtrar por período personalizado
        dadosFiltradosPorData = filtrarPorPeriodoPersonalizado(chartData, dataInicio, dataFim)
      } else {
        setPeriodoTexto("Período Personalizado")
        console.log("Filtro personalizado sem datas válidas, usando todos os dados")
        dadosFiltradosPorData = [...chartData]
      }
    } else {
      console.log("Aplicando filtro predefinido...")
      // Aplicar filtros predefinidos
      dadosFiltradosPorData = aplicarFiltroPredefinido(chartData, filtroTempo)
    }

    // Filtrar por complexo
    const dadosFiltradosFinal = filtrarPorComplexo(dadosFiltradosPorData, complexoSelecionado)

    console.log("=== RESULTADO FINAL DA FILTRAGEM ===")
    console.log("Total de complexos após filtro:", dadosFiltradosFinal.length)
    dadosFiltradosFinal.forEach((complexo) => {
      console.log(`${complexo.complexo}: ${complexo.registros ? complexo.registros.length : 0} registros`)
    })

    setDadosFiltrados(dadosFiltradosFinal)
  }

  // Função para filtrar por período personalizado
  const filtrarPorPeriodoPersonalizado = (dados, inicio, fim) => {
    if (!dados || dados.length === 0 || !inicio || !fim) return dados

    console.log(`Filtrando por período personalizado:`)
    console.log(`Data início selecionada: ${format(inicio, "dd/MM/yyyy")}`)
    console.log(`Data fim selecionada: ${format(fim, "dd/MM/yyyy")}`)

    // Converter as datas de filtro para o formato de comparação (YYYY-MM-DD)
    const dataInicioComparacao = formatarDataParaComparacao(inicio)
    const dataFimComparacao = formatarDataParaComparacao(fim)

    console.log(`Data início para comparação: ${dataInicioComparacao}`)
    console.log(`Data fim para comparação: ${dataFimComparacao}`)

    // Criar uma cópia profunda dos dados para evitar modificar o original
    const dadosCopia = JSON.parse(JSON.stringify(dados))

    // Para cada complexo, filtrar seus registros com base no período
    dadosCopia.forEach((complexo) => {
      if (!complexo.registros || complexo.registros.length === 0) return

      console.log(`\nProcessando complexo: ${complexo.complexo}`)
      console.log(`Total de registros antes do filtro: ${complexo.registros.length}`)

      // Filtrar registros dentro do período selecionado
      const registrosFiltrados = complexo.registros.filter((reg) => {
        if (!reg.dinInstante) {
          console.log(`Registro sem data: ${JSON.stringify(reg)}`)
          return false
        }

        // Converter a data do registro para o formato de comparação
        const dataRegObj = parseDate(reg.dinInstante)
        if (!dataRegObj) {
          console.log(`Data inválida no registro: ${reg.dinInstante}`)
          return false
        }

        const dataRegComparacao = formatarDataParaComparacao(dataRegObj)

        // Verificar se a data do registro está dentro do intervalo
        const dentroDoIntervalo = dataRegComparacao >= dataInicioComparacao && dataRegComparacao <= dataFimComparacao

        if (dentroDoIntervalo) {
          console.log(`✓ Registro incluído - Data: ${reg.dinInstante} (${dataRegComparacao})`)
        } else {
          console.log(`✗ Registro excluído - Data: ${reg.dinInstante} (${dataRegComparacao})`)
        }

        return dentroDoIntervalo
      })

      console.log(`Total de registros após o filtro: ${registrosFiltrados.length}`)

      // Recalcular totais com base nos registros filtrados
      atualizarTotaisComplexo(complexo, registrosFiltrados)
    })

    return dadosCopia
  }

  // Função para aplicar filtro predefinido
  const aplicarFiltroPredefinido = (dados, filtro) => {
    if (!dados || dados.length === 0) return []

    console.log(`Aplicando filtro predefinido: ${filtro}`)

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

    // Obter as datas de referência
    const hoje = obterHoje()
    const ontem = obterOntem()
    const inicioMesAtual = obterInicioMesAtual()
    const inicioMesAnterior = obterInicioMesAnterior()
    const fimMesAnterior = obterFimMesAnterior()

    // Converter para formato de comparação
    const hojeComparacao = formatarDataParaComparacao(hoje)
    const ontemComparacao = formatarDataParaComparacao(ontem)
    const inicioMesAtualComparacao = formatarDataParaComparacao(inicioMesAtual)
    const inicioMesAnteriorComparacao = formatarDataParaComparacao(inicioMesAnterior)
    const fimMesAnteriorComparacao = formatarDataParaComparacao(fimMesAnterior)

    // Criar uma cópia profunda dos dados para evitar modificar o original
    const dadosCopia = JSON.parse(JSON.stringify(dados))

    // Para cada complexo, filtrar seus registros com base no filtro de tempo
    dadosCopia.forEach((complexo) => {
      if (!complexo.registros || complexo.registros.length === 0) return

      let registrosFiltrados = []

      if (filtro === "total") {
        registrosFiltrados = [...complexo.registros]
      } else {
        registrosFiltrados = complexo.registros.filter((reg) => {
          if (!reg.dinInstante) return false

          // Converter a data do registro para o formato de comparação
          const dataRegObj = parseDate(reg.dinInstante)
          if (!dataRegObj) return false

          const dataRegComparacao = formatarDataParaComparacao(dataRegObj)

          if (filtro === "hoje") {
            return dataRegComparacao === hojeComparacao
          } else if (filtro === "ontem") {
            return dataRegComparacao === ontemComparacao
          } else if (filtro === "este-mes") {
            return dataRegComparacao >= inicioMesAtualComparacao && dataRegComparacao <= hojeComparacao
          } else if (filtro === "mes-anterior") {
            return dataRegComparacao >= inicioMesAnteriorComparacao && dataRegComparacao <= fimMesAnteriorComparacao
          }

          return false
        })
      }

      console.log(`Complexo ${complexo.complexo}: ${registrosFiltrados.length} registros após filtro ${filtro}`)

      // Recalcular totais com base nos registros filtrados
      atualizarTotaisComplexo(complexo, registrosFiltrados)
    })

    return dadosCopia
  }

  // Função para filtrar por complexo
  const filtrarPorComplexo = (dados, complexo) => {
    if (!dados || dados.length === 0) return []
    if (complexo === "todos") return dados

    console.log(`Filtrando por complexo: ${complexo}`)

    // Filtrar apenas o complexo selecionado
    return dados.filter((item) => item.complexo === complexo)
  }

  // Função para atualizar os totais de um complexo com base nos registros filtrados
  const atualizarTotaisComplexo = (complexo, registrosFiltrados) => {
    if (registrosFiltrados.length > 0) {
      complexo.energiaPotencial = registrosFiltrados.reduce((sum, reg) => sum + parseNumber(reg.energiaPotencial), 0)
      complexo.energiaGerada = registrosFiltrados.reduce((sum, reg) => sum + parseNumber(reg.energiaGerada), 0)
      complexo.perdaEnergeticaAjustada = -Math.abs(
        registrosFiltrados.reduce((sum, reg) => sum + parseNumber(reg.perdaEnergeticaAjustada), 0),
      )
      complexo.perdaEnergeticaLimitacoesONS = -Math.abs(
        registrosFiltrados.reduce((sum, reg) => sum + parseNumber(reg.perdaEnergeticaLimitacoesONS), 0),
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
  }

  // Atualizar useEffect para aplicar filtros quando os estados mudarem
  useEffect(() => {
    aplicarFiltros()
  }, [chartData, filtroTempo, complexoSelecionado, filtroPersonalizado])

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

        // Mostrar informações de debug sobre as datas
        // Atualizar a parte onde mostra informações de debug sobre as datas
        const debugDates = processedData.flatMap((complexo) =>
          complexo.registros.slice(0, 3).map((reg) => ({
            complexo: complexo.complexo,
            dinInstante: reg.dinInstante,
            dataConvertida: reg.dataSimplificada || formatarDataParaComparacao(reg.dinInstante),
          })),
        )
        setDebugInfo(`Primeiras datas: ${JSON.stringify(debugDates, null, 2)}`)

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
      const canvas = await html2canvas(chartContainerRef.current, {
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

  // Função para calcular o domínio do eixo Y com base nos dados
  const calcularDominioY = (dados) => {
    if (!dados || dados.length === 0) return [0, 0]

    // Encontrar os valores máximos e mínimos nos dados
    let maxPositivo = 0
    let minNegativo = 0

    dados.forEach((item) => {
      // Valores positivos (energia potencial e gerada)
      maxPositivo = Math.max(maxPositivo, parseNumber(item.energiaPotencial), parseNumber(item.energiaGerada))

      // Valores negativos (perdas)
      minNegativo = Math.min(
        minNegativo,
        parseNumber(item.perdaEnergeticaAjustada),
        parseNumber(item.perdaEnergeticaLimitacoesONS),
      )
    })

    // Adicionar uma margem de 10%
    maxPositivo = maxPositivo * 1.1
    minNegativo = minNegativo * 1.1

    // Arredondar para números "fechados" - sempre múltiplos de 1000 ou mais
    const arredondarParaCima = (valor) => arredondarParaMultiplo(valor, 1000, "cima")
    const arredondarParaBaixo = (valor) => arredondarParaMultiplo(Math.abs(valor), 1000, "baixo") * (valor < 0 ? -1 : 1)

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
          <CardDescription className="text-sm chart-subtitle">{periodoTexto}</CardDescription>
        </CardHeader>

        {/* Filtros na parte superior */}
        <CardContent className="pb-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <DatePicker
              value={dataInicio}
              onChange={setDataInicio}
              label="Data Início"
              placeholder="Selecione a data inicial"
            />
            <DatePicker value={dataFim} onChange={setDataFim} label="Data Fim" placeholder="Selecione a data final" />
            <div className="flex flex-col space-y-1">
              <Label htmlFor="complexo">Complexo</Label>
              <Combobox options={COMPLEXO_OPTIONS} value={complexoSelecionado} onChange={setComplexoSelecionado} />
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-2">
              <Button
                onClick={aplicarFiltrosPersonalizados}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!dataInicio || !dataFim}
              >
                Aplicar Filtros
              </Button>
              <Button onClick={limparFiltrosPersonalizados} variant="outline">
                Limpar Filtros
              </Button>
            </div>

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
                  filtroTempo === "este-mes" ? "bg-gray-700 text-white" : "bg-gray-500 text-white hover:bg-gray-600"
                }`}
                onClick={() => setFiltroTempo("este-mes")}
              >
                Este Mês
              </Button>
              <Button
                variant="secondary"
                className={`rounded-r-md rounded-l-none px-3 py-1 h-9 border-l border-gray-400 ${
                  filtroTempo === "mes-anterior" ? "bg-gray-700 text-white" : "bg-gray-500 text-white hover:bg-gray-600"
                }`}
                onClick={() => setFiltroTempo("mes-anterior")}
              >
                Mês Anterior
              </Button>
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
          </div>
        </CardContent>

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
            {/* Mostrarr apenas os 3 cartões: Papagaios, Morgado e Total */}
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

                {debugInfo && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
                    <p className="font-medium">Informações de depuração:</p>
                    <pre className="text-xs overflow-auto max-h-40">{debugInfo}</pre>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
                  <p className="font-medium">Formato esperado da planilha:</p>
                  <ul className="list-disc list-inside text-sm">
                    <li>A primeira linha deve conter os cabeçalhos das colunas.</li>
                    <li>
                      As colunas devem incluir: DIN_INSTANTE, COMPLEXO, ENERGIA GERADA (MWH), ENERGIA POTENCIAL (MWH),
                      PERDA ENERGÉTICA POR LIMITAÇÕES ONS (MWH), PERDA ENERGÉTICA AJUSTADA (MWH).
                    </li>
                    <li>A coluna COMPLEXO deve conter os valores "MOR" ou "PPG".</li>
                    <li>A coluna DIN_INSTANTE deve estar no formato DD/MM/AAAA.</li>
                    <li>As colunas de energia devem conter valores numéricos.</li>
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
