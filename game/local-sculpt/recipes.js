// Observed identity comes from each card; species labels with uncertainty are in the inventory
export const LOCAL_CHARACTER_RECIPES = Object.freeze({
  Architect: {id:'01', family:'beaver', fur:'#59452e', light:'#b99f73', cloth:'#71556c', prop:'plan', hat:'beret', mood:'thoughtful'},
  Bard: {id:'03', family:'songbird', fur:'#c28e34', light:'#e7cb81', cloth:'#697b38', prop:'lute', mood:'singing'},
  'Barge Toad': {id:'05', family:'frog', fur:'#60794b', light:'#abb66f', cloth:'#5d7376', prop:'paddle', mood:'placid'},
  'Chip Sweep': {id:'07', family:'chipmunk', fur:'#8f6842', light:'#d3bf97', cloth:'#356958', prop:'broom', mood:'alert'},
  Fool: {id:'11', family:'skunk', fur:'#322c29', light:'#dfd9c8', cloth:'#8e4c42', hat:'jester', mood:'smiling'},
  Historian: {id:'13', family:'bat', fur:'#635e51', light:'#b0a38c', cloth:'#343a40', prop:'book', glasses:true, mood:'thoughtful'},
  Husband: {id:'15', family:'mouse', fur:'#b78062', light:'#d8bc94', cloth:'#456d57', prop:'pitchfork', mood:'steady'},
  Wife: {id:'16', family:'mouse', fur:'#b78159', light:'#e0bc90', cloth:'#9e795d', prop:'basket', apron:true, mood:'kind'},
  Innkeeper: {id:'19', family:'badger', fur:'#514f48', light:'#d2cfbb', cloth:'#316b68', prop:'tray', mood:'kind'},
  Judge: {id:'21', family:'turtle', fur:'#8a8d48', light:'#b4ad69', cloth:'#80583c', prop:'gavel', glasses:true, mood:'stern'},
  King: {id:'23', family:'mouse', fur:'#b7a386', light:'#e0d2b2', cloth:'#805473', hat:'crown', mood:'regal'},
  'Miner Mole': {id:'25', family:'mole', fur:'#494139', light:'#8c7b62', cloth:'#4c6255', prop:'pick', hat:'lamp', mood:'focused'},
  Monk: {id:'27', family:'mustelid', fur:'#94744f', light:'#c8ae87', cloth:'#4d6c35', prop:'bell', hood:true, mood:'peaceful'},
  Peddler: {id:'29', family:'marmot', fur:'#94704b', light:'#d8c5a0', cloth:'#4e6b50', prop:'pack', mood:'cheerful'},
  'Postal Pigeon': {id:'31', family:'pigeon', fur:'#81827b', light:'#c3c3b0', cloth:'#6d5140', prop:'mail', mood:'alert'},
  Queen: {id:'33', family:'mouse', fur:'#c3ac87', light:'#e2d3af', cloth:'#a33360', hat:'berry-crown', mood:'regal'},
  Ranger: {id:'35', family:'fox', fur:'#ad744a', light:'#d4c4a3', cloth:'#716e49', prop:'staff', hood:true, mood:'watchful'},
  Shepherd: {id:'37', family:'owl', fur:'#8c7046', light:'#d5c49a', cloth:'#d3c396', prop:'crook', mood:'watchful'},
  Shopkeeper: {id:'39', family:'rabbit', fur:'#6f6b68', light:'#b7b0a1', cloth:'#4e5e77', apron:true, mood:'curious'},
  Teacher: {id:'41', family:'crow', fur:'#303630', light:'#65694e', cloth:'#8c9a6d', prop:'notebook', mood:'focused'},
  Undertaker: {id:'43', family:'beetle', fur:'#282c28', light:'#454739', cloth:'#36392e', prop:'shovel', mood:'solemn'},
  Wanderer: {id:'45', family:'frog', fur:'#9b9c5d', light:'#cfca89', cloth:'#a35b3c', prop:'staff', mood:'smiling'},
  Woodcarver: {id:'47', family:'squirrel', fur:'#9f7950', light:'#d6c39a', cloth:'#b6b5a3', prop:'carving-tools', apron:true, mood:'focused'}
})
export const LOCAL_CHARACTER_NAMES = Object.freeze(Object.keys(LOCAL_CHARACTER_RECIPES))
