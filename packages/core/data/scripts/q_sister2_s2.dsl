@scene q_sister2_s2
  title: 破碎的沉默
  participants: 主角, 妹妹
  tone: 末日余烬中的对峙
  when: mainline_sister2_stage >= 2

  @beat b1 pose:kneel_floor
    action: 妹妹颤抖着翻开泛黄的日记本
    sense: 纸张纤维在指腹下发出细碎的裂帛声
    mind: 有些秘密比核爆的辐射更难以清除
    speech(妹妹):「你知道吗...姐姐留下的防辐射服，我试穿过三次」

  @beat b2 pose:lean_forward
    action: 主角俯身贴近她颤抖的肩线
    sense: 气味中混杂着霉味与少女的冷汗
    mind: 末日让所有谎言都变得脆弱不堪
    speech(主角):「你早就知道...那些事？」

  @beat b3 pose:clutch_diary
    action: 妹妹将日记本拍在生锈的暖气片上
    sense: 金属表面残留着前日的血迹指纹
    mind: 姐姐的遗物里藏着整个世界的重量
    speech(妹妹):「我等了三年，等一个能替她...活下去的人」

  @variant b2 when: affection >= 60
    speech(妹妹):「不是替她...是和你一起，把最后的希望种出来」

@end
