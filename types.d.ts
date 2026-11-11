interface DorionSettings {
  // Deprecated
  theme: string;

  themes: string[];
  zoom: string;
  client_type: string;
  sys_tray: boolean;
  push_to_talk: boolean;
  push_to_talk_keys: string[];
  cache_css: boolean;
  use_native_titlebar: boolean;
  start_maximized: boolean;
  profile: string;
  streamer_mode_detection: boolean;
  rpc_server: boolean;
  open_on_startup: boolean;
  startup_minimized: boolean;
  autoupdate: boolean;
  update_notify: boolean;
  desktop_notifications: boolean;
  auto_clear_cache: boolean;
  multi_instance: boolean;
  disable_hardware_accel: boolean;
  blur: string;
  blur_css: boolean;
  client_mods: string[];
  unread_badge: boolean;
  client_plugins: boolean;

  tray_icon_enabled: boolean;
  proxy_uri: string;

  keybinds: Record<string, KeyStruct[]>;
  keybinds_enabled: boolean;

  win7_style_notifications: boolean;

  // RPC-specific options
  rpc_port: number;
  rpc_process_scanner: boolean;
  rpc_ipc_connector: boolean;
  rpc_websocket_connector: boolean;
  rpc_secondary_events: boolean;

  // fraxy/settings-options
  always_on_top: boolean;
  window_opacity: number;
  webview_args: string;
  disable_hw_video_encode: boolean;
  low_memory_when_hidden: boolean;
  hidden_ui_elements: string[];
  disabled_themes: string[];
  language: string;
  custom_hidden_selectors: string[];
  window_border_color: string;
  window_caption_color: string;
  window_corners: string;
  window_title: string;
  theme_hot_reload: boolean;
  style_font: string;
  style_accent: string;
  style_chat_width: number;
  wallpaper_file: string;
  wallpaper_blur: number;
  wallpaper_dim: number;
}

interface DorionTheme {
  label: string
  value: string
}

interface DorionPluginList {
  // Key is the filename
  [key: string]: {
    name: string
    preload: boolean
    enabled: boolean
  }
}

interface ShelteRPCPreviouslyPlayed {
  name: string
  lastPlayed: number
  hide: boolean
  local?: boolean
  appid: string
}

interface ShelteRPCStore {
  currentlyPlaying: string
  previouslyPlayed: ShelteRPCPreviouslyPlayed[]
}

interface ProcessWindow {
  title: string
  pid: string
  process_name: string
}

interface BasicModalProps {
  header: string
  body: string
}

interface ConfirmationModalProps {
  header: string
  body: string
  confirmText: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  type?: 'neutral' | 'danger' | 'warning'
}

interface Backend {
  name: string
  invoke: (name: string, args?: any) => Promise<any>
  event: {
    emit: (name: string, args?: any) => void
    listen: (name: string, cb: (args: any) => void) => Promise<void>
  }
  app: {
    getVersion: () => string
  }
  process: {
    relaunch: () => void
  }
  apiWindow: {
    appWindow: {
      setFullscreen: (isFullscreen: boolean) => void
    }
  }
}

interface KeyStruct {
  name: string
  code: string
}

interface Keybind {
  key: string
  keys: KeyStruct[]
}

interface KeybindActionType {
  label: string
  value: string
}

interface KeybindDescription {
  [key: string]: string
}

interface KeybindActionsInternal {
  [key: string]: {
    storeValue?: {
      store: string
      key: string
      eventKey: string
      modify: (event: any, store: any) => any
    }
    press?: {
      [key: string]: any
    }[]
    release?: {
      [key: string]: any
    }[]
  }
}

// Global window types for Dorion
declare global {
  interface Window {
    __DORION_LANG?: string
    __DORION_TRANSLATIONS?: {
      [key: string]: Record<string, unknown>
    }
    __DORION_RESTART?: boolean
    __DORION_CONFIG__?: DorionSettings
  }
}
