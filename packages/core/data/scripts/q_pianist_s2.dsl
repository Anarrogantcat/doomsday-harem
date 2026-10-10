@scene q_pianist_s2
  title: 废墟琴音
  participants: 主角, 女钢琴家
  tone: 废墟余音，末日残响
  when: mainline_pianist_stage >= 2

  @beat b1 pose:stage_center
    action: 女钢琴家的手指在走音的琴键上滑动，指节泛白
    sense: 空气里漂浮着灰尘和潮湿的霉味，琴声像生锈的刀片划过耳膜
    mind: 音符在混凝土裂缝中破碎，生存本能与艺术执念的对峙
    speech(女钢琴家): 这架钢琴的肋骨都断裂了，但音阶还在挣扎

  @beat b2 pose:step_forward
    action: 主角在舞台边缘停住，靴底碾碎散落的乐谱残页
    sense: 琴箱震动传递到脚底，像触摸到某种垂死的生物
    mind: 战斗训练中没学过如何与艺术家谈判，但此刻更危险
    speech(主角): 为什么在末日还...还弹这破东西？

  @beat b3 pose:piano_stroke
    action: 女钢琴家突然转身，琴凳在地面划出刺耳声响
    sense: 琴键冰凉的触感渗入掌心，像握住了时间的碎片
    mind: 她眼底的执拗比任何丧尸都更接近疯狂
    speech(女钢琴家): 你听得到吗？地底的共鸣——那是人类最后的和声

  @variant b2 when: affection >= 60
    speech(女钢琴家): 你...你也懂音乐？这废墟里终于有人能听懂了

@end
