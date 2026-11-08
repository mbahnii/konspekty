import { useToast } from '../store/ui'
export default function Toast() {
  const { text, show } = useToast()
  return <div className={`toast ${show ? 'show' : ''}`}>{text}</div>
}
