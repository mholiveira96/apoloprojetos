import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

const filtros = ['Todos', 'Estrutural', 'Elétrica', 'Hidráulica', 'Incêndio', 'Gás', 'Ambiental']

type Disciplina = 'EST' | 'ELE' | 'HID' | 'INC' | 'GAS' | 'AMB' | 'ARQ' | 'TEL' | 'AVAC' | 'VIZ' | 'INST' | 'ESG' | 'SAN' | 'PGRCC'

const disciplinaLabels: Record<Disciplina, string> = {
  EST: 'Estrutural',
  ELE: 'Elétrica',
  HID: 'Hidráulica',
  INC: 'Incêndio',
  GAS: 'Gás',
  AMB: 'Ambiental',
  ARQ: 'Arquitetura',
  TEL: 'Telecom',
  AVAC: 'Ar-condicionado',
  VIZ: 'Vistoria',
  INST: 'Instalações',
  ESG: 'Esgoto',
  SAN: 'Sanitário',
  PGRCC: 'PGRCC',
}

const disciplinaColors: Record<string, string> = {
  Estrutural: 'bg-blue-100 text-blue-700',
  Elétrica: 'bg-yellow-100 text-yellow-700',
  Hidráulica: 'bg-cyan-100 text-cyan-700',
  Incêndio: 'bg-red-100 text-red-700',
  Gás: 'bg-purple-100 text-purple-700',
  Ambiental: 'bg-green-100 text-green-700',
}

interface Projeto {
  id: number
  nome: string
  disciplinas: Disciplina[]
  link: string
}

const projetos: Projeto[] = [
  { id: 1, nome: 'Adriano', disciplinas: ['EST', 'HID', 'ELE'], link: 'https://drive.google.com/drive/folders/1_EaqYZaLp5jrte8h9qSWS6WBig7whzHT' },
  { id: 2, nome: 'Bruno e Juliana', disciplinas: ['ELE', 'HID'], link: 'https://drive.google.com/drive/folders/1Ffm_k7tgSa_lPF-whKJ6VoFyJVHQk7YM' },
  { id: 3, nome: 'André e Débora', disciplinas: ['HID', 'ELE'], link: 'https://drive.google.com/drive/folders/1QZk3SiabCXMuJmX6XYmdf6GmjSslOu37' },
  { id: 4, nome: 'Galeria Central Parque Mall', disciplinas: ['EST', 'ELE', 'HID', 'INC'], link: 'https://drive.google.com/drive/folders/1du8OWEb47q3kZgn1_FbT-IE1f-I47LqJ' },
  { id: 5, nome: 'Porto Mar de Pirangi', disciplinas: ['EST', 'GAS', 'INC', 'HID', 'ELE'], link: 'https://drive.google.com/drive/folders/1tr88R__a4hPmZyrVtm3XkWMsprAcB3rJ' },
  { id: 6, nome: 'Idaisa Alphaville', disciplinas: ['EST', 'HID', 'SAN', 'ELE'], link: 'https://drive.google.com/drive/folders/1fPvSsi9-qOxS9_gsV86PxfC3W5tu1YyR' },
  { id: 7, nome: 'West Park', disciplinas: ['EST', 'HID', 'INC', 'ARQ'], link: 'https://drive.google.com/drive/folders/1MzEq528j7ma-GAh9USXqv5GdWW1GI482' },
  { id: 8, nome: 'Ajax', disciplinas: ['EST', 'HID', 'ELE'], link: 'https://drive.google.com/drive/folders/1GynHtHcAhtNYMdqc3Uhv6ZiVGcNUFwXA' },
  { id: 9, nome: 'Aerotur Fortaleza', disciplinas: ['HID', 'ELE', 'INC', 'AVAC'], link: 'https://drive.google.com/drive/folders/12F1BBAJsSOSSlbU585O-z4AlIQX6THG5' },
  { id: 10, nome: 'CREI Maria do Socorro', disciplinas: ['GAS', 'INC', 'ELE', 'HID'], link: 'https://drive.google.com/drive/folders/1WID1GGY5WGWbcFTieDGA8XNWevb5H-YQ' },
  { id: 11, nome: 'Terça da Serra', disciplinas: ['HID', 'ELE', 'INC', 'GAS'], link: 'https://drive.google.com/drive/folders/1KQNvXyQWLILvfQJ_m7cbOE4M7iPHRq9A' },
  { id: 12, nome: 'Casa Quinta dos Ipês', disciplinas: ['ARQ', 'ELE', 'HID', 'EST'], link: 'https://drive.google.com/drive/folders/14d1DaaqvmUkuktZR79FtmJXFG-rlU7CQ' },
  { id: 13, nome: 'Vai Lá e Arrasa', disciplinas: ['AMB', 'INST'], link: 'https://drive.google.com/drive/folders/1sGI6jDN-PtUQ_5aU1EZcwaykMHncJ314' },
  { id: 14, nome: 'Kactus — YBY 373', disciplinas: ['EST', 'HID', 'ELE'], link: 'https://drive.google.com/drive/folders/11-lvoqC2Njfyx0RnyEz-yjTCz1kk5CfY' },
  { id: 15, nome: 'Diego e Thalita', disciplinas: ['EST', 'HID', 'SAN', 'ELE'], link: 'https://drive.google.com/drive/folders/1bbY8w_yWHo8IKgwhKp58FQ-YbMxAxMYY' },
  { id: 16, nome: 'Pedro e Taiany', disciplinas: ['ARQ', 'HID', 'ELE'], link: 'https://drive.google.com/drive/folders/16hQq6EqSJC6MYu7kzw2sTW8EuFfobdhh' },
  { id: 17, nome: 'Raul e Rayssa', disciplinas: ['EST', 'HID', 'SAN', 'ELE'], link: 'https://drive.google.com/drive/folders/1L0iq2yxsU6cwayjymkaSJZ7RlirSKNEN' },
  { id: 18, nome: 'Emater', disciplinas: ['EST'], link: 'https://drive.google.com/drive/folders/1CBBCD8G7Pjecb4odPQmLPo6I2Wc_S3fa' },
]

