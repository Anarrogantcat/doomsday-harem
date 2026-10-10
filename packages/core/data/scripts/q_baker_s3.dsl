@scene q_baker_s3
  title: 余温未尽
  participants: 主角, 女烘焙师
  tone: 压抑中透出微弱希望
  when: mainline_baker_stage >= 3

  @beat b1 pose:inspect_oven
    action: 女烘焙师将手掌贴在烤箱金属表面缓慢滑动
    sense: 指腹传来灼热的金属震颤，混着面包焦香的空气在指缝间流动
    mind: 她用体温丈量着最后的生存价值
    speech(女烘焙师): 这台老式德式烤炉还能维持45分钟，足够让麦粒重新裂开缝隙

  @beat b2 pose:pull_arm
    action: 主角抓住她布满烫伤疤痕的手腕轻轻向后拉
    sense: 皮肤下凸起的血管像即将决堤的暗河
    mind: 每道疤痕都在诉说某个被遗忘的黄昏
    speech(主角): 你已经三天没吃过完整的一餐了

  @beat b3 pose:face_resolute
    action: 她突然转身将面粉袋甩出弧线缠住主角脚踝
    sense: 细腻的面粉颗粒在空气中凝成短暂的雾幕
    mind: 有些东西比生存更需要守护
    speech(女烘焙师): 没有面包的基地只是个墓地

  @variant b2 when: affection >= 60
    speech(女烘焙师): 如果你肯带回去这个...（从围裙口袋掏出泛黄的笔记本）配方本里的发酵方法能多养活两个人

@end
