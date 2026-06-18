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
| Порты | :80 (HTTP), :443 (HTTPS, self-signed origin-cert) — UFW открыты 80/443 |
| TLS на origin | self-signed `/etc/nginx/ssl/sergeyphilippovmusic-selfsigned.*` (под Cloudflare SSL «Full») |
| Репозиторий | `github.com/SergeyRakitin/philippov-website` |

> **Двойная роль.** Сайт одновременно — «сайт-прикрытие» VPN-узла: на голом IP `185.228.235.152`
> отдаётся настоящее портфолио (раньше там был временный «конструктор ладов», снесён, бэкап в
> `/root/backups/musicscales-*` на сервере).

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

Публичный deploy-ключ добавлен в `/root/.ssh/authorized_keys` на Чебурашке (комментарий
`github-actions-deploy-philippov`). Ключ отдельный — отзывается независимо, не ломая остальной доступ.

## DNS / Cloudflare (делает Филиппов)

1. Домен зарегистрирован на Beget (РФ-карта), NS делегированы на Cloudflare.
2. В Cloudflare (Free): A-записи `@` и `www` → `185.228.235.152`, **Proxied (оранжевое облако)** —
   прячет origin-IP узла, на голом IP при этом остаётся сайт-прикрытие.
3. SSL/TLS mode: **Full** (origin на self-signed; «Full (strict)» отклонит self-signed —
   для strict позже поставить Cloudflare Origin Certificate на nginx :443).
4. Always Use HTTPS: On.

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
