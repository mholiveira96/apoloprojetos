import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { CheckCircle2 } from 'lucide-react'

const diferenciais = [
  'Equipe multidisciplinar com engenheiros especializados',
  'Mais de 241 projetos entregues com qualidade comprovada',
  'Atendimento em todo o Rio Grande do Norte e Nordeste',
  'Suporte completo da concepção ao AVCB',
  'Aprovação garantida nos órgãos competentes',
]

export function Sobre() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section id="sobre" className="py-24 bg-white" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="text-orange-500 font-semibold text-sm uppercase tracking-widest">
              Sobre nós
            </span>
            <h2 className="text-4xl font-black text-gray-900 mt-2 mb-6 leading-tight">
              Engenharia que você pode
              <span className="text-orange-500"> confiar</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              A Apolo Projetos Inteligentes nasceu em 2021 com um propósito: entregar projetos técnicos 
              de alta qualidade com agilidade e responsabilidade. Atuamos nas disciplinas de projeto 
              estrutural, elétrico, hidrossanitário, combate a incêndio, gás e ambiental para obras 
              residenciais, comerciais e industriais.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Baseados em Natal, RN, já atendemos mais de 241 clientes em todo o Nordeste. 
              Nossa equipe de engenheiros dedica atenção personalizada a cada projeto, garantindo 
              conformidade com as normas técnicas e total satisfação.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Por que escolher a Apolo?</h3>
              <ul className="space-y-4">
                {diferenciais.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-orange-500 mt-0.5 shrink-0" size={20} />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
