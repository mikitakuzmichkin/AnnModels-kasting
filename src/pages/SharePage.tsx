import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { VisitPlayer } from '../components/ui'
import { ageFrom, asset, formatDate, genderWord, visitCards } from '../lib/format'
import { downloadZip } from '../lib/zip'
import { useStore } from '../store'

export function SharePage() {
  const { id } = useParams()
  const { state } = useStore()
  const casting = state.castings.find((item) => item.id === id)
  const accepted = state.applications.filter((item) => item.castingId === id && item.status === 'accepted')
  const photosOf = (photoIds: string[], childId: string) => {
    const attached = photoIds
      .map((photoId) => state.media.find((media) => media.id === photoId))
      .filter((media): media is NonNullable<typeof media> => Boolean(media && media.kind === 'photo'))
    if (attached.length) return attached
    return state.media.filter((media) => media.childId === childId && media.kind === 'photo')
  }
  const allPhotos = accepted.flatMap((item) => photosOf(item.photoIds, item.childId))
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
          const number = accepted.findIndex((entry) => entry.childId === item.childId) + 1
          return { name: `${number}-${person?.firstName || 'model'}-${item.title}.jpg`, src: item.src }
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
        <Logo className="logo logo-lg" />
        <p className="kicker">Подборка</p>
        <h1 className="serif" style={{ fontSize: 'clamp(44px, 7vw, 68px)', fontWeight: 300 }}>
          {casting.title}
        </h1>
        <p className="muted">
          {casting.brand} · {formatDate(casting.date)} · {casting.time}
          <br />
          {casting.city}, {casting.location}
        </p>
      </header>
      {!accepted.length && <p className="empty">На этот кастинг ещё никого не утвердили.</p>}
      {accepted.map((item, index) => {
        const person = state.children.find((child) => child.id === item.childId)
        if (!person) return null
        const number = index + 1
        const photos = photosOf(item.photoIds, person.id)
        const cards = visitCards(state.media, person.id)
        return (
          <article key={item.id} className="model">
            <div className="stack">
              <h2 className="serif">
                {number}. {person.firstName} {person.lastName}
              </h2>
              <p>
                {ageFrom(person.birthDate)} лет · {person.height} см · {genderWord(person.gender)} · {person.city}
                <br />
                Глаза {person.eyeColor} · волосы {person.hairColor} · обувь {person.shoe}
              </p>
              <p className="muted">{person.experience}</p>
              <div className="share-gallery">
                {photos.map((photo, photoIndex) => (
                  <div key={photo.id} className="model-photo">
                    {photoIndex === 0 && <span className="model-no">{number}</span>}
                    <PortraitBlock src={photo.src} name={photo.title} />
                  </div>
                ))}
              </div>
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
                    <span>
                      {number}. {photo.title}
                    </span>
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
      <Link to="/" aria-label="ANNmodels">
        <Logo className="logo logo-sm" />
      </Link>
    </main>
  )
}

function PortraitBlock({ src, name }: { src?: string; name: string }) {
  if (!src) return <div className="portrait placeholder">{name.slice(0, 1)}</div>
  return <img className="portrait" src={asset(src)} alt={name} />
}
