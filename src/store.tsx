import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { createSeed } from './data/seed'
import { digits, formatDate, postText, uid } from './lib/format'
import type {
  AppStatus,
  Application,
  BotMessage,
  Casting,
  Child,
  MediaItem,
  Settings,
  State,
} from './types'

const KEY = 'annmodels-demo-v1'

type Action =
  | { type: 'replace'; state: State }
  | { type: 'login'; parentId: string }
  | { type: 'logout' }
  | { type: 'adminIn' }
  | { type: 'adminOut' }
  | { type: 'selectChild'; childId: string }
  | { type: 'seeInbox' }
  | { type: 'updateChild'; id: string; patch: Partial<Child> }
  | { type: 'addChild'; child: Child }
  | { type: 'addMedia'; media: MediaItem; asMain?: boolean; asCard?: boolean }
  | { type: 'touchMedia'; id: string }
  | { type: 'addCasting'; casting: Casting }
  | { type: 'updateCasting'; id: string; patch: Partial<Casting> }
  | { type: 'publish'; id: string }
  | { type: 'addApp'; app: Application }
  | { type: 'setStatus'; id: string; status: AppStatus }
  | { type: 'setCover'; id: string; mediaId: string }
  | { type: 'verify'; id: string; verified: boolean }
  | { type: 'block'; id: string; blocked: boolean }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'message'; message: BotMessage }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'replace':
      return action.state
    case 'login': {
      const first = state.children.find((item) => item.parentId === action.parentId)
      return {
        ...state,
        session: { ...state.session, parentId: action.parentId, childId: first?.id ?? null, inboxSeenAt: null },
      }
    }
    case 'logout':
      return { ...state, session: { ...state.session, parentId: null, childId: null, inboxSeenAt: null } }
    case 'adminIn':
      return { ...state, session: { ...state.session, admin: true } }
    case 'adminOut':
      return { ...state, session: { ...state.session, admin: false } }
    case 'selectChild':
      return { ...state, session: { ...state.session, childId: action.childId } }
    case 'seeInbox':
      return { ...state, session: { ...state.session, inboxSeenAt: new Date().toISOString() } }
    case 'updateChild':
      return {
        ...state,
        children: state.children.map((item) => {
          if (item.id !== action.id) return item
          const next = { ...item, ...action.patch }
          if (action.patch.height != null && action.patch.height !== item.height && action.patch.heightUpdatedAt == null) {
            next.heightUpdatedAt = new Date().toISOString()
          }
          return next
        }),
      }
    case 'addChild':
      return {
        ...state,
        children: [...state.children, action.child],
        session: { ...state.session, childId: action.child.id },
      }
    case 'addMedia':
      return {
        ...state,
        media: [...state.media, action.media],
        children: state.children.map((item) => {
          if (item.id !== action.media.childId) return item
          return {
            ...item,
            mainPhotoId: action.asMain || !item.mainPhotoId ? action.media.id : item.mainPhotoId,
            videoCardId: action.asCard ? action.media.id : item.videoCardId,
          }
        }),
      }
    case 'touchMedia':
      return {
        ...state,
        media: state.media.map((item) =>
          item.id === action.id ? { ...item, updatedAt: new Date().toISOString() } : item,
        ),
      }
    case 'addCasting': {
      const post = action.casting.published
        ? [
            {
              id: uid('post'),
              castingId: action.casting.id,
              text: postText(action.casting),
              at: new Date().toISOString(),
            },
            ...state.posts,
          ]
        : state.posts
      return { ...state, castings: [action.casting, ...state.castings], posts: post }
    }
    case 'updateCasting':
      return {
        ...state,
        castings: state.castings.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item)),
      }
    case 'publish': {
      const castings = state.castings.map((item) => (item.id === action.id ? { ...item, published: true } : item))
      const casting = castings.find((item) => item.id === action.id)
      if (!casting || state.posts.some((item) => item.castingId === action.id)) return { ...state, castings }
      return {
        ...state,
        castings,
        posts: [
          { id: uid('post'), castingId: casting.id, text: postText(casting), at: new Date().toISOString() },
          ...state.posts,
        ],
      }
    }
    case 'addApp':
      return { ...state, applications: [action.app, ...state.applications] }
    case 'setStatus': {
      const current = state.applications.find((item) => item.id === action.id)
      if (!current) return state
      const applications = state.applications.map((item) =>
        item.id === action.id ? { ...item, status: action.status, updatedAt: new Date().toISOString() } : item,
      )
      const person = state.children.find((item) => item.id === current.childId)
      const casting = state.castings.find((item) => item.id === current.castingId)
      if (!person || !casting) return { ...state, applications }
      const text =
        action.status === 'accepted'
          ? `${person.firstName}: заявка на «${casting.title}» одобрена. Статус: Приглашен.`
          : action.status === 'rejected'
            ? `${person.firstName}: по заявке «${casting.title}» отказ.`
            : `${person.firstName}: заявка «${casting.title}» снова на рассмотрении.`
      return {
        ...state,
        applications,
        messages: [
          { id: uid('msg'), parentId: person.parentId, text, at: new Date().toISOString(), kind: 'status' },
          ...state.messages,
        ],
      }
    }
    case 'setCover':
      return {
        ...state,
        applications: state.applications.map((item) =>
          item.id === action.id ? { ...item, coverPhotoId: action.mediaId, updatedAt: new Date().toISOString() } : item,
        ),
      }
    case 'verify':
      return {
        ...state,
        children: state.children.map((item) => (item.id === action.id ? { ...item, verified: action.verified } : item)),
      }
    case 'block':
      return {
        ...state,
        children: state.children.map((item) => (item.id === action.id ? { ...item, blocked: action.blocked } : item)),
      }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'message':
      return { ...state, messages: [action.message, ...state.messages] }
    default:
      return state
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return createSeed()
    const parsed = JSON.parse(raw) as State
    if (parsed.version === 1 && Array.isArray(parsed.parents) && Array.isArray(parsed.castings)) {
      parsed.session = {
        parentId: parsed.session?.parentId ?? null,
        childId: parsed.session?.childId ?? null,
        inboxSeenAt: parsed.session?.inboxSeenAt ?? null,
        admin: Boolean(parsed.session?.admin),
      }
      return parsed
    }
  } catch {
    /* Повреждённое хранилище заменяем демо-данными. */
  }
  return createSeed()
}

