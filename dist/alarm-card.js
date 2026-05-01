/**
 * Alarm Card — v1.0.0
 *
 * Multi-alarm card with iPhone-style UI.
 * Up to 10 alarms per slot, each with optional name,
 * per-day settings: speaker, sound, volume, lamp, brightness, repeat.
 *
 * Storage: /config/alarm_data/slot_N.json
 * Format:
 * {
 *   "alarms": [
 *     {
 *       "id": "a1",
 *       "name": "Work",
 *       "on": true,
 *       "d": {
 *         "0": { "t":"07:00", "mp":"media_player.x", "v":50, "s":3, "r":1,
 *                "l":"light.x", "b":80, "url":"...", "media_type":"...", "media_title":"..." }
 *       }
 *     }
 *   ]
 * }
 *
 * Day index: 0=Mon … 6=Sun (matches JS: (getDay()+6)%7)
 * Speaker label filter : "music_assistant"
 * Light label filter   : "verlichting_wekker"
 */

const VERSION   = '1.4.0';
const DAYS_SHORT= ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_NL   = ['Ma','Di','Wo','Do','Vr','Za','Zo'];
const DAYS_FULL = ['Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag','Zondag'];
const MAX_ALARMS = 10;
const LABEL_SPEAKER = 'music_assistant';
const LABEL_LIGHT   = 'verlichting_wekker';

/* ══════════════════════════════════════════════════════
   EDITOR
   ══════════════════════════════════════════════════════ */

class AlarmCardEditor extends HTMLElement {
  constructor() { super(); this._config={}; this._hass=null; this._ready=false; }
  set hass(h) {
    this._hass=h;
    if(this._ready){const f=this.querySelector('ha-form');if(f)f.hass=h;}
    else this._init();
  }
  setConfig(c) {
    this._config={...c};
    if(this._ready){const f=this.querySelector('ha-form');if(f)f.data=this._data();}
    else this._init();
  }
  _data(){ return {slot:this._config.slot??1}; }
  _fire(){ this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:{...this._config}},bubbles:true,composed:true})); }
  _init(){
    if(!this._hass||this._ready)return;
    this._ready=true;
    this.innerHTML=`<ha-form></ha-form>
      <p style="font-size:12px;color:var(--secondary-text-color);margin:6px 16px 12px;line-height:1.5">
        Kies een slot (1–10) per persoon. Data wordt opgeslagen in<br>
        <code>/config/alarm_data/slot_N.json</code>
      </p>`;
    const form=this.querySelector('ha-form');
    form.hass=this._hass;
    form.schema=[{name:'slot',label:'Slot (1 – 10)',selector:{number:{min:1,max:10,mode:'box',step:1}}}];
    form.data=this._data();
    form.addEventListener('value-changed',e=>{
      const v=e.detail.value||{};
      if(v.slot!==undefined&&v.slot!==this._config.slot){this._config.slot=v.slot;this._fire();}
    });
  }
}

/* ══════════════════════════════════════════════════════
   SEARCHABLE DROPDOWN
   ══════════════════════════════════════════════════════ */

function buildSearchSelect({container,options,value,placeholder,onChange}){
  let current=value||'',open=false;
  const sel=options.find(o=>o.id===current);
  container.innerHTML=`
    <style>
      .ss-bar{display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--divider-color,#ddd);border-radius:8px;background:var(--card-background-color,#fff);cursor:pointer;-webkit-tap-highlight-color:transparent;min-height:44px;user-select:none;-webkit-user-select:none}
      .ss-val{flex:1;font-size:14px;color:var(--primary-text-color);padding:10px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ss-val.ph{color:var(--secondary-text-color)}
      .ss-arr{--mdc-icon-size:18px;color:var(--secondary-text-color);display:flex;flex-shrink:0;transition:transform .2s}
      .ss-drop{display:none;margin-top:4px;border:1px solid var(--divider-color,#ddd);border-radius:10px;background:var(--card-background-color,#fff);overflow:hidden;position:relative;z-index:50}
      .ss-src-row{display:flex;align-items:center;gap:6px;padding:0 10px;border-bottom:1px solid var(--divider-color,#ebebeb);background:var(--secondary-background-color)}
      .ss-src{flex:1;border:none;outline:none;background:none;font-size:14px;color:var(--primary-text-color);padding:10px 0;font-family:inherit}
      .ss-list{max-height:180px;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
      .ss-item{padding:10px 12px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;user-select:none;-webkit-user-select:none;border-bottom:1px solid var(--divider-color,#f0f0f0)}
      .ss-item:last-child{border-bottom:none}
      .ss-empty{padding:12px;font-size:13px;color:var(--secondary-text-color);text-align:center}
    </style>
    <div class="ss-bar">
      <span class="ss-val ${sel?'':'ph'}">${sel?sel.name:(placeholder||'Kiezen...')}</span>
      <ha-icon class="ss-arr" icon="mdi:chevron-down"></ha-icon>
    </div>
    <div class="ss-drop">
      <div class="ss-src-row">
        <ha-icon icon="mdi:magnify" style="--mdc-icon-size:16px;color:var(--secondary-text-color);display:flex;flex-shrink:0"></ha-icon>
        <input class="ss-src" type="text" placeholder="Zoeken..." autocomplete="off" spellcheck="false">
      </div>
      <div class="ss-list"></div>
    </div>`;
  const bar=container.querySelector('.ss-bar'),valEl=container.querySelector('.ss-val'),
        arrow=container.querySelector('.ss-arr'),drop=container.querySelector('.ss-drop'),
        search=container.querySelector('.ss-src'),list=container.querySelector('.ss-list');
  const renderList=q=>{
    const fl=q?options.filter(o=>o.name.toLowerCase().includes(q.toLowerCase())||o.id.toLowerCase().includes(q.toLowerCase())):options;
    if(!fl.length){list.innerHTML=`<div class="ss-empty">Geen resultaten</div>`;return;}
    list.innerHTML=fl.map(o=>`
      <div class="ss-item" data-id="${o.id}" data-name="${o.name}"
           style="color:${o.id===current?'var(--primary-color)':'var(--primary-text-color)'};font-weight:${o.id===current?600:400}">
        <span>${o.name}</span>
        ${o.id===current?'<ha-icon icon="mdi:check" style="--mdc-icon-size:16px;color:var(--primary-color)"></ha-icon>':''}
      </div>`).join('');
    list.querySelectorAll('.ss-item').forEach(item=>{
      let sy=0,sx=0;
      item.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;sx=e.touches[0].clientX;},{passive:true});
      item.addEventListener('touchend',e=>{
        if(Math.abs(e.changedTouches[0].clientY-sy)>8||Math.abs(e.changedTouches[0].clientX-sx)>8)return;
        e.preventDefault();pick(item.dataset.id,item.dataset.name);
      },{passive:false});
      item.addEventListener('click',()=>pick(item.dataset.id,item.dataset.name));
    });
  };
  const openDrop =()=>{open=true;drop.style.display='block';arrow.style.transform='rotate(180deg)';search.value='';renderList('');setTimeout(()=>search.focus(),50);};
  const closeDrop=()=>{open=false;drop.style.display='none';arrow.style.transform='';search.blur();};
  const pick=(id,name)=>{current=id;valEl.textContent=name;valEl.classList.remove('ph');onChange(id);setTimeout(closeDrop,30);};
  let bty=0;
  bar.addEventListener('touchstart',e=>{bty=e.touches[0].clientY;},{passive:true});
  bar.addEventListener('touchend',e=>{if(Math.abs(e.changedTouches[0].clientY-bty)>8)return;e.preventDefault();open?closeDrop():openDrop();},{passive:false});
  bar.addEventListener('click',()=>{open?closeDrop():openDrop();});
  drop.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
  drop.addEventListener('click',e=>e.stopPropagation());
  search.addEventListener('input',e=>renderList(e.target.value));
  document.addEventListener('click',e=>{if(open&&!container.contains(e.target))closeDrop();},true);
}

