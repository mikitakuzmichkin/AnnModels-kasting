import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Modal, StatusBadge, VisitPlayer } from '../../components/ui'
import { fileToDataUrl, readAsDataUrl } from '../../lib/files'
import { ageFrom, asset, fitReasons, formatDate, genderWord, isStale, localDay, visitCards } from '../../lib/format'
import { downloadZip } from '../../lib/zip'
import { useStore } from '../../store'
import { isTelegram } from '../../telegram'
import type { Child, City, Gender } from '../../types'
import { CITIES, EYES, HAIR } from '../../lib/format'

export function PhoneFrame() {
  const inner = (
    <div className={isTelegram() ? 'tg-app' : 'phone-screen'}>
      <Outlet />
    </div>
  )
  if (isTelegram()) return inner
  return (
    <div className="phone-wrap">
      <div className="phone">{inner}</div>
    </div>
  )
}

export function RequireParent() {
  const { parent } = useStore()
  const location = useLocation()
  if (!parent) {
    return <Navigate to="/app/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return <Outlet />
}

export function LoginPage() {
  const { parent, login } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [phone, setPhone] = useState('+375 29 111-22-33')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  if (parent) return <Navigate to="/app" replace />

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = login(phone, code)
    if (result) {
      setError(result)
      return
    }
    const from = (location.state as { from?: string } | null)?.from
    navigate(from && from !== '/app/login' ? from : '/app', { replace: true })
  }

  return (
    <form className="playout" onSubmit={submit}>
      <div className="pbody" style={{ justifyContent: 'center' }}>
        <p className="kicker">ANNmodels</p>
        <h1 className="serif" style={{ fontSize: 48, lineHeight: 0.9 }}>
          Вход по заявке
        </h1>
        <p className="muted">Кабинет открывается, если номер уже есть в заявке агентства.</p>
        <label className="field">
          <span>Телефон</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" />
        </label>
        <label className="field">
          <span>Код из SMS</span>
          <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" placeholder="1234" />
        </label>
        {error && <p className="badge bad">{error}</p>}
        <button className="btn btn-gold btn-block" type="submit">
          Войти
        </button>
        <button
          className="btn btn-ghost btn-block"
          type="button"
          onClick={() => {
            setPhone('+375 29 111-22-33')
            setCode('1234')
            const result = login('+375 29 111-22-33', '1234')
            if (!result) navigate('/app', { replace: true })
          }}
        >
          Войти демо-аккаунтом
        </button>
        <p className="dim">Для показа кабинета: +375 29 111-22-33, код 1234.</p>
        <Link to="/" className="muted">
          На главную
        </Link>
      </div>
    </form>
  )
}

function staleLines(person: Child, media: ReturnType<typeof useStore>['state']['media'], days: number) {
  const lines: { text: string; to: string }[] = []
  const photo = media.find((item) => item.id === person.mainPhotoId)
  const cards = visitCards(media, person.id)
  if (photo && isStale(photo.updatedAt, days)) lines.push({ text: 'Фотографии', to: '/app/media' })
  if (cards.some((item) => isStale(item.updatedAt, days))) lines.push({ text: 'Видеовизитка', to: '/app/media' })
  if (isStale(person.heightUpdatedAt, days)) lines.push({ text: 'Рост', to: '/app/profile' })
  return lines
}

