@scene story_nun
  title: 山脚下的回声
  participants: 主角, 修女
  tone: 表面虔诚 / 私下好奇
  when: mainline_nun_stage >= 1

  @beat n1 pose:chapel
    action: 教堂的门开着，蜡烛还在烧，但已经没有人来做礼拜。
    sense:  烛油积了很厚一层，像凝固的时间。
    mind:   她每天点一支，不是为神，是为那些没来得及下葬的人。
    speech(修女): 你来了。进来坐吧，外面冷。

  @beat n2 pose:ledger
    action: 她拿出一本厚册子，上面密密麻麻写着名字和日期。
    sense:  字很小，但一笔一划都很稳。
    mind:   她记了四百三十七个人。有名字的，和没名字的。
    speech(修女): 我不知道他们算不算得救。我只能记下来。

  @beat n3 pose:question
    action: 她问主角：你信吗。
    sense:  烛火晃了一下。
    mind:   主角没有回答。她也没有追问。
    speech(修女): 不信也没关系。记录这件事，不需要信。

  @beat n4 pose:walk
    action: 她带主角去看后院的坟，一排一排，每个都插着木牌。
    sense:  土是新的。她一个人挖的。
    mind:   她手上全是茧，指甲缝里有洗不掉的泥。
    speech(修女): 我不祈祷。我只负责让她们有个地方。

  @beat n5 pose:join
    action: 她说她想去安全屋，但有一个条件：要留一面墙给这些名字。
    sense:  她把册子抱在怀里，像抱圣物。
    mind:   主角答应了。她第一次笑。
    speech(修女): 谢谢。我会把你的名字也写上——但要等很久以后。

  @variant n5 when: affection >= 65
    speech(修女): 不过你那页，我想空着。空着比较好。

@end
