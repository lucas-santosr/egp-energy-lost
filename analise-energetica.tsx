"use client"

import { useState, useRef } from "react"
import { Bar, BarChart, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Total: 0, // Será calculado dinamicamente
}

// Dados para o arquivo Excel modelo
const modeloExcelData = [
  {
    Complexo: "Morgado",
    "Energia Potencial (MWh)": 2102.83,
    "Energia Gerada (MWh)": 3.89,
    "Perda Energética Ajustada (MWh)": 1651.55,
    "Perda Energética por Limitações ONS (MWh)": 451.28,
  },
  {
    Complexo: "Papagaios",
    "Energia Potencial (MWh)": 2785.47,
    "Energia Gerada (MWh)": 6.8,
    "Perda Energética Ajustada (MWh)": 2369.51,
    "Perda Energética por Limitações ONS (MWh)": 415.96,
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

// Função para processar dados do Excel
const processExcelData = (excelData) => {
  try {
    // Verificar se há dados
    if (!excelData || excelData.length === 0) {
      throw new Error("Nenhum dado encontrado na planilha.")
    }

    // Verificar se as colunas necessárias existem no primeiro item
    const primeiroItem = excelData[0]
    const colunasNecessarias = [
      "Complexo",
      "Energia Potencial (MWh)",
      "Energia Gerada (MWh)",
      "Perda Energética Ajustada (MWh)",
      "Perda Energética por Limitações ONS (MWh)",
    ]

    const colunasAusentes = colunasNecessarias.filter((coluna) => !(coluna in primeiroItem))

    if (colunasAusentes.length > 0) {
      throw new Error(`Colunas ausentes na planilha: ${colunasAusentes.join(", ")}`)
    }

    // Mapear os dados do Excel para o formato esperado pelo gráfico
    const processedData = excelData.map((row, index) => {
      // Verificar valores numéricos
      const complexo = row.Complexo
      const energiaPotencial = Number.parseFloat(row["Energia Potencial (MWh)"])
      const energiaGerada = Number.parseFloat(row["Energia Gerada (MWh)"])
      const perdaEnergeticaAjustada = Number.parseFloat(row["Perda Energética Ajustada (MWh)"])
      const perdaEnergeticaLimitacoesONS = Number.parseFloat(row["Perda Energética por Limitações ONS (MWh)"])

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
      }
    })

    // Calcular indisponibilidade para cada item
    return processedData.map((item) => ({
      ...item,
      indisponibilidade: calcularIndisponibilidade(item),
    }))
  } catch (error) {
    console.error("Erro ao processar dados:", error)
    throw error
  }
}

export default function AnaliseEnergetica() {
  const [chartData, setChartData] = useState([]) // Iniciar com array vazio
  const [periodo, setPeriodo] = useState("01 a 21/03/2025")
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)
  const chartContainerRef = useRef(null) // Referência para o container inteiro (incluindo título)
  const chartRef = useRef(null) // Referência apenas para o gráfico

  // Calcular totais com base nos dados atuais
  const totais = calcularTotais(chartData)

  // Dados completos incluindo totais
  const dadosCompletos = totais ? [...chartData, totais] : []

  // Verificar se há dados para exibir
  const temDados = dadosCompletos.length > 0

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

        // Processar os dados
        const processedData = processExcelData(jsonData)
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
          <CardDescription className="text-sm chart-subtitle">período: {periodo}</CardDescription>
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
            {dadosCompletos.map((item, index) => (
              <Card key={index} className={index === dadosCompletos.length - 1 ? "bg-gray-100" : ""}>
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
                      <span className="font-medium text-red-500">{formatarMoeda(item.totalMWhPerdidosAjustadaRS)}</span>
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
            <div className="flex items-center gap-2">
              <Label htmlFor="periodo" className="min-w-24">
                Período:
              </Label>
              <Input
                id="periodo"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="Ex: 01 a 21/03/2025"
                className="max-w-xs"
              />
            </div>

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

                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
                  <p className="font-medium">Formato esperado da planilha:</p>
                  <ul className="list-disc list-inside text-sm mt-1">
                    <li>Coluna "Complexo": Nome do complexo</li>
                    <li>Coluna "Energia Potencial (MWh)": Valor numérico</li>
                    <li>Coluna "Energia Gerada (MWh)": Valor numérico</li>
                    <li>Coluna "Perda Energética Ajustada (MWh)": Valor numérico</li>
                    <li>Coluna "Perda Energética por Limitações ONS (MWh)": Valor numérico</li>
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

