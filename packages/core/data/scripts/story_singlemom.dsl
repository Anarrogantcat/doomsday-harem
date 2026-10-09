@scene story_singlemom
  title: 母亲的朋友
  participants: 主角, 单亲妈妈
  tone: 疲惫但乐观
  when: mainline_singlemom_stage >= 1

  @beat g1 pose:home
    action: 公寓楼的电梯停了，她们住在六楼，门口堆着空水桶。
    sense:  门上的猫眼被从里面堵住了。
    mind:   她带着女儿躲了两个月，靠邻居留下的一点存粮。
    speech(单亲妈妈): ……是阿姨家的孩子吗？

  @beat g2 pose:meet
    action: 她开门时手里握着拖把柄，身后躲着一个女孩。
    sense:  她的头发乱了，但女儿的衣服是干净的。
    mind:   她把所有能洗的东西都洗了。这是她唯一能控制的。
    speech(单亲妈妈): 进来吧。别吓着孩子。

  @beat g3 pose:mother
    action: 主角提到自己母亲的名字时，她愣了很久，然后哭了。
    sense:  她抹了把脸，转身去倒水，背对着主角。
    mind:   她认识主角母亲二十年。她一直以为那边也完了。
    speech(单亲妈妈): 你妈妈……她还活着？

  @beat g4 pose:daughter
    action: 她女儿把攒了很久的半块巧克力分给主角。
    sense:  巧克力已经化了又被冻硬，形状很难看。
    mind:   她们过得很紧。但她们没有互相埋怨过。
    speech(单亲妈妈): 姐姐你吃。妈妈说客人先吃。

  @beat g5 pose:join
    action: 她收拾行李，把女儿的小书包背在自己肩上。
    sense:  她站在门口回头看了一眼那间屋子，然后关上门。
    mind:   她不是为了自己才走的。
    speech(单亲妈妈): 走吧。你妈妈在等我们。

  @variant g5 when: affection >= 60
    speech(单亲妈妈): 谢谢你。真的。谢谢你回来找我们。

@end