export function ParentLayout() {
  const { parent, myChildren, child, unread, selectChild } = useStore()

  const items = [
    ['/app', 'Кастинги'],
    ['/app/applications', 'Отклики'],
    ['/app/profile', 'Анкета'],
    ['/app/media', 'Медиа'],
    ['/app/calendar', 'Календарь'],
  ] as const

  return (
    <div className="playout">
      <header className="phead">
        <div className="phead-top">
          <div>
            <div className="kicker">ANNmodels</div>
            <strong>{child ? child.firstName : parent?.name}</strong>
          </div>
          <NavLink to="/app/inbox" className={({ isActive }) => (isActive ? 'bell on' : 'bell')}>
            Бот
            {unread > 0 && <span className="dot">{unread}</span>}
          </NavLink>
        </div>
        <nav className="pnav">
          {items.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => (isActive ? 'nav-item on' : 'nav-item')}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      {myChildren.length > 1 && (
        <div className="chips" style={{ padding: '0 16px 8px' }}>
          {myChildren.map((person) => (
            <button
              key={person.id}
              type="button"
              className={person.id === child?.id ? 'chip on' : 'chip'}
              onClick={() => selectChild(person.id)}
            >
              {person.firstName}
              {person.blocked ? ' · блок' : ''}
            </button>
          ))}
        </div>
      )}
      <div className="pbody">
        <Outlet />
      </div>
    </div>
  )
}

function fittingChildren(casting: Parameters<typeof fitReasons>[0], children: Child[]) {
  return children.filter((person) => !person.blocked && fitReasons(casting, person).length === 0)
}

export function Feed() {
  const { state, myChildren } = useStore()

  const castings = state.castings
    .filter((item) => item.published)
    .filter((item) => fittingChildren(item, myChildren).length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <div>
        <p className="kicker">Лента</p>
        <h1 className="serif" style={{ fontSize: 40, lineHeight: 0.95 }}>
          Активные кастинги
        </h1>
      </div>
      {castings.map((item) => {
        const names = fittingChildren(item, myChildren).map((person) => person.firstName)
        return (
          <Link key={item.id} to={`/app/castings/${item.id}`} className="casting" style={{ textDecoration: 'none' }}>
            <p className="kicker">{item.brand}</p>
            <h2 className="serif">{item.title}</h2>
            <p className="meta">
              {formatDate(item.date)} · {item.time}
              <br />
              {item.city} · {genderWord(item.gender, true)} · {item.ageMin}–{item.ageMax} лет · {item.heightMin}–{item.heightMax} см
            </p>
            <span className="badge ok">Подходит: {names.join(', ')}</span>
          </Link>
        )
      })}
      {!castings.length && <p className="empty">Сейчас нет кастингов, которые подходят вашим детям.</p>}
    </>
  )
}

