import { useMemo, useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate, useParams } from 'react-router-dom'
import { Modal, Portrait, StaleBadges, StatusBadge, VisitPlayer } from '../../components/ui'
import { ageFrom, asset, copyText, daySeries, formatDate, genderWord, hashUrl, miniLink, visitCards } from '../../lib/format'
import { CITIES, EYES, HAIR } from '../../lib/format'
import { useStore } from '../../store'
import type { AppStatus, Casting, City, Gender } from '../../types'

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
        <Link className="btn btn-gold" to="/admin/castings/new">
          Новая карточка
        </Link>
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
  const { state, setStatus, setCover } = useStore()
  const [tab, setTab] = useState<AppStatus>('review')
  const [openId, setOpenId] = useState<string | null>(null)
  const [copied, setCopied] = useState('')
  const casting = state.castings.find((item) => item.id === id)
  if (!casting) return <p className="empty">Кастинг не найден.</p>

  const items = state.applications.filter((item) => item.castingId === casting.id && item.status === tab)
  const opened = state.applications.find((item) => item.id === openId)
  const person = state.children.find((item) => item.id === opened?.childId)
  const parent = state.parents.find((item) => item.id === person?.parentId)
  const gallery = state.media.filter((item) => item.childId === person?.id && item.kind === 'photo')
  const cards = person ? visitCards(state.media, person.id) : []

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
        {items.map((app) => {
          const model = state.children.find((item) => item.id === app.childId)
          const cover = state.media.find((item) => item.id === app.coverPhotoId)
          if (!model) return null
          return (
            <article key={app.id} className="app-card">
              <button type="button" onClick={() => setOpenId(app.id)} style={{ padding: 0, border: 0, background: 'transparent' }}>
                <Portrait src={cover?.src} name={model.firstName} />
              </button>
              <div className="stack">
                <button type="button" onClick={() => setOpenId(app.id)} style={{ padding: 0, border: 0, background: 'transparent', textAlign: 'left' }}>
                  <strong>
                    {model.firstName} {model.lastName}
                  </strong>
                  <p className="muted">
                    {ageFrom(model.birthDate)} лет · {model.height} см · {model.city}
                  </p>
                </button>
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
            </article>
          )
        })}
        {!items.length && <p className="empty">В этой вкладке пусто.</p>}
      </div>
      {opened && person && (
        <Modal title={`${person.firstName} ${person.lastName}`} onClose={() => setOpenId(null)}>
          <p className="muted">
            {parent?.name} · {parent?.phone} · {person.city}
          </p>
          <div className="row">
            <StatusBadge status={opened.status} />
            <StaleBadges child={person} media={state.media} days={state.settings.staleDays} />
          </div>
          <p>
            {ageFrom(person.birthDate)} лет · {person.height} см · {genderWord(person.gender)} · глаза {person.eyeColor} · волосы {person.hairColor} · обувь {person.shoe}
          </p>
          <p>{person.experience}</p>
          <p className="muted">{person.about}</p>
          <p className="kicker">Видеовизитки</p>
          {cards.map((card) => (
            <VisitPlayer key={card.id} slides={[asset(card.src)]} videoSrc={card.video ? asset(card.src) : null} />
          ))}
          {!cards.length && <p className="muted">Визиток нет.</p>}
          <p className="kicker">Заменить главное фото отклика</p>
          <div className="shots">
            {gallery.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className={opened.coverPhotoId === photo.id ? 'shot on' : 'shot'}
                onClick={() => setCover(opened.id, photo.id)}
              >
                <img src={asset(photo.src)} alt={photo.title} />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}

export function ModelsPage() {
  const { state, verifyChild, blockChild, updateChild } = useStore()
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
  const [selected, setSelected] = useState<string | null>(null)

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
          <label className="field">
            <span>Рост</span>
            <input type="number" defaultValue={current.height} onBlur={(event) => updateChild(current.id, { height: Number(event.target.value) })} />
          </label>
          <label className="field">
            <span>Город</span>
            <select defaultValue={current.city} onChange={(event) => updateChild(current.id, { city: event.target.value as City })}>
              {CITIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Опыт</span>
            <input defaultValue={current.experience} onBlur={(event) => updateChild(current.id, { experience: event.target.value })} />
          </label>
          <div className="row">
            <button className="btn btn-ok btn-sm" type="button" onClick={() => verifyChild(current.id, !current.verified)}>
              {current.verified ? 'Снять верификацию' : 'Верифицировать'}
            </button>
            <button className="btn btn-bad btn-sm" type="button" onClick={() => blockChild(current.id, !current.blocked)}>
              {current.blocked ? 'Разблокировать' : 'Заблокировать'}
            </button>
          </div>
        </Modal>
      )}
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
