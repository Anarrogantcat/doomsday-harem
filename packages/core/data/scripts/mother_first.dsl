# 母亲线 · 主动破主角处女（双头龙）
@scene mother_first
  title: 第一次给妈妈
  participants: 主角, 母亲
  tone: 温柔沉重 / 背德感的释放
  when: affection >= 75 && sister_first_done == true

  @beat m1 pose:approach
    action: 母亲把双头龙放在床头，坐下来，手搭在主角的膝盖上。
    sense:  她的手是温的，指甲修得很干净。
    mind:   她想了很久才敲这扇门。敲之前，在走廊里站了二十分钟。
    speech(母亲): 你的第一次……给妈妈好不好？

  @beat m2 pose:undress
    action: 她一件一件地脱，动作慢得像在给自己留退路。
    sense:  灯光很暗，但足以看清她小腹上生过三个孩子的痕迹。
    mind:   这具身体她藏了二十年，从没打算给任何人看。
    speech(母亲): 别看……妈妈老了。

  @beat m3 pose:prepare
    action: 她让主角躺下，分开腿，先用手指试了试。
    sense:  润滑液是凉的，她的指尖也是凉的，但进入时是热的。
    mind:   主角第一次意识到，被进入和被需要，是两件事。
    speech(母亲): 疼就说。妈妈会停。

  @beat m4 pose:insert
    action: 双头龙的另一端抵住她自己，她咬着牙，一点一点地坐下去。
    sense:  两端同时被填满，两个人的呼吸都乱了。
    mind:   她选择了同时。不占主角的便宜，也不让主角一个人疼。
    speech(母亲): 一起……这样才公平。

  @beat m5 pose:slow
    action: 她扶着主角的腰，慢慢地动，节奏很轻。
    sense:  汗从她锁骨滑下来，滴在主角的小腹上。
    mind:   她一直在看主角的脸，像在确认什么。
    speech(母亲): 你爸爸走的那年，我以为这辈子就这样了。

  @beat m6 pose:climax
    action: 她的动作快起来，最后整个人压在主角身上，抖得厉害。
    sense:  两个人的小腹贴在一起，都是湿的。
    mind:   她哭了。但没有停下来。
    speech(母亲): 对不起……对不起……

  @beat m7 pose:hold
    action: 她抱着主角，很久没有动，也没有拔出来。
    sense:  房间里只有呼吸声，和窗外很远的虫鸣。
    mind:   从今天起，她不再是只当妈妈了。
    speech(母亲): 就今晚。明天……妈妈还是妈妈。

  @variant m6 when: lust > 85
    speech(母亲): 别停……求你别停。

  @variant m7 when: bond >= 4
    speech(母亲): 明天也是妈妈。后天也是。

@end
