@scene q_surgeon_s4
  title: 临时手术室
  participants: 主角, 女外科医生
  tone: 压抑紧迫的末日求生
  when: mainline_surgeon_stage >= 4

  @beat b1 pose:inspect_door
    action: 她用手术刀尖挑开锈蚀的门锁
    sense: 金属摩擦声混着霉味涌出
    mind: 这扇门后可能埋着十年前的病历本
    speech(女外科医生):「消毒灯还在运作，说明这里有电力」

  @beat b2 pose:check_equipment
    action: 主角蹲下检查角落的器械箱
    sense: 潮湿的金属触感黏在指腹
    mind: 这些器械可能携带变异病菌
    speech(主角):「需要我帮你处理器械吗」

  @beat b3 pose:cross_zone
    action: 她突然拽住主角衣袖
    sense: 血压计的橡胶管在掌心发烫
    mind: 每次手术都像在赌命
    speech(女外科医生):「这里能做手术，但要立刻开始」

  @variant b2 when: affection >= 60
    speech(女外科医生):「有你在的话...器械消毒可以省下半小时」

@end
