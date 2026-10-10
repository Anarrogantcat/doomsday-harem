@scene q_mother_s2
  title: 旧影残章
  participants: 主角, 母亲
  tone: 潮湿的回忆与生存的重量
  when: mainline_mother_stage >= 2

  @beat b1 pose:sit_box_floor
    action: 母亲用袖口擦拭照片上的水渍，指尖在相框边缘反复摩挲
    sense: 木箱内壁渗出冷汗，霉味刺痛鼻腔
    mind: 她记得那个暴雨夜，三个孩子蜷缩在排水管里的体温
    speech(母亲): 『那年逃难时，最小的总把呕吐物藏在袖口...』

  @beat b2 pose:check_photo
    action: 主角蹲下身，指尖触碰照片上模糊的孩童轮廓
    sense: 灰尘在光束中翻涌，霉斑在相纸表面裂开蛛网纹
    mind: 突然理解她为何总把存粮藏在床底而非冰箱
    speech(主角): 『您当时...是怎么撑下来的？』

  @beat b3 pose:stand_stiff
    action: 母亲突然攥紧相框，指节压出白色痕迹
    sense: 老照片的绒面在掌心碎裂，碎屑簌簌落进裂缝
    mind: 那些被她咽下去的哭声，此刻在空荡的房间里回响
    speech(母亲): 『有次我放弃治疗去寻食物，回来时...』

  @variant b2 when: affection >= 60
    speech(母亲): 『你听，照片背面还有孩子的笑声刻痕』

@end
