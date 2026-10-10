@scene q_sister2_s3  
  title: 残破日记的渴望  
  participants: 主角, 妹妹  
  tone: 灰尘与体温交织的窒息感  
  when: mainline_sister2_stage >= 3  

  @beat b1 pose:drop_diary  
    action: 妹妹用颤抖的指尖划过日记本泛黄的纸页  
    sense: 空气里漂浮的尘粒在光束中跳动，纸张纤维在指腹下碎裂  
    mind: 她渴望的从来不是生存，而是被看见的资格  
    speech(妹妹):「你...你真的想看吗？那些被我藏起来的字句」  

  @beat b2 pose:lean_forward  
    action: 主角俯身拾起散落的纸页，袖口擦过她痉挛的指尖  
    sense: 旧毛衣的羊毛摩擦出静电，混合着地下防空洞潮湿的霉味  
    mind: 末日让所有脆弱都变得赤裸，连呼吸都像偷窃  
    speech(主角):「你写的是什么？」  

  @beat b3 pose:clutch_clothes  
    action: 妹妹突然攥住主角的衣角，指甲陷入织物褶皱  
    sense: 指尖传来布料纤维断裂的细微声响，像某种求救信号  
    mind: 她终于等到能将渴望具象化的时刻，却害怕被拒绝  
    speech(妹妹):「...我想和你一起活下去，真的想」  

  @variant b2 when: affection >= 60  
    speech(妹妹):「你...你早就知道我藏在衣柜最深处的日记本对吧？」

@end
