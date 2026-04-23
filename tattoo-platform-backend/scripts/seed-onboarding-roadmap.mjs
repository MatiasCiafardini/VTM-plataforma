import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  OnboardingAutomationKey,
  OnboardingCompletionMode,
  OnboardingStepKind,
  PrismaClient,
} from '@prisma/client';

const connectionString =
  process.env.PRISMA_DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('PRISMA_DIRECT_URL or DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const onboardingRoadmapSeed = {
  id: 'seed-roadmap-main',
  slug: 'main-onboarding',
  title: 'On boarding',
  description:
    'Roadmap principal de la mentoria para que cada alumno sepa que sigue y complete el proceso en orden.',
  phases: [
    {
      id: 'seed-onboarding-phase-activation',
      title: 'FASE 1 - ACTIVACION',
      description:
        'Primeros pasos para activar al alumno, ubicarlo en la plataforma y preparar el arranque de la mentoria.',
      sortOrder: 1,
      steps: [
        {
          id: 'seed-onboarding-step-activation-1',
          title: 'Ver clase de onboarding',
          description:
            'Mira la clase de bienvenida completa para entender como se organiza la mentoria y que esperar del programa.',
          locationHint: 'Disponible en la plataforma del curso, dentro del bloque de bienvenida.',
          stepKind: OnboardingStepKind.CLASS,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 1,
          resources: [
            {
              id: 'seed-onboarding-resource-activation-1',
              label: 'Abrir plataforma del curso',
              url: 'https://www.notion.so',
              sortOrder: 1,
            },
          ],
        },
        {
          id: 'seed-onboarding-step-activation-2',
          title: 'Darse de alta en la plataforma del curso',
          description:
            'Activa tu acceso al entorno donde estan las clases, materiales y ejercicios del programa.',
          locationHint: 'Desde el mail de bienvenida o el enlace compartido por el equipo.',
          stepKind: OnboardingStepKind.RESOURCE,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 2,
        },
        {
          id: 'seed-onboarding-step-activation-3',
          title: 'Darse de alta en la plataforma general de alumnos',
          description:
            'Completa la configuracion inicial de tu cuenta para que podamos hacer seguimiento dentro de la plataforma general.',
          locationHint: 'Dentro de tu cuenta VMT, completando el setup inicial.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.AUTOMATIC,
          automationKey: OnboardingAutomationKey.INITIAL_PROFILE_COMPLETED,
          sortOrder: 3,
          resources: [
            {
              id: 'seed-onboarding-resource-activation-3',
              label: 'Completar setup inicial',
              url: '/student/setup',
              sortOrder: 1,
            },
          ],
        },
        {
          id: 'seed-onboarding-step-activation-4',
          title: 'Ver Modulo 1 (Mentalidad)',
          description:
            'Revisa el contenido base de mentalidad para alinear el enfoque comercial y operativo antes de avanzar.',
          locationHint: 'Modulo 1 dentro de la plataforma del curso.',
          stepKind: OnboardingStepKind.CLASS,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 4,
        },
        {
          id: 'seed-onboarding-step-activation-5',
          title: 'Agendar clase de mentalidad',
          description:
            'Reserva tu encuentro con el mentor para trabajar mentalidad y despejar bloqueos de arranque.',
          locationHint: 'Calendario o agenda compartida por el equipo VMT.',
          stepKind: OnboardingStepKind.MEETING,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 5,
          resources: [
            {
              id: 'seed-onboarding-resource-activation-5',
              label: 'Abrir agenda',
              url: 'https://calendar.google.com',
              sortOrder: 1,
            },
          ],
        },
        {
          id: 'seed-onboarding-step-activation-6',
          title: 'Completar tareas del Modulo 1',
          description:
            'Ejecuta las tareas practicas del primer modulo y deja registradas tus conclusiones principales.',
          locationHint: 'Checklist y ejercicios del Modulo 1.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 6,
        },
      ],
    },
    {
      id: 'seed-onboarding-phase-business-base',
      title: 'FASE 2 - BASE DEL NEGOCIO',
      description:
        'Ordena la base comercial del alumno para construir una operacion mas estable antes de escalar demanda.',
      sortOrder: 2,
      steps: [
        {
          id: 'seed-onboarding-step-business-1',
          title: 'Ver Modulo 2',
          description: 'Estudia el modulo enfocado en estructura comercial y organizacion del negocio.',
          locationHint: 'Modulo 2 dentro del aula principal.',
          stepKind: OnboardingStepKind.CLASS,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 1,
        },
        {
          id: 'seed-onboarding-step-business-2',
          title: 'Completar tareas del Modulo 2',
          description: 'Aplica las tareas practicas del modulo para ordenar tu base operativa.',
          locationHint: 'Ejercicios del Modulo 2.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 2,
        },
        {
          id: 'seed-onboarding-step-business-3',
          title: 'Crear tarjetas de recomendacion',
          description: 'Prepara el material para activar referidos y recomendaciones de clientes actuales.',
          locationHint: 'Plantillas y materiales compartidos por la mentoria.',
          stepKind: OnboardingStepKind.RESOURCE,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 3,
        },
        {
          id: 'seed-onboarding-step-business-4',
          title: 'Crear sistema de fidelizacion',
          description: 'Define un proceso simple para sostener el contacto con clientes y generar recompra.',
          locationHint: 'Guias de fidelizacion dentro de la plataforma del curso.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 4,
        },
        {
          id: 'seed-onboarding-step-business-5',
          title: 'Ver Modulo 3',
          description: 'Revisa el tercer modulo para profundizar el orden comercial y prepararte para demanda.',
          locationHint: 'Modulo 3 del aula.',
          stepKind: OnboardingStepKind.CLASS,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 5,
        },
        {
          id: 'seed-onboarding-step-business-6',
          title: 'Ordenar base de datos de WhatsApp',
          description: 'Limpia y organiza tus contactos para poder trabajar reactivacion y seguimiento.',
          locationHint: 'WhatsApp Business y hojas de seguimiento sugeridas por la mentoria.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 6,
        },
        {
          id: 'seed-onboarding-step-business-7',
          title: 'Categorizar clientes con etiquetas',
          description: 'Clasifica tus contactos por interes, estado o potencial para facilitar proximas acciones.',
          locationHint: 'Etiquetas en WhatsApp o CRM recomendado.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 7,
        },
      ],
    },
    {
      id: 'seed-onboarding-phase-demand',
      title: 'FASE 3 - GENERACION DE DEMANDA',
      description:
        'Momento de salir a activar conversaciones, anuncios y recuperacion de contactos previos.',
      sortOrder: 3,
      steps: [
        {
          id: 'seed-onboarding-step-demand-1',
          title: 'Contactar clientes antiguos',
          description: 'Reactiva antiguos clientes con un mensaje claro para volver a abrir conversaciones.',
          locationHint: 'Base historica de clientes, WhatsApp o Instagram.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 1,
        },
        {
          id: 'seed-onboarding-step-demand-2',
          title: 'Contactar clientes interesados',
          description: 'Haz seguimiento a personas que ya consultaron y todavia no cerraron una reserva.',
          locationHint: 'Chats pendientes y registros de interesados.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 2,
        },
        {
          id: 'seed-onboarding-step-demand-3',
          title: 'Contactar seguidores con mensaje de apertura',
          description: 'Inicia conversaciones con seguidores calificados usando el guion propuesto por la mentoria.',
          locationHint: 'Instagram y mensajes sugeridos en el modulo comercial.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 3,
        },
        {
          id: 'seed-onboarding-step-demand-4',
          title: 'Crear Anuncio Ganador VMT',
          description: 'Arma tu primera pieza publicitaria siguiendo la estructura validada por VMT.',
          locationHint: 'Plantilla del Anuncio Ganador VMT.',
          stepKind: OnboardingStepKind.RESOURCE,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 4,
        },
        {
          id: 'seed-onboarding-step-demand-5',
          title: 'Publicar anuncio',
          description: 'Publica el anuncio en el canal indicado y valida que todo el mensaje este correcto.',
          locationHint: 'Administrador de anuncios o red social elegida.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 5,
        },
        {
          id: 'seed-onboarding-step-demand-6',
          title: 'Promocionar anuncio',
          description: 'Empuja el anuncio con presupuesto y segmentacion para empezar a generar consultas.',
          locationHint: 'Administrador de anuncios o promocion de publicaciones.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 6,
        },
      ],
    },
    {
      id: 'seed-onboarding-phase-sales',
      title: 'FASE 4 - CONVERSION (VENTAS)',
      description:
        'Etapa enfocada en la primera reunion comercial, la conversacion de venta y la mejora del cierre.',
      sortOrder: 4,
      steps: [
        {
          id: 'seed-onboarding-step-sales-1',
          title: 'Ver Modulo 4 (Ventas)',
          description: 'Revisa el contenido de ventas antes de ir a tu primera reunion comercial.',
          locationHint: 'Modulo 4 dentro del aula.',
          stepKind: OnboardingStepKind.CLASS,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 1,
        },
        {
          id: 'seed-onboarding-step-sales-2',
          title: 'Agendar primera reunion de ventas',
          description: 'Coordina una primera llamada o reunion con un prospecto real.',
          locationHint: 'Agenda de seguimiento y calendario compartido.',
          stepKind: OnboardingStepKind.MEETING,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 2,
        },
        {
          id: 'seed-onboarding-step-sales-3',
          title: 'Ejecutar conversacion de venta',
          description: 'Realiza la conversacion completa aplicando el guion y estructura sugeridos.',
          locationHint: 'Reunion con prospecto o llamada comercial.',
          stepKind: OnboardingStepKind.MEETING,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 3,
        },
        {
          id: 'seed-onboarding-step-sales-4',
          title: 'Corregir errores en la conversacion',
          description: 'Revisa feedback del mentor y ajusta tu proceso comercial para la siguiente oportunidad.',
          locationHint: 'Feedback de mentoria y modulo de ventas.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 4,
        },
        {
          id: 'seed-onboarding-step-sales-5',
          title: 'Ver Modulo 5 (Generacion de relaciones)',
          description: 'Estudia el modulo para fortalecer relacion, seguimiento y conversion sostenida.',
          locationHint: 'Modulo 5 dentro del aula.',
          stepKind: OnboardingStepKind.CLASS,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 5,
        },
      ],
    },
    {
      id: 'seed-onboarding-phase-scale',
      title: 'FASE 5 - ESCALA Y OPTIMIZACION',
      description:
        'Con la base comercial activa, esta fase empuja publicidad, seguimiento, app y contenido para escalar.',
      sortOrder: 5,
      steps: [
        {
          id: 'seed-onboarding-step-scale-1',
          title: 'Ver Modulo 6 (Publicidad)',
          description: 'Aprende el marco de publicidad para escalar la demanda con mas consistencia.',
          locationHint: 'Modulo 6 dentro del aula.',
          stepKind: OnboardingStepKind.CLASS,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 1,
        },
        {
          id: 'seed-onboarding-step-scale-2',
          title: 'Crear segundo Anuncio Ganador VMT',
          description: 'Construye una segunda pieza publicitaria para testear una nueva propuesta.',
          locationHint: 'Plantilla del Anuncio Ganador VMT y feedback del mentor.',
          stepKind: OnboardingStepKind.RESOURCE,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 2,
        },
        {
          id: 'seed-onboarding-step-scale-3',
          title: 'Ver Modulo 7 (Seguimiento post venta)',
          description: 'Incorpora el seguimiento posterior a la venta para aumentar recompra y recomendacion.',
          locationHint: 'Modulo 7 del aula.',
          stepKind: OnboardingStepKind.CLASS,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 3,
        },
        {
          id: 'seed-onboarding-step-scale-4',
          title: 'Aprender a usar la app',
          description: 'Conoce las funciones clave de la plataforma y como aprovecharlas en tu operacion diaria.',
          locationHint: 'Recorrido guiado por la app y configuracion inicial.',
          stepKind: OnboardingStepKind.RESOURCE,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 4,
          resources: [
            {
              id: 'seed-onboarding-resource-scale-4',
              label: 'Ir a configuracion inicial',
              url: '/student/setup',
              sortOrder: 1,
            },
          ],
        },
        {
          id: 'seed-onboarding-step-scale-5',
          title: 'Ver Modulo 8 (Contenido)',
          description: 'Revisa el contenido orientado a sostener demanda con piezas y mensajes mas efectivos.',
          locationHint: 'Modulo 8 dentro del aula.',
          stepKind: OnboardingStepKind.CLASS,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 5,
        },
        {
          id: 'seed-onboarding-step-scale-6',
          title: 'Tener asesoria con Cami (diseno)',
          description: 'Coordina la asesoria de diseno para mejorar presentacion, anuncios o piezas visuales.',
          locationHint: 'Agenda del equipo VMT.',
          stepKind: OnboardingStepKind.MEETING,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 6,
        },
      ],
    },
    {
      id: 'seed-onboarding-phase-continuity',
      title: 'FASE 6 - CONTINUIDAD (OPCIONAL)',
      description:
        'Instancia opcional para alumnos que siguen en post mentoria y quieren mantener acompanamiento.',
      sortOrder: 6,
      steps: [
        {
          id: 'seed-onboarding-step-continuity-1',
          title: 'Continuar en post mentoria (1 ano)',
          description:
            'Marca este paso si el alumno decide continuar en el proceso posterior a la mentoria principal.',
          locationHint: 'Confirmacion administrativa o comercial con el equipo.',
          stepKind: OnboardingStepKind.ACTION_MANUAL,
          completionMode: OnboardingCompletionMode.SELF_SERVICE,
          sortOrder: 1,
          isOptional: true,
          countsForProgress: false,
        },
      ],
    },
  ],
};

