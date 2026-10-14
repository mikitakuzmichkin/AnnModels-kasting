import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Modal, StatusBadge, VisitPlayer } from '../../components/ui'
import { fileToDataUrl, readAsDataUrl } from '../../lib/files'
import { ageFrom, asset, fitReasons, formatDate, genderWord, isStale, localDay } from '../../lib/format'
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

function reminderLines(children: Child[], media: ReturnType<typeof useStore>['state']['media'], days: number) {
  const lines: { childId: string; text: string; to: string }[] = []
  for (const person of children) {
    if (person.blocked) continue
    const photo = media.find((item) => item.id === person.mainPhotoId)
    const card = person.videoCardId ? media.find((item) => item.id === person.videoCardId) : undefined
    if (!photo) lines.push({ childId: person.id, text: `${person.firstName}: добавьте фотографии`, to: '/app/media' })
    else if (isStale(photo.updatedAt, days)) lines.push({ childId: person.id, text: `${person.firstName}: обновите фотографии`, to: '/app/media' })
    if (!card) lines.push({ childId: person.id, text: `${person.firstName}: добавьте видеовизитку`, to: '/app/media' })
    else if (isStale(card.updatedAt, days)) lines.push({ childId: person.id, text: `${person.firstName}: обновите видеовизитку`, to: '/app/media' })
    if (isStale(person.heightUpdatedAt, days)) lines.push({ childId: person.id, text: `${person.firstName}: уточните рост`, to: '/app/profile' })
  }
  return lines
}

export function ParentLayout() {
  const { parent, myChildren, child, unread, selectChild, state } = useStore()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<{ childId: string; text: string; to: string }[]>([])
  useEffect(() => {
    if (!parent) return
    const force = params.get('popup') === '1'
    const key = `ann-popup-${parent.id}`
    if (!force && sessionStorage.getItem(key)) return
    const next = reminderLines(myChildren, state.media, state.settings.staleDays)
    if (!next.length) return
    const timer = window.setTimeout(() => {
      setLines(next)
      setOpen(true)
      sessionStorage.setItem(key, '1')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [parent, myChildren, params, state.media, state.settings.staleDays])

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
        <div>
          <div className="kicker">ANNmodels</div>
          <strong>{child ? child.firstName : parent?.name}</strong>
        </div>
        <NavLink to="/app/inbox" className={({ isActive }) => (isActive ? 'bell on' : 'bell')}>
          Бот
          {unread > 0 && <span className="dot">{unread}</span>}
        </NavLink>
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
      <nav className="pnav">
        {items.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/app'} className={({ isActive }) => (isActive ? 'nav-item on' : 'nav-item')}>
            {label}
          </NavLink>
        ))}
      </nav>
      {open && (
        <Modal title="Пора обновить анкету" onClose={() => setOpen(false)}>
          <p className="muted">Если фото, визитка или рост давно не менялись, заказчик видит устаревшую карточку.</p>
          {lines.map((line) => (
            <button
              key={line.text}
              className="btn btn-ghost btn-block"
              type="button"
              onClick={() => {
                selectChild(line.childId)
                setOpen(false)
                navigate(line.to)
              }}
            >
              {line.text}
            </button>
          ))}
        </Modal>
      )}
    </div>
  )
}

