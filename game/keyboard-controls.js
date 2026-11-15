const STORAGE='stone-wind-keybindings-v1';
export const SHORTCUTS=[['market','Рынок','KeyM','[data-camera-zone="market"]'],['own','Мой город','KeyT','[data-camera-zone="own"]'],['opponent','Город соперника','KeyY','[data-camera-zone="opponent"]'],['production','Производство','KeyP','[data-camera-zone="production"]'],['events','Задания','KeyJ','[data-field="events"]'],['stock','Запас соперника','KeyI','[data-field="opponent-stock"]'],['season','Завершить сезон','KeyN','[data-field="season"]']];
const reserved=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyR',...Array.from({length:6},(_,i)=>'Digit'+(i+1))]);
const label=code=>code?code.replace(/^Key|^Digit/,''):'—';
export function validShortcut(code){return /^(Key[A-Z]|Digit[0-9])$/.test(code)&&!reserved.has(code)}
export function bindKeyboardControls(root,{canAct}){
 let bindings=Object.fromEntries(SHORTCUTS.map(([id,,code])=>[id,code])),waiting=null;
 try{const saved=JSON.parse(localStorage.getItem(STORAGE));const seen=new Set();for(const [id]of SHORTCUTS){const code=saved?.[id];if(code===null||(validShortcut(code)&&!seen.has(code))){bindings[id]=code;if(code)seen.add(code)}}}catch{}
 function save(){try{localStorage.setItem(STORAGE,JSON.stringify(bindings))}catch{}}
 function refresh(message=''){for(const el of root.querySelectorAll('[data-bind-key]')){const id=el.dataset.bindKey;el.textContent=waiting===id?'Нажмите клавишу…':label(bindings[id]);el.setAttribute('aria-pressed',String(waiting===id))}const note=root.querySelector('[data-key-message]');if(note)note.textContent=message;}
 function markup(){return `<div class="keyboard-settings"><p>Нажмите на клавишу, чтобы изменить её. Работает и в русской раскладке</p>${SHORTCUTS.map(([id,title])=>`<div class="keyboard-row"><span>${title}</span><button type="button" data-bind-key="${id}" aria-label="Клавиша: ${title}" aria-pressed="false">${label(bindings[id])}</button></div>`).join('')}<p data-key-message role="status"></p><button type="button" data-keys-reset>Сбросить клавиши</button><p>WASD, Q/E, R и 1–6 заняты управлением игры · Esc — отмена · Backspace — убрать назначение</p></div>`}
 function click(e){const button=e.target.closest('[data-bind-key]');if(button){waiting=button.dataset.bindKey;refresh();return}if(e.target.closest('[data-keys-reset]')){bindings=Object.fromEntries(SHORTCUTS.map(([id,,code])=>[id,code]));waiting=null;save();refresh('Назначения сброшены')}}
 function key(e){
  if(waiting&&!root.querySelector(`[data-bind-key="${waiting}"]`))waiting=null;
  if(waiting){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape'){waiting=null;refresh();return}if(e.code==='Backspace'||e.code==='Delete'){bindings[waiting]=null;waiting=null;save();refresh();return}if(e.ctrlKey||e.altKey||e.metaKey||e.shiftKey||!validShortcut(e.code)){refresh('Выберите букву или цифру, не занятую управлением камеры');return}const conflict=SHORTCUTS.find(([id])=>id!==waiting&&bindings[id]===e.code);if(conflict){refresh('Эта клавиша уже назначена: '+conflict[1]);return}bindings[waiting]=e.code;waiting=null;save();refresh('Клавиша сохранена');return}
  if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey||e.target.closest?.('input,textarea,select,[contenteditable="true"]')||!canAct())return;
  const action=SHORTCUTS.find(([id])=>bindings[id]===e.code);if(!action)return;const button=root.querySelector(action[3]);if(!button||button.disabled)return;e.preventDefault();e.stopImmediatePropagation();button.click();
 }
 root.addEventListener('click',click);window.addEventListener('keydown',key,true);
 return{markup,dispose(){root.removeEventListener('click',click);window.removeEventListener('keydown',key,true)}};
}
