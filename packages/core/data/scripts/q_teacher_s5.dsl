@scene q_teacher_s5
  title: 鞋柜秩序
  participants: 主角, 大学女教师
  tone: 废墟中重建的脆弱希望
  when: mainline_teacher_stage >= 5

  @beat b1 pose:整理鞋柜
    action: 她用袖口擦拭抽屉把手，金属反光刺痛眼睛
    sense: 灰尘在斜射的光柱里悬浮，像被惊扰的磷火
    mind: 每个褶皱都藏着求生的隐喻，她必须成为锚点
    speech(大学女教师):「从明天开始，六点零七分准时起床。」

  @beat b2 pose:观察整理
    action: 主角蹲踞在门框阴影里，手指无意识摩挲枪柄
    sense: 她后颈的汗珠滚落，在军用背心褶皱里洇出深色痕迹
    mind: 那栋楼的回声还在耳膜深处震颤，此刻却要适应新秩序
    speech(主角):「那些书...还要留着吗？」

  @beat b3 pose:分类物品
    action: 她将旧教材按学科叠成棱角分明的方块
    sense: 铁皮饼干盒碰撞出清脆声响，惊醒了角落的鼠群
    mind: 知识是最后的奢侈品，必须用纪律浇筑成堡垒
    speech(大学女教师):「生存需要代价，你准备好了吗？」

  @variant b2 when: affection >= 60
    speech(大学女教师):「...如果你愿意，可以帮我核对书目。」

@end
