@scene q_colleague_s4  
  title: 归途  
  participants: 主角, 前同事  
  tone: 末日余烬中的信任重建  
  when: mainline_colleague_stage >= 4  

  @beat b1 pose:check_floor  
    action: 前同事蹲下用指尖刮擦地面碎屑  
    sense: 指甲缝里渗入铁锈味的尘土  
    mind: 她的拇指无意识摩挲着腕表残骸  
    speech(前同事): 这里比上次清理时更安静了  

  @beat b2 pose:hold_weapon  
    action: 主角将突击步枪背带重新调整到肩部  
    sense: 金属枪身在掌心留下潮湿的锈迹  
    mind: 他注意到她背包侧袋的激光打印机接口  
    speech(主角): 你真打算在这里重开办公室？  

  @beat b3 pose:unfold_photo  
    action: 前同事从战术背心中抽出泛黄的相纸  
    sense: 纸面纤维在指腹下微微凸起  
    mind: 照片边缘的烧焦痕迹像某种加密符号  
    speech(前同事): 我需要...重新校准坐标系统  

  @variant b2 when: affection >= 60  
    speech(前同事): 你和他一样会把子弹带缠在手腕上

@end
