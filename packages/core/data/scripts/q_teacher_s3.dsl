@scene q_teacher_s3
  title: 废墟深处的抉择
  participants: 主角, 大学女教师
  tone: 压抑紧张的生存危机
  when: mainline_teacher_stage >= 3

  @beat b1 pose:enter_building
    action: 用消防斧尖挑开断裂的门锁
    sense: 锈蚀的金属在斧刃下迸出暗红色火花
    mind: 两个月的逃亡让每个动作都带着神经质的僵硬
    speech(大学女教师):「三楼实验室还有三个学生...必须在天黑前救出来」

  @beat b2 pose:encounter_zombie
    action: 将消防斧横在胸前挡住扑来的丧尸
    sense: 腐烂的脑浆溅在防弹衣上发出黏腻的撞击声
    mind: 暴力正在侵蚀最后的人性防线
    speech(主角):「这边！西侧楼梯有备用电源！」
    @variant b2 when: affection >= 60
    speech(大学女教师):「你退到走廊转角...我来处理」

  @beat b3 pose:rescue_student
    action: 抱起蜷缩在课桌下的女学生
    sense: 被汗水浸透的校服传来微弱的体温
    mind: 每个幸存者都是文明最后的火种
    speech(大学女教师):「坚持住...我们很快就能见到阳光了」

@end
