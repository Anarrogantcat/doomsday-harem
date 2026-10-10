@scene q_nun_s3
  title: 墓园残烛
  participants: 主角, 修女
  tone: 肃杀与虔诚交织
  when: mainline_nun_stage >= 3

  @beat b1 pose:cross_zone
    action: 修女用拐杖轻敲墓碑上的积灰
    sense: 潮湿的泥土混合着腐烂野花的气味渗入指缝
    mind: 每块石碑都是未完成的墓志铭
    speech(修女): 这些名字需要重新排列...才能与地下的灵魂对得上

  @beat b2 pose:signal_scan
    action: 主角的军靴碾碎枯骨发出脆响
    sense: 破碎的骸骨在靴底发出类似玻璃的嗡鸣
    mind: 骷髅手从灌木丛中突然抽出半截
    speech(主角): 地下还有...东西在动

  @beat b3 pose:rescue
    action: 修女将十字架按进墓碑裂缝
    sense: 铁锈味的圣水顺着石纹渗入泥土
    mind: 那些未被埋葬的，终将在这里获得名字
    speech(修女): 手写纪事在祭坛第三层抽屉...和你的名字并排

  @variant b2 when: affection >= 60
    speech(修女): 你听，地底的呜咽声...我们该给它们一个出口

@end
