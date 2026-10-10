# 序章 7 · 末日爆发（第 0 天）
@scene prologue_outbreak
  title: 门锁上了
  participants: 主角, 母亲, 姐姐, 妹妹, 特殊AI
  tone: 世界在门外结束
  when: prologue_stage == "outbreak"

  @beat v1 pose:news
    action: 第三天早上，电视里的主持人开始语无伦次。镜头切到街景，一个人扑倒了另一个人。
    sense:  信号断断续续，声音像是从水下传来。
    mind:   和你看见的一模一样。连那辆翻倒的白色面包车都一样。
    speech(特殊AI): 城里的通讯在快速衰减。我建议现在切断外网。

  @beat v2 pose:seal
    action: 你把安全屋的门一重重锁上。铁门、气密门、第二道铁门。
    sense:  每一道锁落下，外面的声音就小一点。
    mind:   到最后，只剩下自己的呼吸声。

  @beat v3 pose:first_death
    action: 山坡下有人跑过来，拍门。是个陌生人，手臂上有一道咬痕。
    sense:  手掌拍在铁门上的闷响，一下，一下。
    mind:   你知道接下来会发生什么。你也知道不能开门。
    speech(姐姐): 别开。

  @beat v4 pose:silence
    action: 拍门声停了。外面只剩下风声。
    sense:  铁门上留着一个模糊的手印。
    mind:   你第一次明白，活着是要付代价的。

  @beat v5 pose:all_here
    action: 你转身，母亲、姐姐、妹妹都在。四个人，一间屋子，一座山。
    sense:  暖黄的灯光，和冰箱的嗡鸣。
    mind:   从今天起，这就是全部了。
    speech(特殊AI): 外面的事我来盯。你们先休息。明天开始，我们要重新排班。

@end
