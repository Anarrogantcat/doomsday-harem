@scene q_idol_s2
  title: 电台废墟
  participants: 主角, 前偶像
  tone: 金属锈蚀与电流杂音交织
  when: mainline_idol_stage >= 2

  @beat b1 pose:check_equipment
    action: 前偶像用颤抖的手指触摸锈蚀的调频旋钮
    sense: 指尖传来金属表面凝结的冰霜碎裂声
    mind: 过去的聚光灯此刻成了刺眼的审判
    speech(前偶像):「这台机器...还能再唱一首《星尘》吗？」

  @beat b2 pose:encounter_hostile
    action: 主角用猎枪抵住突然从通风管坠落的变异体
    sense: 硝烟味混着腐烂内脏的腥气在空气中炸开
    mind: 血溅上控制台的瞬间，仿佛看见舞台血案重演
    speech(主角):「你刚才说的『星尘』...是坐标吗？」

  @beat b3 pose:discover_archive
    action: 前偶像从碎玻璃中抽出缠满蛛网的录像带
    sense: 胶片摩擦声像极了十五年前的演出倒计时
    mind: 每一帧画面都在质问幸存者的意义
    speech(前偶像):「这首未完成的歌...或许该由你来结尾」

  @variant b2 when: affection >= 60
    speech(前偶像):「你听，枪声和当年的掌声...节奏还挺像」

@end
