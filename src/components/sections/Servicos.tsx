import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Building2, Zap, Droplets, Flame, Wind, Leaf } from 'lucide-react'

const servicos = [
  {
    icon: Building2,
    titulo: 'Projeto Estrutural',
    descricao:
      'Dimensionamento e detalhamento de estruturas em concreto armado, metálica e contenções.',
    itens: ['Concreto Armado', 'Estrutura Metálica', 'Fundações', 'Contenções'],
  },
  {
    icon: Zap,
    titulo: 'Projeto Elétrico',
    descricao:
      'Instalações elétricas residenciais, comerciais e industriais, incluindo SPDA e fiação.',
    itens: ['Baixa Tensão', 'SPDA (Para-raios)', 'Telecomunicações', 'Fiação Elétrica'],
  },
  {
    icon: Droplets,
    titulo: 'Projeto Hidrossanitário',
    descricao:
      'Sistemas de água fria, quente, esgoto, pluvial e sanitário para obras de todos os portes.',
    itens: ['Água Fria e Quente', 'Esgoto Sanitário', 'Drenagem Pluvial', 'Sistemas Sanitários'],
  },
  {
    icon: Flame,
    titulo: 'Combate a Incêndio',
    descricao:
      'Projetos de prevenção e combate a incêndio conforme normas do Corpo de Bombeiros.',
    itens: ['Sprinklers', 'Hidrantes', 'Detecção e Alarme', 'AVCB'],
  },
  {
    icon: Wind,
    titulo: 'Projeto de Gás',
    descricao:
      'Instalações de gás canalizado para residenciais e comerciais com segurança certificada.',
    itens: ['Gás Canalizado', 'GLP', 'Projeto e Laudo', 'Aprovação CIP'],
  },
  {
    icon: Leaf,
    titulo: 'Estudos Ambientais',
    descricao:
      'Licenciamento ambiental, estudos de impacto e relatórios de conformidade.',
    itens: ['Licenciamento', 'Relatórios Ambientais', 'Instalações', 'Conformidade'],
  },
]

export function Servicos() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="servicos" className="py-24 bg-gray-50" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <span className="text-orange-500 font-semibold text-sm uppercase tracking-widest">
            O que fazemos
          </span>
          <h2 className="text-4xl font-black text-gray-900 mt-2">Nossas Especialidades</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">
            Cobrimos todas as disciplinas de projeto da sua obra com qualidade técnica e eficiência.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicos.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.titulo}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 group-hover:bg-orange-500 flex items-center justify-center mb-4 transition-colors">
                  <Icon className="text-orange-500 group-hover:text-white transition-colors" size={24} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{s.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{s.descricao}</p>
                <ul className="space-y-1">
                  {s.itens.map((item) => (
                    <li key={item} className="text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
