@scene story_heiress
  title: 云端之上
  participants: 主角, 富二代御姐
  tone: 慵懒高傲 / 能力极强
  when: mainline_heiress_stage >= 1

  @beat h1 pose:villa
    action: 半山腰的私人别墅，围墙完整，发电机还在响。
    sense:  泳池的水已经绿了，但屋里的红酒柜是满的。
    mind:   她一个人在这儿待了两个月，靠保镖留下的补给活着。
    speech(富二代御姐): 外面的，报上名来。这地方不接散客。

  @beat h2 pose:meet
    action: 她坐在露台上，穿着真丝睡袍，手里拿着一杯温水。
    sense:  她看起来一点没狼狈。但她的脚踝上有一道没处理的伤口。
    mind:   她维持体面不是为了好看。是为了不让自己崩掉。
    speech(富二代御姐): 你身上有柴油味。你开车来的。

  @beat h3 pose:trade
    action: 她开口第一句不是求救，是报价：她出物资，换主角把她带下山。
    sense:  她报数字的时候眼睛都没眨。
    mind:   她算过：一个人在这栋房子里撑不过第三个冬天。
    speech(富二代御姐): 我有三千升柴油，两吨罐头，还有药。你开价。

  @beat h4 pose:ledger
    action: 主角报的价是到基地后帮忙管账。她愣了两秒。
    sense:  她翻出一本手写的物资台账，字迹漂亮得像印刷体。
    mind:   这是她两个月里唯一认真做的事。她发现自己还有用。
    speech(富二代御姐): ……行。这个我确实擅长。

  @beat h5 pose:join
    action: 她把地下室打开，里面的东西堆到天花板。
    sense:  她挑了一件外套换上，把睡袍留在了衣架上。
    mind:   她不是投奔。她是找了一个值得合作的人。
    speech(富二代御姐): 先说好。我不管做饭。

  @variant h4 when: affection >= 70
    speech(富二代御姐): 你这个价，比我想的低。……有意思。

@end
