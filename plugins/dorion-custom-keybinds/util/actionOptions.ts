import { t } from '../../../util/i18n.js'

export const fallbackActionTypes: KeybindActionType[] = [
  { value: 'UNASSIGNED', label: 'Unassigned' },
  { value: 'TOGGLE_MUTE', label: 'Toggle Mute' },
  { value: 'TOGGLE_DEAFEN', label: 'Toggle Deafen' },
  { value: 'TOGGLE_STREAMER_MODE', label: 'Toggle Streamer Mode' },
  { value: 'TOGGLE_VOICE_MODE', label: 'Toggle Voice Mode' },
  { value: 'PUSH_TO_TALK', label: 'Push to Talk' },
  { value: 'PUSH_TO_TALK_PRIORITY', label: 'Priority Push to Talk' },
  { value: 'PUSH_TO_MUTE', label: 'Push to Mute' },
]

export const fallbackActionDescriptions: KeybindDescription = {
  UNASSIGNED: 'Choose an action for this keybind.',
  TOGGLE_MUTE: 'Toggle your microphone on or off.',
  TOGGLE_DEAFEN: 'Toggle deafening on or off.',
  TOGGLE_STREAMER_MODE: 'Toggle Streamer Mode on or off.',
  TOGGLE_VOICE_MODE: 'Switch between Voice Activity and Push to Talk.',
  PUSH_TO_TALK: 'Hold to talk.',
  PUSH_TO_TALK_PRIORITY: 'Hold to talk with priority.',
  PUSH_TO_MUTE: 'Hold to mute your microphone.',
}

// fraxy/settings-options: handled by Dorion itself (hotkeys.rs), never sent to Discord
export const windowActionTypes = (): KeybindActionType[] => [
  { value: 'DORION_TOGGLE_WINDOW', label: t('dorion_keybinds.action_toggle_window') as string },
  { value: 'DORION_TOGGLE_ON_TOP', label: t('dorion_keybinds.action_toggle_on_top') as string },
  { value: 'DORION_CYCLE_OPACITY', label: t('dorion_keybinds.action_cycle_opacity') as string },
]

export const windowActionDescriptions = (): KeybindDescription => ({
  DORION_TOGGLE_WINDOW: t('dorion_keybinds.action_toggle_window_note') as string,
  DORION_TOGGLE_ON_TOP: t('dorion_keybinds.action_toggle_on_top_note') as string,
  DORION_CYCLE_OPACITY: t('dorion_keybinds.action_cycle_opacity_note') as string,
})
