import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AttentionLevel,
  ChallengeStatus,
  DisplayCurrencyMode,
  GoalStatus,
  MetricValueType,
  PrismaClient,
  UserRole,
  UserStatus,
} from '@prisma/client';

const connectionString =
  process.env.PRISMA_DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('PRISMA_DIRECT_URL or DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const demoPassword = process.env.SEED_STUDENT_PASSWORD ?? 'Student12345!';
const metricMonths = [
  { month: 9, year: 2025 },
  { month: 10, year: 2025 },
  { month: 11, year: 2025 },
  { month: 12, year: 2025 },
  { month: 1, year: 2026 },
  { month: 2, year: 2026 },
];

const studentSeeds = [
  {
    email: 'student@tattoo-platform.local',
    firstName: 'Demo',
    lastName: 'Student',
    country: 'Argentina',
    timezone: 'America/Argentina/Buenos_Aires',
    revenues: [520, 680, 760, 910, 1040, 1140],
    consultas: [24, 28, 31, 35, 39, 43],
    cierres: [5, 6, 7, 8, 9, 10],
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2026-03-20T09:00:00.000Z'),
  },
  {
    email: 'lucas.loza@tattoo-platform.local',
    firstName: 'Lucas',
    lastName: 'Loza',
    country: 'Argentina',
    timezone: 'America/Argentina/Buenos_Aires',
    revenues: [680, 920, 1300, 1500, 1960, 2140],
    consultas: [26, 30, 36, 40, 44, 48],
    cierres: [5, 6, 8, 9, 11, 12],
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2026-03-22T12:00:00.000Z'),
  },
  {
    email: 'jose.escobar@tattoo-platform.local',
    firstName: 'Jose',
    lastName: 'Escobar',
    country: 'Chile',
    timezone: 'America/Santiago',
    revenues: [420, 470, 520, 580, 610, 689],
    consultas: [18, 20, 21, 23, 24, 25],
    cierres: [3, 3, 4, 4, 5, 5],
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2026-03-18T16:00:00.000Z'),
  },
  {
    email: 'fernando.deche@tattoo-platform.local',
    firstName: 'Fernando',
    lastName: 'Deche',
    country: 'Argentina',
    timezone: 'America/Argentina/Buenos_Aires',
    revenues: [1100, 980, 860, 740, 620, 480],
    consultas: [40, 35, 30, 25, 20, 16],
    cierres: [9, 8, 7, 5, 4, 3],
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2026-02-02T10:00:00.000Z'),
  },
  {
    email: 'camila.rios@tattoo-platform.local',
    firstName: 'Camila',
    lastName: 'Rios',
    country: 'Colombia',
    timezone: 'America/Bogota',
    revenues: [800, 880, 920, 1050, 1120, 1210],
    consultas: [22, 24, 25, 28, 30, 33],
    cierres: [5, 5, 6, 7, 7, 8],
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2026-03-19T14:30:00.000Z'),
  },
  {
    email: 'martin.vega@tattoo-platform.local',
    firstName: 'Martin',
    lastName: 'Vega',
    country: 'Mexico',
    timezone: 'America/Mexico_City',
    revenues: [950, 1020, 1100, 1160, 1180, 1190],
    consultas: [30, 31, 33, 34, 34, 35],
    cierres: [6, 7, 7, 8, 8, 8],
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2026-03-21T11:00:00.000Z'),
  },
  {
    email: 'valentina.sosa@tattoo-platform.local',
    firstName: 'Valentina',
    lastName: 'Sosa',
    country: 'Uruguay',
    timezone: 'America/Montevideo',
    revenues: [340, 310, 280, 260, 230, 200],
    consultas: [17, 15, 13, 12, 10, 8],
    cierres: [3, 3, 2, 2, 1, 1],
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2026-01-15T09:00:00.000Z'),
  },
  {
    email: 'andres.miranda@tattoo-platform.local',
    firstName: 'Andres',
    lastName: 'Miranda',
    country: 'Peru',
    timezone: 'America/Lima',
    revenues: [0, 0, 0, 0, 0, 0],
    consultas: [0, 0, 0, 0, 0, 0],
    cierres: [0, 0, 0, 0, 0, 0],
    status: UserStatus.ACTIVE,
    lastLoginAt: null,
  },
  {
    email: 'sofia.luna@tattoo-platform.local',
    firstName: 'Sofia',
    lastName: 'Luna',
    country: 'Argentina',
    timezone: 'America/Argentina/Buenos_Aires',
    revenues: [1200, 1400, 1600, 1800, 2100, 2400],
    consultas: [36, 40, 45, 50, 54, 58],
    cierres: [8, 9, 10, 12, 13, 15],
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2026-03-25T08:45:00.000Z'),
  },
  {
    email: 'nicolas.ortega@tattoo-platform.local',
    firstName: 'Nicolas',
    lastName: 'Ortega',
    country: 'Chile',
    timezone: 'America/Santiago',
    revenues: [700, 690, 710, 680, 640, 610],
    consultas: [24, 23, 23, 21, 20, 18],
    cierres: [5, 5, 5, 4, 4, 3],
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2026-03-10T19:00:00.000Z'),
  },
  {
    email: 'paula.rey@tattoo-platform.local',
    firstName: 'Paula',
    lastName: 'Rey',
    country: 'Estados Unidos',
    timezone: 'America/New_York',
    revenues: [1500, 1580, 1490, 1700, 1760, 1960],
    consultas: [34, 35, 33, 37, 38, 42],
    cierres: [8, 8, 7, 9, 9, 11],
    status: UserStatus.INACTIVE,
    lastLoginAt: new Date('2025-12-10T13:00:00.000Z'),
  },
];

const challengeSeeds = [
  {
    id: 'seed-challenge-1000',
    metricSlug: 'ingresos-facturacion',
    title: 'Primeros $1,000 USD',
    description: 'Alcanza $1,000 USD de facturacion en un solo mes.',
    iconKey: 'dollar',
    rewardTitle: 'Clase: Como cerrar tus primeros $1,000 USD',
    rewardUrl: 'https://chatgpt.com',
    targetValue: 1000,
    difficultyStars: 1,
    isActive: true,
  },
  {
    id: 'seed-challenge-3000',
    metricSlug: 'ingresos-facturacion',
    title: 'Primeros $3,000 USD',
    description: 'Alcanza $3,000 USD de facturacion en un solo mes.',
    iconKey: 'trophy',
    rewardTitle: 'Curso: Oferta premium para tatuadores',
    rewardUrl: 'https://chatgpt.com',
    targetValue: 3000,
    difficultyStars: 3,
    isActive: true,
  },
  {
    id: 'seed-challenge-7000',
    metricSlug: 'ingresos-facturacion',
    title: 'Primeros $7,000 USD',
    description: 'Alcanza $7,000 USD de facturacion en un solo mes.',
    iconKey: 'rocket',
    rewardTitle: 'Masterclass: Escalar a tickets altos',
    rewardUrl: 'https://chatgpt.com',
    targetValue: 7000,
    difficultyStars: 5,
    isActive: true,
  },
  {
    id: 'seed-challenge-10-cierres',
    metricSlug: 'cierres-del-mes',
    title: '10 cierres en un mes',
    description: 'Cierra diez ventas dentro del mismo periodo mensual.',
    iconKey: 'ribbon',
    rewardTitle: 'Video: Script de cierres para DM y WhatsApp',
    rewardUrl: 'https://chatgpt.com',
    targetValue: 10,
    difficultyStars: 2,
    isActive: true,
  },
  {
    id: 'seed-challenge-50-consultas',
    metricSlug: 'consultas-mensuales',
    title: '50 consultas mensuales',
    description: 'Lleva tu flujo de consultas a un volumen sostenido de cincuenta al mes.',
    iconKey: 'spark',
    rewardTitle: 'Curso: Sistema de contenido para generar consultas',
    rewardUrl: 'https://chatgpt.com',
    targetValue: 50,
    difficultyStars: 4,
    isActive: true,
  },
  {
    id: 'seed-challenge-1500-seguidores',
    metricSlug: 'seguidores-instagram-actuales',
    title: '1,500 seguidores nuevos',
    description: 'Haz crecer tu visibilidad y suma comunidad real alrededor de tu trabajo.',
    iconKey: 'flame',
    rewardTitle: 'Clase: Instagram para tatuadores que venden',
    rewardUrl: 'https://chatgpt.com',
    targetValue: 1500,
    difficultyStars: 3,
    isActive: true,
  },
];

async function seedCurrencies() {
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$', decimals: 2 },
    { code: 'CLP', name: 'Chilean Peso', symbol: '$', decimals: 0 },
    { code: 'COP', name: 'Colombian Peso', symbol: '$', decimals: 2 },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimals: 2 },
    { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', decimals: 2 },
    { code: 'UYU', name: 'Uruguayan Peso', symbol: '$', decimals: 2 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
    { code: 'EUR', name: 'Euro', symbol: 'EUR', decimals: 2 },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: currency,
      create: currency,
    });
  }
}

