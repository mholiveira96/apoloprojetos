export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-2">APOLO Engenharia</h3>
            <p className="text-sm leading-relaxed">
              Projetos de engenharia com excelência técnica e comprometimento com prazos.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Serviços</h4>
            <ul className="space-y-1 text-sm">
              <li>Projeto Estrutural</li>
              <li>Projeto Elétrico</li>
              <li>Projeto Hidrossanitário</li>
              <li>Combate a Incêndio</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Contato</h4>
            <p className="text-sm">contato@apoloengenharia.com.br</p>
            <p className="text-sm mt-1">São Paulo, SP</p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-xs text-center">
          © {new Date().getFullYear()} Apolo Engenharia. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}
