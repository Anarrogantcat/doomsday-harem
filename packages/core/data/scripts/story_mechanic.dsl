@scene story_mechanic
  title: 扳手与机油
  participants: 主角, 女机械师
  tone: 爽利务实 / 动手能力极强
  when: mainline_mechanic_stage >= 1

  @beat m1 pose:garage
    action: 修车厂的卷帘门被撞塌了，但她把一台举升机修好了。
    sense:  机油味混着铁锈味，是这里唯一还活着的味道。
    mind:   她在这儿待了两个月，靠一台没油的车和一堆废件活着。
    speech(女机械师): 你要是来借工具的，自己拿。别问价。

  @beat m2 pose:meet
    action: 她从车底滑出来，脸上全是黑印子。
    sense:  她手里攥着一把扳手，指节粗，指甲剪得很短。
    mind:   她扫了一眼主角的鞋，就知道她走了多远的路。
    speech(女机械师): 车坏了吧。我看你脚上那层泥。

  @beat m3 pose:fix
    action: 她蹲在房车旁边，听了一分钟发动机，就报出了三个问题。
    sense:  她把手直接伸进烫的机舱里，眉头都没皱。
    mind:   她修了二十年车。这是她唯一会的事，也是她最骄傲的事。
    speech(女机械师): 皮带松了，油路堵了，还有个螺丝快掉了。半小时。

  @beat m4 pose:talk
    action: 她一边拧螺丝一边说话，说的全是车，没有一句自己的事。
    sense:  扳手碰撞的声音很规律，像节拍器。
    mind:   她没说她的店是怎么没的。但地上的碎玻璃说明了一切。
    speech(女机械师): 你别问我的事。问车就行。

  @beat m5 pose:join
    action: 她把工具箱扣上，站起来，拍了拍裤子。
    sense:  她看了一眼主角那台普通房车。
    mind:   她眼睛亮了一下——那是看见值得修的东西的眼神。
    speech(女机械师): 你这车，能改。我跟你走。

  @variant m3 when: affection >= 60
    speech(女机械师): ……不过你要真想听，改完车我再说。

@end
