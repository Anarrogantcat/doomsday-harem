@scene q_pilot_s3
  title: 废墟急救
  participants: 主角, 女飞行员
  tone: 末日下的生死抉择
  when: mainline_pilot_stage >= 3

  @beat b1 pose:injured_pilot
    action: 女飞行员用匕首切割急救包的金属扣
    sense: 金属与帆布摩擦的刺耳声响在空荡的机库内回荡
    mind: 她知道此刻的每一秒拖延都可能让伤势恶化
    speech(女飞行员):「听着，我需要肾上腺素和止血带——你有三十秒」

  @beat b2 pose:searching_medical
    action: 主角翻动散落的急救箱寻找止血材料
    sense: 灰尘在应急灯下翻涌成金色的雾
    mind: 指南针在掌心发烫，坠机点坐标正在意识深处闪烁
    speech(主角):「这里只有基础包扎用品...你确定要现在处理伤口吗」

  @beat b3 pose:guiding_treatment
    action: 女飞行员用钢笔尖戳破主角的防护手套
    sense: 乳胶纤维在指腹留下细小的裂痕
    mind: 她突然想起驾驶舱仪表盘上那个永远停在07:42的时钟
    speech(女飞行员):「按压此处——别让血渍浸透你的袖口」

  @variant b2 when: affection >= 60
    speech(女飞行员):「你比那些懦夫可靠...快点，我闻到腐肉味了」

@end
