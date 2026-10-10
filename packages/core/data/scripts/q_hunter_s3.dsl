@scene q_hunter_s3
  title: 林间对峙
  participants: 主角, 女猎人
  tone: 警惕与试探的氛围
  when: mainline_hunter_stage >= 3

  @beat b1 pose:descend_tree
    action: 她松开树皮褶皱，脚尖轻点树干下滑
    sense: 松针刺入掌心的颗粒感随动作加剧
    mind: 每块肌肉都在计算对方的威胁等级
    speech(女猎人): 火镰在腰间晃了晃，金属鞘面映出树影

  @beat b2 pose:step_forward
    action: 主角右脚碾碎腐殖土上的野莓
    sense: 甜腻汁液沾满靴底的腥涩
    mind: 脊椎持续弓起却找不到撤退路线
    speech(主角): 你追踪我三天了，想问什么？

  @beat b3 pose:draw_spear
    action: 长矛尖端突然挑起三尺外的枯枝
    sense: 冷铁划破空气的震颤贴着后颈
    mind: 二十年山林经验在评估对方瞳孔收缩速度
    speech(女猎人): 你闻到硫磺味了吗？东南方向

  @variant b2 when: affection >= 60
    speech(女猎人): 你靴底的泥渍和三天前的吻合，或许值得听个故事

@end
