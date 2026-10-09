@scene story_pharmacist
  title: 荒野医生
  participants: 主角, 女药剂师
  tone: 精明务实 / 嘴毒心软
  when: mainline_pharmacist_stage >= 1

  @beat p1 pose:clinic
    action: 连锁药店的卷帘门只拉了一半，里面的货架却整整齐齐。
    sense:  消毒水的味道还在，说明她一直没走。
    mind:   两个月了，她把每一盒药都按效期排过三遍。
    speech(女药剂师): 外面那些人不进来，是怕我把他们毒死。

  @beat p2 pose:meet
    action: 她从柜台后面站起来，手里拿着一支没上膛的镇静枪。
    sense:  她瘦了，但手很稳。
    mind:   她认得主角背的包——那是她家店卖出去的最后一批。
    speech(女药剂师): 你是来抢药的，还是来换药的。

  @beat p3 pose:deal
    action: 她开出的条件不是食物，是帮她把后面那批胰岛素搬上车。
    sense:  冷藏柜嗡嗡地响，是这里唯一还在工作的东西。
    mind:   她算过：这批药够换三个月，也够救十几个人。
    speech(女药剂师): 我不管你是谁。药不能坏。

  @beat p4 pose:escort
    action: 回程路上她一直盯着后视镜，数有没有车跟上来。
    sense:  她把药箱抱在怀里，像抱一个孩子。
    mind:   她没说自己为什么守着那家店。但主角猜到了。
    speech(女药剂师): 我本来可以走的。上个月就可以。

  @beat p5 pose:lab
    action: 进了实验室，她先看设备，再看电源，最后才看主角。
    sense:  她用手背试了试培养箱的温度。
    mind:   这是她两年来第一次觉得，这些东西还有用。
    speech(女药剂师): 行。我留下。但配方归我管。

  @variant p4 when: affection >= 60
    speech(女药剂师): 不过现在有人帮我搬了，我就没那么想走了。

@end
