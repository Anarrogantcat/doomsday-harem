@scene q_nun_s2
  title: 烛火未熄
  participants: 主角, 修女
  tone: 肃穆中透着焦灼
  when: mainline_nun_stage >= 2

  @beat b1 pose:cross_zone
    action: 修女用拇指摩挲蜡烛表面的凹痕
    sense: 蜡油混合着铁锈的气味在空气里凝结
    mind: 每个凹痕都对应某个未被标记的灵魂
    speech(修女): 这些蜡油的纹路...比墓碑更诚实

  @beat b2 pose:signal_scan
    action: 主角翻开笔记本的羊皮封面
    sense: 纸页间夹着的干枯鼠尾草突然簌簌作响
    mind: 这些记录是否还包含着某种求生线索？
    speech(主角): 您在记录...亡灵的账目？

  @beat b3 pose:rescue
    action: 修女将铜制记事本合上时发出闷响
    sense: 金属搭扣撞击出类似心跳的钝响
    mind: 她的指节泛着长期接触铁器的青白
    speech(修女): 未被埋葬的人，需要更持久的见证

  @variant b2 when: affection >= 60
    speech(修女): 有些名字...只能让烛火替他们存在

@end
