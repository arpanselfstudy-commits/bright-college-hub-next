import { BookOpen } from 'lucide-react'

interface Props {
  white?: boolean
  size?: number
}

export default function AuthLogo({ white, size = 14 }: Props) {
  return (
    <div
      className={`cn-logo${white ? ' cn-logo--white' : ''}`}
      style={{ '--logo-size': `${size}px` } as React.CSSProperties}
    >
      <div className={`cn-logo-icon${white ? ' cn-logo-icon--white' : ''}`}>
        <BookOpen size={18} />
      </div>
      Bright College Hub
    </div>
  )
}
