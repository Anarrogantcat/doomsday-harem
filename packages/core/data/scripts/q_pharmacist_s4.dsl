@scene q_pharmacist_s4
  title: 药房抉择
  participants: 主角, 女药剂师
  tone: 药香中的生存博弈
  when: mainline_pharmacist_stage >= 4

  @beat b1 pose:shelf_scanning
    action: 女药剂师用戴着橡胶手套的手指划过满墙药瓶
    sense: 玻璃药瓶在金属架上发出细碎碰撞声
    mind: 她的防御机制像药柜门闩般严丝合缝
    speech(女药剂师): 这些止痛药的配方，我只负责调配到第三步

  @beat b2 pose:table_reaching
    action: 主角将沾着血迹的急救包推过桌面
    sense: 布料摩擦桌面的窸窣声混着消毒水气味
    mind: 生存需要更多 than 你想象的协作
    speech(主角): 仓库的防爆门需要专业爆破知识

  @beat b3 pose:desk_blocking
    action: 女药剂师用制药天平挡住半张脸
    sense: 铜质天平臂发出细微金属震颤
    mind: 她的药剂学训练让她恐惧所有不可控变量
    speech(女药剂师): 我的手术刀切不开钢筋，这点很遗憾

  @variant b2 when: affection >= 60
    speech(女药剂师): 如果你能让防爆门的液压杆保持静音...或许我可以考虑

@end
