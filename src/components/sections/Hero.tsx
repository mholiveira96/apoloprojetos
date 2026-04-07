import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'

export function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center bg-gray-900 text-white overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-orange-950 opacity-90" />

      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(249,115,22,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block text-orange-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Projetos Inteligentes
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight mb-6">
            Projetos que
            <span className="text-orange-500"> constroem</span>
            <br />o futuro
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Mais de 241 projetos entregues em estrutural, elétrica, hidráulica e combate a incêndio.
            Soluções técnicas com precisão e comprometimento no Rio Grande do Norte e região Nordeste.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#contato"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 active:scale-95"
            >
              Solicitar Orçamento
            </a>
            <a
              href="#portfolio"
              className="border border-white/30 hover:border-orange-400 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:bg-white/5"
            >
              Ver Portfólio
            </a>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ArrowDown className="text-white/40" size={28} />
        </motion.div>
      </div>
    </section>
  )
}
