// Hide parts of Discord's UI with CSS. Every selector here depends on Discord's markup
// and can silently stop matching after a Discord update.
// aria-label selectors list English and French labels, other languages will not match.
export const HIDEABLE_ELEMENTS: { id: string, selector: string }[] = [
  { id: 'store', selector: 'a[href="/store"]' },
  { id: 'shop', selector: 'a[href="/shop"]' },
  { id: 'quests', selector: 'a[href="/quest-home"]' },
  { id: 'discover', selector: '[data-list-item-id="guildsnav___guild-discover-button"]' },
  { id: 'download', selector: '[data-list-item-id="guildsnav___app-download-button"]' },
  { id: 'active_now', selector: '[class*="nowPlayingColumn_"]' },
  {
    id: 'gift',
    selector: '[class*="channelTextArea"] button[aria-label="Send a gift"], [class*="channelTextArea"] button[aria-label="Envoyer un cadeau"]',
  },
  {
    id: 'gif',
    selector: '[class*="channelTextArea"] button[aria-label="Open GIF picker"], [class*="channelTextArea"] button[aria-label="Ouvrir le sélecteur de GIF"]',
  },
  {
    id: 'sticker',
    selector: '[class*="channelTextArea"] button[aria-label="Open sticker picker"], [class*="channelTextArea"] button[aria-label="Ouvrir le sélecteur d\'autocollants"]',
  },
  { id: 'app_launcher', selector: '[class*="channelAppLauncher_"]' },
]

const STYLE_ID = 'dorion-hidden-ui'

// Only plain selectors: anything that could close the rule or start another one is refused
export function validSelector(selector: string) {
  const s = selector.trim()
  if (!s || s.length > 300 || /[{};@<]|\/\*|\*\//.test(s)) return false

  try {
    document.querySelector(s)
    return true
  } catch {
    return false
  }
}

export function applyHiddenUi(ids: string[] | undefined, custom: string[] | undefined = []) {
  const selectors = [
    ...HIDEABLE_ELEMENTS.filter(e => ids?.includes(e.id)).map(e => e.selector),
    ...(custom ?? []).filter(validSelector).slice(0, 50),
  ]
  const css = selectors.map(s => `${s} { display: none !important; }`).join('\n')

  let style = document.getElementById(STYLE_ID)
  if (!css) {
    style?.remove()
    return
  }

  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = css
}
