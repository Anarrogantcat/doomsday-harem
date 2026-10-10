@scene q_heiress_s4
  title: 储藏室密钥
  participants: 主角, 富二代御姐
  tone: 冷峻克制，暗藏算计
  when: mainline_heiress_stage >= 4

  @beat b1 pose:signal_scan
    action: 她指尖划过全息投影，数据流在空中凝结成三维图表
    sense: 冷光在她指节折射出金属质感，空气里浮动着咖啡与雪松香
    mind: 她的算计永远比生存需求更早抵达终点
    speech(富二代御姐): 47%的缺口，足够让三个基地的人吃上三个月

  @beat b2 pose:cross_check
    action: 主角俯身贴近投影，呼吸在玻璃表面凝成白雾
    sense: 电子屏的蓝光在瞳孔里跳动，后颈汗毛被静电 prick
    mind: 这组数据的坐标指向废弃的军需仓库
    speech(主角): 数据从哪来的？

  @beat b3 pose:cross_zone
    action: 她将酒杯沿抵住太阳穴，水晶杯壁映出扭曲的倒影
    sense: 冰镇香槟的气泡在喉结处炸开，金属杯底压着半张旧照片
    mind: 真正的缺口从不在物资表上
    speech(富二代御姐): 需要一个能陪我算完这盘棋的人

  @variant b2 when: affection >= 60
    speech(富二代御姐): 你比我想象的更懂生存，这钥匙...先当个见面礼

@end
