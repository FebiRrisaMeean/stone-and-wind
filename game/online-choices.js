export function choiceSpec(input,own){switch(input.inputType){
 case 'SELECT_CARDS':case 'SELECT_CARDS_WITH_SOURCE':case 'SELECT_PLAYED_CARDS':return{options:input.cardOptions,min:input.minToSelect,max:input.maxToSelect,field:'selectedCards'};
 case 'DISCARD_CARDS':return{options:own.cardsInHand,min:input.minCards,max:input.maxCards,field:'cardsToDiscard'};
 case 'SELECT_PLAYER':return{options:input.playerOptions,min:input.mustSelectOne?1:0,max:1,field:'selectedPlayer',single:true};
 case 'SELECT_WORKER_PLACEMENT':return{options:input.options,min:input.mustSelectOne?1:0,max:1,field:'selectedOption',single:true};
 case 'SELECT_OPTION_GENERIC':return{options:input.options,min:1,max:1,field:'selectedOption',single:true};
 case 'SELECT_LOCATION':return{options:input.locationOptions,min:1,max:1,field:'selectedLocation',single:true};
 default:return null;
}}
export function pendingCommand(template,own,{indices=[],resources={}}={}){
 const input=structuredClone(template);input.clientOptions??={};
 if(input.inputType==='SELECT_RESOURCES')input.clientOptions.resources=resources;
 else if(input.inputType==='SELECT_PAYMENT_FOR_CARD')input.clientOptions.paymentOptions={...input.clientOptions.paymentOptions,resources};
 else{const spec=choiceSpec(input,own);if(!spec)throw new Error('Неизвестный тип выбора');if(indices.length<spec.min||indices.length>spec.max)throw new Error(`Выберите от ${spec.min} до ${spec.max}`);if(new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=spec.options.length))throw new Error('Недопустимый выбор карты');const values=indices.map(i=>spec.options[i]);input.clientOptions[spec.field]=spec.single?(values[0]??null):values;}
 return{kind:'step',input};
}

export function choiceCardName(input,option){
 if(!['SELECT_CARDS','SELECT_CARDS_WITH_SOURCE','SELECT_PLAYED_CARDS','DISCARD_CARDS'].includes(input.inputType))return null;
 if(option==='FROM_DECK')return null;
 return typeof option==='string'?option:option?.cardName??option?.card??option?.playedCard?.cardName??null;
}
