// Font, accent colour, chat width and wallpaper, applied as one injected <style>.
// Discord's CSS variable and class names are internal and can change with any Discord update.
import { invoke } from '../../../api/api.js'

const STYLE_ID = 'dorion-appearance'

let wallpaperUrl = ''
let wallpaperName = ''

// Values end up inside CSS: refuse anything that could leave the declaration or load a URL
export const safeFont = (font: string) => /^[\p{L}\p{N} \-,]{1,100}$/u.test(font.trim())
export const safeColor = (color: string) => /^#[0-9a-fA-F]{6}$/.test(color)
export const safeWidth = (width: number) => Number.isInteger(width) && width >= 600 && width <= 4000

const fontList = (font: string) => font
  .split(',')
  .map(f => f.trim())
  .filter(Boolean)
  .map(f => `"${f}"`)
  .join(', ')

async function loadWallpaper(name: string, force: boolean) {
  if (!force && name === wallpaperName && wallpaperUrl) return wallpaperUrl

  if (wallpaperUrl) URL.revokeObjectURL(wallpaperUrl)
  wallpaperUrl = ''
  wallpaperName = name
  if (!name) return ''

  try {
    const data = await invoke('get_wallpaper')
    const ext = name.split('.').pop()
    const type = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    // The blob keeps a single copy of the bytes, no base64 string
    wallpaperUrl = URL.createObjectURL(new Blob([data instanceof ArrayBuffer ? data : new Uint8Array(data)], { type }))
  } catch (e) {
    console.error('[Dorion] Failed to load wallpaper', e)
  }

  return wallpaperUrl
}

export function buildAppearanceCss(config: Partial<DorionSettings>, wallpaper: string) {
  const rules: string[] = []
  const vars: string[] = []
  const scopes = ':root, .theme-dark, .theme-light, .theme-darker, .theme-midnight, .visual-refresh'

  const font = config.style_font ?? ''
  if (font && safeFont(font)) {
    const list = fontList(font)
    vars.push(`--font-primary: ${list}`, `--font-display: ${list}`, `--font-headline: ${list}`)
    rules.push(`body { font-family: ${list}, var(--font-primary) !important; }`)
  }

  const accent = config.style_accent ?? ''
  if (safeColor(accent)) {
    const dark = `color-mix(in srgb, ${accent} 85%, black)`
    vars.push(
      `--brand-500: ${accent}`, `--brand-experiment: ${accent}`, `--brand-560: ${dark}`,
      `--brand-experiment-560: ${dark}`, `--bg-brand: ${accent}`, `--text-brand: ${accent}`,
      `--button-filled-brand-background: ${accent}`, `--button-filled-brand-background-hover: ${dark}`,
      `--control-brand-foreground: ${accent}`, `--control-brand-foreground-new: ${accent}`,
      // Primary buttons (Log In, Save...), read from Discord's stylesheet
      `--control-primary-background-default: ${accent}`, `--control-primary-background-hover: ${dark}`,
      `--control-primary-background-active: ${dark}`,
    )
  }

  const width = config.style_chat_width ?? 0
  if (safeWidth(width)) {
    rules.push(`[class*="chatContent_"] { max-width: ${width}px; margin: 0 auto; width: 100%; }`)
  }

  if (wallpaper) {
    const blur = Math.min(Math.max(config.wallpaper_blur ?? 0, 0), 50)
    const dim = Math.min(Math.max(config.wallpaper_dim ?? 50, 0), 95) / 100
    vars.push(...[
      'background-primary', 'background-secondary', 'background-secondary-alt', 'background-tertiary',
      'background-base-lowest', 'background-base-lower', 'background-base-low', 'bg-base-primary',
      'bg-base-secondary', 'bg-base-tertiary', 'chat-background-default', 'app-frame-background',
      // gallery bases (Midnight) paint their panels with these
      'bg-1', 'bg-2', 'bg-3', 'bg-4',
    ].map(v => `--${v}: transparent`))
    rules.push(
      'html, body, #app-mount { background: transparent !important; }',
      'body { isolation: isolate; }',
      `body::before { content: ''; position: fixed; inset: -${blur * 2}px; z-index: -1; pointer-events: none;`
        + ` background: linear-gradient(rgba(0,0,0,${dim}), rgba(0,0,0,${dim})), url("${wallpaper}") center / cover no-repeat;`
        + ` filter: blur(${blur}px); }`,
    )
  }

  if (vars.length) rules.unshift(`${scopes} { ${vars.map(v => `${v} !important`).join('; ')}; }`)
  return rules.join('\n')
}

/** Pass force after a new image was saved under the same name. */
export async function applyAppearance(config: Partial<DorionSettings>, force = false) {
  const css = buildAppearanceCss(config, await loadWallpaper(config.wallpaper_file ?? '', force))

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
