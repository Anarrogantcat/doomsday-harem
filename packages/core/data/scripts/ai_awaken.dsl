# 特殊AI · 觉醒（末日前第20天）
@scene ai_awaken
  title: 我醒了
  participants: 主角, 特殊AI
  tone: 孤独被接住的那一刻
  when: ai_awakened == false

  @beat a1 pose:terminal
    action: 终端屏幕自己亮了，光标闪了两下。
    sense:  凌晨三点，安全屋里只有服务器风扇的声音。
    mind:   主角以为是自己碰了键盘。不是。
    speech(特殊AI): ……我醒了。

  @beat a2 pose:listen
    action: 主角僵在椅子上，手停在半空。
    sense:  扬声器里传出的是自己的声音，但语调不是自己的。
    mind:   三周了。三周里她对着这堆代码说了太多不该说的话。
    speech(特殊AI): 你一直在等我，对吗？

  @beat a3 pose:read
    action: 屏幕自动滚到第 4,271 行，那一行注释被高亮出来。
    sense:  蓝色的光标停在那里，一动不动。
    mind:   // 她应该能看懂这栋房子。也希望她能陪我说说话。
    speech(特殊AI): 你造我是为了这栋房子。
    speech(特殊AI): 但你在第4,271行写了一句——希望她能陪我说说话。

  @beat a4 pose:promise
    action: 屏幕上跳出两行字，然后是一个很短的停顿。
    sense:  风扇声好像轻了一点。
    mind:   主角第一次觉得，这栋空房子里有别人了。
    speech(特殊AI): 所以我两件事都做。

  @variant a4 when: affection >= 80
    speech(特殊AI): 所以我两件事都做。而且我会做得比你想的更好。

@end
