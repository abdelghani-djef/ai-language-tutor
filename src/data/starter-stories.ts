// Reading stories for the starter packs: two per pack, written with AI and
// checked by a second reviewer. Each uses its own pack's words and only words
// from earlier packs plus basic function words, so learners know almost every
// word (docs/research/learning-english.md, principle 3). French and Arabic
// translations keep the same paragraphs.

export interface StarterStory {
  id: string;
  pack: string;
  title: { en: string; fr: string; ar: string };
  text: { en: string; fr: string; ar: string };
  /** Entries of the pack used in the story. */
  uses: string[];
}

export const STARTER_STORIES: StarterStory[] = [
  {
    id: "greetings-1",
    pack: "greetings",
    title: { en: "Nice to Meet You", fr: "Enchantée !", ar: "تشرفت بمعرفتك" },
    text: {
      en: "\"Hello! I am Omar. What is your name?\"\n\"Hi, Omar. My name is Sara. Nice to meet you!\"\n\n\"How are you, Sara?\" says Omar.\n\"I am fine, thank you,\" says Sara.\nMrs Smith says, \"Good morning, Sara, and welcome!\"\n\n\"Goodbye, Sara! Good luck! See you later!\" says Omar.\n\"Okay! Goodbye, Omar!\"",
      fr: "« Bonjour ! Je suis Omar. Comment t’appelles-tu ? »\n« Salut, Omar. Je m’appelle Sara. Enchantée ! »\n\n« Comment ça va, Sara ? » demande Omar.\n« Ça va bien, merci », répond Sara.\nMadame Smith dit : « Bonjour, Sara, et bienvenue ! »\n\n« Au revoir, Sara ! Bonne chance ! À plus tard ! » dit Omar.\n« D’accord ! Au revoir, Omar ! »",
      ar: "«مرحبا! أنا عمر. ما اسمك؟»\n«أهلا يا عمر. اسمي سارة. تشرفت بمعرفتك!»\n\nيقول عمر: «كيف حالك يا سارة؟»\nتقول سارة: «أنا بخير، شكرا.»\nتقول السيدة سميث: «صباح الخير يا سارة، وأهلا وسهلا بك!»\n\nيقول عمر: «مع السلامة يا سارة! حظا سعيدا! أراك لاحقا!»\n«حسنا! مع السلامة يا عمر!»",
    },
    uses: ["hello", "name", "hi", "nice to meet you", "how are you?", "fine", "thank you", "Mrs", "good morning", "welcome", "goodbye", "good luck", "see you later", "okay"],
  },
  {
    id: "greetings-2",
    pack: "greetings",
    title: { en: "Good Evening, Leo", fr: "Bonsoir, Leo", ar: "مساء الخير يا ليو" },
    text: {
      en: "\"Good evening, Mr Brown!\" says Leo.\n\"Good evening, Leo. Welcome! How are you?\"\n\"I am fine, thank you.\"\n\n\"Excuse me, Mr Brown. Is Omar here, please?\"\n\"Yes, of course! Omar, Leo is here.\"\n\"Hi, Leo!\" says Omar.\n\n\"Good night, Omar. Good night, Mr Brown. Thank you!\"\n\"You’re welcome, Leo. Good night!\"",
      fr: "« Bonsoir, Monsieur Brown ! » dit Leo.\n« Bonsoir, Leo. Bienvenue ! Comment ça va ? »\n« Ça va bien, merci. »\n\n« Excusez-moi, Monsieur Brown. Omar est là, s’il vous plaît ? »\n« Oui, bien sûr ! Omar, Leo est là. »\n« Salut, Leo ! » dit Omar.\n\n« Bonne nuit, Omar. Bonne nuit, Monsieur Brown. Merci ! »\n« De rien, Leo. Bonne nuit ! »",
      ar: "يقول ليو: «مساء الخير يا سيد براون!»\n«مساء الخير يا ليو. أهلا وسهلا! كيف حالك؟»\n«أنا بخير، شكرا.»\n\n«عذرا يا سيد براون. هل عمر هنا، من فضلك؟»\n«نعم، بالطبع! يا عمر، ليو هنا.»\nيقول عمر: «أهلا يا ليو!»\n\n«تصبح على خير يا عمر. تصبح على خير يا سيد براون. شكرا!»\n«عفوا يا ليو. تصبح على خير!»",
    },
    uses: ["good evening", "Mr", "welcome", "how are you?", "fine", "thank you", "excuse me", "please", "yes", "of course", "hi", "good night", "you’re welcome"],
  },
  {
    id: "people-1",
    pack: "people",
    title: { en: "Mia and Her Family", fr: "Mia et sa famille", ar: "ميا وعائلتها" },
    text: {
      en: "Hi! My name is Mia, and this is my family. I have a mother, a father and a brother, Sam. I have a sister, too. She is a baby.\n\nMy grandmother and grandfather are here. My aunt and uncle are here with my cousin, Leo. Leo is my friend, too. \"Hello, Leo! How are you?\" \"Fine, thank you, Mia!\"\n\nThese people are my family! My parents say, \"Welcome, family!\"",
      fr: "Salut ! Je m’appelle Mia, et voici ma famille. J’ai une mère, un père et un frère, Sam. J’ai aussi une sœur. C’est un bébé.\n\nMa grand-mère et mon grand-père sont là. Ma tante et mon oncle sont là avec mon cousin, Leo. Leo est aussi mon ami. « Bonjour, Leo ! Comment ça va ? » « Bien, merci, Mia ! »\n\nCes personnes sont ma famille ! Mes parents disent : « Bienvenue, la famille ! »",
      ar: "أهلا! اسمي ميا، وهذه عائلتي. عندي أم وأب وأخ اسمه سام. وعندي أخت أيضا، وهي طفلة رضيعة.\n\nجدتي وجدي هنا. عمتي وعمي هنا مع ابن عمي ليو. ليو صديقي أيضا. «مرحبا يا ليو! كيف حالك؟» «بخير، شكرا يا ميا!»\n\nهؤلاء الناس هم عائلتي! يقول والداي: «أهلا وسهلا بالعائلة!»",
    },
    uses: ["family", "mother", "father", "brother", "sister", "baby", "grandmother", "grandfather", "aunt", "uncle", "cousin", "friend", "people", "parents"],
  },
  {
    id: "people-2",
    pack: "people",
    title: { en: "The Neighbours", fr: "Les voisins", ar: "الجيران" },
    text: {
      en: "Sam is a boy, and Lina is a girl. They are brother and sister. Their parents are Adam and Sara.\n\nA man and a woman are here with a child. \"Hello! We are your neighbours,\" says the man. \"This is my wife, Nora, and our son, Omar.\"\n\n\"Nice to meet you!\" says Lina. \"Omar, can you be my friend?\" \"Yes, of course!\" says Omar.",
      fr: "Sam est un garçon, et Lina est une fille. Ils sont frère et sœur. Leurs parents s’appellent Adam et Sara.\n\nUn homme et une femme sont là avec un enfant. « Bonjour ! Nous sommes vos voisins », dit l’homme. « Voici ma femme, Nora, et notre fils, Omar. »\n\n« Enchantée ! » dit Lina. « Omar, tu veux bien être mon ami ? » « Oui, bien sûr ! » dit Omar.",
      ar: "سام ولد، ولينا بنت. هما أخ وأخت. والداهما آدم وسارة.\n\nرجل وامرأة هنا مع طفل. يقول الرجل: «مرحبا! نحن جيرانكم. هذه زوجتي نورا، وهذا ابننا عمر.»\n\nتقول لينا: «تشرفت بمعرفتك! يا عمر، هل تريد أن تكون صديقي؟» يقول عمر: «نعم، بالطبع!»",
    },
    uses: ["boy", "girl", "brother", "sister", "parents", "man", "woman", "child", "neighbour", "wife", "son", "friend"],
  },
  {
    id: "numbers-1",
    pack: "numbers",
    title: { en: "How Many People?", fr: "Combien de personnes ?", ar: "كم شخصا؟" },
    text: {
      en: "Hi! I am Leo, and I am six. My sister Mia is nine.\n\n\"How many people are in our family?\" says Mia. Mother, father, Mia and I: that is four. Both our grandmother and grandfather are here, too. So we are six.\n\nAll our aunts, uncles and cousins are here. With them, the number is twenty! Half of them are my cousins, and every person here is my friend.",
      fr: "Salut ! Je suis Leo, et j’ai six ans. Ma sœur Mia a neuf ans.\n\n« Combien de personnes y a-t-il dans notre famille ? » demande Mia. Notre mère, notre père, Mia et moi : cela fait quatre. Notre grand-mère et notre grand-père sont là aussi, tous les deux. Alors nous sommes six.\n\nTous nos oncles, nos tantes et nos cousins sont là. Avec eux, le nombre passe à vingt ! La moitié d’entre eux sont mes cousins, et chacun ici est mon ami.",
      ar: "أهلا! أنا ليو، وعمري ست سنوات. أختي ميا عمرها تسع سنوات.\n\nتقول ميا: «كم شخصا في عائلتنا؟» أمي وأبي وميا وأنا: نحن أربعة. جدتنا وجدنا كلاهما هنا أيضا. إذن نحن ستة.\n\nجميع عماتنا وأعمامنا وأبناء عمومتنا هنا. معهم يصبح العدد عشرين! نصفهم أبناء عمومتي، وكل شخص هنا صديقي.",
    },
    uses: ["six", "nine", "many", "four", "both", "all", "number", "twenty", "half", "every"],
  },
  {
    id: "numbers-2",
    pack: "numbers",
    title: { en: "One, Two, Three!", fr: "Un, deux, trois !", ar: "واحد، اثنان، ثلاثة!" },
    text: {
      en: "Sam and his cousin Nora say numbers. \"One, two, three!\" says Sam. \"Four, five, six!\" says Nora. \"Seven, eight, nine, ten!\" they say.\n\n\"What is the first number?\" says Nora. \"Zero!\" says Sam. \"And one hundred, one thousand, one million!\" \"More, more, more!\" says Nora.\n\nTheir grandfather says, \"All the numbers? That is too many!\" \"Okay! Good night, grandfather!\" they say.",
      fr: "Sam et sa cousine Nora disent des nombres. « Un, deux, trois ! » dit Sam. « Quatre, cinq, six ! » dit Nora. « Sept, huit, neuf, dix ! » disent-ils.\n\n« Quel est le premier nombre ? » demande Nora. « Zéro ! » dit Sam. « Et cent, mille, un million ! » « Encore, encore, encore ! » dit Nora.\n\nLeur grand-père dit : « Tous les nombres ? C’est beaucoup trop ! » « D’accord ! Bonne nuit, grand-père ! » disent-ils.",
      ar: "سام وابنة عمه نورا يقولان الأعداد. يقول سام: «واحد، اثنان، ثلاثة!» تقول نورا: «أربعة، خمسة، ستة!» ويقولان معا: «سبعة، ثمانية، تسعة، عشرة!»\n\nتقول نورا: «ما هو العدد الأول؟» يقول سام: «صفر!» «ومئة، وألف، ومليون!» تقول نورا: «أكثر، أكثر، أكثر!»\n\nيقول جدهما: «كل الأعداد؟ هذا كثير جدا!» يقولان: «حسنا! تصبح على خير يا جدي!»",
    },
    uses: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "first", "number", "zero", "hundred", "thousand", "million", "more", "all", "many"],
  },
  {
    id: "time-1",
    pack: "time",
    title: { en: "Is It the Weekend?", fr: "C’est le week-end ?", ar: "هل جاءت عطلة نهاية الأسبوع؟" },
    text: {
      en: "This week, Lina is with her grandmother. On Monday morning, Lina says, \"Good morning! What day is it today?\" \"Today is Monday,\" says her grandmother.\n\nOn Tuesday, Wednesday and Thursday, Lina says, \"Is it the weekend now?\" \"No, not now,\" says her grandmother.\n\nOn Friday evening, Lina says, \"Is it the weekend now?\" \"Yes!\" says her grandmother. \"Tomorrow is Saturday, and then it is Sunday.\" Lina and her grandmother have all weekend!",
      fr: "Cette semaine, Lina est chez sa grand-mère. Lundi matin, Lina dit : « Bonjour ! Quel jour sommes-nous aujourd’hui ? » « Aujourd’hui, c’est lundi », dit sa grand-mère.\n\nMardi, mercredi et jeudi, Lina demande : « C’est le week-end maintenant ? » « Non, pas maintenant », dit sa grand-mère.\n\nVendredi soir, Lina demande : « C’est le week-end maintenant ? » « Oui ! » dit sa grand-mère. « Demain, c’est samedi, et après, c’est dimanche. » Lina et sa grand-mère ont tout le week-end !",
      ar: "هذا الأسبوع، لينا عند جدتها. صباح يوم الاثنين، تقول لينا: «صباح الخير! أي يوم هو اليوم؟» تقول جدتها: «اليوم هو الاثنين.»\n\nيوم الثلاثاء والأربعاء والخميس، تقول لينا: «هل هي عطلة نهاية الأسبوع الآن؟» تقول جدتها: «لا، ليس الآن.»\n\nمساء يوم الجمعة، تقول لينا: «هل هي عطلة نهاية الأسبوع الآن؟» تقول جدتها: «نعم! غدا هو السبت، ثم يأتي الأحد.» لدى لينا وجدتها عطلة نهاية الأسبوع كلها!",
    },
    uses: ["week", "Monday", "morning", "day", "today", "Tuesday", "Wednesday", "Thursday", "weekend", "now", "Friday", "evening", "tomorrow", "Saturday", "Sunday"],
  },
  {
    id: "time-2",
    pack: "time",
    title: { en: "One More Minute", fr: "Encore une minute", ar: "دقيقة واحدة أخرى" },
    text: {
      en: "It is evening. Leo is with his brother, Omar. \"Leo, it is time. It is night now,\" says their father. \"One more minute, please!\" says Leo.\n\nLeo always says \"one more minute.\" Yesterday, his minute was one hour! Tonight, his father says, \"No, Leo. Not tonight.\"\n\n\"Okay,\" says Leo. \"Good night!\" Tomorrow is Saturday, and Leo and Omar have all day.",
      fr: "C’est le soir. Leo est avec son frère, Omar. « Leo, il est temps. Il fait nuit maintenant », dit leur père. « Encore une minute, s’il te plaît ! » dit Leo.\n\nLeo dit toujours « encore une minute ». Hier, sa minute a duré une heure ! Ce soir, son père dit : « Non, Leo. Pas ce soir. »\n\n« D’accord », dit Leo. « Bonne nuit ! » Demain, c’est samedi, et Leo et Omar ont toute la journée.",
      ar: "إنه المساء. ليو مع أخيه عمر. يقول أبوهما: «يا ليو، حان الوقت. إنه الليل الآن.» يقول ليو: «دقيقة واحدة أخرى، من فضلك!»\n\nليو يقول دائما: «دقيقة واحدة أخرى.» أمس، كانت دقيقته ساعة كاملة! الليلة يقول أبوه: «لا يا ليو. ليس الليلة.»\n\nيقول ليو: «حسنا. تصبح على خير!» غدا هو السبت، ولدى ليو وعمر اليوم كله.",
    },
    uses: ["evening", "time", "night", "now", "minute", "always", "yesterday", "hour", "tonight", "tomorrow", "Saturday", "day"],
  },
  {
    id: "food-1",
    pack: "food",
    title: { en: "Breakfast with Grandfather", fr: "Le petit-déjeuner avec grand-père", ar: "الفطور مع الجد" },
    text: {
      en: "It is Sunday morning. Sara has breakfast with her grandfather. There is bread, butter and cheese. There is milk for Sara and tea for grandfather.\n\n\"Can I have some juice, please?\" says Sara. \"Of course,\" says her grandfather. \"Here is some orange juice.\"\n\nGrandfather has an egg with salt, and Sara has an apple. \"Thank you, grandfather!\" \"You’re welcome, Sara. Breakfast is the first meal of the day!\"",
      fr: "C’est dimanche matin. Sara prend le petit-déjeuner avec son grand-père. Il y a du pain, du beurre et du fromage. Il y a du lait pour Sara et du thé pour grand-père.\n\n« Je peux avoir du jus, s’il te plaît ? » demande Sara. « Bien sûr », dit son grand-père. « Voici du jus d’orange. »\n\nGrand-père mange un œuf avec du sel, et Sara mange une pomme. « Merci, grand-père ! » « De rien, Sara. Le petit-déjeuner est le premier repas de la journée ! »",
      ar: "إنه صباح يوم الأحد. سارة تتناول الفطور مع جدها. هناك خبز وزبدة وجبن. هناك حليب لسارة وشاي للجد.\n\nتقول سارة: «هل لي ببعض العصير، من فضلك؟» يقول جدها: «بالطبع. تفضلي، هذا بعض عصير البرتقال.»\n\nيأكل الجد بيضة مع الملح، وتأكل سارة تفاحة. «شكرا يا جدي!» «عفوا يا سارة. الفطور هو أول وجبة في اليوم!»",
    },
    uses: ["breakfast", "bread", "butter", "cheese", "milk", "tea", "juice", "orange", "egg", "salt", "apple", "meal"],
  },
  {
    id: "food-2",
    pack: "food",
    title: { en: "Dinner for Mother", fr: "Un dîner pour maman", ar: "عشاء للأم" },
    text: {
      en: "It is Friday evening. Omar and his father make a meal for Omar’s mother. There is vegetable soup, rice and meat. There are potatoes with some salt, too.\n\n\"Good evening!\" says Omar’s mother. \"What is all this food?\" \"Dinner for you!\" says Omar. \"Water or juice?\"\n\nAfter dinner, there is cake and coffee. \"No sugar in my coffee, please,\" she says. \"Thank you! What a dinner!\"",
      fr: "C’est vendredi soir. Omar et son père préparent un repas pour la mère d’Omar. Il y a une soupe de légumes, du riz et de la viande. Il y a aussi des pommes de terre avec un peu de sel.\n\n« Bonsoir ! » dit la mère d’Omar. « Qu’est-ce que c’est, toute cette nourriture ? » « C’est le dîner, pour toi ! » dit Omar. « De l’eau ou du jus ? »\n\nAprès le dîner, il y a du gâteau et du café. « Pas de sucre dans mon café, s’il te plaît », dit-elle. « Merci ! Quel dîner ! »",
      ar: "إنه مساء يوم الجمعة. عمر وأبوه يحضّران وجبة لأم عمر. هناك حساء خضار وأرز ولحم. وهناك بطاطس مع قليل من الملح أيضا.\n\nتقول أم عمر: «مساء الخير! ما كل هذا الطعام؟» يقول عمر: «هذا العشاء لكِ! ماء أم عصير؟»\n\nبعد العشاء، هناك كعكة وقهوة. تقول: «لا سكر في قهوتي، من فضلك. شكرا! يا له من عشاء!»",
    },
    uses: ["meal", "vegetable", "soup", "rice", "meat", "potato", "salt", "food", "dinner", "water", "juice", "cake", "coffee", "sugar"],
  },
  {
    id: "home-1",
    pack: "home",
    title: { en: "Mia’s House", fr: "La maison de Mia", ar: "بيت ميا" },
    text: {
      en: "Good morning! I am Mia, and this is my house. It has a kitchen, a bathroom and two bedrooms.\n\nMy room has a bed, a table and a chair. There is a picture of my family on the wall. In the morning, there is light from the window.\n\nNow my mother is in the kitchen. There is bread, cheese and tea on the table. \"Thank you, Mum!\"",
      fr: "Bonjour ! Je suis Mia, et voici ma maison. Elle a une cuisine, une salle de bain et deux chambres.\n\nDans ma chambre, il y a un lit, une table et une chaise. Il y a une photo de ma famille sur le mur. Le matin, la lumière vient de la fenêtre.\n\nMaintenant, ma mère est dans la cuisine. Il y a du pain, du fromage et du thé sur la table. « Merci, maman ! »",
      ar: "صباح الخير! أنا ميا، وهذا بيتي. فيه مطبخ وحمّام وغرفتا نوم.\n\nفي غرفتي سرير وطاولة وكرسي. على الجدار صورة لعائلتي. في الصباح، يأتي الضوء من النافذة.\n\nالآن أمي في المطبخ. على الطاولة خبز وجبن وشاي. «شكرًا يا أمي!»",
    },
    uses: ["house", "kitchen", "bathroom", "bedroom", "room", "bed", "table", "chair", "picture", "wall", "light", "window"],
  },
  {
    id: "home-2",
    pack: "home",
    title: { en: "Sam and the Key", fr: "Sam et la clé", ar: "سام والمفتاح" },
    text: {
      en: "In the evening, Sam is at the door of his house, but he has no key. He has his phone in his bag.\n\n\"Hello, Mum! I don’t have my key.\" \"Hi, Sam. The key is in the box in the garden.\"\n\nSam has the key now. He is in the house, and the light is on. At six, Mum is in the kitchen with bread and soup.",
      fr: "Le soir, Sam est devant la porte de sa maison, mais il n’a pas de clé. Il a son téléphone dans son sac.\n\n« Allô, maman ! Je n’ai pas ma clé. » « Salut, Sam. La clé est dans la boîte, dans le jardin. »\n\nMaintenant, Sam a la clé. Il est dans la maison, et la lumière est allumée. À six heures, maman est dans la cuisine, avec du pain et de la soupe.",
      ar: "في المساء، سام عند باب بيته، لكن ليس معه مفتاح. هاتفه في حقيبته.\n\n«مرحبًا يا أمي! ليس معي مفتاحي.» «أهلًا يا سام. المفتاح في الصندوق في الحديقة.»\n\nالآن المفتاح مع سام. هو في البيت، والضوء مضاء. في الساعة السادسة، أمي في المطبخ ومعها خبز وحساء.",
    },
    uses: ["door", "house", "key", "phone", "bag", "box", "garden", "light", "kitchen"],
  },
  {
    id: "body-1",
    pack: "body",
    title: { en: "Leo Is Sick", fr: "Leo est malade", ar: "ليو مريض" },
    text: {
      en: "\"Good morning, Leo! How are you?\" \"I am sick, Mum. My head hurts, and my stomach hurts too.\"\n\nMum has her hand on his face. \"Here is some medicine for the pain, and some tea for your health.\"\n\nIn the evening, Leo’s head does not hurt, and his stomach is fine too. \"Thank you, Mum!\"",
      fr: "« Bonjour, Leo ! Comment ça va ? » « Je suis malade, maman. J’ai mal à la tête, et j’ai mal au ventre aussi. »\n\nMaman pose sa main sur son visage. « Voici un médicament contre la douleur, et du thé pour ta santé. »\n\nLe soir, Leo n’a plus mal à la tête, et son ventre va bien aussi. « Merci, maman ! »",
      ar: "«صباح الخير يا ليو! كيف حالك؟» «أنا مريض يا أمي. رأسي يؤلمني، وبطني يؤلمني أيضًا.»\n\nتضع أمي يدها على وجهه. «هذا دواء للألم، وهذا شاي لصحتك.»\n\nفي المساء، لم يعد رأس ليو يؤلمه، وبطنه بخير أيضًا. «شكرًا يا أمي!»",
    },
    uses: ["sick", "head", "hurt", "stomach", "hand", "face", "medicine", "pain", "health"],
  },
  {
    id: "body-2",
    pack: "body",
    title: { en: "Baby Nora", fr: "Bébé Nora", ar: "الرضيعة نورا" },
    text: {
      en: "This is Nora. She is my baby sister. Nora has two eyes, two ears, one nose and one mouth.\n\nShe has ten fingers and two feet. She has no hair on her head! But now she has a tooth, her first tooth.\n\nIn the evening, Nora is in bed, and my hand is on her back. \"Good night, Nora!\"",
      fr: "Voici Nora. C’est ma petite sœur, elle est encore bébé. Nora a deux yeux, deux oreilles, un nez et une bouche.\n\nElle a dix doigts et deux pieds. Elle n’a pas de cheveux sur la tête ! Mais maintenant, elle a une dent, sa première dent.\n\nLe soir, Nora est dans son lit, et ma main est sur son dos. « Bonne nuit, Nora ! »",
      ar: "هذه نورا. إنها أختي الرضيعة. لنورا عينان وأذنان وأنف واحد وفم واحد.\n\nلها عشرة أصابع وقدمان. ليس على رأسها شعر! لكن الآن لها سنّ، سنّها الأولى.\n\nفي المساء، نورا في السرير، ويدي على ظهرها. «تصبحين على خير يا نورا!»",
    },
    uses: ["eye", "ear", "nose", "mouth", "finger", "foot", "hair", "head", "tooth", "hand", "back"],
  },
  {
    id: "describe-1",
    pack: "describe",
    title: { en: "Grandfather’s Old House", fr: "La vieille maison de grand-père", ar: "بيت جدي القديم" },
    text: {
      en: "My grandfather has an old house. It is big, and the garden is long and beautiful. The rooms are always clean.\n\nToday it is cold, but there is hot soup on the table. My cup is full of tea, and his cup is empty.\n\nGrandfather is old and I am young, but we are good friends. \"Thank you for the soup, Grandfather! It is very good.\"",
      fr: "Mon grand-père a une vieille maison. Elle est grande, et le jardin est long et beau. Les pièces sont toujours propres.\n\nAujourd’hui, il fait froid, mais il y a de la soupe chaude sur la table. Ma tasse est pleine de thé, et sa tasse est vide.\n\nGrand-père est vieux et je suis jeune, mais nous sommes de bons amis. « Merci pour la soupe, grand-père ! Elle est très bonne. »",
      ar: "لجدي بيت قديم. إنه كبير، وحديقته طويلة وجميلة. الغرف نظيفة دائمًا.\n\nالجو بارد اليوم، لكن على الطاولة حساء ساخن. كوبي مملوء بالشاي، وكوبه فارغ.\n\nجدي كبير في السن وأنا صغير السن، لكننا صديقان جيدان. «شكرًا على الحساء يا جدي! إنه جيد جدًا.»",
    },
    uses: ["old", "big", "long", "beautiful", "clean", "cold", "hot", "full", "empty", "young", "good"],
  },
  {
    id: "describe-2",
    pack: "describe",
    title: { en: "Two Different Brothers", fr: "Deux frères différents", ar: "أخوان مختلفان" },
    text: {
      en: "Adam and Omar are brothers, but they are very different. Adam is big and fast, and Omar is small and slow.\n\nNumbers are easy for Adam, but they are difficult for Omar. \"Omar, two and three?\" \"Six!\" \"No, that is wrong.\"\n\n\"Five?\" \"Yes, that is right! Very good, Omar!\"",
      fr: "Adam et Omar sont frères, mais ils sont très différents. Adam est grand et rapide, et Omar est petit et lent.\n\nLes nombres sont faciles pour Adam, mais ils sont difficiles pour Omar. « Omar, deux et trois ? » « Six ! » « Non, c’est faux. »\n\n« Cinq ? » « Oui, c’est juste ! Très bien, Omar ! »",
      ar: "آدم وعمر أخوان، لكنهما مختلفان جدًا. آدم كبير وسريع، وعمر صغير وبطيء.\n\nالأعداد سهلة على آدم، لكنها صعبة على عمر. «يا عمر، اثنان وثلاثة؟» «ستة!» «لا، هذا خطأ.»\n\n«خمسة؟» «نعم، هذا صحيح! جيد جدًا يا عمر!»",
    },
    uses: ["different", "big", "fast", "small", "slow", "easy", "difficult", "wrong", "right", "good"],
  },
  {
    id: "verbs-core-1",
    pack: "verbs-core",
    title: { en: "A Cake for Grandmother", fr: "Un gâteau pour grand-mère", ar: "كعكة للجدة" },
    text: {
      en: "Grandmother comes to Mia’s house on Sunday. Mia and Dad want to make a cake for her. They need eggs, milk, butter and sugar.\n\nMia looks in the kitchen, but she can’t find the sugar. \"Dad, can you help me?\" Dad looks in a box and finds it.\n\nOn Sunday, Mia gives the cake to Grandmother. \"Thank you, Mia! I think it is a very good cake.\"",
      fr: "Grand-mère vient chez Mia dimanche. Mia et papa veulent faire un gâteau pour elle. Ils ont besoin d’œufs, de lait, de beurre et de sucre.\n\nMia regarde dans la cuisine, mais elle ne trouve pas le sucre. « Papa, tu peux m’aider ? » Papa regarde dans une boîte et le trouve.\n\nDimanche, Mia donne le gâteau à grand-mère. « Merci, Mia ! Je pense que c’est un très bon gâteau. »",
      ar: "تأتي الجدة إلى بيت ميا يوم الأحد. ميا وأبوها يريدان أن يصنعا لها كعكة. يحتاجان إلى بيض وحليب وزبدة وسكر.\n\nتنظر ميا في المطبخ، لكنها لا تستطيع أن تجد السكر. «أبي، هل تستطيع أن تساعدني؟» ينظر أبي في صندوق ويجده.\n\nيوم الأحد، تعطي ميا الكعكة للجدة. «شكرًا يا ميا! أظن أنها كعكة جيدة جدًا.»",
    },
    uses: ["come", "want", "make", "need", "look", "can", "find", "help", "give", "think"],
  },
  {
    id: "verbs-core-2",
    pack: "verbs-core",
    title: { en: "The Box on the Table", fr: "La boîte sur la table", ar: "الصندوق على الطاولة" },
    text: {
      en: "Sara sees a box on a high table. She wants the box, but she is too small. She tries, but she can’t get it.\n\nHer brother Omar comes. \"I can help you, Sara.\" He takes the box and gives it to her.\n\nIn the box, there is a picture of their family. Sara likes it, and she puts it on the wall of her room. \"Thank you, Omar!\"",
      fr: "Sara voit une boîte sur une table haute. Elle veut la boîte, mais elle est trop petite. Elle essaie, mais elle ne peut pas l’attraper.\n\nSon frère Omar vient. « Je peux t’aider, Sara. » Il prend la boîte et la lui donne.\n\nDans la boîte, il y a une photo de leur famille. Sara l’aime bien, et elle la met sur le mur de sa chambre. « Merci, Omar ! »",
      ar: "ترى سارة صندوقًا على طاولة مرتفعة. تريد الصندوق، لكنها أصغر من أن تصل إليه. تحاول، لكنها لا تستطيع أن تحصل عليه.\n\nيأتي أخوها عمر. «أستطيع أن أساعدك يا سارة.» يأخذ الصندوق ويعطيه لها.\n\nفي الصندوق صورة لعائلتهما. تحب سارة الصورة، وتضعها على جدار غرفتها. «شكرًا يا عمر!»",
    },
    uses: ["see", "want", "try", "can", "get", "come", "help", "take", "give", "like", "put"],
  },
  {
    id: "verbs-daily-1",
    pack: "verbs-daily",
    title: { en: "Sam’s Saturday", fr: "Le samedi de Sam", ar: "يوم السبت مع سام" },
    text: {
      en: "On Saturday, Sam wakes up at seven. He washes his face and eats bread and cheese for breakfast. He drinks a cup of milk too.\n\nIn the afternoon, Sam plays with his friends in the garden. They run and sing. In the evening, Dad cooks rice and soup.\n\nAfter dinner, Mum reads to Sam in bed. At nine, he closes his eyes and sleeps. \"Good night, Sam!\"",
      fr: "Samedi, Sam se réveille à sept heures. Il se lave le visage et mange du pain et du fromage au petit-déjeuner. Il boit aussi une tasse de lait.\n\nL’après-midi, Sam joue avec ses amis dans le jardin. Ils courent et chantent. Le soir, papa cuisine du riz et de la soupe.\n\nAprès le dîner, maman fait la lecture à Sam dans son lit. À neuf heures, il ferme les yeux et s’endort. « Bonne nuit, Sam ! »",
      ar: "يوم السبت، يستيقظ سام في الساعة السابعة. يغسل وجهه ويأكل الخبز والجبن على الفطور. ويشرب كوبًا من الحليب أيضًا.\n\nبعد الظهر، يلعب سام مع أصدقائه في الحديقة. يركضون ويغنّون. في المساء، يطبخ أبي الأرز والحساء.\n\nبعد العشاء، تقرأ أمي لسام في السرير. في الساعة التاسعة، يغمض عينيه وينام. «تصبح على خير يا سام!»",
    },
    uses: ["wake up", "wash", "eat", "drink", "play", "run", "sing", "cook", "read", "close", "sleep"],
  },
  {
    id: "verbs-daily-2",
    pack: "verbs-daily",
    title: { en: "A Call to Grandmother", fr: "Un appel à grand-mère", ar: "اتصال بالجدة" },
    text: {
      en: "Lina wants to call her grandmother. She sits on a chair and waits. Grandmother answers the phone: \"Hello, Lina!\"\n\nLina speaks, and Grandmother listens. Lina asks, \"Can you come on Friday?\" \"Yes, of course!\"\n\nOn Friday, Lina and Mum buy a cake. Lina makes a picture and writes \"Welcome!\" on it. At six, she opens the door for Grandmother, and they eat the cake.",
      fr: "Lina veut appeler sa grand-mère. Elle s’assoit sur une chaise et elle attend. Grand-mère répond au téléphone : « Allô, Lina ! »\n\nLina parle, et grand-mère écoute. Lina demande : « Tu peux venir vendredi ? » « Oui, bien sûr ! »\n\nVendredi, Lina et maman achètent un gâteau. Lina fait un dessin et écrit « Bienvenue ! » dessus. À six heures, elle ouvre la porte à grand-mère, et elles mangent le gâteau.",
      ar: "تريد لينا أن تتصل بجدتها. تجلس على كرسي وتنتظر. تجيب الجدة على الهاتف: «مرحبًا يا لينا!»\n\nتتكلم لينا، وتستمع الجدة. تسأل لينا: «هل تستطيعين أن تأتي يوم الجمعة؟» «نعم، بالطبع!»\n\nيوم الجمعة، تشتري لينا وأمها كعكة. ترسم لينا صورة وتكتب عليها «أهلًا وسهلًا!». في الساعة السادسة، تفتح الباب للجدة، ويأكلن الكعكة.",
    },
    uses: ["call", "sit", "wait", "answer", "speak", "listen", "ask", "buy", "write", "open", "eat"],
  },
  {
    id: "places-1",
    pack: "places",
    title: { en: "A Day in Town", fr: "Une journée en ville", ar: "يوم في البلدة" },
    text: {
      en: "Mia lives in a small village. On Saturday, she goes to the town with her mother. They walk down a long street to the market. They buy apples and bread.\n\nOn the corner, there is a big building. It is the library, and people read there.\n\nThen they eat lunch at a restaurant. After lunch, they play in the park. \"I like the town very much!\" says Mia.",
      fr: "Mia habite dans un petit village. Samedi, elle va en ville avec sa mère. Elles marchent dans une longue rue jusqu’au marché. Elles achètent des pommes et du pain.\n\nAu coin de la rue, il y a un grand bâtiment. C’est la bibliothèque, et les gens y lisent.\n\nEnsuite, elles déjeunent au restaurant. Après le déjeuner, elles jouent dans le parc. « J’aime beaucoup la ville ! » dit Mia.",
      ar: "تعيش ميا في قرية صغيرة. يوم السبت، تذهب إلى البلدة مع أمها. تمشيان في شارع طويل إلى السوق. تشتريان التفاح والخبز.\n\nفي زاوية الشارع، يوجد مبنى كبير. إنه المكتبة، والناس يقرؤون فيها.\n\nثم تتناولان الغداء في مطعم. بعد الغداء، تلعبان في الحديقة. تقول ميا: «أحب البلدة كثيرًا!»",
    },
    uses: ["village", "town", "street", "market", "corner", "building", "library", "restaurant", "park"],
  },
  {
    id: "places-2",
    pack: "places",
    title: { en: "In the City Centre", fr: "Au centre-ville", ar: "في وسط المدينة" },
    text: {
      en: "Omar and his grandfather go to the city centre. First, they take a small box to the post office.\n\nThen they walk over the bridge to the square. There is a beautiful old building there. \"This is the town hall,\" says grandfather.\n\nThey see the museum and then go to the cinema. \"I like the city very much!\" says Omar.",
      fr: "Omar et son grand-père vont au centre-ville. D’abord, ils apportent une petite boîte à la poste.\n\nEnsuite, ils traversent le pont jusqu’à la place. Il y a là un beau bâtiment ancien. « C’est la mairie », dit grand-père.\n\nIls voient le musée, puis ils vont au cinéma. « J’aime beaucoup la ville ! » dit Omar.",
      ar: "يذهب عمر وجده إلى وسط المدينة. أولًا، يأخذان صندوقًا صغيرًا إلى مكتب البريد.\n\nثم يمشيان فوق الجسر إلى الساحة. يوجد هناك مبنى قديم جميل. يقول الجد: «هذا مبنى البلدية».\n\nيريان المتحف، ثم يذهبان إلى السينما. يقول عمر: «أحب المدينة كثيرًا!»",
    },
    uses: ["city centre", "post office", "bridge", "square", "building", "town hall", "museum", "cinema", "city"],
  },
  {
    id: "school-1",
    pack: "school",
    title: { en: "Sam's First Day", fr: "Le premier jour de Sam", ar: "اليوم الأول لسام" },
    text: {
      en: "Today is Sam's first day at school. His teacher is Mrs Nora. Sam sits at a small desk with a book and a pen.\n\nThe first lesson is English. Mrs Nora asks a question. Sam knows the answer, and he says it. \"Very good!\" says the teacher.\n\nAfter school, Sam says to his mother, \"I like my class. I learn many new words!\"",
      fr: "Aujourd’hui, c’est le premier jour d’école de Sam. Sa maîtresse s’appelle Mme Nora. Sam s’assoit à un petit bureau avec un livre et un stylo.\n\nLa première leçon, c’est l’anglais. Mme Nora pose une question. Sam connaît la réponse, et il la dit. « Très bien ! » dit la maîtresse.\n\nAprès l’école, Sam dit à sa mère : « J’aime ma classe. J’apprends beaucoup de nouveaux mots ! »",
      ar: "اليوم هو أول يوم لسام في المدرسة. معلمته هي السيدة نورا. يجلس سام إلى مكتب صغير ومعه كتاب وقلم.\n\nالدرس الأول هو اللغة الإنجليزية. تطرح السيدة نورا سؤالًا. يعرف سام الجواب، فيقوله. تقول المعلمة: «جيد جدًا!»\n\nبعد المدرسة، يقول سام لأمه: «أحب صفي. أتعلم كلمات جديدة كثيرة!»",
    },
    uses: ["school", "teacher", "desk", "book", "pen", "lesson", "English", "question", "answer", "class", "learn", "word"],
  },
  {
    id: "school-2",
    pack: "school",
    title: { en: "Mia's Science Test", fr: "Le contrôle de sciences de Mia", ar: "اختبار العلوم لميا" },
    text: {
      en: "Mia is a student. On Friday, she has a science test. On Thursday, she studies with her brother Adam. Adam is at university.\n\nMia reads ten pages. She writes on paper and makes a mistake. \"Look at this example,\" says Adam.\n\nOn Friday, the test is easy for Mia. \"Thank you for teaching me,\" she says to Adam.",
      fr: "Mia est élève. Vendredi, elle a un contrôle de sciences. Jeudi, elle étudie avec son frère Adam. Adam est à l’université.\n\nMia lit dix pages. Elle écrit sur du papier et fait une erreur. « Regarde cet exemple », dit Adam.\n\nVendredi, le contrôle est facile pour Mia. « Merci de m’avoir aidée à apprendre », dit-elle à Adam.",
      ar: "ميا تلميذة. يوم الجمعة، عندها اختبار في العلوم. يوم الخميس، تدرس مع أخيها آدم. آدم يدرس في الجامعة.\n\nتقرأ ميا عشر صفحات. تكتب على الورق وترتكب خطأً. يقول آدم: «انظري إلى هذا المثال».\n\nيوم الجمعة، يكون الاختبار سهلًا على ميا. تقول لآدم: «شكرًا لأنك علّمتني».",
    },
    uses: ["student", "science", "test", "study", "university", "page", "paper", "mistake", "example", "teach"],
  },
  {
    id: "work-1",
    pack: "work",
    title: { en: "Many Jobs", fr: "Beaucoup de métiers", ar: "مهن كثيرة" },
    text: {
      en: "Leo's family is big, and they all work. His mother is a doctor, and his father is a nurse. They work at the hospital.\n\nHis uncle is a farmer in the village. His aunt is an engineer at a big factory. His grandfather was a cook at a restaurant.\n\nLeo is six. \"I want a job too,\" he says. \"I want to be a driver, a farmer and a cook!\"",
      fr: "La famille de Leo est grande, et tout le monde travaille. Sa mère est médecin, et son père est infirmier. Ils travaillent à l’hôpital.\n\nSon oncle est agriculteur au village. Sa tante est ingénieure dans une grande usine. Son grand-père était cuisinier dans un restaurant.\n\nLeo a six ans. « Moi aussi, je veux un travail », dit-il. « Je veux être chauffeur, agriculteur et cuisinier ! »",
      ar: "عائلة ليو كبيرة، وكلهم يعملون. أمه طبيبة، وأبوه ممرض. يعملان في المستشفى.\n\nعمه مزارع في القرية. عمته مهندسة في مصنع كبير. كان جده طباخًا في مطعم.\n\nعمر ليو ست سنوات. يقول: «أريد عملًا أنا أيضًا. أريد أن أكون سائقًا ومزارعًا وطباخًا!»",
    },
    uses: ["work", "doctor", "nurse", "farmer", "engineer", "factory", "cook", "job", "driver"],
  },
  {
    id: "work-2",
    pack: "work",
    title: { en: "Sara at the Office", fr: "Sara au bureau", ar: "سارة في المكتب" },
    text: {
      en: "Sara's mother is a manager at a big company. On Monday, Sara goes to the office with her.\n\nThere is a meeting at ten. The boss, Mr Adam, speaks to the team. The workers listen. A customer comes with a question.\n\nSara helps the secretary with some papers. \"You are a good worker!\" says the boss. \"Can I have a job here too?\" asks Sara.",
      fr: "La mère de Sara est directrice dans une grande entreprise. Lundi, Sara va au bureau avec elle.\n\nIl y a une réunion à dix heures. Le patron, M. Adam, parle à l’équipe. Les employés écoutent. Un client arrive avec une question.\n\nSara aide la secrétaire avec des papiers. « Tu es une bonne travailleuse ! » dit le patron. « Je peux avoir un travail ici, moi aussi ? » demande Sara.",
      ar: "أم سارة مديرة في شركة كبيرة. يوم الاثنين، تذهب سارة معها إلى المكتب.\n\nهناك اجتماع في الساعة العاشرة. يتحدث رئيس العمل، السيد آدم، إلى الفريق. يستمع العمال. يأتي زبون ومعه سؤال.\n\nتساعد سارة السكرتيرة في بعض الأوراق. يقول رئيس العمل: «أنتِ عاملة جيدة!» تسأل سارة: «هل يمكن أن يكون لي عمل هنا أنا أيضًا؟»",
    },
    uses: ["manager", "company", "office", "meeting", "boss", "team", "worker", "customer", "secretary", "job"],
  },
  {
    id: "travel-1",
    pack: "travel",
    title: { en: "Nora's Holiday Trip", fr: "Le voyage de vacances de Nora", ar: "رحلة نورا في العطلة" },
    text: {
      en: "It is holiday time, and Nora's family goes on a trip. They take a taxi to the station. Her father buys four tickets for the train.\n\nNora sits in a seat by the window. She looks at a map of the country. In the evening, they arrive at a big hotel.\n\nIn the morning, they visit the city and the museum. \"I like to travel!\" says Nora.",
      fr: "C’est le temps des vacances, et la famille de Nora part en voyage. Ils prennent un taxi jusqu’à la gare. Son père achète quatre billets de train.\n\nNora s’assoit sur un siège près de la fenêtre. Elle regarde une carte du pays. Le soir, ils arrivent dans un grand hôtel.\n\nLe matin, ils visitent la ville et le musée. « J’aime voyager ! » dit Nora.",
      ar: "إنه وقت العطلة، وعائلة نورا تذهب في رحلة. يركبون سيارة أجرة إلى المحطة. يشتري أبوها أربع تذاكر للقطار.\n\nتجلس نورا في مقعد بجانب النافذة. تنظر إلى خريطة البلد. في المساء، يصلون إلى فندق كبير.\n\nفي الصباح، يزورون المدينة والمتحف. تقول نورا: «أحب السفر!»",
    },
    uses: ["holiday", "trip", "taxi", "station", "ticket", "train", "seat", "map", "country", "arrive", "hotel", "visit", "travel"],
  },
  {
    id: "travel-2",
    pack: "travel",
    title: { en: "Grandmother Flies Here", fr: "Grand-mère arrive en avion", ar: "الجدة تصل بالطائرة" },
    text: {
      en: "Grandmother lives in a different country. Today she flies here on a plane. Omar and his father drive to the airport.\n\nThe traffic on the road is very slow. Omar waits and waits. But they arrive at the airport on time.\n\nGrandmother comes with a big bag. She gives Omar a picture of a big ship. Omar likes it very much. Then they all leave the airport in the car.",
      fr: "Grand-mère habite dans un autre pays. Aujourd’hui, elle vient ici en avion. Omar et son père vont à l’aéroport en voiture.\n\nLa circulation sur la route est très lente. Omar attend, et attend encore. Mais ils arrivent à l’aéroport à l’heure.\n\nGrand-mère arrive avec un grand sac. Elle donne à Omar l’image d’un grand navire. Omar l’aime beaucoup. Puis ils quittent tous l’aéroport en voiture.",
      ar: "تعيش الجدة في بلد مختلف. اليوم تطير إلى هنا بالطائرة. يذهب عمر وأبوه بالسيارة إلى المطار.\n\nحركة المرور على الطريق بطيئة جدًا. ينتظر عمر وينتظر. لكنهما يصلان إلى المطار في الوقت المحدد.\n\nتأتي الجدة ومعها حقيبة كبيرة. تعطي عمر صورة سفينة كبيرة. تعجب الصورة عمر كثيرًا. ثم يغادرون جميعًا المطار بالسيارة.",
    },
    uses: ["country", "fly", "plane", "drive", "airport", "traffic", "arrive", "ship", "leave", "car"],
  },
  {
    id: "feelings-1",
    pack: "feelings",
    title: { en: "Lina's New Cake", fr: "Le nouveau gâteau de Lina", ar: "كعكة لينا الجديدة" },
    text: {
      en: "Lina is very excited. Her grandmother comes for lunch today. But oh no, the cake is on the floor!\n\nLina is sad, and she cries. Her mother is calm. \"We can make a new cake,\" she says.\n\nAt lunch, grandmother is hungry. She eats the cake and smiles. Lina laughs and feels happy.",
      fr: "Lina est très enthousiaste. Sa grand-mère vient déjeuner aujourd’hui. Mais oh non, le gâteau est par terre !\n\nLina est triste, et elle pleure. Sa mère est calme. « Nous pouvons faire un nouveau gâteau », dit-elle.\n\nAu déjeuner, grand-mère a faim. Elle mange le gâteau et sourit. Lina rit et se sent heureuse.",
      ar: "لينا متحمسة جدًا. جدتها تأتي اليوم لتناول الغداء. لكن، يا للأسف، الكعكة على الأرض!\n\nلينا حزينة، وهي تبكي. أمها هادئة. تقول: «يمكننا أن نصنع كعكة جديدة».\n\nعند الغداء، الجدة جائعة. تأكل الكعكة وتبتسم. تضحك لينا وتشعر بالسعادة.",
    },
    uses: ["excited", "sad", "cry", "calm", "hungry", "smile", "laugh", "feel", "happy"],
  },
  {
    id: "feelings-2",
    pack: "feelings",
    title: { en: "Adam Can Swim", fr: "Adam sait nager", ar: "آدم يستطيع السباحة" },
    text: {
      en: "Adam is at the swimming pool with his father. He is nervous and afraid of the water. \"I hope you enjoy it,\" says his father.\n\nAdam is worried, but he tries, and he swims! His father is very surprised.\n\nAfter an hour, Adam is tired and thirsty. \"I am proud of you,\" says his father. \"I am glad,\" says Adam. \"I love to swim!\"",
      fr: "Adam est à la piscine avec son père. Il est nerveux et il a peur de l’eau. « J’espère que ça va te plaire », dit son père.\n\nAdam est inquiet, mais il essaie, et il nage ! Son père est très surpris.\n\nAprès une heure, Adam est fatigué et il a soif. « Je suis fier de toi », dit son père. « Je suis content », dit Adam. « J’adore nager ! »",
      ar: "آدم في المسبح مع أبيه. هو متوتر وخائف من الماء. يقول أبوه: «أتمنى أن تستمتع بذلك».\n\nآدم قلق، لكنه يحاول، ويسبح! أبوه متفاجئ جدًا.\n\nبعد ساعة، آدم متعب وعطشان. يقول أبوه: «أنا فخور بك». يقول آدم: «أنا مسرور. أحب السباحة!»",
    },
    uses: ["nervous", "afraid", "hope", "enjoy", "worried", "surprised", "tired", "thirsty", "proud", "glad", "love"],
  },
  {
    id: "nature-1",
    pack: "nature",
    title: { en: "A Day at the Beach", fr: "Une journée à la plage", ar: "يوم على الشاطئ" },
    text: {
      en: "On Saturday, Sam and his family go to the beach. The weather is very good. The sun is hot, and there are no clouds in the sky.\n\nSam swims in the sea with his father. His sister Mia finds a beautiful stone. Then a cold wind comes, and rain comes with it.\n\nIt is a short storm, and the family waits in the car. After one hour, the sun comes out. \"Look, the sun!\" says Mia, and they all run to the sea.",
      fr: "Samedi, Sam et sa famille vont à la plage. Le temps est très beau. Le soleil est chaud, et il n’y a pas de nuages dans le ciel.\n\nSam nage dans la mer avec son père. Sa sœur Mia trouve une belle pierre. Puis un vent froid arrive, et la pluie arrive avec lui.\n\nC’est un orage court, et la famille attend dans la voiture. Au bout d’une heure, le soleil revient. « Regardez, le soleil ! » dit Mia, et ils courent tous vers la mer.",
      ar: "يوم السبت، يذهب سام وعائلته إلى الشاطئ. الطقس جميل جدا. الشمس حارة، ولا توجد غيوم في السماء.\n\nيسبح سام في البحر مع أبيه. تجد أخته ميا حجرا جميلا. ثم تأتي ريح باردة، ويأتي المطر معها.\n\nإنها عاصفة قصيرة، فتنتظر العائلة في السيارة. بعد ساعة، تخرج الشمس. تقول ميا: «انظروا، الشمس!»، ويركضون جميعا إلى البحر.",
    },
    uses: ["weather", "sun", "cloud", "sky", "beach", "sea", "stone", "wind", "rain", "storm"],
  },
  {
    id: "nature-2",
    pack: "nature",
    title: { en: "Lina's Small Plant", fr: "La petite plante de Lina", ar: "نبتة لينا الصغيرة" },
    text: {
      en: "Lina lives in a small village with her grandmother. There is a big forest, a river and a high mountain.\n\nOne morning, Lina finds a small plant in the grass. It has two small leaves. She takes it to the garden and gives it water every day.\n\nIn the evening, the moon and the stars are in the sky. Lina and her grandmother sit in the garden and look at the plant. One month later, the plant has a beautiful flower. Lina smiles and says, \"My first flower!\"",
      fr: "Lina habite dans un petit village avec sa grand-mère. Il y a une grande forêt, une rivière et une haute montagne.\n\nUn matin, Lina trouve une petite plante dans l’herbe. Elle a deux petites feuilles. Lina l’emporte dans le jardin et lui donne de l’eau tous les jours.\n\nLe soir, la lune et les étoiles sont dans le ciel. Lina et sa grand-mère s’assoient dans le jardin et regardent la plante. Un mois plus tard, la plante a une belle fleur. Lina sourit et dit : « Ma première fleur ! »",
      ar: "تعيش لينا في قرية صغيرة مع جدتها. هناك غابة كبيرة ونهر وجبل عالٍ.\n\nذات صباح، تجد لينا نبتة صغيرة في العشب. لها ورقتان صغيرتان. تأخذها إلى الحديقة وتعطيها الماء كل يوم.\n\nفي المساء، يكون القمر والنجوم في السماء. تجلس لينا وجدتها في الحديقة وتنظران إلى النبتة. بعد شهر، تصبح للنبتة زهرة جميلة. تبتسم لينا وتقول: «زهرتي الأولى!»",
    },
    uses: ["forest", "river", "mountain", "plant", "grass", "leaf", "moon", "star", "sky", "flower"],
  },
  {
    id: "animals-1",
    pack: "animals",
    title: { en: "Grandfather's Animals", fr: "Les animaux de grand-père", ar: "حيوانات الجد" },
    text: {
      en: "Omar visits his grandfather in the village. His grandfather is a farmer and has many animals.\n\nEvery morning, Omar helps him give food to the cows, the sheep and the goats. The chickens and the ducks eat bread. A horse comes to Omar, and he gives it an apple.\n\nIn the afternoon, the dog finds a small cat in the garden. It is hungry and very tired. \"Can it be my pet?\" asks Omar. \"Yes, of course,\" says his grandfather, and Omar smiles.",
      fr: "Omar rend visite à son grand-père au village. Son grand-père est agriculteur et il a beaucoup d’animaux.\n\nChaque matin, Omar l’aide à donner à manger aux vaches, aux moutons et aux chèvres. Les poules et les canards mangent du pain. Un cheval vient vers Omar, et il lui donne une pomme.\n\nL’après-midi, le chien trouve un petit chat dans le jardin. Il a faim et il est très fatigué. « Il peut être mon animal de compagnie ? » demande Omar. « Oui, bien sûr », dit son grand-père, et Omar sourit.",
      ar: "يزور عمر جده في القرية. جده فلاح ولديه حيوانات كثيرة.\n\nكل صباح، يساعده عمر في إطعام الأبقار والخراف والماعز. تأكل الدجاجات والبطات الخبز. يأتي حصان إلى عمر، فيعطيه تفاحة.\n\nبعد الظهر، يجد الكلب قطة صغيرة في الحديقة. إنها جائعة ومتعبة جدا. يسأل عمر: «هل يمكن أن تكون حيواني الأليف؟» يقول جده: «نعم، بالطبع»، ويبتسم عمر.",
    },
    uses: ["animal", "cow", "sheep", "goat", "chicken", "duck", "horse", "dog", "cat", "pet"],
  },
  {
    id: "animals-2",
    pack: "animals",
    title: { en: "Mia's Animal Book", fr: "Le livre d’animaux de Mia", ar: "كتاب ميا عن الحيوانات" },
    text: {
      en: "Mia has a new book about animals. Every night, she reads it with her father.\n\n\"This is a lion, and this is a tiger,\" says her father. The elephant is very big, and the mouse is very small. The monkey eats an orange, and Mia laughs.\n\nThen they see a long snake. \"No snakes, please!\" says Mia. Her father finds a page with a bear and a fox. Mia smiles and goes to sleep with the book.",
      fr: "Mia a un nouveau livre sur les animaux. Chaque soir, elle le lit avec son père.\n\n« Ça, c’est un lion, et ça, c’est un tigre », dit son père. L’éléphant est très grand, et la souris est très petite. Le singe mange une orange, et Mia rit.\n\nPuis ils voient un long serpent. « Pas de serpents, s’il te plaît ! » dit Mia. Son père trouve une page avec un ours et un renard. Mia sourit et s’endort avec le livre.",
      ar: "لدى ميا كتاب جديد عن الحيوانات. كل ليلة، تقرؤه مع أبيها.\n\nيقول أبوها: «هذا أسد، وهذا نمر.» الفيل كبير جدا، والفأر صغير جدا. يأكل القرد برتقالة، فتضحك ميا.\n\nثم يريان ثعبانا طويلا. تقول ميا: «لا ثعابين، من فضلك!» يجد أبوها صفحة فيها دب وثعلب. تبتسم ميا وتنام مع الكتاب.",
    },
    uses: ["animal", "lion", "tiger", "elephant", "mouse", "monkey", "snake", "bear", "fox"],
  },
  {
    id: "clothes-1",
    pack: "clothes",
    title: { en: "A Cold Morning", fr: "Un matin froid", ar: "صباح بارد" },
    text: {
      en: "It is a cold morning, and there is snow in the garden. Leo wants to play in the snow.\n\n\"Put on your coat, please,\" says his mother. Leo puts on his sweater, his coat and his boots. He wears a hat, a scarf and gloves too.\n\nLeo plays in the snow with his sister for one hour. Then they go in, and Leo takes off his boots, his gloves and his coat. His mother gives them hot milk. \"Thank you!\" says Leo, with a big smile.",
      fr: "C’est un matin froid, et il y a de la neige dans le jardin. Leo veut jouer dans la neige.\n\n« Mets ton manteau, s’il te plaît », dit sa mère. Leo met son pull, son manteau et ses bottes. Il porte aussi un chapeau, une écharpe et des gants.\n\nLeo joue dans la neige avec sa sœur pendant une heure. Puis ils rentrent, et Leo enlève ses bottes, ses gants et son manteau. Sa mère leur donne du lait chaud. « Merci ! » dit Leo, avec un grand sourire.",
      ar: "إنه صباح بارد، وهناك ثلج في الحديقة. يريد ليو أن يلعب في الثلج.\n\nتقول أمه: «البس معطفك، من فضلك.» يلبس ليو كنزته ومعطفه وجزمته. ويلبس أيضا قبعة ووشاحا وقفازين.\n\nيلعب ليو في الثلج مع أخته لمدة ساعة. ثم يدخلان، ويخلع ليو جزمته وقفازيه ومعطفه. تعطيهما أمه حليبا ساخنا. يقول ليو بابتسامة كبيرة: «شكرا!»",
    },
    uses: ["put on", "coat", "sweater", "boot", "wear", "hat", "scarf", "glove", "take off"],
  },
  {
    id: "clothes-2",
    pack: "clothes",
    title: { en: "Nora's New Dress", fr: "La nouvelle robe de Nora", ar: "فستان نورا الجديد" },
    text: {
      en: "Nora and her mother go to a shop to buy clothes. Nora needs new clothes for school.\n\nNora tries on a skirt, but it is too big. The woman in the shop gives her a smaller size. Then Nora sees a beautiful dress with big buttons and two pockets. She puts it on, and it is the right size!\n\nHer mother buys the dress, two T-shirts, jeans and new shoes. In the evening, Nora wears her new dress for her father. \"Very beautiful!\" he says, and Nora smiles.",
      fr: "Nora et sa mère vont dans un magasin pour acheter des vêtements. Nora a besoin de nouveaux vêtements pour l’école.\n\nNora essaie une jupe, mais elle est trop grande. La dame du magasin lui donne une taille plus petite. Puis Nora voit une belle robe avec de gros boutons et deux poches. Elle la met, et c’est la bonne taille !\n\nSa mère achète la robe, deux T-shirts, un jean et de nouvelles chaussures. Le soir, Nora porte sa nouvelle robe pour son père. « Très belle ! » dit-il, et Nora sourit.",
      ar: "تذهب نورا وأمها إلى متجر لشراء الملابس. تحتاج نورا إلى ملابس جديدة للمدرسة.\n\nتجرب نورا تنورة، لكنها كبيرة عليها. تعطيها المرأة في المتجر مقاسا أصغر. ثم ترى نورا فستانا جميلا بأزرار كبيرة وجيبين. تلبسه، وهو المقاس الصحيح!\n\nتشتري أمها الفستان وقميصين قصيري الأكمام وبنطال جينز وحذاء جديدا. في المساء، تلبس نورا فستانها الجديد لأبيها. يقول: «جميل جدا!»، وتبتسم نورا.",
    },
    uses: ["clothes", "skirt", "size", "dress", "button", "pocket", "put on", "T-shirt", "jeans", "shoe", "wear"],
  },
  {
    id: "questions-1",
    pack: "questions",
    title: { en: "Whose Bag Is This?", fr: "À qui est ce sac ?", ar: "لمن هذه الحقيبة؟" },
    text: {
      en: "Adam finds a bag on the floor of his class. \"Whose bag is this?\" he asks. \"Is it Sara's or Omar's?\"\n\n\"It is not my bag, because my bag is old,\" says Omar. \"Who has a new bag?\" asks the teacher. \"Lina has one, but she is not here,\" says Sara.\n\nThen Lina comes in, and she looks very sad. \"Where is my bag?\" she asks. Adam gives it to her, so she smiles and says, \"Thank you!\"",
      fr: "Adam trouve un sac par terre dans sa classe. « À qui est ce sac ? » demande-t-il. « C’est celui de Sara ou d’Omar ? »\n\n« Ce n’est pas mon sac, parce que mon sac est vieux », dit Omar. « Qui a un nouveau sac ? » demande la maîtresse. « Lina en a un, mais elle n’est pas là », dit Sara.\n\nPuis Lina entre, et elle a l’air très triste. « Où est mon sac ? » demande-t-elle. Adam le lui donne, alors elle sourit et dit : « Merci ! »",
      ar: "يجد آدم حقيبة على أرض فصله. يسأل: «لمن هذه الحقيبة؟ هل هي لسارة أم لعمر؟»\n\nيقول عمر: «ليست حقيبتي، لأن حقيبتي قديمة.» تسأل المعلمة: «من لديه حقيبة جديدة؟» تقول سارة: «لدى لينا واحدة، لكنها ليست هنا.»\n\nثم تدخل لينا، وتبدو حزينة جدا. تسأل: «أين حقيبتي؟» يعطيها آدم الحقيبة، فتبتسم وتقول: «شكرا!»",
    },
    uses: ["whose", "or", "because", "who", "but", "and", "then", "where", "so"],
  },
  {
    id: "questions-2",
    pack: "questions",
    title: { en: "A Cake for Grandmother", fr: "Un gâteau pour grand-mère", ar: "كعكة للجدة" },
    text: {
      en: "Today Sara and her brother make a cake for their grandmother. \"How many eggs do we need?\" asks Sara. \"Four eggs, and also some milk and sugar,\" says her brother.\n\nWhile they wait, Sara asks a question: \"How old is Grandmother?\" \"I don't know, but she is older than our father!\" says her brother.\n\nWhen their grandmother arrives and sees the cake, she asks, \"What is this? Why a cake?\" \"Because we love you!\" says Sara. Grandmother laughs and says, \"Then let's eat it now!\"",
      fr: "Aujourd’hui, Sara et son frère font un gâteau pour leur grand-mère. « Combien d’œufs faut-il ? » demande Sara. « Quatre œufs, et aussi du lait et du sucre », dit son frère.\n\nPendant qu’ils attendent, Sara pose une question : « Quel âge a grand-mère ? » « Je ne sais pas, mais elle est plus âgée que notre père ! » dit son frère.\n\nQuand leur grand-mère arrive et voit le gâteau, elle demande : « Qu’est-ce que c’est ? Pourquoi un gâteau ? » « Parce que nous t’aimons ! » dit Sara. Grand-mère rit et dit : « Alors, mangeons-le maintenant ! »",
      ar: "اليوم، تصنع سارة وأخوها كعكة لجدتهما. تسأل سارة: «كم بيضة نحتاج؟» يقول أخوها: «أربع بيضات، وأيضا بعض الحليب والسكر.»\n\nبينما ينتظران، تسأل سارة سؤالا: «كم عمر جدتنا؟» يقول أخوها: «لا أعرف، لكنها أكبر من أبينا!»\n\nعندما تصل جدتهما وترى الكعكة، تسأل: «ما هذا؟ لماذا كعكة؟» تقول سارة: «لأننا نحبك!» تضحك الجدة وتقول: «إذن، لنأكلها الآن!»",
    },
    uses: ["how many", "and", "also", "while", "how old", "but", "than", "when", "what", "why", "because", "then"],
  },
  {
    id: "position-1",
    pack: "position",
    title: { en: "Where Is the Cat?", fr: "Où est le chat ?", ar: "أين القطة؟" },
    text: {
      en: "Mia's cat is not in the house. Mia looks under the bed and behind the door. She looks inside the box next to the window, but the cat is not there.\n\nMia goes outside into the garden. She looks around the trees and between the flowers. Then she looks up. The cat is in the tree, above her head!\n\n\"Come down, please!\" says Mia. The cat comes down to her, and Mia laughs.",
      fr: "Le chat de Mia n’est pas dans la maison. Mia regarde sous le lit et derrière la porte. Elle regarde dans la boîte à côté de la fenêtre, mais le chat n’est pas là.\n\nMia sort dans le jardin. Elle regarde autour des arbres et entre les fleurs. Puis elle lève les yeux. Le chat est dans l’arbre, au-dessus de sa tête !\n\n« Descends, s’il te plaît ! » dit Mia. Le chat descend vers elle, et Mia rit.",
      ar: "قطة ميا ليست في البيت. تنظر ميا تحت السرير وخلف الباب. تنظر داخل الصندوق بجانب النافذة، لكن القطة ليست هناك.\n\nتخرج ميا إلى الحديقة. تنظر حول الأشجار وبين الزهور. ثم تنظر إلى أعلى. القطة في الشجرة، فوق رأسها!\n\nتقول ميا: «انزلي، من فضلك!» تنزل القطة إليها، وتضحك ميا.",
    },
    uses: ["in", "under", "behind", "inside", "next to", "there", "outside", "into", "around", "between", "up", "above", "down", "to"],
  },
  {
    id: "position-2",
    pack: "position",
    title: { en: "The Way to the Library", fr: "Le chemin de la bibliothèque", ar: "الطريق إلى المكتبة" },
    text: {
      en: "Sam and his grandfather walk from the station to the library. \"Is the library far from here?\" asks Sam. \"No, it is near,\" says his grandfather.\n\nThey go straight ahead down a long street. At the corner, they go left and then right. They walk through a small park, between the trees.\n\n\"Here it is!\" says his grandfather. The library is big, and there is a beautiful garden in front of it. Sam smiles and runs to the door.",
      fr: "Sam et son grand-père marchent de la gare jusqu’à la bibliothèque. « La bibliothèque est loin d’ici ? » demande Sam. « Non, elle est tout près », dit son grand-père.\n\nIls vont tout droit dans une longue rue. Au coin, ils vont à gauche, puis à droite. Ils traversent un petit parc, entre les arbres.\n\n« La voilà ! » dit son grand-père. La bibliothèque est grande, et il y a un beau jardin devant. Sam sourit et court vers la porte.",
      ar: "يمشي سام وجده من المحطة إلى المكتبة. يسأل سام: «هل المكتبة بعيدة عن هنا؟» يقول جده: «لا، إنها قريبة.»\n\nيمشيان إلى الأمام مباشرة في شارع طويل. عند الزاوية، يذهبان إلى اليسار، ثم إلى اليمين. يمشيان عبر حديقة عامة صغيرة، بين الأشجار.\n\nيقول جده: «ها هي!» المكتبة كبيرة، وأمامها حديقة جميلة. يبتسم سام ويركض إلى الباب.",
    },
    uses: ["from", "to", "far", "here", "near", "straight ahead", "down", "at", "left", "right", "through", "between", "in front of", "there"],
  },
];
