import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Building2, Flame, Leaf, ShieldCheck, Waves, Zap } from 'lucide-react'

const servicos = [
  {
    icon: Building2,
    titulo: 'Estrutural',
    descricao: 'Dimensionamento, detalhamento e leitura de obra com solução viável e limpa.',
  },
  {
    icon: Zap,
    titulo: 'Elétrico e SPDA',
    descricao: 'Instalações com racionalidade técnica e organização que facilita execução.',
  },
  {
    icon: Waves,
    titulo: 'Hidrossanitário',
    descricao: 'Compatibilização de água, esgoto e drenagem para obra sem improviso caro.',
  },
  {
    icon: Flame,
    titulo: 'Prevenção a incêndio',
    descricao: 'Projeto e documentação para aprovação, operação e segurança real.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Gás e instalações',
    descricao: 'Soluções seguras para empreendimentos que não podem errar no básico.',
  },
  {
    icon: Leaf,
    titulo: 'Ambiental e apoio técnico',
    descricao: 'Relatórios, conformidade e suporte complementar para tirar gargalo do caminho.',
  },
]

export function Servicos() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="servicos" className="px-4 py-20 sm:px-6 lg:px-10" ref={ref}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-[var(--teal)]">Especialidades</div>
            <h2 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
              Engenharia multidisciplinar para obras mais seguras, econômicas e previsíveis.
            </h2>
          </div>
          <p className="max-w-xl text-[color:rgba(7,19,21,0.72)] leading-7">
            Cada disciplina existe para resolver problema real de obra, reduzir retrabalho e manter custo e prazo sob controle.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {servicos.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.titulo}
                initial={{ opacity: 0, y: 22 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group rounded-[30px] border border-[var(--line)] bg-white/80 p-6 transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-[rgba(7,19,21,0.08)]"
              >
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[var(--teal-wash)] text-[var(--teal)] transition-colors group-hover:bg-[var(--teal)] group-hover:text-white">
                  <Icon size={24} />
                </div>
                <h3 className="mt-6 text-2xl font-extrabold text-[var(--ink)]">{s.titulo}</h3>
                <p className="mt-3 text-sm leading-7 text-[color:rgba(7,19,21,0.7)]">{s.descricao}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
