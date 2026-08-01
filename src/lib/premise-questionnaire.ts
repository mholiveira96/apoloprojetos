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
    options: ['Gostaria de utilizar aquecimento solar', 'Prefiro chuveiros elétricos', 'Gostaria de conversar sobre as opções'],
  },
  { id: 'automation', label: 'O(a) sr.(a) vai ter projeto de automação?', kind: 'choice', options: ['Sim', 'Não', 'Ainda não decidi'] },
  { id: 'dishwasher', label: 'O(a) sr.(a) usa lava-louças ou pretende usar?', kind: 'choice', options: ['Sim', 'Não'] },
  { id: 'waterFilter', label: 'O(a) sr.(a) usa filtro de água ou pretende usar?', kind: 'choice', options: ['Sim', 'Não'] },
  { id: 'stove', label: 'Seu fogão/cooktop será à gás ou de indução?', kind: 'choice', options: ['Gás', 'Indução', 'Ainda não decidi'] },
  {
    id: 'oven',
    label: 'O(a) Sr.(a) deseja forno avulso? Se sim, qual?',
    kind: 'choice',
    options: ['Sim, avulso elétrico', 'Sim, avulso a gás', 'Não', 'Ainda não decidi'],
  },
  {
    id: 'showerPower',
    label: 'Seus chuveiros elétricos serão dimensionados para 7000W, o que é suficiente para boa dos chuveiros disponíveis no mercado. No entanto, existem chuveiros até 7800W, que necessitam de uma fiação de 6mm² e pode acarretar em custos adicionais junto à construtora. O(a) sr.(a) deseja prever uma fiação para até 7000W ou até 7800W?',
    kind: 'choice',
    options: ['7000 W', '7800 W', 'Não se aplica — usarei aquecimento solar'],
  },
  {
    id: 'kitchenExhaust',
    label: 'Irá utilizar coifa ou depurador em sua cozinha?',
    kind: 'choice',
    options: ['Coifa — com saída externa de ar', 'Coifa — com recirculação', 'Depurador', 'Ainda não decidi'],
  },
  {
    id: 'electricCar',
    label: 'Deseja ter uma tomada para carro elétrico?',
    kind: 'choice',
    options: ['Sim', 'Não', 'Gostaria de conversar sobre carregadores para carro elétrico'],
  },
  {
    id: 'poolHeating',
    label: 'Caso sua residência tenha piscina, deseja ter aquecimento?',
    kind: 'choice',
    options: ['Sim', 'Obrigado, não tenho interesse', 'Não se aplica — não terei piscina'],
  },
  {
    id: 'solarEnergy',
    label: 'O(a) sr.(a) pretende ter energia solar? Caso não queira instalar agora, podemos prever apenas a infraestrutura necessária para que seja possível instalá-la no futuro sem maiores transtornos.',
    kind: 'choice',
    options: ['Pretendo ter energia solar agora', 'Pretendo instalar no futuro', 'Não pretendo ter energia solar'],
  },
  {
    id: 'sewage',
    label: 'No local da residência existe rede de saneamento de esgoto ou seriam necessárias unidades de tratamento como fossa e sumidouro?',
    kind: 'choice',
    options: ['Seguir padrão do condomínio', 'Existe rede de saneamento', 'Serão necessárias fossa e sumidouro', 'Ainda não sei'],
  },
  {
    id: 'highPowerEquipment',
    label: 'O(a) sr.(a) tem conhecimento de algum equipamento com potência elevada na sua casa que deseja que seja incluído no projeto elétrico? Em caso afirmativo, indique abaixo qual equipamento seria:',
    kind: 'textarea',
    placeholder: 'Descreva o equipamento ou escreva “não”',
  },
  {
    id: 'additionalSystems',
    label: 'O(a) sr.(a) tem conhecimento da necessidade de sistemas adicionais que não foram questionados anteriormente, como reaproveitamento de águas pluviais, sistema de recirculação de água quente ou outro sistema adicional?',
    kind: 'textarea',
    placeholder: 'Descreva ou escreva “não”',
  },
]

const legacyOptionLabels: Record<string, string> = {
  'GOSTARIA DE UTILIZAR AQUECIMENTO SOLAR': 'Gostaria de utilizar aquecimento solar',
  SIM: 'Sim',
  NÃO: 'Não',
  GÁS: 'Gás',
  INDUÇÃO: 'Indução',
  'SIM, AVULSO ELÉTRICO': 'Sim, avulso elétrico',
  'SIM, AVULSO A GÁS': 'Sim, avulso a gás',
  'NÃO SE APLICA — USAREI AQUECIMENTO SOLAR': 'Não se aplica — usarei aquecimento solar',
  '7000W': '7000 W',
  '7800W': '7800 W',
  'COIFA - COM SAÍDA EXTERNA DE AR': 'Coifa — com saída externa de ar',
  'COIFA - COM RECIRCULAÇÃO': 'Coifa — com recirculação',
  DEPURADOR: 'Depurador',
  'GOSTARIA DE CONVERSAR SOBRE CARREGADORES PARA CARRO ELÉTRICO': 'Gostaria de conversar sobre carregadores para carro elétrico',
  'OBRIGADO, NÃO TENHO INTERESSE': 'Obrigado, não tenho interesse',
  'PRETENDO TER ENERGIA SOLAR AGORA': 'Pretendo ter energia solar agora',
  'PRETENDO INSTALAR NO FUTURO': 'Pretendo instalar no futuro',
  'NÃO PRETENDO TER ENERGIA SOLAR': 'Não pretendo ter energia solar',
  'seguir padrão do condominio': 'Seguir padrão do condomínio',
}

export function canonicalQuestionnaireAnswer(question: Question, value: string) {
  if (question.kind !== 'choice') return value
  return legacyOptionLabels[value] || value
}

export const emptyAnswers = () => Object.fromEntries(questions.map((question) => [question.id, '']))
