import { backendRestartRequired, invoke } from '../../../api/api.js'
import { t } from '../../../util/i18n.js'
import { css, classes } from './CustomizePage.tsx.scss'
import { WarningCard } from '../components/WarningCard.jsx'
import { defaultConfig } from '../util/settings.js'
import { HIDEABLE_ELEMENTS, applyHiddenUi } from '../util/hideUi.js'

const {
  ui: { Header, HeaderTags, SwitchItem, Button, ButtonSizes, ButtonColors, TextBox, Text, Divider, injectCss, showToast },
  solid: { createSignal, createEffect },
} = shelter

let injectedCss = false

const toast = (title: string, content?: string) => showToast({ title, content, duration: 4000 })

export function CustomizePage() {
  const [settings, setSettingsState] = createSignal<DorionSettings>(defaultConfig)
  const [snapshots, setSnapshots] = createSignal<string[]>([])
  const [snapshotName, setSnapshotName] = createSignal('')
  const [restartRequired, setRestartRequired] = createSignal(false)
  let fileInput: HTMLInputElement

  if (!injectedCss) {
    injectedCss = true
    injectCss(css)
  }

  const refreshSnapshots = async () => setSnapshots(await invoke('list_config_snapshots'))

  createEffect(async () => {
    setSettingsState(JSON.parse(await invoke('read_config_file')))
    refreshSnapshots()
  })

  const setSettings = (fn: (s: DorionSettings) => DorionSettings) => {
    setSettingsState(fn(settings()))
    invoke('write_config_file', { contents: JSON.stringify(settings()) })
  }

  const needRestart = () => {
    setRestartRequired(true)
    backendRestartRequired(true)
  }

  const toggleElement = (id: string, hide: boolean) => {
    setSettings(p => {
      const current = (p.hidden_ui_elements ?? []).filter(e => e !== id)
      return { ...p, hidden_ui_elements: hide ? [...current, id] : current }
    })
    applyHiddenUi(settings().hidden_ui_elements)
  }

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

  return (
    <>
      <Header tag={HeaderTags.H1} class={classes.tophead}>{t('dorion_customize.title')}</Header>

      {restartRequired() && <WarningCard />}

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
