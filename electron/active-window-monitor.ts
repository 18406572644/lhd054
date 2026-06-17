import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ActiveWindowInfo {
  processName: string
  windowTitle: string
  appName: string
}

let currentActiveWindow: ActiveWindowInfo = {
  processName: 'Unknown',
  windowTitle: '',
  appName: '未知应用'
}

let monitorInterval: NodeJS.Timeout | null = null
let isMonitoring = false

const EXE_TO_APP_NAME: Record<string, string> = {
  'Code.exe': 'VS Code',
  'devenv.exe': 'Visual Studio',
  'chrome.exe': 'Google Chrome',
  'msedge.exe': 'Microsoft Edge',
  'firefox.exe': 'Firefox',
  'WeChat.exe': '微信',
  'WeChatWork.exe': '企业微信',
  'QQ.exe': 'QQ',
  'TIM.exe': 'TIM',
  'DingtalkLauncher.exe': '钉钉',
  'Feishu.exe': '飞书',
  'Lark.exe': '飞书',
  'WXWork.exe': '企业微信',
  'Excel.exe': 'Excel',
  'WINWORD.EXE': 'Word',
  'POWERPNT.EXE': 'PowerPoint',
  'ONENOTE.EXE': 'OneNote',
  'OUTLOOK.EXE': 'Outlook',
  'ms-teams.exe': 'Microsoft Teams',
  'Teams.exe': 'Microsoft Teams',
  'slack.exe': 'Slack',
  'Spotify.exe': 'Spotify',
  'Notion.exe': 'Notion',
  'Obsidian.exe': 'Obsidian',
  'Typora.exe': 'Typora',
  'Sublime Text.exe': 'Sublime Text',
  'sublime_text.exe': 'Sublime Text',
  'atom.exe': 'Atom',
  'WebStorm.exe': 'WebStorm',
  'idea64.exe': 'IntelliJ IDEA',
  'pycharm64.exe': 'PyCharm',
  'goland64.exe': 'GoLand',
  'CLion64.exe': 'CLion',
  'Rider64.exe': 'Rider',
  'phpstorm64.exe': 'PhpStorm',
  'datagrip64.exe': 'DataGrip',
  'rubymine64.exe': 'RubyMine',
  'appcode64.exe': 'AppCode',
  'jbr.exe': 'JetBrains Runtime',
  'navicat.exe': 'Navicat',
  'Postman.exe': 'Postman',
  'Fiddler.exe': 'Fiddler',
  'Charles.exe': 'Charles',
  'wemeetapp.exe': '腾讯会议',
  'wemeet.exe': '腾讯会议',
  'zoom.exe': 'Zoom',
  'Discord.exe': 'Discord',
  'Telegram.exe': 'Telegram',
  'WhatsApp.exe': 'WhatsApp',
  'Skype.exe': 'Skype',
  'LINE.exe': 'LINE',
  'explorer.exe': '文件资源管理器',
  'Taskmgr.exe': '任务管理器',
  'cmd.exe': '命令提示符',
  'powershell.exe': 'PowerShell',
  'WindowsTerminal.exe': 'Windows Terminal',
  'git-bash.exe': 'Git Bash',
  'bash.exe': 'Bash',
  'python.exe': 'Python',
  'pythonw.exe': 'Python',
  'node.exe': 'Node.js',
  'java.exe': 'Java',
  'javaw.exe': 'Java',
  'dotnet.exe': '.NET',
  'Unity.exe': 'Unity',
  'UnrealEditor.exe': 'Unreal Engine',
  'blender.exe': 'Blender',
  'Photoshop.exe': 'Photoshop',
  'Illustrator.exe': 'Illustrator',
  'Premiere Pro.exe': 'Premiere Pro',
  'AfterFX.exe': 'After Effects',
  'InDesign.exe': 'InDesign',
  'Acrobat.exe': 'Adobe Acrobat',
  'AcroRd32.exe': 'Adobe Reader',
  'Foxit Reader.exe': 'Foxit Reader',
  'SumatraPDF.exe': 'Sumatra PDF',
  'XMind.exe': 'XMind',
  'Xmind.exe': 'XMind',
  'MindMaster.exe': 'MindMaster',
  'Everything.exe': 'Everything',
  'Listary.exe': 'Listary',
  'utools.exe': 'uTools',
  'PowerToys.exe': 'PowerToys',
  'Snipaste.exe': 'Snipaste',
  'ScreenToGif.exe': 'ScreenToGif',
  'OBS.exe': 'OBS Studio',
  'obs64.exe': 'OBS Studio',
  'ffmpeg.exe': 'FFmpeg',
  'HandBrake.exe': 'HandBrake',
  'PotPlayerMini.exe': 'PotPlayer',
  'PotPlayer.exe': 'PotPlayer',
  'vlc.exe': 'VLC',
  'wmplayer.exe': 'Windows Media Player',
  'Music.UI.exe': 'Groove 音乐',
  'Videos.UI.exe': '电影和电视',
  'PhotosApp.exe': '照片',
  'calc.exe': '计算器',
  'Notepad.exe': '记事本',
  'notepad++.exe': 'Notepad++',
  'mspaint.exe': '画图',
  'WinRAR.exe': 'WinRAR',
  '7zFM.exe': '7-Zip',
  'Bandizip.exe': 'Bandizip',
  'Thunder.exe': '迅雷',
  'QQLive.exe': '腾讯视频',
  'QiyiService.exe': '爱奇艺',
  'YoukuClient.exe': '优酷',
  'bilibili.exe': '哔哩哔哩',
  'wechatweb.exe': '微信公众号',
  'KuGou.exe': '酷狗音乐',
  'QQMusic.exe': 'QQ音乐',
  'Netease Cloud Music.exe': '网易云音乐',
  'cloudmusic.exe': '网易云音乐',
  'KwMusic.exe': '酷我音乐',
  'xiami.exe': '虾米音乐',
  'Game.exe': '游戏',
  'Steam.exe': 'Steam',
  'EpicGamesLauncher.exe': 'Epic Games',
  'WeGame.exe': 'WeGame',
  'Battle.net.exe': '战网',
  'Origin.exe': 'Origin',
  'Uplay.exe': 'Uplay',
  'GOG Galaxy.exe': 'GOG Galaxy',
  'LeagueClient.exe': '英雄联盟',
  'LeagueClientUxRender.exe': '英雄联盟',
  'Client.exe': '游戏客户端'
}