interface StoreValue {
  state: State
  parent: State['parents'][number] | null
  myChildren: Child[]
  child: Child | null
  unread: number
  login: (phone: string, code: string) => string | null
  logout: () => void
  adminLogin: (loginName: string, password: string) => string | null
  adminLogout: () => void
  selectChild: (id: string) => void
  seeInbox: () => void
  reset: () => void
  updateChild: (id: string, patch: Partial<Child>) => void
  confirmHeight: (id: string) => void
  addChild: () => void
  addMedia: (media: Omit<MediaItem, 'id' | 'updatedAt'>, options?: { asMain?: boolean; asCard?: boolean }) => void
  touchMedia: (id: string) => void
  createCasting: (draft: Omit<Casting, 'id' | 'createdAt'>) => string
  updateCasting: (id: string, patch: Partial<Casting>) => void
  publishCasting: (id: string) => void
  apply: (castingId: string, childId: string, photoIds: string[]) => string | null
  setStatus: (id: string, status: AppStatus) => void
  setCover: (id: string, mediaId: string) => void
  verifyChild: (id: string, verified: boolean) => void
  blockChild: (id: string, blocked: boolean) => void
  setSettings: (patch: Partial<Settings>) => void
  pushReminder: (eventId: string, hours: 24 | 2) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  const parent = state.parents.find((item) => item.id === state.session.parentId) ?? null
  const myChildren = state.children.filter((item) => item.parentId === parent?.id)
  const child = myChildren.find((item) => item.id === state.session.childId) ?? myChildren[0] ?? null
  const unread = state.messages.filter(
    (item) => item.parentId === parent?.id && (!state.session.inboxSeenAt || item.at > state.session.inboxSeenAt),
  ).length

