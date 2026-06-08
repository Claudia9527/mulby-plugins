import { AlertTriangle, CheckCircle2, Circle, Hammer, Power, ShieldAlert } from 'lucide-react'
import type { PluginProjectPluginStatus } from '../types'

export function PluginBadges({ p }: { p: PluginProjectPluginStatus }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {p.manifestValid ? (
        <span className="badge badge-green"><CheckCircle2 size={11} /> 有效</span>
      ) : (
        <span className="badge badge-red"><AlertTriangle size={11} /> manifest 无效</span>
      )}
      {p.built ? (
        <span className="badge badge-indigo"><Hammer size={11} /> 已构建</span>
      ) : (
        <span className="badge badge-amber"><Hammer size={11} /> 未构建</span>
      )}
      {p.loaded ? (
        <span className="badge badge-green"><Power size={11} /> 已加载</span>
      ) : (
        <span className="badge badge-slate"><Circle size={11} /> 未加载</span>
      )}
      {p.idConflictWith && (
        <span className="badge badge-red" title={`与 ${p.idConflictWith} 冲突`}>
          <ShieldAlert size={11} /> ID 冲突
        </span>
      )}
    </div>
  )
}

export function HealthDot({ p }: { p: PluginProjectPluginStatus }) {
  const color = !p.manifestValid || p.idConflictWith
    ? 'bg-rose-500'
    : p.loaded
      ? 'bg-emerald-500'
      : 'bg-amber-500'
  return <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
}
