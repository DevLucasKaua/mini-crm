import { MessageDirection, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Offsets relativos ao momento da execução: re-rodar o seed "rejuvenesce"
// os timestamps, então os dados sempre parecem recentes na demonstração.
const now = Date.now();

const USER_JID_SUFFIX = '@s.whatsapp.net';
const DEMO_WA_ID_PREFIX = 'demo-';

type DemoMessage = {
  direction: MessageDirection;
  content: string;
  minutesAgo: number;
};

type DemoConversation = {
  contactName: string;
  contactPhone: string;
  // ordem cronológica (minutesAgo decrescente)
  messages: DemoMessage[];
};

const DEMO_DATA: Record<'matriz' | 'filial', DemoConversation[]> = {
  matriz: [
    {
      contactName: 'Mariana Alves',
      contactPhone: '5511987654321',
      messages: [
        {
          direction: 'INBOUND',
          content:
            'Boa tarde! Gostaria de um orçamento do CRM para 3 unidades. Vocês atendem empresas do interior de SP?',
          minutesAgo: 25,
        },
        {
          direction: 'OUTBOUND',
          content:
            'Boa tarde, Mariana! Atendemos sim. Para 3 unidades o plano fica em R$ 890/mês, com onboarding incluso.',
          minutesAgo: 21,
        },
        {
          direction: 'INBOUND',
          content: 'Ótimo! E o onboarding demora quanto tempo?',
          minutesAgo: 16,
        },
        {
          direction: 'INBOUND',
          content: 'Ah, e vocês emitem nota fiscal?',
          minutesAgo: 12,
        },
      ],
    },
    {
      contactName: 'Carlos Menezes',
      contactPhone: '5521998765432',
      messages: [
        { direction: 'INBOUND', content: 'Oi', minutesAgo: 132 },
        {
          direction: 'OUTBOUND',
          content: 'Oi! Aqui é o Atendente da E3',
          minutesAgo: 131,
        },
        {
          direction: 'INBOUND',
          content:
            'Preciso de ajuda: o segundo acesso da minha equipe não está funcionando.',
          minutesAgo: 128,
        },
        {
          direction: 'OUTBOUND',
          content:
            'Certo, Carlos! Pode me confirmar o email do usuário que não consegue entrar?',
          minutesAgo: 124,
        },
        {
          direction: 'INBOUND',
          content: 'Claro, é financeiro@menezesdistribuidora.com.br',
          minutesAgo: 119,
        },
      ],
    },
    {
      contactName: 'Fernanda Rocha',
      contactPhone: '5531996543210',
      messages: [
        {
          direction: 'OUTBOUND',
          content:
            'Oi, Fernanda! Tudo bem? Conseguiu avaliar a proposta que enviei na semana passada?',
          minutesAgo: 1584,
        },
        {
          direction: 'INBOUND',
          content:
            'Oi! Avaliei sim. Ficou ótima, mas o valor passou do nosso teto. Consegue algum desconto?',
          minutesAgo: 1570,
        },
        {
          direction: 'OUTBOUND',
          content:
            'Consigo sim: fechando ainda este mês, aplico 10% no plano anual. Te envio a proposta revisada?',
          minutesAgo: 1560,
        },
        {
          direction: 'INBOUND',
          content: 'Pode enviar! Vou levar para a diretoria amanhã.',
          minutesAgo: 1552,
        },
      ],
    },
    {
      contactName: 'Roberto Siqueira',
      contactPhone: '5541988112233',
      messages: [
        {
          direction: 'INBOUND',
          content:
            'Bom dia! O boleto deste mês venceu ontem e eu perdi o email. Consegue me mandar a segunda via?',
          minutesAgo: 1815,
        },
        {
          direction: 'OUTBOUND',
          content:
            'Bom dia, Roberto! Claro, segunda via emitida com vencimento para sexta-feira. Acabei de enviar no seu email.',
          minutesAgo: 1808,
        },
        {
          direction: 'INBOUND',
          content: 'Recebi, muito obrigado!',
          minutesAgo: 1802,
        },
        {
          direction: 'OUTBOUND',
          content: 'Por nada! Qualquer coisa é só chamar.',
          minutesAgo: 1800,
        },
      ],
    },
    {
      contactName: 'Juliana Castro',
      contactPhone: '5551991234567',
      messages: [
        {
          direction: 'INBOUND',
          content:
            'Olá! Vi o anúncio de vocês no Instagram. Esse CRM funciona para clínicas?',
          minutesAgo: 4335,
        },
        {
          direction: 'OUTBOUND',
          content:
            'Olá, Juliana! Funciona sim — temos clientes na área de saúde. Quer agendar uma demonstração de 20 minutos?',
          minutesAgo: 4328,
        },
        {
          direction: 'INBOUND',
          content: 'Quero sim! Pode ser na semana que vem?',
          minutesAgo: 4320,
        },
      ],
    },
  ],
  filial: [
    {
      contactName: 'Pedro Nogueira',
      contactPhone: '5581987651234',
      messages: [
        { direction: 'INBOUND', content: 'Oi', minutesAgo: 47 },
        {
          direction: 'OUTBOUND',
          content: 'Oi! Aqui é o Atendente da E3',
          minutesAgo: 46,
        },
        {
          direction: 'INBOUND',
          content: 'Qual o horário de atendimento de vocês aí em Recife?',
          minutesAgo: 43,
        },
        {
          direction: 'OUTBOUND',
          content:
            'Atendemos de segunda a sexta, das 8h às 18h. Posso te ajudar com algo agora?',
          minutesAgo: 40,
        },
      ],
    },
    {
      contactName: 'Ana Beatriz Lima',
      contactPhone: '5585996547890',
      messages: [
        {
          direction: 'INBOUND',
          content:
            'Boa tarde! Quanto fica o plano para uma equipe de 5 vendedores?',
          minutesAgo: 1700,
        },
        {
          direction: 'OUTBOUND',
          content:
            'Boa tarde, Ana! Para 5 usuários o plano fica em R$ 390/mês, com suporte e relatórios inclusos.',
          minutesAgo: 1693,
        },
        { direction: 'INBOUND', content: 'Tem fidelidade?', minutesAgo: 1687 },
        {
          direction: 'OUTBOUND',
          content:
            'Não tem fidelidade — o plano mensal pode ser cancelado quando quiser.',
          minutesAgo: 1680,
        },
      ],
    },
    {
      contactName: 'Marcos Tavares',
      contactPhone: '5562981234509',
      messages: [
        {
          direction: 'INBOUND',
          content: 'Boa tarde! Preciso reagendar a visita técnica de quinta-feira.',
          minutesAgo: 2894,
        },
        {
          direction: 'OUTBOUND',
          content:
            'Boa tarde, Marcos! Sem problema. Temos horário na segunda às 10h ou na terça às 15h.',
          minutesAgo: 2888,
        },
        {
          direction: 'INBOUND',
          content: 'Segunda às 10h fica perfeito.',
          minutesAgo: 2882,
        },
        {
          direction: 'OUTBOUND',
          content: 'Agendado! Segunda às 10h o técnico estará aí.',
          minutesAgo: 2880,
        },
        { direction: 'INBOUND', content: 'Obrigado!', minutesAgo: 2878 },
      ],
    },
  ],
};

function toTimestamp(minutesAgo: number): Date {
  return new Date(now - minutesAgo * 60_000);
}

async function seedConversation(
  unitId: string,
  unitSlug: string,
  { contactName, contactPhone, messages }: DemoConversation,
): Promise<void> {
  const remoteJid = `${contactPhone}${USER_JID_SUFFIX}`;
  const conversation = await prisma.conversation.upsert({
    where: { unitId_contactPhone: { unitId, contactPhone } },
    update: { contactName, remoteJid },
    create: { unitId, contactPhone, contactName, remoteJid },
  });

  const lastMessageAt = toTimestamp(
    Math.min(...messages.map((message) => message.minutesAgo)),
  );

  // apaga apenas as mensagens demo (waMessageId "demo-...") antes de recriar,
  // preservando mensagens reais que a conversa porventura tenha
  await prisma.$transaction([
    prisma.message.deleteMany({
      where: {
        conversationId: conversation.id,
        waMessageId: { startsWith: DEMO_WA_ID_PREFIX },
      },
    }),
    prisma.message.createMany({
      data: messages.map(({ direction, content, minutesAgo }, index) => ({
        conversationId: conversation.id,
        unitId,
        direction,
        content,
        waMessageId: `${DEMO_WA_ID_PREFIX}${unitSlug}-${contactPhone}-${index}`,
        timestamp: toTimestamp(minutesAgo),
      })),
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt },
    }),
  ]);
}

async function main(): Promise<void> {
  for (const [slug, conversations] of Object.entries(DEMO_DATA)) {
    const unit = await prisma.unit.findUnique({ where: { slug } });
    if (!unit) {
      throw new Error(
        `Unidade "${slug}" não encontrada — rode "pnpm seed" antes do seed de demonstração.`,
      );
    }
    for (const conversation of conversations) {
      await seedConversation(unit.id, slug, conversation);
    }
    console.log(
      `Seeded ${conversations.length} demo conversations for unit "${slug}"`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
