@scene q_heiress_s3
  title: 云端谈判
  participants: 主角, 富二代御姐
  tone: 末日余烬中的博弈
  when: mainline_heiress_stage >= 3

  @beat b1 pose:cross_hands_stare
    action: 富二代御姐在落地窗前踱步，高跟鞋敲击大理石地面的声响回荡在空旷大厅
    sense: 空调出风口涌出的冷气裹挟着昂贵香水味，混着地下室传来的金属摩擦声
    mind: 她在计算生存概率与资源控制权的平衡点
    speech(富二代御姐): 这个位置的通风管道能通向三个避难所，但钥匙在储藏室最深处

  @beat b2 pose:lean_forward_hold
    action: 主角伸手触碰她腕间的钛合金手环，表面蚀刻着家族徽记
    sense: 冰凉的金属表面渗出细微的静电，像蛇鳞般在指腹下颤动
    mind: 身份象征与生存需求的碰撞会产生什么化学反应？
    speech(主角): 你父亲的地下实验室还有多少未公开的疫苗配方？

  @beat b3 pose:twist_key_insert
    action: 富二代御姐将镀金钥匙插入墙内暗格，机械齿轮转动声刺破死寂
    sense: 金属门开启时涌出的霉味裹挟着陈年酒香，像某种隐秘的邀约
    mind: 她在用物资交换构建新的权力契约
    speech(富二代御姐): 储藏室的防爆门需要你的生物特征才能开启

  @variant b2 when: affection >= 60
    speech(富二代御姐): 你比我想象中更懂生存游戏，或许该考虑长期合作？

@end
