import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChannelRow } from "@/components/community/ChannelRow";
import type { Channel } from "@/lib/types";

export function ChannelPickerModal({
  visible,
  channels,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  channels: Channel[];
  onSelect: (channelId: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {visible ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70"
            onClick={onCancel}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full max-w-md rounded-t-3xl border border-border bg-card p-4 sm:mb-8 sm:rounded-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">{t("workspace.sendTo")}</h2>
              <button
                type="button"
                onClick={onCancel}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {channels.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("workspace.emptyChannels")}</p>
            ) : (
              <div className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto pb-1">
                {channels.map((channel, i) => (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    index={i}
                    onPress={() => onSelect(channel.id)}
                  />
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              className="mt-3 w-full text-muted-foreground"
              onClick={onCancel}
            >
              {t("common.cancel")}
            </Button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}