@scene q_singlemom_s2
  title: 农庄残影
  participants: 主角, 单亲妈妈
  tone: 没有希望的生存者日常
  when: mainline_singlemom_stage >= 2

  @beat b1 pose:check_well
    action: 单亲妈妈用陶罐舀起井水，手腕骨节因常年劳作泛白
    sense: 泥土腥气混着井水腥甜在鼻腔炸开
    mind: 她的生存方式像某种古老仪式，每个动作都在对抗虚无
    speech(单亲妈妈): 这口井撑了七年，比那些所谓"末日堡垒"活得久

  @beat b2 pose:offer_water
    action: 主角将背包里的净水片放在石板上，金属扣撞击声在空旷的农庄回荡
    sense: 被晒化的塑料包装膜黏在掌心，发出细碎的撕裂声
    mind: 交易永远伴随着背叛的可能，这是末日的生存法则
    speech(主角): 这些能换点粮食吗？我看到温室还有...

  @beat b3 pose:show_crops
    action: 单亲妈妈用枯枝拨开菜畦上的塑料布，露出半截发紫的萝卜
    sense: 土壤里混着碎玻璃的触感，像在抚摸某种工业废墟
    mind: 她的农作物是末日里最后的浪漫主义残骸
    speech(单亲妈妈): 女儿说这是"妈妈的魔法花园"，可我只看见饥饿

  @variant b2 when: affection >= 60
    speech(单亲妈妈): 你比那些举着枪的掠夺者更像人，我女儿...她现在在河边等我

@end
