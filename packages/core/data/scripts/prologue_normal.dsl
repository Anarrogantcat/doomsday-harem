# 序章 1 · 平凡的日常（末日前 30 天）
@scene prologue_normal
  title: 最后一个正常的周五
  participants: 主角, 母亲, 姐姐, 妹妹
  tone: 平静日常下的暗流
  when: prologue_stage == "normal"

  @beat p1 pose:desk_work
    action: 你关掉公司电脑，窗外是下午五点的城市。
    sense:  中央空调停了半小时，办公室里闷得发黏。
    mind:   明天周末。妈说要做红烧肉。
    speech(同事): 还不走？加班费又不给。

  @beat p2 pose:drive_home
    action: 你开着那辆二手的白色房车汇进晚高峰。
    sense:  方向盘上有一道裂纹，卡在虎口。空调有点漏，一直没修。
    mind:   去年存了两年钱买的，十二万八，一分没少。过户单还在副驾储物格里。
    speech(姐姐): 到哪了。菜都要凉了。

  @beat p3 pose:family_dinner
    action: 玄关的灯亮着。母亲在厨房，姐姐刚洗完澡，妹妹趴在沙发上看手机。
    sense:  红烧肉的糖色味混着洗衣液的味道。
    mind:   这个画面你已经看了二十多年。
    speech(母亲): 洗手。汤都炖了两个钟头。

  @beat p4 pose:night_room
    action: 夜里你躺在床上，听着隔壁姐姐翻书的声音。
    sense:  天花板有一道细缝，路灯的光从窗帘缝里挤进来。
    mind:   什么都不会发生。你当时是这么想的。
    speech(姐姐): 睡了没。

  @variant p4 when: affection >= 40
    speech(姐姐): 你最近是不是有事。算了，明天再说。

@end
