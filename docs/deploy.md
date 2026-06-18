# Деплой сайта

Канонический хостинг — собственный VPS **Чебурашка**. GitHub Pages ретайрнут (был временным).

## Данные инфраструктуры

| Параметр | Значение |
|---|---|
| Домен | **sergeyphilippovmusic.com** (+ `www`) |
| Сервер | **Чебурашка** (RU VPN-узел), `ssh ru-vps` |
| IP | **185.228.235.152** |
| Веб-сервер | **nginx** (не Caddy — его на узле нет) |
| Докрут | `/var/www/sergeyphilippovmusic` (статика Astro) |
| nginx-сайт | `/etc/nginx/sites-available/sergeyphilippovmusic` (он же `default_server` на :80 и :443) |
| Порты | :80 (HTTP), :443 (HTTPS) — UFW открыты 80/443 |
| TLS на origin | **Let's Encrypt** (`certbot --nginx`), авто-выпуск через `le-bootstrap.timer`, как только DNS заведут. До выпуска — self-signed заглушка, чтобы :443 не падал |
| Репозиторий | `github.com/SergeyRakitin/philippov-website` |

> **Двойная роль.** Сайт одновременно — «сайт-прикрытие» VPN-узла: на голом IP `185.228.235.152`
> отдаётся настоящее портфолио (раньше там был временный «конструктор ладов», снесён, бэкап в
> `/root/backups/musicscales-*`).

## Авто-деплой (push-to-deploy)

Воркфлоу `.github/workflows/deploy-vps.yml`. Триггеры:
- push в `main` (кроме `studio/**` — Studio деплоит `deploy-sanity.yml`);
- вебхук Sanity при публикации контента (`repository_dispatch: sanity-content-update`);
- ручной запуск: `gh workflow run deploy-vps.yml`.

Шаги: `npm ci` → `npm run build` → `rsync --delete dist/` в докрут по SSH → `nginx -t && systemctl reload nginx` → healthcheck (200 на голом IP с `Host: sergeyphilippovmusic.com`).

**Билд токенлес:** `src/lib/sanity.ts` фоллбэчит на публичный датасет `29k7vl30/production`, секреты Sanity в CI не нужны.

### Секреты репозитория (GitHub Actions)
| Секрет | Значение |
|---|---|
| `VPS_SSH_KEY` | приватный deploy-ключ ed25519 (отдельный, только для CI) |
| `VPS_HOST` | `185.228.235.152` |
| `VPS_USER` | `root` |

Публичный deploy-ключ — в `/root/.ssh/authorized_keys` на Чебурашке (комментарий
`github-actions-deploy-philippov`). Ключ отдельный — отзывается независимо, не ломая остальной доступ.

## DNS / Cloudflare (настраивает Филиппов сам)

1. Регистрирует домен на РФ-регистраторе (reg.ru / beget, РФ-карта).
2. Заводит домен в Cloudflare (Free), делегирует NS регистратора на серверы Cloudflare.
3. A-записи `@` и `www` → `185.228.235.152`, **DNS only (серое облако, БЕЗ proxy)**.
   Proxied (оранжевое) НЕ используем — проксированный трафик Cloudflare в РФ режется/тормозит;
   серое облако = домен ведёт напрямую на RU-сервер, быстро и доступно из РФ.
4. Приглашает резервного администратора `astonic@gmail.com` (Cloudflare → Members → Invite, роль Administrator).

> Cloudflare здесь — только DNS-хостинг (proxy выключен), поэтому SSL/TLS-режимы Cloudflare
> неприменимы: HTTPS обеспечивает origin (Let's Encrypt), не Cloudflare.

## HTTPS на origin (Let's Encrypt, авто)

При DNS-only домен резолвится прямо на сервер, поэтому cert нужен валидный на самом nginx.
Выпуск автоматизирован — никаких ручных действий после DNS:
- `certbot` + `python3-certbot-nginx` установлены.
- `/usr/local/bin/le-bootstrap.sh` + `le-bootstrap.timer` (каждые 15 мин) ждут, пока
  `sergeyphilippovmusic.com` начнёт резолвиться на `185.228.235.152`, затем выпускают cert
  (`certbot --nginx --redirect -d sergeyphilippovmusic.com -d www...`) и таймер сам себя гасит.
- Дальше штатный `certbot.timer` продлевает cert. До выпуска :443 отдаёт self-signed заглушку.

Проверить статус: `ssh ru-vps 'systemctl status le-bootstrap.timer; ls /etc/letsencrypt/live/ 2>/dev/null'`.

## Откат

- nginx-конфиг бэкап: `/root/backups/nginx-musicscales-*.conf`, докрут прикрытия: `/root/backups/musicscales-*.tar.gz`.
- Воркфлоу деплоя: `git revert` коммита + при необходимости вернуть прежний сайт из бэкапа.
- Деплой статики не зависит от VPN: nginx и WireGuard/Xray — разные подсистемы. Правки nginx
  физически не могут уронить VPN, если не трогать WG/Xray/iptables/порты 22 и 51820/udp.

## Ручной деплой (без CI)

```bash
npm run build
# rsync (если есть) или tar-pipe:
tar czf - -C dist . | ssh ru-vps "rm -rf /var/www/sergeyphilippovmusic/* && tar xzf - -C /var/www/sergeyphilippovmusic && chown -R www-data:www-data /var/www/sergeyphilippovmusic"
ssh ru-vps "nginx -t && systemctl reload nginx"
```
