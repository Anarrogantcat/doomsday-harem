@scene q_hunter_s4  
  title: 山林边缘  
  participants: 主角, 女猎人  
  tone: 生存的脆弱与戒备  
  when: mainline_hunter_stage >= 4  

  @beat b1 pose:check_perimeter  
    action: 女猎人蹲下检查地面裂痕，指尖轻叩碎石  
    sense: 潮湿腐叶混合铁锈的气味从地缝渗出  
    mind: 任何定居点都必须先确认地下是否有废弃陷阱  
    speech(女猎人): 你确定这里能撑过冬天？  

  @beat b2 pose:cross_zone  
    action: 主角解开背包，取出半罐压缩饼干  
    sense: 金属罐体在掌心留下潮湿的黏腻感  
    mind: 食物的气味会吸引变异鼠，但此刻需要信任  
    speech(主角): 你教我辨认毒蘑菇，我给你食物  

  @beat b3 pose:secure_inventory  
    action: 女猎人将饼干罐放进防水布包裹的物资堆  
    sense: 指腹擦过布料表面的凝结水珠  
    mind: 资源分配的规则比地图更危险  
    speech(女猎人): 明早带我去看东侧断崖的鹰巢  

  @variant b2 when: affection >= 60  
    speech(女猎人): 你闻到饼干里混着的野蔷薇吗？山里最后一批花

@end
