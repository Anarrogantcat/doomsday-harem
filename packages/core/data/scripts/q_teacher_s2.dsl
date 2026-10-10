@scene q_teacher_s2
  title: 血色通道
  participants: 主角, 大学女教师
  tone: 焦灼与求生的临界点
  when: mainline_teacher_stage >= 2

  @beat b1 pose:cross_zone
    action: 主角将砍刀抵在腐烂的门框缝隙，金属与骨骼发出刺耳摩擦声
    sense: 空气里浮动着腐烂内脏的酸涩，远处传来指甲抓挠水泥的沙沙声
    mind: 每一步都在重写生存概率的方程
    speech(大学女教师): 三秒后换气，用喉咙发出呜咽声

  @beat b2 pose:signal_scan
    action: 主角突然压低身子，瞳孔锁定三十米外摇晃的红色校服
    sense: 汗水在后颈形成盐渍，耳膜震动着丧尸集群的低频嗡鸣
    mind: 声波图谱在视网膜上自动解析
    speech(主角): 东南方有密集移动，但... 

  @beat b3 pose:rescue
    action: 女教师用伞柄挑开垂落的腐烂手臂，伞骨断裂声在寂静中炸开
    sense: 橡胶伞面吸附着暗红血痂，腥气顺着伞骨纹路爬满指节
    mind: 每个教学楼的逃生通道都在记忆里重组
    speech(大学女教师): 教学楼B区有通风井，跟紧我

  @variant b2 when: affection >= 60
    speech(大学女教师): 东南方是安全区，相信我，我不会让你受伤

@end
