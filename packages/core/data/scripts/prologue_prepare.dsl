# 序章 4 · 秘密筹备（末日前 10 天）
@scene prologue_prepare
  title: 把积蓄换成铁
  participants: 主角, 特殊AI, 母亲, 姐姐
  tone: 谎言越铺越大
  when: prologue_stage == "prepare"

  @beat s1 pose:list
    action: AI 列出一张清单：水泥、钢筋、铜线、水泵、滤网、发电机、柴油、罐头、净水片。
    sense:  纸很长，拖到地上。
    mind:   你的全部存款是四十七万。她算出来的需求是三百二十万。
    speech(特殊AI): 缺口很大。但我可以帮你找便宜的渠道，以及你不太想知道的办法。

  @beat s2 pose:sell_car
    action: 你把房车挂到二手平台，又撤下来了。
    sense:  座椅上还有妹妹上次撒的奶茶印。
    mind:   不能卖。末日里这台车是腿。
    speech(特殊AI): 留着。改装价值大于出售价值。

  @beat s3 pose:lie_to_family
    action: 你跟母亲说公司要外派，需要一笔周转；跟姐姐说是朋友的项目。
    sense:  说这些话的时候你不敢看她们的眼睛。
    mind:   她们都信了。这让你更难受。
    speech(母亲): 钱不够妈这有。别硬撑。

  @beat s4 pose:storage
    action: 你租了城郊一个仓库，物资一车一车往里运。
    sense:  水泥袋扬起的灰呛得人咳嗽。
    mind:   三百二十万的需求，你用四十七万填了三分之一。

  @beat s5 pose:first_crack
    action: 一天深夜，你回家，发现姐姐坐在客厅没开灯。
    sense:  她手边放着你的那个本子。
    mind:   你忘了收。
    speech(姐姐): 这上面写的，是不是真的。

  @variant s5 when: affection >= 45
    speech(姐姐): 我不问你哪来的消息。我只问你，妈和妹妹算不算在里面。

@end
