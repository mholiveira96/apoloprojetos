import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowUpRight, MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = '5584986031853'
const WHATSAPP_MESSAGE = encodeURIComponent('Olá! Quero solicitar uma proposta para um projeto com a Apolo.')

export function Contato() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section id="contato" className="px-4 py-24 sm:px-6 lg:px-10" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="mx-auto grid max-w-7xl gap-6 rounded-[36px] bg-[var(--ink)] p-8 text-white sm:p-12 lg:grid-cols-[1fr_auto] lg:items-end"
      >
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-[var(--teal-bright)]">Contato</div>
          <h2 className="mt-4 max-w-3xl font-display text-4xl sm:text-5xl">
            Se o projeto precisa parecer sério antes mesmo da obra começar, chama a Apolo.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
            Atendimento direto, resposta rápida e proposta sob medida. Sem formulário infinito, sem ruído.
          </p>
        </div>

        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-3 rounded-full bg-[var(--teal)] px-7 py-4 text-base font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          <MessageCircle size={20} />
          Falar no WhatsApp
          <ArrowUpRight size={18} />
        </a>
      </motion.div>
    </section>
  )
}
