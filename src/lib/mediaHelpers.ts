// Хелперы медиа-эмбедов без внешних зависимостей.
// video: YouTube / Vimeo → URL для <iframe>; иначе null (фронт показывает ссылку).
// audio: SoundCloud / Spotify → URL для <iframe>; иначе null.

export type VideoProvider = 'youtube' | 'vimeo' | null;
export type AudioProvider = 'soundcloud' | 'spotify' | null;
export type MediaProvider = VideoProvider | AudioProvider;

/** Определить провайдера по URL. */
export function detectProvider(url: string | undefined | null): MediaProvider {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('vimeo.com')) return 'vimeo';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('spotify.com')) return 'spotify';
  return null;
}

/** Извлечь YouTube video id из любых распространённых форматов ссылок. */
function youtubeId(url: string): string | null {
  // youtu.be/<id>
  let m = url.match(/youtu\.be\/([\w-]{6,})/);
  if (m) return m[1];
  // youtube.com/watch?v=<id>
  m = url.match(/[?&]v=([\w-]{6,})/);
  if (m) return m[1];
  // youtube.com/embed/<id> | /shorts/<id> | /live/<id>
  m = url.match(/youtube\.com\/(?:embed|shorts|live)\/([\w-]{6,})/);
  if (m) return m[1];
  return null;
}

/** Извлечь Vimeo id (числовой). */
function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

/**
 * URL для <iframe> видео (YouTube/Vimeo).
 * Возвращает null, если провайдер не поддержан — тогда показываем обычную ссылку.
 */
export function getVideoEmbedUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const provider = detectProvider(url);
  if (provider === 'youtube') {
    const id = youtubeId(url);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
  }
  if (provider === 'vimeo') {
    const id = vimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}?dnt=1` : null;
  }
  return null;
}

/**
 * URL для <iframe> аудио (SoundCloud/Spotify).
 * SoundCloud → https://w.soundcloud.com/player/?url=<enc>&color=...
 * Spotify    → open.spotify.com/<type>/<id> → open.spotify.com/embed/<type>/<id>
 * accentHex — hex-цвет акцента для SoundCloud-плеера (без #).
 */
export function getAudioEmbedUrl(
  url: string | undefined | null,
  accentHex = 'c8975a',
): string | null {
  if (!url) return null;
  const provider = detectProvider(url);

  if (provider === 'soundcloud') {
    const enc = encodeURIComponent(url);
    return `https://w.soundcloud.com/player/?url=${enc}&color=%23${accentHex}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
  }

  if (provider === 'spotify') {
    // open.spotify.com/<type>/<id>?...  → open.spotify.com/embed/<type>/<id>
    const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([\w]+)/);
    if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
    // уже embed-ссылка
    if (url.includes('open.spotify.com/embed/')) return url;
    return null;
  }

  return null;
}

/** Высота iframe аудио-плеера по провайдеру (px). */
export function getAudioEmbedHeight(provider: AudioProvider): number {
  if (provider === 'spotify') return 152;
  return 140; // soundcloud (compact, visual:false)
}
