import { invoke } from '../../../api/api.js'
import { t } from '../../../util/i18n.js'
import { ClientModList } from '../components/ClientModList.jsx'
import { PluginList } from '../components/PluginList.jsx'
import { css, classes } from './PluginsPage.tsx.scss'
import { WarningCard } from '../components/WarningCard.jsx'

const {
  ui: { Header, Button, HeaderTags, injectCss, ButtonSizes, showToast },
  solid: { createSignal },
} = shelter

let injectedCss = false

export function PluginsPage() {
  const [restartRequired , setRestartRequired] = createSignal(false)

  if (!injectedCss) {
    injectedCss = true
    injectCss(css)
  }

  const openPluginsFolder = () => {
    invoke('open_plugins')
  }

  const openExtensionsFolder = () => {
    invoke('open_extensions')
  }

  let fileInput: HTMLInputElement

  const importPlugin = async (file?: File) => {
    if (!file) return
    try {
      await invoke('import_plugin', { name: file.name, contents: await file.text() })
      showToast({ title: t('dorion_plugins.import_done') as string, duration: 4000 })
      setRestartRequired(true)
    } catch (e) {
      showToast({ title: t('dorion_plugins.import_failed') as string, content: String(e), duration: 6000 })
    }
    fileInput.value = ''
  }

  const exportPlugins = async () => {
    try {
      const path: string = await invoke('export_to_downloads', { kind: 'plugins' })
      showToast({ title: t('dorion_plugins.export_plugins') as string, content: path, duration: 6000 })
    } catch (e) {
      showToast({ title: t('dorion_plugins.import_failed') as string, content: String(e), duration: 6000 })
    }
  }

  return (
    <>
      <Header tag={HeaderTags.H1} class={classes.tophead}>{t('dorion_plugins.title')}</Header>

      {restartRequired() && (
        <WarningCard />
      )}

      <Header class={classes.shead}>{t('dorion_plugins.client_mods')}</Header>

      <ClientModList
        onChange={() => {
          setRestartRequired(true)
        }}
      />
      
      <Header class={classes.shead}>{t('dorion_plugins.plugins')}</Header>

      <PluginList
        onChange={() => {
          setRestartRequired(true)
        }}
      />

      <div class={classes.pbuttons}>
        <Button
          size={ButtonSizes.MEDIUM}
          class={classes.openButton}
          style={{ width: '100%', padding: '18px' }}
          grow={true}
          onClick={openPluginsFolder}
        >
          {t('dorion_plugins.open_plugins_folder')}
        </Button>

        <Button
          size={ButtonSizes.MEDIUM}
          class={classes.openButton}
          style={{ width: '100%', padding: '18px' }}
          grow={true}
          onClick={openExtensionsFolder}
        >
          {t('dorion_plugins.open_extensions_folder')}
        </Button>
      </div>

      <div class={classes.pbuttons}>
        <Button
          size={ButtonSizes.MEDIUM}
          style={{ width: '100%', padding: '18px' }}
          grow={true}
          onClick={() => fileInput.click()}
        >
          {t('dorion_plugins.import_plugin')}
        </Button>

        <Button
          size={ButtonSizes.MEDIUM}
          style={{ width: '100%', padding: '18px' }}
          grow={true}
          onClick={exportPlugins}
        >
          {t('dorion_plugins.export_plugins')}
        </Button>

        <input
          ref={fileInput}
          type="file"
          accept=".js,text/javascript"
          style={{ display: 'none' }}
          onChange={(e) => importPlugin(e.currentTarget.files?.[0])}
        />
      </div>
    </>
  )
}
