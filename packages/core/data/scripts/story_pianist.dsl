@scene story_pianist
  title: 废墟中的歌者
  participants: 主角, 女钢琴家
  tone: 优雅偏执 / 有洁癖
  when: mainline_pianist_stage >= 1

  @beat p1 pose:sound
    action: 剧院塌了一半，但舞台上的三角钢琴还立着，琴盖开着。
    sense:  断断续续的琴声从里面传出来，像有人在练音阶。
    mind:   她每天弹同一段，因为她只剩这一段没弹错过。
    speech(女钢琴家): ……谁在外面。请等一下，我还没弹完。

  @beat p2 pose:meet
    action: 她穿着一件洗得发白的演出服，手指上有薄薄的茧。
    sense:  她先擦了一下琴键，再抬头看人。
    mind:   她最怕的不是死，是有人在她弹错的时候进来。
    speech(女钢琴家): 抱歉。这架琴很久没调了。

  @beat p3 pose:relic
    action: 她只带走一样东西：一份手写的总谱，纸已经黄了。
    sense:  她把总谱卷起来，用丝带系好，塞进胸口。
    mind:   那是她自己写的曲子，从没公开演出过。
    speech(女钢琴家): 其他的都可以不要。这个不行。

  @beat p4 pose:carry
    action: 搬琴花了整整一天，她全程扶着琴腿，不肯让别人碰琴盖。
    sense:  她的指甲断了两根，但她没说。
    mind:   她不是在搬一件乐器。她是在搬自己的下半辈子。
    speech(女钢琴家): 轻一点。左腿，对，慢一点。

  @beat p5 pose:stage
    action: 进了避难所，她选了一个角落，把琴放下，然后弹了一首完整的。
    sense:  所有人都停下了手里的活。
    mind:   那是末日以来，这栋房子里第一次有音乐。
    speech(女钢琴家): 这首叫给还活着的人。

  @variant p5 when: affection >= 65
    speech(女钢琴家): 下一首……我写给你。

@end
