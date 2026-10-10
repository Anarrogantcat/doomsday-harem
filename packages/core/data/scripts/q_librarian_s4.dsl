@scene q_librarian_s4
  title: 负重前行
  participants: 主角, 女图书管理员
  tone: 末日余烬中的沉重使命
  when: mainline_librarian_stage >= 4

  @beat b1 pose:inspect_books
    action: 她用指节叩击纸箱边缘测试承重
    sense: 纸浆纤维在指腹下显出龟裂纹路
    mind: 每本书都是未熄灭的火种
    speech(女图书管理员): 这些书比你想象的更脆弱

  @beat b2 pose:carry_box
    action: 主角将装满古籍的木箱扛上肩
    sense: 潮湿的霉味从箱缝渗出
    mind: 肩胛骨传来针扎般的钝痛
    speech(主角): 需要我帮你分担吗

  @beat b3 pose:check_shelf
    action: 她用袖口擦拭书架上的积灰
    sense: 指尖触到木纹里嵌着的碎纸屑
    mind: 知识的重量正在腐蚀现实
    speech(女图书管理员): 把箱角卡进凹槽，别让雨水浸透书脊

  @variant b2 when: affection >= 60
    speech(女图书管理员): 你比那些搬书的士兵更懂轻拿轻放

@end
