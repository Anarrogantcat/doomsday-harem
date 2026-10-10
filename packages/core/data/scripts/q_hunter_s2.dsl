@scene q_hunter_s2
  title: 林间对峙
  participants: 主角, 女猎人
  tone: 警惕与试探的对峙
  when: mainline_hunter_stage >= 2

  @beat b1 pose:check_footprints
    action: 女猎人用匕首尖挑起地面碎叶
    sense: 金属刃面反射着腐殖质的暗黄光晕
    mind: 她在验证足迹是否被刻意篡改过
    speech(女猎人): 你数得清这些足迹的圈数吗？

  @beat b2 pose:cross_sword
    action: 主角将手掌按在树干凸起的树瘤上
    sense: 树皮粗糙的颗粒感渗入掌纹
    mind: 这些痕迹是活人留下的，不是陷阱
    speech(主角): 三圈半，向北偏移七度

  @beat b3 pose:signal_scan
    action: 女猎人突然甩出绳索缠住树杈
    sense: 麻绳纤维摩擦出刺鼻的树脂气味
    mind: 她在测试主角是否能预判突发动作
    speech(女猎人): 你听见树冠层的动静了吗？

  @variant b2 when: affection >= 60
    speech(女猎人): 你比那些劫掠者更懂山的脾气

@end
