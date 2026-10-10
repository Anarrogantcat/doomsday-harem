@scene q_pilot_s2
  title: 机库深处的幸存者
  participants: 主角, 女飞行员
  tone: 压抑的机械回响
  when: mainline_pilot_stage >= 2

  @beat b1 pose:signal_scan
    action: 主角举着应急灯照向维修间角落
    sense: 金属锈味刺鼻，机油在地面凝结成暗红块状
    mind: 这个位置能看见坠机时的冲撞轨迹
    speech(女飞行员): 别碰那个液压阀...会喷射高压油

  @beat b2 pose:cross_zone
    action: 主角蹲下检查女飞行员小腿伤口
    sense: 血迹在水泥地上晕开，混着金属碎屑的颗粒感
    mind: 她的求生本能比伤势更危险
    speech(主角): 你为什么留在这里？

  @beat b3 pose:rescue
    action: 女飞行员用匕首划开急救包
    sense: 消毒棉球接触伤口时的灼烧感，伴随着金属碰撞声
    mind: 每个幸存者都是移动的陷阱
    speech(女飞行员): 坠机坐标在西北方向...但要先处理这个

  @variant b2 when: affection >= 60
    speech(女飞行员): 你身上有航空燃油的味道...不是军用型号

@end
