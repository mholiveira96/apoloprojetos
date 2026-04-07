import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

const pilares = [
  'Projeto como ativo de negócio, não só documentação.',
  'Clareza técnica sem parecer frio ou burocrático.',
  'Entrega multidisciplinar para reduzir atrito na obra.',
  'Estética de marca que combina com precisão de engenharia.',
]

export function Sobre() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section id="sobre" className="px-4 py-20 sm:px-6 lg:px-10" ref={ref}>
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="rounded-[32px] bg-[var(--ink)] p-8 text-white sm:p-10"
        >
          <div className="text-xs uppercase tracking-[0.35em] text-[var(--teal-bright)]">Manifesto</div>
          <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
            O melhor projeto é o que resolve, comunica e eleva a percepção da obra.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.1 }}
          className="rounded-[32px] border border-[var(--line)] bg-white/82 p-8 shadow-lg shadow-black/5 sm:p-10"
        >
          <p className="max-w-3xl text-lg leading-8 text-[color:rgba(7,19,21,0.78)]">
            A Apolo Projetos Inteligentes nasceu para fugir do óbvio. Fazemos estrutural, elétrico,
            hidrossanitário, incêndio, gás e soluções complementares com uma abordagem de marca mais refinada,
            mais segura e mais memorável.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {pilares.map((item) => (
              <div key={item} className="rounded-[24px] bg-[var(--paper)] p-5 text-sm leading-6 text-[var(--ink-soft)]">
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