async function seedOnboardingRoadmap() {
  await prisma.onboardingRoadmap.upsert({
    where: { slug: onboardingRoadmapSeed.slug },
    update: {
      title: onboardingRoadmapSeed.title,
      description: onboardingRoadmapSeed.description,
      isActive: true,
    },
    create: {
      id: onboardingRoadmapSeed.id,
      slug: onboardingRoadmapSeed.slug,
      title: onboardingRoadmapSeed.title,
      description: onboardingRoadmapSeed.description,
      isActive: true,
    },
  });

  for (const phase of onboardingRoadmapSeed.phases) {
    await prisma.onboardingPhase.upsert({
      where: { id: phase.id },
      update: {
        roadmapId: onboardingRoadmapSeed.id,
        title: phase.title,
        description: phase.description,
        sortOrder: phase.sortOrder,
        isActive: true,
        countsForProgress: true,
      },
      create: {
        id: phase.id,
        roadmapId: onboardingRoadmapSeed.id,
        title: phase.title,
        description: phase.description,
        sortOrder: phase.sortOrder,
        isActive: true,
        countsForProgress: true,
      },
    });

    for (const step of phase.steps) {
      await prisma.onboardingStep.upsert({
        where: { id: step.id },
        update: {
          phaseId: phase.id,
          title: step.title,
          description: step.description,
          locationHint: step.locationHint,
          stepKind: step.stepKind,
          completionMode: step.completionMode,
          automationKey: step.automationKey ?? null,
          sortOrder: step.sortOrder,
          isActive: true,
          isOptional: step.isOptional ?? false,
          countsForProgress: step.countsForProgress ?? true,
          challengeId: null,
        },
        create: {
          id: step.id,
          phaseId: phase.id,
          title: step.title,
          description: step.description,
          locationHint: step.locationHint,
          stepKind: step.stepKind,
          completionMode: step.completionMode,
          automationKey: step.automationKey ?? null,
          sortOrder: step.sortOrder,
          isActive: true,
          isOptional: step.isOptional ?? false,
          countsForProgress: step.countsForProgress ?? true,
          challengeId: null,
        },
      });

      if (step.resources?.length) {
        for (const resource of step.resources) {
          await prisma.onboardingStepResource.upsert({
            where: { id: resource.id },
            update: {
              stepId: step.id,
              label: resource.label,
              url: resource.url,
              sortOrder: resource.sortOrder,
            },
            create: {
              id: resource.id,
              stepId: step.id,
              label: resource.label,
              url: resource.url,
              sortOrder: resource.sortOrder,
            },
          });
        }
      }
    }
  }
}

async function main() {
  await seedOnboardingRoadmap();

  const [roadmaps, phases, steps, resources] = await Promise.all([
    prisma.onboardingRoadmap.count(),
    prisma.onboardingPhase.count(),
    prisma.onboardingStep.count(),
    prisma.onboardingStepResource.count(),
  ]);

  console.log(
    `Onboarding roadmap synced. roadmaps=${roadmaps} phases=${phases} steps=${steps} resources=${resources}`,
  );
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
