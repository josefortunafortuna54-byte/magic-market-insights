import { Button } from "@/components/ui/button";

interface TimeframeSelectorProps {
  selected: string;
  onSelect: (tf: string) => void;
}

const timeframes = [
  { label: "M5", value: "5" },
  { label: "M15", value: "15" },
  { label: "H1", value: "60" },
  { label: "H4", value: "240" },
  { label: "D1", value: "D" },
];

export function TimeframeSelector({ selected, onSelect }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-1">
      {timeframes.map((tf) => (
        <Button
          key={tf.value}
          variant={selected === tf.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onSelect(tf.value)}
        >
          {tf.label}
        </Button>
      ))}
    </div>
  );
}
