import { Coffee } from 'lucide-react'
import { useStore } from '../lib/store'
import { SUPPORT_URL } from '../lib/support'

/** "Seite unterstützen": opens the external donation page, or says it is coming while no link is set. */
export function SupportButton({ className = 'btn btn-ghost btn-sm', label = 'Seite unterstützen' }: { className?: string; label?: string }) {
  const { toast } = useStore()
  if (SUPPORT_URL)
    return (
      <a className={`${className} support-btn`} href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
        <Coffee size={16} /> <span>{label}</span>
      </a>
    )
  return (
    <button className={`${className} support-btn`} onClick={() => toast('Der Spendenlink kommt bald. Danke, dass du die Seite unterstützen willst!', 'info')}>
      <Coffee size={16} /> <span>{label}</span>
    </button>
  )
}
