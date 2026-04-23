# as. — Полный гайд по настройке VPS

> Этот гайд предполагает Ubuntu 22.04 / 24.04 LTS. Все команды выполняются от root.

## 0. ПЕРВОЕ: СМЕНИ ПАРОЛЬ!

```bash
passwd root
```

Установи сложный пароль. Потом настрой SSH-ключи и отключи вход по паролю.

## 1. Обновление системы и базовые утилиты

```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential python3 ufw certbot nginx
```

## 2. Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
node --version  # Должно быть v20.x
```

## 3. PostgreSQL 16

```bash
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-16

# Создание базы и пользователя
sudo -u postgres psql <<SQL
CREATE USER as_user WITH PASSWORD 'СГЕНЕРИРУЙ_СЛОЖНЫЙ_ПАРОЛЬ';
CREATE DATABASE as_db OWNER as_user;
GRANT ALL PRIVILEGES ON DATABASE as_db TO as_user;
SQL
```

### Оптимизация PostgreSQL для мессенджера

```bash
cat >> /etc/postgresql/16/main/conf.d/as.conf <<'EOF'
# Производительность
shared_buffers = '256MB'
effective_cache_size = '1GB'
work_mem = '16MB'
maintenance_work_mem = '128MB'

# WAL
wal_buffers = '16MB'
checkpoint_completion_target = 0.9

# Подключения
max_connections = 100

# Логирование
log_min_duration_statement = 1000
EOF

systemctl restart postgresql
```

### Разрешить подключение с Vercel (если нужно)

```bash
# В файле /etc/postgresql/16/main/pg_hba.conf добавь:
# host  as_db  as_user  0.0.0.0/0  scram-sha-256

# В файле /etc/postgresql/16/main/postgresql.conf:
# listen_addresses = '*'

# Затем:
systemctl restart postgresql
```

**ВАЖНО:** Если открываешь PostgreSQL наружу, обязательно используй сильный пароль
и ограничь через firewall только IP-адреса Vercel (или используй SSH-туннель).

## 4. Redis 7

```bash
apt install -y redis-server

# Настройка
sed -i 's/^# maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

systemctl enable redis-server
systemctl restart redis-server
redis-cli ping  # Должно быть PONG
```

## 5. coturn (TURN/STUN сервер)

TURN сервер — критически важен для звонков. Без него звонки не будут работать
за NAT (т.е. у большинства пользователей).

```bash
apt install -y coturn

# Включить coturn как сервис
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
```

### Конфигурация coturn

```bash
cat > /etc/turnserver.conf <<'EOF'
# Сеть
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=186.246.0.101
relay-ip=186.246.0.101
min-port=49152
max-port=65535

