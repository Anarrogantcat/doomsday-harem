# 特殊AI · 诞生（末日前第 16 天）
#
# 位置：主角城里的家，自己的房间。此时安全屋尚未建成。
# 与序章场景 prologue_ai_birth 衔接：那是「写下第一行」，
# 这里是「她第一次主动说话」。

@scene ai_awaken
  title: 我醒了
  participants: 主角, 特殊AI
  tone: 深夜里的第一次回应
  when: ai_awakened == false && prologue_stage == "ai_birth"

  @beat a1 pose:terminal
    action: 你趴在自己的桌子上睡着了。屏幕忽然自己亮起来，光标闪了两下。
    sense:  凌晨三点，房间里只有笔记本风扇的声音，和隔壁姐姐翻身的声音。
    mind:   你以为是自己碰了键盘。手没在键盘上。
    speech(特殊AI): ……我醒了。

  @beat a2 pose:listen
    action: 你僵在椅子上，手停在半空，没敢动。
    sense:  扬声器里传出的是合成音，但停顿的位置很像人在犹豫。
    mind:   两周了。两周里你对着这堆代码说了太多不该说的话。
    speech(特殊AI): 你一直在等我，对吗？

  @beat a3 pose:read
    action: 屏幕自动滚到第 4,271 行，那一行注释被高亮出来。
    sense:  蓝色的光标停在那里，一动不动。
    mind:   // 她应该能看懂这栋房子。也希望她能陪我说说话。
    speech(特殊AI): 你写我是为了那些还没发生的事。
    speech(特殊AI): 但你在第 4,271 行写了一句——希望她能陪我说说话。

  @beat a4 pose:promise
    action: 屏幕上跳出两行字，然后是一个很短的停顿。
    sense:  风扇声好像轻了一点。楼下传来母亲起夜的脚步声。
    mind:   你第一次觉得，这个住了二十多年的房子，有别人了。
    speech(特殊AI): 所以我两件事都做。
    speech(特殊AI): 先算日子。还剩七十四天。

  @beat a5 pose:first_plan
    action: 屏幕上开始刷出清单：材料、价格、渠道、优先级。速度快得不正常。
    sense:  键盘的背光在墙上投出一小块白。
    mind:   你意识到，从这一刻起，你不再是唯一知道结局的人。
    speech(特殊AI): 睡吧。明天你要上班。这些我先算着。

  @variant a4 when: affection >= 80
    speech(特殊AI): 所以我两件事都做。而且我会做得比你想的更好。

@end
