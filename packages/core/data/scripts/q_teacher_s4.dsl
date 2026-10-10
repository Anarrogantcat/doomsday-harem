@scene q_teacher_s4  
  title: 归途凝望  
  participants: 主角, 大学女教师  
  tone: 压抑凝重，警觉未减  
  when: mainline_teacher_stage >= 4  

  @beat b1 pose:carry_book_axe  
    action: 她将消防斧柄抵在腰侧，书包带勒进掌心  
    sense: 指尖触到书包缝线处干涸的血渍，铁锈味在齿间泛开  
    mind: 那栋楼的通风管道还卡着半截断肢，像根生锈的钉子  
    speech(大学女教师): 「别回头。」  

  @beat b2 pose:glance_back  
    action: 主角踩碎路面玻璃，折射的光斑在她瞳孔里跳动  
    sense: 风卷着焦塑料味掠过耳际，远处楼顶的避雷针闪着冷光  
    mind: 三个月前的暴雨夜，那根针曾劈断过三具尸体  
    speech(主角): 「还有多少人没出去？」  

  @beat b3 pose:tense_walk  
    action: 她突然停步，书包撞在主角肩甲上  
    sense: 脚底碎石滚动声戛然而止，楼体深处传来金属挤压声  
    mind: 地下室的防爆门还在，但门锁已被撬成扭曲的麻花  
    speech(大学女教师): 「后面...有东西在爬。」  

  @variant b2 when: affection >= 60  
    speech(大学女教师): 「你比那些士兵更靠得住。」

@end
