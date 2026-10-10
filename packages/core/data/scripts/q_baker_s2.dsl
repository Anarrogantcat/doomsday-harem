@scene q_baker_s2
  title: 碎窗余温
  participants: 主角, 女烘焙师
  tone: 焦糖色的绝望与馈赠
  when: mainline_baker_stage >= 2

  @beat b1 pose:kneel_counter
    action: 女烘焙师将发黑的面包袋推过柜台
    sense: 面包焦香混着她袖口的面粉灰扑面而来
    mind: 她用最后的力气维持着面包店的体面
    speech(女烘焙师): 先吃...别嫌弃

  @beat b2 pose:reach_grab
    action: 主角接过面包袋时碰到她青紫的腕骨
    sense: 面包袋内侧粘着半片干枯的迷迭香
    mind: 三天没进食的人仍记得给陌生人留面包
    speech(主角): 你...饿吗

  @beat b3 pose:bend_shelf
    action: 女烘焙师弯腰整理倒塌的面粉袋
    sense: 指尖刮过货架留下的细小木刺扎进掌心
    mind: 烤炉余温是她最后的尊严堡垒
    speech(女烘焙师): 配方本...给你

  @variant b2 when: affection >= 60
    speech(女烘焙师): 你闻到了吗？迷迭香是最后的调味料

@end
