; 自定义 NSIS 安装脚本
;
; 照 sillytavern-shell 的做法：安装时建可写数据目录，卸载时保留（避免玩家丢档）。
;
; 注意：NSIS 里 $ 是变量前缀，写换行要转义成 $\r$\n；
; 直接写多行字符串会导致「unterminated string parsing」。

!include "LogicLib.nsh"

!macro customInstall
  ; 在安装目录旁建 data 目录，作为可写之家
  CreateDirectory "$INSTDIR\data"
  ClearErrors
  FileOpen $R2 "$INSTDIR\data\.installed" w
  ${If} ${Errors}
    DetailPrint "警告：无法写入 data 目录标记，卸载时将保留全部数据"
  ${Else}
    FileWrite $R2 "doomsday-harem"
    FileClose $R2
  ${EndIf}
!macroend

!macro customUnInstall
  ; 卸载时保留 data 目录（存档在里面），只删自己写的标记文件
  Delete "$INSTDIR\data\.installed"
!macroend
