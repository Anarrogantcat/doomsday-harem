@scene story_pilot
  title: 黑箱
  participants: 主角, 女飞行员
  tone: 冷静近乎冷漠 / PTSD
  when: mainline_pilot_stage >= 1

  @beat f1 pose:wreck
    action: 小飞机撞在山腰上，机身断成两截，但驾驶舱是完整的。
    sense:  黑匣子的指示灯还在闪，说明电池没耗尽。
    mind:   她在这里躺了四天，靠一罐水和安全带活着。
    speech(女飞行员): ……别碰那个橙色的盒子。

  @beat f2 pose:rescue
    action: 主角把她从驾驶舱里拖出来，她左腿骨折，但一直没叫。
    sense:  她的瞳孔在闪光灯下反应很慢。
    mind:   她不是不怕。她是把怕关起来了。
    speech(女飞行员): 副驾驶。机上六个人。……你不用问，我知道结果。

  @beat f3 pose:silence
    action: 她在担架上一直不说话，直到听见直升机的声音——其实是风。
    sense:  她整个人绷起来，抓着担架边缘。
    mind:   那声音她听过太多次。每次都是在驾驶舱里。
    speech(女飞行员): ……抱歉。我以为。

  @beat f4 pose:log
    action: 她把飞行日志交给主角，上面记着每一个遇难者的名字。
    sense:  字迹很工整，没有一处涂改。
    mind:   她一个人记了六个名字。写了四天。
    speech(女飞行员): 这些，麻烦你帮我交出去。如果他们还有家人。

  @beat f5 pose:fly
    action: 她伤好后第一次走进车库，看见房车，围着它转了两圈。
    sense:  她伸手摸了摸方向盘，动作很轻。
    mind:   她想开的东西，从来不是飞机。是能带人出去的东西。
    speech(女飞行员): 这个我熟。……给我点时间。

  @variant f5 when: affection >= 60
    speech(女飞行员): 我不想再一个人飞了。

@end
