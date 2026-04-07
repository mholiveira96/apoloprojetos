import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import logo from '../../../assets/Apolo Logo blue no bg.png'

const links = [
  { label: 'Manifesto', href: '#sobre' },
  { label: 'Especialidades', href: '#servicos' },
  { label: 'Portfólio', href: '#portfolio' },
  { label: 'Contato', href: '#contato' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[rgba(245,245,242,0.86)] backdrop-blur-xl border-b border-black/5'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-3">
          <img src={logo} alt="Apolo Projetos Inteligentes" className="h-11 w-auto" />
          <div className="hidden sm:block">
            <div className="text-[0.7rem] uppercase tracking-[0.35em] text-[var(--teal)]">Natal, RN</div>
            <div className="text-sm font-semibold text-[var(--ink)]">Projetos Inteligentes</div>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--ink-soft)]">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-[var(--teal)] transition-colors">
              {l.label}
            </a>
          ))}
          <a
            href="#contato"
            className="rounded-full bg-[var(--ink)] text-white px-5 py-2.5 hover:bg-[var(--teal)] transition-colors"
          >
            Solicitar proposta
          </a>
        </nav>

        <button
          className="md:hidden text-[var(--ink)]"
          onClick={() => setOpen(!open)}
          aria-label="Abrir menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden mx-4 mb-4 rounded-[28px] border border-black/8 bg-[var(--paper)] p-4 shadow-xl shadow-black/5">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block py-3 text-[var(--ink)] font-medium border-b border-black/6 last:border-0"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contato"
            className="mt-4 block rounded-full bg-[var(--ink)] px-4 py-3 text-center text-white font-semibold"
            onClick={() => setOpen(false)}
          >
            Solicitar proposta
          </a>
        </div>
      )}
    </header>
  )
}
