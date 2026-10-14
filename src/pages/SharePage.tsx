import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { VisitPlayer } from '../components/ui'
import { ageFrom, asset, formatDate, genderWord, visitCards } from '../lib/format'
import { downloadZip } from '../lib/zip'
import { useStore } from '../store'

export function SharePage() {
  const { id } = useParams()
  const { state } = useStore()
  const casting = state.castings.find((item) => item.id === id)
  const accepted = state.applications.filter((item) => item.castingId === id && item.status === 'accepted')
  const allPhotos = accepted.flatMap((item) => state.media.filter((media) => media.childId === item.childId && media.kind === 'photo'))
  const [picked, setPicked] = useState<string[]>(() => allPhotos.map((item) => item.id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!casting) {
    return (
      <main className="client">
        <p>Ссылка не найдена.</p>
      </main>
    )
  }

  function toggle(photoId: string) {
    setPicked((current) => (current.includes(photoId) ? current.filter((item) => item !== photoId) : [...current, photoId]))
  }

  async function download(all: boolean) {
    setError('')
    setBusy(true)
    try {
      const files = allPhotos
        .filter((item) => all || picked.includes(item.id))
        .map((item) => {
          const person = state.children.find((child) => child.id === item.childId)
          return { name: `${person?.firstName || 'model'}-${item.title}.jpg`, src: item.src }
        })
      await downloadZip(files, `${casting!.brand}-podborka.zip`)
    } catch {
      setError('Не удалось собрать архив.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="client">
      <header className="stack">
        <p className="kicker">ANNmodels · подборка</p>
        <h1 className="serif" style={{ fontSize: 'clamp(48px, 8vw, 78px)', lineHeight: 0.9 }}>
          {casting.title}
        </h1>
        <p className="muted">
          {casting.brand} · {formatDate(casting.date)} · {casting.time}
          <br />
          {casting.city}, {casting.location}
        </p>
      </header>
      {!accepted.length && <p className="empty">На этот кастинг ещё никого не утвердили.</p>}
      {accepted.map((item) => {
        const person = state.children.find((child) => child.id === item.childId)
        if (!person) return null
        const photos = state.media.filter((media) => media.childId === person.id && media.kind === 'photo')
        const cover = state.media.find((media) => media.id === item.coverPhotoId) || photos[0]
        const cards = visitCards(state.media, person.id)
        return (
          <article key={item.id} className="model">
            <PortraitBlock src={cover?.src} name={person.firstName} />
            <div className="stack">
              <h2 className="serif">
                {person.firstName} {person.lastName}
              </h2>
              <p>
                {ageFrom(person.birthDate)} лет · {person.height} см · {genderWord(person.gender)} · {person.city}
                <br />
                Глаза {person.eyeColor} · волосы {person.hairColor} · обувь {person.shoe}
              </p>
              <p className="muted">{person.experience}</p>
              {cards.map((card) => (
                <VisitPlayer
                  key={card.id}
                  slides={card.video ? photos.map((photo) => asset(photo.src)) : [asset(card.src)]}
                  videoSrc={card.video ? asset(card.src) : null}
                />
              ))}
              {!cards.length && <VisitPlayer slides={photos.map((photo) => asset(photo.src))} />}
              <div className="stack">
                {photos.map((photo) => (
                  <label key={photo.id} className="row">
                    <input type="checkbox" checked={picked.includes(photo.id)} onChange={() => toggle(photo.id)} />
                    <span>{photo.title}</span>
                  </label>
                ))}
              </div>
            </div>
          </article>
        )
      })}
      <div className="download-bar">
        <button className="btn btn-ghost" type="button" disabled={busy || !picked.length} onClick={() => void download(false)}>
          Скачать выбранное
        </button>
        <button className="btn btn-gold" type="button" disabled={busy || !allPhotos.length} onClick={() => void download(true)}>
          Скачать всё
        </button>
      </div>
      {error && <p className="badge bad">{error}</p>}
      <Link to="/" className="dim">
        ANNmodels
      </Link>
    </main>
  )
}

function PortraitBlock({ src, name }: { src?: string; name: string }) {
  if (!src) return <div className="portrait placeholder">{name.slice(0, 1)}</div>
  return <img className="portrait" src={asset(src)} alt={name} />
}