async function seedExchangeRates() {
  const ars = await prisma.currency.findUniqueOrThrow({
    where: { code: 'ARS' },
  });
  const usd = await prisma.currency.findUniqueOrThrow({
    where: { code: 'USD' },
  });

  for (const date of [
    '2025-09-01T00:00:00.000Z',
    '2025-10-01T00:00:00.000Z',
    '2025-11-01T00:00:00.000Z',
    '2025-12-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z',
    '2026-02-01T00:00:00.000Z',
    '2026-03-01T00:00:00.000Z',
  ]) {
    await prisma.exchangeRate.upsert({
      where: {
        fromCurrencyId_toCurrencyId_effectiveDate: {
          fromCurrencyId: ars.id,
          toCurrencyId: usd.id,
          effectiveDate: new Date(date),
        },
      },
      update: {
        rate: 0.00095,
        source: 'seed',
      },
      create: {
        fromCurrencyId: ars.id,
        toCurrencyId: usd.id,
        rate: 0.00095,
        effectiveDate: new Date(date),
        source: 'seed',
      },
    });
  }
}

async function seedAdmin() {
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL ?? 'admin@tattoo-platform.local';
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      firstName: 'Platform',
      lastName: 'Admin',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: adminEmail.toLowerCase(),
      firstName: 'Platform',
      lastName: 'Admin',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.adminProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
    },
  });
}

