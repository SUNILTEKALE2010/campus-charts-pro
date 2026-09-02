export function FacultyPhoto({
  name,
  photo,
  size = "sm",
}: {
  name: string;
  photo: string;
  size?: "sm" | "lg";
}) {
  const box =
    size === "lg" ? "h-24 w-24 rounded-2xl text-lg" : "h-10 w-10 rounded-full text-[11px]";

  const initials = name
    .replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  if (!photo) {
    return (
      <span
        aria-hidden="true"
        className={`${box} inline-flex shrink-0 items-center justify-center border border-border bg-secondary font-bold text-muted-foreground`}
      >
        {initials || "?"}
      </span>
    );
  }

  return (
    <img
      src={photo}
      alt={`Photo of ${name}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${box} shrink-0 border border-border object-cover`}
    />
  );
}
