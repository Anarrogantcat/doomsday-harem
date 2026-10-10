@scene q_surgeon_s3
  title: 手术灯下的生死抉择
  participants: 主角, 女外科医生
  tone: 末日医院的窒息感
  when: mainline_surgeon_stage >= 3

  @beat b1 pose:operate_hold
    action: 她攥着沾血的手术刀抵在消毒柜边缘
    sense: 消毒水混着铁锈味在鼻腔炸开
    mind: 每个未闭合的伤口都在她肩头溃烂
    speech(女外科医生): 病人还在手术台等我缝合血管

  @beat b2 pose:step_forward
    action: 主角将辐射检测仪指向走廊方向
    sense: 脚步声在空荡走廊激起回音
    mind: 那个穿白大褂的影子正在成为标本
    speech(主角): 放射值破表了，再过五分钟走廊就成坟场

  @beat b3 pose:clench_fist
    action: 她突然抓住主角防护服袖口
    sense: 金属器械箱的棱角硌进掌心
    mind: 三十年前的医学生誓言正在钙化
    speech(女外科医生): 我发过誓要救活每个倒下的生命

  @variant b2 when: affection >= 60
    speech(女外科医生): 你...你当年在急诊科救过那个孕妇

@end
