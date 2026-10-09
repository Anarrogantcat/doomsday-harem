@scene story_colleague
  title: 旧识
  participants: 主角, 前同事
  tone: 干练要强 / 不承认在意
  when: mainline_colleague_stage >= 1

  @beat c1 pose:office
    action: 办公楼的应急灯还亮着，工位上散落着没带走的私人物品。
    sense:  她蹲在自己的格子间里，正在收拾一个相框。
    mind:   她本来可以第一个跑。但她回来拿了点东西。
    speech(前同事): ……你怎么会在这。

  @beat c2 pose:recognize
    action: 她盯着主角看了很久，然后说了一句你变了。
    sense:  她的语气很平，但手在抖。
    mind:   她认出了那双眼睛。她看了那双眼睛三年。
    speech(前同事): 你以前不是这样的。

  @beat c3 pose:photo
    action: 相框里是公司年会的合照，她站在主角旁边，隔了两个人。
    sense:  照片边角已经卷了。她把它擦了又擦。
    mind:   她一直留着这张照片。但她从来没说过为什么。
    speech(前同事): 这个我带走。别的都不要。

  @beat c4 pose:truth
    action: 她说当年那杯咖啡是她放的，不是前台。
    sense:  她说完就转过身去，不看主角。
    mind:   三年前她没敢说的话，现在说出来已经晚了，但她还是说了。
    speech(前同事): 我那时候……算了。不重要了。

  @beat c5 pose:join
    action: 她收拾好东西，站起来，拍了拍西装上的灰。
    sense:  她第一次主动走在主角旁边，而不是后面。
    mind:   她想清楚了：世界都这样了，有些话再不说就没机会了。
    speech(前同事): 走吧。这次我跟你。

  @variant c4 when: affection >= 70
    speech(前同事): 重要。对我来说很重要。

@end
