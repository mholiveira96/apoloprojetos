import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useInView } from 'react-intersection-observer'

import buzios from '../../../assets/Modelo Portfolio - Búzios Privilege.png'
import creiSocorro from '../../../assets/Modelo Portfolio - CREI Maria do Socorro.png'
import crei from '../../../assets/Modelo Portfolio - CREI.png'
import colinasPark from '../../../assets/Modelo Portfolio - Colinas Park.png'
import freeway from '../../../assets/Modelo Portfolio - Freeway.png'
import gnc from '../../../assets/Modelo Portfolio - GNC.png'
import leapmotor from '../../../assets/Modelo Portfolio - Leapmotor.png'
import liivs from '../../../assets/Modelo Portfolio - Liivs.png'
import pirangi from '../../../assets/Modelo Portfolio - Pirangi .png'
import selfit from '../../../assets/Modelo Portfolio - Selfit.png'
import sicilia from '../../../assets/Modelo Portfolio - Sicilia Cucina.png'
import solarCidadeAlta from '../../../assets/Modelo Portfolio - Solar Cidade Alta.png'

type Categoria = 'Todos' | 'Residencial' | 'Comercial' | 'Institucional'

interface Projeto {
  nome: string
  categoria: Exclude<Categoria, 'Todos'>
  imagem: string
  disciplina: string
  destaque: string
}

const projetos: Projeto[] = [
  { nome: 'Búzios Privilege', categoria: 'Residencial', imagem: buzios, disciplina: 'Estrutural + Instalações', destaque: 'Verticalização com leitura premium' },
  { nome: 'CREI Maria do Socorro', categoria: 'Institucional', imagem: creiSocorro, disciplina: 'Incêndio + Elétrico + Hidrossanitário', destaque: 'Equipamento público com compatibilização técnica' },
  { nome: 'CREI', categoria: 'Institucional', imagem: crei, disciplina: 'Projeto multidisciplinar', destaque: 'Clareza para execução e aprovação' },
  { nome: 'Colinas Park', categoria: 'Residencial', imagem: colinasPark, disciplina: 'Estrutural', destaque: 'Massa visual forte, linguagem imobiliária limpa' },
  { nome: 'Freeway', categoria: 'Comercial', imagem: freeway, disciplina: 'Elétrico + Complementares', destaque: 'Site agora conversa com esse nível de apresentação' },
  { nome: 'GNC', categoria: 'Comercial', imagem: gnc, disciplina: 'Instalações', destaque: 'Performance e leitura objetiva' },
  { nome: 'Leapmotor', categoria: 'Comercial', imagem: leapmotor, disciplina: 'Projeto comercial', destaque: 'Marca e espaço trabalhando juntos' },
  { nome: 'Liivs', categoria: 'Residencial', imagem: liivs, disciplina: 'Estrutural + Hidrossanitário', destaque: 'Detalhe e acabamento na narrativa' },
  { nome: 'Pirangi', categoria: 'Residencial', imagem: pirangi, disciplina: 'Projeto integrado', destaque: 'Obra com presença litorânea e composição leve' },
  { nome: 'Selfit', categoria: 'Comercial', imagem: selfit, disciplina: 'Complementares', destaque: 'Escala comercial com comunicação firme' },
  { nome: 'Sicilia Cucina', categoria: 'Comercial', imagem: sicilia, disciplina: 'Projeto comercial', destaque: 'Hospitalidade com rigor técnico' },
  { nome: 'Solar Cidade Alta', categoria: 'Residencial', imagem: solarCidadeAlta, disciplina: 'Estrutural + Instalações', destaque: 'Narrativa arquitetônica mais sofisticada' },
]

const filtros: Categoria[] = ['Todos', 'Residencial', 'Comercial', 'Institucional']

export function Portfolio() {
  const [filtro, setFiltro] = useState<Categoria>('Todos')
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  const itens = useMemo(
    () => (filtro === 'Todos' ? projetos : projetos.filter((item) => item.categoria === filtro)),
    [filtro]
  )

  return (
    <section id="portfolio" className="px-4 py-24 sm:px-6 lg:px-10" ref={ref}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-[var(--teal)]">Portfólio</div>
            <h2 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
              Projetos reais, imagens reais, zero mockup de mentira.
            </h2>
          </div>
          <p className="max-w-xl text-[color:rgba(7,19,21,0.72)] leading-7">
            O que vendia mal aqui era a apresentação. Agora o portfólio puxa o usuário pelo olho e sustenta a credibilidade.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {filtros.map((item) => (
            <button
              key={item}
              onClick={() => setFiltro(item)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                filtro === item
                  ? 'bg-[var(--ink)] text-white'
                  : 'bg-white text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] hover:text-[var(--teal)]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {itens.map((item, i) => (
            <motion.article
              key={item.nome}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.04 }}
              className="group overflow-hidden rounded-[30px] border border-[var(--line)] bg-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-[rgba(7,19,21,0.08)]"
            >
              <div className="relative overflow-hidden">
                <img
                  src={item.imagem}
                  alt={item.nome}
                  className="h-[22rem] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[rgba(7,19,21,0.72)] to-transparent" />
                <div className="absolute left-5 top-5 rounded-full bg-white/88 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--teal)] backdrop-blur-sm">
                  {item.categoria}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-extrabold text-[var(--ink)]">{item.nome}</h3>
                    <p className="mt-1 text-sm font-medium text-[var(--teal)]">{item.disciplina}</p>
                  </div>
                  <ArrowUpRight className="mt-1 text-[var(--ink)] opacity-60 transition-opacity group-hover:opacity-100" size={20} />
                </div>
                <p className="mt-4 text-sm leading-7 text-[color:rgba(7,19,21,0.72)]">{item.destaque}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
