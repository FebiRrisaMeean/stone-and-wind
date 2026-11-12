import {mountGame} from './everdell-main.js?v=20261112-dialogs18';
const node=document.querySelector('[data-game-host]');
if(node&&!node.dataset.mounted){
 node.dataset.mounted='true';
 try{const cleanup=mountGame(node,{online:node.dataset.online!=='false'});node.addEventListener('game-dispose',()=>{cleanup();delete node.dataset.mounted;},{once:true});}
 catch(error){console.error(error);node.innerHTML='<div class="initial-loader"><h1>Не удалось открыть лесную долину</h1><p>Обновите страницу в браузере с поддержкой WebGL</p><button onclick="location.reload()">Попробовать снова</button></div>';}
}
