@scene q_mechanic_s3
  title: 机油与铁锈的低语
  participants: 主角, 女机械师
  tone: 机械的喘息与人性的余温
  when: mainline_mechanic_stage >= 3

  @beat b1 pose:wrench_clean
    action: 她用麂皮擦拭沾满油污的扳手，指节泛着青白
    sense: 金属撞击声混着柴油味在狭小车间震颤
    mind: 二十年的机油渗进指纹沟壑，成为另一种皮肤
    speech(女机械师): 这把扳手救过三个活人，现在轮到它被救了

  @beat b2 pose:tool_box_inspect
    action: 主角蹲身查看墙角的旧工具箱，箱角嵌着半截锈蚀的齿轮
    sense: 铁锈簌簌落在工装裤裤脚，发出细碎的叹息
    mind: 机械师的工具箱从来不是装饰品，而是某种墓碑
    speech(主角): 这箱子...能修好房车的引擎吗

  @beat b3 pose:box_open
    action: 她踢开挡路的油桶，锈蚀的工具箱自动弹开
    sense: 铁锈味混合着某种旧日的机油气息扑面而来
    mind: 每件工具都带着不同车主的体温与故事
    speech(女机械师): 用它修车，得先学会听金属说话

  @variant b2 when: affection >= 60
    speech(女机械师): 你比上次来时干净了些，至少没带着血腥味

@end
