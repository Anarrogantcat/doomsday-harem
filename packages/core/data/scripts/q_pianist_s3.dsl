@scene q_pianist_s3
  title: 琴房残响
  participants: 主角, 女钢琴家
  tone: 废墟余音，暗藏危机
  when: mainline_pianist_stage >= 3

  @beat b1 pose:examine_sheet_music
    action: 女钢琴家的手指悬停在琴键上方，指节泛白
    sense: 灰尘在斜射进破碎窗框的光柱中缓慢沉降
    mind: 破碎的琴弦在记忆里绷成锋利的弧线
    speech(女钢琴家): 这些乐谱...比我的命更早被埋在这里

  @beat b2 pose:combat_stance
    action: 主角将撬棍抵住门框，金属撞击声惊起腐烂的飞蛾
    sense: 子弹击中变异体时迸发的血雾有焦糖般的甜腥
    mind: 每声枪响都在琴房穹顶激起回音的裂痕
    speech(主角): 你确定要现在取乐谱？这些怪物...

  @beat b3 pose:retrieve_sheet_music
    action: 女钢琴家用琴罩裹住乐谱，布料摩擦出沙沙声
    sense: 纸张纤维在掌心留下细小的刺痛感
    mind: 指尖触到的不仅是乐谱，是未完成的终章
    speech(女钢琴家): 带走它们...但别让琴声死在这破地方

  @variant b2 when: affection >= 60
    speech(女钢琴家): 你听，那些音符在等你把它弹完

@end