function getAppNameFromExe(exeName: string, windowTitle: string): string {
  if (EXE_TO_APP_NAME[exeName]) {
    return EXE_TO_APP_NAME[exeName]
  }

  const baseName = exeName.replace(/\.exe$/i, '')
  
  if (windowTitle) {
    if (windowTitle.includes('Visual Studio Code') || windowTitle.includes('VS Code')) {
      return 'VS Code'
    }
    if (windowTitle.includes('Google Chrome')) {
      return 'Google Chrome'
    }
    if (windowTitle.includes('微信') || windowTitle.includes('WeChat')) {
      return '微信'
    }
    if (windowTitle.includes('企业微信')) {
      return '企业微信'
    }
    if (windowTitle.includes('飞书')) {
      return '飞书'
    }
    if (windowTitle.includes('钉钉')) {
      return '钉钉'
    }
    if (windowTitle.includes('QQ')) {
      return 'QQ'
    }
  }

  return baseName || '未知应用'
}

async function getActiveWindowWindows(): Promise<ActiveWindowInfo> {
  try {
    const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern int GetWindowTextLengthW(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, uint dwProcessId);
    [DllImport("kernel32.dll", SetLastError = true)] public static extern bool QueryFullProcessImageNameW(IntPtr hProcess, uint dwFlags, StringBuilder lpExeName, ref uint lpdwSize);
    [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr hObject);
}
"@

$hwnd = [Win32]::GetForegroundWindow()
if ($hwnd -eq [IntPtr]::Zero) {
    Write-Output "|||"; exit
}

$processId = 0
[Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null

$length = [Win32]::GetWindowTextLengthW($hwnd)
$sb = New-Object System.Text.StringBuilder ($length + 2)
[Win32]::GetWindowTextW($hwnd, $sb, $sb.Capacity) | Out-Null
$title = $sb.ToString()

$exeName = $null
$hProcess = [Win32]::OpenProcess(0x1000, $false, $processId)
if ($hProcess -ne [IntPtr]::Zero) {
    try {
        $size = 1024
        $exeSb = New-Object System.Text.StringBuilder $size
        if ([Win32]::QueryFullProcessImageNameW($hProcess, 0, $exeSb, [ref]$size)) {
            $fullPath = $exeSb.ToString()
            $exeName = [System.IO.Path]::GetFileName($fullPath)
        }
    } finally {
        [Win32]::CloseHandle($hProcess) | Out-Null
    }
}

if (-not $exeName -or $exeName -eq '') {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName) {
        $exeName = $process.ProcessName + '.exe'
    }
}

if (-not $exeName -or $exeName -eq '') {
    $exeName = 'Unknown'
}

Write-Output "$exeName|$title"
`

    const { stdout, stderr } = await execAsync(
      `powershell -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ` +
      Buffer.from(psScript, 'utf16le').toString('base64'),
      { timeout: 2000, windowsHide: true }
    )

    if (stderr && stderr.trim()) {
      console.debug('[WindowMonitor] PS stderr:', stderr.trim())
    }

    const output = stdout.trim()
    if (output && output !== '|||' && output.includes('|')) {
      const [processName, ...titleParts] = output.split('|')
      const windowTitle = titleParts.join('|').trim()
      const cleanExe = processName.trim()

      if (cleanExe && cleanExe !== 'Unknown') {
        const appName = getAppNameFromExe(cleanExe, windowTitle)
        return {
          processName: cleanExe,
          windowTitle,
          appName
        }
      }
    }
  } catch (e) {
    console.debug('[WindowMonitor] Primary method failed:', (e as Error).message)
  }

  return getActiveWindowFallback()
}

async function getActiveWindowFallback(): Promise<ActiveWindowInfo> {
  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "Add-Type -TypeDefinition @\'public class Win32 { [DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\\"user32.dll\\\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId); }\'@; $hwnd = [Win32]::GetForegroundWindow(); $pid = 0; [Win32]::GetWindowThreadProcessId($hwnd, [ref]$pid); $p = Get-Process -Id $pid -ErrorAction SilentlyContinue; if ($p) { Write-Output \"$($p.ProcessName).exe|$($p.MainWindowTitle)\" }"',
      { timeout: 1500, windowsHide: true }
    )

    const output = stdout.trim()
    if (output && output.includes('|')) {
      const [processName, ...titleParts] = output.split('|')
      const windowTitle = titleParts.join('|').trim()
      const cleanExe = processName.trim()

      if (cleanExe) {
        const appName = getAppNameFromExe(cleanExe, windowTitle)
        console.debug(`[WindowMonitor] Fallback got: exe=${cleanExe}, title=${windowTitle}, app=${appName}`)
        return {
          processName: cleanExe,
          windowTitle,
          appName
        }
      }
    }
  } catch (e) {
    console.debug('[WindowMonitor] Fallback failed:', (e as Error).message)
  }

  return currentActiveWindow
}

async function pollActiveWindow(forceRefresh = false) {
  let info: ActiveWindowInfo

  if (process.platform === 'win32') {
    info = await getActiveWindowWindows()
    if (info.processName === 'Unknown' || info.appName === '未知应用') {
      info = await getActiveWindowFallback()
    }
  } else {
    info = {
      processName: `app-${process.platform}`,
      windowTitle: process.platform,
      appName: `应用(${process.platform})`
    }
  }

  if (info.processName !== 'Unknown' || info.windowTitle) {
    if (forceRefresh || info.processName !== currentActiveWindow.processName || info.windowTitle !== currentActiveWindow.windowTitle) {
      currentActiveWindow = info
      console.debug(`[WindowMonitor] Active window changed: exe=${info.processName}, app=${info.appName}, title=${info.windowTitle.substring(0, 40)}${info.windowTitle.length > 40 ? '...' : ''}`)
    }
  }
}

export function startActiveWindowMonitor(intervalMs: number = 2000) {
  if (isMonitoring) return
  
  pollActiveWindow()
  
  monitorInterval = setInterval(() => {
    pollActiveWindow().catch(() => {})
  }, intervalMs)
  
  monitorInterval.unref()
  
  isMonitoring = true
  console.log('Active window monitor started')
}

export function stopActiveWindowMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
  }
  isMonitoring = false
  console.log('Active window monitor stopped')
}

export function getCurrentActiveWindow(): ActiveWindowInfo {
  return { ...currentActiveWindow }
}

export async function forceRefreshActiveWindow(): Promise<void> {
  await pollActiveWindow(true)
}
