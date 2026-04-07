import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = '5584986031853'
const WHATSAPP_MESSAGE = encodeURIComponent('Olá! Gostaria de solicitar um orçamento para um projeto de engenharia.')

export function Contato() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`

  return (
    <section id="contato" className="py-24 bg-white" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-orange-500 font-semibold text-sm uppercase tracking-widest">
            Fale conosco
          </span>
          <h2 className="text-4xl font-black text-gray-900 mt-2">Solicite um Orçamento</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            Fale direto com a gente pelo WhatsApp. Resposta rápida, sem burocracia.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-10"
          >
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              <MessageCircle size={24} />
              Chamar no WhatsApp
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
