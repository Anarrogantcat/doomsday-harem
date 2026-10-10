@scene q_mechanic_s4
  title: 工具箱的重量
  participants: 主角, 女机械师
  tone: 锈蚀的金属气息与生存本能
  when: mainline_mechanic_stage >= 4

  @beat b1 pose:place_toolbox
    action: 女机械师将布满划痕的工具箱推过桌面
    sense: 油漆剥落的金属台面渗出陈年机油
    mind: 每个工具都浸透着二十年的生存智慧
    speech(女机械师): 二十年来修车厂就靠它撑着，别的都是累赘

  @beat b2 pose:inspect_tools
    action: 主角翻开工具箱检查内部分层
    sense: 指尖触到冰凉的扳手与生锈的螺丝刀
    mind: 金属的重量暗示着末日里最可靠的承诺
    speech(主角): 这能修好房车吗？

  @beat b3 pose:organize_tools
    action: 女机械师用拇指抹去工具箱上的煤灰
    sense: 金属碰撞声在空荡的修车厂里格外清晰
    mind: 工具箱是最后的秩序，在废墟中维持着生存的逻辑
    speech(女机械师): 修车厂没了，但这些东西还能让车跑起来

  @variant b2 when: affection >= 60
    speech(女机械师): 你要是能修好那辆旧皮卡...我这儿还有备用零件

@end
