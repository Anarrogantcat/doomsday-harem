# 序章 8 · 第一天（主游戏开始）
@scene prologue_settled
  title: 第一天
  participants: 主角, 母亲, 姐姐, 妹妹, 特殊AI
  tone: 新的日常开始
  when: prologue_stage == "settled"

  @beat w1 pose:morning_after
    action: 第一个没有闹钟的早晨。你在陌生的床上醒来，花了几秒才想起自己在哪。
    sense:  空气里有水泥和柴油的混合味。
    mind:   外面很安静。安静得不像世界末日。
    speech(母亲): 起来了。粥好了。

  @beat w2 pose:first_meal
    action: 四个人围着一张折叠桌吃早饭。谁都没提外面的事。
    sense:  粥很稠，咸菜是从家里带来的。
    mind:   你忽然发现，这是你这些年来第一次和她们一起吃早饭。
    speech(妹妹): 我们以后一直住这吗。

  @beat w3 pose:task_board
    action: AI 在屏幕上列出一张表：水、电、食物、防御、医疗、人手。每一项后面都标着「紧急」。
    sense:  屏幕的冷光映在每个人脸上。
    mind:   没有时间悲伤。
    speech(特殊AI): 我先按最低需求排了三天。之后要看你们的实际消耗。

  @beat w4 pose:assign
    action: 母亲管厨房，姐姐管物资，妹妹打下手。你负责外出和决策。
    sense:  纸上写下的分工，笔迹都不一样。
    mind:   一个家，变成了一支队伍。
    speech(姐姐): 行了。都动起来。

  @beat w5 pose:sister_night
    action: 当晚你睡不着，走到走廊，发现姐姐也在。她靠在墙上，手里拿着那本记录。
    sense:  应急灯的光是暗绿色的。
    mind:   她一直在等你。
    speech(姐姐): 这上面最后一条，写的是「三个月后」。现在呢。

  @beat w6 pose:close
    action: 你说「现在是我说了算」。她笑了一下，把本子还给你。
    sense:  纸页边缘被翻得起了毛。
    mind:   有些事情，从今晚开始会不一样。
    speech(姐姐): 那我呢。我也归你管。

  @variant w6 when: affection >= 55
    speech(姐姐): 别装听不懂。我等你这句话很久了。

@end
