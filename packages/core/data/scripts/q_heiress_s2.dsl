@scene q_heiress_s2
  title: 云端之上的对峙
  participants: 主角, 富二代御姐
  tone: 末日余烬中的审视
  when: mainline_heiress_stage >= 2

  @beat b1 pose:standing_on_railing
    action: 富二代御姐指尖划过不锈钢栏杆，赤足踩在碎裂的玻璃上
    sense: 暮色将她的影子拉长，金属栏杆残留着被高温扭曲的痕迹
    mind: 她在计算这个闯入者是否值得浪费一发子弹
    speech(富二代御姐): 别墅的访客名单上没有你的名字，先生

  @beat b2 pose:raising_hands
    action: 主角双手摊开露出空掌心，靴尖碾碎地上半截断裂的猎枪
    sense: 铝制弹壳在靴底发出清脆的撞击声
    mind: 每个动作都要证明自己不是掠夺者
    speech(主角): 我在找能活到明天的物资，不是来找死

  @beat b3 pose:stepping_forward
    action: 富二代御姐踩着高跟鞋碾过满地碎玻璃，香水味压过血腥气
    sense: 她的裙摆扫过栏杆，露出腰间微闪的钛合金匕首
    mind: 这个男人的呼吸频率比常人慢0.3秒
    speech(富二代御姐): 储藏室钥匙给你，但得先证明你配得上它

  @variant b2 when: affection >= 60
    speech(富二代御姐): 既然你有这份自觉，那就先去地下冷库。但记住，我的保镖可不会对你这么客气

@end
