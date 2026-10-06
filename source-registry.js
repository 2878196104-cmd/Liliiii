/* One website = one card; social profiles retain their account identity. */
(function(root){
  function identity(source){
    try{
      const url=new URL(source.base_url||source.url);
      if(!/^https?:$/.test(url.protocol))return null;
      // A verified representative work is an entry point, never another creator.
      if(source.creator_id && source.platform==='创作者')return {key:'creator:'+source.creator_id,url:url.href,host:url.hostname.replace(/^www\./,''),account:true};
      let host=url.hostname.toLowerCase().replace(/^www\./,'');
      const path=url.pathname.replace(/\/+$/,'');
      if(host==='weibo.com' && /^\/(?:u\/\d+|[a-zA-Z0-9_-]+)$/.test(path))return {key:host+path,url:'https://'+host+path,host,account:true};
      if(host==='space.bilibili.com' && /^\/\d+$/.test(path))return {key:host+path,url:'https://'+host+path,host,account:true};
      if(host==='xiaohongshu.com' && /^\/user\/profile\/[a-zA-Z0-9]+$/.test(path))return {key:host+path,url:'https://'+host+path,host,account:true};
      const parts=host.split('.');
      const suffix=/\.(?:com|org|net|gov)\.(?:cn|hk|tw)$|\.co\.uk$/.test(host)?3:2;
      host=parts.slice(-suffix).join('.');
      return {key:host,url:url.origin+'/',host,account:false};
    }catch{return null;}
  }
  function group(sources){
    const map=new Map();
    sources.forEach(source=>{
      const id=identity(source);if(!id)return;
      let entry=map.get(id.key);
      if(!entry){entry={...source,...id,members:[],focuses:[]};map.set(id.key,entry);}
      entry.members.push(source);
      if(source.focus && !entry.focuses.includes(source.focus))entry.focuses.push(source.focus);
    });
    const socialbeta=map.get('socialbeta.com');if(socialbeta){socialbeta.name='SocialBeta';socialbeta.focuses=['营销案例、品牌节点、跨界联名与睡眠专题'];}
    return [...map.values()];
  }
  function expandDefaults(sources){return sources.map(s=>({enabled:true,trust_level:2,collection_interval_minutes:1440,pools:['competitor','research'],...s}));}
  function category(source){
    if(source.source_type)return source.source_type;
    if(source.platform==='创作者')return 'creators';
    if(source.platform==='社媒账号')return 'accounts';
    // Preserve existing official/reference entries under All, not as media.
    if(/品牌官网|品牌官方|协会|展会|会议/.test(source.platform||''))return 'reference';
    return 'websites';
  }
  const api={identity,group,expandDefaults,category};
  root.MONTHLY_SOURCES=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
