# 序章 5 · 安全屋（末日前 5 天）
@scene prologue_shelter
  title: 山里的房子
  participants: 主角, 特殊AI, 姐姐
  tone: 把谎话盖成水泥
  when: prologue_stage == "shelter"

  @beat t1 pose:site_survey
    action: AI 挑了三块地。最后选中的是城北四十公里一处废弃采石场，背靠整座山体。
    sense:  风从山谷里穿过来，带着石粉的味道。
    mind:   地表看不出任何东西。里面可以挖。
    speech(特殊AI): 租期十年，用一家不存在的农业公司名义。文件我已经做好了。

  @beat t2 pose:dig
    action: 挖掘机进场那天，你告诉家人是「朋友的度假屋项目」。
    sense:  柴油机的震动顺着地面传上来。
    mind:   你站在坡上看了三个小时。
    speech(姐姐): 你什么时候开始搞这个的。

  @beat t3 pose:shell_done
    action: 地上部分先盖起来：一层水泥平房，两个房间，一个仓库。
    sense:  新浇的水泥有股潮味。
    mind:   看起来就是个简陋的度假屋。没人会多看它一眼。这正是你要的。

  @beat t4 pose:ai_plug_in
    action: 你把服务器搬进地下室，接上电、水、网。AI 第一次有了「身体」。
    sense:  风扇转起来的声音，像是有人在呼吸。
    mind:   她终于不只是一台笔记本里的东西了。
    speech(特殊AI): 我现在能看到这栋房子里的每一个角落。也包括你在哪。

  @beat t5 pose:sister_knows
    action: 姐姐跟你一起下山。路上她一直没说话，到半山腰忽然停下。
    sense:  傍晚的光把她的影子拉得很长。
    mind:   你知道她要问什么。
    speech(姐姐): 我不是问那个本子。我是问，你打算什么时候告诉我。

  @variant t5 when: affection >= 50
    speech(姐姐): 我早就知道了。我在等你先开口。

@end
