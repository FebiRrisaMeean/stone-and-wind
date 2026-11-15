// Preview only: the server applies payment and validates the resulting city independently
export function placementObstacles(layout,owner,payment={}){
 const result={...layout};
 for(const name of [payment.cardToDungeon,...(['Crane','Innkeeper'].includes(payment.cardToUse)?[payment.cardToUse]:[])].filter(Boolean)){
  const key=Object.keys(result).find(key=>result[key].owner===owner&&result[key].cardName===name);
  if(key)delete result[key];
 }
 return result;
}