export function Feed() {
  const { state, child } = useStore()
  const [gender, setGender] = useState<'any' | Gender>('any')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [onlyFit, setOnlyFit] = useState(false)

  const castings = state.castings
    .filter((item) => item.published)
    .filter((item) => gender === 'any' || item.gender === 'any' || item.gender === gender)
    .filter((item) => age === '' || (Number(age) >= item.ageMin && Number(age) <= item.ageMax))
    .filter((item) => height === '' || (Number(height) >= item.heightMin && Number(height) <= item.heightMax))
    .filter((item) => !onlyFit || !child || fitReasons(item, child).length === 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <div>
        <p className="kicker">Лента</p>
        <h1 className="serif" style={{ fontSize: 40, lineHeight: 0.95 }}>
          Активные кастинги
        </h1>
      </div>
      <div className="filters">
        <label>
          <span>Пол</span>
          <select value={gender} onChange={(event) => setGender(event.target.value as 'any' | Gender)}>
            <option value="any">Любой</option>
            <option value="female">Девочки</option>
            <option value="male">Мальчики</option>
          </select>
        </label>
        <div className="grid-2">
          <label>
            <span>Возраст</span>
            <input value={age} onChange={(event) => setAge(event.target.value)} inputMode="numeric" placeholder="7" />
          </label>
          <label>
            <span>Рост, см</span>
            <input value={height} onChange={(event) => setHeight(event.target.value)} inputMode="numeric" placeholder="122" />
          </label>
        </div>
        <label className="row">
          <input type="checkbox" checked={onlyFit} onChange={(event) => setOnlyFit(event.target.checked)} />
          <span>Только подходящие {child ? child.firstName : 'анкете'}</span>
        </label>
      </div>
      {castings.map((item) => {
        const reasons = child ? fitReasons(item, child) : []
        return (
          <Link key={item.id} to={`/app/castings/${item.id}`} className="casting" style={{ textDecoration: 'none' }}>
            <p className="kicker">{item.brand}</p>
            <h2 className="serif">{item.title}</h2>
            <p className="meta">
              {formatDate(item.date)} · {item.time}
              <br />
              {item.city} · {genderWord(item.gender, true)} · {item.ageMin}–{item.ageMax} лет · {item.heightMin}–{item.heightMax} см
            </p>
            {child && <span className={reasons.length ? 'badge warn' : 'badge ok'}>{reasons.length ? `Не подходит: ${reasons.join(', ')}` : `Подходит ${child.firstName}`}</span>}
          </Link>
        )
      })}
      {!castings.length && <p className="empty">По этим фильтрам кастингов нет.</p>}
    </>
  )
}