  const value: StoreValue = {
    state,
    parent,
    myChildren,
    child,
    unread,
    login(phone, code) {
      const found = state.parents.find((item) => item.phone === digits(phone))
      if (!found) return 'Заявка с этим номером не найдена. Вход открывается после заявки на сайте агентства.'
      if (code.trim() !== '1234') return 'Неверный код. В демо-режиме SMS-код 1234.'
      dispatch({ type: 'login', parentId: found.id })
      return null
    },
    logout() {
      dispatch({ type: 'logout' })
    },
    adminLogin(loginName, password) {
      const name = loginName.trim().toLowerCase()
      if (name === 'admin' && password === 'annmodels') {
        dispatch({ type: 'adminIn' })
        return null
      }
      return 'Неверный логин или пароль.'
    },
    adminLogout() {
      dispatch({ type: 'adminOut' })
    },
    selectChild(id) {
      dispatch({ type: 'selectChild', childId: id })
    },
    seeInbox() {
      dispatch({ type: 'seeInbox' })
    },
    reset() {
      sessionStorage.clear()
      dispatch({ type: 'replace', state: createSeed() })
    },
    updateChild(id, patch) {
      dispatch({ type: 'updateChild', id, patch })
    },
    confirmHeight(id) {
      dispatch({ type: 'updateChild', id, patch: { heightUpdatedAt: new Date().toISOString() } })
    },
    addChild() {
      if (!state.session.parentId) return
      const owner = state.parents.find((item) => item.id === state.session.parentId)
      const lastName = owner?.name.split(' ')[1] || 'анкета'
      dispatch({
        type: 'addChild',
        child: {
          id: uid('ch'),
          parentId: state.session.parentId,
          firstName: 'Новая',
          lastName,
          gender: 'female',
          birthDate: '2018-01-01',
          height: 120,
          city: 'Минск',
          eyeColor: 'карие',
          hairColor: 'русые',
          experience: 'Пока без опыта',
          shoe: 30,
          about: '',
          verified: false,
          blocked: false,
          heightUpdatedAt: new Date().toISOString(),
          mainPhotoId: '',
          videoCardId: null,
        },
      })
    },
    addMedia(media, options) {
      dispatch({
        type: 'addMedia',
        media: { ...media, id: uid('media'), updatedAt: new Date().toISOString() },
        asMain: options?.asMain,
        asCard: options?.asCard,
      })
    },
    touchMedia(id) {
      dispatch({ type: 'touchMedia', id })
    },
    createCasting(draft) {
      const casting: Casting = { ...draft, id: uid('cast'), createdAt: new Date().toISOString() }
      dispatch({ type: 'addCasting', casting })
      return casting.id
    },
    updateCasting(id, patch) {
      dispatch({ type: 'updateCasting', id, patch })
    },
    publishCasting(id) {
      dispatch({ type: 'publish', id })
    },
    apply(castingId, childId, photoIds) {
      const person = state.children.find((item) => item.id === childId)
      if (!person) return 'Анкета не найдена'
      if (person.blocked) return 'Профиль заблокирован. Отклик недоступен.'
      if (!photoIds.length) return 'Сначала добавьте фото в портфолио.'
      if (state.applications.some((item) => item.castingId === castingId && item.childId === childId)) {
        return 'Отклик на этот кастинг уже отправлен.'
      }
      dispatch({
        type: 'addApp',
        app: {
          id: uid('app'),
          castingId,
          childId,
          status: 'review',
          photoIds,
          coverPhotoId: photoIds[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
      return null
    },
    setStatus(id, status) {
      dispatch({ type: 'setStatus', id, status })
    },
    setCover(id, mediaId) {
      dispatch({ type: 'setCover', id, mediaId })
    },
    verifyChild(id, verified) {
      dispatch({ type: 'verify', id, verified })
    },
    blockChild(id, blocked) {
      dispatch({ type: 'block', id, blocked })
    },
    setSettings(patch) {
      dispatch({ type: 'settings', patch })
    },
    pushReminder(eventId, hours) {
      const event = state.events.find((item) => item.id === eventId)
      const person = state.children.find((item) => item.id === event?.childId)
      if (!event || !person) return
      dispatch({
        type: 'message',
        message: {
          id: uid('msg'),
          parentId: person.parentId,
          kind: 'reminder',
          at: new Date().toISOString(),
          text: `Напоминание за ${hours === 24 ? '24 часа' : '2 часа'}: ${event.title}, ${formatDate(event.date)} в ${event.time}. ${event.location}.`,
        },
      })
    },
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('StoreProvider missing')
  return value
}
