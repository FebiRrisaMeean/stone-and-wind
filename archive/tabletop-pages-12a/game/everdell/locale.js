// Russian names follow the supplied Hobby World base-game rulebook
// Forest and event captions absent from that rulebook are descriptive translations
export const SEASONS={Winter:'Зима',Spring:'Весна',Summer:'Лето',Autumn:'Осень'};
export const CARD_TYPES={TRAVELER:'Странствия',PRODUCTION:'Урожай',DESTINATION:'Локация',GOVERNANCE:'Управление',PROSPERITY:'Процветание'};
export const RESOURCE_NAMES={TWIG:'Ветки',RESIN:'Смола',PEBBLE:'Камушки',BERRY:'Ягоды',VP:'Очки',CARD:'Карты',ANY:'Любой ресурс',PEARL:'Жемчуг'};
export const CARD_NAMES={
 Architect:'Архитектор',Bard:'Бард','Barge Toad':'Веточник',Castle:'Замок',Cemetary:'Кладбище',Chapel:'Часовня','Chip Sweep':'Дворник','Clock Tower':'Башня',Courthouse:'Суд',Crane:'Кран',Doctor:'Лекарь',Dungeon:'Темница',Evertree:'Вечное древо',Fairgrounds:'Ярмарка',Farm:'Ферма',Fool:'Шут','General Store':'Лавка',Historian:'Историк',Husband:'Муж',Inn:'Трактир',Innkeeper:'Трактирщик',Judge:'Судья',King:'Король',Lookout:'Вышка',Mine:'Шахта','Miner Mole':'Землекоп',Monastery:'Монастырь',Monk:'Монах',Palace:'Дворец',Peddler:'Барахольщик','Post Office':'Почта','Postal Pigeon':'Почтальон',Queen:'Королева',Ranger:'Следопыт','Resin Refinery':'Смоловарня',Ruins:'Развалины',School:'Школа',Shepherd:'Пастырь',Shopkeeper:'Лавочник',Storehouse:'Склад',Teacher:'Учитель',Theatre:'Театр','Twig Barge':'Ветковозка',Undertaker:'Гробовщик',University:'Университет',Wanderer:'Странник',Wife:'Жена',Woodcarver:'Резчик'
};
export const CARD_TEXT={
 Architect:'В конце игры: +1 очко за каждую оставшуюся у вас смолу и камушек, максимум 6 очков',
 Bard:'При розыгрыше можно сбросить до 5 карт с руки и получить по 1 очку за каждую',
 'Barge Toad':'При розыгрыше и сборе урожая: по 2 ветки за каждую ферму в вашем городе',
 Castle:'В конце игры: +1 очко за каждое обычное сооружение в вашем городе',
 Cemetary:'Работник остаётся навсегда: раскройте 4 карты из колоды или сброса, бесплатно сыграйте одну, остальные сбросьте. Гробовщик открывает второе место',
 Chapel:'Поставьте работника: добавьте на часовню 1 очко и возьмите по 2 карты за каждое очко на ней',
 'Chip Sweep':'При розыгрыше и сборе урожая: повторите эффект другой карты урожая в своём городе',
 'Clock Tower':'При розыгрыше положите сюда 3 очка. Перед новым сезоном можно потратить 1 из них и повторить основную или лесную локацию с вашим работником. Остаток очков считается в конце',
 Courthouse:'После розыгрыша другого сооружения получите на выбор ветку, смолу или камушек',
 Crane:'При постройке сооружения можно сбросить кран, чтобы заплатить на 3 любых ресурса меньше. С другими скидками не складывается',
 Doctor:'При розыгрыше и сборе урожая можно обменять до 3 ягод на столько же очков',
 Dungeon:'При розыгрыше карты можно заключить существо из своего города в темницу ради скидки в 3 любых ресурса. Следопыт открывает второе место, но не может занять его сам. Скидки не складываются',
 Evertree:'В конце игры: +1 очко за каждую карту процветания в городе, включая древо. Через свободную дверь можно бесплатно сыграть любое существо',
 Fairgrounds:'При розыгрыше и сборе урожая: возьмите 2 карты',
 Farm:'При розыгрыше и сборе урожая: получите 1 ягоду',
 Fool:'Разыгрывается в свободной ячейке города соперника и приносит ему −2 очка',
 'General Store':'При розыгрыше и сборе урожая: получите 1 ягоду, либо 2 ягоды, если у вас есть хотя бы одна ферма',
 Historian:'После розыгрыша другой карты существа или сооружения возьмите 1 карту',
 Husband:'Можно поселить в одной ячейке с женой при розыгрыше. Если муж в паре и в городе есть ферма, при розыгрыше и сборе урожая получите 1 любой ресурс',
 Inn:'Поставьте работника: сыграйте карту с поляны со скидкой в 3 любых ресурса. Можно посещать чужой трактир — владелец получает 1 очко. Скидки не складываются',
 Innkeeper:'При розыгрыше существа можно сбросить трактирщика и заплатить на 3 ягоды меньше. С другими скидками не складывается',
 Judge:'При оплате карты можно заменить 1 требуемый ресурс любым другим ресурсом. С другими скидками не складывается',
 King:'В конце игры: +1 очко за каждое ваше основное событие и +2 за каждое особое',
 Lookout:'Поставьте работника: повторите эффект любой основной или лесной локации, даже занятой',
 Mine:'При розыгрыше и сборе урожая: получите 1 камушек',
 'Miner Mole':'При розыгрыше и сборе урожая: повторите эффект карты урожая соперника с учётом условий в его городе. Нельзя забрать ресурсы с чужого склада',
 Monastery:'Работник остаётся навсегда: отдайте сопернику 2 любых ресурса и получите 4 очка. Монах открывает второе место',
 Monk:'При розыгрыше и сборе урожая можно отдать сопернику до 2 ягод и получить по 2 очка за каждую. Открывает второе место в монастыре',
 Palace:'В конце игры: +1 очко за каждое уникальное сооружение в вашем городе, включая дворец',
 Peddler:'При розыгрыше и сборе урожая можно обменять до 2 любых ресурсов на столько же ресурсов по своему выбору',
 'Post Office':'Поставьте работника: отдайте сопернику 2 карты с руки, сбросьте любое число оставшихся и доберите руку до 8 карт. За посещение чужой почты её владелец получает 1 очко',
 'Postal Pigeon':'При розыгрыше раскройте 2 карты. Можно бесплатно сыграть одну ценностью не более 3 очков, остальные сбрасываются',
 Queen:'Поставьте работника: бесплатно сыграйте карту с руки или поляны с базовой ценностью не более 3 очков',
 Ranger:'При розыгрыше переместите своего размещённого работника в другое доступное место. Открывает второе место в темнице',
 'Resin Refinery':'При розыгрыше и сборе урожая: получите 1 смолу',
 Ruins:'Замените своё сооружение развалинами, верните его напечатанную стоимость ресурсами и возьмите 2 карты. Невозвратный работник остаётся в развалинах',
 School:'В конце игры: +1 очко за каждое обычное существо в вашем городе',
 Shepherd:'Передайте потраченные на эту карту ягоды другому игроку. Получите 3 ягоды и по 1 очку за каждое очко на вашей часовне',
 Shopkeeper:'После розыгрыша другого существа получите 1 ягоду',
 Storehouse:'При розыгрыше и сборе урожая положите сюда 3 ветки, 2 смолы, 2 ягоды или 1 камушек. Поставьте работника, чтобы забрать весь запас',
 Teacher:'При розыгрыше и сборе урожая возьмите 2 карты: одну оставьте, другую отдайте сопернику. Если до предела руки помещается только одна, оставьте её себе',
 Theatre:'В конце игры: +1 очко за каждое уникальное существо в вашем городе',
 'Twig Barge':'При розыгрыше и сборе урожая: получите 2 ветки',
 Undertaker:'При розыгрыше сбросьте 3 карты с поляны, замените их и возьмите с поляны 1 карту на руку. Открывает второе место на кладбище',
 University:'Поставьте работника: сбросьте карту из своего города, верните её напечатанную стоимость, получите 1 любой ресурс и 1 очко. Невозвратный работник остаётся в университете',
 Wanderer:'При розыгрыше возьмите 3 карты. Не занимает ячейку города',
 Wife:'Можно поселить в одной ячейке с мужем при розыгрыше. В конце игры жена в паре приносит ещё 3 очка. Позднее объединять или разделять пару нельзя',
 Woodcarver:'При розыгрыше и сборе урожая можно обменять до 3 веток на столько же очков'
};
export const LOCATION_NAMES={
 ONE_BERRY:'Ягода',ONE_BERRY_AND_ONE_CARD:'Ягода и карта',ONE_RESIN_AND_ONE_CARD:'Смола и карта',ONE_STONE:'Камушек',THREE_TWIGS:'Три ветки',TWO_CARDS_AND_ONE_VP:'Карты и очко',TWO_RESIN:'Две смолы',TWO_TWIGS_AND_ONE_CARD:'Ветки и карта',HAVEN:'Убежище',JOURNEY_FIVE:'Путешествие · 5',JOURNEY_FOUR:'Путешествие · 4',JOURNEY_THREE:'Путешествие · 3',JOURNEY_TWO:'Путешествие · 2',
 TWO_BERRY_ONE_CARD:'Две ягоды и карта',TWO_WILD:'Два любых ресурса',DISCARD_ANY_THEN_DRAW_TWO_PER_CARD:'Обновление руки',COPY_BASIC_ONE_CARD:'Копирование и карта',ONE_PEBBLE_THREE_CARD:'Камушек и три карты',ONE_TWIG_RESIN_BERRY:'Ветка, смола и ягода',THREE_BERRY:'Три ягоды',TWO_RESIN_ONE_TWIG:'Две смолы и ветка',TWO_CARDS_ONE_WILD:'Две карты и ресурс',DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD:'Карты в ресурсы',DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS:'Две карты с поляны'
};
export const LOCATION_TEXT={
 ONE_BERRY:'Получите 1 ягоду',ONE_BERRY_AND_ONE_CARD:'Получите 1 ягоду и возьмите 1 карту',ONE_RESIN_AND_ONE_CARD:'Получите 1 смолу и возьмите 1 карту',ONE_STONE:'Получите 1 камушек',THREE_TWIGS:'Получите 3 ветки',TWO_CARDS_AND_ONE_VP:'Возьмите 2 карты и получите 1 очко',TWO_RESIN:'Получите 2 смолы',TWO_TWIGS_AND_ONE_CARD:'Получите 2 ветки и возьмите 1 карту',HAVEN:'Можно сбросить любое число карт с руки и получить 1 любой ресурс за каждые 2 карты',
 JOURNEY_FIVE:'Только осенью: сбросьте 5 карт с руки, чтобы получить 5 очков в конце игры',JOURNEY_FOUR:'Только осенью: сбросьте 4 карты с руки, чтобы получить 4 очка в конце игры',JOURNEY_THREE:'Только осенью: сбросьте 3 карты с руки, чтобы получить 3 очка в конце игры',JOURNEY_TWO:'Только осенью: сбросьте 2 карты с руки, чтобы получить 2 очка в конце игры',
 TWO_BERRY_ONE_CARD:'Получите 2 ягоды и возьмите 1 карту',TWO_WILD:'Получите 2 ресурса по своему выбору',DISCARD_ANY_THEN_DRAW_TWO_PER_CARD:'Сбросьте любое число карт с руки, затем возьмите по 2 карты за каждую сброшенную',COPY_BASIC_ONE_CARD:'Возьмите 1 карту и повторите эффект одной основной локации',ONE_PEBBLE_THREE_CARD:'Получите 1 камушек и возьмите 3 карты',ONE_TWIG_RESIN_BERRY:'Получите 1 ветку, 1 смолу и 1 ягоду',THREE_BERRY:'Получите 3 ягоды',TWO_RESIN_ONE_TWIG:'Получите 2 смолы и 1 ветку',TWO_CARDS_ONE_WILD:'Возьмите 2 карты и получите 1 любой ресурс',DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD:'Можно сбросить до 3 карт с руки и получить за каждую 1 любой ресурс',DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS:'Выберите 2 карты с поляны: одну возьмите на руку, вторую сыграйте со скидкой в 1 любой ресурс'
};
export const EVENT_NAMES={
 '4 PRODUCTION':'Четыре карты урожая','3 DESTINATION':'Три карты локаций','3 GOVERNANCE':'Три карты управления','3 TRAVELER':'Три карты странствий',
 'Graduation of Scholars':'Выпуск учёных','A Brilliant Marketing Plan':'Блестящий торговый план','Performer in Residence':'Приглашённый артист','Capture of the Acorn Thieves':'Поимка желудёвых воров','Ministering to Miscreants':'Служба для заключённых','Croak Wart Cure':'Лекарство от жабьих бородавок','An Evening of Fireworks':'Вечер фейерверков','A Wee Run City':'Слаженная работа города','Tax Relief':'Налоговые льготы','Under New Management':'Новый хозяин лавки','Ancient Scrolls Discovered':'Древние свитки','Flying Doctor Service':'Летучая медицинская служба','Path of the Pilgrims':'Путь паломников','Remembering the Fallen':'Памяти павших','Pristine Chapel Ceiling':'Роспись потолка часовни','The Everdell Games':'Игры Эверделла'
};
export const EVENT_TEXT={
 '4 PRODUCTION':'Иметь 4 зелёные карты урожая в городе · 3 очка','3 DESTINATION':'Иметь 3 красные карты локаций в городе · 3 очка','3 GOVERNANCE':'Иметь 3 синие карты управления в городе · 3 очка','3 TRAVELER':'Иметь 3 коричневые карты странствий в городе · 3 очка',
 'Graduation of Scholars':'Учитель + университет · Положите под событие до 3 существ с руки, каждое принесёт 2 очка',
 'A Brilliant Marketing Plan':'Лавочник + почта · Можно отдать соперникам суммарно до 3 ресурсов и получить по 2 очка за каждый',
 'Performer in Residence':'Трактир + бард · Положите на событие до 3 ягод, каждая принесёт 2 очка',
 'Capture of the Acorn Thieves':'Суд + следопыт · Переместите под событие до 2 существ из города, каждое принесёт 3 очка',
 'Ministering to Miscreants':'Монах + темница · В конце игры по 3 очка за каждого узника вашей темницы',
 'Croak Wart Cure':'Гробовщик + веточник · Заплатите 2 ягоды и сбросьте 2 карты из своего города · 6 очков',
 'An Evening of Fireworks':'Вышка + землекоп · Положите на событие до 3 веток, каждая принесёт 2 очка',
 'A Wee Run City':'Дворник + башня · Верните одного своего размещённого работника · 4 очка',
 'Tax Relief':'Судья + королева · Активируйте урожай своего города · 3 очка',
 'Under New Management':'Барахольщик + лавка · Положите сюда до 3 ресурсов: ягода или ветка принесёт 1 очко, смола или камушек — 2',
 'Ancient Scrolls Discovered':'Историк + развалины · Раскройте 5 карт: часть возьмите на руку, остальные положите под событие — по 1 очку за каждую',
 'Flying Doctor Service':'Лекарь + почтальон · В конце игры по 3 очка за каждую пару мужа и жены во всех городах',
 'Path of the Pilgrims':'Монастырь + странник · В конце игры по 3 очка за каждого работника в вашем монастыре',
 'Remembering the Fallen':'Кладбище + пастырь · В конце игры по 3 очка за каждого работника на вашем кладбище',
 'Pristine Chapel Ceiling':'Резчик + часовня · При получении возьмите по 1 карте и 1 любому ресурсу за каждое очко на часовне. В конце игры — по 2 очка за каждое очко на часовне',
 'The Everdell Games':'Иметь в городе хотя бы по 2 карты каждого из пяти типов · 9 очков'
};

