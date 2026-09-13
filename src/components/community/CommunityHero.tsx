import { useTranslation } from "react-i18next";

export function CommunityHero({
  channelsCount,
  liveRooms,
}: {
  channelsCount: number;
  liveRooms: number;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-emerald-500/30 p-6 mb-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(22,164,58,0.20), rgba(255,159,10,0.08), rgba(28,28,30,0.4))",
      }}
    >
      <div className="pointer-events-none absolute -top-[70px] -right-[50px] h-[180px] w-[180px] rounded-full bg-emerald-500/10" />
      <div className="pointer-events-none absolute -bottom-[80px] -left-[40px] h-[160px] w-[160px] rounded-full bg-amber-500/10" />

      <div className="mb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {t("workspace.liveBadge")}
        </span>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-0.5">{t("workspace.heroTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("workspace.heroSubtitle")}</p>

      <div className="mt-4 flex gap-2">
        <div className="flex items-baseline gap-1.5 rounded-xl border border-border bg-black/40 px-3 py-2">
          <span className="text-lg font-extrabold text-foreground">{channelsCount}</span>
          <span className="text-sm text-muted-foreground">
            {t("workspace.statsChannels", { count: channelsCount })}
          </span>
        </div>
        <div
          className={`flex items-baseline gap-1.5 rounded-xl border px-3 py-2 ${
            liveRooms > 0 ? "border-emerald-500/40" : "border-border bg-black/40"
          }`}
        >
          <span className={`text-lg font-extrabold ${liveRooms > 0 ? "text-emerald-400" : "text-foreground"}`}>
            {liveRooms}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("workspace.statsRooms", { count: liveRooms })}
          </span>
        </div>
      </div>
    </div>
  );
}