# 姐姐线 · 互相破处
# 示例剧本，演示 DSL 全部语法要素

@scene sister_first
  title: 互相破处
  participants: 主角, 姐姐
  tone: 压抑十年的释放 / 疼痛与满足
  when: virgin == true && affection >= 60

  @beat b1 pose:push_down
    action: 姐姐把主角按在床沿，膝盖抵住她的腿，居高临下地看着她。
    sense:  夜里的空气是凉的，只有两个人身上是热的。
    mind:   十年了。她想过很多次，没有一次是这样。
    speech(姐姐): 你以前不是这样的。但我还是想要你。

  @beat b2 pose:straddle
    action: 她跨坐上来，扶住主角的肩，缓缓往下压。
    sense:  温热的紧致从顶端一寸寸吞上来，湿滑的阻力卡在中段。
    mind:   疼。但她笑了。
    speech(姐姐): ……等一下。别动，让我自己来。

  @beat b3 pose:sink
    action: 她咬住下唇，猛地坐到底。
    sense:  一声压抑的闷哼，两个人都僵住了。
    mind:   两个人一起疼，一起完整。
    speech(姐姐): 我等你这个……等了快十年。

  @beat b4 pose:slow
    action: 她开始慢慢地动，起落很浅，像在确认什么。
    sense:  床板发出很轻的吱响，混着两人不稳的呼吸。
    mind:   后面的话她没说完，也不需要说完。
    speech(姐姐): 早知道你会变成这样，我早就该……

  @beat b5 pose:faster
    action: 节奏快起来，她俯下身，把脸埋进主角的颈窝。
    sense:  汗水贴着皮肤，体温高得不正常。
    mind:   门外很安静。母亲和妹妹都已经睡了。
    speech(姐姐): 别停……你也不许停。

  @beat b6 pose:climax
    action: 她的动作乱掉，指甲抠进主角的背。
    sense:  内里一阵一阵地绞紧，把主角也拖了下去。
    mind:   第一次，就这样给了彼此。
    speech(姐姐): ——嗯……！

  @beat b7 pose:afterglow
    action: 她软下来，趴在主角身上，很久没有动。
    sense:  床单皱得不成样子，空气里有淡淡的腥甜。
    mind:   从今往后，这条线再也回不去了。
    speech(姐姐): ……你身上，现在有我的味道了。

  # 差分：欲情高时语气更急
  @variant b2 when: lust > 80
    speech(姐姐): 快点……我等不了了。

  # 差分：羁绊高时主动让位
  @variant b4 when: bond >= 4
    speech(姐姐): 这次……换你来。

@end
