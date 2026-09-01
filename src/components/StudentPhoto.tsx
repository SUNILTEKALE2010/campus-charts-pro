export function StudentPhoto({
  htno,
  photo,
  size = "sm",
}: {
  htno: string;
  photo: string;
  size?: "sm" | "lg";
}) {
  const box =
    size === "lg" ? "h-24 w-24 rounded-2xl text-lg" : "h-10 w-10 rounded-full text-[11px]";

  if (!photo) {
    return (
      <span
        aria-hidden="true"
        className={`${box} inline-flex shrink-0 items-center justify-center border border-border bg-secondary font-bold tabular-nums text-muted-foreground`}
      >
        {htno.slice(-3)}
      </span>
    );
  }

  return (
    <img
      src={photo}
      alt={`Photo of student ${htno}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${box} shrink-0 border border-border object-cover`}
    />
  );
}
