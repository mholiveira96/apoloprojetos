import logo from '../../../assets/Apolo Logo.png'

export function Footer() {
  return (
    <footer className="px-4 pb-10 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-2 py-8 text-sm text-[color:rgba(7,19,21,0.72)] sm:flex-row sm:items-end sm:justify-between sm:px-3">
        <div>
          <img src={logo} alt="Apolo Projetos Inteligentes" className="h-12 w-auto" />
          <p className="mt-4 max-w-lg leading-7">
            Apolo Projetos Inteligentes. Engenharia com rigor técnico, foco em segurança, economia e cumprimento de prazo.
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--teal)]">
            © {new Date().getFullYear()} Apolo Projetos Inteligentes
          </div>
        </div>
      </div>
    </footer>
  )
}
