@scene q_mother_s4
  title: 归途沉默
  participants: 主角, 母亲
  tone: 压抑的车厢内敛张力
  when: mainline_mother_stage >= 4

  @beat b1 pose:clutch_seat
    action: 母亲的指尖反复摩挲着车窗边缘
    sense: 防弹玻璃外飘进的沙砾在她掌心留下细碎颗粒感
    mind: 车厢内凝固的空气里漂浮着未说出口的往事
    speech(母亲): 你...还记得老房子的阁楼吗？

  @beat b2 pose:turn_head
    action: 主角侧头观察母亲紧绷的下颌线
    sense: 气味净化器的嗡鸣中混入一丝铁锈味
    mind: 她的沉默比枪声更让人不安
    speech(主角): 你是不是...后悔带我回去？

  @beat b3 pose:wipe_eye
    action: 母亲突然抬手擦过眼角
    sense: 指腹残留的温热在车窗上晕开模糊水痕
    mind: 破碎的玻璃倒影里浮现二十年前的自己
    speech(母亲): 那些东西...不该被挖出来的

  @variant b2 when: affection >= 60
    speech(母亲): 你比当年的我...勇敢得多

@end
