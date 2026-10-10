@scene q_idol_s3
  title: 信号塔争夺战
  participants: 主角, 前偶像
  tone: 废墟深处的生死博弈
  when: mainline_idol_stage >= 3

  @beat b1 pose:signal_scan
    action: 前偶像将手掌贴在布满弹孔的通讯设备上
    sense: 指尖传来金属外壳被汗渍浸透的黏腻触感
    mind: 旧日聚光灯下的掌声与此刻枪械的金属碰撞声重叠
    speech(前偶像):「这台机器还能用...当年我们演出时的音响比这破烂多了」

  @beat b2 pose:cross_zone
    action: 主角甩出电磁脉冲弹击碎敌方无人机
    sense: 空气中炸开的电火花在虹膜上烙下灼烧的残影
    mind: 每个动作都像在重演舞台剧的定格画面
    speech(主角):「你确定要现在播放录像？」

  @beat b3 pose:rescue
    action: 前偶像用身体挡住袭来的子弹
    sense: 血腥味混着旧CD机的塑料烧焦味在鼻腔炸开
    mind: 舞台上的完美谢幕与此刻的残缺躯体形成残酷互文
    speech(前偶像):「至少...至少让世界记住我们最后的演出」

  @variant b2 when: affection >= 60
    speech(前偶像):「把录像留到胜利后吧...我还没谢幕呢」

@end
