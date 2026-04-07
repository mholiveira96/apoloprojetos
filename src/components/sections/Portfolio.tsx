import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, X } from 'lucide-react'
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
  { nome: 'Búzios Privilege', categoria: 'Residencial', imagem: buzios, disciplina: 'Estrutural + Instalações', destaque: 'Soluções para execução mais segura e menor desperdício em obra vertical.' },
  { nome: 'CREI Maria do Socorro', categoria: 'Institucional', imagem: creiSocorro, disciplina: 'Incêndio + Elétrico + Hidrossanitário', destaque: 'Compatibilização técnica para obra pública com mais controle e previsibilidade.' },
  { nome: 'CREI', categoria: 'Institucional', imagem: crei, disciplina: 'Projeto multidisciplinar', destaque: 'Documentação clara para aprovação, execução e redução de retrabalho.' },
  { nome: 'Colinas Park', categoria: 'Residencial', imagem: colinasPark, disciplina: 'Estrutural', destaque: 'Estrutura pensada para desempenho, economia e segurança na execução.' },
  { nome: 'Freeway', categoria: 'Comercial', imagem: freeway, disciplina: 'Elétrico + Complementares', destaque: 'Projeto comercial com foco em operação eficiente e instalação racional.' },
  { nome: 'GNC', categoria: 'Comercial', imagem: gnc, disciplina: 'Instalações', destaque: 'Soluções técnicas para reduzir erro de obra e melhorar desempenho da implantação.' },
  { nome: 'Leapmotor', categoria: 'Comercial', imagem: leapmotor, disciplina: 'Projeto comercial', destaque: 'Coordenação de projeto para atender operação, custo e prazo com mais segurança.' },
  { nome: 'Liivs', categoria: 'Residencial', imagem: liivs, disciplina: 'Estrutural + Hidrossanitário', destaque: 'Compatibilização para obra residencial mais eficiente e previsível.' },
  { nome: 'Pirangi', categoria: 'Residencial', imagem: pirangi, disciplina: 'Projeto integrado', destaque: 'Integração entre disciplinas para evitar improviso e proteger cronograma.' },
  { nome: 'Selfit', categoria: 'Comercial', imagem: selfit, disciplina: 'Complementares', destaque: 'Projetos complementares com foco em desempenho e velocidade de execução.' },
  { nome: 'Sicilia Cucina', categoria: 'Comercial', imagem: sicilia, disciplina: 'Projeto comercial', destaque: 'Precisão técnica para implantação comercial com menos retrabalho.' },
  { nome: 'Solar Cidade Alta', categoria: 'Residencial', imagem: solarCidadeAlta, disciplina: 'Estrutural + Instalações', destaque: 'Soluções integradas para obra mais segura, econômica e bem coordenada.' },
]

const filtros: Categoria[] = ['Todos', 'Residencial', 'Comercial', 'Institucional']

export function Portfolio() {
  const [filtro, setFiltro] = useState<Categoria>('Todos')
  const [selected, setSelected] = useState<Projeto | null>(null)
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  const itens = useMemo(
    () => (filtro === 'Todos' ? projetos : projetos.filter((item) => item.categoria === filtro)),
    [filtro]
  )

  return (
    <>
      <section id="portfolio" className="px-4 py-24 sm:px-6 lg:px-10" ref={ref}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-[var(--teal)]">Portfólio</div>
              <h2 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
                Projetos selecionados para traduzir a qualidade e a amplitude do portfólio.
              </h2>
            </div>
            <p className="max-w-xl text-[color:rgba(7,19,21,0.72)] leading-7">
              Clique em qualquer peça para abrir a imagem completa e examinar melhor cada projeto.
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
              <motion.button
                type="button"
                key={item.nome}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.04 }}
                onClick={() => setSelected(item)}
                className="group overflow-hidden rounded-[30px] border border-[var(--line)] bg-white text-left shadow-sm transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-[rgba(7,19,21,0.08)]"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={item.imagem}
                    alt={item.nome}
                    title="Clique para ampliar"
                    className="h-[22rem] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[rgba(7,19,21,0.72)] to-transparent" />
                  <div className="absolute left-5 top-5 rounded-full bg-white/88 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--teal)] backdrop-blur-sm">
                    {item.categoria}
                  </div>
                  <div className="pointer-events-none absolute bottom-5 right-5 rounded-full bg-[rgba(7,19,21,0.72)] px-3 py-1 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                    Clique para ampliar
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
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(7,19,21,0.88)] p-4 sm:p-6"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.24 }}
              className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Fechar imagem"
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 z-10 rounded-full bg-[rgba(7,19,21,0.82)] p-2 text-white transition-colors hover:bg-[var(--teal)]"
              >
                <X size={18} />
              </button>

              <div className="max-h-[80vh] overflow-auto bg-[var(--paper)]">
                <img src={selected.imagem} alt={selected.nome} className="w-full h-auto" />
              </div>

              <div className="border-t border-[var(--line)] p-5 sm:p-6">
                <div className="text-xs uppercase tracking-[0.25em] text-[var(--teal)]">{selected.categoria}</div>
                <h3 className="mt-2 text-2xl font-extrabold text-[var(--ink)]">{selected.nome}</h3>
                <p className="mt-1 text-sm font-medium text-[var(--teal)]">{selected.disciplina}</p>
                <p className="mt-3 text-sm leading-7 text-[color:rgba(7,19,21,0.72)]">{selected.destaque}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
