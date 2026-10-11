; 自定义 NSIS 安装脚本
;
; 照 sillytavern-shell 的做法：在安装时创建可写的数据目录，
; 卸载时保留（避免玩家丢档）。
;
; 我们的数据目录由 Electron 的 app.getPath('userData') 决定，
; 不需要像酒馆那样做「三分离」，只需保证：
;   1. 安装目录可写（供存档导出）
;   2. 卸载不删数据

!include "LogicLib.nsh"
!include "FileFunc.nsh"

!macro customInstall
  ; 在安装目录旁建 data 目录，作为可写之家
  CreateDirectory "$INSTDIR\data"
  ClearErrors
  FileOpen $R2 "$INSTDIR\data\.installed" w
  ${If} ${Errors}
    DetailPrint "警告：无法写入 data 目录标记，卸载时将保留全部数据"
  ${Else}
    FileWrite $R2 "doomsday-harem$$
"
    FileClose $R2
  ${EndIf}
!macroend

!macro customUnInstall
  ; 卸载时保留 data 目录（存档在里面）
  ; 只删自己写的标记文件
  Delete "$INSTDIR\data\.installed"
!macroend
