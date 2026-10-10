@scene q_singlemom_s4
  title: 东郊农庄启程
  participants: 主角, 单亲妈妈
  tone: 凄清的金属碰撞声在空荡客厅回响
  when: mainline_singlemom_stage >= 4

  @beat b1 pose:signal_scan
    action: 单亲妈妈将行李箱推上车尾
    sense: 铝合金箱角刮擦出细碎火花
    mind: 二十年没碰过这辆旧车，锈蚀的底盘硌得掌心生疼
    speech(单亲妈妈):「这车能撑到农庄吗？我女儿说油箱只剩半格」

  @beat b2 pose:cross_zone
    action: 主角钻进驾驶座系安全带
    sense: 皮革座椅渗出陈年汗渍的咸腥
    mind: 后视镜里那双攥着车门的手，像枯枝般颤抖
    speech(主角):「导航显示还有三十公里，我加过两次应急燃油」

  @beat b3 pose:rescue
    action: 单亲妈妈突然把保温杯塞进主角手心
    sense: 玻璃杯壁凝着冰凉水珠，枸杞在深褐色液体里沉浮
    mind: 二十年没喝过这味道，苦涩得想哭
    speech(单亲妈妈):「这是...我女儿昨天煮的」

  @variant b2 when: affection >= 60
    speech(单亲妈妈):「你比她想象的可靠，这车...交给你了」

@end
