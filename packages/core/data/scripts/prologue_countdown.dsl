# 序章 6 · 倒计时（末日前 3 天）
@scene prologue_countdown
  title: 还剩三天
  participants: 主角, 母亲, 姐姐, 妹妹, 特殊AI
  tone: 摊牌
  when: prologue_stage == "countdown"

  @beat u1 pose:tell_mother
    action: 晚饭后你把母亲叫到客厅，姐姐和妹妹也在。你说完了全部。
    sense:  客厅的钟走得特别响。
    mind:   你准备了两套说辞，一套是解释，一套是道歉。
    speech(母亲): 你从什么时候开始知道的。

  @beat u2 pose:sister_stands
    action: 姐姐第一个站起来。她没说话，直接去房间里开始收拾东西。
    sense:  衣柜被拉开的声音。
    mind:   她早就信了。

  @beat u3 pose:mother_decision
    action: 母亲看着你，看了很久，然后起身去厨房，把冰箱里能带的都装进袋子。
    sense:  塑料袋摩擦的声音。
    mind:   她没有说「我信你」。她只是开始做事。
    speech(母亲): 东西什么时候搬。

  @beat u4 pose:last_night
    action: 出发前一晚，家里很安静。妹妹抱着她的猫，问能不能带。
    sense:  猫在她怀里咕噜。
    mind:   你说能。
    speech(妹妹): 那要是它跑丢了怎么办。

  @beat u5 pose:move_out
    action: 第二天清晨，三辆车装满东西开出了城。后视镜里，小区越来越小。
    sense:  空调还是漏的，你一直没修。
    mind:   这个房子，以后就回不来了。
    speech(特殊AI): 路上有两处检查站。我给你们改了路线。

@end
