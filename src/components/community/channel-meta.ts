import {
  Bell,
  BookOpen,
  Camera,
  Flame,
  Gem,
  Gift,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Rocket,
  Search,
  Star,
  Tag,
  Trophy,
  Video,
} from "lucide-react";
import type { ComponentType } from "react";

const TILES: [string, string][] = [
  ["rgba(22,164,58,0.32)", "rgba(22,164,58,0.10)"],
  ["rgba(255,159,10,0.30)", "rgba(255,159,10,0.08)"],
  ["rgba(64,140,255,0.28)", "rgba(48,209,88,0.08)"],
  ["rgba(255,69,58,0.24)", "rgba(255,159,10,0.06)"],
  ["rgba(191,90,242,0.26)", "rgba(22,164,58,0.08)"],
];

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  pricetag: Tag,
  tag: Tag,
  chatbubbles: MessageCircle,
  diamond: Gem,
  megaphone: Megaphone,
  flame: Flame,
  rocket: Rocket,
  analytics: Star,
  search: Search,
  videocam: Video,
  camera: Camera,
  trophy: Trophy,
  star: Star,
  book: BookOpen,
  refresh: RefreshCw,
  bell: Bell,
  gift: Gift,
};

export function tileFor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TILES[h % TILES.length];
}

export function channelIcon(name: string | null): ComponentType<{ className?: string }> | null {
  if (!name) return null;
  return ICON_MAP[name] || null;
}