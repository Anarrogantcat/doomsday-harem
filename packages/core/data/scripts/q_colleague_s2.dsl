@scene q_colleague_s2  
  title: 纸页余温  
  participants: 主角, 前同事  
  tone: 压抑凝滞的末日余烬  
  when: mainline_colleague_stage >= 2  

  @beat b1 pose:stand_still  
    action: 主角在满是灰尘的办公桌前停下，目光落在仍在吐纸的打印机上  
    sense: 纸张摩擦的沙沙声在空荡的办公室里格外刺耳  
    mind: 那些被时代抛弃的日常，此刻竟成了最真实的触感  
    speech(前同事): （打印机吞吐纸张的噪音中混着低哑的喘息）别碰那个…  

  @beat b2 pose:cross_arm  
    action: 前同事突然停下打印，转身面对主角，指尖还沾着墨水  
    sense: 打印机的蓝光映在她脸上，像某种不详的符咒  
    mind: 她的袖口露出半截烧伤的疤痕，与记忆中那个总爱熬夜改方案的姑娘重叠  
    speech(主角): 你还记得…我们加班时的咖啡机吗？  

  @beat b3 pose:reach_out  
    action: 前同事从抽屉抽出一叠泛黄的纸张，边缘还沾着咖啡渍  
    sense: 纸页间飘落几片干枯的银杏叶，不知是哪年秋天的遗物  
    mind: 每张纸的折痕都像未愈合的伤口，而她的眼泪正在纸面晕开墨迹  
    speech(前同事): （声音突然轻下来）公司最后的库存…还有你的档案  

  @variant b2 when: affection >= 60  
    speech(前同事): （喉结滚动）那台咖啡机…我后来偷偷搬去地下室了

@end
