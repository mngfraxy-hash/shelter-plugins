import { invoke } from '../../../api/api.js'
import { t } from '../../../util/i18n.js'
import { css, classes } from './Gallery.tsx.scss'
import { applyGallery, loadManifest, type GalleryManifest, type GalleryPalette } from '../util/gallery.js'

const {
  ui: { Header, HeaderTags, Text, Button, ButtonSizes, ButtonColors, TextBox, Select, SelectOption, injectCss, showToast },
  solid: { createSignal, createEffect },
} = shelter

let injectedCss = false

const CATEGORIES = ['dark', 'light', 'pastel', 'oled', 'contrast', 'retro', 'colorblind']

const toast = (title: string, content?: string) => showToast({ title, content, duration: 4000 })

// Palettes of other projects keep their name; originals are translated
const paletteName = (p: GalleryPalette) => {
  const key = `dorion_gallery.palette_${p.id}`
  const translated = t(key)
  return typeof translated === 'string' && translated !== key ? translated : p.name
}

const licenseName = (repo: string) => repo.replace('/', '_')

interface Props {
  settings: () => DorionSettings
  setSettings: (fn: (s: DorionSettings) => DorionSettings) => void
}

export function Gallery(props: Props) {
  if (!injectedCss) {
    injectedCss = true
    injectCss(css)
  }

  const [manifest, setManifest] = createSignal<GalleryManifest | null>(null)
  const [category, setCategory] = createSignal('all')
  const [search, setSearch] = createSignal('')
  const [favoritesOnly, setFavoritesOnly] = createSignal(false)
  const [openLicense, setOpenLicense] = createSignal('')
  const [licenseText, setLicenseText] = createSignal('')

  // Read from the binary only now that the panel is open
  createEffect(async () => setManifest(await loadManifest()))

  const favorites = () => props.settings().gallery_favorites ?? []

  const update = (fn: (s: DorionSettings) => DorionSettings) => {
    props.setSettings(fn)
    applyGallery(props.settings())
  }

  const filtered = () => (manifest()?.palettes ?? []).filter(p =>
    (category() === 'all' || p.categories.includes(category()))
    && (!favoritesOnly() || favorites().includes(p.id))
    && paletteName(p).toLowerCase().includes(search().trim().toLowerCase()),
  )

  const choose = (id: string) => update(s => ({
    ...s,
    gallery_base: s.gallery_base || manifest()?.bases[0]?.id || '',
    gallery_palette: id,
  }))

  const random = () => {
    const pool = filtered().filter(p => p.id !== props.settings().gallery_palette)
    if (pool.length) choose(pool[Math.floor(Math.random() * pool.length)].id)
  }

  const toggleFavorite = (id: string) => props.setSettings(s => {
    const current = s.gallery_favorites ?? []
    return { ...s, gallery_favorites: current.includes(id) ? current.filter(f => f !== id) : [...current, id] }
  })

  const exportCss = async () => {
    try {
      const path = await invoke('export_gallery_css', {
        base: props.settings().gallery_base,
        palette: props.settings().gallery_palette ?? '',
      })
      toast(t('dorion_gallery.exported') as string, path)
    } catch (e) {
      toast(t('dorion_customize.failed') as string, String(e))
    }
  }

  const toggleLicense = async (repo: string) => {
    if (openLicense() === repo) {
      setOpenLicense('')
      return
    }
    setLicenseText(await invoke('gallery_license', { name: licenseName(repo) }).catch(e => String(e)))
    setOpenLicense(repo)
  }

  const credits = () => {
    const m = manifest()
    if (!m) return []
    const seen = new Set<string>()
    const list: { what: string, author: string, license: string, repo: string, commit: string }[] = []
    for (const b of m.bases) {
      seen.add(b.repo)
      list.push({ what: `${b.name} (${t('dorion_gallery.base')})`, author: b.author, license: b.license, repo: b.repo, commit: b.commit })
    }
    for (const p of m.palettes) {
      if (!p.credit || seen.has(p.credit.repo)) continue
      seen.add(p.credit.repo)
      list.push({ what: p.credit.project, ...p.credit })
    }
    return list
  }

  return (
    <>
      <Header class={classes.shead}>{t('dorion_gallery.title')}</Header>
      <Text class={classes.note}>{t('dorion_gallery.note')}</Text>

      <Header tag={HeaderTags.H4} class={classes.ohead}>{t('dorion_gallery.base')}</Header>
      <Select
        value={props.settings().gallery_base ?? ''}
        onChange={(v) => update(s => ({ ...s, gallery_base: String(v) }))}
      >
        <SelectOption value="">{t('dorion_gallery.base_none')}</SelectOption>
        {(manifest()?.bases ?? []).map(b => <SelectOption value={b.id}>{b.name}</SelectOption>)}
      </Select>

      <div class={classes.toolbar} role="group" aria-label={t('dorion_gallery.filters') as string}>
        {['all', ...CATEGORIES].map(c => (
          <button
            class={classes.chip}
            classList={{ [classes.chipon]: category() === c }}
            aria-pressed={category() === c}
            onClick={() => setCategory(c)}
          >
            {t(`dorion_gallery.cat_${c}`)}
          </button>
        ))}
        <button
          class={classes.chip}
          classList={{ [classes.chipon]: favoritesOnly() }}
          aria-pressed={favoritesOnly()}
          onClick={() => setFavoritesOnly(!favoritesOnly())}
        >
          ★ {t('dorion_gallery.favorites')}
        </button>
      </div>

      <div class={classes.row}>
        <TextBox value={search()} onInput={setSearch} placeholder={t('dorion_gallery.search') as string} />
        <Button size={ButtonSizes.MEDIUM} onClick={random}>{t('dorion_gallery.random')}</Button>
      </div>

      {!manifest() && <Text class={classes.note}>…</Text>}
      {manifest() && filtered().length === 0 && <Text class={classes.note}>{t('dorion_gallery.empty')}</Text>}

      <div class={classes.grid} role="radiogroup" aria-label={t('dorion_gallery.palettes') as string}>
        {filtered().map(p => {
          const selected = () => !!props.settings().gallery_base && props.settings().gallery_palette === p.id
          const favorite = () => favorites().includes(p.id)
          return (
            <div class={classes.card} classList={{ [classes.cardon]: selected() }}>
              <button
                class={classes.pick}
                role="radio"
                aria-checked={selected()}
                aria-label={paletteName(p)}
                onClick={() => choose(p.id)}
              >
                <span class={classes.swatches} aria-hidden="true">
                  {p.swatches.map(c => <span class={classes.swatch} style={{ background: c }} />)}
                </span>
                <span class={classes.name}>{selected() ? '✓ ' : ''}{paletteName(p)}</span>
                {p.light && <span class={classes.tag}>{t('dorion_gallery.light_unverified')}</span>}
                <span class={classes.credit}>
                  {p.credit ? `${p.credit.project} · ${p.credit.license}` : t('dorion_gallery.original')}
                </span>
              </button>
              <button
                class={classes.star}
                aria-pressed={favorite()}
                aria-label={t(favorite() ? 'dorion_gallery.unfavorite' : 'dorion_gallery.favorite', { name: paletteName(p) }) as string}
                onClick={() => toggleFavorite(p.id)}
              >
                {favorite() ? '★' : '☆'}
              </button>
            </div>
          )
        })}
      </div>

      <div class={classes.pbuttons}>
        <Button size={ButtonSizes.MEDIUM} disabled={!props.settings().gallery_base} onClick={exportCss}>
          {t('dorion_gallery.export')}
        </Button>
        <Button
          size={ButtonSizes.MEDIUM}
          color={ButtonColors.RED}
          disabled={!props.settings().gallery_base}
          onClick={() => update(s => ({ ...s, gallery_base: '', gallery_palette: '' }))}
        >
          {t('dorion_gallery.disable_all')}
        </Button>
      </div>
      <Text class={classes.note}>{t('dorion_gallery.priority_note')}</Text>

      <details class={classes.credits}>
        <summary>{t('dorion_gallery.credits')}</summary>
        {credits().map(c => (
          <div class={classes.creditrow}>
            <Text>
              {c.what}: {c.author}, {c.license}, github.com/{c.repo} @ {c.commit.slice(0, 7)}
            </Text>
            <Button size={ButtonSizes.SMALL} onClick={() => toggleLicense(c.repo)}>
              {t(openLicense() === c.repo ? 'dorion_gallery.hide_license' : 'dorion_gallery.show_license')}
            </Button>
            {openLicense() === c.repo && <pre class={classes.license}>{licenseText()}</pre>}
          </div>
        ))}
      </details>
    </>
  )
}
