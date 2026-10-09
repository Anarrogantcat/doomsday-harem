@scene story_idol
  title: 最后的广播
  participants: 主角, 前偶像
  tone: 职业笑容 / 藏着自卑
  when: mainline_idol_stage >= 1

  @beat i1 pose:radio
    action: 偏远电台的天线还立着，发射机靠一台柴油机撑着。
    sense:  频率上每隔六小时会播一段歌，是她自己唱的。
    mind:   她唱了三百多遍同一首。因为那是她唯一一首不是替唱的歌。
    speech(前偶像): 这里是 FM 98.7。如果你听得到……就当我在开演唱会。

  @beat i2 pose:meet
    action: 她摘下耳机，脸上的妆已经花了一半。
    sense:  她下意识地整理了一下头发，然后停住了。
    mind:   没人看了。但她还是习惯性地笑。
    speech(前偶像): 你是听众吗。……不好意思，我习惯了这么说。

  @beat i3 pose:truth
    action: 她说她不是主唱。她在那支团里待了六年，只唱过一首。
    sense:  她的手在调音台上停了很久。
    mind:   那首是她自己写的。没人听过。
    speech(前偶像): 反正也没人记得我。我留在这儿，至少还能放歌。

  @beat i4 pose:listen
    action: 主角让她再唱一遍。她愣了三秒，然后按下播放键。
    sense:  柴油机的声音很大，但她的声音压得住。
    mind:   她唱的时候没有笑。这是主角第一次看见她真的表情。
    speech(前偶像): ……唱完了。你可以走了。

  @beat i5 pose:invite
    action: 主角说：安全屋有一面墙，可以挂你的海报。
    sense:  她把耳机摘下来，缠好线，放进口袋。
    mind:   她花了六年才等到有人听完整首。
    speech(前偶像): 那我要挑一张最好看的。

  @variant i4 when: affection >= 70
    speech(前偶像): 你要是喜欢，我可以现场唱。不用机器。

@end