const filtroMap: Record<string, Disciplina[]> = {
  'Todos': [],
  'Estrutural': ['EST'],
  'Elétrica': ['ELE'],
  'Hidráulica': ['HID', 'SAN', 'ESG'],
  'Incêndio': ['INC'],
  'Gás': ['GAS'],
  'Ambiental': ['AMB', 'INST'],
}

export function Portfolio() {
  const [filtro, setFiltro] = useState('Todos')
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  const filtered = filtro === 'Todos'
    ? projetos
    : projetos.filter((p) => p.disciplinas.some((d) => filtroMap[filtro]?.includes(d)))

  return (
    <section id="portfolio" className="py-24 bg-white" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <span className="text-orange-500 font-semibold text-sm uppercase tracking-widest">
            Nossos Projetos
          </span>
          <h2 className="text-4xl font-black text-gray-900 mt-2">Portfólio</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Uma seleção dos 241 projetos realizados com excelência técnica.
          </p>
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item, i) => (
            <motion.a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group block"
            >
              <div className="h-32 bg-gradient-to-br from-gray-800 to-orange-900 flex items-center justify-center relative overflow-hidden">
                <span className="text-white/60 text-sm font-medium">#{String(item.id).padStart(3, '0')}</span>
                <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-colors" />
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.disciplinas.map((d) => (
                    <span
                      key={d}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        disciplinaColors[disciplinaLabels[d]] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {disciplinaLabels[d]}
                    </span>
                  ))}
                </div>
                <h3 className="font-bold text-gray-900">{item.nome}</h3>
              </div>
            </motion.a>
          ))}
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          E mais {241 - projetos.length} projetos no nosso portfólio completo.
        </p>
      </div>
    </section>
  )
}
