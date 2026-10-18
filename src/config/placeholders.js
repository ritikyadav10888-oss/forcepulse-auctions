// Neutral images used until an organiser uploads a real player photo or team logo
const svg = (markup) => `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;

export const DEFAULT_PLAYER_PHOTO = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#1e293b"/>` +
  `<circle cx="200" cy="190" r="82" fill="#475569"/><path d="M60 500c0-95 63-160 140-160s140 65 140 160z" fill="#475569"/></svg>`
);

export const DEFAULT_TEAM_LOGO = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><rect width="150" height="150" fill="#0f172a"/>` +
  `<path d="M75 22l42 15v34c0 28-18 47-42 57-24-10-42-29-42-57V37z" fill="#84cc16"/></svg>`
);
