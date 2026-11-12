/** Original printed Everdell icons, extracted without redrawing from the supplied PDF */
const labels = Object.freeze({
  berry: 'Ягода', twig: 'Ветка', resin: 'Смола', pebble: 'Камушек',
  card: 'Карта', point: 'Победные очки', 'point-one': 'Одно победное очко',
  'any-resource': 'Любой ресурс', worker: 'Место работника',
  traveler: 'Странствия', production: 'Урожай', destination: 'Локация',
  governance: 'Управление', prosperity: 'Процветание'
})
const aliases = Object.freeze({
  wood: 'twig', branch: 'twig', stone: 'pebble', cards: 'card', draw: 'card',
  any: 'any-resource', resource: 'any-resource', vp: 'point', points: 'point',
  paw: 'worker', slot: 'worker', travel: 'traveler', harvest: 'production',
  location: 'destination', management: 'governance'
})
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]))
export const originalIconNames = Object.freeze(Object.keys(labels))

/** Return HTML with a contained original PNG in a square slot, size in CSS pixels
 * label="" marks the icon as decorative; unknown names return a text span
 */
export function renderIcon(name, { size = 28, label } = {}) {
  const key = Object.hasOwn(labels, name) ? name : aliases[name]
  const pixels = Number.isFinite(Number(size)) ? Math.min(256, Math.max(1, Number(size))) : 28
  const text = label ?? (key ? labels[key] : String(name))
  const style = `display:inline-block;width:${pixels}px;height:${pixels}px;object-fit:contain;vertical-align:middle;flex:none`
  if (!key || !Object.hasOwn(labels, key)) {
    return `<span class="original-icon original-icon--missing" style="${style}" title="${escapeHTML(text)}">${escapeHTML(text)}</span>`
  }
  const src = new URL(`./assets/original-icons/${key}.png`, import.meta.url).href
  return `<img class="original-icon original-icon--${key}" src="${escapeHTML(src)}" width="${pixels}" height="${pixels}" alt="${escapeHTML(text)}"${text === '' ? ' aria-hidden="true"' : ''} decoding="async" draggable="false" style="${style}">`
}
