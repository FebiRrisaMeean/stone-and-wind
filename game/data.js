export const VERSION = 1;
export const FACTIONS = [
  { id: 0, name: 'Каменная стража', short: 'Стража', color: '#597bdd', accent: '#d4b679', hero: 'Кастелян', unique: 'Каменотёсная палата', description: 'Стойкая пехота · крепкие стены · мастерство камня', mark: '◆' },
  { id: 1, name: 'Пограничная вольница', short: 'Вольница', color: '#54a88c', accent: '#f0bb71', hero: 'Следопыт', unique: 'Лесничество', description: 'Разведка · манёвр · щедрость леса', mark: '✦' }
];
export const TROOPS = {
  guard: { name: 'Щитовая стража', short: 'Стража', role: 'Защитники', icon: '▰', hp: 14, power: 7, speed: 2.8, vision: 4.8, range: 1.15, size: 5, cost: [32,8,0], building: 'barracks', tier: 1, description: 'Держит позицию и прикрывает соседние отряды' },
  sword: { name: 'Двуручники', short: 'Двуручники', role: 'Ударные войска', icon: '⚔', hp: 11, power: 12, speed: 2.6, vision: 4.3, range: 1.15, size: 4, cost: [42,0,8], building: 'barracks', tier: 2, description: 'Сильный удар ценой невысокой скорости' },
  bow: { name: 'Лучники', short: 'Лучники', role: 'Стрелки', icon: '⌁', hp: 8, power: 9, speed: 3.3, vision: 5.3, range: 2.8, size: 4, cost: [28,12,0], building: 'range', tier: 1, description: 'Атакуют с расстояния, но уязвимы без прикрытия' },
  horse: { name: 'Лёгкая конница', short: 'Конница', role: 'Мобильные', icon: '♞', hp: 12, power: 9, speed: 4.8, vision: 6, range: 1.2, size: 3, cost: [38,8,0], building: 'stable', tier: 2, description: 'Быстрые обходы и разведка неизвестных земель' },
  drum: { name: 'Барабанщики', short: 'Барабанщики', role: 'Усиление', icon: '◉', hp: 9, power: 4, speed: 3, vision: 4.5, range: 1.1, size: 3, cost: [24,12,0], building: 'hall', tier: 2, description: 'Повышают атаку союзников поблизости' },
  hero: { name: 'Особый персонаж', short: 'Персонаж', role: 'Персонаж', icon: '♜', hp: 35, power: 20, speed: 3.5, vision: 5.5, range: 1.2, size: 1, cost: [60,10,10], building: 'castle', tier: 2, description: 'Кастелян усиливает защиту, Следопыт — обзор' }
};
export const BUILDINGS = {
  house: { name: 'Дом', icon: '⌂', cost: [12,16,4], tier: 1, description: '+8 мест для рабочих и бойцов', terrain: ['plain','road','meadow'] },
  barracks: { name: 'Казармы', icon: '⚔', cost: [20,20,8], tier: 1, description: 'Щитовая стража · со II уровня — двуручники', terrain: ['plain','road','meadow'] },
  range: { name: 'Стрельбище', icon: '⌁', cost: [18,24,0], tier: 1, description: 'Открывает найм лучников', terrain: ['plain','meadow','forest'] },
  stable: { name: 'Конюшня', icon: '♞', cost: [30,28,8], tier: 2, description: 'Открывает лёгкую конницу', terrain: ['plain','meadow'] },
  hall: { name: 'Дом дружины', icon: '◉', cost: [25,20,12], tier: 2, description: 'Открывает барабанщиков', terrain: ['plain','road','meadow'] },
  forge: { name: 'Кузница', icon: '⚒', cost: [28,18,20], tier: 2, description: 'Улучшения всех отрядов выбранного типа', terrain: ['plain','rock','road'] },
  temple: { name: 'Святилище', icon: '✦', cost: [20,12,20], tier: 1, description: 'Вложения золота в веру и случайные дары', terrain: ['plain','rock','meadow'] },
  unique: { name: 'Особая постройка', icon: '◆', cost: [28,22,18], tier: 2, description: 'Стража экономит камень · Вольница добывает больше дерева', terrain: ['plain','rock','forest','meadow'] }
};
export const PRESETS = {
  balanced: { name: 'Равновесие', text: 'Стража · лучники · конница', units: ['guard','bow','horse'] },
  shield: { name: 'Стойкость', text: 'Два отряда стражи · лучники', units: ['guard','guard','bow'] },
  scout: { name: 'Манёвр', text: 'Два отряда конницы · лучники', units: ['horse','horse','bow'] }
};
export const GIFTS = [
  { id:'oaks', name:'Сила дуба', text:'+1 дерево с каждого работающего жителя', stat:'wood', value:1, icon:'♣' },
  { id:'coin', name:'Щедрость', text:'+1 золото с каждого работающего жителя', stat:'gold', value:1, icon:'◈' },
  { id:'stone', name:'Тихий труд', text:'+1 камень с каждого работающего жителя', stat:'stone', value:1, icon:'◆' },
  { id:'march', name:'Попутный ветер', text:'+10% к дальности перемещения отрядов', stat:'speed', value:0.1, icon:'➶' },
  { id:'steel', name:'Крепкая рука', text:'+8% к силе войск', stat:'attack', value:0.08, icon:'⚔' },
  { id:'warmth', name:'Слабая искра', text:'Одна монета в конце раунда', stat:'flatGold', value:1, icon:'·' },
  { id:'glory', name:'Великий обет', text:'+30% к силе войск', stat:'attack', value:0.3, icon:'✺' }
];
export const FAITH_LEVELS = [30,70,125,200];
export const RESOURCES = [ {key:'gold',name:'Золото',icon:'◈',color:'#d5ad53'}, {key:'wood',name:'Дерево',icon:'♣',color:'#69a481'}, {key:'stone',name:'Камень',icon:'◆',color:'#a9a8b4'} ];
export const WORLD = { width:23, height:17, center:{x:11,z:8}, bases:[{x:3,z:9},{x:19,z:7}], hold:3, support:2.8 };
export const DEFAULT_ASSUMPTIONS = [
  'Начальный запас — 4 действия, каждый уровень замка добавляет одно',
  'Победа — 3 полных раунда непрерывного удержания',
  'Бой рассчитывается без случайного броска, преимущества ролей умеренные',
  'Выжившие отступают, здоровье погибших бойцов не восстанавливается',
  'Поддержка соседей не расходует их атаку, но участники несут потери',
  'Доход начисляется за работников, проработавших полный раунд',
  'Особые персонажи и постройки имеют первые проверочные значения'
];
