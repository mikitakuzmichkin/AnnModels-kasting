import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Modal, Portrait, StaleBadges, VisitPlayer } from '../../components/ui'
import { ageFrom, asset, copyText, daySeries, formatDate, genderWord, hashUrl, miniLink, visitCards } from '../../lib/format'
import { CITIES, EYES, HAIR } from '../../lib/format'
import { useStore } from '../../store'
import type { AppStatus, Casting, City, Gender, MediaItem } from '../../types'

const TABS: { id: AppStatus; label: string }[] = [
  { id: 'review', label: 'Текущие отклики' },
  { id: 'accepted', label: 'Принятые' },
  { id: 'rejected', label: 'Лист отказов' },
]

const ADMIN_LINKS = [
  ['/admin/castings', 'Кастинги'],
  ['/admin/models', 'База'],
  ['/admin/analytics', 'Сводка'],
  ['/admin/channel', 'Канал'],
  ['/admin/settings', 'Настройки'],
] as const

export function AdminLogin() {
  const { state, adminLogin } = useStore()
  const navigate = useNavigate()
  const [loginName, setLoginName] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (state.session.admin) return <Navigate to="/admin/castings" replace />

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = adminLogin(loginName, password)
    if (result) {
      setError(result)
      return
    }
    navigate('/admin/castings', { replace: true })
  }

  return (
    <main className="admin-login">
      <form className="panel stack" onSubmit={submit}>
        <p className="kicker">ANNmodels</p>
        <h1 className="serif">Вход для администратора</h1>
        <p className="muted">Сайт агентства: кастинги, анкеты и отклики. С телефона и с компьютера.</p>
        <label className="field">
          <span>Логин</span>
          <input value={loginName} onChange={(event) => setLoginName(event.target.value)} autoComplete="username" />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="badge bad">{error}</p>}
        <button className="btn btn-gold" type="submit">
          Войти
        </button>
        <p className="dim">Для показа: логин admin, пароль annmodels.</p>
        <Link to="/" className="muted">
          На главную
        </Link>
      </form>
    </main>
  )
}

