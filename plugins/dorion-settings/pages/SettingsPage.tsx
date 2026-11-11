import { appDisplayName, backendRestartRequired, invoke } from '../../../api/api.js'
import { t } from '../../../util/i18n.js'
import { css, classes } from './SettingsPage.tsx.scss'
import { WarningCard } from '../components/WarningCard.jsx'
import { RadioGroup } from '../../../components/RadioGroup.jsx'
import { defaultConfig } from '../util/settings.js'

const {
  ui: {
    SwitchItem,
    Header,
    HeaderTags,
    Slider,
    Text,
    injectCss,
  },
  solid: { createSignal, createEffect },
} = shelter

let injectedCss = false

export function SettingsPage() {
  const [settings, setSettingsState] = createSignal<DorionSettings>(defaultConfig)
  const [restartRequired, setRestartRequired] = createSignal(false)

  if (!injectedCss) {
    injectedCss = true
    injectCss(css)
  }

  createEffect(async () => {
    setSettingsState(JSON.parse(await invoke('read_config_file')))

    // @ts-expect-error cry about it
    setRestartRequired(window?.__DORION_RESTART__ === true)
  })

  const setSettings = (fn: (DorionSettings) => DorionSettings, requiresRestart?: boolean) => {
    setSettingsState(fn(settings()))

    // Save the settings
    invoke('write_config_file', {
      contents: JSON.stringify(fn(settings())),
    })

    // If a restart is now required, set that
    if (requiresRestart) {
      setRestartRequired(true)
      backendRestartRequired(true)
    }
  }

  const setOpacity = (raw: number) => {
    if (!Number.isFinite(raw)) return
    const value = Math.min(100, Math.max(20, Math.round(raw)))
    setSettings(p => ({ ...p, window_opacity: value }))
    invoke('set_window_opacity', { value })
  }

  return (
    <>
      <Header tag={HeaderTags.H1} class={classes.tophead}>{t('dorion_settings.title', { appName: appDisplayName })}</Header>

      {restartRequired() && (
        <WarningCard />
      )}

      <Header class={classes.shead}>{t('dorion_settings.language')}</Header>
      <RadioGroup
        options={[
          { label: t('dorion_settings.language_auto'), value: 'auto' },
          { label: 'English', value: 'en' },
          { label: 'Français', value: 'fr' },
        ]}
        onChange={(e) => {
          setSettings(p => ({ ...p, language: e }), true)
        }}
        selected={settings().language ?? 'auto'}
      />
      <Text class={classes.note}>{t('dorion_settings.language_note', { appName: appDisplayName })}</Text>

      <Header class={classes.shead}>{t('dorion_settings.client_type')}</Header>
      <RadioGroup
        options={[
          {
            label: t('dorion_settings.client_type_default'),
            value: 'default',
          },
          {
            label: t('dorion_settings.client_type_ptb'),
            value: 'ptb',
          },
          {
            label: t('dorion_settings.client_type_canary'),
            value: 'canary',
          },
        ]}
        onChange={(e) => {
          setSettings(
            p => {
              return {
                ...p,
                client_type: e,
              }
            },
            true
          )
        }}
        selected={settings().client_type}
      />

      <Header class={classes.shead}>{t('dorion_settings.window')}</Header>
      <Header tag={HeaderTags.H4} style="" class={classes.ohead}>{t('dorion_settings.zoom_level')}</Header>
      <Slider
        min={50}
        max={125}
        steps={
          Array.from(Array(16).keys()).map(i => (i * 5 + 50) + '%')
        }
        step={5}
        value={parseFloat(settings().zoom) * 100}
        onInput={(v) => {
          setSettings(p => {
            return {
              ...p,
              zoom: (parseFloat(v) / 100).toString(),
            }
          })

          invoke('window_zoom_level', {
            value: parseFloat(v) / 100,
          })
        }}
        tick={25}
      />
      <SwitchItem
        value={settings().sys_tray}
        onChange={(v) => {
          setSettings(
            p => {
              return {
                ...p,
                sys_tray: v,
              }
            },
            true
          )
        }}
        note={t('dorion_settings.sys_tray_note', { appName: appDisplayName })}
      >
        {t('dorion_settings.sys_tray')}
      </SwitchItem>

      <SwitchItem
        value={settings().start_maximized}
        onChange={(v) => {
          setSettings(p => {
            return {
              ...p,
              start_maximized: v,
            }
          })
        }}
      >
        {t('dorion_settings.start_maximized')}
      </SwitchItem>

      <SwitchItem
        value={settings().always_on_top}
        onChange={(v) => {
          setSettings(p => ({ ...p, always_on_top: v }))
          invoke('set_always_on_top', { value: v })
        }}
      >
        {t('dorion_settings.always_on_top')}
      </SwitchItem>

      <Header tag={HeaderTags.H4} class={classes.ohead}>{t('dorion_settings.window_opacity')}</Header>
      <div class={classes.opacityrow}>
        <div class={classes.grow}>
          <Slider
            min={20}
            max={100}
            steps={['20%', '40%', '60%', '80%', '100%']}
            step={1}
            value={settings().window_opacity ?? 100}
            onInput={(v) => setOpacity(parseFloat(v))}
            tick={20}
          />
        </div>
        {/* exact value; applied on Enter or blur so a partial "2" is not clamped to 20 while typing */}
        <input
          type="number"
          min="20"
          max="100"
          step="1"
          class={classes.opacityinput}
          aria-label={t('dorion_settings.window_opacity') as string}
          value={settings().window_opacity ?? 100}
          onChange={(e) => setOpacity(e.currentTarget.valueAsNumber)}
        />
        <Text>%</Text>
      </div>
      <Text class={classes.note}>{t('dorion_settings.window_opacity_note')}</Text>

      <Header class={classes.shead}>{t('dorion_settings.startup')}</Header>
      <SwitchItem
        value={settings().open_on_startup}
        onChange={(v) => {
          setSettings(p => {
            return {
              ...p,
              open_on_startup: v,
              startup_minimized: v ? p.startup_minimized : false,
            }
          })
        }}
        note={t('dorion_settings.open_on_startup_note', { appName: appDisplayName })}
      >
        {t('dorion_settings.open_on_startup')}
      </SwitchItem>

      <SwitchItem
        value={settings().startup_minimized}
        disabled={!settings().open_on_startup}
        onChange={(v) => {
          setSettings(p => {
            return {
              ...p,
              startup_minimized: v,
            }
          })
        }}
        note={t('dorion_settings.start_minimized_note')}
      >
        {t('dorion_settings.start_minimized')}
      </SwitchItem>

      <Header class={classes.shead}>{t('dorion_settings.misc')}</Header>
      <SwitchItem
        value={settings().multi_instance}
        onChange={(v) => {
          setSettings(
            p => {
              return {
                ...p,
                multi_instance: v,
              }
            },
            true
          )
        }}
        note={t('dorion_settings.multi_instance_note', { appName: appDisplayName })}
      >
        {t('dorion_settings.multi_instance')}
      </SwitchItem>

      <SwitchItem
        value={settings().use_native_titlebar}
        onChange={(v) => {
          setSettings(
            p => {
              return {
                ...p,
                use_native_titlebar: v,
              }
            },
            true
          )
        }}
        note={t('dorion_settings.use_native_titlebar_note')}
      >
        {t('dorion_settings.use_native_titlebar')}
      </SwitchItem>

      <Header class={classes.shead}>{t('dorion_settings.updates')}</Header>
      <SwitchItem
        value={settings().autoupdate}
        onChange={(v) => {
          setSettings(p => {
            return {
              ...p,
              autoupdate: v,
              update_notify: v ? p.update_notify : false,
            }
          })
        }}
        note={
          <>
            {t('dorion_settings.autoupdate_note', {
              appName: appDisplayName,
              shelterPluginsLink: <a href="https://github.com/SpikeHD/shelter-plugins" target="_blank">
                {t('common.spikehd_shelter_plugins')}
              </a>
            })}
          </>
        }
      >
        {t('dorion_settings.autoupdate')}
      </SwitchItem>

      <SwitchItem
        value={
          settings().update_notify === undefined || settings().update_notify
        }
        onChange={(v) => {
          setSettings(p => {
            return {
              ...p,
              update_notify: v,
            }
          })
        }}
        disabled={settings().autoupdate}
      >
        {t('dorion_settings.update_notify')}
      </SwitchItem>
    </>
  )
}
