@scene q_singlemom_s3
  title: 农庄的抉择
  participants: 主角, 单亲妈妈
  tone: 末日阴影下的生存博弈
  when: mainline_singlemom_stage >= 3

  @beat b1 pose:cross_hands
    action: 单亲妈妈用布满茧子的手指紧攥女儿手腕
    sense: 干裂的皮肤摩擦着发烫的金属手镯，井水腥气混着柴油味在鼻腔凝结
    mind: 她知道这具瘦削身体里藏着多少未被拆解的恐惧
    speech(单亲妈妈):「你见过辐射云吞没整个火车站吗？」

  @beat b2 pose:step_forward
    action: 主角蹲下身与母女视线平齐，防辐射面罩边缘渗出雾气
    sense: 腰间匕首的寒光在暮色中划出裂痕，远处传来变异犬的低吼
    mind: 每个字都要成为撬动生存意志的凿子
    speech(主角):「东郊有未被污染的避难所，我有地图」

  @beat b3 pose:retreat_back
    action: 单亲妈妈将女儿护在身前，后背抵住生锈的铁门
    sense: 枯草在靴底断裂的脆响，防弹衣夹层里的照片被攥出褶皱
    mind: 她计算过所有可能的死亡概率，却算不出女儿的未来
    speech(单亲妈妈):「我不能把命交给陌生人」

  @variant b2 when: affection >= 60
    speech(单亲妈妈):「你当年在废墟里救过我女儿...但这次不一样」

@end