export function CastingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, child, myChildren, apply, addMedia } = useStore()
  const casting = state.castings.find((item) => item.id === id)
  const photos = state.media.filter((item) => item.childId === child?.id && item.kind === 'photo')
  const latest = [...photos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const [picker, setPicker] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [stale, setStale] = useState<{ text: string; to: string }[] | null>(null)
  const existing = state.applications.find((item) => item.castingId === id && item.childId === child?.id)

  if (!casting || !child) return <p className="empty">Кастинг не найден.</p>
  const matched = fittingChildren(casting, myChildren)
  const reasons = fitReasons(casting, child)
  const canApply = reasons.length === 0 && !child.blocked

  function openPicker() {
    setPicked(latest.map((item) => item.id))
    setError('')
    setPicker(true)
  }

  function openApply() {
    if (!child) return
    const next = staleLines(child, state.media, state.settings.staleDays)
    if (next.length) {
      setStale(next)
      return
    }
    openPicker()
  }

  function toggle(photoId: string) {
    setPicked((current) => (current.includes(photoId) ? current.filter((item) => item !== photoId) : [...current, photoId]))
  }

  async function onPhoto(file: File) {
    setError('')
    try {
      const src = await fileToDataUrl(file)
      const mediaId = addMedia({ childId: child!.id, kind: 'photo', src, title: 'Новое фото' }, { asMain: !child!.mainPhotoId })
      setPicked((current) => (current.includes(mediaId) ? current : [mediaId, ...current]))
    } catch {
      setError('Не удалось добавить фото.')
    }
  }

  function send() {
    const ids = [
      ...(child!.mainPhotoId && picked.includes(child!.mainPhotoId) ? [child!.mainPhotoId] : []),
      ...picked.filter((item) => item !== child!.mainPhotoId),
    ]
    const result = apply(casting!.id, child!.id, ids)
    if (result) setError(result)
    else {
      setPicker(false)
      setDone(true)
    }
  }

  return (
    <>
      <Link to="/app" className="muted">
        ← Все кастинги
      </Link>
      <p className="kicker">{casting.brand}</p>
      <h1 className="serif" style={{ fontSize: 42, lineHeight: 0.95 }}>
        {casting.title}
      </h1>
      <p className="meta">
        {formatDate(casting.date)} · {casting.time}
        <br />
        {casting.city}, {casting.location}
      </p>
      <p>{casting.description}</p>
      <p className="muted">{casting.criteria}</p>
      <span className={reasons.length ? 'badge warn' : 'badge ok'}>
        {reasons.length
          ? `${child.firstName} не подходит: ${reasons.join(', ')}${matched.length ? `. Подходит: ${matched.map((person) => person.firstName).join(', ')}` : ''}`
          : `Подходит анкете ${child.firstName}`}
      </span>
      {!matched.length ? (
        <p className="empty">Этот кастинг не подходит вашим детям.</p>
      ) : existing ? (
        <div className="panel stack">
          <span>{done ? 'Заявка ушла на рассмотрение. Выбранные фото приложены.' : 'Отклик уже отправлен'}</span>
          <StatusBadge status={existing.status} />
          <Link to="/app/applications">Мои отклики</Link>
        </div>
      ) : (
        <button className="btn btn-gold btn-block" type="button" disabled={!canApply} onClick={openApply}>
          {canApply ? 'Откликнуться' : 'Выберите подходящего ребёнка'}
        </button>
      )}
      {picker && (
        <Modal title="Фото для отклика" onClose={() => setPicker(false)}>
          <p className="muted">
            {latest.length
              ? 'Отметьте, какие фото приложить, или добавьте новые.'
              : 'В галерее пока нет фото. Добавьте новые, чтобы откликнуться.'}
          </p>
          {latest.length > 0 && (
            <div className="shots">
              {latest.map((photo) => (
                <button key={photo.id} type="button" className={picked.includes(photo.id) ? 'shot on' : 'shot'} onClick={() => toggle(photo.id)}>
                  <img src={asset(photo.src)} alt={photo.title} />
                </button>
              ))}
            </div>
          )}
          <label className="btn btn-ghost btn-block">
            Добавить новое фото
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void onPhoto(file)
              }}
            />
          </label>
          {error && <p className="badge bad">{error}</p>}
          <button className="btn btn-gold btn-block" type="button" disabled={!picked.length} onClick={send}>
            {picked.length ? `Отправить · ${picked.length}` : 'Выберите фото'}
          </button>
        </Modal>
      )}
      {stale && (
        <Modal title="Пора обновить анкету" onClose={() => setStale(null)}>
          <p className="muted">У {child.firstName} просрочены параметры. Заказчик увидит старые данные.</p>
          {stale.map((line) => (
            <button key={line.text} className="btn btn-ghost btn-block" type="button" onClick={() => navigate(line.to)}>
              {line.text}
            </button>
          ))}
          <button
            className="btn btn-gold btn-block"
            type="button"
            onClick={() => {
              setStale(null)
              openPicker()
            }}
          >
            Продолжить отклик
          </button>
        </Modal>
      )}
    </>
  )
}

export function AppsPage() {
  const { state, myChildren } = useStore()
  const ids = new Set(myChildren.map((item) => item.id))
  const items = state.applications.filter((item) => ids.has(item.childId))

  return (
    <>
      <h1 className="serif" style={{ fontSize: 40 }}>
        Мои отклики
      </h1>
      {items.map((item) => {
        const casting = state.castings.find((entry) => entry.id === item.castingId)
        const person = myChildren.find((entry) => entry.id === item.childId)
        return (
          <Link key={item.id} to={`/app/castings/${item.castingId}`} className="panel stack" style={{ textDecoration: 'none' }}>
            <div className="spread">
              <strong>
                {person?.firstName} · {casting?.title}
              </strong>
              <StatusBadge status={item.status} />
            </div>
            <span className="muted">
              {casting?.brand} · {item.createdAt.slice(0, 10)}
            </span>
          </Link>
        )
      })}
      {!items.length && <p className="empty">Откликов пока нет.</p>}
    </>
  )
}

