import { invoke } from '../../../api/api.js'
import { t } from '../../../util/i18n.js'
import { reloadThemes } from '../../../util/theme.js'
import { css, classes } from './ThemesPage.tsx.scss'
import { installThemeModal } from '../util/theme.jsx'
import { defaultConfig } from '../util/settings.js'

const {
  ui: { Header, Button, HeaderTags, injectCss, Divider, ButtonSizes, Select, SelectOption, Switch, SwitchItem, Text, showToast },
  solid: { createSignal, createEffect },
} = shelter

let injectedCss = false

export function ThemesPage() {
  if (!injectedCss) {
    injectedCss = true
    injectCss(css)
  }

  const [settings, setSettingsState] = createSignal<DorionSettings>(defaultConfig)
  const [themes, setThemes] = createSignal<DorionTheme[]>([])

  const getThemes = async () => {
    const themes: string[] = await invoke('get_theme_names')
    return themes.map((t: string) => ({
      label: t.replace(/"/g, '').replace('.css', '').replace('.theme', ''),
      value: t.replace(/"/g, ''),
    }))
  }

  createEffect(async () => {
    const settings = JSON.parse(await invoke('read_config_file'))

    if (!settings.themes) {
      settings.themes = []
    }

    setSettingsState(settings)
    setThemes(await getThemes())
  })

  const setSettings = (fn: (DorionSettings) => DorionSettings) => {
    setSettingsState(fn(settings()))

    // Save the settings
    invoke('write_config_file', {
      contents: JSON.stringify(fn(settings())),
    })
  }

  const moveTheme = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= settings().themes.length) return

    setSettings(p => {
      const themes = [...p.themes]
      ;[themes[index], themes[target]] = [themes[target], themes[index]]
      return { ...p, themes }
    })
    reloadThemes()
  }

  const setThemeEnabled = (theme: string, enabled: boolean) => {
    setSettings(p => {
      const disabled = (p.disabled_themes ?? []).filter(t => t !== theme)
      return { ...p, disabled_themes: enabled ? disabled : [...disabled, theme] }
    })
    reloadThemes()
  }

  let themeInput: HTMLInputElement

  const importThemeFile = async (file?: File) => {
    themeInput.value = ''
    if (!file) return

    try {
      const name: string = await invoke('import_theme', { name: file.name, contents: await file.text() })
      setThemes(await getThemes())
      appendTheme('', name)
      reloadThemes()
      showToast({ title: t('dorion_themes.imported', { name }) as string, duration: 4000 })
    } catch (e) {
      showToast({ title: t('dorion_themes.import_failed') as string, content: String(e), duration: 4000 })
    }
  }

  const setHotReload = (enable: boolean) => {
    setSettings(p => ({ ...p, theme_hot_reload: enable }))
    invoke('set_theme_hot_reload', { enable })
  }

  const openThemesFolder = () => {
    invoke('open_themes')
  }

  const appendTheme = async (last: string, theme: string) => {
    if (!theme) return

    if (theme === '' || theme === 'none') {
      // Remove the previous entry this used to be
      setSettings(p => {
        return {
          ...p,
          themes: p.themes.filter(t => t !== last),
        }
      })

      return
    }

    // Add the new entry, remove the last
    setSettings(p => {
      return {
        ...p,
        themes: [...p.themes.filter(t => t !== last && t !== theme), theme],
      }
    })
  }
  return (
    <>
      <Header tag={HeaderTags.H1} class={classes.tophead}>{t('dorion_themes.title')}</Header>

      <Header class={classes.shead}>{t('dorion_themes.theme')}</Header>

      {settings().themes.length > 1 && (
        <Text class={classes.note}>{t('dorion_themes.order_note')}</Text>
      )}

      {
        settings().themes.map((theme, index) => (
          <div class={classes.themerow}>
            <Select
              style={{ 'margin-bottom': '8px', 'flex-grow': 1 }}
              value={theme}
              onChange={(v) => {
                appendTheme(theme, String(v))
                reloadThemes()
              }}
            >
              <SelectOption value="none">{t('dorion_themes.none')}</SelectOption>
              {themes().map((o) => (
                <SelectOption value={o.value}>{o.label}</SelectOption>
              ))}
            </Select>
            <Button size={ButtonSizes.ICON} tooltip={t('dorion_themes.move_up')} disabled={index === 0} onClick={() => moveTheme(index, -1)}>↑</Button>
            <Button size={ButtonSizes.ICON} tooltip={t('dorion_themes.move_down')} disabled={index === settings().themes.length - 1} onClick={() => moveTheme(index, 1)}>↓</Button>
            <Switch
              checked={!(settings().disabled_themes ?? []).includes(theme)}
              tooltip={t('dorion_themes.enabled')}
              onChange={(v) => setThemeEnabled(theme, v)}
            />
          </div>
        )
        )
      }

      <Select
        style={{ 'margin-bottom': '8px' }}
        onChange={(v) => {
          appendTheme('none', String(v))
          reloadThemes()
        }}
        placeholder={t('dorion_themes.select_theme')}
      >
        {themes().map((o) => (
          <SelectOption value={o.value}>{o.label}</SelectOption>
        ))}
      </Select>

      <Divider mt={16} mb={16} />

      <div class={classes.pbuttons}>
        <Button size={ButtonSizes.MEDIUM} onClick={() => installThemeModal((theme: string) => appendTheme('', theme))}>{t('dorion_themes.install_from_link')}</Button>
        <Button size={ButtonSizes.MEDIUM} onClick={() => themeInput.click()}>{t('dorion_themes.import_file')}</Button>
        <Button size={ButtonSizes.MEDIUM} onClick={openThemesFolder}>{t('dorion_themes.open_folder')}</Button>
        <input
          ref={themeInput}
          type="file"
          accept=".css,text/css"
          style={{ display: 'none' }}
          onChange={(e) => importThemeFile(e.currentTarget.files?.[0])}
        />
      </div>

      <SwitchItem
        value={settings().theme_hot_reload ?? false}
        onChange={setHotReload}
        note={t('dorion_themes.hot_reload_note')}
      >
        {t('dorion_themes.hot_reload')}
      </SwitchItem>
    </>
  )
}
