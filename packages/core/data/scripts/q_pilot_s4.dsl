@scene q_pilot_s4
  title: 归途
  participants: 主角, 女飞行员
  tone: 肃杀寂静，暗流涌动
  when: mainline_pilot_stage >= 4

  @beat b1 pose:look_around
    action: 女飞行员将视线从云层移向主角脚边的医疗箱
    sense: 金属箱角硌进掌心的刺痛感与潮湿霉味同时爆发
    mind: 每个呼吸都像在抽干最后一滴水
    speech(女飞行员): 导航设备在坠机时损坏了，得靠目视确认坐标

  @beat b2 pose:check_map
    action: 主角用匕首尖挑开地图防水层
    sense: 塑料薄膜撕裂声在空旷舱内激起回响
    mind: 指尖残留的血渍正在渗透纸张纤维
    speech(主角): 西北方向有热源信号，可能...

  @beat b3 pose:signal_flare
    action: 女飞行员突然扯断应急灯绳
    sense: 红色光柱刺破浓雾时，耳膜传来气压骤变的嗡鸣
    mind: 那个坐标点或许埋着能修复飞机的零件
    speech(女飞行员): 先解决眼前这个变量，再谈别的

  @variant b2 when: affection >= 60
    speech(女飞行员): 你处理伤口的手法...比之前那个机械师强

@end
