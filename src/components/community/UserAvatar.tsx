import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  avatarUrl,
  role,
  size = 30,
  online,
  onPress,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  role?: "admin" | "member";
  size?: number;
  online?: boolean;
  onPress?: () => void;
  className?: string;
}) {
  const color =
    role === "admin"
      ? "bg-amber-400/20 text-amber-400"
      : "bg-primary/20 text-primary";
  const radius = size / 2;

  const inner = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={name}
      style={{ width: size, height: size, borderRadius: radius }}
      className="object-cover shrink-0"
    />
  ) : (
    <div
      className={cn("flex items-center justify-center shrink-0 font-extrabold", color)}
      style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.4) }}
    >
      {(name || "T")[0].toUpperCase()}
    </div>
  );

  const content = (
    <div className={cn("relative inline-flex", className)}>
      {inner}
      {online ? (
        <span
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background"
          style={{ width: Math.max(9, size * 0.3), height: Math.max(9, size * 0.3), right: Math.max(-2, -size * 0.05), bottom: Math.max(-2, -size * 0.05) }}
        />
      ) : null}
    </div>
  );

  if (onPress) {
    return (
      <button onClick={onPress} type="button" className="p-0 m-0 inline-grid place-items-center shrink-0">
        {content}
      </button>
    );
  }
  return content;
}