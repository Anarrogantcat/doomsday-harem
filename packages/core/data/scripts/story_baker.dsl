@scene story_baker
  title: 面包与黄油
  participants: 主角, 女烘焙师
  tone: 温暖健谈 / 习惯分享
  when: mainline_baker_stage >= 1

  @beat b1 pose:bakery
    action: 面包店的橱窗碎了，但里面的烤炉还是热的。
    sense:  面粉的味道盖过了外面的腐味。
    mind:   末日那天她还在烤最后一炉。她没跑。
    speech(女烘焙师): 哎——进来吧，刚出炉的，还热。

  @beat b2 pose:meet
    action: 她围着一条沾满面粉的围裙，手上有烫伤的疤。
    sense:  她把一个纸袋塞进主角手里，动作很自然。
    mind:   她已经三天没吃东西了。但她先把面包给了别人。
    speech(女烘焙师): 拿着。别客气，我这还有。

  @beat b3 pose:reason
    action: 她说她留下来是因为烤箱还能用，扔了可惜。
    sense:  她说话的时候一直在擦操作台，其实已经干净了。
    mind:   她不是舍不得烤箱。她是舍不得还能给别人做点什么这件事。
    speech(女烘焙师): 人活着总得有点用吧。

  @beat b4 pose:supply
    action: 她把最后的酵母分了一半给主角，还写了配方。
    sense:  那张纸被她折得很整齐，像一封重要的信。
    mind:   酵母是活的。她把这句说了两遍。
    speech(女烘焙师): 这个你收好。它能自己长。

  @beat b5 pose:join
    action: 她走进安全屋的厨房，先打开所有柜子看了一遍。
    sense:  她系上围裙，把袖子挽起来。
    mind:   她终于又站在一个能开火的地方了。
    speech(女烘焙师): 行了。今天晚饭我来。

  @variant b5 when: affection >= 70
    speech(女烘焙师): 以后你们想吃什么都跟我说。……包括你想吃的。

@end
