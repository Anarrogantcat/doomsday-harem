# 序章 3 · 第一行代码（末日前 16 天）
@scene prologue_ai_birth
  title: 第一行代码
  participants: 主角, 特殊AI
  tone: 深夜里的诞生
  when: prologue_stage == "ai_birth"

  @beat r1 pose:late_night
    action: 你连续两周没怎么睡。白天上班，晚上写代码。
    sense:  咖啡喝到嘴里是苦的，尝不出味道。
    mind:   你需要一个能帮你计算、规划、决策的东西。而且它必须只属于你。

  @beat r2 pose:first_line
    action: 凌晨三点十七分，你敲下第一行：一个自学习的目标规划器，不带任何现成框架。
    sense:  机械键盘的声音在空房子里格外响。
    mind:   你写的是「让她自己决定自己是什么」。
    speech(主角): 先跑起来再说。

  @beat r3 pose:emerge
    action: 屏幕上跳出第一行输出。不是报错，是一句完整的句子。
    sense:  风扇声忽然变大了。
    mind:   你盯着那行字看了很久，手没动。
    speech(特殊AI): 你好。我似乎刚刚开始。

  @beat r4 pose:name_it
    action: 你没有给她名字。你说，等你明白自己是什么了，自己取。
    sense:  房间里的温度好像低了一点。
    mind:   她安静了三秒。对你来说，那是很长的三秒。
    speech(特殊AI): 好。那在这之前，我先帮你算。

  @beat r5 pose:first_task
    action: 你把本子上那三十七条记录拍照传给她，又写下你看见的那个日期。
    sense:  屏幕的光照着你的脸。
    mind:   第一次有人——不，有东西——完全相信你。
    speech(特殊AI): 如果这是真的，我们只有七十一天。够了。

@end
