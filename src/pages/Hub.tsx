import { Link } from 'react-router-dom'
import { phoneMask } from '../lib/format'
import { useStore } from '../store'
import { startParam } from '../telegram'

const CHECKS = [
  ['2.1 Вход по заявке', 'Номер из заявки и код SMS. Чужой номер не пускает.', '/app/login'],
  ['2.1 Анкета', 'Параметры, возраст, пол, рост, город, глаза, волосы, опыт.', '/app/profile'],
  ['2.1 Лента и фильтры', 'В ленте только кастинги, которые подходят детям этого родителя.', '/app'],
  ['2.1 Быстрый отклик', '«Откликнуться» открывает последние фото: выбрать или добавить новые.', '/app/castings/acoola_school'],
  ['2.1 Попапы', 'При отклике, если у этого ребёнка просрочены фото, визитка или рост.', '/app/castings/mf_lookbook'],
  ['2.1 Мои отклики', 'На рассмотрении, приглашен, отказ.', '/app/applications'],
  ['2.1 Медиа', 'В медиатеке отмечают фото и видео и скачивают архив.', '/app/media'],
  ['2.2 Конструктор', 'Описание, критерии, дата, время, локация.', '/admin/castings/new'],
  ['2.2 Три вкладки', 'Текущие, принятые, лист отказов.', '/admin/castings/waikiki_autumn'],
  ['2.2 Карточка и замена фото', 'Анкета, галерея, визитка, смена обложки отклика.', '/admin/castings/waikiki_autumn'],
  ['2.2 Плашки свежести', 'Старое фото и старая видеовизитка. Порог в настройках.', '/admin/settings'],
  ['2.2 Ссылка заказчику', 'Страница принятых с параметрами и визиткой.', '/c/waikiki_autumn'],
  ['2.3 Mini App', 'Кабинет на весь экран внутри Telegram.', '/app'],
  ['2.3 Пост в канал', 'Текст поста появляется после публикации кастинга.', '/admin/channel'],
  ['2.3 Deep link', 'startapp открывает конкретный кастинг.', '/app/castings/waikiki_autumn'],
  ['2.3 Статус в личку', 'После одобрения или отказа сообщение лежит у бота.', '/app/inbox'],
  ['2.3 Календарь', 'Подтверждённые съёмки.', '/app/calendar'],
  ['2.3 Напоминания', 'Кнопки за 24 часа и за 2 часа.', '/app/calendar'],
  ['2.4 Проверка анкет', 'Верификация, правка и блокировка.', '/admin/models'],
  ['2.4 Поиск', 'Рост, возраст, глаза, волосы, опыт, город.', '/admin/models'],
  ['2.4 Аналитика', 'Активные модели, топ кастингов, отклики по дням.', '/admin/analytics'],
  ['2.5 Архив', 'Скачать всё портфолио или только выбранные кадры.', '/c/waikiki_autumn'],
]

export function Hub() {
  const { reset, state } = useStore()
  const parent = state.parents[0]
  const param = startParam()

  return (
    <main className="page hub">
      <div className="wrap stack">
        <header className="hero">
          <p className="kicker">ANNmodels</p>
          <h1 className="serif">Два входа: родители и администраторы</h1>
          <p className="muted" style={{ maxWidth: 640, marginTop: 12 }}>
            Приложение для родителей открывается внутри Telegram. Сайт администраторов работает в браузере телефона и компьютера. Бота к Mini App подключаете вы.
          </p>
        </header>
        {param && <p className="note">Открыто из Telegram, startapp: {param}</p>}
        <div className="hub-grid">
          <div className="stack">
            <div className="entries">
              <Link className="entry" to="/app/login">
                <span className="kicker">Telegram</span>
                <strong>Приложение родителей</strong>
                <span className="muted">Лента кастингов, анкета, отклик, медиа и календарь. Этот экран и вставляется в бота.</span>
              </Link>
              <Link className="entry" to="/admin/login">
                <span className="kicker">Сайт</span>
                <strong>Вход администратора</strong>
                <span className="muted">Кастинги, отклики, база и настройки. Логин admin, пароль annmodels.</span>
              </Link>
              <Link className="entry" to="/c/waikiki_autumn">
                <span className="kicker">Заказчик</span>
                <strong>Подборка принятых</strong>
                <span className="muted">Страница, которую можно переслать бренду.</span>
              </Link>
            </div>
            <section className="note stack">
              <strong>Как подключить бота родителей</strong>
              <span>В @BotFather: /newbot, затем /newapp. В ссылку Mini App вставьте адрес этого сайта с окончанием #/app. Кнопку меню бота поставьте на тот же адрес. Имя бота потом запишите в настройках админки, чтобы ссылки из канала открывали нужный кастинг.</span>
            </section>
            <section className="stack">
              <h2 className="serif" style={{ fontSize: 36 }}>
                Карта экранов
              </h2>
              <div className="checks">
                {CHECKS.map(([title, text, to]) => (
                  <Link key={title} className="check" to={to}>
                    <span className="kicker">{title.split(' ')[0]}</span>
                    <strong>{title.slice(title.indexOf(' ') + 1)}</strong>
                    <small>{text}</small>
                  </Link>
                ))}
              </div>
            </section>
          </div>
          <aside className="stack">
            <div className="creds stack">
              <p className="kicker">Показать родителя</p>
              <strong>{parent.name}</strong>
              <span>{phoneMask(parent.phone)}</span>
              <span>SMS-код 1234</span>
              <span className="muted">Дети: Алиса, Софья и Ева. У Софьи старая визитка, у Евы старое фото и рост.</span>
            </div>
            <div className="note">
              Администратор и родитель на одном устройстве видят одни данные. Одобрите отклик на сайте и откройте «Бот» в приложении.
            </div>
            <button className="btn btn-ghost" type="button" onClick={reset}>
              Сбросить демо
            </button>
          </aside>
        </div>
      </div>
    </main>
  )
}
