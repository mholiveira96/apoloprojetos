import { useState, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { Search } from 'lucide-react'
import projetosData from '@/data/projetos.json'

type Projeto = {
  id: number
  cliente: string
  disciplinas: string[]
  ano: number
  cidade: string
  tipo: string
}

const projetos: Projeto[] = projetosData as Projeto[]

const disciplinas = ['Todas', 'Estrutural', 'Elétrica', 'Hidráulica', 'Combate a Incêndio']
const disciplinaColors: Record<string, string> = {
  Estrutural: 'bg-blue-100 text-blue-700',
  Elétrica: 'bg-yellow-100 text-yellow-700',
  Hidráulica: 'bg-cyan-100 text-cyan-700',
  'Combate a Incêndio': 'bg-red-100 text-red-700',
}

export function Projetos() {
  const [busca, setBusca] = useState('')
  const [disciplina, setDisciplina] = useState('Todas')
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  const filtrados = useMemo(() => {
    return projetos.filter((p) => {
      const matchBusca =
        busca === '' ||
        p.cliente.toLowerCase().includes(busca.toLowerCase()) ||
        p.cidade.toLowerCase().includes(busca.toLowerCase())
      const matchDisciplina =
        disciplina === 'Todas' || p.disciplinas.includes(disciplina)
      return matchBusca && matchDisciplina
    })
  }, [busca, disciplina])

  return (
    <section id="projetos" className="py-24 bg-gray-50" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="text-orange-500 font-semibold text-sm uppercase tracking-widest">
            Base de Projetos
          </span>
          <h2 className="text-4xl font-black text-gray-900 mt-2">Todos os Projetos</h2>
          <p className="text-gray-500 mt-3">
            {projetos.length}+ projetos realizados. Pesquise por cliente, cidade ou disciplina.
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por cliente ou cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            />
          </div>
          <select
            value={disciplina}
            onChange={(e) => setDisciplina(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          >
            {disciplinas.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        {inView && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Cidade</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Disciplinas</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Ano</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        Nenhum projeto encontrado
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((p, i) => (
                      <tr
                        key={p.id}
                        className={`border-b border-gray-50 hover:bg-orange-50/50 transition-colors ${
                          i % 2 === 0 ? '' : 'bg-gray-50/30'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{p.cliente}</td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.cidade}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {p.disciplinas.map((d) => (
                              <span
                                key={d}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${disciplinaColors[d] ?? 'bg-gray-100 text-gray-600'}`}
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.tipo}</td>
                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{p.ano}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-50">
              Mostrando {filtrados.length} de {projetos.length} projetos
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
