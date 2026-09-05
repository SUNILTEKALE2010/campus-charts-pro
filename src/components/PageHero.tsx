import type { ReactNode } from "react";

/** Full-width picture banner used at the top of every dashboard tab. */
export function PageHero({
  image,
  eyebrow,
  title,
  description,
  priority = false,
}: {
  image: string;
  eyebrow: string;
  title: ReactNode;
  description: string;
  priority?: boolean;
}) {
  return (
    <header className="relative isolate overflow-hidden text-primary-foreground">
      <img
        src={image}
        alt=""
        aria-hidden="true"
        width={1920}
        height={640}
        {...(priority ? {} : { loading: "lazy" as const })}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-hero)", opacity: 0.86 }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-24"
        style={{ background: "linear-gradient(to top, var(--background), transparent)" }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-85">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight drop-shadow-sm sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base opacity-90">{description}</p>
      </div>
    </header>
  );
}
