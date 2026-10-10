@scene q_pianist_s4
  title: 废墟归途
  participants: 主角, 女钢琴家
  tone: 压抑中透出微光的末日诗意
  when: mainline_pianist_stage >= 4

  @beat b1 pose:adjust_piano
    action: 女钢琴家用冻僵的手指擦拭钢琴漆面
    sense: 金属门开合的铰链声刺破寂静
    mind: 废墟中的音乐是最后的尊严
    speech(女钢琴家): 这台琴的音板...还能承受三十七个音阶的震颤

  @beat b2 pose:cross_threshold
    action: 主角卸下防辐射面罩
    sense: 潮湿的霉味渗入鼻腔
    mind: 金属门后的空间比想象中更狭窄
    speech(主角): 基地入口的辐射值稳定在安全范围

  @beat b3 pose:place_piano
    action: 女钢琴家手指悬停在琴键上方
    sense: 琴键的木质纹理在指尖凹陷
    mind: 音符是废墟中最后的锚点
    speech(女钢琴家): 这里需要一个能让人安静下来的地方

  @variant b2 when: affection >= 60
    speech(女钢琴家): 你记得吗？去年冬天我们在琴房分食的那块压缩饼干

@end
