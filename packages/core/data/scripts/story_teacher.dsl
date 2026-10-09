# 主线 · 废都幸存者（大学女教师）
@scene story_teacher
  title: 废都幸存者
  participants: 主角, 大学女教师
  tone: 废墟里的责任感
  when: mainline_teacher_stage >= 1

  @beat t1 pose:signal
    action: 电台里传出一段重复的求救信号，坐标指向城南的教学楼。
    sense:  信号很弱，像从很深的地方发出来的。
    mind:   她不是第一个求救的人。但她重复了同一句话四十七遍。
    speech(大学女教师): 这里是……还有人在。谁听到都可以。

  @beat t2 pose:cross
    action: 主角穿过两公里的高密度丧尸区，从后门进了教学楼。
    sense:  走廊里全是碎玻璃，血已经干了。
    mind:   信号是从四楼传来的。但楼梯塌了。
    speech(主角): 有人在上面吗。

  @beat t3 pose:meet
    action: 她抱着一个学生的书包，站在楼梯口，手里攥着消防斧。
    sense:  她身上很干净——干净得不像在这里待了两个月。
    mind:   她一直在洗。每天洗。因为学生不在了。
    speech(大学女教师): 你是一个人来的？

  @beat t4 pose:escort
    action: 回程的路上，她一直回头看那栋楼。
    sense:  风把她的头发吹到脸上，她没有拨。
    mind:   她带不走那个书包。但她带走了自己。
    speech(大学女教师): 我教了十二年书。我以为我很懂怎么照顾人。

  @beat t5 pose:arrive
    action: 她走进安全屋，环顾了一圈，然后开始整理鞋柜。
    sense:  玄关的灯是暖的。
    mind:   这是两个月来，她第一次觉得可以放下斧头。
    speech(大学女教师): 从今天起，几点睡、几点起，我说了算。

  @variant t4 when: affection >= 60
    speech(大学女教师): 以后……你的事也算我的事。

@end
