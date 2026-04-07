export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-2">APOLO Projetos Inteligentes</h3>
            <p className="text-sm leading-relaxed">
              Projetos de engenharia com excelência técnica e comprometimento com prazos.
              CNPJ: 42.570.326/0001-02
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Serviços</h4>
            <ul className="space-y-1 text-sm">
              <li>Projeto Estrutural</li>
              <li>Projeto Elétrico</li>
              <li>Projeto Hidrossanitário</li>
              <li>Combate a Incêndio</li>
              <li>Projeto de Gás</li>
              <li>Estudos Ambientais</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Contato</h4>
            <p className="text-sm">Rua Francisco Maia Sobrinho, 1950</p>
            <p className="text-sm">Sala 1304, Ed. Plenar, Lagoa Nova</p>
            <p className="text-sm">Natal, RN — CEP 59064-380</p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-xs text-center">
          © {new Date().getFullYear()} Apolo Projetos Inteligentes Ltda - ME. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}