const EXACT={
 Pair:'В одной ячейке',Separate:'В разных ячейках',
 'Select where to draw CARD':'Выберите, откуда раскрыть карты',Deck:'Колода','Discard Pile':'Сброс',
 'Select 1 CARD to play for free':'Выберите карту для бесплатного розыгрыша',
 'Select up to 1 CARD to play for free':'Можно выбрать одну карту для бесплатного розыгрыша',
 'Select CARD to play for free':'Выберите карту для бесплатного розыгрыша',
 'Select 1 PRODUCTION to activate':'Выберите карту урожая для активации',
 'Select TWIG / RESIN / PEBBLE':'Выберите ветку, смолу или камушек',
 'Select 1 CARD from the Meadow to play for 3 fewer ANY':'Выберите карту с поляны со скидкой в 3 любых ресурса',
 'Pay for the rest of the card (3 fewer ANY)':'Оплатите карту с учётом скидки в 3 любых ресурса',
 'Select location to copy':'Выберите локацию для повторения эффекта',
 'Select basic location to copy':'Выберите основную локацию для повторения эффекта',
 'Select 2 ANY to give to another player':'Выберите 2 ресурса для передачи сопернику',
 'Give another player up to 2 BERRY to gain 2 VP each':'Можно отдать сопернику до 2 ягод и получить по 2 очка за каждую',
 'Pay up to 2 ANY to gain an equal amount of ANY':'Обменяйте до 2 ресурсов на столько же ресурсов по выбору',
 'Select Player to give 2 CARD':'Выберите соперника, которому передадите 2 карты',
 'Select any number of CARD to discard from your hand':'Выберите любое число карт для сброса с руки',
 'Select a deployed worker to move':'Выберите размещённого работника для перемещения',
 'Select a deployed worker to bring back':'Выберите размещённого работника для возвращения',
 'Place your worker':'Выберите новое место для работника','Move your worker':'Выберите новое место для работника',
 'Select 1 Construction to discard from your city':'Выберите сооружение для сброса из своего города',
 'Select 1 CARD to discard from your city':'Выберите карту для сброса из своего города',
 'Choose resource(s) to add':'Выберите ресурсы для склада',
 'Choose one CARD to keep':'Выберите карту, которую оставите себе',
 'Select player to give the other CARD':'Выберите соперника для передачи второй карты',
 'Discard 3 CARD from the Meadow':'Выберите 3 карты для сброса с поляны',
 'Select 1 CARD from the Meadow to keep':'Выберите карту с поляны, которую возьмёте на руку',
 'Select CARD to discard':'Выберите карты для сброса',
 'Discard up to 3 CARD & gain 1 ANY for each CARD':'Сбросьте до 3 карт и получите по 1 любому ресурсу за каждую',
 'Draw 2 CARD from the Meadow':'Выберите 2 карты с поляны',
 'Select CARD to play for one less ANY':'Выберите карту для розыгрыша со скидкой в 1 ресурс',
 'Discard up to 5 CARD to gain 1 VP each':'Можно сбросить до 5 карт и получить по 1 очку за каждую',
 'You may pay 1 VP from here to activate 1 of the following locations':'Можно потратить 1 очко с башни и повторить одну из этих локаций',
 'Discard 2 CARD from your city':'Выберите 2 карты для сброса из своего города',
 'Select up to 5 CARD to keep. The rest will be placed beneath this Event (1 points each).':'Выберите до 5 карт, которые возьмёте на руку. Остальные останутся под событием и принесут по 1 очку',
 'Choose one':'Выберите вариант','Activate Production':'Активировать урожай',Skip:'Пропустить',None:'Не выбирать',
 'Confirm':'Подтвердить','Cancel':'Отмена','Continue':'Продолжить','Discard':'Сбросить',
 'Game Over!':'Партия завершена','Prepare for Season':'Подготовиться к сезону','Game End':'Завершить партию',
 'Play Card':'Разыграть карту','Place Worker':'Разместить работника','Claim Event':'Получить событие',
 'Visit Destination Card':'Посетить локацию города','Undo':'Отменить действие',
 'Cannot afford card':'Недостаточно ресурсов для карты','Not enough resources':'Недостаточно ресурсов',
 'Must select a player':'Выберите игрока','Please select a player':'Выберите игрока',
 'Please select one of the options':'Выберите один из предложенных вариантов',
 'Please selected an option':'Выберите один из предложенных вариантов',
 'Must select card to play':'Выберите карту для розыгрыша',
 'Must choose exactly 2 cards from the meadow':'Нужно выбрать ровно 2 карты с поляны',
 'Must have cards to discard':'Нужны карты для сброса','must have cards to discard':'Нужны карты для сброса',
 'Could not find selected card':'Выбранная карта недоступна',
 'Cannot afford this card, even with discount':'Для этой карты не хватает ресурсов даже со скидкой',
 'Cannot play any meadow cards even after discounts':'На поляне нет карты, которую можно сыграть даже со скидкой'
};
const WORDS={...CARD_NAMES,...LOCATION_NAMES,...EVENT_NAMES,...SEASONS,...CARD_TYPES,...RESOURCE_NAMES,Meadow:'Поляна',HAND:'Рука',MEADOW:'Поляна',FROM_DECK:'Из колоды',Critters:'Существа',Critter:'Существо',Constructions:'Сооружения',Construction:'Сооружение',BASIC:'Основная',FOREST:'Лесная',SPECIAL:'Особое',JOURNEY:'Путешествие'};
const escapeRegExp=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const wordPattern=new RegExp(`(?<![A-Za-z_])(${Object.keys(WORDS).sort((a,b)=>b.length-a.length).map(escapeRegExp).join('|')})(?![A-Za-z_])`,'g');
function flatten(value){
 if(value==null)return '';
 if(typeof value==='string'||typeof value==='number')return String(value);
 if(Array.isArray(value))return value.map(flatten).join('');
 if(value.type==='BR'||value.type==='HR')return ' · ';
 if(value.type==='text'||value.type==='em'||value.type==='i'||value.type==='iblock')return flatten(value.text);
 if(value.type==='points')return `${value.value} points`;
 if(value.type==='resource')return value.resourceType;
 if(value.type==='cardType')return value.cardType;
 if(value.type==='player')return value.name;
 if(value.type==='entity')return value.card??value.location??value.event??'';
 if(value.type==='symbol')return value.symbol==='OPEN'?'Открыто для соперников':value.symbol;
 return '';
}
export function translateText(value){
 let text=flatten(value).trim().replace(/\.+$/,'');
 if(EXACT[text])return EXACT[text];
 if(WORDS[text])return WORDS[text];
 text=text
  .replace(/^Gain (\d+) ANY$/,'Получите ресурсов на выбор: $1')
  .replace(/^Select (\d+) CARD from the Meadow$/,'Выберите карт с поляны: $1')
  .replace(/^Select (\d+) PRODUCTION to activate$/,'Выберите карт урожая для активации: $1')
  .replace(/^Select player to give (\d+) BERRY$/,'Выберите соперника для передачи ягод: $1')
  .replace(/^Select player to play /,'Выберите соперника, в чей город разыграть карту ')
  .replace(/^Select player to give /,'Выберите соперника, которому передать ')
  .replace(/^Select Player to pay /,'Выберите соперника, которому заплатить ')
  .replace(/^Select (\d+) CARD to give to /,'Выберите $1 карты для передачи игроку ')
  .replace(/^Give up to (\d+) ANY to /,'Можно передать до $1 ресурсов игроку ')
  .replace(/^Place up to (\d+) Critters from your city beneath this Event\.? \((\d+) points each\)$/,'Положите под событие до $1 существ из города — по $2 очка за каждого')
  .replace(/^Place up to (\d+) Critters from your hand beneath this Event \((\d+) points each\)$/,'Положите под событие до $1 существ с руки — по $2 очка за каждого')
  .replace(/^Place up to (\d+) (TWIG|BERRY) here \((\d+) points each\)$/,'Положите на событие до $1 $2 — по $3 очка за каждый ресурс')
  .replace(/^You may select a player to give resources to \((\d+) points each\)$/,'Можно выбрать соперника для передачи ресурсов — по $1 очка за каждый')
  .replace(/^Place up to 3 ANY here \(1 points per BERRY \/ TWIG & 2 points per RESIN \/ PEBBLE\)$/,'Положите до 3 ресурсов: ягода или ветка — 1 очко, смола или камушек — 2 очка')
  .replace(/^Need at least (\d+) (\w+) cards to claim event$/,'Для события нужны карты типа $2: $1')
  .replace(/^Need to have played (.+) to claim event.*$/,'Для события нужна карта: $1')
  .replace(/^Cannot visit the Journey in (.+)$/,'Путешествие доступно только осенью — сейчас $1')
  .replace(/^Location (.+?) is (?:fully )?occupied[\s\S]*$/,'Место занято: $1')
  .replace(/^Please select (\d+) cards$/,'Выберите карт: $1')
  .replace(/\b(\d+) points\b/g,'$1 очков');
 return text.replace(wordPattern,key=>WORDS[key]).replace(/\.+$/,'');
}