async function seedMetricCatalog() {
  const categories = [
    {
      name: 'Finanzas',
      slug: 'finanzas',
      description: 'Indicadores financieros mensuales',
      sortOrder: 1,
      definitions: [
        {
          name: 'Balance general',
          slug: 'balance-general',
          valueType: MetricValueType.CURRENCY,
          isRequired: false,
          isMonetary: true,
          sortOrder: 1,
        },
        {
          name: 'Ingresos facturacion',
          slug: 'ingresos-facturacion',
          valueType: MetricValueType.CURRENCY,
          isRequired: true,
          isMonetary: true,
          sortOrder: 2,
        },
        {
          name: 'Cantidad total de tatuajes',
          slug: 'cantidad-total-tatuajes',
          valueType: MetricValueType.INTEGER,
          isRequired: false,
          isMonetary: false,
          sortOrder: 3,
        },
        {
          name: 'Comision del estudio',
          slug: 'comision-estudio',
          valueType: MetricValueType.CURRENCY,
          isRequired: false,
          isMonetary: true,
          sortOrder: 4,
        },
        {
          name: 'Porcentaje de comision del estudio',
          slug: 'comision-estudio-porcentaje',
          valueType: MetricValueType.DECIMAL,
          isRequired: false,
          isMonetary: false,
          sortOrder: 5,
        },
        {
          name: 'Gastos del mes',
          slug: 'gastos-del-mes',
          valueType: MetricValueType.CURRENCY,
          isRequired: false,
          isMonetary: true,
          sortOrder: 6,
        },
      ],
    },
    {
      name: 'Marketing / Ventas',
      slug: 'marketing-ventas',
      description: 'Indicadores de marketing y conversion',
      sortOrder: 2,
      definitions: [
        {
          name: 'Ventas',
          slug: 'ventas',
          valueType: MetricValueType.INTEGER,
          isRequired: false,
          isMonetary: false,
          sortOrder: 1,
        },
        {
          name: 'Seguidores en Instagram actuales',
          slug: 'seguidores-instagram-actuales',
          valueType: MetricValueType.INTEGER,
          isRequired: false,
          isMonetary: false,
          sortOrder: 2,
        },
        {
          name: 'Consultas mensuales',
          slug: 'consultas-mensuales',
          valueType: MetricValueType.INTEGER,
          isRequired: true,
          isMonetary: false,
          sortOrder: 3,
        },
        {
          name: 'Conversaciones a nuevos',
          slug: 'conversaciones-a-nuevos',
          valueType: MetricValueType.INTEGER,
          isRequired: false,
          isMonetary: false,
          sortOrder: 4,
        },
        {
          name: 'Cotizaciones',
          slug: 'cotizaciones',
          valueType: MetricValueType.INTEGER,
          isRequired: false,
          isMonetary: false,
          sortOrder: 5,
        },
      ],
    },
    {
      name: 'Cierres',
      slug: 'cierres',
      description: 'Indicadores de cierres comerciales',
      sortOrder: 3,
      definitions: [
        {
          name: 'Cierres del mes',
          slug: 'cierres-del-mes',
          valueType: MetricValueType.INTEGER,
          isRequired: true,
          isMonetary: false,
          sortOrder: 1,
        },
        {
          name: 'Cierres con nuevos seguidores',
          slug: 'cierres-con-nuevos-seguidores',
          valueType: MetricValueType.INTEGER,
          isRequired: false,
          isMonetary: false,
          sortOrder: 2,
        },
        {
          name: 'Cierres nuevos clientes',
          slug: 'cierres-nuevos-clientes',
          valueType: MetricValueType.INTEGER,
          isRequired: false,
          isMonetary: false,
          sortOrder: 3,
        },
        {
          name: 'Cierres por recomendaciones',
          slug: 'cierres-por-recomendaciones',
          valueType: MetricValueType.INTEGER,
          isRequired: false,
          isMonetary: false,
          sortOrder: 4,
        },
        {
          name: 'Cierres recurrentes',
          slug: 'cierres-recurrentes',
          valueType: MetricValueType.INTEGER,
          isRequired: false,
          isMonetary: false,
          sortOrder: 5,
        },
      ],
    },
  ];

  for (const categoryData of categories) {
    const category = await prisma.metricCategory.upsert({
      where: { slug: categoryData.slug },
      update: {
        name: categoryData.name,
        description: categoryData.description,
        sortOrder: categoryData.sortOrder,
        isActive: true,
      },
      create: {
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description,
        sortOrder: categoryData.sortOrder,
        isActive: true,
      },
    });

    for (const definitionData of categoryData.definitions) {
      await prisma.metricDefinition.upsert({
        where: { slug: definitionData.slug },
        update: {
          categoryId: category.id,
          name: definitionData.name,
          description: null,
          valueType: definitionData.valueType,
          isRequired: definitionData.isRequired,
          isActive: true,
          isSystemSeed: true,
          isMonetary: definitionData.isMonetary,
          sortOrder: definitionData.sortOrder,
        },
        create: {
          categoryId: category.id,
          name: definitionData.name,
          slug: definitionData.slug,
          description: null,
          valueType: definitionData.valueType,
          isRequired: definitionData.isRequired,
          isActive: true,
          isSystemSeed: true,
          isMonetary: definitionData.isMonetary,
          sortOrder: definitionData.sortOrder,
        },
      });
    }
  }
}

