@scene q_nun_s4
  title: 账本的重量
  participants: 主角, 修女
  tone: 焦灼的生存期许
  when: mainline_nun_stage >= 4

  @beat b1 pose:kneel_table
    action: 修女指尖抚过账本烫金标题，将蜡烛推向墓碑阴影
    sense: 蜂蜡与灰烬的气味在石墙间凝结成黏稠的膜
    mind: 每个数字都可能是通向活路的钥匙或陷阱
    speech(修女):「这本账本里有七十二个幸存者的名字...和他们最后的存粮坐标」

  @beat b2 pose:grip_weapon
    action: 主角用枪管挑起账本边缘，金属与皮革发出沉闷的摩擦声
    sense: 铅弹在枪套里硌着大腿内侧，像未孵化的卵
    mind: 她的虔诚可能是最危险的伪装
    speech(主角):「你凭什么觉得我会相信一个教会的账本？」

  @beat b3 pose:close_book
    action: 修女将账本合拢，封面凸起的十字架硌进掌心
    sense: 纸张纤维在指缝间发出细小的断裂声
    mind: 末日让所有信仰都变得脆弱而真实
    speech(修女):「因为我们需要有人把账本带出教堂...去往更远的山区」

  @variant b2 when: affection >= 60
    speech(修女):「你我都不想看到教堂变成废墟，对吗？」

@end
