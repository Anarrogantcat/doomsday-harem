@scene q_colleague_s3
  title: 余烬中的坦诚
  participants: 主角, 前同事
  tone: 压抑凝滞的对峙
  when: mainline_colleague_stage >= 3

  @beat b1 pose:signal_stop
    action: 前同事突然按停打印机，纸张在出纸口堆积成山
    sense: 油墨味混着金属锈蚀的腥气在密闭空间发酵
    mind: 她的指节在控制面板上叩出慌乱的节奏
    speech(前同事): 你...真的还活着？

  @beat b2 pose:reach_out
    action: 主角缓缓举起右手，五指张开停在半空
    sense: 腐蚀的办公桌边缘硌着掌心，金属支架传来震颤
    mind: 那些被掩埋的往事正在碎裂成玻璃渣
    speech(主角): 我需要你告诉我真相

  @beat b3 pose:turn_face
    action: 前同事将后背抵住布满裂痕的玻璃幕墙
    sense: 指尖在防爆膜上划出细小裂痕，映出扭曲的倒影
    mind: 信任是比子弹更难穿透的屏障
    speech(前同事): 你得先证明自己不是来收割的

  @variant b2 when: affection >= 60
    speech(前同事): 你手背的疤痕...和当年实验室爆炸时一模一样

@end
