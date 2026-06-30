# Frontend Proces

Современное React приложение с использованием Vite, TailwindCSS и Docker.

## Технологии

- **React 18** - библиотека для создания пользовательских интерфейсов
- **TypeScript** - типизированный JavaScript
- **Vite** - быстрый инструмент сборки
- **TailwindCSS** - utility-first CSS фреймворк
- **Docker** - контейнеризация приложения

## Локальная разработка

### Без Docker

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build

# Превью продакшен сборки
npm run preview
```

### С Docker

```bash
# Запуск в режиме разработки
docker-compose --profile dev up --build

# Запуск в продакшен режиме
docker-compose --profile prod up --build
```

## Команды Docker

```bash
# Сборка продакшен образа
docker build -t frontend-proces .

# Запуск продакшен контейнера
docker run -p 80:80 frontend-proces

# Сборка и запуск dev версии
docker build -f Dockerfile.dev -t frontend-proces-dev .
docker run -p 5173:5173 -v $(pwd)/src:/app/src frontend-proces-dev
```

## Структура проекта

```
frontend_proces/
├── src/
│   ├── App.tsx          # Главный компонент
│   ├── main.tsx         # Точка входа
│   ├── index.css        # Стили с TailwindCSS
│   └── vite-env.d.ts    # Типы Vite
├── public/              # Статические файлы
├── Dockerfile           # Продакшен сборка
├── Dockerfile.dev       # Dev сборка
├── docker-compose.yml   # Docker Compose конфигурация
├── nginx.conf           # Конфигурация Nginx
├── vite.config.ts       # Конфигурация Vite
├── tailwind.config.js   # Конфигурация TailwindCSS
├── postcss.config.js    # Конфигурация PostCSS
└── tsconfig.json        # Конфигурация TypeScript
```

## Доступ к приложению

- **Разработка**: http://localhost:5173
- **Продакшен**: http://localhost:80

Приложение готово к разработке! 🚀 