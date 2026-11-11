import { backendRestartRequired, invoke } from '../../../api/api.js'
import { t } from '../../../util/i18n.js'
import { css, classes } from './CustomizePage.tsx.scss'
import { WarningCard } from '../components/WarningCard.jsx'
import { defaultConfig } from '../util/settings.js'
import { HIDEABLE_ELEMENTS, applyHiddenUi, validSelector } from '../util/hideUi.js'
import { applyAppearance, safeFont } from '../util/appearance.js'
import { Gallery } from '../components/Gallery.jsx'

const {
  ui: {
    Header, HeaderTags, SwitchItem, Button, ButtonSizes, ButtonColors, TextBox, TextArea, Text, Divider, Slider,
    Select, SelectOption, injectCss, showToast,
  },
  solid: { createSignal, createEffect },
} = shelter

let injectedCss = false

const toast = (title: string, content?: string) => showToast({ title, content, duration: 4000 })

const MAX_WALLPAPER_BYTES = 5 * 1024 * 1024
const CHAT_WIDTHS = [800, 1000, 1200, 1400, 1600, 2000]
const CORNERS = ['default', 'round', 'small', 'square']

export function CustomizePage() {
  const [settings, setSettingsState] = createSignal<DorionSettings>(defaultConfig)
  const [snapshots, setSnapshots] = createSignal<string[]>([])
  const [snapshotName, setSnapshotName] = createSignal('')
  const [restartRequired, setRestartRequired] = createSignal(false)
  const [platform, setPlatform] = createSignal('')
  // Raw text, so typing a new line is not undone by the cleanup of the saved list
  const [selectorText, setSelectorText] = createSignal('')
  let fileInput: HTMLInputElement
  let wallpaperInput: HTMLInputElement

  if (!injectedCss) {
    injectedCss = true
    injectCss(css)
  }

  const refreshSnapshots = async () => setSnapshots(await invoke('list_config_snapshots'))

  createEffect(async () => {
    const config = JSON.parse(await invoke('read_config_file'))
    setSettingsState(config)
    setSelectorText((config.custom_hidden_selectors ?? []).join('\n'))
    setPlatform(await invoke('get_platform'))
    refreshSnapshots()
  })

  const setSettings = (fn: (s: DorionSettings) => DorionSettings) => {
    setSettingsState(fn(settings()))
    invoke('write_config_file', { contents: JSON.stringify(settings()) })
  }

  const setAppearance = (fn: (s: DorionSettings) => DorionSettings) => {
    setSettings(fn)
    applyAppearance(settings())
  }

  const setFrame = (fn: (s: DorionSettings) => DorionSettings) => {
    setSettings(fn)
    invoke('set_window_frame', {
      border: settings().window_border_color ?? '',
      caption: settings().window_caption_color ?? '',
      corners: settings().window_corners ?? 'default',
    })
  }

  const needRestart = () => {
    setRestartRequired(true)
    backendRestartRequired(true)
  }

  const refreshHiddenUi = () => applyHiddenUi(settings().hidden_ui_elements, settings().custom_hidden_selectors)

  const toggleElement = (id: string, hide: boolean) => {
    setSettings(p => {
      const current = (p.hidden_ui_elements ?? []).filter(e => e !== id)
      return { ...p, hidden_ui_elements: hide ? [...current, id] : current }
    })
    refreshHiddenUi()
  }

  const setCustomSelectors = (text: string) => {
    setSelectorText(text)
    const list = text.split('\n').map(s => s.trim()).filter(Boolean)
    setSettings(p => ({ ...p, custom_hidden_selectors: list }))
    refreshHiddenUi()
  }

  const invalidSelectors = () => (settings().custom_hidden_selectors ?? []).filter(s => !validSelector(s))

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      const result = await fn()
      toast(ok, typeof result === 'string' ? result : undefined)
      return true
    } catch (e) {
      toast(t('dorion_customize.failed') as string, String(e))
      return false
    }
  }

  const importFile = async (file?: File) => {
    if (!file) return
    const contents = await file.text()
    if (await run(() => invoke('import_config', { contents }), t('dorion_customize.loaded') as string)) {
      needRestart()
    }
    fileInput.value = ''
  }

  const pickWallpaper = async (file?: File) => {
    wallpaperInput.value = ''
    if (!file) return
    if (file.size > MAX_WALLPAPER_BYTES) {
      toast(t('dorion_customize.failed') as string, t('dorion_customize.wallpaper_too_big') as string)
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const bytes = new Uint8Array(await file.arrayBuffer())

    await run(async () => {
      // Raw body and a header, so the image is not turned into a huge JSON array
      // @ts-expect-error womp womp
      const name = await window.__TAURI__.core.invoke('save_wallpaper', bytes, { headers: { 'x-ext': ext } })
      setSettings(p => ({ ...p, wallpaper_file: name }))
      await applyAppearance(settings(), true)
    }, t('dorion_customize.saved') as string)
  }

  const removeWallpaper = async () => {
    await invoke('remove_wallpaper')
    setAppearance(p => ({ ...p, wallpaper_file: '' }))
  }

  const ColorRow = (props: { label: string, value: string, fallback: string, onChange: (v: string) => void }) => (
    <div class={classes.row}>
      <Text class={classes.grow}>{props.label}</Text>
      <input
        type="color"
        class={classes.color}
        value={props.value || props.fallback}
        onInput={(e) => props.onChange(e.currentTarget.value)}
      />
      <Button size={ButtonSizes.SMALL} disabled={!props.value} onClick={() => props.onChange('')}>
        {t('dorion_customize.default')}
      </Button>
    </div>
  )

  return (
    <>
      <Header tag={HeaderTags.H1} class={classes.tophead}>{t('dorion_customize.title')}</Header>

      {restartRequired() && <WarningCard />}

      <Gallery settings={settings} setSettings={setSettings} />

      <Header class={classes.shead}>{t('dorion_customize.appearance')}</Header>
      <Text class={classes.note}>{t('dorion_customize.appearance_note')}</Text>

      <Header tag={HeaderTags.H4} class={classes.ohead}>{t('dorion_customize.font')}</Header>
      <TextBox
        value={settings().style_font ?? ''}
        placeholder="Inter, Segoe UI"
        onInput={(v) => setAppearance(p => ({ ...p, style_font: v }))}
      />
      {settings().style_font && !safeFont(settings().style_font) && (
        <Text class={classes.note}>{t('dorion_customize.font_invalid')}</Text>
      )}

      <ColorRow
        label={t('dorion_customize.accent') as string}
        value={settings().style_accent ?? ''}
        fallback="#5865f2"
        onChange={(v) => setAppearance(p => ({ ...p, style_accent: v }))}
      />

      <Header tag={HeaderTags.H4} class={classes.ohead}>{t('dorion_customize.chat_width')}</Header>
      <Select
        value={String(settings().style_chat_width ?? 0)}
        onChange={(v) => setAppearance(p => ({ ...p, style_chat_width: Number(v) }))}
      >
        <SelectOption value="0">{t('dorion_customize.default')}</SelectOption>
        {CHAT_WIDTHS.map(w => <SelectOption value={String(w)}>{`${w} px`}</SelectOption>)}
      </Select>

      <Header class={classes.shead}>{t('dorion_customize.wallpaper')}</Header>
      <Text class={classes.note}>{t('dorion_customize.wallpaper_note')}</Text>
      <div class={classes.pbuttons}>
        <Button size={ButtonSizes.MEDIUM} onClick={() => wallpaperInput.click()}>
          {t('dorion_customize.choose_wallpaper')}
        </Button>
        {settings().wallpaper_file && (
          <Button size={ButtonSizes.MEDIUM} color={ButtonColors.RED} onClick={removeWallpaper}>
            {t('dorion_customize.remove_wallpaper')}
          </Button>
        )}
        <input
          ref={wallpaperInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={(e) => pickWallpaper(e.currentTarget.files?.[0])}
        />
      </div>
      {settings().wallpaper_file && (
        <>
          <Header tag={HeaderTags.H4} class={classes.ohead}>{t('dorion_customize.wallpaper_blur')}</Header>
          <Slider
            min={0}
            max={30}
            steps={['0', '10', '20', '30']}
            step={1}
            tick={10}
            value={settings().wallpaper_blur ?? 0}
            onInput={(v) => setAppearance(p => ({ ...p, wallpaper_blur: Math.round(parseFloat(v)) }))}
          />
          <Header tag={HeaderTags.H4} class={classes.ohead}>{t('dorion_customize.wallpaper_dim')}</Header>
          <Slider
            min={0}
            max={90}
            steps={['0%', '30%', '60%', '90%']}
            step={5}
            tick={30}
            value={settings().wallpaper_dim ?? 50}
            onInput={(v) => setAppearance(p => ({ ...p, wallpaper_dim: Math.round(parseFloat(v)) }))}
          />
        </>
      )}

      <Header class={classes.shead}>{t('dorion_customize.window')}</Header>
      <Header tag={HeaderTags.H4} class={classes.ohead}>{t('dorion_customize.window_title')}</Header>
      <TextBox
        value={settings().window_title ?? ''}
        placeholder="Dorion"
        onInput={(v) => {
          setSettings(p => ({ ...p, window_title: v }))
          invoke('set_window_title', { title: v })
        }}
      />

      {platform() === 'windows' && (
        <>
          <Text class={classes.note}>{t('dorion_customize.frame_note')}</Text>
          <ColorRow
            label={t('dorion_customize.border_color') as string}
            value={settings().window_border_color ?? ''}
            fallback="#5865f2"
            onChange={(v) => setFrame(p => ({ ...p, window_border_color: v }))}
          />
          <ColorRow
            label={t('dorion_customize.caption_color') as string}
            value={settings().window_caption_color ?? ''}
            fallback="#1e1f22"
            onChange={(v) => setFrame(p => ({ ...p, window_caption_color: v }))}
          />
          <Header tag={HeaderTags.H4} class={classes.ohead}>{t('dorion_customize.corners')}</Header>
          <Select
            value={settings().window_corners ?? 'default'}
            onChange={(v) => setFrame(p => ({ ...p, window_corners: String(v) }))}
          >
            {CORNERS.map(c => <SelectOption value={c}>{t(`dorion_customize.corners_${c}`)}</SelectOption>)}
          </Select>
        </>
      )}

      <Header class={classes.shead}>{t('dorion_customize.hide_ui')}</Header>
      {HIDEABLE_ELEMENTS.map(e => (
        <SwitchItem
          value={(settings().hidden_ui_elements ?? []).includes(e.id)}
          onChange={(v) => toggleElement(e.id, v)}
          note={t('dorion_customize.fragile')}
        >
          {t(`dorion_customize.el_${e.id}`)}
        </SwitchItem>
      ))}

      <Header tag={HeaderTags.H4} class={classes.ohead}>{t('dorion_customize.custom_selectors')}</Header>
      <Text class={classes.note}>{t('dorion_customize.custom_selectors_note')}</Text>
      <TextArea
        mono
        resize-y
        value={selectorText()}
        placeholder={'[class*="giftButton"]\n[aria-label="Apps"]'}
        onInput={setCustomSelectors}
      />
      {invalidSelectors().length > 0 && (
        <Text class={classes.note}>
          {t('dorion_customize.custom_selectors_invalid', { list: invalidSelectors().join(', ') })}
        </Text>
      )}

      <Header class={classes.shead}>{t('dorion_customize.config_profiles')}</Header>
      <Text class={classes.note}>{t('dorion_customize.config_profiles_note')}</Text>

      <div class={classes.row}>
        <TextBox
          value={snapshotName()}
          onInput={setSnapshotName}
          placeholder={t('dorion_customize.profile_name') as string}
        />
        <Button
          size={ButtonSizes.MEDIUM}
          onClick={async () => {
            await run(() => invoke('save_config_snapshot', { name: snapshotName() }), t('dorion_customize.saved') as string)
            refreshSnapshots()
          }}
        >
          {t('dorion_customize.save_profile')}
        </Button>
      </div>

      {snapshots().map(name => (
        <div class={classes.row}>
          <Text class={classes.grow}>{name}</Text>
          <Button
            size={ButtonSizes.SMALL}
            onClick={async () => {
              if (await run(() => invoke('load_config_snapshot', { name }), t('dorion_customize.loaded') as string)) {
                needRestart()
              }
            }}
          >
            {t('dorion_customize.load_profile')}
          </Button>
          <Button
            size={ButtonSizes.SMALL}
            color={ButtonColors.RED}
            onClick={async () => {
              await run(() => invoke('delete_config_snapshot', { name }), t('dorion_customize.deleted') as string)
              refreshSnapshots()
            }}
          >
            {t('dorion_customize.delete_profile')}
          </Button>
        </div>
      ))}

      <div class={classes.pbuttons}>
        <Button
          size={ButtonSizes.MEDIUM}
          onClick={() => run(() => invoke('export_to_downloads', { kind: 'config' }), t('dorion_customize.saved') as string)}
        >
          {t('dorion_customize.export_config')}
        </Button>
        <Button size={ButtonSizes.MEDIUM} onClick={() => fileInput.click()}>
          {t('dorion_customize.import_config')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => importFile(e.currentTarget.files?.[0])}
        />
      </div>

      <Divider mt={16} mb={16} />

      <Header class={classes.shead}>{t('dorion_customize.safe_mode')}</Header>
      <Text class={classes.note}>{t('dorion_customize.safe_mode_note')}</Text>
      <div class={classes.pbuttons}>
        <Button size={ButtonSizes.MEDIUM} color={ButtonColors.RED} onClick={() => invoke('restart_in_safemode')}>
          {t('dorion_customize.restart_safe_mode')}
        </Button>
      </div>
    </>
  )
}
