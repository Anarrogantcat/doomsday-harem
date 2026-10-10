@scene q_mechanic_s2
  title: 车间突袭
  participants: 主角, 女机械师
  tone: 金属锈蚀的潮湿感
  when: mainline_mechanic_stage >= 2

  @beat b1 pose:crouch_scan
    action: 主角用扳手抵住门缝窥视
    sense: 机油混合腐肉的腥气从地缝渗出
    mind: 三只变异兽的利爪正在撕扯通风管道
    speech(女机械师): 看好了，它们的关节比钢索更脆弱

  @beat b2 pose:tool_strike
    action: 主角抡起工具箱砸向变异兽
    sense: 钢铁撞击骨甲的闷响震得掌心发麻
    mind: 这些怪物的痛觉神经还保持着原始分布
    speech(主角): 你的工具箱能修复房车，但能挡住这个吗？

  @variant b2 when: affection >= 60
    speech(女机械师): 看准它左后腿的液压杆，我给你三秒

  @beat b3 pose:salvage_check
    action: 女机械师用撬杠挑开变异兽尸体
    sense: 指甲缝里嵌着暗红色的生物黏液
    mind: 这些怪物的代谢速度比人类快47%
    speech(女机械师): 工具箱在角落，别碰那些锈蚀的管线

@end
