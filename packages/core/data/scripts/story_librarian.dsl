@scene story_librarian
  title: 书页之间
  participants: 主角, 女图书管理员
  tone: 安静细致 / 记性极好
  when: mainline_librarian_stage >= 1

  @beat l1 pose:library
    action: 图书馆的阅览室一片狼藉，但古籍部的门锁着，而且是从里面锁的。
    sense:  门缝底下透出一线光，是应急灯。
    mind:   她把最重要的东西锁起来了，然后自己留在里面守着。
    speech(女图书管理员): ……请报一下你要找的书名。

  @beat l2 pose:meet
    action: 她隔着门问话，声音很小，但条理清楚。
    sense:  她先问人数，再问有没有伤，最后才问名字。
    mind:   她不怕人。她怕的是乱。
    speech(女图书管理员): 登记一下。姓名，和进来的时间。

  @beat l3 pose:archive
    action: 她带主角看了她保下来的东西：三百多本地方志和全套旧地图。
    sense:  她按分类摆得整整齐齐，每本都夹了书签。
    mind:   她说这些比食物重要。因为食物吃完就没了。
    speech(女图书管理员): 这张图，标的是你来的那条路。三年前是这样。

  @beat l4 pose:memory
    action: 她能背出末日前后每一天的天气和当天的新闻标题。
    sense:  她说话很慢，但一次都没记错。
    mind:   她把自己变成了一个目录。这样就不会忘。
    speech(女图书管理员): 我记得。我都记得。

  @beat l5 pose:join
    action: 她只带走一个箱子，里面是卡片目录。
    sense:  她最后看了一眼书架，关灯，锁门。
    mind:   她知道知识要跟着人走才有用。
    speech(女图书管理员): 我整理过的，我都能找到。

  @variant l5 when: affection >= 65
    speech(女图书管理员): 包括……关于你的事。我也记下来了。

@end
