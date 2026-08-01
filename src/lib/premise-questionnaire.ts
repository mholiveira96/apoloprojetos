export const welcomeCopy = [
  'Olá! Esse formulário irá nos ajudar a elaborar o melhor projeto possível para atender as necessidades da sua família na sua nova residência!',
  'Para isso, precisamos que sejam respondidas algumas perguntas que balizarão os projetos e evitarão mudanças, retrabalhos e custos para o(a) senhor(a).',
  'Lembramos que a opção por algumas soluções podem incorrer em custos junto à construtora para que estas sejam executadas.',
  'Caso tenha dúvidas a respeito de alguma pergunta, ou deseje aprofundar algum tema, nos dispomos para responder no whatsapp 84 99912-3214 ou marcar uma reunião para respondermos juntos presencialmente.',
]

export type Question = {
  id: string
  label: string
  kind: 'text' | 'choice' | 'textarea'
  placeholder?: string
  options?: string[]
}

export const questions: Question[] = [
  { id: 'respondentName', label: 'Qual seu nome?', kind: 'text', placeholder: 'Nome completo' },
  { id: 'contactInfo', label: 'Informações para contato', kind: 'text', placeholder: 'Telefone, e-mail ou outra referência' },
  {
    id: 'ambientacao',
    label: 'O(a) sr.(a) vai ter projeto de ambientação?',
    kind: 'choice',
    options: ['Sim, contratei ou contratarei um projeto de ambientação com minha arquiteta', 'Não', 'Ainda não decidi'],
  },
  {
    id: 'hotWater',
    label: 'O sistema de água quente das casas pode ser com chuveiros elétricos ou aquecimento com coletores solares, que tem maior custo inicial, porém um custo de operação significativamente menor e com maior conforto, além de poder abastecer outros equipamentos, como torneiras e duchas.',
    kind: 'choice',
    options: ['GOSTARIA DE UTILIZAR AQUECIMENTO SOLAR', 'Prefiro chuveiros elétricos', 'Gostaria de conversar sobre as opções'],
  },
  { id: 'automation', label: 'O(a) sr.(a) vai ter projeto de automação?', kind: 'choice', options: ['Sim', 'Não', 'Ainda não decidi'] },
  { id: 'dishwasher', label: 'O(a) sr.(a) usa lava-louças ou pretende usar?', kind: 'choice', options: ['SIM', 'NÃO'] },
  { id: 'waterFilter', label: 'O(a) sr.(a) usa filtro de água ou pretende usar?', kind: 'choice', options: ['SIM', 'NÃO'] },
  { id: 'stove', label: 'Seu fogão/cooktop será à gás ou de indução?', kind: 'choice', options: ['GÁS', 'INDUÇÃO', 'Ainda não decidi'] },
  {
    id: 'oven',
    label: 'O(a) Sr.(a) deseja forno avulso? Se sim, qual?',
    kind: 'choice',
    options: ['SIM, AVULSO ELÉTRICO', 'SIM, AVULSO A GÁS', 'NÃO', 'Ainda não decidi'],
  },
  {
    id: 'showerPower',
    label: 'Seus chuveiros elétricos serão dimensionados para 7000W, o que é suficiente para boa dos chuveiros disponíveis no mercado. No entanto, existem chuveiros até 7800W, que necessitam de uma fiação de 6mm² e pode acarretar em custos adicionais junto à construtora. O(a) sr.(a) deseja prever uma fiação para até 7000W ou até 7800W?',
    kind: 'choice',
    options: ['7000W', '7800W', 'Não se aplica — usarei aquecimento solar'],
  },
  {
    id: 'kitchenExhaust',
    label: 'Irá utilizar coifa ou depurador em sua cozinha?',
    kind: 'choice',
    options: ['COIFA - COM SAÍDA EXTERNA DE AR', 'COIFA - COM RECIRCULAÇÃO', 'DEPURADOR', 'Ainda não decidi'],
  },
  {
    id: 'electricCar',
    label: 'Deseja ter uma tomada para carro elétrico?',
    kind: 'choice',
    options: ['SIM', 'NÃO', 'GOSTARIA DE CONVERSAR SOBRE CARREGADORES PARA CARRO ELÉTRICO'],
  },
  {
    id: 'poolHeating',
    label: 'Caso sua residência tenha piscina, deseja ter aquecimento?',
    kind: 'choice',
    options: ['SIM', 'OBRIGADO, NÃO TENHO INTERESSE', 'Não se aplica — não terei piscina'],
  },
  {
    id: 'solarEnergy',
    label: 'O(a) sr.(a) pretende ter energia solar? Caso não queira instalar agora, podemos prever apenas a infraestrutura necessária para que seja possível instalá-la no futuro sem maiores transtornos.',
    kind: 'choice',
    options: ['PRETENDO TER ENERGIA SOLAR AGORA', 'PRETENDO INSTALAR NO FUTURO', 'NÃO PRETENDO TER ENERGIA SOLAR'],
  },
  {
    id: 'sewage',
    label: 'No local da residência existe rede de saneamento de esgoto ou seriam necessárias unidades de tratamento como fossa e sumidouro?',
    kind: 'choice',
    options: ['seguir padrão do condominio', 'Existe rede de saneamento', 'Serão necessárias fossa e sumidouro', 'Ainda não sei'],
  },
  {
    id: 'highPowerEquipment',
    label: 'O(a) sr.(a) tem conhecimento de algum equipamento com potência elevada na sua casa que deseja que seja incluído no projeto elétrico? Em caso afirmativo, indique abaixo qual equipamento seria:',
    kind: 'textarea',
    placeholder: 'Descreva o equipamento ou escreva “não”',
  },
  {
    id: 'additionalSystems',
    label: 'O(a) sr.(a) tem conhecimento da necessidade de sistemas adicionais que não foram questionados anteriormente, como piscina aquecida, reaproveitamento de águas pluviais, sistema de recirculação de água quente etc.?',
    kind: 'textarea',
    placeholder: 'Descreva ou escreva “não”',
  },
]

export const emptyAnswers = () => Object.fromEntries(questions.map((question) => [question.id, '']))