# Аутентификация через shared secret
use-auth-secret
static-auth-secret=Kci6+^qt:sfJlnTU=?@c>[iTuS9,Uzn1T3K\rJTVSE=s&9$s24?Am<d5e{I<m3qs
realm=as-messenger.vercel.app

# TLS — раскомментируй после шага 7 (получение SSL)
cert=/etc/letsencrypt/live/186-246-0-101.sslip.io/fullchain.pem
pkey=/etc/letsencrypt/live/186-246-0-101.sslip.io/privkey.pem

# Производительность
total-quota=100
bps-capacity=0
stale-nonce=600
no-multicast-peers

# Безопасность — блокируем relay на приватные сети
no-tcp-relay
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=127.0.0.0-127.255.255.255

# Лог
log-file=/var/log/turnserver.log
simple-log
EOF
```

```bash
systemctl enable coturn
systemctl restart coturn
systemctl status coturn  # Должен быть active (running)
```

## 6. Firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp

# HTTP/HTTPS (Nginx)
ufw allow 80/tcp
ufw allow 443/tcp

# coturn STUN/TURN
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp

# coturn relay ports
ufw allow 49152:65535/udp

# mediasoup RTC ports
ufw allow 40000:49999/udp

# PostgreSQL — открываем для Vercel (они подключаются с разных IP)
ufw allow 5432/tcp

ufw enable
ufw status
```

> **Заметка про PostgreSQL:** мы открываем 5432, потому что Vercel serverless functions
> подключаются с разных IP. Безопасность обеспечивается сильным паролем в PostgreSQL +
> настройкой `pg_hba.conf` (scram-sha-256). Если хочешь ещё безопаснее — используй
> PgBouncer или SSH-туннель.

## 7. SSL сертификат (Let's Encrypt) — БЕЗ домена

У тебя нет своего домена — не проблема! Используем **sslip.io** — бесплатный сервис,
который превращает IP в доменное имя. Домен `186-246-0-101.sslip.io` автоматически
резолвится в `186.246.0.101`. Let's Encrypt выдаст на него нормальный сертификат.

```bash
# Сначала останови Nginx если он уже запущен (certbot использует порт 80)
systemctl stop nginx 2>/dev/null

# Получаем сертификат (домен = твой IP через sslip.io)
certbot certonly --standalone -d 186-246-0-101.sslip.io

# Автообновление
systemctl enable certbot.timer
```

После получения сертификата **раскомментируй cert/pkey** в `/etc/turnserver.conf`:
```bash
sed -i 's|# cert=.*|cert=/etc/letsencrypt/live/186-246-0-101.sslip.io/fullchain.pem|' /etc/turnserver.conf
sed -i 's|# pkey=.*|pkey=/etc/letsencrypt/live/186-246-0-101.sslip.io/privkey.pem|' /etc/turnserver.conf
systemctl restart coturn
```

## 8. Nginx (reverse proxy)

```bash
cat > /etc/nginx/sites-available/as.conf <<'NGINX'
upstream signaling {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name 186-246-0-101.sslip.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 186-246-0-101.sslip.io;

    ssl_certificate     /etc/letsencrypt/live/186-246-0-101.sslip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/186-246-0-101.sslip.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Socket.IO — WebSocket проксирование
    location /socket.io/ {
        proxy_pass http://signaling;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://signaling;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://signaling;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/as.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl start nginx
```

**Проверь:** `curl https://186-246-0-101.sslip.io/health` — если видишь ошибку connection refused, 
значит сервер ещё не запущен (он будет в шаге 9).

## 9. Деплой серверного приложения

```bash
# Создаём пользователя для приложения
useradd -m -s /bin/bash as
mkdir -p /opt/as
chown as:as /opt/as

# Переключаемся на пользователя as
su - as
cd /opt/as

# ВАРИАНТ А: Клонировать из GitHub (если уже запушил)
git clone https://github.com/ТВОЙ_ЮЗЕРНЕЙМ/as.git .

# ВАРИАНТ Б: Скопировать файлы через scp с твоего компа
# (выполни на СВОЁМ компе, не на VPS):
scp -r C:\Users\irshe\Desktop\as\server root@186.246.0.101:/opt/as/server
scp -r C:\Users\irshe\Desktop\as\prisma root@186.246.0.101:/opt/as/prisma
scp -r C:\Users\irshe\Desktop\as\packages root@186.246.0.101:/opt/as/packages
scp C:\Users\irshe\Desktop\as\package.json root@186.246.0.101:/opt/as/
scp C:\Users\irshe\Desktop\as\package-lock.json root@186.246.0.101:/opt/as/
scp C:\Users\irshe\Desktop\as\tsconfig.base.json root@186.246.0.101:/opt/as/
chown -R as:as /opt/as

cd /opt/as

# Устанавливаем зависимости
npm install

# Генерируем Prisma client и накатываем миграции
cd prisma
npx prisma generate
npx prisma db push   # создаёт таблицы (для первого раза)
cd ..

# Создаём .env для сервера
cat > server/.env <<'ENV'
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://as_user:15Perslec@localhost:5432/as_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=f4a7b9c2e1d8a5f3c6e9b2a4d7f1c8e5a3b6d9f2c1e4a7b8d3f6a9c2e5b7d1f4
TURN_SECRET=Kci6+^qt:sfJlnTU=?@c>[iTuS9,Uzn1T3K\rJTVSE=s&9$s24?Am<d5e{I<m3qs
TURN_URLS=turn:186.246.0.101:3478,turns:186-246-0-101.sslip.io:5349
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=186.246.0.101
CORS_ORIGIN=https://as-messenger.vercel.app
LOG_LEVEL=info
ENV

# Собираем TypeScript
cd server
npx tsc
```

> **JWT_SECRET** должен быть таким же, как **NEXTAUTH_SECRET** на Vercel!
> Сгенерируй один раз: `openssl rand -hex 32` и используй везде.

### Запуск через PM2

```bash
# Из /opt/as/server
pm2 start dist/index.js --name as-server
pm2 save
pm2 startup  # скопируй и выполни команду которую он выведет
```

### Альтернатива: systemd сервис

```bash
# Выполняй от root, не от as!
exit  # выйти из пользователя as обратно в root

cat > /etc/systemd/system/as-server.service <<'SERVICE'
[Unit]
Description=as. Signaling + mediasoup Server
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=as
WorkingDirectory=/opt/as/server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/opt/as/server/.env

# Критически важно для mediasoup!
LimitRTPRIO=infinity
LimitNICE=-20

NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
SERVICE

systemctl enable as-server
systemctl start as-server
systemctl status as-server
```

**`LimitRTPRIO=infinity` и `LimitNICE=-20`** — без этих настроек mediasoup workers
не смогут использовать realtime scheduling, что критически влияет на качество звонков.

### Проверь что всё работает

```bash
curl https://186-246-0-101.sslip.io/health
# Ответ: {"status":"ok","timestamp":"..."}
```

## 10. Оптимизация сети для медиа

```bash
cat >> /etc/sysctl.conf <<'EOF'
# Увеличить буферы UDP для mediasoup
net.core.rmem_max = 8388608
net.core.wmem_max = 8388608
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576

# Увеличить очередь
net.core.netdev_max_backlog = 65536
net.core.somaxconn = 65535

# TCP оптимизации для Socket.IO
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
EOF

sysctl -p
```

## 11. Бэкапы PostgreSQL

```bash
mkdir -p /opt/as/backups
chown as:as /opt/as/backups

cat > /etc/cron.d/as-backup <<'CRON'
# Ежедневный бэкап в 3:00
0 3 * * * as pg_dump -U as_user as_db | gzip > /opt/as/backups/as_db_$(date +\%Y\%m\%d).sql.gz
# Удаление бэкапов старше 30 дней
0 4 * * * as find /opt/as/backups -name "*.sql.gz" -mtime +30 -delete
CRON
```

## 12. Мониторинг

```bash
# Проверка здоровья
curl https://186-246-0-101.sslip.io/health

# Логи сервера
pm2 logs as-server
# или
journalctl -u as-server -f

# Логи coturn
tail -f /var/log/turnserver.log

# Статус mediasoup workers
pm2 monit

# Нагрузка
htop
```

---

## 13. Деплой фронтенда на Vercel — ПОЛНЫЙ ГАЙД

### Шаг 1: Запуш проект на GitHub

На своём компьютере:

```bash
cd C:\Users\irshe\Desktop\as

# Если ещё не инициализировал git:
git init
git add -A
git commit -m "Initial commit: as. messenger"

# Создай репозиторий на GitHub (https://github.com/new)
# Имя: as
# Приватный: да

git remote add origin https://github.com/ТВОЙ_ЮЗЕРНЕЙМ/as.git
git branch -M main
git push -u origin main
```

### Шаг 2: Подключи Vercel

1. Зайди на **https://vercel.com** → войди через GitHub
2. Нажми **"Add New..." → "Project"**
3. Найди репозиторий **as** → нажми **"Import"**
4. В настройках проекта:
   - **Framework Preset**: Next.js (должен определиться автоматически)
   - **Root Directory**: нажми **"Edit"** → введи `apps/web`
   - **Build Command**: `cd ../.. && npm install && npx turbo build --filter=@as/web`
   - **Output Directory**: `.next`
   - **Install Command**: оставь пустым (мы делаем install в build command)

### Шаг 3: Переименуй проект в as-messenger

1. После создания проекта → иди в **Settings → General**
2. В поле **"Project Name"** измени на `as-messenger`
3. Нажми **Save**
4. Теперь URL будет: **https://as-messenger.vercel.app**

> Если `as-messenger` занято, Vercel предложит вариант типа `as-messenger-abc123.vercel.app`.
> Можно также попробовать `as-app`, `as-chat` и т.д.

### Шаг 4: Переменные окружения

В Vercel → твой проект → **Settings → Environment Variables**.

Добавь ВСЕ эти переменные (для Production, Preview, Development):

| Имя | Значение |
|-----|----------|
| `DATABASE_URL` | `postgresql://as_user:ТВОЙ_ПАРОЛЬ@186.246.0.101:5432/as_db` |
| `NEXTAUTH_SECRET` | Тот же ключ что JWT_SECRET на VPS (`openssl rand -hex 32`) |
| `NEXTAUTH_URL` | `https://as-messenger.vercel.app` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://186-246-0-101.sslip.io` |
| `NEXT_PUBLIC_TURN_URL` | `turn:186.246.0.101:3478` |

> **ВАЖНО:** `NEXT_PUBLIC_` переменные встраиваются в клиентский код при сборке.
> Если поменяешь их — нужен редеплой (Vercel → Deployments → Redeploy).

### Шаг 5: Первый деплой

Vercel автоматически задеплоит при пуше в `main`. Если нужно пересобрать вручную:
1. Vercel → твой проект → **Deployments**
2. Найди последний деплой → нажми **"..." → "Redeploy"**

### Шаг 6: Проверь

Открой **https://as-messenger.vercel.app** (или какой URL получился).
- Должна открыться страница логина
- Зарегистрируй 2 аккаунта
- Найди одного из другого через "Поиск"
- Напиши сообщение

### Возможные проблемы при деплое

**"Module not found: @as/shared"**
→ Убедись что Root Directory = `apps/web` и Build Command начинается с `cd ../..`

**"prisma generate" ошибка**
→ Добавь в Build Command: `cd ../.. && npx prisma generate --schema=prisma/schema.prisma && npx turbo build --filter=@as/web`

**Timeout при подключении к БД**
→ Проверь что PostgreSQL слушает на 0.0.0.0 (`listen_addresses = '*'` в postgresql.conf)
→ Проверь что firewall открыт: `ufw status` — порт 5432
→ Проверь pg_hba.conf: `host as_db as_user 0.0.0.0/0 scram-sha-256`

**Socket.IO не подключается**
→ Открой DevTools → Console. Если ошибка CORS:
→ Проверь `CORS_ORIGIN` в server/.env на VPS = `https://as-messenger.vercel.app`
→ Перезапусти: `pm2 restart as-server`

### Автодеплой

Vercel автоматически деплоит каждый пуш в `main`:
```bash
# На своём компе:
git add -A
git commit -m "Какие-то изменения"
git push
# → Vercel подхватит автоматически через ~1-2 минуты
```

---

## 14. После деплоя: обнови CORS на VPS

Когда узнаешь свой точный Vercel URL, обнови на VPS:

```bash
# На VPS, отредактируй /opt/as/server/.env
# Замени CORS_ORIGIN на свой реальный Vercel URL:
nano /opt/as/server/.env
# CORS_ORIGIN=https://as-messenger.vercel.app

# Перезапусти
pm2 restart as-server
```

---

## Чеклист после настройки

### VPS
- [ ] Пароль root изменён
- [ ] PostgreSQL работает: `sudo -u postgres psql -c "SELECT 1"`
- [ ] PostgreSQL доступен снаружи: `listen_addresses = '*'`, pg_hba.conf настроен
- [ ] Redis работает: `redis-cli ping`
- [ ] coturn работает: `systemctl status coturn`
- [ ] SSL сертификат получен: `curl https://186-246-0-101.sslip.io/health`
- [ ] Nginx работает: `nginx -t && systemctl status nginx`
- [ ] Firewall включён: `ufw status`
- [ ] as-server запущен: `pm2 status` или `systemctl status as-server`
- [ ] Бэкапы настроены

### Vercel
- [ ] Проект создан с Root Directory = `apps/web`
- [ ] Все 5 переменных окружения добавлены
- [ ] Деплой прошёл без ошибок
- [ ] Страница логина открывается
- [ ] Регистрация работает (создаётся пользователь в БД)
- [ ] Socket.IO подключается (нет ошибок в Console)

---

## Устранение проблем

### Звонки не подключаются
1. Проверь что coturn запущен: `systemctl status coturn`
2. Проверь firewall: `ufw status` — порты 3478, 49152-65535 открыты?
3. Проверь `MEDIASOUP_ANNOUNCED_IP=186.246.0.101` в server/.env
4. Тест TURN с клиента: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
   → Вставь `turn:186.246.0.101:3478` → проверь что появляются relay candidates

### Плохое качество звонков
1. Проверь сеть: `iperf3` между VPS и клиентом
2. Проверь UDP буферы: `sysctl net.core.rmem_max` (должно быть 8388608)
3. Проверь приоритет mediasoup: `cat /proc/$(pgrep -f mediasoup)/limits | grep RTPRIO`
4. Проверь нагрузку CPU: `htop` — mediasoup workers не должны быть >80%

### mediasoup не стартует
1. Проверь что есть build-essential: `gcc --version`
2. mediasoup требует Python 3: `python3 --version`
3. Логи: `pm2 logs as-server --lines 50` или `journalctl -u as-server -n 100`

### Vercel деплой падает
1. Логи сборки: Vercel → Deployments → нажми на деплой → Build Logs
2. Часто: не хватает переменных окружения → проверь что все 5 добавлены
3. Часто: неправильный Root Directory → должен быть `apps/web`
