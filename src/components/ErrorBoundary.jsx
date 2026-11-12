import { Component } from 'react'
import { useT } from '../i18n'

// Перехватчик ошибок: если страница упала (битые данные, непредвиденный случай), показываем понятное сообщение
// с кнопкой «Оновити» вместо белого экрана.
function Fallback() {
  const t = useT()
  return (
    <div className="empty" style={{ margin: '20vh auto 0', maxWidth: 420, padding: '0 16px', textAlign: 'center' }}>
      <b>{t('err.title')}</b>{t('err.text')}
      <div><button className="nf-btn tap" onClick={() => location.reload()}>{t('err.reload')}</button></div>
    </div>
  )
}

export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.error(error) }
  render() { return this.state.failed ? <Fallback /> : this.props.children }
}
