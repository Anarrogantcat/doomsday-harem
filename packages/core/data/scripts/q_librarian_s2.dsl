@scene q_librarian_s2
  title: 目录卡中的秘密
  participants: 主角, 女图书管理员
  tone: 末日静谧中的隐秘搜寻
  when: mainline_librarian_stage >= 2

  @beat b1 pose:examine_shelf
    action: 主角手指轻轻翻动泛黄的目录卡
    sense: 纸张纤维在指腹留下粗糙的触感，夹杂着陈年灰尘的腥涩
    mind: 每一张卡片都可能藏着通往生存的线索
    speech(女图书管理员): 这些卡片的排列...比末日前多了三道折痕

  @beat b2 pose:discover_key
    action: 从目录卡夹层抽出锈迹斑斑的铜钥匙
    sense: 金属表面凝结的冷霜渗入掌纹，钥匙齿间卡着半片干枯的紫罗兰
    mind: 钥匙柄的磨损痕迹与管理员的执拗形成微妙呼应
    speech(主角): 这是...古籍区的备用钥匙？

  @beat b3 pose:shadow_approach
    action: 女图书管理员从阴影中缓步走来
    sense: 黑色制服摩擦出沙沙声，空气里泛起细小的尘埃漩涡
    mind: 她的脚步声像是某种古老的密码
    speech(女图书管理员): 三十七年前我埋下它时，图书馆还亮着灯

  @variant b2 when: affection >= 60
    speech(女图书管理员): 你找到了...这些卡片是我用最后的体温焐热的

@end
