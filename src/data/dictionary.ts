export interface DictionaryEntry {
  word: string;
  lazy: string;
  definition: string;
  pronunciation: string;
  partOfSpeech: string;
}

export const dictionary: DictionaryEntry[] = [
  { word: "phone", lazy: "fon", definition: "A device used to talk to people far away.", pronunciation: "FON", partOfSpeech: "noun" },
  { word: "photo", lazy: "foto", definition: "A picture made using a camera.", pronunciation: "FO-toh", partOfSpeech: "noun" },
  { word: "elephant", lazy: "elifant", definition: "A very large gray animal with a trunk.", pronunciation: "EL-i-fant", partOfSpeech: "noun" },
  { word: "queen", lazy: "kween", definition: "A female ruler of a country.", pronunciation: "KWEEN", partOfSpeech: "noun" },
  { word: "quick", lazy: "kwik", definition: "Moving fast or doing something in a short time.", pronunciation: "KWIK", partOfSpeech: "adjective" },
  { word: "back", lazy: "bak", definition: "The rear surface of the human body.", pronunciation: "BAK", partOfSpeech: "noun" },
  { word: "clock", lazy: "klok", definition: "An instrument for measuring and showing time.", pronunciation: "KLOK", partOfSpeech: "noun" },
  { word: "city", lazy: "siti", definition: "A large and important town.", pronunciation: "SI-tee", partOfSpeech: "noun" },
  { word: "center", lazy: "senter", definition: "The middle point of something.", pronunciation: "SEN-ter", partOfSpeech: "noun" },
  { word: "enough", lazy: "enuf", definition: "As much or as many as required.", pronunciation: "ih-NUF", partOfSpeech: "adjective" },
  { word: "through", lazy: "throo", definition: "Moving in one side and out of the other side.", pronunciation: "THROO", partOfSpeech: "preposition" },
  { word: "think", lazy: "think", definition: "Have a particular opinion, belief, or idea.", pronunciation: "THINK", partOfSpeech: "verb" },
  { word: "shake", lazy: "shayk", definition: "Move quickly backwards and forwards or up and down.", pronunciation: "SHAYK", partOfSpeech: "verb" },
  { word: "ship", lazy: "ship", definition: "A large boat for transporting people or goods by sea.", pronunciation: "SHIP", partOfSpeech: "noun" },
  { word: "chair", lazy: "cher", definition: "A separate seat for one person, typically with a back and four legs.", pronunciation: "CHER", partOfSpeech: "noun" },
  { word: "night", lazy: "nyt", definition: "The period of darkness in each twenty-four hours.", pronunciation: "NYT", partOfSpeech: "noun" },
  { word: "light", lazy: "lyt", definition: "The natural agent that stimulates sight and makes things visible.", pronunciation: "LYT", partOfSpeech: "noun" },
  { word: "write", lazy: "ryt", definition: "Mark (letters, words, or other symbols) on a surface.", pronunciation: "RYT", partOfSpeech: "verb" },
  { word: "school", lazy: "skool", definition: "An institution for educating children.", pronunciation: "SKOOL", partOfSpeech: "noun" },
  { word: "which", lazy: "wich", definition: "Asking for information specifying one or more people or things.", pronunciation: "WICH", partOfSpeech: "pronoun" },
  { word: "this", lazy: "this", definition: "Used to identify a specific person or thing close at hand.", pronunciation: "THIS", partOfSpeech: "pronoun" },
  { word: "the", lazy: "the", definition: "Denoting one or more people or things already mentioned.", pronunciation: "THUH", partOfSpeech: "article" },
  { word: "water", lazy: "woter", definition: "A colorless, transparent, odorless liquid.", pronunciation: "WAW-ter", partOfSpeech: "noun" },
  { word: "people", lazy: "peepl", definition: "Human beings in general or considered collectively.", pronunciation: "PEE-pul", partOfSpeech: "noun" },
  { word: "laugh", lazy: "laf", definition: "Make the spontaneous sounds and movements of the face and body that express amusement.", pronunciation: "LAF", partOfSpeech: "verb" },
  { word: "thought", lazy: "thot", definition: "An idea or opinion produced by thinking.", pronunciation: "THOT", partOfSpeech: "noun" },
  { word: "knife", lazy: "nyf", definition: "An instrument composed of a blade fixed into a handle.", pronunciation: "NYF", partOfSpeech: "noun" },
  { word: "where", lazy: "wer", definition: "In or to what place or position.", pronunciation: "WAIR", partOfSpeech: "adverb" },
  { word: "what", lazy: "wat", definition: "Asking for information specifying something.", pronunciation: "WUT", partOfSpeech: "pronoun" },
  { word: "know", lazy: "no", definition: "Be aware of through observation, inquiry, or information.", pronunciation: "NOH", partOfSpeech: "verb" },
  { word: "wrong", lazy: "rong", definition: "Not correct or true.", pronunciation: "RAWNG", partOfSpeech: "adjective" },
  { word: "ghost", lazy: "gost", definition: "An apparition of a dead person.", pronunciation: "GOHST", partOfSpeech: "noun" },
  { word: "science", lazy: "syens", definition: "The intellectual and practical activity encompassing the systematic study of the physical and natural world.", pronunciation: "SY-ens", partOfSpeech: "noun" },
  { word: "psychology", lazy: "sykoloji", definition: "The scientific study of the human mind and its functions.", pronunciation: "sy-KOL-o-jee", partOfSpeech: "noun" },
  { word: "beautiful", lazy: "byootiful", definition: "Pleasing the senses or mind aesthetically.", pronunciation: "BYOO-ti-ful", partOfSpeech: "adjective" },
  { word: "friend", lazy: "frend", definition: "A person whom one knows and with whom one has a bond of mutual affection.", pronunciation: "FREND", partOfSpeech: "noun" },
  { word: "island", lazy: "yland", definition: "A piece of land surrounded by water.", pronunciation: "EYE-land", partOfSpeech: "noun" },
  { word: "wednesday", lazy: "wenzdey", definition: "The day of the week before Thursday and following Tuesday.", pronunciation: "WENZ-day", partOfSpeech: "noun" },
  { word: "knowledge", lazy: "nolij", definition: "Facts, information, and skills acquired by a person through experience or education.", pronunciation: "NOL-ij", partOfSpeech: "noun" },

  // ph → f
  { word: "phrase", lazy: "frayz", definition: "A small group of words standing together as a conceptual unit.", pronunciation: "FRAYZ", partOfSpeech: "noun" },
  { word: "physical", lazy: "fizikal", definition: "Relating to the body as opposed to the mind.", pronunciation: "FIZ-i-kul", partOfSpeech: "adjective" },
  { word: "pharmacy", lazy: "farmasi", definition: "A shop where medicinal drugs are dispensed and sold.", pronunciation: "FAR-ma-see", partOfSpeech: "noun" },
  { word: "dolphin", lazy: "dolfin", definition: "A small gregarious toothed whale that is often playful.", pronunciation: "DOL-fin", partOfSpeech: "noun" },
  { word: "alphabet", lazy: "alfabet", definition: "A set of letters used to write a language.", pronunciation: "AL-fa-bet", partOfSpeech: "noun" },
  { word: "trophy", lazy: "trofi", definition: "A cup or other decorative object awarded as a prize.", pronunciation: "TROH-fee", partOfSpeech: "noun" },
  { word: "graph", lazy: "graf", definition: "A diagram showing the relation between variable quantities.", pronunciation: "GRAF", partOfSpeech: "noun" },
  { word: "orphan", lazy: "orfan", definition: "A child whose parents are dead.", pronunciation: "OR-fan", partOfSpeech: "noun" },

  // ck → k
  { word: "black", lazy: "blak", definition: "The darkest color, the result of the absence of light.", pronunciation: "BLAK", partOfSpeech: "adjective" },
  { word: "track", lazy: "trak", definition: "A rough path or road.", pronunciation: "TRAK", partOfSpeech: "noun" },
  { word: "click", lazy: "klik", definition: "A short, sharp sound.", pronunciation: "KLIK", partOfSpeech: "noun" },
  { word: "thick", lazy: "thik", definition: "With opposite sides or surfaces that are far apart.", pronunciation: "THIK", partOfSpeech: "adjective" },
  { word: "knock", lazy: "nok", definition: "Strike a surface noisily to attract attention.", pronunciation: "NOK", partOfSpeech: "verb" },
  { word: "stick", lazy: "stik", definition: "A thin piece of wood that has fallen or been cut from a tree.", pronunciation: "STIK", partOfSpeech: "noun" },
  { word: "truck", lazy: "truk", definition: "A large, heavy motor vehicle for transporting goods.", pronunciation: "TRUK", partOfSpeech: "noun" },

  // soft c → s
  { word: "circle", lazy: "sirkul", definition: "A round plane figure whose boundary consists of points equidistant from the center.", pronunciation: "SIR-kul", partOfSpeech: "noun" },
  { word: "ceiling", lazy: "seeling", definition: "The upper interior surface of a room.", pronunciation: "SEE-ling", partOfSpeech: "noun" },
  { word: "certain", lazy: "sertin", definition: "Known for sure; established beyond doubt.", pronunciation: "SER-tin", partOfSpeech: "adjective" },
  { word: "century", lazy: "senchuri", definition: "A period of one hundred years.", pronunciation: "SEN-chu-ree", partOfSpeech: "noun" },
  { word: "cycle", lazy: "sykul", definition: "A series of events that are regularly repeated in the same order.", pronunciation: "SY-kul", partOfSpeech: "noun" },

  // qu → kw
  { word: "question", lazy: "kweschun", definition: "A sentence worded to find out information.", pronunciation: "KWES-chun", partOfSpeech: "noun" },
  { word: "quiet", lazy: "kwyet", definition: "Making little or no noise.", pronunciation: "KWY-et", partOfSpeech: "adjective" },
  { word: "quite", lazy: "kwyt", definition: "To the utmost or most absolute extent.", pronunciation: "KWYT", partOfSpeech: "adverb" },
  { word: "square", lazy: "skwer", definition: "A plane figure with four equal straight sides and four right angles.", pronunciation: "SKWER", partOfSpeech: "noun" },
  { word: "squeeze", lazy: "skweez", definition: "Firmly press from opposite sides.", pronunciation: "SKWEEZ", partOfSpeech: "verb" },

  // silent letters
  { word: "thumb", lazy: "thum", definition: "The short, thick first digit of the human hand.", pronunciation: "THUM", partOfSpeech: "noun" },
  { word: "comb", lazy: "kom", definition: "A strip of plastic or metal with teeth used for untangling hair.", pronunciation: "KOHM", partOfSpeech: "noun" },
  { word: "lamb", lazy: "lam", definition: "A young sheep.", pronunciation: "LAM", partOfSpeech: "noun" },
  { word: "wrap", lazy: "rap", definition: "Cover or enclose in paper or soft material.", pronunciation: "RAP", partOfSpeech: "verb" },
  { word: "wrist", lazy: "rist", definition: "The joint connecting the hand with the forearm.", pronunciation: "RIST", partOfSpeech: "noun" },
  { word: "sword", lazy: "sord", definition: "A weapon with a long metal blade and a hilt with a hand guard.", pronunciation: "SORD", partOfSpeech: "noun" },
  { word: "castle", lazy: "kasel", definition: "A large medieval building, typically of the medieval period.", pronunciation: "KA-sel", partOfSpeech: "noun" },
  { word: "listen", lazy: "lisen", definition: "Give one's attention to a sound.", pronunciation: "LI-sen", partOfSpeech: "verb" },
  { word: "fasten", lazy: "fasen", definition: "Close or join securely.", pronunciation: "FA-sen", partOfSpeech: "verb" },

  // double letters simplified
  { word: "butter", lazy: "buter", definition: "A pale yellow edible fatty substance made from cream.", pronunciation: "BU-ter", partOfSpeech: "noun" },
  { word: "letter", lazy: "leter", definition: "A written, typed, or printed message.", pronunciation: "LE-ter", partOfSpeech: "noun" },
  { word: "dinner", lazy: "diner", definition: "The main meal of the day.", pronunciation: "DI-ner", partOfSpeech: "noun" },
  { word: "summer", lazy: "sumer", definition: "The warmest season of the year.", pronunciation: "SU-mer", partOfSpeech: "noun" },
  { word: "happy", lazy: "hapi", definition: "Feeling or showing pleasure or contentment.", pronunciation: "HA-pee", partOfSpeech: "adjective" },
  { word: "little", lazy: "litul", definition: "Small in size, amount, or degree.", pronunciation: "LI-tul", partOfSpeech: "adjective" },

  // tion → shun
  { word: "nation", lazy: "nayshun", definition: "A large body of people united by common descent, history, or language.", pronunciation: "NAY-shun", partOfSpeech: "noun" },
  { word: "station", lazy: "stayshun", definition: "A place where trains regularly stop.", pronunciation: "STAY-shun", partOfSpeech: "noun" },
  { word: "action", lazy: "akshun", definition: "The fact or process of doing something.", pronunciation: "AK-shun", partOfSpeech: "noun" },
  { word: "mention", lazy: "menshun", definition: "Refer to something briefly and without going into detail.", pronunciation: "MEN-shun", partOfSpeech: "verb" },
  { word: "fraction", lazy: "frakshun", definition: "A numerical quantity that is not a whole number.", pronunciation: "FRAK-shun", partOfSpeech: "noun" },
  { word: "direction", lazy: "direkshun", definition: "A course along which someone or something moves.", pronunciation: "di-REK-shun", partOfSpeech: "noun" },

  // wh → w
  { word: "wheel", lazy: "weel", definition: "A circular object that revolves on an axle.", pronunciation: "WEEL", partOfSpeech: "noun" },
  { word: "whale", lazy: "wayl", definition: "A very large marine mammal.", pronunciation: "WAYL", partOfSpeech: "noun" },
  { word: "wheat", lazy: "weet", definition: "A cereal plant that is the most important grain used for food.", pronunciation: "WEET", partOfSpeech: "noun" },
  { word: "while", lazy: "wyl", definition: "During the time that; at the same time as.", pronunciation: "WYL", partOfSpeech: "conjunction" },
  { word: "whisper", lazy: "wisper", definition: "Speak very softly using one's breath.", pronunciation: "WIS-per", partOfSpeech: "verb" },

  // wr → r
  { word: "written", lazy: "riten", definition: "Having been set down in writing.", pronunciation: "RI-ten", partOfSpeech: "adjective" },
  { word: "wreck", lazy: "rek", definition: "The destruction of a ship at sea; a shipwreck.", pronunciation: "REK", partOfSpeech: "noun" },
  { word: "wrestle", lazy: "resel", definition: "Take part in a fight that involves grappling with one's opponent.", pronunciation: "RE-sel", partOfSpeech: "verb" },

  // kn → n
  { word: "kneel", lazy: "neel", definition: "Be in or assume a position in which the body is supported by a knee.", pronunciation: "NEEL", partOfSpeech: "verb" },
  { word: "knit", lazy: "nit", definition: "Make fabric by interlocking loops of wool or other yarn.", pronunciation: "NIT", partOfSpeech: "verb" },
  { word: "knob", lazy: "nob", definition: "A rounded lump or ball forming the handle of a door.", pronunciation: "NOB", partOfSpeech: "noun" },

  // gh silent / gh → f
  { word: "fight", lazy: "fyt", definition: "Take part in a violent struggle involving physical force.", pronunciation: "FYT", partOfSpeech: "verb" },
  { word: "bright", lazy: "bryt", definition: "Giving out or reflecting a lot of light.", pronunciation: "BRYT", partOfSpeech: "adjective" },
  { word: "daughter", lazy: "dawter", definition: "A girl or woman in relation to her parents.", pronunciation: "DAW-ter", partOfSpeech: "noun" },
  { word: "rough", lazy: "ruf", definition: "Having an uneven or irregular surface.", pronunciation: "RUF", partOfSpeech: "adjective" },
  { word: "cough", lazy: "kof", definition: "Expel air from the lungs with a sudden sharp sound.", pronunciation: "KOF", partOfSpeech: "verb" },
  { word: "tough", lazy: "tuf", definition: "Strong enough to withstand adverse conditions.", pronunciation: "TUF", partOfSpeech: "adjective" },

  // misc common words
  { word: "journey", lazy: "jurni", definition: "An act of travelling from one place to another.", pronunciation: "JUR-nee", partOfSpeech: "noun" },
  { word: "measure", lazy: "mezher", definition: "Ascertain the size, amount, or degree of something.", pronunciation: "MEZ-her", partOfSpeech: "verb" },
  { word: "treasure", lazy: "trezher", definition: "A quantity of precious metals, gems, or other valuable objects.", pronunciation: "TREZ-her", partOfSpeech: "noun" },
  { word: "pleasure", lazy: "plezher", definition: "A feeling of happy satisfaction and enjoyment.", pronunciation: "PLEZ-her", partOfSpeech: "noun" },
  { word: "language", lazy: "langwij", definition: "The method of human communication using words.", pronunciation: "LANG-wij", partOfSpeech: "noun" },
  { word: "answer", lazy: "anser", definition: "A thing said, written, or done in response to a question.", pronunciation: "AN-ser", partOfSpeech: "noun" },
  { word: "doubt", lazy: "dowt", definition: "A feeling of uncertainty or lack of conviction.", pronunciation: "DOWT", partOfSpeech: "noun" },
  { word: "debt", lazy: "det", definition: "A sum of money that is owed or due.", pronunciation: "DET", partOfSpeech: "noun" },
  { word: "receipt", lazy: "reseet", definition: "A written acknowledgment that something has been received.", pronunciation: "re-SEET", partOfSpeech: "noun" },

  // SH sound words
  { word: "shadow", lazy: "shado", definition: "A dark shape cast when an object blocks light.", pronunciation: "SHA-doh", partOfSpeech: "noun" },
  { word: "shell", lazy: "shel", definition: "The hard outer covering of a creature or nut.", pronunciation: "SHEL", partOfSpeech: "noun" },
  { word: "shine", lazy: "shyn", definition: "To emit or reflect a bright light.", pronunciation: "SHYN", partOfSpeech: "verb" },
  { word: "shore", lazy: "shor", definition: "The land along the edge of a sea or lake.", pronunciation: "SHOR", partOfSpeech: "noun" },
  { word: "shout", lazy: "showt", definition: "To call out in a loud voice.", pronunciation: "SHOWT", partOfSpeech: "verb" },
  { word: "sharp", lazy: "sharp", definition: "Having a fine edge or point capable of cutting.", pronunciation: "SHARP", partOfSpeech: "adjective" },
  { word: "shape", lazy: "shayp", definition: "The external form or appearance of something.", pronunciation: "SHAYP", partOfSpeech: "noun" },
  { word: "flash", lazy: "flash", definition: "A sudden brief burst of light.", pronunciation: "FLASH", partOfSpeech: "noun" },
  { word: "brush", lazy: "brush", definition: "A tool with bristles used for cleaning or painting.", pronunciation: "BRUSH", partOfSpeech: "noun" },
  { word: "fresh", lazy: "fresh", definition: "Recently made or obtained; not stale.", pronunciation: "FRESH", partOfSpeech: "adjective" },
  { word: "crash", lazy: "krash", definition: "A sudden loud noise or violent collision.", pronunciation: "KRASH", partOfSpeech: "verb" },
  { word: "wish", lazy: "wish", definition: "A desire or hope for something to happen.", pronunciation: "WISH", partOfSpeech: "noun" },
  { word: "flesh", lazy: "flesh", definition: "The soft tissue of the body.", pronunciation: "FLESH", partOfSpeech: "noun" },
  { word: "splash", lazy: "splash", definition: "To strike a liquid so that it scatters.", pronunciation: "SPLASH", partOfSpeech: "verb" },

  // CH sound words
  { word: "chain", lazy: "chayn", definition: "A series of connected metal links.", pronunciation: "CHAYN", partOfSpeech: "noun" },
  { word: "chalk", lazy: "chok", definition: "A soft white rock used for writing on blackboards.", pronunciation: "CHOK", partOfSpeech: "noun" },
  { word: "charm", lazy: "charm", definition: "The power to please or attract others.", pronunciation: "CHARM", partOfSpeech: "noun" },
  { word: "chest", lazy: "chest", definition: "The front part of the body below the neck.", pronunciation: "CHEST", partOfSpeech: "noun" },
  { word: "child", lazy: "chyld", definition: "A young human being.", pronunciation: "CHYLD", partOfSpeech: "noun" },
  { word: "chin", lazy: "chin", definition: "The bottom part of the face below the mouth.", pronunciation: "CHIN", partOfSpeech: "noun" },
  { word: "choose", lazy: "chooz", definition: "To pick out one from a number of alternatives.", pronunciation: "CHOOZ", partOfSpeech: "verb" },
  { word: "church", lazy: "cherch", definition: "A building used for Christian worship.", pronunciation: "CHERCH", partOfSpeech: "noun" },
  { word: "chicken", lazy: "chiken", definition: "A domestic bird kept for its eggs and meat.", pronunciation: "CHIK-en", partOfSpeech: "noun" },
  { word: "chocolate", lazy: "choklut", definition: "A sweet food made from roasted cocoa beans.", pronunciation: "CHOK-lut", partOfSpeech: "noun" },
  { word: "beach", lazy: "beech", definition: "A sandy or pebbly area next to the sea.", pronunciation: "BEECH", partOfSpeech: "noun" },
  { word: "coach", lazy: "coch", definition: "A person who trains athletes or teams.", pronunciation: "COCH", partOfSpeech: "noun" },
  { word: "lunch", lazy: "lunch", definition: "A meal eaten in the middle of the day.", pronunciation: "LUNCH", partOfSpeech: "noun" },
  { word: "teach", lazy: "teech", definition: "To impart knowledge or skills to someone.", pronunciation: "TEECH", partOfSpeech: "verb" },
  { word: "touch", lazy: "tuch", definition: "To bring one's hand into contact with something.", pronunciation: "TUCH", partOfSpeech: "verb" },
  { word: "match", lazy: "mach", definition: "A contest between two opposing sides.", pronunciation: "MACH", partOfSpeech: "noun" },
  { word: "catch", lazy: "kach", definition: "To intercept and hold something moving through the air.", pronunciation: "KACH", partOfSpeech: "verb" },
  { word: "speech", lazy: "speech", definition: "The expression of thoughts and feelings in spoken words.", pronunciation: "SPEECH", partOfSpeech: "noun" },

  // NG sound words
  { word: "king", lazy: "king", definition: "A male ruler of a country.", pronunciation: "KING", partOfSpeech: "noun" },
  { word: "ring", lazy: "ring", definition: "A circular band worn on a finger.", pronunciation: "RING", partOfSpeech: "noun" },
  { word: "sing", lazy: "sing", definition: "To make musical sounds with the voice.", pronunciation: "SING", partOfSpeech: "verb" },
  { word: "song", lazy: "song", definition: "A short piece of music with words.", pronunciation: "SONG", partOfSpeech: "noun" },
  { word: "long", lazy: "long", definition: "Of great length; not short.", pronunciation: "LONG", partOfSpeech: "adjective" },
  { word: "strong", lazy: "strong", definition: "Having great physical power or force.", pronunciation: "STRONG", partOfSpeech: "adjective" },
  { word: "spring", lazy: "spring", definition: "The season between winter and summer.", pronunciation: "SPRING", partOfSpeech: "noun" },
  { word: "bring", lazy: "bring", definition: "To carry or take something to a place.", pronunciation: "BRING", partOfSpeech: "verb" },
  { word: "thing", lazy: "thing", definition: "An object or item.", pronunciation: "THING", partOfSpeech: "noun" },
  { word: "young", lazy: "yung", definition: "Being in an early period of life.", pronunciation: "YUNG", partOfSpeech: "adjective" },
  { word: "hang", lazy: "hang", definition: "To suspend something from above.", pronunciation: "HANG", partOfSpeech: "verb" },
  { word: "wing", lazy: "wing", definition: "A limb used by birds and insects for flying.", pronunciation: "WING", partOfSpeech: "noun" },
  { word: "among", lazy: "amung", definition: "Surrounded by; in the middle of.", pronunciation: "A-mung", partOfSpeech: "preposition" },
  { word: "string", lazy: "string", definition: "A thin cord used to tie or fasten things.", pronunciation: "STRING", partOfSpeech: "noun" },

  // ZH sound words (the soft g/si sound as in vision)
  { word: "vision", lazy: "vizhon", definition: "The ability to see; a mental image of the future.", pronunciation: "VIZh-on", partOfSpeech: "noun" },
  { word: "decision", lazy: "desizhon", definition: "A conclusion reached after consideration.", pronunciation: "de-SIZh-on", partOfSpeech: "noun" },
  { word: "television", lazy: "televizhon", definition: "A device that receives and displays broadcast images and sound.", pronunciation: "TEL-e-vizh-on", partOfSpeech: "noun" },
  { word: "occasion", lazy: "okazhon", definition: "A particular event, time, or celebration.", pronunciation: "o-KAY-zhon", partOfSpeech: "noun" },
  { word: "conclusion", lazy: "konkloozhon", definition: "A judgment or decision reached by reasoning.", pronunciation: "kon-KLOO-zhon", partOfSpeech: "noun" },

  // more common everyday words
  { word: "apple", lazy: "apul", definition: "A round sweet fruit with a red or green skin.", pronunciation: "AP-ul", partOfSpeech: "noun" },
  { word: "bread", lazy: "bred", definition: "A food made from flour, water, and yeast, baked in an oven.", pronunciation: "BRED", partOfSpeech: "noun" },
  { word: "cloud", lazy: "klowd", definition: "A visible mass of water vapor floating in the sky.", pronunciation: "KLOWD", partOfSpeech: "noun" },
  { word: "door", lazy: "dor", definition: "A movable barrier used to open or close an entrance.", pronunciation: "DOR", partOfSpeech: "noun" },
  { word: "dream", lazy: "dreem", definition: "A series of images and feelings experienced during sleep.", pronunciation: "DREEM", partOfSpeech: "noun" },
  { word: "earth", lazy: "erth", definition: "The planet we live on; the ground or soil.", pronunciation: "ERTH", partOfSpeech: "noun" },
  { word: "flower", lazy: "flowur", definition: "The colorful part of a plant that produces seeds.", pronunciation: "FLOW-ur", partOfSpeech: "noun" },
  { word: "heart", lazy: "hart", definition: "The organ that pumps blood around the body.", pronunciation: "HART", partOfSpeech: "noun" },
  { word: "house", lazy: "hows", definition: "A building in which people live.", pronunciation: "HOWS", partOfSpeech: "noun" },
  { word: "money", lazy: "muni", definition: "Coins and banknotes used to buy things.", pronunciation: "MUN-ee", partOfSpeech: "noun" },
  { word: "mountain", lazy: "mowntin", definition: "A large natural rise of the earth's surface.", pronunciation: "MOWN-tin", partOfSpeech: "noun" },
  { word: "music", lazy: "myoozik", definition: "Sounds arranged in a pleasing or expressive way.", pronunciation: "MYOO-zik", partOfSpeech: "noun" },
  { word: "ocean", lazy: "oshun", definition: "A vast expanse of salt water covering most of the earth.", pronunciation: "OH-shun", partOfSpeech: "noun" },
  { word: "river", lazy: "rivur", definition: "A large natural stream of water flowing to the sea.", pronunciation: "RIV-ur", partOfSpeech: "noun" },
  { word: "sleep", lazy: "sleep", definition: "A natural periodic state of rest for the mind and body.", pronunciation: "SLEEP", partOfSpeech: "verb" },
  { word: "smile", lazy: "smyl", definition: "A pleased or kind facial expression.", pronunciation: "SMYL", partOfSpeech: "verb" },
  { word: "snow", lazy: "sno", definition: "Frozen water that falls from clouds as white flakes.", pronunciation: "SNO", partOfSpeech: "noun" },
  { word: "star", lazy: "star", definition: "A large ball of burning gas in outer space.", pronunciation: "STAR", partOfSpeech: "noun" },
  { word: "story", lazy: "stori", definition: "A description of imaginary or real events.", pronunciation: "STOR-ee", partOfSpeech: "noun" },
  { word: "tree", lazy: "tree", definition: "A tall plant with a wooden trunk and branches.", pronunciation: "TREE", partOfSpeech: "noun" },
  { word: "voice", lazy: "voys", definition: "The sound produced when a person speaks or sings.", pronunciation: "VOYS", partOfSpeech: "noun" },
  { word: "world", lazy: "werld", definition: "The earth together with all of its people and things.", pronunciation: "WERLD", partOfSpeech: "noun" },
  { word: "name", lazy: "naym", definition: "A word by which a person, place, or thing is known.", pronunciation: "NAYM", partOfSpeech: "noun" },
  { word: "telephone", lazy: "telefon", definition: "A device used to speak to someone in another place.", pronunciation: "TEL-e-fon", partOfSpeech: "noun" },
  { word: "photograph", lazy: "fotograf", definition: "An image produced by a camera.", pronunciation: "FOH-toh-graf", partOfSpeech: "noun" },
];

export function lookupWord(query: string): DictionaryEntry | null {
  const q = query.toLowerCase().trim();
  return dictionary.find(entry => entry.word === q) || null;
}

