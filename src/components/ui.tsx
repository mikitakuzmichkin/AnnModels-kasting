import { useEffect, useState, type ReactNode } from 'react'
import { asset, isStale, STATUS_LABEL } from '../lib/format'
import type { AppStatus, Child, MediaItem } from '../types'

export function Portrait({ src, name }: { src?: string; name: string }) {
  if (!src) return <div className="portrait placeholder">{name.slice(0, 1)}</div>
  return <img className="portrait" src={asset(src)} alt={name} />
}

export function StatusBadge({ status }: { status: AppStatus }) {
  const tone = status === 'accepted' ? 'ok' : status === 'rejected' ? 'bad' : 'mute'
  return <span className={`badge ${tone}`}>{STATUS_LABEL[status]}</span>
}

export function StaleBadges({ child, media, days }: { child: Child; media: MediaItem[]; days: number }) {
  const photo = media.find((item) => item.id === child.mainPhotoId)
  const cards = media.filter((item) => item.childId === child.id && item.kind === 'card')
  return (
    <>
      {photo && isStale(photo.updatedAt, days) && <span className="badge warn">Старое фото</span>}
      {cards.some((item) => isStale(item.updatedAt, days)) && <span className="badge warn">Старая видеовизитка</span>}
    </>
  )
}

export function VisitPlayer({ slides, videoSrc, autoPlay = false }: { slides: string[]; videoSrc?: string | null; autoPlay?: boolean }) {
  const [play, setPlay] = useState(autoPlay)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!play || slides.length < 2) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 1400)
    return () => window.clearInterval(timer)
  }, [play, slides.length])

  if (videoSrc) {
    return <video className="portrait" src={videoSrc} poster={slides[0]} controls autoPlay={autoPlay} playsInline />
  }

  const src = slides[play ? index : 0]
  return (
    <button type="button" className={`player ${play ? 'is-play' : ''}`} onClick={() => setPlay(true)}>
      {src ? <img src={src} alt="" /> : <div className="portrait placeholder">A</div>}
      {!play && <span className="player-play">Смотреть визитку</span>}
    </button>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-label={title}>
        <div className="spread">
          <h3 className="serif">{title}</h3>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