export function ProfilePage() {
  const { child, updateChild, confirmHeight, addChild } = useStore()
  const [form, setForm] = useState<Child | null>(child)

  useEffect(() => {
    setForm(child)
  }, [child])

  if (!form || !child) {
    return (
      <button className="btn btn-gold" type="button" onClick={addChild}>
        Создать анкету
      </button>
    )
  }

  function save(event: FormEvent) {
    event.preventDefault()
    updateChild(child!.id, {
      firstName: form!.firstName.trim(),
      lastName: form!.lastName.trim(),
      gender: form!.gender,
      birthDate: form!.birthDate,
      height: Number(form!.height),
      city: form!.city,
      eyeColor: form!.eyeColor,
      hairColor: form!.hairColor,
      experience: form!.experience,
      shoe: Number(form!.shoe),
      about: form!.about,
    })
  }

  return (
    <form className="stack" onSubmit={save}>
      <div className="spread">
        <h1 className="serif" style={{ fontSize: 40 }}>
          Анкета
        </h1>
        <button className="btn btn-ghost btn-sm" type="button" onClick={addChild}>
          Ещё ребёнок
        </button>
      </div>
      {!child.verified && <span className="badge warn">Анкета на проверке</span>}
      {child.blocked && <span className="badge bad">Профиль заблокирован</span>}
      <div className="grid-2">
        <label className="field">
          <span>Имя</span>
          <input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
        </label>
        <label className="field">
          <span>Фамилия</span>
          <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
        </label>
      </div>
      <label className="field">
        <span>Пол</span>
        <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Gender })}>
          <option value="female">Девочка</option>
          <option value="male">Мальчик</option>
        </select>
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Дата рождения</span>
          <input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
        </label>
        <label className="field">
          <span>Рост, см · {ageFrom(form.birthDate)} лет</span>
          <input type="number" value={form.height} onChange={(event) => setForm({ ...form, height: Number(event.target.value) })} />
        </label>
      </div>
      <label className="field">
        <span>Город</span>
        <select value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value as City })}>
          {CITIES.map((city) => (
            <option key={city}>{city}</option>
          ))}
        </select>
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Глаза</span>
          <select value={form.eyeColor} onChange={(event) => setForm({ ...form, eyeColor: event.target.value })}>
            {EYES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Волосы</span>
          <select value={form.hairColor} onChange={(event) => setForm({ ...form, hairColor: event.target.value })}>
            {HAIR.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Обувь</span>
        <input type="number" value={form.shoe} onChange={(event) => setForm({ ...form, shoe: Number(event.target.value) })} />
      </label>
      <label className="field">
        <span>Опыт</span>
        <input value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} />
      </label>
      <label className="field">
        <span>О ребёнке</span>
        <textarea value={form.about} onChange={(event) => setForm({ ...form, about: event.target.value })} />
      </label>
      <button className="btn btn-gold" type="submit">
        Сохранить анкету
      </button>
      <button className="btn btn-ghost" type="button" onClick={() => confirmHeight(child.id)}>
        Рост подтверждаю, плашку снять
      </button>
    </form>
  )
}

