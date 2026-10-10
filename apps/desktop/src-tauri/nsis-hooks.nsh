; Tauri NSIS 安装钩子
;
; 通过 tauri.conf.json 的 windows.nsis.installerHooks 引入。
; Tauri 会在默认模板的关键位置调用这些宏，因此不需要重写整个模板。

!include "LogicLib.nsh"

; ============ 安装前 ============
!macro NSIS_HOOK_PREINSTALL
  ; 无需特殊处理
!macroend

; ============ 安装后 ============
!macro NSIS_HOOK_POSTINSTALL
  ; ---- 创建数据目录结构 ----
  ; 游戏数据与存档默认跟随安装目录（便携模式）
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\saves"
  CreateDirectory "$INSTDIR\data\config"
  CreateDirectory "$INSTDIR\data\mods"
  CreateDirectory "$INSTDIR\data\logs"

  ; 便携模式标记：程序启动时优先使用同级 data/
  FileOpen $0 "$INSTDIR\data\portable.txt" w
  FileWrite $0 "portable=1$\r$\n"
  FileWrite $0 "note=游戏数据与存档保存在此目录，删除此文件将改用系统用户目录$\r$\n"
  FileClose $0

  ; Mod 目录说明
  FileOpen $1 "$INSTDIR\data\mods\README.txt" w
  FileWrite $1 "将 Mod 目录放在此处，每个 Mod 一个子目录。$\r$\n"
  FileWrite $1 "$\r$\n"
  FileWrite $1 "结构：$\r$\n"
  FileWrite $1 "  mods/你的Mod名/mod.json       元信息（id/name/version/author）$\r$\n"
  FileWrite $1 "  mods/你的Mod名/scripts/*.dsl  剧本$\r$\n"
  FileWrite $1 "  mods/你的Mod名/data/*.json    数据覆盖$\r$\n"
  FileWrite $1 "  mods/你的Mod名/assets/        素材$\r$\n"
  FileWrite $1 "$\r$\n"
  FileWrite $1 "在游戏内按 L 打开 Mod 面板可查看与启停。$\r$\n"
  FileClose $1

  ; 记录安装位置，升级时沿用
  WriteRegStr HKCU "Software\DoomsdayHarem" "InstallDir" "$INSTDIR"
!macroend

; ============ 卸载前 ============
!macro NSIS_HOOK_PREUNINSTALL
  ; 询问是否保留存档
  IfFileExists "$INSTDIR\data\*.*" 0 skipPrompt
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "是否保留游戏数据与存档？$\n$\n选择「否」将一并删除 data 目录。" \
      IDYES skipPrompt IDNO deleteData

  deleteData:
    RMDir /r "$INSTDIR\data"

  skipPrompt:
!macroend

; ============ 卸载后 ============
!macro NSIS_HOOK_POSTUNINSTALL
  ; 若 data 被保留，安装目录不会为空，RMDir 会失败 —— 这是预期行为
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\DoomsdayHarem"
!macroend
