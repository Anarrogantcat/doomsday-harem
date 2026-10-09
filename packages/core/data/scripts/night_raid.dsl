# 夜袭榨精 —— 无拒绝选项（INV-5）
@scene night_raid_sister
  title: 夜袭
  participants: 主角, 姐姐
  tone: 私密低语 / 不可拒绝
  when: lust >= 90 && days_since >= 10

  @beat n1 pose:enter
    action: 门被轻轻推开，被子掀开一角，有人钻了进来。
    sense:  一股熟悉的洗发水味，混着夜里的凉气。
    mind:   主角醒了。但没睁眼。
    speech(姐姐): 别装睡。你心跳这么快。

  @beat n2 pose:straddle
    action: 她直接跨坐上来，已经湿了，扶着就往下坐。
    sense:  温热的紧致一下子吞到根部。
    mind:   主角的手还放在被子上，没有动。
    speech(姐姐): 你不动，我自己来。

  @beat n3 pose:ride
    action: 她撑着主角的胸口，起落很快，几乎不留空隙。
    sense:  床在响。她咬着嘴唇不出声。
    mind:   她在数日子。第十一天了。
    speech(姐姐): 谁让你不理我。

  @beat n4 pose:climax
    action: 她猛地坐到底，整个人绷紧，然后软下来。
    sense:  内里一阵阵地绞，把主角也拖了下去。
    mind:   她还是没睁眼。但手已经握住了她的腰。
    speech(姐姐): ……嗯。

  @beat n5 pose:leave
    action: 她起身，把被子盖回主角身上，走到门口。
    sense:  地板很凉，她踮着脚。
    mind:   从头到尾，两个人都没有真正对话。
    speech(姐姐): 明天还敢这样试试。

  @variant n4 when: bond >= 4
    speech(姐姐): 下次……换你来动。

@end
