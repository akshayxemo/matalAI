// Per-process safeguard; not a distributed limiter.
const buckets=new Map<string,{count:number;reset:number}>();
export function limit(key:string,max=20,windowMs=60000){const now=Date.now();for(const [k,v] of buckets)if(v.reset<now)buckets.delete(k);const item=buckets.get(key);if(!item||item.reset<now){buckets.set(key,{count:1,reset:now+windowMs});return true;}if(item.count>=max)return false;item.count++;return true;}
