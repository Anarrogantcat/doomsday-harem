@scene q_pharmacist_s2
  title: 药库探踪
  participants: 主角, 女药剂师
  tone: 废墟中的危险试探
  when: mainline_pharmacist_stage >= 2

  @beat b1 pose:approach_caution
    action: 女药剂师用靴尖踢动翻倒的货架残骸
    sense: 锈蚀的金属味混着潮湿的霉菌气息
    mind: 每个废弃场所都藏着末日的生存密码
    speech(女药剂师): 注意脚下，这些货架可能随时塌陷

  @beat b2 pose:inspect_shelf
    action: 主角举起电筒照射仓库深处的阴影
    sense: 光束扫过墙面时扬起细小的尘粒
    mind: 明亮的光线反而会暴露更多危险
    speech(主角): 这里似乎有最近活动的痕迹

  @beat b3 pose:prepare_defense
    action: 女药剂师将药剂瓶排列成防御阵型
    sense: 玻璃瓶相撞发出清脆的金属颤音
    mind: 知识与暴力的平衡是生存的精髓
    speech(女药剂师): 保持距离，我需要时间判断威胁等级

  @variant b2 when: affection >= 60
    speech(女药剂师): 你比我预想的更谨慎，或许可以共享些配方知识

@end
