export type Gender = 'female' | 'male'
export type City = 'Минск' | 'Гродно' | 'Брест'
export type AppStatus = 'review' | 'accepted' | 'rejected'

export interface Parent {
  id: string
  name: string
  phone: string
}

export interface Child {
  id: string
  parentId: string
  firstName: string
  lastName: string
  gender: Gender
  birthDate: string
  height: number
  city: City
  eyeColor: string
  hairColor: string
  experience: string
  shoe: number
  about: string
  verified: boolean
  blocked: boolean
  heightUpdatedAt: string
  mainPhotoId: string
  videoCardId: string | null
}

export interface MediaItem {
  id: string
  childId: string
  kind: 'photo' | 'card' | 'video'
  src: string
  title: string
  updatedAt: string
  video?: boolean
}

export interface Casting {
  id: string
  title: string
  brand: string
  description: string
  criteria: string
  date: string
  time: string
  location: string
  city: City
  gender: Gender | 'any'
  ageMin: number
  ageMax: number
  heightMin: number
  heightMax: number
  published: boolean
  createdAt: string
}

export interface Application {
  id: string
  castingId: string
  childId: string
  status: AppStatus
  photoIds: string[]
  coverPhotoId: string
  createdAt: string
  updatedAt: string
}

export interface CalEvent {
  id: string
  childId: string
  castingId?: string
  title: string
  date: string
  time: string
  location: string
}

export interface BotMessage {
  id: string
  parentId: string
  text: string
  at: string
  kind: 'status' | 'reminder' | 'info'
}

export interface ChannelPost {
  id: string
  castingId: string
  text: string
  at: string
}

export interface Settings {
  staleDays: 90 | 180
  botUsername: string
  appShortName: string
}

export interface Session {
  parentId: string | null
  childId: string | null
  inboxSeenAt: string | null
  admin: boolean
}

export interface State {
  version: number
  parents: Parent[]
  children: Child[]
  media: MediaItem[]
  castings: Casting[]
  applications: Application[]
  events: CalEvent[]
  messages: BotMessage[]
  posts: ChannelPost[]
  settings: Settings
  session: Session
}
