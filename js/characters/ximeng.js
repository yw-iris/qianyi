/* ============================================================
 *  千载一瞬 · 角色模块 —— 王希孟
 *  导出标准接口：{ id, meta, endings, story, books }
 * ============================================================ */

window.CHARACTERS = window.CHARACTERS || {};
window.CHARACTERS.ximeng = {
  id: 'ximeng',

  meta: {
    title: '希孟·抉择',
    en: 'THE CHOICES OF WANG XIMENG',
    tagline: '你不是在读他的传记——你是在替他，再活一遍。',
    intro:
      '宣和三年的汴京，画院少年王希孟，史书无半字记载，唯余一卷青绿山水《千里江山图》' +
      '名动千古，也吞了他性命。此刻你重生于他十八岁这年，每一步抉择都将改写他的命运；' +
      '而每解锁一种命运，画卷上掩盖的尘埃，便会少去一块。',
    era: '北宋 · 宣和三年（1121）',
    quote: '「画的尽头，究竟是什么？」——徽宗赵佶',
    scrollName: '千里江山图',
    scrollImage: 'assets/paintings/qianli_4k.png'
  },

  /* 六个结局：region 即画卷上待拂的尘块（0=最左，5=最右） */
  endings: [
    { id: 'e_immortal', title: '青绿不朽', en: 'THE MASTERPIECE', region: 0, tint: '#2e7d6b',
      blurb: '献图于朝，以一卷画换一个不朽。' },
    { id: 'e_hermit', title: '烟波隐者', en: 'THE HERMIT', region: 1, tint: '#3a6b8a',
      blurb: '弃画院浮华，入山做自在画师。' },
    { id: 'e_official', title: '宦海沉浮', en: 'THE COURTIER', region: 2, tint: '#8a6b3a',
      blurb: '循蔡京之路入仕，以半生功名护图。' },
    { id: 'e_mentor', title: '师徒同心', en: 'THE DISCIPLE', region: 3, tint: '#7a4a6b',
      blurb: '与徽宗亦师亦友，携图南渡守山河。' },
    { id: 'e_burn', title: '付之一炬', en: 'THE ASHES', region: 4, tint: '#a8422e',
      blurb: '走火入魔，焚稿焚己，千古一憾。' },
    { id: 'e_rebirth', title: '重生圆满', en: 'THE TRANSCENDENT', region: 5, tint: '#3a8d6e',
      blurb: '勘破画道，不求不朽而自在——隐藏结局。' }
  ],

  story: {

    start: {
      chapter: '卷一 · 叩门',
      text:
        '宣和三年的汴京，春寒还未退尽。\n\n' +
        '你猛地睁开眼——竟回到了十八岁这一年，立在翰林图画院朱红的门外。' +
        '前世的残忆告诉你：你叫王希孟，史书无半字记载，唯余一卷青绿山水，' +
        '名动千古，也吞了你性命。\n\n这一次，你想怎么活？',
      choices: [
        { text: '既入此世，便叩门入画院，赌一个青史留名', next: 'gate' },
        { text: '且慢。先去虹桥市井，看看这人间值不值得入画', next: 'market' }
      ]
    },

    gate: {
      chapter: '卷一 · 画院',
      text:
        '画院门规如铁。教习冷眼打量你：\n' +
        '「陛下重格物写生，院体工笔方为正道。你可想清楚了？」',
      choices: [
        { text: '学生愿从院体工笔做起，求陛下青眼', next: 'huizong' },
        { text: '工笔固好，我偏想探一探失传的青绿古法', next: 'green' }
      ]
    },

    market: {
      chapter: '卷一 · 虹桥',
      text:
        '虹桥之上，汴河舟楫如织，贩夫走卒、说书卖药，皆成天然画卷。\n' +
        '一须发皆白的画匠拍你肩：\n「小子，画活物易，画江山难。你心里，可装着一座江山？」',
      choices: [
        { text: '有。我要画一卷万里江山', next: 'green' },
        { text: '江山太大，我先画这市井烟火', next: 'hermit_seed' }
      ]
    },

    huizong: {
      chapter: '卷二 · 天颜',
      text:
        '半月后，徽宗赵佶微服巡院，驻足你案前，提笔替你改了一隅山石，亲授皴法。\n' +
        '你心头狂跳——这是天下第一画家，在亲手教你。',
      choices: [
        { text: '唯陛下马首是瞻，奉旨作画，步步高升', next: 'favor' },
        { text: '斗胆一问：画的尽头，究竟是什么？', next: 'mentor' }
      ]
    },

    green: {
      chapter: '卷二 · 青绿',
      text:
        '你独钟青绿山水，采石青、石绿，层层罩染，眠餐俱废。\n' +
        '同窗笑你痴：「这等笨功夫，千年也画不出头。」你只是笑。',
      choices: [
        { text: '我要以一卷十二丈巨障，惊动天下', next: 'masterpiece' },
        { text: '画不为惊动谁，只为我眼中真山真水', next: 'free' }
      ]
    },

    hermit_seed: {
      chapter: '卷二 · 市井',
      text:
        '你日日伏案写市井，竟画出一卷活色生香的「都城繁华图」。\n' +
        '老画匠叹：「你这路数，倒像那张择端。」',
      choices: [
        { text: '索性随先生归隐山林，做个自在画师', next: 'hermit' },
        { text: '不。我仍要进画院，把市井之气带入丹青', next: 'gate' }
      ]
    },

    favor: {
      chapter: '卷三 · 权位',
      text:
        '太师蔡京见你得宠，引你入禁中文书库，屡屡献画而得官。\n' +
        '你第一次尝到权力的甜，也第一次看见画院之外的刀光。',
      choices: [
        { text: '依附蔡京，求富贵功名', next: 'official' },
        { text: '借权位之便，暗中保全画院古卷', next: 'protect' }
      ]
    },

    mentor: {
      chapter: '卷三 · 师谊',
      text:
        '徽宗莞尔：「画者，观万物之生意耳。」\n' +
        '自此收你为亲传，君臣亦师亦友。你却隐隐不安——这文艺盛世，似有裂痕。',
      choices: [
        { text: '尽心侍画，与陛下共守这锦绣山河', next: 'mentor_deep' },
        { text: '伴君如伴虎，我须留一分清醒', next: 'protect' }
      ]
    },

    masterpiece: {
      chapter: '卷四 · 千里',
      text:
        '政和三年，你闭关半载。十八岁的手，绘出十二丈青绿长卷《千里江山图》——' +
        '石青石绿，灿若宝石，山势如龙。火候将成。',
      choices: [
        { text: '献此图于陛下，求千古不朽之名', next: 'immortal' },
        { text: '总觉得青绿未尽其意，欲焚稿另起炉灶', next: 'burn_seed' }
      ]
    },

    free: {
      chapter: '卷四 · 自在',
      text:
        '你不求闻达，只日日对山临水。画院渐冷落你，你却画得痛快，' +
        '笔下江山一日比一日活。',
      choices: [
        { text: '守此自在心，纵无名亦无悔', next: 'rebirth' },
        { text: '可胸中仍有一卷江山未画', next: 'masterpiece' }
      ]
    },

    protect: {
      chapter: '卷五 · 靖康',
      text:
        '靖康元年，金兵南下，汴京旦夕将破。\n' +
        '你望向库中那卷《千里江山图》——它若毁于兵火，你的魂便也散了。',
      choices: [
        { text: '携图护驾，随徽宗南渡，山河虽碎画犹存', next: 'mentor_deep' },
        { text: '独力护图出城，城破而身殉画卷', next: 'official' }
      ]
    },

    burn_seed: {
      chapter: '卷五 · 焚稿',
      text:
        '你举火盆欲焚稿。火光映亮你眸中的疯狂与执念——\n' +
        '你要的不是一幅画，是千古唯一。手，已触到火。',
      choices: [
        { text: '烧！不留半点遗憾给这俗世', next: 'burn' },
        { text: '罢了……火盆踢翻，残稿一一拾起', next: 'rebirth' }
      ]
    },

    /* ---------------- 结局（叶子节点） ---------------- */

    immortal: {
      chapter: '结局 · 一',
      text:
        '你捧卷入殿。徽宗展卷，久久不语，终叹：「政和三年，希孟年十八，以此图进。」\n' +
        '他提笔，将这卷青绿赐予太师蔡京，蔡京跋于卷后——你的大名，第一次、也是唯一一次，' +
        '留在了史册的缝隙里。\n\n献图后不久，你沉疴不起。十八岁的魂，化进了十二丈江山。',
      ending: {
        id: 'e_immortal',
        body:
          '史书无传，唯蔡京一题跋证你曾来过：「希孟年十八岁，昔在画学为生徒……' +
          '上知其性可教，遂诲谕之，亲授其法。不逾半岁，乃以此图进。」\n\n' +
          '你以一卷画，换一个不朽。千里江山，从此活了九百年。',
        epilogue: '你以性命点燃的青绿，洗去了画卷上第一片尘。'
      }
    },

    hermit: {
      chapter: '结局 · 二',
      text:
        '你随老画匠入山。茅檐竹牖，溪声入梦。你再不画命题作文，只画眼中真山水——' +
        '云来云去，皆是文章。',
      ending: {
        id: 'e_hermit',
        body:
          '你成了江湖传说里的「无名先生」。有人说你画技直追顾恺之，有人说你根本不曾存在。\n\n' +
          '而你只在乎一件事：笔下的江山，是活的。',
        epilogue: '山居的云烟，拂去画卷上第二片尘。'
      }
    },

    official: {
      chapter: '结局 · 三',
      text:
        '你循蔡京之路入仕，位极人臣，朱门酒肉。画院的灯，你许久未点。\n' +
        '直到靖康烽起，你才惊觉：最贵的那卷青绿，你竟多年未展。',
      ending: {
        id: 'e_official',
        body:
          '你以半生功名，换得《千里江山图》在乱世中保全——或以身殉图，或忍辱存图。\n\n' +
          '史册记得蔡京，未必记得你。但那卷江山记得：曾有人为它，负了锦绣前程。',
        epilogue: '宦海的风沙落定，画卷上第三片尘悄然滑落。'
      }
    },

    mentor_deep: {
      chapter: '结局 · 四',
      text:
        '你与徽宗，亦师亦友，亦君臣。金兵压境时，你卷起《千里江山图》，护驾南渡。\n' +
        '船过汴河，回望烽火中的故都，陛下握你手：「江山虽失，画在，便不算亡。」',
      ending: {
        id: 'e_mentor',
        body:
          '山河破碎，师徒之谊却随画卷南渡而存。你以一支笔，替一个时代守住了最后一点体面。\n\n' +
          '后来的人说：那卷青绿里，藏着一个皇帝与一个少年，未说完的话。',
        epilogue: '师徒共守的执念，拭去画卷上第四片尘。'
      }
    },

    burn: {
      chapter: '结局 · 五',
      text:
        '火舌卷过十二丈青绿。你大笑，又恸哭。石青石绿在烈焰里最后一次灿亮，' +
        '像你来不及活够的十八年。',
      ending: {
        id: 'e_burn',
        body:
          '你烧掉了唯一的《千里江山图》，也烧掉了自己。\n\n' +
          '后世翻遍画史，只找到半句传闻：「有少年希孟，献画后焚之，不知所终。」\n\n' +
          '最烈的火，往往烧的是最干净的东西。',
        epilogue: '灰烬之上，画卷上第五片尘，被风带走。'
      }
    },

    rebirth: {
      chapter: '结局 · 六',
      text:
        '你放下笔，忽然懂了徽宗那句「观万物之生意」。画不为留名，名不为不朽——' +
        '你只是，好好活过、好好画过。\n\n你笑了。这一次，你不求史册记得，只求笔下的江山，比前世更自在。',
      ending: {
        id: 'e_rebirth',
        body:
          '你勘破画道，不求不朽而自在。你历两宋烟尘，亲眼见那卷青绿九百年后悬于殿堂，' +
          '人人得以三维之眼，重游你的江山。\n\n——而此刻，正读着这些字的你，便是它九百年后的知音。',
        epilogue: '六片尘埃尽落，千里江山，终可三维而观。'
      }
    }

  },

  /* ★ 延伸阅读：通关后推荐的传记/相关书籍 */
  books: [
    {
      title: '《千里江山图的故事》',
      author: '余辉',
      isbn: '978-7-5010-4239-7',
      publisher: '文物出版社',
      year: 2017,
      summary:
        '故宫博物院研究员余辉历时数载，系统考证《千里江山图》的创作背景、作者生平、' +
        '技法源流及历代递藏。书中对王希孟"年十八"的史料来源做了详尽的文献梳理，' +
        '是目前关于此画最权威的研究专著之一。',
      libraries: [
        { name: '中国国家图书馆', location: '北京·海淀区中关村南大街33号', callNumber: 'J212.092/Y822', available: true },
        { name: '上海图书馆东馆', location: '上海·浦东新区合欢路300号', callNumber: 'J209.244/4921', available: true },
        { name: '浙江省图书馆', location: '杭州·西湖区曙光路73号', callNumber: 'J212.092/744', available: false },
        { name: '南京图书馆', location: '南京·玄武区中山东路189号', callNumber: 'J212.092/123', available: true }
      ]
    },
    {
      title: '《大宋衣冠：图说宋人服饰》',
      author: '傅伯星 / 王保健',
      isbn: '978-7-5514-0890-5',
      publisher: '浙江摄影出版社',
      year: 2016,
      summary:
        '从服饰角度还原宋代生活场景。王希孟身处北宋末年的翰林图画院，' +
        '其日常所穿、所见之衣冠，均可在此书中找到视觉参照——助你更真切地想象他走过的世界。',
      libraries: [
        { name: '中国国家图书馆', location: '北京·海淀区中关村南大街33号', callNumber: 'K875.24/F953', available: true },
        { name: '广州图书馆', location: '广州·天河区珠江东路4号', callNumber: 'K875.2/23', available: true },
        { name: '四川省图书馆', location: '成都·青羊区人民西路4号', callNumber: 'K875.24/12', available: false }
      ]
    },
    {
      title: '《徽宗皇帝：艺术与权力的双重人生》',
      author: '[美] 伊沛霞 (Patricia Ebrey)',
      isbn: '978-7-208-15468-3',
      publisher: '上海人民出版社',
      year: 2020,
      summary:
        '普林斯顿大学汉学泰斗伊沛霞代表作。以赵佶为中心，全景展现北宋晚期政治、' +
        '艺术与宫廷生态。王希孟正是这位"艺术家皇帝"画学体系下的产物——' +
        '读懂徽宗，才能读懂王希孟的命运底色。',
      libraries: [
        { name: '中国国家图书馆', location: '北京·海淀区中关村南大街33号', callNumber: 'K827=441/Y388', available: true },
        { name: '上海图书馆东馆', location: '上海·浦东新区合欢路300号', callNumber: 'K827.441/4421', available: true },
        { name: '深圳图书馆', location: '深圳·福田区福中大道2001号', callNumber: 'K827.44/78', available: true },
        { name: '武汉图书馆', location: '武汉·江岸区建设大道86号', callNumber: 'K827=44/56', available: false }
      ]
    },
    {
      title: '《中国绘画史》',
      author: '陈师曾',
      isbn: '978-7-5149-1234-5',
      publisher: '中国画报出版社',
      year: 2014,
      summary:
        '陈师曾经典之作，系统梳理自上古至清末的中国绘画发展脉络。' +
        '其中对宋代院体画、青绿山水流派的论述，是理解王希孟及其时代艺术语境的基础读物。',
      libraries: [
        { name: '中国国家图书馆', location: '北京·海淀区中关村南大街33号', callNumber: 'J209.2/C434', available: true },
        { name: '浙江省图书馆', location: '杭州·西湖区曙光路73号', callNumber: 'J209.2/C39', available: true }
      ]
    }
  ]
};
