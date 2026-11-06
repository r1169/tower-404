(() => {
 class Dialogue {
  constructor(){this.reset()}
  reset(){this.active=null;this.queue=[];this.history=[];this.sequence=0;this.time=0;this.seen=new Map()}
  say(who,text){
   text=String(text||'').replace(/^(Дана|Тимур):\s*/,'').trim();if(!text)return;
   const key=who+':'+text;if(this.time-(this.seen.get(key)??-100)<20)return;
   this.seen.set(key,this.time);
   const priority=/авари|столкнов|опас|топлив|обломк|потер|угроз|срочн/i.test(text)?2:/провер|заключ|безопас/i.test(text)?1:0;
   const runway=text.match(/полоса\s+(\d)/i),topic=runway?'runway:'+runway[1]:null;
   // Replace the current status of a resource; history still keeps every change.
   if(topic){this.queue=this.queue.filter(x=>x.topic!==topic);if(this.active?.topic===topic)this.active=null}
   const item={id:++this.sequence,who,text,priority,topic,age:0,duration:Math.max(6,Math.min(13,text.length/15+3)),time:this.time};
   this.history.unshift(item);this.history=this.history.slice(0,60);
   if(!this.active)this.active=item;
   else if(priority===2&&priority>this.active.priority){this.active=item;this.queue=this.queue.filter(x=>x.priority>=priority)}
   else{this.queue.push(item);this.queue.sort((a,b)=>b.priority-a.priority||a.id-b.id);this.queue=this.queue.slice(0,5)}
  }
  invalidate(test){if(this.active&&test(this.active))this.active=null;this.queue=this.queue.filter(x=>!test(x));if(!this.active)this.active=this.queue.shift()||null}
  tick(dt){this.time+=dt;this.queue=this.queue.filter(x=>this.time-x.time<18);const before=this.active?.id;if(this.active){this.active.age+=dt;if(this.active.age>=this.active.duration)this.active=this.queue.shift()||null}return before!==this.active?.id}
  visible(who){return this.active?.who===who?this.active:null}
 }
 if(typeof module!=='undefined')module.exports={Dialogue};
 if(typeof window!=='undefined')window.SkyflowDialogue={Dialogue};
})();
