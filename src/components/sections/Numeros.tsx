import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'

const stats = [
  { value: 241, suffix: '+', label: 'Projetos Entregues' },
  { value: 5, suffix: '+', label: 'Anos de Experiência' },
  { value: 12, suffix: '+', label: 'Disciplinas Atendidas' },
]

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const { ref, inView } = useInView({ triggerOnce: true })

  useEffect(() => {
    if (inView) {
      animate(count, value, { duration: 1.5, ease: 'easeOut' })
    }
  }, [inView, count, value])

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}

export function Numeros() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section className="py-20 bg-orange-500" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center text-white"
            >
              <div className="text-4xl sm:text-5xl font-black mb-1">
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <div className="text-orange-100 text-sm font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