async function seedStudentDashboardLinks() {
  const links = [
    {
      id: 'student-dashboard-link-sales',
      title: 'GPT Ventas',
      url: 'https://chatgpt.com',
      sortOrder: 1,
    },
    {
      id: 'student-dashboard-link-marketing',
      title: 'GPT Marketing',
      url: 'https://chatgpt.com',
      sortOrder: 2,
    },
    {
      id: 'student-dashboard-link-content',
      title: 'GPT Contenido',
      url: 'https://chatgpt.com',
      sortOrder: 3,
    },
    {
      id: 'student-dashboard-link-training',
      title: 'Formacion',
      url: 'https://www.notion.so',
      sortOrder: 4,
    },
  ];

  for (const link of links) {
    await prisma.studentDashboardQuickLink.upsert({
      where: { id: link.id },
      update: {
        title: link.title,
        url: link.url,
        sortOrder: link.sortOrder,
      },
      create: link,
    });
  }
}

async function seedChallengesCatalog() {
  const definitions = await prisma.metricDefinition.findMany();
  const definitionsBySlug = Object.fromEntries(
    definitions.map((definition) => [definition.slug, definition]),
  );

  for (const challenge of challengeSeeds) {
    await prisma.challenge.upsert({
      where: { id: challenge.id },
      update: {
        title: challenge.title,
        description: challenge.description,
        iconKey: challenge.iconKey,
        rewardTitle: challenge.rewardTitle,
        rewardUrl: challenge.rewardUrl,
        metricDefinitionId: definitionsBySlug[challenge.metricSlug]?.id,
        targetValue: challenge.targetValue,
        difficultyStars: challenge.difficultyStars,
        isActive: challenge.isActive,
      },
      create: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        iconKey: challenge.iconKey,
        rewardTitle: challenge.rewardTitle,
        rewardUrl: challenge.rewardUrl,
        metricDefinitionId: definitionsBySlug[challenge.metricSlug]?.id,
        targetValue: challenge.targetValue,
        difficultyStars: challenge.difficultyStars,
        isActive: challenge.isActive,
      },
    });
  }
}