export function MediaPage() {
  const { child, state, addMedia, touchMedia, updateChild } = useStore()
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [zipError, setZipError] = useState('')
  const [saving, setSaving] = useState(false)
  const [watchId, setWatchId] = useState<string | null>(null)

  useEffect(() => {
    setPicked([])
    setWatchId(null)
  }, [child?.id])

  if (!child) return <p className="empty">Сначала создайте анкету.</p>

  const photos = state.media.filter((item) => item.childId === child.id && item.kind === 'photo')
  const cards = visitCards(state.media, child.id)
  const library = [...photos, ...cards]
  const watch = library.find((item) => item.id === watchId)
  const allPicked = library.length > 0 && library.every((item) => picked.includes(item.id))

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function onTile(id: string, kind: 'photo' | 'card') {
    if (picked.length) {
      toggle(id)
      return
    }
    if (kind === 'photo') updateChild(child!.id, { mainPhotoId: id })
    else setWatchId(id)
  }

  async function onPhoto(file: File) {
    const src = await fileToDataUrl(file)
    addMedia({ childId: child!.id, kind: 'photo', src, title: 'Новое фото' }, { asMain: !child!.mainPhotoId })
    setNote('Фото добавлено в медиатеку.')
  }

  async function onCard(file: File) {
    if (file.type.startsWith('video')) {
      const src = file.size > 1_200_000 ? URL.createObjectURL(file) : await readAsDataUrl(file)
      addMedia({ childId: child!.id, kind: 'card', src, title: `Видеовизитка ${cards.length + 1}`, video: true }, { asCard: true })
      setNote(file.size > 1_200_000 ? 'Видео видно до обновления страницы: в прототипе большие файлы не пишутся в память браузера.' : 'Видео добавлено в медиатеку.')
      return
    }
    const src = await fileToDataUrl(file)
    addMedia({ childId: child!.id, kind: 'card', src, title: `Видеовизитка ${cards.length + 1}` }, { asCard: true })
    setNote('Визитка добавлена в медиатеку.')
  }

  async function download() {
    setZipError('')
    setSaving(true)
    try {
      const source = library.filter((item) => picked.includes(item.id))
      await downloadZip(
        source.map((item, index) => {
          const ext = item.video ? 'mp4' : 'jpg'
          const kind = item.video ? 'video' : item.kind === 'card' ? 'vizitka' : 'foto'
          return { name: `${child!.firstName}-${kind}-${index + 1}.${ext}`, src: item.src }
        }),
        `${child!.firstName}-portfolio.zip`,
      )
      setNote('Архив скачан.')
    } catch {
      setZipError('Не удалось собрать архив.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1 className="serif" style={{ fontSize: 40 }}>
        Медиа
      </h1>
      <p className="muted">Отметьте кружком фото и видео, затем скачайте архив. Пока ничего не выбрано, нажатие на фото делает его главным.</p>
      <div className="shots">
        {library.map((item) => {
          const on = picked.includes(item.id)
          return (
            <div key={item.id} className="file">
              <button
                type="button"
                className={item.id === child.mainPhotoId ? 'shot on' : 'shot'}
                onClick={() => onTile(item.id, item.kind === 'photo' ? 'photo' : 'card')}
              >
                <img src={asset(item.src)} alt={item.title} />
                {item.kind === 'card' && <span className="kind">{item.video ? 'видео' : 'визитка'}</span>}
              </button>
              <button type="button" className={on ? 'tick on' : 'tick'} aria-label={on ? 'Снять выбор' : 'Выбрать'} onClick={() => toggle(item.id)} />
            </div>
          )
        })}
      </div>
      {!library.length && <p className="empty">В медиатеке пока пусто.</p>}
      <div className="pick-bar">
        <span>{picked.length ? `Выбрано ${picked.length}` : 'Ничего не выбрано'}</span>
        <button className="btn btn-ghost btn-sm" type="button" disabled={!library.length} onClick={() => setPicked(allPicked ? [] : library.map((item) => item.id))}>
          {allPicked ? 'Снять' : 'Все'}
        </button>
        <button className="btn btn-gold btn-sm" type="button" disabled={saving || !picked.length} onClick={() => void download()}>
          {saving ? 'Архив…' : 'Скачать'}
        </button>
      </div>
      {zipError && <p className="badge bad">{zipError}</p>}
      <label className="btn btn-ghost btn-block">
        Загрузить фото
        <input
          hidden
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void onPhoto(file)
          }}
        />
      </label>
      <label className="btn btn-ghost btn-block">
        Добавить видео
        <input
          hidden
          type="file"
          accept="image/*,video/*"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void onCard(file)
          }}
        />
      </label>
      {picked.length > 0 && (
        <button className="btn btn-ghost btn-block" type="button" onClick={() => picked.forEach((id) => touchMedia(id))}>
          Отметить выбранное свежим
        </button>
      )}
      {note && <p className="note">{note}</p>}
      {watch && (
        <Modal title={watch.title} onClose={() => setWatchId(null)}>
          <VisitPlayer slides={[asset(watch.src)]} videoSrc={watch.video ? asset(watch.src) : null} />
        </Modal>
      )}
    </>
  )
}

