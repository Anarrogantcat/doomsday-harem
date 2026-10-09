@scene story_hunter
  title: 沉默的幸存者
  participants: 主角, 女猎人
  tone: 沉默寡言 / 只信山林
  when: mainline_hunter_stage >= 1

  @beat h1 pose:tracks
    action: 主角在林子边缘发现三天的脚印，每一处都踩在落叶最厚的地方。
    sense:  没有折断一根树枝，没有留下一点痕迹。
    mind:   她不是躲丧尸。她是在躲人。
    speech(女猎人): （她没有出声。但主角知道她在看。）

  @beat h2 pose:watch
    action: 第七天，她终于从树上下来，站在离主角十米远的地方。
    sense:  她身上是松针和烟熏的味道。
    mind:   她观察了主角七天，确认她不会带人来。
    speech(女猎人): 你一个人。

  @beat h3 pose:share
    action: 她扔过来一只烤好的兔子，然后转身走了。
    sense:  肉还是热的，盐放得很准。
    mind:   她不吃别人给的东西。但会分给别人。
    speech(女猎人): 吃。别跟着我。

  @beat h4 pose:trust
    action: 第十天，她带主角去看了一片蘑菇地和一个干净的水源。
    sense:  她指路的手势很短，几乎没有多余动作。
    mind:   她开始把主角当成不会破坏这里的人。
    speech(女猎人): 这个，能吃。那个，有毒。

  @beat h5 pose:settle
    action: 她说不进屋。她会在山腰自己搭个棚子。
    sense:  她把弓背在背上，站在林子边上。
    mind:   对她来说，基地不是墙，是能互相照应的人。
    speech(女猎人): 你们在里面。我在外面。有事喊我。

  @variant h5 when: affection >= 70
    speech(女猎人): ……或者，你要是出来，可以带上我。

@end
