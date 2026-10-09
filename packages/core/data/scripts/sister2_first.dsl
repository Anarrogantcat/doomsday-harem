# 妹妹线 · 告白初夜（随机性加入）
@scene sister2_first
  title: 我终于也是姐姐的人了
  participants: 主角, 妹妹
  tone: 羞怯笨拙 / 终于得偿所愿
  when: affection >= 60 && sister_first_done == true

  @beat s1 pose:confess
    action: 妹妹堵在门口，手指绞着衣角，半天没说出话。
    sense:  她身上有刚洗完澡的味道，头发还是湿的。
    mind:   这句话她在心里排了三年，今天必须说完。
    speech(妹妹): 我也……我也想要姐姐……你不要只看着姐姐好不好。

  @beat s2 pose:accept
    action: 主角把她拉进来，关上门。她整个人都在抖。
    sense:  手心是凉的，耳朵却烫得吓人。
    mind:   她想过很多次，但没想过自己会真的开口。
    speech(妹妹): 我、我是第一次……所以……

  @beat s3 pose:first
    action: 主角把她放平，很慢地进去。她疼得抓住床单。
    sense:  紧得几乎进不去，湿意却一点点漫上来。
    mind:   疼。但比疼更清楚的，是一种"终于"的感觉。
    speech(妹妹): 呜……好疼……但是别停……

  @beat s4 pose:adapt
    action: 过了一会儿，她的腰自己动了一下。
    sense:  呼吸从急促变成长长的叹息。
    mind:   原来是这样。原来姐姐每天都能得到这个。
    speech(妹妹): 可以……可以再快一点吗。

  @beat s5 pose:climax
    action: 她整个背弓起来，脚趾蜷成一团。
    sense:  里面一阵一阵地缩，把主角也带了下去。
    mind:   她哭了，但是笑着哭的。
    speech(妹妹): 姐姐……姐姐……

  @beat s6 pose:afterglow
    action: 她蜷在主角怀里，把脸埋进胸口，不肯抬起来。
    sense:  床单上有一点血，她看见了，又赶紧别开眼。
    mind:   从今天起，她也是"姐姐的人"了。
    speech(妹妹): 我终于是……姐姐的人了。

  @variant s1 when: lust > 80
    speech(妹妹): 我忍不住了……我真的忍不住了。

  @variant s4 when: bond >= 4
    speech(妹妹): 姐姐……教我，我想要做得更好。

@end
