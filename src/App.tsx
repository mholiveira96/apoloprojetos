import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/sections/Hero'
import { Sobre } from '@/components/sections/Sobre'
import { Servicos } from '@/components/sections/Servicos'
import { Numeros } from '@/components/sections/Numeros'
import { Portfolio } from '@/components/sections/Portfolio'
import { Contato } from '@/components/sections/Contato'

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Sobre />
        <Servicos />
        <Numeros />
        <Portfolio />
        <Contato />
      </main>
      <Footer />
    </div>
  )
}
