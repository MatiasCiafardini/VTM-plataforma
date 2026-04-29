import Link from "next/link";

export type EmbeddedToolDefinition = {
  id: "analyzer" | "followups";
  promoKicker: string;
  promoTitle: string;
  promoDescription: string;
  buttonLabel: string;
  pageKicker: string;
  pageTitle: string;
  pageDescription: string;
  embedUrl: string;
  frameTitle: string;
};

export type ExternalToolDefinition = {
  id: "mentoring-videos" | "sales-simulator";
  promoKicker: string;
  promoTitle: string;
  promoDescription: string;
  buttonLabel: string;
  href: string;
};

type EmbeddedToolPromoProps = {
  href: string;
  tool: EmbeddedToolDefinition;
};

type EmbeddedToolEmbedProps = {
  dashboardHref: string;
  dashboardLabel: string;
  tool: EmbeddedToolDefinition;
};

type ExternalToolPromoProps = {
  tool: ExternalToolDefinition;
};

export const EMBEDDED_TOOLS: Record<
  EmbeddedToolDefinition["id"],
  EmbeddedToolDefinition
> = {
  analyzer: {
    id: "analyzer",
    promoKicker: "Nueva herramienta",
    promoTitle: "Analizador de campanas",
    promoDescription:
      "Abre el analizador integrado para revisar anuncios sin salir del dashboard.",
    buttonLabel: "Ir al analizador",
    pageKicker: "Analizador de anuncios",
    pageTitle: "VMT Analizador de Campanas",
    pageDescription:
      "Herramienta embebida para explorar campanas y revisar creatividad, enfoque y performance sin romper el flujo de trabajo.",
    embedUrl:
      "https://claude.site/public/artifacts/d655e34b-9817-4c38-9d70-b26476aae5db/embed",
    frameTitle: "VMT Analizador de Campanas",
  },
  followups: {
    id: "followups",
    promoKicker: "Nueva herramienta",
    promoTitle: "VMT Seguimientos",
    promoDescription:
      "Abre el panel de seguimiento de clientes integrado para ordenar proximos pasos y conversaciones.",
    buttonLabel: "Ir a seguimientos",
    pageKicker: "Seguimiento de clientes",
    pageTitle: "VMT Seguimientos",
    pageDescription:
      "Herramienta embebida para hacer seguimiento comercial de clientes, revisar estados y mantener continuidad en las conversaciones.",
    embedUrl:
      "https://claude.site/public/artifacts/7d6543ad-da86-4f46-8728-ef37eaf13942/embed",
    frameTitle: "VMT Seguimiento de Clientes",
  },
};

export const EXTERNAL_TOOLS: Record<
  ExternalToolDefinition["id"],
  ExternalToolDefinition
> = {
  "mentoring-videos": {
    id: "mentoring-videos",
    promoKicker: "Nueva herramienta",
    promoTitle: "Clases de la Mentoria",
    promoDescription:
      "Accede a la plataforma de contenidos para ver las clases y materiales de la mentoria.",
    buttonLabel: "Ir a las clases",
    href: "https://vendemastattoo.tiendup.com/login",
  },
  "sales-simulator": {
    id: "sales-simulator",
    promoKicker: "Nueva herramienta",
    promoTitle: "Simulador de Ventas",
    promoDescription:
      "Abre el simulador para practicar escenarios comerciales y mejorar tu toma de decisiones.",
    buttonLabel: "Ir al simulador",
    href: "https://claude.ai/public/artifacts/8eda56f1-1355-4258-8703-2667115db7aa",
  },
};

export function EmbeddedToolPromo({ href, tool }: EmbeddedToolPromoProps) {
  return (
    <article className="campaign-analyzer-promo">
      <div className="campaign-analyzer-promo-copy">
        <span className="campaign-analyzer-promo-kicker">
          {tool.promoKicker}
        </span>
        <h3>{tool.promoTitle}</h3>
        <p>{tool.promoDescription}</p>
      </div>

      <Link className="primary-button" href={href} prefetch scroll={false}>
        {tool.buttonLabel}
      </Link>
    </article>
  );
}

export function ExternalToolPromo({ tool }: ExternalToolPromoProps) {
  return (
    <article className="campaign-analyzer-promo">
      <div className="campaign-analyzer-promo-copy">
        <span className="campaign-analyzer-promo-kicker">
          {tool.promoKicker}
        </span>
        <h3>{tool.promoTitle}</h3>
        <p>{tool.promoDescription}</p>
      </div>

      <a
        className="primary-button"
        href={tool.href}
        target="_blank"
        rel="noreferrer"
      >
        {tool.buttonLabel}
      </a>
    </article>
  );
}

export function EmbeddedToolEmbed({
  dashboardHref,
  dashboardLabel,
  tool,
}: EmbeddedToolEmbedProps) {
  return (
    <section className="campaign-analyzer-shell">
      <header className="campaign-analyzer-hero">
        <div>
          <p className="campaign-analyzer-kicker">{tool.pageKicker}</p>
          <h3>{tool.pageTitle}</h3>
          <p>{tool.pageDescription}</p>
        </div>

        <div className="campaign-analyzer-actions">
          <Link
            className="ghost-button"
            href={dashboardHref}
            prefetch
            scroll={false}
          >
            {dashboardLabel}
          </Link>
          <a
            className="primary-button"
            href={tool.embedUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir en una pestana
          </a>
        </div>
      </header>

      <article className="campaign-analyzer-frame-card">
        <iframe
          src={tool.embedUrl}
          title={tool.frameTitle}
          className="campaign-analyzer-frame"
          allow="clipboard-write"
          allowFullScreen
          frameBorder={0}
        />
      </article>
    </section>
  );
}
