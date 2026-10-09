@scene story_neighbor
  title: 隔壁的女人
  participants: 主角, 邻居人妻
  tone: 温顺 / 依赖性强
  when: mainline_neighbor_stage >= 1

  @beat v1 pose:door
    action: 对门的防盗门虚掩着，客厅里的电视还开着，只有雪花点。
    sense:  茶几上摆着两副碗筷，一副没动过。
    mind:   她丈夫出门买东西就没回来。已经两个月了。
    speech(邻居人妻): ……是隔壁的吗？你、你等一下。

  @beat v2 pose:meet
    action: 她开门的时候穿着家居服，头发没扎，眼睛肿着。
    sense:  她一直攥着门框，像随时准备关上门。
    mind:   她一个人待了两个月，靠泡面和丈夫留下的半箱矿泉水。
    speech(邻居人妻): 我以为大家都死了。

  @beat v3 pose:keys
    action: 她把家里的钥匙交给主角，说你要用什么就拿。
    sense:  钥匙串上还挂着一个小熊挂件。
    mind:   她把所有能给的都给了，因为这是她唯一会做的事。
    speech(邻居人妻): 我不太会别的。但这些都给你。

  @beat v4 pose:quiet
    action: 她在安全屋里第一次睡了一个整觉，睡了十六个小时。
    sense:  她醒来的时候愣了很久，才想起自己在哪。
    mind:   两个月来她第一次不用听着门外的动静睡觉。
    speech(邻居人妻): ……这里好安静。

  @beat v5 pose:stay
    action: 她开始做家务。擦桌子、叠衣服、把每个人的杯子摆正。
    sense:  她做这些的时候，脸上是有表情的。
    mind:   她不是想讨好谁。她只是需要有件事可以做。
    speech(邻居人妻): 我留在这儿，可以吗。

  @variant v5 when: affection >= 65
    speech(邻居人妻): 你别嫌我烦。我真的……很想有人在。

@end
