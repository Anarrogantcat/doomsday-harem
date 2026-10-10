@scene q_pharmacist_s3
  title: 药品仓库对峙
  participants: 主角, 女药剂师
  tone: 紧张对峙，生死一线
  when: mainline_pharmacist_stage >= 3

  @beat b1 pose:scan_area
    action: 主角压低身子，手指轻点腰间的军刀
    sense: 锈蚀的货架在身后发出细微的摩擦声
    mind: 每一步都像在刀尖上行走
    speech(女药剂师): 他们抢的是救命药，不是普通物资

  @beat b2 pose:draw_weapon
    action: 主角猛然拔刀斩向劫匪
    sense: 鲜血喷溅在止痛药的金属盒上
    mind: 暴力是唯一的语言
    speech(主角): 让开！这些药能救活三个人

  @beat b3 pose:throw_potion
    action: 女药剂师甩出装满药剂的玻璃瓶
    sense: 紫色烟雾在空气中凝结成毒雾
    mind: 知识是最后的武器
    speech(女药剂师): 这味道能让任何人呕吐三天

  @variant b2 when: affection >= 60
    speech(女药剂师): 上次你帮我处理的伤口，药效比他们强两倍

@end
