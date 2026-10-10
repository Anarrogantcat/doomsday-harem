@scene q_mother_s3
  title: 旧居寻踪
  participants: 主角, 母亲
  tone: 潮湿腐朽的旧居，隐秘的过往
  when: mainline_mother_stage >= 3

  @beat b1 pose:survey_environment
    action: 母亲用靴尖踢开半截枯藤，锈蚀的门框在暮色中扭曲
    sense: 空气里漂浮着霉味与铁锈的腥涩
    mind: 门廊阴影里晃动的轮廓，是记忆中三个孩童的背影
    speech(母亲): 当年孩子们总爱在这里玩捉迷藏...

  @beat b2 pose:touch_object
    action: 主角伸手触碰门框上褪色的刻痕，指尖传来潮湿的苔藓
    sense: 腐木在掌心发出细微的碎裂声
    mind: 门后的黑暗像某种沉睡的生物，正在缓慢苏醒
    speech(主角): 这里...好像有东西在动？

  @beat b3 pose:cross_zone
    action: 母亲突然抓住主角手腕，腐叶在靴底发出黏腻的挤压声
    sense: 树影间闪过的磷光，像被惊扰的萤火虫群
    mind: 三十年前的暴雨夜，三个孩子也是这样消失在黑暗里
    speech(母亲): 别说话...跟紧我。

  @variant b2 when: affection >= 60
    speech(母亲): 当年我在这里...把最后一个孩子藏进了地窖。

@end
