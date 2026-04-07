import { motion } from 'framer-motion'
import { ArrowDownRight, Compass, Sparkles } from 'lucide-react'
import heroCard from '../../../assets/Modelo Portfolio - Colinas Park.png'
import logoWhite from '../../../assets/Apolo Logo branco.png'

export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden px-4 pt-28 pb-16 sm:px-6 lg:px-10 lg:pt-36">
      <div className="noise-overlay absolute inset-0 grid-paper opacity-60" />

      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="pb-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--teal)]"
          >
            <Sparkles size={14} />
            Obviously awesome, sem cara de template
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08 }}
            className="mt-6 max-w-4xl text-5xl leading-[0.95] font-display font-bold text-[var(--ink)] sm:text-6xl lg:text-[5.8rem]"
          >
            Engenharia com presença, rigor e imagem de marca.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-6 max-w-2xl text-lg leading-8 text-[color:rgba(7,19,21,0.78)] sm:text-xl"
          >
            A Apolo projeta estruturas, instalações e soluções técnicas com um discurso visual que passa segurança.
            Nada de site genérico de construtora, aqui a estética trabalha junto com a credibilidade.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <a
              href="#portfolio"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--teal)] px-7 py-4 text-base font-bold text-white shadow-lg shadow-[rgba(15,139,141,0.22)] transition-transform hover:-translate-y-0.5"
            >
              Ver projetos selecionados
              <ArrowDownRight size={18} />
            </a>
            <a
              href="#contato"
              className="inline-flex items-center justify-center rounded-full border border-[var(--ink)] px-7 py-4 text-base font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-white"
            >
              Pedir proposta
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mt-14 grid gap-4 sm:grid-cols-3"
          >
            {[
              ['241+', 'projetos entregues'],
              ['Natal → Nordeste', 'operação com foco regional'],
              ['Estrutural a incêndio', 'escopo multidisciplinar'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[26px] border border-[var(--line)] bg-white/70 p-5 backdrop-blur-sm">
                <div className="text-2xl font-extrabold text-[var(--ink)]">{value}</div>
                <div className="mt-1 text-sm text-[color:rgba(7,19,21,0.7)]">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.12 }}
          className="relative lg:pl-8"
        >
          <div className="absolute -top-8 right-4 hidden rounded-[28px] bg-[var(--ink)] px-5 py-4 text-white shadow-2xl lg:block">
            <img src={logoWhite} alt="Apolo" className="h-10 w-auto" />
          </div>

          <div className="relative overflow-hidden rounded-[36px] border border-black/8 bg-[var(--ink)] p-3 shadow-[0_40px_80px_rgba(7,19,21,0.18)]">
            <img
              src={heroCard}
              alt="Projeto Colinas Park"
              className="h-[28rem] w-full rounded-[28px] object-cover object-center"
            />
            <div className="absolute inset-x-8 bottom-8 rounded-[28px] bg-[rgba(7,19,21,0.78)] p-5 text-white backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--teal-bright)]">
                <Compass size={14} />
                Projeto em destaque
              </div>
              <div className="mt-3 text-2xl font-display font-semibold">Colinas Park</div>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/78">
                Uma landing que vende confiança antes do orçamento, com portfólio real e linguagem visual compatível com a marca.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
