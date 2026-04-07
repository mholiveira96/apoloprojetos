import { motion, animate, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

const stats = [
  { value: 200, suffix: '+', label: 'clientes' },
  { value: 400, suffix: '+', label: 'projetos' },
  { value: 7, suffix: '', label: 'anos de atuação' },
]

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const { ref, inView } = useInView({ triggerOnce: true })

  useEffect(() => {
    if (inView) animate(count, value, { duration: 1.4, ease: 'easeOut' })
  }, [count, inView, value])

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
    <section className="px-4 py-8 sm:px-6 lg:px-10" ref={ref}>
      <div className="mx-auto max-w-7xl rounded-[36px] bg-[var(--teal)] px-6 py-10 text-white shadow-[0_25px_60px_rgba(15,139,141,0.22)] sm:px-10 lg:px-14">
        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 18 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="border-b border-white/20 pb-5 last:border-b-0 md:border-b-0 md:border-r md:pb-0 md:pr-6 last:md:border-r-0"
            >
              <div className="text-4xl font-extrabold sm:text-5xl">
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-sm uppercase tracking-[0.18em] text-white/76">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
