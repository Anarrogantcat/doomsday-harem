@scene q_surgeon_s2
  title: 手术室残响
  participants: 主角, 女外科医生
  tone: 金属器械与消毒水的死寂
  when: mainline_surgeon_stage >= 2

  @beat b1 pose:operate_still
    action: 主角在手术室门口看到手术台前僵直的剪影
    sense: 空气里漂浮着未被清理的血雾颗粒
    mind: 有人在用手术刀雕刻着最后的希望
    speech(女外科医生): 仪器报警声...该死的供电系统

  @beat b2 pose:glove_hold
    action: 女医生攥紧未摘下的橡胶手套转向主角
    sense: 金属器械箱反射着天花板残存的应急灯
    mind: 她的瞳孔里有手术室的冷光在流动
    speech(主角): 您需要帮助吗？

  @beat b3 pose:instrument_pass
    action: 女医生将沾血的手术钳推过台面
    sense: 钳口残留的组织液在金属表面凝结成珠
    mind: 她在用最危险的方式传递信任
    speech(女外科医生): 先处理这个...后面的事得靠你

  @variant b2 when: affection >= 60
    speech(女外科医生): 你比我想象的更可靠，接住吧

@end
