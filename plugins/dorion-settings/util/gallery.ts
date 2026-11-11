// Built-in theme gallery: base + palette CSS served by Dorion from its binary.
// Nothing is injected while no base is chosen.
import { invoke } from '../../../api/api.js'

const STYLE_ID = 'dorion-gallery'

export interface GalleryCredit { project: string, author: string, license: string, repo: string, commit: string }
export interface GalleryBase { id: string, name: string, author: string, license: string, repo: string, commit: string }
export interface GalleryPalette {
  id: string
  name: string
  categories: string[]
  light: boolean
  swatches: string[]
  credit: GalleryCredit | null
}
export interface GalleryManifest { bases: GalleryBase[], palettes: GalleryPalette[], licenses: string[] }

let manifest: GalleryManifest | null = null

/** Only called when the gallery is displayed */
export async function loadManifest(): Promise<GalleryManifest> {
  manifest ??= JSON.parse(await invoke('gallery_manifest'))
  return manifest
}

export async function applyGallery(config: Partial<DorionSettings>) {
  const base = config.gallery_base ?? ''
  let style = document.getElementById(STYLE_ID)

  if (!base) {
    style?.remove()
    return
  }

  let css: string
  try {
    css = await invoke('gallery_css', { base, palette: config.gallery_palette ?? '' })
  } catch (e) {
    // unknown id in a hand-edited config: show nothing rather than a broken theme
    console.error('[Dorion] Gallery theme not applied', e)
    style?.remove()
    return
  }

  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
  }
  if (!style.isConnected) {
    // Lowest priority of Dorion's styles: Appearance options come after it in <head>,
    // user themes and the CSS editor live in <body>
    const appearance = document.getElementById('dorion-appearance')
    if (appearance) document.head.insertBefore(style, appearance)
    else document.head.appendChild(style)
  }
  style.textContent = css
}