function buildGoalStatus(seed) {
  const latest = seed.revenues.at(-1) ?? 0;
  const previous = seed.revenues.at(-2) ?? 0;

  if (latest === 0) return GoalStatus.MISSED;
  if (latest >= previous) return GoalStatus.ACHIEVED;
  if (latest >= previous * 0.85) return GoalStatus.IN_PROGRESS;
  return GoalStatus.MISSED;
}

function calculateAttention(seed) {
  const latestIncome = seed.revenues.at(-1) ?? 0;
  const previousIncome = seed.revenues.at(-2) ?? 0;
  const latestLeads = seed.consultas.at(-1) ?? 0;
  const previousLeads = seed.consultas.at(-2) ?? 0;
  const latestClosures = seed.cierres.at(-1) ?? 0;
  const previousClosures = seed.cierres.at(-2) ?? 0;

  const reasonNoMetrics = latestIncome === 0 && latestLeads === 0 && latestClosures === 0;
  const reasonIncomeDrop = latestIncome < previousIncome;
  const reasonLeadsDrop = latestLeads < previousLeads;
  const reasonClosuresDrop = latestClosures < previousClosures;
  const reasonGoalsMissed = buildGoalStatus(seed) === GoalStatus.MISSED;
  const reasonInactivity =
    !seed.lastLoginAt ||
    (Date.now() - new Date(seed.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24) > 45;

  let score = 0;
  if (reasonNoMetrics) score += 40;
  if (reasonIncomeDrop) score += 20;
  if (reasonLeadsDrop) score += 15;
  if (reasonClosuresDrop) score += 15;
  if (reasonGoalsMissed) score += 10;
  if (reasonInactivity) score += 20;

  let level = AttentionLevel.GREEN;
  if (score >= 40) {
    level = AttentionLevel.RED;
  } else if (score >= 20) {
    level = AttentionLevel.YELLOW;
  }

  return {
    score,
    level,
    reasonNoMetrics,
    reasonIncomeDrop,
    reasonLeadsDrop,
    reasonClosuresDrop,
    reasonGoalsMissed,
    reasonInactivity,
  };
}

async function seedDemoStudents() {
  const usd = await prisma.currency.findUniqueOrThrow({
    where: { code: 'USD' },
  });
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const metricDefinitions = await prisma.metricDefinition.findMany({
    where: {
      slug: {
        in: [
          'ingresos-facturacion',
          'consultas-mensuales',
          'cierres-del-mes',
          'ventas',
          'cantidad-total-tatuajes',
        ],
      },
    },
  });
  const definitionsBySlug = Object.fromEntries(
    metricDefinitions.map((definition) => [definition.slug, definition]),
  );

  for (const seed of studentSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email.toLowerCase() },
      update: {
        firstName: seed.firstName,
        lastName: seed.lastName,
        passwordHash,
        role: UserRole.STUDENT,
        status: seed.status,
        lastLoginAt: seed.lastLoginAt,
      },
      create: {
        email: seed.email.toLowerCase(),
        firstName: seed.firstName,
        lastName: seed.lastName,
        passwordHash,
        role: UserRole.STUDENT,
        status: seed.status,
        lastLoginAt: seed.lastLoginAt,
      },
    });

    const student = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        country: seed.country,
        timezone: seed.timezone,
        localCurrencyId: usd.id,
        displayCurrencyMode: DisplayCurrencyMode.BOTH,
        isBusinessActive: true,
      },
      create: {
        userId: user.id,
        country: seed.country,
        timezone: seed.timezone,
        localCurrencyId: usd.id,
        displayCurrencyMode: DisplayCurrencyMode.BOTH,
        isBusinessActive: true,
      },
    });

    await prisma.studentGoal.upsert({
      where: {
        id: `goal-${student.id}`,
      },
      update: {
        titleOverride: 'Objetivo comercial mensual',
        targetValue: 1500,
        currentValue: seed.revenues.at(-1) ?? 0,
        dueDate: new Date('2026-03-31T00:00:00.000Z'),
        status: buildGoalStatus(seed),
      },
      create: {
        id: `goal-${student.id}`,
        studentId: student.id,
        goalId: (
          await prisma.goal.upsert({
            where: { id: 'seed-goal-sales' },
            update: {
              title: 'Escalar facturacion',
              description: 'Sostener crecimiento de ventas mensual',
              isActive: true,
            },
            create: {
              id: 'seed-goal-sales',
              title: 'Escalar facturacion',
              description: 'Sostener crecimiento de ventas mensual',
              isActive: true,
            },
          })
        ).id,
        titleOverride: 'Objetivo comercial mensual',
        targetValue: 1500,
        currentValue: seed.revenues.at(-1) ?? 0,
        dueDate: new Date('2026-03-31T00:00:00.000Z'),
        status: buildGoalStatus(seed),
      },
    });

    for (const [index, metricMonth] of metricMonths.entries()) {
      const status = index === metricMonths.length - 1
        ? seed.revenues[index] === 0
          ? 'DRAFT'
          : 'CLOSED'
        : 'CLOSED';
      const period = await prisma.monthlyMetricPeriod.upsert({
        where: {
          studentId_month_year: {
            studentId: student.id,
            month: metricMonth.month,
            year: metricMonth.year,
          },
        },
        update: {
          status,
          submittedAt:
            status !== 'DRAFT'
              ? new Date(Date.UTC(metricMonth.year, metricMonth.month - 1, 25))
              : null,
          closedAt:
            status === 'CLOSED'
              ? new Date(Date.UTC(metricMonth.year, metricMonth.month - 1, 27))
              : null,
        },
        create: {
          studentId: student.id,
          month: metricMonth.month,
          year: metricMonth.year,
          status,
          draftedAt: new Date(Date.UTC(metricMonth.year, metricMonth.month - 1, 10)),
          submittedAt:
            status !== 'DRAFT'
              ? new Date(Date.UTC(metricMonth.year, metricMonth.month - 1, 25))
              : null,
          closedAt:
            status === 'CLOSED'
              ? new Date(Date.UTC(metricMonth.year, metricMonth.month - 1, 27))
              : null,
        },
      });

      const revenue = seed.revenues[index];
      const consultas = seed.consultas[index];
      const cierres = seed.cierres[index];

      const metricValues = [
        {
          definition: definitionsBySlug['ingresos-facturacion'],
          originalAmount: revenue,
          usdAmount: revenue,
        },
        {
          definition: definitionsBySlug['consultas-mensuales'],
          numberValue: consultas,
        },
        {
          definition: definitionsBySlug['cierres-del-mes'],
          numberValue: cierres,
        },
        {
          definition: definitionsBySlug.ventas,
          numberValue: cierres,
        },
        {
          definition: definitionsBySlug['cantidad-total-tatuajes'],
          numberValue: cierres,
        },
      ];

      for (const metricValue of metricValues) {
        await prisma.metricValue.upsert({
          where: {
            periodId_metricDefinitionId: {
              periodId: period.id,
              metricDefinitionId: metricValue.definition.id,
            },
          },
          update: {
            numberValue: metricValue.numberValue ?? null,
            originalAmount: metricValue.originalAmount ?? null,
            usdAmount: metricValue.usdAmount ?? null,
            originalCurrencyId:
              metricValue.originalAmount !== undefined ? usd.id : null,
          },
          create: {
            periodId: period.id,
            metricDefinitionId: metricValue.definition.id,
            numberValue: metricValue.numberValue ?? null,
            originalAmount: metricValue.originalAmount ?? null,
            usdAmount: metricValue.usdAmount ?? null,
            originalCurrencyId:
              metricValue.originalAmount !== undefined ? usd.id : null,
          },
        });
      }
    }

    const latestPeriod = await prisma.monthlyMetricPeriod.findFirstOrThrow({
      where: { studentId: student.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    const attention = calculateAttention(seed);

    await prisma.attentionScore.upsert({
      where: {
        id: `${student.id}-${latestPeriod.id}`,
      },
      update: {
        monthlyMetricPeriodId: latestPeriod.id,
        score: attention.score,
        level: attention.level,
        reasonNoMetrics: attention.reasonNoMetrics,
        reasonIncomeDrop: attention.reasonIncomeDrop,
        reasonLeadsDrop: attention.reasonLeadsDrop,
        reasonClosuresDrop: attention.reasonClosuresDrop,
        reasonGoalsMissed: attention.reasonGoalsMissed,
        reasonInactivity: attention.reasonInactivity,
        calculatedAt: new Date('2026-03-25T12:00:00.000Z'),
      },
      create: {
        id: `${student.id}-${latestPeriod.id}`,
        studentId: student.id,
        monthlyMetricPeriodId: latestPeriod.id,
        score: attention.score,
        level: attention.level,
        reasonNoMetrics: attention.reasonNoMetrics,
        reasonIncomeDrop: attention.reasonIncomeDrop,
        reasonLeadsDrop: attention.reasonLeadsDrop,
        reasonClosuresDrop: attention.reasonClosuresDrop,
        reasonGoalsMissed: attention.reasonGoalsMissed,
        reasonInactivity: attention.reasonInactivity,
        calculatedAt: new Date('2026-03-25T12:00:00.000Z'),
      },
    });

    const upcomingEvents = [
      {
        id: `event-followup-${student.id}`,
        title: 'Seguimiento semanal',
        description: 'Revision de avances comerciales y proximos pasos.',
        startsAt: new Date('2026-03-30T18:00:00.000Z'),
        endsAt: new Date('2026-03-30T18:45:00.000Z'),
      },
      {
        id: `event-review-${student.id}`,
        title: 'Revision de metricas',
        description: 'Chequeo del tablero mensual y objetivos.',
        startsAt: new Date('2026-04-02T16:00:00.000Z'),
        endsAt: new Date('2026-04-02T16:30:00.000Z'),
      },
    ];

    for (const event of upcomingEvents) {
      await prisma.event.upsert({
        where: { id: event.id },
        update: {
          title: event.title,
          description: event.description,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          externalSource: 'Google Calendar',
          externalId: event.id,
        },
        create: {
          id: event.id,
          studentId: student.id,
          title: event.title,
          description: event.description,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          externalSource: 'Google Calendar',
          externalId: event.id,
        },
      });
    }

    const seededAssignments =
      seed.email === 'student@tattoo-platform.local'
        ? [
            {
              challengeId: 'seed-challenge-1000',
              status: ChallengeStatus.COMPLETED,
              dueDate: new Date('2026-01-31T00:00:00.000Z'),
            },
            {
              challengeId: 'seed-challenge-3000',
              status: ChallengeStatus.COMPLETED,
              dueDate: new Date('2026-02-28T00:00:00.000Z'),
            },
            {
              challengeId: 'seed-challenge-7000',
              status: ChallengeStatus.IN_PROGRESS,
              dueDate: new Date('2026-06-30T00:00:00.000Z'),
            },
          ]
        : [
            {
              challengeId: 'seed-challenge-10-cierres',
              status:
                (seed.cierres.at(-1) ?? 0) >= 10
                  ? ChallengeStatus.COMPLETED
                  : ChallengeStatus.IN_PROGRESS,
              dueDate: new Date('2026-04-30T00:00:00.000Z'),
            },
            {
              challengeId: 'seed-challenge-50-consultas',
              status:
                (seed.consultas.at(-1) ?? 0) >= 50
                  ? ChallengeStatus.COMPLETED
                  : ChallengeStatus.ASSIGNED,
              dueDate: new Date('2026-05-31T00:00:00.000Z'),
            },
          ];

    for (const assignment of seededAssignments) {
      await prisma.studentChallenge.upsert({
        where: {
          id: `${student.id}-${assignment.challengeId}`,
        },
        update: {
          challengeId: assignment.challengeId,
          status: assignment.status,
          dueDate: assignment.dueDate,
        },
        create: {
          id: `${student.id}-${assignment.challengeId}`,
          studentId: student.id,
          challengeId: assignment.challengeId,
          status: assignment.status,
          dueDate: assignment.dueDate,
        },
      });
    }
  }
}

async function main() {
  await seedCurrencies();
  await seedExchangeRates();
  await seedAdmin();
  await seedMetricCatalog();
  await seedStudentDashboardLinks();
  await seedChallengesCatalog();
  await seedDemoStudents();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
