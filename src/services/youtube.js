// Turns the YouTube link an organiser pastes into an embeddable player URL, or '' when it isn't a YouTube link.
// Accepts watch?v=, youtu.be/, /live/<id>, /embed/<id>, /shorts/<id> and a channel's /channel/<id>/live page.
export const youtubeEmbedUrl = (link) => {
  const text = String(link || '').trim();
  if (!text) return '';
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return '';
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  let id = '';
  if (host === 'youtu.be') id = parts[0] || '';
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch') id = url.searchParams.get('v') || '';
    else if (['live', 'embed', 'shorts'].includes(parts[0])) id = parts[1] || '';
    else if (parts[0] === 'channel' && parts[1]) {
      return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(parts[1])}&autoplay=1&mute=1`;
    }
  }
  return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0` : '';
};
