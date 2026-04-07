import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

const filtros = ['Todos', 'Estrutural', 'Elétrica', 'Hidráulica', 'Combate a Incêndio']

// Placeholder portfolio items — replace src with actual images from Drive
const items = [
  { id: 1, titulo: 'Residencial Jardins', disciplina: 'Estrutural', local: 'São Paulo, SP', src: null },
  { id: 2, titulo: 'Galpão Industrial', disciplina: 'Combate a Incêndio', local: 'Santo André, SP', src: null },
  { id: 3, titulo: 'Edifício Comercial Centro', disciplina: 'Elétrica', local: 'Campinas, SP', src: null },
  { id: 4, titulo: 'Condomínio Alphaville', disciplina: 'Hidráulica', local: 'Barueri, SP', src: null },
  { id: 5, titulo: 'Hospital Regional', disciplina: 'Elétrica', local: 'São Bernardo, SP', src: null },
  { id: 6, titulo: 'Shopping Atacado', disciplina: 'Estrutural', local: 'Guarulhos, SP', src: null },
]

const disciplinaColors: Record<string, string> = {
  Estrutural: 'bg-blue-100 text-blue-700',
  Elétrica: 'bg-yellow-100 text-yellow-700',
  Hidráulica: 'bg-cyan-100 text-cyan-700',
  'Combate a Incêndio': 'bg-red-100 text-red-700',
}

export function Portfolio() {
  const [filtro, setFiltro] = useState('Todos')
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  const filtered = filtro === 'Todos' ? items : items.filter((i) => i.disciplina === filtro)

  return (
    <section id="portfolio" className="py-24 bg-white" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="text-orange-500 font-semibold text-sm uppercase tracking-widest">
            Nossos Projetos
          </span>
          <h2 className="text-4xl font-black text-gray-900 mt-2">Portfólio</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Uma seleção de projetos realizados com excelência técnica.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {filtros.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filtro === f
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
            >
              {/* Image placeholder */}
              <div className="h-48 bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center relative overflow-hidden">
                {item.src ? (
                  <img src={item.src} alt={item.titulo} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/30 text-sm">Imagem em breve</span>
                )}
                <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-colors" />
              </div>
              <div className="p-4">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${disciplinaColors[item.disciplina]}`}>
                  {item.disciplina}
                </span>
                <h3 className="font-bold text-gray-900 mt-2">{item.titulo}</h3>
                <p className="text-gray-400 text-sm mt-0.5">{item.local}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
