export class OnlineClient {
 constructor(baseUrl,{credentials=null,fetchImpl=globalThis.fetch}={}){this.baseUrl=baseUrl.replace(/\/$/,'');this.credentials=credentials;this.fetch=(...args)=>fetchImpl.call(globalThis,...args);}
 async request(path,data={}){const response=await this.fetch(`${this.baseUrl}/rooms/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok){const error=new Error(result.error);error.code=result.error;throw error;}return result;}
 attach(result){this.credentials={roomId:result.roomId,resumeToken:result.resumeToken,connectionId:result.connectionId};this.currentView=result.view;return result;}
 async create(){return this.attach(await this.request('create'));}
 async join(roomId,inviteToken){return this.attach(await this.request('join',{roomId,inviteToken}));}
 async reconnect(){return this.attach(await this.request('reconnect',this.credentials));}
 async view(){this.currentView=await this.request('view',this.credentials);return this.currentView;}
 async command(command,{commandId=globalThis.crypto.randomUUID(),expectedRevision=this.currentView.revision}={}){const result=await this.request('command',{...this.credentials,commandId,expectedRevision,command});this.currentView=result.view;return result;}
 async disconnect(){return this.request('disconnect',this.credentials);}
}
