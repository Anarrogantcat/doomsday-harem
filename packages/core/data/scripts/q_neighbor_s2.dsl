@scene q_neighbor_s2
  title: 暗室微光
  participants: 主角, 邻居人妻
  tone: 末日余烬中的脆弱信任
  when: mainline_neighbor_stage >= 2

  @beat b1 pose:door_frame_grasp
    action: 邻居人妻颤抖的手扶住门框，门缝渗出昏黄灯光
    sense: 门轴锈蚀的摩擦声混着潮湿霉味
    mind: 恐惧与求生欲在喉头撕扯
    speech(邻居人妻): 请...请别进来...我丈夫失踪后...一直没敢...

  @beat b2 pose:palm_upward
    action: 主角举起双手示意没有武器
    sense: 老式台灯的光晕在墙面摇晃
    mind: 试探对方戒备的临界点
    speech(主角): 我只是想帮忙...你看起来需要...

  @beat b3 pose:step_back
    action: 邻居人妻后退半步，手指触碰门框内侧
    sense: 木质纹理在指尖留下潮湿的触感
    mind: 信任是末日里最危险的奢侈品
    speech(邻居人妻): 他留下的钥匙...在厨房碗柜第三层...但你要帮我...

  @variant b2 when: affection >= 60
    speech(邻居人妻): 请...进来吧。我丈夫的遗物...或许你能帮我处理...

@end
