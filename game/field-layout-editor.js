import {getFieldLayout,setFieldLayout,saveFieldLayout} from './living-board-state.js?v=pages38-dark-ui';
export function createFieldLayoutEditor({root,world,onChange,onExit}){
 let active=false,before=null,selected=null,drag=null;
 const shell=root.querySelector('.living-shell'),panel=document.createElement('section');
 panel.className='field-layout-editor';panel.dataset.cameraUi='';panel.hidden=true;
 panel.innerHTML='<strong>Расстановка поля</strong><p>Перетаскивай модели или выбери объект и нажми на нужное место<br>«Камера» — снять выбор · колесо — масштаб</p><label>Объект <select aria-label="Объект для перемещения"></select></label><div><button data-edit="camera">Камера</button><button data-edit="save">Сохранить</button><button data-edit="cancel">Отмена</button><button data-edit="reset">Сбросить</button><button data-edit="copy">Скопировать расстановку</button></div><small role="status"></small><textarea aria-label="Расстановка для копирования" readonly hidden></textarea>';
 shell.appendChild(panel);const select=panel.querySelector('select'),status=panel.querySelector('small'),area=panel.querySelector('textarea');
 const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
 const items=()=>[{key:'tree',id:'living-tree',name:'Большое дерево',entity:'living-tree'},...(world.state?.locations??[]).map(l=>({key:l.actualName,id:l.id,name:l.name,entity:'location:'+l.id}))];
 const chosen=()=>items().find(i=>i.key===selected);
 function redraw(){area.hidden=true;onChange();world.renderer.shadowMap.needsUpdate=true;world.renderLoop.invalidate();}
 function choose(key){selected=key;select.value=key??'';status.textContent=key?'Перетащи объект или нажми на новое место':'Выбери объект';}
 function end(save){if(save){try{saveFieldLayout();}catch{status.textContent='Не удалось сохранить — скопируй расстановку';return;}}else setFieldLayout(before);active=false;drag=null;panel.hidden=true;shell.classList.remove('field-editing');redraw();onExit();}
 function down(e){if(!active||e.button!==0||e.target.closest('[data-camera-ui]'))return;
  const label=e.target.closest('.world-label'),hit=label?{type:'location',id:label.dataset.mapId}:world.pickAt(e),item=items().find(i=>i.id===hit?.id);
  if(item)choose(item.key);else if(hit?.type!=='ground'||!selected)return;
  const itemNow=chosen(),p=world.groundPoint(e.clientX,e.clientY),entity=world.entities.get(itemNow?.entity);if(!p||!entity)return;
  stop(e);world.keys.clear();world.pointers.clear();world.desiredTarget.copy(world.target);
  drag={item:itemNow,start:{x:entity.group.position.x,z:entity.group.position.z},ground:{x:p.x,z:p.z},point:null,clickGround:!item};
  world.canvas.setPointerCapture(e.pointerId);
 }
 function move(e){if(!active||!drag)return;stop(e);const p=world.groundPoint(e.clientX,e.clientY);if(!p)return;
  const x=Math.max(5,Math.min(55,drag.clickGround?p.x:drag.start.x+p.x-drag.ground.x)),z=Math.max(5,Math.min(39,drag.clickGround?p.z:drag.start.z+p.z-drag.ground.z));drag.point={x:Math.round(x*100)/100,z:Math.round(z*100)/100};
  const entity=world.entities.get(drag.item.entity);entity?.group.position.set(x,world.heightAt(x,z),z);
  const label=world.labelMap?.get('location:'+drag.item.id);if(label){label.pos.x=x;label.pos.z+=z-(drag.lastZ??drag.start.z);}drag.lastZ=z;
  world.renderer.shadowMap.needsUpdate=true;world.renderLoop.invalidate();
 }
 function up(e){if(!active||!drag)return;stop(e);if(!drag.point&&drag.clickGround)move(e);if(drag.point){const layout=getFieldLayout();layout[drag.item.key]=drag.point;setFieldLayout(layout);}drag=null;try{world.canvas.releasePointerCapture(e.pointerId);}catch{}redraw();}
 function click(e){if(active&&e.target.closest('#world-stage'))stop(e);}
 function key(e){if(!active)return;if(e.key==='Escape'){stop(e);end(false);}}
 function cancelPointer(){if(drag){drag=null;redraw();}}
 for(const [type,fn]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancelPointer],['click',click],['keydown',key]])window.addEventListener(type,fn,true);
 select.onchange=()=>choose(select.value||null);
 panel.onclick=async e=>{const action=e.target.closest('[data-edit]')?.dataset.edit;if(action==='camera')choose(null);if(action==='save')end(true);if(action==='cancel')end(false);if(action==='reset'){setFieldLayout({});redraw();status.textContent='Исходная расстановка восстановлена — нажми «Сохранить», чтобы оставить её';}if(action==='copy'){const text=JSON.stringify({version:1,positions:{tree:world.state.livingTree,...Object.fromEntries(world.state.locations.map(l=>[l.actualName,{x:l.x,z:l.z}]))}},null,2);area.value=text;area.hidden=false;area.select();try{await navigator.clipboard.writeText(text);status.textContent='Расстановка скопирована — отправь её в чат';}catch{status.textContent='Выделенный текст можно скопировать вручную';}}};
 return {get active(){return active},open(){before=getFieldLayout();active=true;selected=null;select.replaceChildren(new Option('Выбрать объект',''),...items().map(i=>new Option(i.name,i.key)));panel.hidden=false;area.hidden=true;shell.classList.add('field-editing');world.keys.clear();status.textContent='Изменения сохраняются только кнопкой «Сохранить»';},dispose(){for(const [type,fn]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancelPointer],['click',click],['keydown',key]])window.removeEventListener(type,fn,true);panel.remove();}};
}
