@scene story_surgeon
  title: 医生
  participants: 主角, 女外科医生
  tone: 强势 / 洁癖 / 专业至上
  when: mainline_surgeon_stage >= 1

  @beat s1 pose:or
    action: 手术室的无影灯亮着，靠一台脚踏发电机供电。
    sense:  器械盘上的器械按顺序摆好，一件不缺。
    mind:   她刚做完一台阑尾手术，病人是三天前捡回来的一个孩子。
    speech(女外科医生): 别进来。这是无菌区。

  @beat s2 pose:meet
    action: 她隔着口罩说话，眼神很凶。
    sense:  她第一眼看的不是主角的脸，是主角手上的伤口。
    mind:   她已经连续工作四十个小时。但她拒绝休息。
    speech(女外科医生): 你手上有伤。处理了吗。

  @beat s3 pose:argue
    action: 她因为主角不按流程处理伤口发了一次火。
    sense:  她说话的时候手一直在整理器械，是强迫性的。
    mind:   她不是脾气差。她是见过太多因为差不多而死的人。
    speech(女外科医生): 差一毫米就是死人。你懂不懂。

  @beat s4 pose:respect
    action: 主角按她的流程做了一遍，她看完，点了一下头。
    sense:  她的肩膀松下来一点。
    mind:   她第一次承认：这个人可以合作。
    speech(女外科医生): ……行。你合格了。

  @beat s5 pose:join
    action: 她清点器械，装箱，写了一张清单贴在箱盖上。
    sense:  她把手术服叠好，放进最底下。
    mind:   她需要一个有电、有水、有干净台面的地方。
    speech(女外科医生): 我需要一间能消毒的屋子。别的我不管。

  @variant s4 when: affection >= 65
    speech(女外科医生): ……你学得挺快。这一点我承认。

@end