export function CastingPage() {
  const { id } = useParams()
  const { state, child, apply } = useStore()
  const casting = state.castings.find((item) => item.id === id)
  const photos = state.media.filter((item) => item.childId === child?.id && item.kind === 'photo')
  const [alts, setAlts] = useState<string[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const existing = state.applications.find((item) => item.castingId === id && item.childId === child?.id)

  if (!casting || !child) return <p className="empty">Кастинг не найден.</p>
  const reasons = fitReasons(casting, child)

  function toggle(photoId: string) {
    setAlts((current) => (current.includes(photoId) ? current.filter((item) => item !== photoId) : [...current, photoId]))
  }

  function send() {
    const ids = [child!.mainPhotoId, ...alts.filter((item) => item !== child!.mainPhotoId)]
    const result = apply(casting!.id, child!.id, ids.filter(Boolean))
    if (result) setError(result)
    else setDone(true)
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
        {reasons.length ? `${child.firstName} не подходит: ${reasons.join(', ')}` : `Подходит анкете ${child.firstName}`}
      </span>
      {existing ? (
        <div className="panel stack">
          <span>{done ? 'Заявка ушла на рассмотрение. Базовое портфолио приложено.' : 'Отклик уже отправлен'}</span>
          <StatusBadge status={existing.status} />
          <Link to="/app/applications">Мои отклики</Link>
        </div>
      ) : (
        <div className="stack">
          <p className="muted">Главное фото прикрепится само. Ниже можно добавить альтернативные кадры.</p>
          <div className="shots">
            {photos.map((photo) => {
              const main = photo.id === child.mainPhotoId
              const on = main || alts.includes(photo.id)
              return (
                <button key={photo.id} type="button" className={on ? 'shot on' : 'shot'} onClick={() => !main && toggle(photo.id)}>
                  <img src={asset(photo.src)} alt={photo.title} />
                </button>
              )
            })}
          </div>
          {error && <p className="badge bad">{error}</p>}
          <button className="btn btn-gold btn-block" type="button" disabled={child.blocked || !photos.length} onClick={send}>
            {child.blocked ? 'Профиль заблокирован' : 'Откликнуться'}
          </button>
        </div>
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
  const { child, updateChild, confirmHeight, addChild, state } = useStore()
  const [form, setForm] = useState<Child | null>(child)
  const [picked, setPicked] = useState<string[]>([])
  const [zipError, setZipError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(child)
    const photos = state.media.filter((item) => item.childId === child?.id && item.kind === 'photo').map((item) => item.id)
    setPicked(photos)
  }, [child, state.media])

  if (!form || !child) {
    return (
      <button className="btn btn-gold" type="button" onClick={addChild}>
        Создать анкету
      </button>
    )
  }

  const photos = state.media.filter((item) => item.childId === child.id && item.kind === 'photo')

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

  async function download(all: boolean) {
    setZipError('')
    setSaving(true)
    try {
      const source = photos.filter((item) => all || picked.includes(item.id))
      await downloadZip(
        source.map((item) => ({ name: `${child!.firstName}-${item.title}.jpg`, src: item.src })),
        `${child!.firstName}-portfolio.zip`,
      )
    } catch {
      setZipError('Не удалось собрать архив.')
    } finally {
      setSaving(false)
    }
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
      <div className="stack">
        <strong>Скачать портфолио</strong>
        {photos.map((photo) => (
          <label key={photo.id} className="row">
            <input
              type="checkbox"
              checked={picked.includes(photo.id)}
              onChange={() => setPicked((current) => (current.includes(photo.id) ? current.filter((item) => item !== photo.id) : [...current, photo.id]))}
            />
            <span>{photo.title}</span>
          </label>
        ))}
        <div className="row">
          <button className="btn btn-ghost btn-sm" type="button" disabled={saving || !picked.length} onClick={() => download(false)}>
            Скачать выбранное
          </button>
          <button className="btn btn-ghost btn-sm" type="button" disabled={saving || !photos.length} onClick={() => download(true)}>
            Скачать всё
          </button>
        </div>
        {zipError && <p className="badge bad">{zipError}</p>}
      </div>
    </form>
  )
}

export function MediaPage() {
  const { child, state, addMedia, touchMedia, updateChild } = useStore()
  const [note, setNote] = useState('')
  if (!child) return <p className="empty">Сначала создайте анкету.</p>

  const photos = state.media.filter((item) => item.childId === child.id && item.kind === 'photo')
  const card = state.media.find((item) => item.id === child.videoCardId)
  const slides = photos.map((item) => asset(item.src))

  async function onPhoto(file: File) {
    const src = await fileToDataUrl(file)
    addMedia({ childId: child!.id, kind: 'photo', src, title: 'Новое фото' }, { asMain: !child!.mainPhotoId })
    setNote('Фото добавлено в галерею.')
  }

  async function onCard(file: File) {
    if (file.type.startsWith('video')) {
      const src = file.size > 1_200_000 ? URL.createObjectURL(file) : await readAsDataUrl(file)
      addMedia({ childId: child!.id, kind: 'card', src, title: 'Видеовизитка', video: true }, { asCard: true })
      setNote(file.size > 1_200_000 ? 'Видео видно до обновления страницы: в прототипе большие файлы не пишутся в память браузера.' : 'Видеовизитка обновлена.')
      return
    }
    const src = await fileToDataUrl(file)
    addMedia({ childId: child!.id, kind: 'card', src, title: 'Видеовизитка' }, { asCard: true })
    setNote('Визитка обновлена.')
  }

  return (
    <>
      <h1 className="serif" style={{ fontSize: 40 }}>
        Медиа
      </h1>
      <p className="muted">Галерея, отдельные видео и поле видеовизитки. Главное фото уходит в отклик.</p>
      <div className="shots">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className={photo.id === child.mainPhotoId ? 'shot on' : 'shot'}
            onClick={() => updateChild(child.id, { mainPhotoId: photo.id })}
          >
            <img src={asset(photo.src)} alt={photo.title} />
          </button>
        ))}
      </div>
      <label className="btn btn-ghost">
        Загрузить фото
        <input
          hidden
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void onPhoto(file)
          }}
        />
      </label>
      {photos[0] && (
        <button className="btn btn-ghost" type="button" onClick={() => touchMedia(child.mainPhotoId)}>
          Отметить фото обновлённым
        </button>
      )}
      <div className="stack">
        <p className="kicker">Видеовизитка</p>
        <VisitPlayer slides={card ? [asset(card.src), ...slides] : slides} videoSrc={card?.video ? asset(card.src) : null} />
        <label className="btn btn-gold">
          Заменить видеовизитку
          <input
            hidden
            type="file"
            accept="image/*,video/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void onCard(file)
            }}
          />
        </label>
        {card && (
          <button className="btn btn-ghost" type="button" onClick={() => touchMedia(card.id)}>
            Отметить визитку обновлённой
          </button>
        )}
        {note && <p className="note">{note}</p>}
      </div>
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
