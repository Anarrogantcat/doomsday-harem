@scene q_idol_s4
  title: 锈蚀的频率
  participants: 主角, 前偶像
  tone: 孤寂与执念交织的频率
  when: mainline_idol_stage >= 4

  @beat b1 pose:signal_scan
    action: 前偶像用生满老茧的手指调试天线，金属外壳在她掌心留下青白痕迹
    sense: 指尖传来锈蚀金属的涩感，耳麦里电流声与断续的旧歌旋律共振
    mind: 每次重启发射器都像在拆解自己，但声音必须穿过这该死的静默
    speech(前偶像):「《星轨》的副歌部分还有37秒，这次一定要播完」

  @beat b2 pose:cross_zone
    action: 主角蹲在控制台前，指尖划过满是裂痕的全息屏
    sense: 灰尘在光束中悬浮，广播声里混着沙沙的静电杂音
    mind: 这个疯女人竟用残破的音响系统维持着某种仪式感
    speech(主角):「为什么非要播这首歌？」

  @beat b3 pose:rescue
    action: 前偶像突然按下播放键，老式唱片机发出刺耳的摩擦声
    sense: 钢琴声刺破死寂，混着窗外呼啸的风声在空荡的电台里震荡
    mind: 十七岁那年在舞台下的誓言，此刻正顺着电磁波爬向未知
    speech(前偶像):「因为这是最后能证明我们还存在的证据」

  @variant b2 when: affection >= 60
    speech(前偶像):「你听，这段和声里藏着我女儿的生日」

@end