export function AdminLayout() {
  const { state, reset, adminLogout } = useStore()
  if (!state.session.admin) return <Navigate to="/admin/login" replace />

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="kicker">ANNmodels</div>
          <strong>Администраторы</strong>
        </div>
        {ADMIN_LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'side-link on' : 'side-link')}>
            {label}
          </NavLink>
        ))}
        <Link to="/" className="side-link">
          Главная
        </Link>
        <button className="btn btn-ghost btn-sm" type="button" onClick={adminLogout}>
          Выйти
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={reset}>
          Сбросить данные
        </button>
      </aside>
      <header className="admin-top">
        <strong>ANNmodels</strong>
        <button className="btn btn-ghost btn-sm" type="button" onClick={adminLogout}>
          Выйти
        </button>
      </header>
      <div className="main">
        <Outlet />
      </div>
      <nav className="admin-nav">
        {ADMIN_LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'nav-item on' : 'nav-item')}>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function CastingList() {
  const { state } = useStore()
  return (
    <>
      <div className="spread">
        <h1 className="serif" style={{ fontSize: 48 }}>
          Кастинги
        </h1>
        <Link className="btn btn-gold" to="/admin/castings/new">Новая карточка</Link>
      </div>
      <div className="list">
        {state.castings.map((casting) => {
          const count = state.applications.filter((item) => item.castingId === casting.id).length
          return (
            <Link key={casting.id} to={`/admin/castings/${casting.id}`} className="panel spread" style={{ textDecoration: 'none' }}>
              <div>
                <p className="kicker">{casting.brand}</p>
                <strong>{casting.title}</strong>
                <p className="muted">
                  {formatDate(casting.date)} · {casting.city} · откликов {count}
                </p>
              </div>
              <span className={casting.published ? 'badge ok' : 'badge mute'}>{casting.published ? 'В ленте' : 'Черновик'}</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}

function emptyCasting(): Omit<Casting, 'id' | 'createdAt' | 'published'> {
  return {
    title: '',
    brand: '',
    description: '',
    criteria: '',
    date: '2026-11-15',
    time: '12:00',
    location: 'пр-т Независимости 58к2-1',
    city: 'Минск',
    gender: 'any',
    ageMin: 6,
    ageMax: 12,
    heightMin: 110,
    heightMax: 150,
  }
}

export function CastingForm() {
  const { id } = useParams()
  const { state, createCasting, updateCasting, publishCasting } = useStore()
  const navigate = useNavigate()
  const existing = state.castings.find((item) => item.id === id)
  const loaded = existing?.id ?? 'new'
  const [snapshot, setSnapshot] = useState(loaded)
  const [form, setForm] = useState(existing ? { ...existing } : emptyCasting())
  const [error, setError] = useState('')
  if (snapshot !== loaded) {
    setSnapshot(loaded)
    setForm(existing ? { ...existing } : emptyCasting())
  }

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function save(publish: boolean) {
    if (!form.title.trim() || !form.date || !form.location.trim()) {
      setError('Нужны название, дата и локация.')
      return
    }
    if (Number(form.ageMin) > Number(form.ageMax) || Number(form.heightMin) > Number(form.heightMax)) {
      setError('Проверьте диапазоны возраста и роста.')
      return
    }
    const draft = {
      title: form.title.trim(),
      brand: form.brand.trim() || 'ANNmodels',
      description: form.description.trim(),
      criteria: form.criteria.trim(),
      date: form.date,
      time: form.time,
      location: form.location.trim(),
      city: form.city,
      gender: form.gender,
      ageMin: Number(form.ageMin),
      ageMax: Number(form.ageMax),
      heightMin: Number(form.heightMin),
      heightMax: Number(form.heightMax),
      published: existing?.published || publish,
    }
    if (existing) {
      updateCasting(existing.id, draft)
      if (publish) publishCasting(existing.id)
      navigate(`/admin/castings/${existing.id}`)
      return
    }
    const created = createCasting(draft)
    navigate(`/admin/castings/${created}`)
  }

  return (
    <form
      className="stack"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        save(false)
      }}
    >
      <h1 className="serif" style={{ fontSize: 48 }}>
        {existing ? 'Редактировать кастинг' : 'Новый кастинг'}
      </h1>
      <label className="field">
        <span>Название</span>
        <input value={form.title} onChange={(event) => patch('title', event.target.value)} />
      </label>
      <label className="field">
        <span>Бренд</span>
        <input value={form.brand} onChange={(event) => patch('brand', event.target.value)} />
      </label>
      <label className="field">
        <span>Описание</span>
        <textarea value={form.description} onChange={(event) => patch('description', event.target.value)} />
      </label>
      <label className="field">
        <span>Критерии отбора</span>
        <textarea value={form.criteria} onChange={(event) => patch('criteria', event.target.value)} />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Дата</span>
          <input type="date" value={form.date} onChange={(event) => patch('date', event.target.value)} />
        </label>
        <label className="field">
          <span>Время</span>
          <input type="time" value={form.time} onChange={(event) => patch('time', event.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Локация</span>
        <input value={form.location} onChange={(event) => patch('location', event.target.value)} />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Город</span>
          <select value={form.city} onChange={(event) => patch('city', event.target.value as City)}>
            {CITIES.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Пол</span>
          <select value={form.gender} onChange={(event) => patch('gender', event.target.value as Gender | 'any')}>
            <option value="any">Любой</option>
            <option value="female">Девочки</option>
            <option value="male">Мальчики</option>
          </select>
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>Возраст от</span>
          <input type="number" value={form.ageMin} onChange={(event) => patch('ageMin', Number(event.target.value))} />
        </label>
        <label className="field">
          <span>Возраст до</span>
          <input type="number" value={form.ageMax} onChange={(event) => patch('ageMax', Number(event.target.value))} />
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>Рост от</span>
          <input type="number" value={form.heightMin} onChange={(event) => patch('heightMin', Number(event.target.value))} />
        </label>
        <label className="field">
          <span>Рост до</span>
          <input type="number" value={form.heightMax} onChange={(event) => patch('heightMax', Number(event.target.value))} />
        </label>
      </div>
      {error && <p className="badge bad">{error}</p>}
      <div className="row">
        <button className="btn btn-ghost" type="submit">
          Сохранить
        </button>
        <button className="btn btn-gold" type="button" onClick={() => save(true)}>
          Опубликовать в ленту и канал
        </button>
      </div>
    </form>
  )
}

export function CastingBoard() {
  const { id } = useParams()
  const { state } = useStore()
  const [tab, setTab] = useState<AppStatus>('review')
  const [copied, setCopied] = useState('')
  const casting = state.castings.find((item) => item.id === id)
  if (!casting) return <p className="empty">Кастинг не найден.</p>

  const items = state.applications.filter((item) => item.castingId === casting.id && item.status === tab)

  async function copyShare() {
    if (!casting) return
    const url = hashUrl(`/c/${casting.id}`)
    const ok = await copyText(url)
    setCopied(ok ? url : 'Скопируйте ссылку вручную')
  }

  return (
    <>
      <div className="spread">
        <div>
          <p className="kicker">{casting.brand}</p>
          <h1 className="serif" style={{ fontSize: 48 }}>
            {casting.title}
          </h1>
          <p className="muted">
            {formatDate(casting.date)} · {casting.time} · {casting.city}, {casting.location}
          </p>
        </div>
        <div className="row">
          <Link className="btn btn-ghost btn-sm" to={`/admin/castings/${casting.id}/edit`}>
            Редактировать
          </Link>
          <button className="btn btn-gold btn-sm" type="button" onClick={() => void copyShare()}>
            Ссылка для заказчика
          </button>
        </div>
      </div>
      {copied && <p className="note">{copied.startsWith('http') ? copied : copied}</p>}
      <div className="tabs">
        {TABS.map((item) => {
          const count = state.applications.filter((app) => app.castingId === casting.id && app.status === item.id).length
          return (
            <button key={item.id} type="button" className={tab === item.id ? 'tab on' : 'tab'} onClick={() => setTab(item.id)}>
              {item.label} · {count}
            </button>
          )
        })}
      </div>
      <div className="list">
        {items.map((app) => (
          <ApplicationCard key={app.id} appId={app.id} />
        ))}
        {!items.length && <p className="empty">В этой вкладке пусто.</p>}
      </div>
    </>
  )
}

function ApplicationCard({ appId }: { appId: string }) {
  const { state, setStatus, setAppPhotos } = useStore()
  const app = state.applications.find((item) => item.id === appId)
  const model = state.children.find((item) => item.id === app?.childId)
  const [zoomId, setZoomId] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => {
    if (!zoomId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomId])

  if (!app || !model) return null

  const photos = app.photoIds
    .map((id) => state.media.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const cards = visitCards(state.media, model.id)
  const avatar = state.media.find((item) => item.id === model.mainPhotoId) || photos[0]
  const shown = state.media.find((item) => item.id === zoomId)
  const library = state.media.filter((item) => item.childId === model.id && item.kind === 'photo')
  const chosen = picked
    .map((id) => library.find((item) => item.id === id))
    .filter((item): item is MediaItem => Boolean(item))

  function openPicker() {
    setPicked(app!.photoIds)
    setPicker(true)
  }

  function togglePick(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function drop(id: string) {
    setAppPhotos(
      app!.id,
      app!.photoIds.filter((item) => item !== id),
    )
    if (zoomId === id) setZoomId(null)
  }

  return (
    <article className="reply">
      <div className="reply-head">
        <button className="avatar" type="button" aria-label="Фото отклика" onClick={openPicker}>
          {avatar ? <img src={asset(avatar.src)} alt="" /> : model.firstName.slice(0, 1)}
        </button>
        <div className="stack">
          <strong>
            {model.firstName} {model.lastName}
          </strong>
          <p className="muted">
            {ageFrom(model.birthDate)} лет · {model.height} см · {model.city}
          </p>
          <div className="row">
            <StaleBadges child={model} media={state.media} days={state.settings.staleDays} />
            {!model.verified && <span className="badge warn">На проверке</span>}
            {model.blocked && <span className="badge bad">Блок</span>}
          </div>
          <div className="row">
            {app.status !== 'accepted' && (
              <button className="btn btn-ok btn-sm" type="button" onClick={() => setStatus(app.id, 'accepted')}>
                Одобрить
              </button>
            )}
            {app.status !== 'rejected' && (
              <button className="btn btn-bad btn-sm" type="button" onClick={() => setStatus(app.id, 'rejected')}>
                В архив / отказ
              </button>
            )}
            {app.status !== 'review' && (
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setStatus(app.id, 'review')}>
                В текущие
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="film">
        {photos.map((photo) => (
          <div key={photo.id} className="file">
            <button type="button" className="shot" onClick={() => setZoomId(photo.id)}>
              <img src={asset(photo.src)} alt={photo.title} />
            </button>
            <button type="button" className="shot-x" aria-label="Удалить" onClick={() => drop(photo.id)}>
              ×
            </button>
          </div>
        ))}
        {cards.map((card) => (
          <div key={card.id} className="file">
            <button type="button" className="shot" onClick={() => setZoomId(card.id)}>
              <img src={asset(card.src)} alt={card.title} />
              <span className="kind">{card.video ? 'видео' : 'визитка'}</span>
            </button>
          </div>
        ))}
        <button className="add-tile" type="button" aria-label="Добавить фото" onClick={openPicker}>
          +
        </button>
      </div>
      {shown && (
        <div className="overlay viewer" onClick={() => setZoomId(null)} role="presentation">
          <div className="viewer-frame" onClick={(event) => event.stopPropagation()} role="dialog" aria-label={shown.kind === 'card' ? 'Видеовизитка' : 'Фото'}>
            <button className="viewer-x" type="button" aria-label="Закрыть" onClick={() => setZoomId(null)}>
              ×
            </button>
            {shown.kind === 'card' ? (
              <VisitPlayer
                autoPlay
                slides={(photos.length ? photos : [shown]).map((item) => asset(item.src))}
                videoSrc={shown.video ? asset(shown.src) : null}
              />
            ) : (
              <img src={asset(shown.src)} alt={shown.title} />
            )}
          </div>
        </div>
      )}
      {picker && (
        <Modal title={`${model.firstName} ${model.lastName}`} onClose={() => setPicker(false)}>
          <p className="kicker">Выбранные фото</p>
          {chosen.length ? (
            <div className="shots">
              {chosen.map((item) => (
                <PhotoPick key={item.id} item={item} on onToggle={() => togglePick(item.id)} />
              ))}
            </div>
          ) : (
            <p className="muted">Для отклика пока ничего не выбрано.</p>
          )}
          <p className="kicker">Все фото</p>
          {library.length ? (
            <div className="shots">
              {library.map((item) => (
                <PhotoPick key={item.id} item={item} on={picked.includes(item.id)} onToggle={() => togglePick(item.id)} />
              ))}
            </div>
          ) : (
            <p className="muted">В анкете пока нет фото.</p>
          )}
          <button className="btn btn-gold" type="button" disabled={!picked.length} onClick={() => { setAppPhotos(app.id, picked); setPicker(false) }}>
            Сохранить выбор
          </button>
          <Link className="btn btn-ghost btn-block" to={`/admin/models/${model.id}`}>
            Перейти в профиль
          </Link>
        </Modal>
      )}
    </article>
  )
}

function PhotoPick({ item, on, onToggle }: { item: MediaItem; on: boolean; onToggle: () => void }) {
  return (
    <div className="file">
      <button type="button" className={on ? 'shot on' : 'shot'} onClick={onToggle}>
        <img src={asset(item.src)} alt={item.title} />
      </button>
      <button type="button" className={on ? 'tick on' : 'tick'} aria-label={on ? 'Снять выбор' : 'Выбрать'} onClick={onToggle} />
    </div>
  )
}

export function ModelsPage() {
  const { state, setAppPhotos } = useStore()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const requested = params.get('child')
  const appId = params.get('app')
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [gender, setGender] = useState('')
  const [eye, setEye] = useState('')
  const [hair, setHair] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [heightMin, setHeightMin] = useState('')
  const [heightMax, setHeightMax] = useState('')
  const [experience, setExperience] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<string | null>(requested)
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => {
    if (requested) setSelected(requested)
  }, [requested])

  useEffect(() => {
    const found = state.applications.find((item) => item.id === appId)
    setPicked(found?.photoIds ?? [])
  }, [appId, state.applications])

  const result = state.children.filter((person) => {
    const age = ageFrom(person.birthDate)
    const parent = state.parents.find((item) => item.id === person.parentId)
    const blob = `${person.firstName} ${person.lastName} ${parent?.name || ''} ${person.city} ${person.experience}`.toLowerCase()
    if (query && !blob.includes(query.toLowerCase())) return false
    if (city && person.city !== city) return false
    if (gender && person.gender !== gender) return false
    if (eye && person.eyeColor !== eye) return false
    if (hair && person.hairColor !== hair) return false
    if (ageMin && age < Number(ageMin)) return false
    if (ageMax && age > Number(ageMax)) return false
    if (heightMin && person.height < Number(heightMin)) return false
    if (heightMax && person.height > Number(heightMax)) return false
    if (experience && !person.experience.toLowerCase().includes(experience.toLowerCase())) return false
    if (status === 'verified' && (!person.verified || person.blocked)) return false
    if (status === 'pending' && person.verified) return false
    if (status === 'blocked' && !person.blocked) return false
    return true
  })
  const current = result.find((item) => item.id === selected) || state.children.find((item) => item.id === selected)

  return (
    <>
      <h1 className="serif" style={{ fontSize: 48 }}>
        База моделей
      </h1>
      <p className="muted">Найдено {result.length}</p>
      <div className="filters">
        <label>
          <span>Имя, родитель, опыт</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="grid-2">
          <label>
            <span>Город</span>
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="">Все</option>
              {CITIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Пол</span>
            <select value={gender} onChange={(event) => setGender(event.target.value)}>
              <option value="">Все</option>
              <option value="female">Девочки</option>
              <option value="male">Мальчики</option>
            </select>
          </label>
          <label>
            <span>Глаза</span>
            <select value={eye} onChange={(event) => setEye(event.target.value)}>
              <option value="">Все</option>
              {EYES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Волосы</span>
            <select value={hair} onChange={(event) => setHair(event.target.value)}>
              <option value="">Все</option>
              {HAIR.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Возраст от</span>
            <input value={ageMin} onChange={(event) => setAgeMin(event.target.value)} inputMode="numeric" />
          </label>
          <label>
            <span>Возраст до</span>
            <input value={ageMax} onChange={(event) => setAgeMax(event.target.value)} inputMode="numeric" />
          </label>
          <label>
            <span>Рост от</span>
            <input value={heightMin} onChange={(event) => setHeightMin(event.target.value)} inputMode="numeric" />
          </label>
          <label>
            <span>Рост до</span>
            <input value={heightMax} onChange={(event) => setHeightMax(event.target.value)} inputMode="numeric" />
          </label>
        </div>
        <label>
          <span>Опыт содержит</span>
          <input value={experience} onChange={(event) => setExperience(event.target.value)} />
        </label>
        <label>
          <span>Статус</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Все</option>
            <option value="verified">Проверенные</option>
            <option value="pending">На проверке</option>
            <option value="blocked">Заблокированные</option>
          </select>
        </label>
      </div>
      <div className="list">
        {result.map((person) => {
          const cover = state.media.find((item) => item.id === person.mainPhotoId)
          return (
            <button key={person.id} type="button" className="app-card" onClick={() => setSelected(person.id)}>
              <Portrait src={cover?.src} name={person.firstName} />
              <div className="stack" style={{ textAlign: 'left' }}>
                <strong>
                  {person.firstName} {person.lastName}
                </strong>
                <span className="muted">
                  {ageFrom(person.birthDate)} лет · {person.height} см · {person.city} · {person.eyeColor} / {person.hairColor}
                </span>
                <div className="row">
                  <StaleBadges child={person} media={state.media} days={state.settings.staleDays} />
                  {!person.verified && <span className="badge warn">На проверке</span>}
                  {person.blocked && <span className="badge bad">Блок</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {current && (
        <Modal key={current.id} title={`${current.firstName} ${current.lastName}`} onClose={() => setSelected(null)}>
          <p className="muted">
            {ageFrom(current.birthDate)} лет · {current.height} см · {current.city} · {current.eyeColor} / {current.hairColor}
          </p>
          <div className="shots">
            {state.media
              .filter((item) => item.childId === current.id && (item.kind === 'photo' || item.kind === 'card'))
              .map((item) => {
                if (item.kind === 'card') {
                  return (
                    <div key={item.id} className="file">
                      <div className="shot">
                        <img src={asset(item.src)} alt={item.title} />
                        <span className="kind">{item.video ? 'видео' : 'визитка'}</span>
                      </div>
                    </div>
                  )
                }
                const on = picked.includes(item.id)
                return (
                  <div key={item.id} className="file">
                    <button type="button" className={on ? 'shot on' : 'shot'} onClick={() => setPicked((currentIds) => (currentIds.includes(item.id) ? currentIds.filter((id) => id !== item.id) : [...currentIds, item.id]))}>
                      <img src={asset(item.src)} alt={item.title} />
                    </button>
                    <button
                      type="button"
                      className={on ? 'tick on' : 'tick'}
                      aria-label={on ? 'Снять выбор' : 'Выбрать'}
                      onClick={() => setPicked((currentIds) => (currentIds.includes(item.id) ? currentIds.filter((id) => id !== item.id) : [...currentIds, item.id]))}
                    />
                  </div>
                )
              })}
          </div>
          {appId && (
            <div className="row">
              <button
                className="btn btn-gold"
                type="button"
                disabled={!picked.length}
                onClick={() => {
                  const target = state.applications.find((item) => item.id === appId && item.childId === current.id)
                  if (!target) return
                  setAppPhotos(target.id, picked)
                  navigate(`/admin/castings/${target.castingId}`)
                }}
              >
                Заменить
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={!picked.length}
                onClick={() => {
                  const target = state.applications.find((item) => item.id === appId && item.childId === current.id)
                  if (!target) return
                  setAppPhotos(target.id, [...target.photoIds, ...picked])
                  navigate(`/admin/castings/${target.castingId}`)
                }}
              >
                Добавить
              </button>
            </div>
          )}
          <div className="field">
            <span>Рост</span>
            <p>{current.height} см</p>
          </div>
          <div className="field">
            <span>Город</span>
            <p>{current.city}</p>
          </div>
          <div className="field">
            <span>Опыт</span>
            <p>{current.experience}</p>
          </div>
          <Link className="btn btn-gold btn-block" to={`/admin/models/${current.id}${appId ? `?app=${appId}` : ''}`}>
            Перейти на полную страницу профиля
          </Link>
        </Modal>
      )}
    </>
  )
}

function mediaGroups(items: MediaItem[]) {
  const photos = items.filter((item) => item.kind === 'photo')
  const cards = items.filter((item) => item.kind === 'card' || item.kind === 'video')
  const preferred = ['Портрет', 'Альтернатива']
  const titles = [...new Set(photos.map((item) => item.title || 'Фото'))]
  titles.sort((a, b) => {
    const left = preferred.indexOf(a)
    const right = preferred.indexOf(b)
    if (left === -1 && right === -1) return a.localeCompare(b, 'ru')
    if (left === -1) return 1
    if (right === -1) return -1
    return left - right
  })
  const groups = titles.map((title) => ({ title, items: photos.filter((item) => (item.title || 'Фото') === title) }))
  if (cards.length) groups.push({ title: 'Видеовизитки', items: cards })
  return groups
}

export function ModelProfilePage() {
  const { id } = useParams()
  const { state, blockChild } = useStore()
  const person = state.children.find((item) => item.id === id)

  if (!person) return <p className="empty">Анкета не найдена.</p>
  const parent = state.parents.find((item) => item.id === person.parentId)
  const avatar = state.media.find((item) => item.id === person.mainPhotoId)
  const groups = mediaGroups(state.media.filter((item) => item.childId === person.id))

  return (
    <>
      <Link to="/admin/models" className="muted">
        ← База моделей
      </Link>
      <section className="profile-head">
        <div className="avatar avatar-lg">{avatar ? <img src={asset(avatar.src)} alt="" /> : person.firstName.slice(0, 1)}</div>
        <div className="stack">
          <div className="spread">
            <div>
              <p className="kicker">Профиль</p>
              <h1 className="serif" style={{ fontSize: 48 }}>
                {person.firstName} {person.lastName}
              </h1>
              <p className="muted">
                {parent?.name} · {parent?.phone}
              </p>
            </div>
            <button className="btn btn-bad" type="button" onClick={() => blockChild(person.id, !person.blocked)}>
              {person.blocked ? 'Разблокировать' : 'Заблокировать'}
            </button>
          </div>
          <div className="row">
            <StaleBadges child={person} media={state.media} days={state.settings.staleDays} />
            {!person.verified && <span className="badge warn">На проверке</span>}
            {person.blocked && <span className="badge bad">Заблокирован</span>}
          </div>
          <div className="grid-2">
            <div className="field">
              <span>Пол</span>
              <p>{genderWord(person.gender)}</p>
            </div>
            <div className="field">
              <span>Дата рождения</span>
              <p>
                {formatDate(person.birthDate)} · {ageFrom(person.birthDate)} лет
              </p>
            </div>
            <div className="field">
              <span>Рост</span>
              <p>{person.height} см</p>
            </div>
            <div className="field">
              <span>Город</span>
              <p>{person.city}</p>
            </div>
            <div className="field">
              <span>Глаза</span>
              <p>{person.eyeColor}</p>
            </div>
            <div className="field">
              <span>Волосы</span>
              <p>{person.hairColor}</p>
            </div>
            <div className="field">
              <span>Обувь</span>
              <p>{person.shoe}</p>
            </div>
            <div className="field">
              <span>Опыт</span>
              <p>{person.experience}</p>
            </div>
          </div>
          <div className="field">
            <span>О ребёнке</span>
            <p>{person.about || '—'}</p>
          </div>
        </div>
      </section>
      <section className="stack">
        <h2 className="serif" style={{ fontSize: 32 }}>
          Фото и видео
        </h2>
        {groups.map((group) => (
          <div key={group.title} className="stack">
            <h3 className="serif" style={{ fontSize: 22 }}>
              {group.title}
            </h3>
            <div className="shots">
              {group.items.map((item) => (
                <div key={item.id} className="file">
                  <div className="shot">
                    <img src={asset(item.src)} alt={item.title} />
                    {item.kind !== 'photo' && <span className="kind">{item.video ? 'видео' : 'визитка'}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  )
}

export function AnalyticsPage() {
  const { state } = useStore()
  const active = state.children.filter((item) => item.verified && !item.blocked).length
  const series = useMemo(() => daySeries(state.applications.map((item) => item.createdAt)), [state.applications])
  const max = Math.max(1, ...series.map((item) => item.count))
  const top = [...state.castings]
    .map((casting) => ({ casting, count: state.applications.filter((item) => item.castingId === casting.id).length }))
    .sort((a, b) => b.count - a.count)

  return (
    <>
      <h1 className="serif" style={{ fontSize: 48 }}>
        Аналитика
      </h1>
      <div className="stats">
        <div className="stat">
          <b>{active}</b>
          <span className="muted">Активных моделей</span>
        </div>
        <div className="stat">
          <b>{state.applications.length}</b>
          <span className="muted">Откликов в базе</span>
        </div>
        <div className="stat">
          <b>{state.castings.filter((item) => item.published).length}</b>
          <span className="muted">Кастингов в ленте</span>
        </div>
      </div>
      <section className="panel stack">
        <h2 className="serif">Топ кастингов</h2>
        {top.map(({ casting, count }) => (
          <div key={casting.id} className="spread">
            <span>
              {casting.brand} · {casting.title}
            </span>
            <strong>{count}</strong>
          </div>
        ))}
      </section>
      <section className="panel stack">
        <h2 className="serif">Отклики по дням</h2>
        <div className="bars">
          {series.map((item) => (
            <div key={item.day} className="bar" style={{ height: `${Math.max(8, (item.count / max) * 140)}px` }}>
              <span>{item.count || ''}</span>
              <i>{item.day.slice(8)}</i>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export function ChannelPage() {
  const { state } = useStore()
  const navigate = useNavigate()
  const [note, setNote] = useState('')

  return (
    <>
      <h1 className="serif" style={{ fontSize: 48 }}>
        Посты канала
      </h1>
      <p className="muted">
        В рабочей версии бот отправит это в канал агентства. Ссылка с startapp откроет кастинг внутри Mini App. Имя бота задаётся в разделе «Плашки».
      </p>
      {state.posts.map((post) => {
        const link = miniLink(state.settings.botUsername, state.settings.appShortName, post.castingId)
        return (
          <article key={post.id} className="stack">
            <div className="tg-post">{post.text}</div>
            <div className="row">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => navigate(`/app/castings/${post.castingId}`)}>
                Открыть как родитель
              </button>
              <button
                className="btn btn-gold btn-sm"
                type="button"
                onClick={() => {
                  if (!link) {
                    setNote('Сначала укажите имя бота в настройках плашек.')
                    return
                  }
                  void copyText(link).then((ok) => setNote(ok ? link : link))
                }}
              >
                Скопировать deep link
              </button>
            </div>
          </article>
        )
      })}
      {note && <p className="note">{note}</p>}
      {!state.posts.length && <p className="empty">Опубликуйте кастинг, и здесь появится пост.</p>}
    </>
  )
}

export function SettingsPage() {
  const { state, setSettings, reset } = useStore()
  const stalePhotos = state.children.filter((person) => {
    const photo = state.media.find((item) => item.id === person.mainPhotoId)
    return photo ? Date.now() - new Date(photo.updatedAt).getTime() > state.settings.staleDays * 86400000 : false
  }).length

  return (
    <>
      <h1 className="serif" style={{ fontSize: 48 }}>
        Плашки и бот
      </h1>
      <p className="muted">Сейчас с пометкой «Старое фото»: {stalePhotos}.</p>
      <div className="row">
        <button className={state.settings.staleDays === 90 ? 'btn btn-gold' : 'btn btn-ghost'} type="button" onClick={() => setSettings({ staleDays: 90 })}>
          90 дней
        </button>
        <button className={state.settings.staleDays === 180 ? 'btn btn-gold' : 'btn btn-ghost'} type="button" onClick={() => setSettings({ staleDays: 180 })}>
          180 дней
        </button>
      </div>
      <label className="field">
        <span>Имя бота без @</span>
        <input
          value={state.settings.botUsername}
          placeholder="annmodels_bot"
          onChange={(event) => setSettings({ botUsername: event.target.value.replace('@', '').trim() })}
        />
      </label>
      <label className="field">
        <span>Короткое имя Mini App</span>
        <input value={state.settings.appShortName} onChange={(event) => setSettings({ appShortName: event.target.value.trim() })} />
      </label>
      <p className="note">Ссылка для BotFather: https://t.me/{state.settings.botUsername || 'имябота'}/{state.settings.appShortName || 'annmodels'}</p>
      <button className="btn btn-ghost" type="button" onClick={reset}>
        Сбросить демо-данные
      </button>
    </>
  )
}
