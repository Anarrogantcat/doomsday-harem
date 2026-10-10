@scene q_neighbor_s3
  title: 暗室迁徙
  participants: 主角, 邻居人妻
  tone: 压抑中透出微弱希望
  when: mainline_neighbor_stage >= 3

  @beat b1 pose:door_hold
    action: 主角的手指在生锈的门框上叩出三短一长的节奏
    sense: 铁门内侧凝结的水珠顺着指缝渗入掌心
    mind: 这扇门后的阴影里藏着比丧尸更危险的执念
    speech(邻居人妻): 你...你真的要带我走？

  @beat b2 pose:box_lift
    action: 邻居人妻用冻僵的手指掀开行李箱拉链
    sense: 尘封的樟脑味裹着半张泛黄的全家福扑面而来
    mind: 照片里那个穿白大褂的男人正在某处啃食着腐烂的电缆
    speech(主角): 里面有什么需要特别注意的？

  @variant b2 when: affection >= 60
    speech(邻居人妻): 那件军绿色外套...能帮我收起来吗？

  @beat b3 pose:wall_press
    action: 邻居人妻突然用肩膀抵住墙面，行李箱在地面划出尖锐的摩擦声
    sense: 楼道深处传来金属管道震颤的嗡鸣
    mind: 她的恐惧正在把这间屋子变成活的茧房
    speech(邻居人妻): 你听...那声音像不像他？

@end
