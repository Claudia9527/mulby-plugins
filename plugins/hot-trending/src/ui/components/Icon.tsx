import {
  Flame, Smartphone, Search, Music, Newspaper,
  MessagesSquare, Lightbulb, Monitor, Trophy, ClipboardList,
  Zap, Rocket, PenTool, Laptop, Pickaxe,
  Clapperboard, Tv, Bolt, PlayCircle,
  Megaphone, Waves, Bird, Mail, Globe,
  Rainbow, BookOpen, Drama, Apple,
  TrendingUp, Hash,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

const iconMap: Record<string, React.FC<LucideProps>> = {
  flame: Flame,
  smartphone: Smartphone,
  search: Search,
  music: Music,
  newspaper: Newspaper,
  'messages-square': MessagesSquare,
  lightbulb: Lightbulb,
  monitor: Monitor,
  trophy: Trophy,
  'clipboard-list': ClipboardList,
  zap: Zap,
  rocket: Rocket,
  'pen-tool': PenTool,
  laptop: Laptop,
  pickaxe: Pickaxe,
  clapperboard: Clapperboard,
  tv: Tv,
  bolt: Bolt,
  'play-circle': PlayCircle,
  megaphone: Megaphone,
  waves: Waves,
  bird: Bird,
  mail: Mail,
  globe: Globe,
  rainbow: Rainbow,
  'book-open': BookOpen,
  drama: Drama,
  apple: Apple,
  'trending-up': TrendingUp,
  hash: Hash,
}

interface Props extends LucideProps {
  name: string
}

export function Icon({ name, size = 14, ...props }: Props) {
  const IconComponent = iconMap[name] || Hash
  return <IconComponent size={size} {...props} />
}