export function CalendarPage() {
  const { myChildren, state, pushReminder } = useStore()
  const navigate = useNavigate()
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [picked, setPicked] = useState(localDay(today))
  const ids = new Set(myChildren.map((item) => item.id))
  const events = state.events.filter((item) => ids.has(item.childId))
  const marked = new Set(events.map((item) => item.date))

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const days: Array<number | null> = Array.from({ length: offset }, () => null)
    for (let day = 1; day <= count; day += 1) days.push(day)
    return days
  }, [cursor])

  const title = cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  const dayEvents = events.filter((item) => item.date === picked)

  return (
    <>
      <h1 className="serif" style={{ fontSize: 40 }}>
        Календарь
      </h1>
      <div className="monthbar">
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          ←
        </button>
        <strong>{title}</strong>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          →
        </button>
      </div>
      <div className="dow">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="days">
        {cells.map((day, index) => {
          if (!day) return <span key={`e-${index}`} />
          const key = localDay(new Date(cursor.getFullYear(), cursor.getMonth(), day))
          return (
            <button key={key} type="button" className={`day ${marked.has(key) ? 'has' : ''} ${picked === key ? 'pick' : ''}`} onClick={() => setPicked(key)}>
              {day}
            </button>
          )
        })}
      </div>
      {dayEvents.map((event) => {
        const person = myChildren.find((item) => item.id === event.childId)
        return (
          <div key={event.id} className="panel stack">
            <strong>
              {event.title} · {person?.firstName}
            </strong>
            <span className="muted">
              {event.time} · {event.location}
            </span>
            <div className="row">
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  pushReminder(event.id, 24)
                  navigate('/app/inbox')
                }}
              >
                Напомнить за 24 часа
              </button>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  pushReminder(event.id, 2)
                  navigate('/app/inbox')
                }}
              >
                За 2 часа
              </button>
            </div>
          </div>
        )
      })}
      {!dayEvents.length && <p className="empty">В этот день подтверждённых съёмок нет.</p>}
    </>
  )
}

export function InboxPage() {
  const { state, parent, seeInbox } = useStore()
  const seen = useRef(false)
  useEffect(() => {
    if (seen.current) return
    seen.current = true
    seeInbox()
  }, [seeInbox])
  const messages = state.messages.filter((item) => item.parentId === parent?.id)

  return (
    <>
      <h1 className="serif" style={{ fontSize: 40 }}>
        Сообщения бота
      </h1>
      <p className="muted">В рабочей версии это личные сообщения Telegram. Здесь видно, какой текст уйдёт родителю.</p>
      {messages.map((item) => (
        <article key={item.id} className="tg-post">
          {item.text}
          <div className="dim">{item.at.slice(0, 16).replace('T', ' ')}</div>
        </article>
      ))}
      {!messages.length && <p className="empty">Пока пусто. Сообщение появится, когда админ сменит статус или сработает напоминание.</p>}
    </>
  )
}
