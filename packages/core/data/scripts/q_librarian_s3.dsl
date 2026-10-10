@scene q_librarian_s3
  title: 潮湿的纸张
  participants: 主角, 女图书管理员
  tone: 末日尘埃中的执念
  when: mainline_librarian_stage >= 3

  @beat b1 pose:bend_over_stack
    action: 她用帆布袋将一摞书捆成方块
    sense: 潮湿的纸张在指缝间渗出霉味
    mind: 每本书都是未完成的逃亡
    speech(女图书管理员): 这些书不能烂在积水里，古籍部的规矩比活命重要

  @beat b2 pose:crouch_inspect
    action: 主角蹲下查看地板裂缝渗出的黑水
    sense: 霉味刺鼻的空气裹着铁锈味
    mind: 她的坚持像发霉的书页般脆弱
    speech(主角): 这些书真值得你冒被感染者围攻的风险？

  @beat b3 pose:brush_spine
    action: 她用袖口拂去书脊积灰
    sense: 纸张触感像老人布满皱纹的手背
    mind: 知识是最后的火种，比肉体更耐久
    speech(女图书管理员): 你看这排字，1943年的铅印，比你见过的任何子弹都锋利

  @variant b2 when: affection >= 60
    speech(女图书管理员): 那天爆炸后，我数着书架倒下的顺序，就像数着最后的逃生路线

@end