/* ══════════════════════════════════════════════════════
   MAIN CARD
   ══════════════════════════════════════════════════════ */

class AlarmCard extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this._hass=null;this._config=null;this._slot=null;
    this._data={alarms:[]};
    this._lastState=null;this._domBuilt=false;
    this._interval=null;this._fired=new Set();
    this._modal=null;this._audio=null;
    this._testSpkEntity=null;this._testLmpEntity=null;
    this._lastSave=0;
  }

  static getConfigElement(){return document.createElement('alarm-card-1-editor');}
  static getStubConfig()   {return {slot:1};}
  getCardSize()             {return 3;}

  setConfig(config){
    this._config={...config};
    this._slot=config.slot??1;
    this._render();
  }

  set hass(hass){
    const first=!this._hass;
    this._hass=hass;
    if(!this._slot)return;
    if(first)this._startTicker();
    const sensor=hass.states[`sensor.alarm_slot_${this._slot}`];
    const alarms=sensor?.attributes?.alarms??[];
    const newState=JSON.stringify(alarms);
    const recentlySaved=(Date.now()-this._lastSave)<20000;
    if(!recentlySaved&&newState!==this._lastState){
      this._lastState=newState;
      if(!this._modal){this._data={alarms};if(this._domBuilt)this._updateDOM();else this._render();}
    } else if(first){
      if(!recentlySaved)this._data={alarms};
      this._render();
    }
  }

  connectedCallback()   {this._startTicker();}
  disconnectedCallback(){this._stopTicker();this._closeModal();this._stopAudio();}

  // ── Helpers ────────────────────────────────────────────

  _mpOptions(){
    const reg=this._hass?.entities||{};
    return Object.entries(this._hass?.states||{})
      .filter(([id])=>{
        if(!id.startsWith('media_player.'))return false;
        const labels=reg[id]?.labels||[];
        return labels.includes(LABEL_SPEAKER);
      })
      .map(([id,st])=>({id,name:st.attributes?.friendly_name||id}))
      .sort((a,b)=>a.name.localeCompare(b.name));
  }

  _lightOptions(){
    const reg=this._hass?.entities||{};
    return Object.entries(this._hass?.states||{})
      .filter(([id])=>{
        if(!id.startsWith('light.'))return false;
        const labels=reg[id]?.labels||[];
        return labels.includes(LABEL_LIGHT);
      })
      .map(([id,st])=>({id,name:st.attributes?.friendly_name||id}))
      .sort((a,b)=>a.name.localeCompare(b.name));
  }

  _genId(){return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);}

  _saveData(data){
    if(!this._hass||!this._slot)return;
    this._data=data;
    this._lastState=JSON.stringify(data.alarms);
    this._lastSave=Date.now();
    try{
      const json=JSON.stringify(data);
      const b64=btoa(unescape(encodeURIComponent(json)));
      this._hass.callService('shell_command','alarm_write',{slot:String(this._slot),data_b64:b64});
      console.info(`[alarm-card] slot ${this._slot} saved (${json.length} chars)`);
    }catch(e){console.error('[alarm-card] save failed:',e);}
  }

  // ── Audio ──────────────────────────────────────────────

  _stopAudio(){if(this._audio){this._audio.pause();this._audio.currentTime=0;this._audio=null;}}

  // ── Ticker ─────────────────────────────────────────────

  _startTicker(){if(this._interval)return;this._interval=setInterval(()=>this._tick(),20000);this._tick();}
  _stopTicker() {if(this._interval){clearInterval(this._interval);this._interval=null;}}

  async _tick(){
    // Alarm firing is handled server-side by the blueprint automation.
    // The ticker is intentionally disabled to prevent double-firing.
  }

  // ── Alarm samenvatting ─────────────────────────────────

  _alarmSummary(alarm){
    const days=Object.keys(alarm.d||{}).map(Number).sort((a,b)=>a-b);
    if(!days.length)return{time:'--:--',days:'Geen dagen',sound:null};
    const times=[...new Set(days.map(d=>alarm.d[String(d)]?.t||'--:--'))];
    const timeStr=times.length===1?times[0]:times.join('/');
    const allRepeat=days.every(d=>(alarm.d[String(d)]?.r??1)!==0);
    const noneRepeat=days.every(d=>(alarm.d[String(d)]?.r??1)===0);
    let dayStr;
    if(allRepeat){
      dayStr=days.length===1?`Elke ${DAYS_FULL[days[0]]}`:days.map(d=>DAYS_NL[d]).join(' ')+' · wekelijks';
    } else if(noneRepeat){
      dayStr=days.map(d=>DAYS_NL[d]).join(' ')+' · eenmalig';
    } else {
      dayStr=days.map(d=>{const r=(alarm.d[String(d)]?.r??1)!==0;return DAYS_NL[d]+(r?'↻':'·');}).join(' ');
    }
    const firstDay=alarm.d[String(days[0])];
    const sound=firstDay?.media_title||null;
    // Lamp: toon naam van eerste dag die lamp aan heeft
    const lampDay=days.find(d=>typeof alarm.d[String(d)]?.b==='number'&&alarm.d[String(d)]?.l);
    const lamp=lampDay!==undefined?alarm.d[String(lampDay)]?.l:null;
    const speaker=firstDay?.mp||null;
    return{time:timeStr,days:dayStr,sound,lamp,speaker};
  }

  // ── Render ─────────────────────────────────────────────

  _render(){
    if(!this._config)return;
    if(!this._slot){
      this.shadowRoot.innerHTML=`
        <style>:host{display:block}ha-card{display:flex;align-items:center;justify-content:center;min-height:72px;padding:0 16px;gap:8px}span{font-size:13px;color:var(--secondary-text-color)}</style>
        <ha-card><ha-icon style="--mdc-icon-size:18px;color:var(--secondary-text-color)" icon="mdi:pencil-outline"></ha-icon><span>Stel een slot in via het potlood</span></ha-card>`;
      this._domBuilt=false;return;
    }
    if(!this._domBuilt){this._buildDOM();this._domBuilt=true;}
    this._updateDOM();
  }

  _buildDOM(){
    if(this.shadowRoot.querySelector('ha-card'))return;
    this.shadowRoot.innerHTML=`
      <style>
        :host{display:block}
        ha-card{padding:0;overflow:hidden}
        .card-header{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px}
        .card-title{font-size:16px;font-weight:600;color:var(--primary-text-color)}
        .btn-add{display:flex;align-items:center;gap:6px;padding:8px 14px;border:none;border-radius:20px;background:var(--primary-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;font-family:inherit}
        .btn-add ha-icon{--mdc-icon-size:16px;display:flex}
        .alarm-list{padding:0 0 8px}
        .alarm-empty{padding:24px 16px;text-align:center;color:var(--secondary-text-color);font-size:14px}
        .alarm-row{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--divider-color,#f0f0f0);gap:12px}
        .alarm-row:last-child{border-bottom:none}
        .alarm-info{flex:1;min-width:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
        .alarm-name{font-size:12px;color:var(--secondary-text-color);margin-bottom:2px;font-weight:500}
        .alarm-time{font-size:28px;font-weight:300;line-height:1;color:var(--primary-text-color);transition:color .2s}
        .alarm-time.off{color:var(--secondary-text-color)}
        .alarm-days{font-size:12px;color:var(--secondary-text-color);margin-top:3px}
        .alarm-sound{font-size:11px;color:var(--secondary-text-color);margin-top:1px;display:flex;align-items:center;gap:3px}
        .alarm-sound ha-icon{--mdc-icon-size:12px}
        .alarm-lamp{font-size:11px;color:var(--secondary-text-color);margin-top:1px;display:flex;align-items:center;gap:3px}
        .alarm-lamp ha-icon{--mdc-icon-size:12px}
        .alarm-speaker{font-size:11px;color:var(--secondary-text-color);margin-top:1px;display:flex;align-items:center;gap:3px}
        .alarm-speaker ha-icon{--mdc-icon-size:12px}
        .alarm-actions{display:flex;align-items:center;gap:4px;flex-shrink:0}
        .toggle{display:flex;align-items:center;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;padding:4px}
        .track{width:44px;height:26px;border-radius:13px;position:relative;box-sizing:border-box;transition:all .2s}
        .thumb{position:absolute;top:3px;width:16px;height:16px;border-radius:50%;transition:left .2s,background .2s}
        .btn-del{width:32px;height:32px;border:none;background:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--secondary-text-color);--mdc-icon-size:16px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;margin-left:2px}
        .btn-del:hover{background:var(--secondary-background-color)}
        .max-msg{padding:10px 16px;font-size:12px;color:var(--secondary-text-color);text-align:center;display:none}
      </style>
      <ha-card>
        <div class="card-header">
          <span class="card-title">Wekkers</span>
          <button class="btn-add" id="btn-add">
            <ha-icon icon="mdi:plus"></ha-icon>
            Wekker toevoegen
          </button>
        </div>
        <div class="alarm-list" id="alarm-list"></div>
        <div class="max-msg" id="max-msg">Maximum van ${MAX_ALARMS} wekkers bereikt</div>
      </ha-card>`;

    const tap=(el,fn)=>{
      if(!el)return;
      let sy=0,sx=0,fired=false;
      el.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;sx=e.touches[0].clientX;fired=false;},{passive:true});
      el.addEventListener('touchend',e=>{
        if(Math.abs(e.changedTouches[0].clientY-sy)>8||Math.abs(e.changedTouches[0].clientX-sx)>8)return;
        e.preventDefault();fired=true;fn();
      },{passive:false});
      el.addEventListener('click',()=>{if(fired){fired=false;return;}fn();});
    };

    tap(this.shadowRoot.getElementById('btn-add'),()=>{
      const alarms=this._data?.alarms||[];
      if(alarms.length>=MAX_ALARMS){
        const msg=this.shadowRoot.getElementById('max-msg');
        if(msg){msg.style.display='block';setTimeout(()=>msg.style.display='none',3000);}
        return;
      }
      const newAlarm={id:this._genId(),name:'',on:true,d:{}};
      this._openModal(newAlarm,true);
    });
  }

  _updateDOM(){
    const sr=this.shadowRoot;
    const alarms=this._data?.alarms||[];
    const listEl=sr.getElementById('alarm-list');
    if(!listEl)return;

    if(!alarms.length){
      listEl.innerHTML=`<div class="alarm-empty">Nog geen wekkers.<br>Tik op "Wekker toevoegen" om er een aan te maken.</div>`;
      return;
    }

    listEl.innerHTML=alarms.map(alarm=>{
      const {time,days,sound,lamp,speaker}=this._alarmSummary(alarm);
      const en=alarm.on;
      return `
        <div class="alarm-row" data-id="${alarm.id}">
          <div class="alarm-info" data-edit="${alarm.id}">
            ${alarm.name?`<div class="alarm-name">${alarm.name}</div>`:''}
            <div class="alarm-time${en?'':' off'}">${time}</div>
            <div class="alarm-days">${days||'Geen dagen geselecteerd'}</div>
            ${sound?`<div class="alarm-sound"><ha-icon icon="mdi:music"></ha-icon>${sound}</div>`:''}
            ${lamp?`<div class="alarm-lamp"><ha-icon icon="mdi:lightbulb-on"></ha-icon>${this._hass?.states[lamp]?.attributes?.friendly_name||lamp}</div>`:''}
            ${speaker?`<div class="alarm-speaker"><ha-icon icon="mdi:speaker"></ha-icon>${this._hass?.states[speaker]?.attributes?.friendly_name||speaker}</div>`:''}
          </div>
          <div class="alarm-actions">
            <div class="toggle" data-toggle="${alarm.id}">
              <div class="track" style="background:${en?'var(--primary-color)':'var(--secondary-background-color)'};border:1.5px solid ${en?'var(--primary-color)':'var(--divider-color,#ccc)'}">
                <div class="thumb" style="left:${en?'21px':'3px'};background:${en?'#fff':'var(--secondary-text-color)'}"></div>
              </div>
            </div>
            <button class="btn-del" data-del="${alarm.id}" title="Delete">
              <ha-icon icon="mdi:trash-can-outline"></ha-icon>
            </button>
          </div>
        </div>`;
    }).join('');

    const tap=(el,fn)=>{
      if(!el)return;
      let sy=0,sx=0,fired=false;
      el.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;sx=e.touches[0].clientX;fired=false;},{passive:true});
      el.addEventListener('touchend',e=>{
        if(Math.abs(e.changedTouches[0].clientY-sy)>8||Math.abs(e.changedTouches[0].clientX-sx)>8)return;
        e.preventDefault();fired=true;fn();
      },{passive:false});
      el.addEventListener('click',()=>{if(fired){fired=false;return;}fn();});
    };

    // Edit
    listEl.querySelectorAll('[data-edit]').forEach(el=>{
      tap(el,()=>{
        const alarm=this._data.alarms.find(a=>a.id===el.dataset.edit);
        if(alarm)this._openModal(JSON.parse(JSON.stringify(alarm)),false);
      });
    });

    // Toggle
    listEl.querySelectorAll('[data-toggle]').forEach(el=>{
      let tb=false;
      tap(el,()=>{
        if(tb)return;tb=true;setTimeout(()=>tb=false,400);
        const alarms=JSON.parse(JSON.stringify(this._data.alarms));
        const alarm=alarms.find(a=>a.id===el.dataset.toggle);
        if(alarm){alarm.on=!alarm.on;this._saveData({alarms});this._updateDOM();}
      });
    });

    // Delete
    listEl.querySelectorAll('[data-del]').forEach(el=>{
      tap(el,()=>{
        if(!confirm('Delete this alarm?'))return;
        const alarms=this._data.alarms.filter(a=>a.id!==el.dataset.del);
        this._saveData({alarms});this._updateDOM();
      });
    });
  }

  // ── Modal ──────────────────────────────────────────────

  _openModal(alarm,isNew){
    this._temp=alarm;
    this._isNew=isNew;
    this._buildModal();
  }

  _closeModal(){
    if(this._modal){this._modal.remove();this._modal=null;}
    this._stopAudio();
    if(this._testSpkEntity){try{this._hass?.callService('media_player','media_stop',{entity_id:this._testSpkEntity});}catch(_){}this._testSpkEntity=null;}
    if(this._testLmpEntity){try{this._hass?.callService('light','turn_off',{entity_id:this._testLmpEntity});}catch(_){}this._testLmpEntity=null;}
  }

  _buildModal(){
    this._closeModal();
    const a=this._temp;
    const modal=document.createElement('div');
    Object.assign(modal.style,{position:'fixed',inset:'0',background:'rgba(0,0,0,.52)',zIndex:'9999',display:'flex',alignItems:'flex-end',justifyContent:'center'});

    modal.innerHTML=`
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        #sheet{background:var(--card-background-color,#fafafa);border-radius:24px 24px 0 0;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;overflow-x:hidden;font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif);padding-bottom:max(env(safe-area-inset-bottom,0px),24px);-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
        .handle{width:40px;height:4px;border-radius:2px;background:var(--divider-color,#ddd);margin:14px auto 0}
        .hdr{padding:16px 20px 4px;display:flex;align-items:center;gap:10px}
        .hdr h3{flex:1;font-size:18px;font-weight:600;color:var(--primary-text-color)}
        .sec{padding:14px 20px 0}
        .lbl{font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--secondary-text-color);margin-bottom:8px}
        .div{height:1px;background:var(--divider-color,#ebebeb);margin:14px 0 0}
        /* Name input */
        .name-input{width:100%;border:1px solid var(--divider-color,#ddd);border-radius:8px;padding:10px 12px;font-size:15px;color:var(--primary-text-color);background:var(--card-background-color,#fff);font-family:inherit;outline:none}
        .name-input:focus{border-color:var(--primary-color)}
        .name-hint{font-size:11px;color:var(--secondary-text-color);margin-top:4px}
        /* Days */
        .days-row{display:flex;gap:5px}
        .day-btn{flex:1;padding:8px 2px;border-radius:20px;font-size:12px;font-weight:600;border:1.5px solid var(--divider-color,#ddd);background:none;color:var(--secondary-text-color);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;text-align:center;transition:all .15s;font-family:inherit}
        .day-btn.on{background:var(--primary-color);color:#fff;border-color:var(--primary-color)}
        .quick-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
        .qbtn{padding:5px 11px;border-radius:14px;font-size:12px;font-weight:500;border:1px solid var(--divider-color,#ddd);background:none;color:var(--secondary-text-color);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;font-family:inherit}
        /* Day blocks */
        #day-blocks{margin-top:12px}
        .day-block{border:1px solid var(--divider-color,#e0e0e0);border-radius:12px;margin-bottom:8px;overflow:hidden}
        .day-blk-hdr{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--secondary-background-color);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
        .day-blk-lbl{font-size:14px;font-weight:700;color:var(--primary-text-color);width:26px;flex-shrink:0}
        .dt-time{border:1px solid var(--divider-color,#ddd);border-radius:6px;padding:5px 8px;font-size:15px;color:var(--primary-text-color);background:var(--card-background-color,#fff);font-family:inherit;outline:none;flex-shrink:0}
        .dt-time:focus{border-color:var(--primary-color)}
        .day-blk-sum{flex:1;font-size:12px;color:var(--secondary-text-color);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:4px}
        .day-blk-arr{--mdc-icon-size:18px;color:var(--secondary-text-color);display:flex;flex-shrink:0}
        /* Day body */
        .day-blk-body{padding:12px 14px 14px;border-top:1px solid var(--divider-color,#ebebeb)}
        .dblbl{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--secondary-text-color);margin-bottom:6px}
        /* Sound */
        .snd-btn-row{display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid var(--divider-color,#ddd);border-radius:8px;background:var(--card-background-color,#fff);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
        .snd-btn-name{flex:1;font-size:13px;font-weight:500;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .snd-btn-name.sel{color:var(--primary-color)}
        .snd-arr{--mdc-icon-size:16px;color:var(--secondary-text-color);display:flex;flex-shrink:0;transition:transform .2s}
        .snd-panel{margin-top:6px;border:1px solid var(--divider-color,#ebebeb);border-radius:8px;overflow:hidden}
        
        /* Sliders */
        .vol-row,.bri-row{display:flex;align-items:center;gap:10px;padding:4px 0;margin-top:6px}
        .vol-row ha-icon,.bri-row ha-icon{--mdc-icon-size:16px;color:var(--secondary-text-color);display:flex;flex-shrink:0}
        .vol-val{font-size:13px;font-weight:600;min-width:44px;text-align:right;flex-shrink:0}
        .slider{-webkit-appearance:none;flex:1;height:6px;border-radius:3px;outline:none;cursor:pointer;touch-action:none}
        .slider::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;border-radius:50%;background:var(--primary-color);box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer}
        .slider::-moz-range-thumb{width:26px;height:26px;border:none;border-radius:50%;background:var(--primary-color)}
        /* Lamp */
        .lamp-hdr-row{display:flex;align-items:center;justify-content:space-between;margin-top:12px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
        .mini-track{width:34px;height:20px;border-radius:10px;position:relative;flex-shrink:0;box-sizing:border-box;transition:all .2s}
        .mini-track.on{background:var(--primary-color);border:1.5px solid var(--primary-color)}
        .mini-track.off{background:var(--secondary-background-color);border:1.5px solid var(--divider-color,#ccc)}
        .mini-thumb{position:absolute;top:2px;width:12px;height:12px;border-radius:50%;transition:left .2s}
        .mini-track.on .mini-thumb{left:18px;background:#fff}
        .mini-track.off .mini-thumb{left:2px;background:var(--secondary-text-color)}
        .lamp-body{margin-top:8px}
        /* Test */
        .test-row-day{display:flex;gap:8px;margin-top:12px}
        .btn-test-day{flex:1;padding:10px;border:1.5px solid var(--primary-color);border-radius:10px;background:none;font-size:13px;font-weight:500;color:var(--primary-color);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;font-family:inherit;transition:all .2s;text-align:center}
        .btn-test-day.active{background:var(--primary-color);color:#fff}
        .btn-test-day:disabled{opacity:.35;pointer-events:none;border-color:var(--divider-color,#ddd);color:var(--secondary-text-color)}
        /* Media browser */
        .media-browser-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}
        .media-browser-sheet{background:var(--card-background-color,#fff);border-radius:24px 24px 0 0;width:100%;max-width:520px;height:85vh;display:flex;flex-direction:column;overflow:hidden}
        .media-browser-hdr{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--divider-color,#ebebeb);flex-shrink:0;gap:4px}
        @keyframes spin{to{transform:rotate(360deg)}}
        .mbr-loading{display:flex;justify-content:center;padding:32px}
        .mbr-empty{padding:24px;text-align:center;color:var(--secondary-text-color);font-size:14px}
        .mbr-item{display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;border-bottom:1px solid var(--divider-color,#f0f0f0);transition:background .1s}
        .mbr-item:last-child{border-bottom:none}
        .mbr-item:active{background:var(--secondary-background-color)}
        .mbr-thumb{width:44px;height:44px;border-radius:6px;object-fit:cover;flex-shrink:0}
        .mbr-thumb-icon{width:44px;height:44px;border-radius:6px;background:var(--secondary-background-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;--mdc-icon-size:22px;color:var(--secondary-text-color)}
        .mbr-item-info{flex:1;min-width:0}
        .mbr-item-title{font-size:14px;font-weight:500;color:var(--primary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .mbr-item-sub{font-size:11px;color:var(--secondary-text-color);margin-top:2px;text-transform:capitalize}
        .mbr-select-icon{--mdc-icon-size:20px;color:var(--primary-color);display:flex;flex-shrink:0}
        /* Footer */
        .footer{padding:16px 20px 0;display:flex;gap:10px}
        .btn-cancel{flex:1;padding:13px;border:1px solid var(--divider-color,#ddd);border-radius:12px;background:none;font-size:15px;font-weight:500;color:var(--secondary-text-color);cursor:pointer;touch-action:manipulation;font-family:inherit}
        .btn-save{flex:2;padding:13px;border:none;border-radius:12px;background:var(--primary-color);font-size:15px;font-weight:600;color:#fff;cursor:pointer;touch-action:manipulation;font-family:inherit}
      </style>

      <div id="sheet">
        <div class="handle"></div>
        <div class="hdr">
          <h3>${this._isNew?'Nieuwe wekker':'Wekker bewerken'}</h3>
        </div>
        <div class="div"></div>

        <!-- Name -->
        <div class="sec">
          <div class="lbl">Naam <span style="font-weight:400;text-transform:none;letter-spacing:0">(optioneel)</span></div>
          <input class="name-input" id="alarm-name" type="text" placeholder="bijv. Werk, Weekend..." value="${a.name||''}" maxlength="40">
        </div>
        <div class="div"></div>

        <!-- Days -->
        <div class="sec">
          <div class="lbl">Actieve dagen</div>
          <div class="days-row">
            ${DAYS_NL.map((d,i)=>`<button class="day-btn${a.d[String(i)]?' on':''}" data-day="${i}">${d}</button>`).join('')}
          </div>
          <div class="quick-row">
            <button class="qbtn" id="q-work">Werkdagen</button>
            <button class="qbtn" id="q-weekend">Weekend</button>
            <button class="qbtn" id="q-all">Elke dag</button>
            <button class="qbtn" id="q-none">Geen</button>
          </div>
          <div id="day-blocks"></div>
        </div>
        <div class="div"></div>

        <!-- Footer -->
        <div class="footer">
          <button class="btn-cancel" id="btn-cancel">Annuleren</button>
          <button class="btn-save"   id="btn-save">Opslaan</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    this._modal=modal;

    // ── Tap helper ──────────────────────────────────────────────────
    const tap=(el,fn)=>{
      if(!el)return;
      let sy=0,sx=0,fired=false;
      el.addEventListener('touchstart',e=>{sy=e.touches[0].clientY;sx=e.touches[0].clientX;fired=false;},{passive:true});
      el.addEventListener('touchend',e=>{
        if(Math.abs(e.changedTouches[0].clientY-sy)>8||Math.abs(e.changedTouches[0].clientX-sx)>8)return;
        e.preventDefault();fired=true;fn();
      },{passive:false});
      el.addEventListener('click',()=>{if(fired){fired=false;return;}fn();});
    };

    const expanded=new Set();

    // ── genDayBody ─────────────────────────────────────────────────
    const genDayBody=i=>{
      const key=String(i);
      const day=this._temp.d[key]||{};
      const hasSnd=!!day.media_title;
      const sndName=day.media_title||null;
      const lampOn=typeof day.b==='number';
      const vol=day.v??50;
      const bri=day.b??80;
      return `
        <!-- Speaker -->
        <div class="dblbl">Speaker</div>
        <div id="mp-slot-${i}"></div>
        <div class="vol-row">
          <ha-icon icon="mdi:volume-low"></ha-icon>
          <input class="slider" type="range" id="vol-${i}" min="0" max="100" step="1" value="${vol}">
          <ha-icon icon="mdi:volume-high"></ha-icon>
          <span class="vol-val" id="vol-v-${i}">${vol}%</span>
        </div>

        <!-- Sound -->
        <div class="dblbl" style="margin-top:12px">Wekkergeluid</div>
        <div style="display:flex;align-items:center;gap:6px">
          <div class="snd-btn-row" data-sndrow="${i}" style="flex:1">
            <ha-icon icon="mdi:music-note" style="--mdc-icon-size:14px;color:${hasSnd?'var(--primary-color)':'var(--secondary-text-color)'};display:flex;flex-shrink:0"></ha-icon>
            <span class="snd-btn-name${hasSnd?' sel':''}">${sndName||'Geluid kiezen'}</span>
            <ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:16px;color:var(--secondary-text-color);display:flex;flex-shrink:0"></ha-icon>
          </div>
          <button data-sndclear="${i}" style="display:${hasSnd?'flex':'none'};border:none;background:none;color:var(--secondary-text-color);cursor:pointer;font-size:15px;padding:4px 8px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;flex-shrink:0;align-items:center">✕</button>
        </div>
        <p id="bld-no-spk-${i}" style="display:none;font-size:12px;color:var(--error-color,#f44336);margin-top:6px;text-align:center">⚠️ Selecteer eerst een speaker</p>

        <!-- Lamp -->
        <div class="lamp-hdr-row" data-lamptoggle="${i}">
          <span class="dblbl" style="margin-bottom:0">Wake-up lamp</span>
          <div class="mini-track ${lampOn?'on':'off'}" data-lamptrack="${i}"><div class="mini-thumb"></div></div>
        </div>
        <div class="lamp-body" id="lamp-body-${i}" style="display:${lampOn?'block':'none'}">
          <div id="lp-slot-${i}" style="margin-top:6px"></div>
          <div class="bri-row">
            <ha-icon icon="mdi:brightness-4"></ha-icon>
            <input class="slider" type="range" id="bri-${i}" min="1" max="100" step="1" value="${bri}">
            <ha-icon icon="mdi:brightness-7"></ha-icon>
            <span class="vol-val" id="bri-v-${i}">${bri}%</span>
          </div>
        </div>

        <!-- Repeat -->
        <div class="lamp-hdr-row" data-repeattoggle="${i}" style="margin-top:12px">
          <span class="dblbl" style="margin-bottom:0">Wekelijks herhalen</span>
          <div class="mini-track ${day.r===0?'off':'on'}" data-repeattrack="${i}"><div class="mini-thumb"></div></div>
        </div>

        <!-- Test -->
        <div class="test-row-day">
          <button class="btn-test-day" data-testspk="${i}" ${!day.mp?'disabled':''}>🔊 Speaker testen</button>
          <button class="btn-test-day" data-testlmp="${i}" ${!lampOn||!day.l?'disabled':''}>💡 Lamp testen</button>
        </div>`;
    };

    // ── initBlock ───────────────────────────────────────────────────
    const initBlock=i=>{
      const key=String(i);
      const block=modal.querySelector(`.day-block[data-day="${i}"]`);
      if(!block)return;
      if(!this._temp.d[key])this._temp.d[key]={t:'07:00',r:0};
      const day=this._temp.d[key];

      // Time input
      const timeInp=block.querySelector('.dt-time');
      timeInp.addEventListener('change',e=>{day.t=e.target.value;});
      timeInp.addEventListener('click',e=>e.stopPropagation());
      timeInp.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
      timeInp.addEventListener('touchend',e=>e.stopPropagation(),{passive:true});
      timeInp.addEventListener('mousedown',e=>e.stopPropagation());

      // Header toggle
      const hdr=block.querySelector('.day-blk-hdr');
      const body=block.querySelector('.day-blk-body');
      const arr=block.querySelector('.day-blk-arr');
      let _hsy=0,_hsx=0,_hFired=false;
      hdr.addEventListener('touchstart',e=>{
        if(e.target.classList.contains('dt-time')||e.target.closest?.('.dt-time'))return;
        _hsy=e.touches[0].clientY;_hsx=e.touches[0].clientX;_hFired=false;
      },{passive:true});
      hdr.addEventListener('touchend',e=>{
        if(e.target.classList.contains('dt-time')||e.target.closest?.('.dt-time'))return;
        if(Math.abs(e.changedTouches[0].clientY-_hsy)>8||Math.abs(e.changedTouches[0].clientX-_hsx)>8)return;
        e.preventDefault();_hFired=true;
        const isOpen=body.style.display!=='none';
        body.style.display=isOpen?'none':'block';
        arr.style.transform=isOpen?'':'rotate(180deg)';
        if(isOpen)expanded.delete(i);else expanded.add(i);
      },{passive:false});
      hdr.addEventListener('click',e=>{
        if(e.target.classList.contains('dt-time')||e.target.closest?.('.dt-time'))return;
        if(_hFired){_hFired=false;return;}
        const isOpen=body.style.display!=='none';
        body.style.display=isOpen?'none':'block';
        arr.style.transform=isOpen?'':'rotate(180deg)';
        if(isOpen)expanded.delete(i);else expanded.add(i);
      });

      // Sound — klik direct opent Music Assistant browser
      const sndRow=block.querySelector(`[data-sndrow="${i}"]`);
      tap(sndRow,()=>openMediaBrowser());
      tap(block.querySelector(`[data-sndclear="${i}"]`),()=>{
        delete day.url;delete day.media_type;delete day.media_title;
        const nameEl=sndRow.querySelector('.snd-btn-name');
        const iconEl=sndRow.querySelector('ha-icon');
        const sum=block.querySelector('.day-blk-sum');
        const clearBtn=block.querySelector(`[data-sndclear="${i}"]`);
        if(nameEl){nameEl.textContent='Geluid kiezen';nameEl.classList.remove('sel');}
        if(iconEl)iconEl.style.color='var(--secondary-text-color)';
        if(sum){sum.textContent='—';sum.style.color='var(--secondary-text-color)';}
        if(clearBtn)clearBtn.style.display='none';
      });

      // Media browser
      let _navStack=[],_filteredRoot=null;
      const browseMedia=async(contentId=null,contentType=null)=>{
        try{
          const msg={type:'media_player/browse_media',entity_id:day.mp};
          if(contentId!==null&&contentId!=='')msg.media_content_id=contentId;
          if(contentType!==null&&contentType!=='')msg.media_content_type=contentType;
          return await this._hass.connection.sendMessagePromise(msg);
        }catch(e){console.error('[alarm-card] browse_media:',e);return null;}
      };
      const renderBrowserList=(overlay,result)=>{
        const listEl=overlay.querySelector('.mbr-list');
        const titleEl=overlay.querySelector('.mbr-title');
        const backBtn=overlay.querySelector('.mbr-back');
        if(!listEl)return;
        titleEl.textContent=result.title||'Media';
        backBtn.style.display=_navStack.length>0?'flex':'none';
        const children=result.children||[];
        if(!children.length){listEl.innerHTML=`<div class="mbr-empty">Geen media gevonden</div>`;return;}
        listEl.innerHTML=children.map((item,idx)=>{
          const canPlay=item.can_play,canExpand=item.can_expand;
          const isLeaf=!canExpand,isPlaylist=canPlay&&canExpand;
          const thumb=item.thumbnail
            ?`<img src="${item.thumbnail}" class="mbr-thumb" onerror="this.style.display='none'">`
            :`<div class="mbr-thumb-icon"><ha-icon icon="${canExpand?'mdi:folder-music':'mdi:music'}"></ha-icon></div>`;
          return `
            <div class="mbr-item${isLeaf||isPlaylist?' mbr-leaf':''}" data-idx="${idx}">
              ${thumb}
              <div class="mbr-item-info">
                <div class="mbr-item-title">${item.title||'Onbekend'}</div>
                ${item.media_class?`<div class="mbr-item-sub">${item.media_class}</div>`:''}
              </div>
              ${isLeaf||isPlaylist?`<ha-icon icon="mdi:check-circle-outline" class="mbr-select-icon"></ha-icon>`:`<ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:18px;color:var(--secondary-text-color);display:flex;flex-shrink:0"></ha-icon>`}
            </div>`;
        }).join('');
        listEl.querySelectorAll('.mbr-item').forEach(el=>{
          let isy=0,isf=false;
          el.addEventListener('touchstart',e=>{isy=e.touches[0].clientY;isf=false;},{passive:true});
          el.addEventListener('touchend',e=>{
            if(Math.abs(e.changedTouches[0].clientY-isy)>8)return;
            e.preventDefault();isf=true;
            handleItemClick(overlay,children[parseInt(el.dataset.idx)],result);
          },{passive:false});
          el.addEventListener('click',()=>{if(isf){isf=false;return;}handleItemClick(overlay,children[parseInt(el.dataset.idx)],result);});
        });
      };
      const handleItemClick=async(overlay,item,parent)=>{
        const shouldExpand=(!item.can_play&&item.can_expand);
        if(shouldExpand){
          _navStack.push({id:parent.media_content_id||null,type:parent.media_content_type||null,title:parent.title||''});
          overlay.querySelector('.mbr-list').innerHTML=`<div class="mbr-loading"><ha-icon icon="mdi:loading" style="animation:spin 1s linear infinite;--mdc-icon-size:32px;color:var(--primary-color)"></ha-icon></div>`;
          const result=await browseMedia(item.media_content_id||null,item.media_content_type||null);
          if(result)renderBrowserList(overlay,result);
          else overlay.querySelector('.mbr-list').innerHTML=`<div class="mbr-empty">Could not load media</div>`;
        } else {
          day.url=item.media_content_id;
          day.media_type=item.media_content_type;
          day.media_title=item.title||item.media_content_id;
          delete day.s;
          const nameEl=sndRow.querySelector('.snd-btn-name');
          const iconEl=sndRow.querySelector('ha-icon');
          const sum=block.querySelector('.day-blk-sum');
          const clearBtn=block.querySelector(`[data-sndclear="${i}"]`);
          if(nameEl){nameEl.textContent=day.media_title;nameEl.classList.add('sel');}
          if(iconEl)iconEl.style.color='var(--primary-color)';
          if(sum){sum.textContent=day.media_title;sum.style.color='var(--primary-color)';}
          if(clearBtn)clearBtn.style.display='flex';
          overlay.remove();
        }
      };
      const openMediaBrowser=async()=>{
        if(!day.mp){
          const noSpk=block.querySelector(`#bld-no-spk-${i}`);
          if(noSpk){noSpk.style.display='block';setTimeout(()=>noSpk.style.display='none',3000);}
          return;
        }
        _navStack=[];_filteredRoot=null;
        const overlay=document.createElement('div');
        overlay.className='media-browser-overlay';
        overlay.innerHTML=`
          <div class="media-browser-sheet">
            <div class="media-browser-hdr">
              <button class="mbr-back" style="display:none;border:none;background:none;color:var(--primary-color);cursor:pointer;padding:4px;align-items:center;--mdc-icon-size:20px;touch-action:manipulation">
                <ha-icon icon="mdi:arrow-left"></ha-icon>
              </button>
              <h4 class="mbr-title" style="flex:1;font-size:16px;font-weight:600;margin:0 8px;color:var(--primary-text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Laden...</h4>
              <button class="media-browser-close" style="border:none;background:none;cursor:pointer;color:var(--secondary-text-color);--mdc-icon-size:20px;padding:4px;touch-action:manipulation;display:flex;align-items:center;border-radius:50%"><ha-icon icon="mdi:close"></ha-icon></button>
            </div>
            <div class="mbr-list" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain">
              <div class="mbr-loading" style="display:flex;justify-content:center;padding:32px">
                <ha-icon icon="mdi:loading" style="animation:spin 1s linear infinite;--mdc-icon-size:32px;color:var(--primary-color)"></ha-icon>
              </div>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('.media-browser-close').addEventListener('click',()=>overlay.remove());
        overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
        overlay.querySelector('.mbr-back').addEventListener('click',async()=>{
          overlay.querySelector('.mbr-list').innerHTML=`<div class="mbr-loading" style="display:flex;justify-content:center;padding:32px"><ha-icon icon="mdi:loading" style="animation:spin 1s linear infinite;--mdc-icon-size:32px;color:var(--primary-color)"></ha-icon></div>`;
          if(_navStack.length>0){
            const prev=_navStack.pop();
            if(_navStack.length===0&&_filteredRoot){renderBrowserList(overlay,_filteredRoot);return;}
            const result=await browseMedia(prev.id||null,prev.type||null);
            if(result){renderBrowserList(overlay,result);return;}
          }
          if(_filteredRoot){renderBrowserList(overlay,_filteredRoot);return;}
          const result=await browseMedia(null,null);
          if(result)renderBrowserList(overlay,result);
          else overlay.querySelector('.mbr-list').innerHTML=`<div class="mbr-empty">Could not load media</div>`;
        });
        const rootResult=await browseMedia(null,null);
        let result=rootResult;
        if(rootResult?.children?.length){
          result={...rootResult,title:'Music Assistant',children:rootResult.children.filter(c=>(c.media_content_type||'').toLowerCase()==='music_assistant')};
        }
        _filteredRoot=result;
        if(result)renderBrowserList(overlay,result);
        else overlay.querySelector('.mbr-list').innerHTML=`<div class="mbr-empty">Could not load media</div>`;
      };

      // Speaker dropdown
      buildSearchSelect({
        container:block.querySelector(`#mp-slot-${i}`),
        options:this._mpOptions(),value:day.mp||'',placeholder:'Speaker kiezen...',
        onChange:val=>{
          day.mp=val;
          const tb=block.querySelector(`[data-testspk="${i}"]`);
          if(tb)tb.disabled=!val;
          const noSpk=block.querySelector(`#bld-no-spk-${i}`);
          if(val&&noSpk)noSpk.style.display='none';
        }
      });

      // Volume
      const vol=block.querySelector(`#vol-${i}`);
      this._sliderBg(vol,0,100);
      const updVol=v=>{const c=Math.max(0,Math.min(100,Math.round(v)));vol.value=c;day.v=c;block.querySelector(`#vol-v-${i}`).textContent=c+'%';this._sliderBg(vol,0,100);};
      vol.addEventListener('input',e=>updVol(parseInt(e.target.value)));
      let vsx=0,vsv=0,vsw=0;
      vol.addEventListener('touchstart',e=>{e.stopPropagation();vsx=e.touches[0].clientX;vsv=parseInt(vol.value);vsw=vol.getBoundingClientRect().width;},{passive:true});
      vol.addEventListener('touchmove', e=>{e.stopPropagation();updVol(vsv+Math.round((e.touches[0].clientX-vsx)/vsw*100));},{passive:true});

      // Lamp toggle
      tap(block.querySelector(`[data-lamptoggle="${i}"]`),()=>{
        const lampOn=typeof day.b==='number';
        if(lampOn){delete day.b;delete day.l;}else{day.b=80;}
        block.querySelector(`[data-lamptrack="${i}"]`).className=`mini-track ${!lampOn?'on':'off'}`;
        block.querySelector(`#lamp-body-${i}`).style.display=!lampOn?'block':'none';
        const tb=block.querySelector(`[data-testlmp="${i}"]`);
        if(tb)tb.disabled=lampOn||!day.l;
      });

      // Light dropdown
      buildSearchSelect({
        container:block.querySelector(`#lp-slot-${i}`),
        options:this._lightOptions(),value:day.l||'',placeholder:'Lamp kiezen...',
        onChange:val=>{
          day.l=val;
          const tb=block.querySelector(`[data-testlmp="${i}"]`);
          if(tb)tb.disabled=typeof day.b!=='number'||!val;
        }
      });

      // Brightness
      const bri=block.querySelector(`#bri-${i}`);
      if(bri){
        this._sliderBg(bri,1,100);
        const updBri=v=>{const c=Math.max(1,Math.min(100,Math.round(v)));bri.value=c;day.b=c;block.querySelector(`#bri-v-${i}`).textContent=c+'%';this._sliderBg(bri,1,100);};
        bri.addEventListener('input',e=>updBri(parseInt(e.target.value)));
        let bsx=0,bsv=0,bsw=0;
        bri.addEventListener('touchstart',e=>{e.stopPropagation();bsx=e.touches[0].clientX;bsv=parseInt(bri.value);bsw=bri.getBoundingClientRect().width;},{passive:true});
        bri.addEventListener('touchmove', e=>{e.stopPropagation();updBri(bsv+Math.round((e.touches[0].clientX-bsx)/bsw*99));},{passive:true});
      }

      // Repeat toggle
      tap(block.querySelector(`[data-repeattoggle="${i}"]`),()=>{
        day.r=day.r===0?1:0;
        block.querySelector(`[data-repeattrack="${i}"]`).className=`mini-track ${day.r===0?'off':'on'}`;
      });

      // Test speaker
      const testSpkBtn=block.querySelector(`[data-testspk="${i}"]`);
      tap(testSpkBtn,()=>{
        if(!day.mp||!this._hass)return;
        const isOn=testSpkBtn.dataset.on==='1';
        modal.querySelectorAll('[data-testspk]').forEach(b=>{b.dataset.on='0';b.textContent='🔊 Speaker testen';b.classList.remove('active');});
        if(this._testSpkEntity){this._hass.callService('media_player','media_stop',{entity_id:this._testSpkEntity});this._testSpkEntity=null;}
        if(isOn)return;
        const url=day.url||null;
        this._hass.callService('media_player','volume_set',{entity_id:day.mp,volume_level:(day.v??50)/100});
        if(url)this._hass.callService('media_player','play_media',{entity_id:day.mp,media_content_id:url,media_content_type:day.media_type||'music'});
        else this._hass.callService('media_player','media_play',{entity_id:day.mp});
        this._testSpkEntity=day.mp;
        testSpkBtn.dataset.on='1';testSpkBtn.textContent='⏹ Stoppen';testSpkBtn.classList.add('active');
      });

      // Test light
      const testLmpBtn=block.querySelector(`[data-testlmp="${i}"]`);
      tap(testLmpBtn,()=>{
        if(!day.l||!this._hass)return;
        const isOn=testLmpBtn.dataset.on==='1';
        modal.querySelectorAll('[data-testlmp]').forEach(b=>{b.dataset.on='0';b.textContent='💡 Lamp testen';b.classList.remove('active');});
        if(this._testLmpEntity){this._hass.callService('light','turn_off',{entity_id:this._testLmpEntity});this._testLmpEntity=null;}
        if(isOn)return;
        this._hass.callService('light','turn_on',{entity_id:day.l,brightness_pct:day.b??80});
        this._testLmpEntity=day.l;
        testLmpBtn.dataset.on='1';testLmpBtn.textContent='⏹ Stoppen';testLmpBtn.classList.add('active');
      });
    };

    // ── renderDayBlocks ─────────────────────────────────────────────
    const renderDayBlocks=()=>{
      const dtC=modal.querySelector('#day-blocks');
      const activeDays=Object.keys(this._temp.d).map(Number).sort((a,b)=>a-b);
      if(!activeDays.length){dtC.innerHTML='';return;}
      dtC.innerHTML=activeDays.map(i=>{
        const key=String(i);
        const isOpen=expanded.has(i);
        const day=this._temp.d[key]||{};
        const sndName=day.media_title||'—';
        return `
          <div class="day-block" data-day="${i}">
            <div class="day-blk-hdr">
              <span class="day-blk-lbl">${DAYS_NL[i]}</span>
              <input type="time" class="dt-time" data-day="${i}" value="${day.t||'07:00'}">
              <span class="day-blk-sum" style="color:${day.url?'var(--primary-color)':'var(--secondary-text-color)'}">${sndName}</span>
              <ha-icon class="day-blk-arr" icon="mdi:chevron-${isOpen?'up':'down'}" style="--mdc-icon-size:18px;color:var(--secondary-text-color);display:flex;flex-shrink:0;transition:transform .2s"></ha-icon>
            </div>
            <div class="day-blk-body" style="display:${isOpen?'block':'none'}">
              ${genDayBody(i)}
            </div>
          </div>`;
      }).join('');
      activeDays.forEach(i=>initBlock(i));
    };

    // ── Day buttons ─────────────────────────────────────────────────
    modal.querySelectorAll('.day-btn').forEach(btn=>{
      tap(btn,()=>{
        const d=String(parseInt(btn.dataset.day));
        if(this._temp.d[d]){delete this._temp.d[d];expanded.delete(parseInt(d));}
        else{this._temp.d[d]={t:'07:00',r:0};expanded.add(parseInt(d));}
        btn.classList.toggle('on',!!this._temp.d[d]);
        renderDayBlocks();
      });
    });

    const setDays=days=>{
      const old=this._temp.d||{};
      this._temp.d={};
      days.forEach(d=>{
        const key=String(d);
        this._temp.d[key]=old[key]||{t:'07:00',r:0};
        if(!old[key])expanded.add(d);
      });
      modal.querySelectorAll('.day-btn').forEach(b=>b.classList.toggle('on',!!this._temp.d[String(parseInt(b.dataset.day))]));
      renderDayBlocks();
    };
    tap(modal.querySelector('#q-work'),   ()=>setDays([0,1,2,3,4]));
    tap(modal.querySelector('#q-weekend'),()=>setDays([5,6]));
    tap(modal.querySelector('#q-all'),    ()=>setDays([0,1,2,3,4,5,6]));
    tap(modal.querySelector('#q-none'),   ()=>setDays([]));

    // ── Name input ──────────────────────────────────────────────────
    modal.querySelector('#alarm-name').addEventListener('input',e=>{this._temp.name=e.target.value.trim();});

    // ── Footer ──────────────────────────────────────────────────────
    modal.addEventListener('click',e=>{if(e.target===modal)this._closeModal();});
    tap(modal.querySelector('#btn-cancel'),()=>this._closeModal());
    tap(modal.querySelector('#btn-save'),()=>{
      this._temp.on=true;
      const alarms=JSON.parse(JSON.stringify(this._data.alarms||[]));
      const idx=alarms.findIndex(a=>a.id===this._temp.id);
      if(idx>=0)alarms[idx]=this._temp;
      else alarms.push(this._temp);
      this._saveData({alarms});
      this._closeModal();
      this._updateDOM();
    });

    renderDayBlocks();
  }

  _sliderBg(s,mn,mx){
    const pct=mx>mn?Math.round(((parseFloat(s.value)-mn)/(mx-mn))*100):0;
    s.style.background=`linear-gradient(to right,var(--primary-color) 0%,var(--primary-color) ${pct}%,var(--secondary-background-color) ${pct}%,var(--secondary-background-color) 100%)`;
  }
}

/* ══════════════════════════════════════════════════════
   REGISTRATION
   ══════════════════════════════════════════════════════ */

if(!customElements.get('alarm-card-1-editor'))customElements.define('alarm-card-1-editor',AlarmCardEditor);
if(!customElements.get('alarm-card-1'))       customElements.define('alarm-card-1',AlarmCard);

window.customCards=window.customCards||[];
if(!window.customCards.find(c=>c.type==='alarm-card-1')){
  window.customCards.push({type:'alarm-card-1',name:'Alarm Card',description:'Multi-alarm card — up to 10 alarms per slot',preview:true});
}

console.info(
  `%c ALARM-CARD %c v${VERSION} `,
  'background:#e65100;color:#fff;padding:2px 5px;border-radius:3px 0 0 3px;font-weight:700',
  'background:#fff3e0;color:#e65100;padding:2px 5px;border-radius:0 3px 3px 0;font-weight:700'
);
