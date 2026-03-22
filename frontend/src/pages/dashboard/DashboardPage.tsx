import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Package, AlertTriangle, Tag, ArrowLeftRight,
  TrendingUp, TrendingDown,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip,
} from 'recharts'
import { dashboardService } from '../../services/dashboard_service'
import type {
  DashboardStats, ProdutoEstoqueBaixo, MovimentacaoRecente,
  StockByCategory, MovementTrend,
} from '../../services/dashboard_service'

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

// ── Card KPI ─────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, color, onClick,
}: {
  label: string; value: number; icon: React.ElementType; color: string; onClick?: () => void
}) {
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    red:    'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    green:  'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    slate:  'bg-gray-50 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
  }

  return (
    <div
      onClick={onClick}
      className={`card p-3 sm:p-4 flex items-center gap-3 min-w-0 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`p-2 sm:p-2.5 rounded-md shrink-0 ${colorMap[color] ?? colorMap.slate}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{label}</p>
      </div>
    </div>
  )
}

// ── Donut Chart ──────────────────────────────────────────────
function DonutChart({ data }: { data: StockByCategory[] }) {
  if (data.length === 0) {
    return <div className="py-12 text-center text-sm text-gray-400">Nenhum dado disponivel.</div>
  }

  const total = data.reduce((acc, d) => acc + d.total_estoque, 0)

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total_estoque"
          nameKey="categoria"
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <ReTooltip
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg, #fff)',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string) => [
            `${value.toLocaleString('pt-BR')} un. (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
            name,
          ]}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
        />
        {/* Center label */}
        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="central" className="fill-gray-900 dark:fill-white" style={{ fontSize: '22px', fontWeight: 700 }}>
          {total.toLocaleString('pt-BR')}
        </text>
        <text x="50%" y="57%" textAnchor="middle" dominantBaseline="central" className="fill-gray-400" style={{ fontSize: '11px' }}>
          itens totais
        </text>
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Line Chart ───────────────────────────────────────────────
function TrendChart({ data }: { data: MovementTrend[] }) {
  if (data.length === 0) {
    return <div className="py-12 text-center text-sm text-gray-400">Nenhum dado disponivel.</div>
  }

  const chartData = data.map(d => ({
    ...d,
    mes_label: d.mes_label.charAt(0).toUpperCase() + d.mes_label.slice(1),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
        <XAxis
          dataKey="mes_label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <LineTooltip
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg, #fff)',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string) => [
            value.toLocaleString('pt-BR'),
            name === 'entradas' ? 'Entradas' : 'Saidas',
          ]}
          labelFormatter={(label) => `Mes: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="entradas"
          name="entradas"
          stroke="#22c55e"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="saidas"
          name="saidas"
          stroke="#ef4444"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
          formatter={(value) => value === 'entradas' ? 'Entradas' : 'Saidas'}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Tabela estoque baixo ─────────────────────────────────────
function TabelaEstoqueBaixo({ items }: { items: ProdutoEstoqueBaixo[] }) {
  const navigate = useNavigate()

  if (items.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-400">Nenhum produto com estoque baixo.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 dark:border-slate-700">
          <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            <th className="px-3 sm:px-4 py-2">Produto</th>
            <th className="px-3 sm:px-4 py-2 hidden sm:table-cell">Categoria</th>
            <th className="px-3 sm:px-4 py-2 text-right">Atual</th>
            <th className="px-3 sm:px-4 py-2 text-right">Minimo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
          {items.map(p => (
            <tr key={p.PROIDPRODUTO} onClick={() => navigate('/produtos')} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
              <td className="px-3 sm:px-4 py-2">
                <div className="font-medium text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none">{p.PRONOME}</div>
                {p.PROSKU && <div className="text-xs text-gray-400">{p.PROSKU}</div>}
              </td>
              <td className="px-3 sm:px-4 py-2 text-gray-500 dark:text-slate-400 hidden sm:table-cell">{p.categoria_nome || '—'}</td>
              <td className="px-3 sm:px-4 py-2 text-right text-red-600 font-medium">{p.PROESTOQUEATUAL}</td>
              <td className="px-3 sm:px-4 py-2 text-right text-gray-500 dark:text-slate-400">{p.PROESTOQUEMINIMO}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Lista movimentações recentes ─────────────────────────────
function ListaMovimentacoes({ items }: { items: MovimentacaoRecente[] }) {
  if (items.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-400">Nenhuma movimentacao registrada.</div>
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
      {items.map(mov => {
        const isEntrada = mov.tipo_operacao === '+'
        return (
          <div key={mov.MOVIDMOVIMENTACAO} className="flex items-center gap-3 px-4 py-3">
            <div className={`p-1.5 rounded-md ${isEntrada
              ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {isEntrada ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{mov.produto_nome}</div>
              <div className="text-xs text-gray-400">
                {mov.tipo_codigo} — {new Date(mov.MOVDATACADASTRO).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <span className={`text-sm font-semibold ${isEntrada ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isEntrada ? '+' : '-'}{mov.MOVQUANTIDADE}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Pagina principal ─────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  })

  const { data: lowStock = [] } = useQuery<ProdutoEstoqueBaixo[]>({
    queryKey: ['dashboard-low-stock'],
    queryFn: dashboardService.getLowStock,
  })

  const { data: recentMovements = [] } = useQuery<MovimentacaoRecente[]>({
    queryKey: ['dashboard-recent-movements'],
    queryFn: dashboardService.getRecentMovements,
  })

  const { data: stockByCategory = [] } = useQuery<StockByCategory[]>({
    queryKey: ['dashboard-stock-by-category'],
    queryFn: dashboardService.getStockByCategory,
  })

  const { data: movementTrends = [] } = useQuery<MovementTrend[]>({
    queryKey: ['dashboard-movement-trends'],
    queryFn: dashboardService.getMovementTrends,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard label="Produtos Ativos" value={stats?.totalProdutosAtivos ?? 0} icon={Package} color="blue" onClick={() => navigate('/produtos')} />
        <KpiCard label="Estoque Baixo" value={stats?.totalEstoqueBaixo ?? 0} icon={AlertTriangle} color="red" onClick={() => navigate('/produtos')} />
        <KpiCard label="Categorias" value={stats?.totalCategorias ?? 0} icon={Tag} color="purple" onClick={() => navigate('/categorias')} />
        <KpiCard label="Movimentacoes" value={stats?.totalMovimentacoes ?? 0} icon={ArrowLeftRight} color="slate" onClick={() => navigate('/movimentacoes')} />
        <KpiCard label="Entradas Hoje" value={stats?.entradasHoje ?? 0} icon={TrendingUp} color="green" />
        <KpiCard label="Saidas Hoje" value={stats?.saidasHoje ?? 0} icon={TrendingDown} color="orange" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut - Distribuição por Categoria */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Estoque por Categoria</h2>
          </div>
          <div className="p-4">
            <DonutChart data={stockByCategory} />
          </div>
        </div>

        {/* Line - Tendência de Movimentações */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Movimentacoes - Ultimos 12 Meses</h2>
          </div>
          <div className="p-4">
            <TrendChart data={movementTrends} />
          </div>
        </div>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Produtos com Estoque Baixo
            </h2>
          </div>
          <TabelaEstoqueBaixo items={lowStock} />
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-blue-500" />
              Movimentacoes Recentes
            </h2>
          </div>
          <ListaMovimentacoes items={recentMovements} />
        </div>
      </div>
    </div>
  )
}
